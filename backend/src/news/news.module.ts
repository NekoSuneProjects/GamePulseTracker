import { Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { NewsScheduler } from './news.scheduler';

@Module({
  providers: [NewsService, NewsScheduler],
  controllers: [NewsController],
  exports: [NewsService],
})
export class NewsModule {}
