import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueService, STATS_REFRESH_QUEUE } from './queue.service';
import { StatsRefreshProcessor } from './stats-refresh.processor';
import { RefreshScheduler } from './refresh.scheduler';
import { GamesModule } from '../games/games.module';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: STATS_REFRESH_QUEUE }),
    forwardRef(() => GamesModule),
    forwardRef(() => WsModule),
  ],
  providers: [QueueService, StatsRefreshProcessor, RefreshScheduler],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
