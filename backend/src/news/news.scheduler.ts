import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NewsService } from './news.service';

@Injectable()
export class NewsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(NewsScheduler.name);
  private initialFetchTimer: ReturnType<typeof setTimeout> | null = null;
  constructor(private news: NewsService) {}

  async onModuleInit() {
    // Kick off an initial fetch a few seconds after boot so the UI has data
    // immediately on first run. Stored handle so we can cancel it if the
    // module is torn down during a fast restart — otherwise the timer could
    // fire against a closed Prisma client.
    this.initialFetchTimer = setTimeout(() => {
      this.initialFetchTimer = null;
      this.news.refreshAll().catch((e) => this.log.warn(`initial news fetch failed: ${e.message}`));
    }, 10_000);
  }

  onModuleDestroy() {
    if (this.initialFetchTimer) {
      clearTimeout(this.initialFetchTimer);
      this.initialFetchTimer = null;
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async tick() {
    // Wrap so an unhandled throw doesn't bubble into Nest's Schedule with
    // no context — we want to see which scheduler died.
    try {
      await this.news.refreshAll();
    } catch (e) {
      this.log.warn(`news tick failed: ${(e as Error).message}`);
    }
  }
}
