import { Module, forwardRef } from '@nestjs/common';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [forwardRef(() => QueueModule)],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}
