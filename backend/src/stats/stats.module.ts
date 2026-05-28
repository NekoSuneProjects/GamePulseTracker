import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { GamesModule } from '../games/games.module';

@Module({
  imports: [GamesModule],
  controllers: [StatsController],
})
export class StatsModule {}
