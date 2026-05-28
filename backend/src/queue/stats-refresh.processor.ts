import { Process, Processor, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import type { NormalizedProfile } from '@gpt/shared';
import { STATS_REFRESH_QUEUE, StatsRefreshJob } from './queue.service';
import { GamesService } from '../games/games.service';
import { EventsGateway } from '../ws/events.gateway';
import { PrismaService } from '../prisma/prisma.service';

@Processor(STATS_REFRESH_QUEUE)
export class StatsRefreshProcessor {
  private readonly log = new Logger(StatsRefreshProcessor.name);

  constructor(private games: GamesService, private gateway: EventsGateway, private prisma: PrismaService) {}

  @Process({ concurrency: Number(process.env.QUEUE_CONCURRENCY ?? 8) })
  async handle(job: Job<StatsRefreshJob>) {
    const { game, platform, providerId } = job.data;

    const prevRow = await this.prisma.trackedProfile.findUnique({
      where: { game_platform_providerId: { game, platform, providerId } },
      select: { latestSnapshot: true },
    });
    const prevSnap = prevRow?.latestSnapshot as unknown as NormalizedProfile | undefined;

    const { snapshot } = await this.games.getProfile(game, providerId, { platform, forceRefresh: true });
    const snap = snapshot as NormalizedProfile;

    const delta = this.diff(prevSnap, snap);
    this.gateway.broadcastStatsUpdate(game, platform, providerId, snap, delta);

    if (prevSnap?.headline?.rank !== snap.headline?.rank) {
      this.gateway.broadcastRankChange(game, platform, providerId, prevSnap?.headline?.rank, snap.headline?.rank);
    }
    if ((snap.headline?.level ?? 0) > (prevSnap?.headline?.level ?? 0)) {
      this.gateway.broadcastLevelUp(game, platform, providerId, prevSnap?.headline?.level, snap.headline.level!);
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
