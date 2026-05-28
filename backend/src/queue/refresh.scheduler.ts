import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from './queue.service';
import { IntegrationRegistry } from '../games/integrations/integration.registry';

/**
 * Periodically enqueues refresh jobs for every active tracked profile whose
 * last refresh is older than its configured interval. Default is 5 minutes;
 * each profile can override via `refreshIntervalMs`.
 */
@Injectable()
export class RefreshScheduler {
  private readonly log = new Logger(RefreshScheduler.name);
  private readonly globalIntervalMs = Number(process.env.STATS_REFRESH_INTERVAL_MS ?? 5 * 60 * 1000);

  constructor(
    private prisma: PrismaService,
    private queue: QueueService,
    private integrations: IntegrationRegistry,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    const now = Date.now();
    const profiles = await this.prisma.trackedProfile.findMany({
      where: { active: true },
      select: { game: true, platform: true, providerId: true, lastFetchedAt: true, refreshIntervalMs: true },
      take: 500,
    });

    let queued = 0;
    for (const p of profiles) {
      if (!this.integrations.has(p.game)) continue;
      const integ = this.integrations.get(p.game);
      if (!integ.isEnabled()) continue;

      const interval = p.refreshIntervalMs ?? this.globalIntervalMs;
      const last = p.lastFetchedAt?.getTime() ?? 0;
      if (now - last < interval) continue;

      await this.queue.enqueueRefresh(p.game, p.providerId, p.platform, { priority: 'normal' });
      queued++;
    }

    if (queued > 0) this.log.log(`Scheduled ${queued} profile refresh(es)`);
  }
}
