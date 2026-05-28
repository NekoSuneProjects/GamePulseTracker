import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NewsService } from './news.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private news: NewsService) {}

  @Public()
  @Get(':game')
  async list(@Param('game') game: string, @Query('limit') limit?: string) {
    const data = await this.news.list(game, Math.min(50, Math.max(1, Number(limit ?? 12))));
    return { ok: true, data };
  }
}
