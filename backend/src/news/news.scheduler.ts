import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NewsService } from './news.service';

@Injectable()
export class NewsScheduler implements OnModuleInit {
  private readonly log = new Logger(NewsScheduler.name);
  constructor(private news: NewsService) {}

  async onModuleInit() {
    // Kick off an initial fetch a few seconds after boot so the UI has data
    // immediately on first run. Errors are non-fatal.
    setTimeout(() => { this.news.refreshAll().catch((e) => this.log.warn(`initial news fetch failed: ${e.message}`)); }, 10_000);
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async tick() { await this.news.refreshAll(); }
}
