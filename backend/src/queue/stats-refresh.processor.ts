import { Process, Processor, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import type { NormalizedProfile } from '@gpt/shared';
import { STATS_REFRESH_QUEUE, StatsRefreshJob } from './queue.service';
import { GamesService } from '../games/games.service';
import { EventsGateway } from '../ws/events.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { SocialService } from '../social/social.service';

@Processor(STATS_REFRESH_QUEUE)
export class StatsRefreshProcessor {
  private readonly log = new Logger(StatsRefreshProcessor.name);

  constructor(
    private games: GamesService,
    private gateway: EventsGateway,
    private prisma: PrismaService,
    private social: SocialService,
  ) {}

  @Process({ concurrency: Number(process.env.QUEUE_CONCURRENCY ?? 8) })
  async handle(job: Job<StatsRefreshJob>) {
    const { game, platform, providerId } = job.data;

    const prevRow = await this.prisma.trackedProfile.findUnique({
      where: { game_platform_providerId: { game, platform, providerId } },
      select: { id: true, userId: true, latestSnapshot: true, displayName: true },
    });
    const prevSnap = prevRow?.latestSnapshot as unknown as NormalizedProfile | undefined;

    const { snapshot } = await this.games.getProfile(game, providerId, { platform, forceRefresh: true });
    const snap = snapshot as NormalizedProfile;

    const delta = this.diff(prevSnap, snap);
    this.gateway.broadcastStatsUpdate(game, platform, providerId, snap, delta);

    const prevRank = prevSnap?.headline?.rank;
    const nextRank = snap.headline?.rank;
    const prevLevel = prevSnap?.headline?.level ?? 0;
    const nextLevel = snap.headline?.level ?? 0;

    if (prevRank !== nextRank) {
      this.gateway.broadcastRankChange(game, platform, providerId, prevRank, nextRank);
    }
    if (nextLevel > prevLevel) {
      this.gateway.broadcastLevelUp(game, platform, providerId, prevLevel, nextLevel);
    }

    // Public activity feed — only emit when the TrackedProfile is claimed
    // by a user. Anonymous-tracked profiles broadcast over WS but don't
    // generate feed entries (nobody owns the feed).
    if (prevRow?.userId) {
      if (nextLevel > prevLevel) {
        await this.social.appendActivity(
          prevRow.userId,
          'level-up',
          { game, platform, providerId, displayName: prevRow.displayName, from: prevLevel, to: nextLevel } as object,
          prevRow.id,
        );
      }
      if (prevRank !== nextRank) {
        await this.social.appendActivity(
          prevRow.userId,
          'rank-change',
          { game, platform, providerId, displayName: prevRow.displayName, from: prevRank ?? null, to: nextRank ?? null } as object,
          prevRow.id,
        );
      }
    }

    return { game, platform, providerId, ok: true };
  }

  @OnQueueCompleted()
  onDone(job: Job<StatsRefreshJob>) {
    this.log.verbose?.(`Refreshed ${job.data.game}:${job.data.platform}:${job.data.providerId}`);
  }

  @OnQueueFailed()
  onFail(job: Job<StatsRefreshJob>, err: Error) {
    this.log.warn(`Refresh failed for ${job.data.game}:${job.data.platform}:${job.data.providerId}: ${err.message}`);
  }

  private diff(prev: NormalizedProfile | undefined, next: NormalizedProfile): Record<string, [unknown, unknown]> {
    const out: Record<string, [unknown, unknown]> = {};
    if (!prev) return out;
    const a = prev.headline ?? {};
    const b = next.headline ?? {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const av = (a as Record<string, unknown>)[k];
      const bv = (b as Record<string, unknown>)[k];
      if (av !== bv) out[k] = [av, bv];
    }
    return out;
  }
}
