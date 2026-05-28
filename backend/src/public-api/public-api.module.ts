import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';
import { GamesModule } from '../games/games.module';

@Module({
  imports: [GamesModule],
  controllers: [PublicApiController],
})
export class PublicApiModule {}
