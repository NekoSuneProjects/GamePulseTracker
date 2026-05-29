import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from './queue.service';
import { IntegrationRegistry } from '../games/integrations/integration.registry';

/**
 * Periodically enqueues refresh jobs for every active tracked profile whose
 * last refresh is older than its configured interval. Default is 5 minutes;
 * each profile can override via `refreshIntervalMs`.
 *
 * Profiles for `ingestOnly` games (Arc Raiders, etc.) are SKIPPED — those
 * games have no upstream API, so calling the stub `getProfile` would
 * overwrite the device-ingested snapshot with a `_stub: true` placeholder.
 */
@Injectable()
export class RefreshScheduler {
  private readonly log = new Logger(RefreshScheduler.name);
  private readonly globalIntervalMs = Number(process.env.STATS_REFRESH_INTERVAL_MS ?? 5 * 60 * 1000);
  private readonly pageSize = Number(process.env.REFRESH_PAGE_SIZE ?? 2000);

  constructor(
    private prisma: PrismaService,
    private queue: QueueService,
    private integrations: IntegrationRegistry,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    const now = Date.now();
    // Walk all active profiles in cursor pages so we don't silently cap at 500.
    let cursor: string | undefined;
    let queued = 0;
    let scanned = 0;
    for (;;) {
      const profiles = await this.prisma.trackedProfile.findMany({
        where: { active: true },
        select: { id: true, game: true, platform: true, providerId: true, lastFetchedAt: true, refreshIntervalMs: true },
        orderBy: { id: 'asc' },
        take: this.pageSize,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (profiles.length === 0) break;
      cursor = profiles[profiles.length - 1].id;
      scanned += profiles.length;

      for (const p of profiles) {
        if (!this.integrations.has(p.game)) continue;
        const integ = this.integrations.get(p.game);
        if (!integ.isEnabled()) continue;
        if (integ.ingestOnly) continue;  // never overwrite ingested snapshots

        const interval = p.refreshIntervalMs ?? this.globalIntervalMs;
        const last = p.lastFetchedAt?.getTime() ?? 0;
        if (now - last < interval) continue;

        await this.queue.enqueueRefresh(p.game, p.providerId, p.platform, { priority: 'normal' });
        queued++;
      }

      if (profiles.length < this.pageSize) break;
    }
    if (queued > 0) this.log.log(`Scheduled ${queued}/${scanned} profile refresh(es)`);
  }
}
