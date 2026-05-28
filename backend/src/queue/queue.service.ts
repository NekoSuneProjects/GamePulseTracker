import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export const STATS_REFRESH_QUEUE = 'stats-refresh';

export interface StatsRefreshJob {
  game: string;
  platform: string;       // '_' for platform-agnostic
  providerId: string;
}

@Injectable()
export class QueueService {
  constructor(@InjectQueue(STATS_REFRESH_QUEUE) private statsQueue: Queue<StatsRefreshJob>) {}

  enqueueRefresh(game: string, providerId: string, platform = '_', opts: { priority?: 'low' | 'normal' | 'high' } = {}) {
    const priority = opts.priority === 'high' ? 1 : opts.priority === 'low' ? 10 : 5;
    return this.statsQueue.add(
      { game, platform, providerId },
      {
        priority,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 500,
        removeOnFail: 100,
        jobId: `refresh:${game}:${platform}:${providerId}`,
      },
    );
  }

  async stats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.statsQueue.getWaitingCount(),
      this.statsQueue.getActiveCount(),
      this.statsQueue.getCompletedCount(),
      this.statsQueue.getFailedCount(),
      this.statsQueue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
  }
}
