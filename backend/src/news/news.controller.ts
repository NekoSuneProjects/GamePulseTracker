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
  async list(
    @Param('game') game: string,
    @Query('limit') limit?: string,
    @Query('tag') tag?: string,
  ) {
    const n = Math.min(50, Math.max(1, Number(limit ?? 12)));
    const data = await this.news.list(game, n, tag?.trim() || undefined);
    return { ok: true, data };
  }

  /** Distinct tags actually present for this game — used to populate the
   *  UI's tag filter dropdown. */
  @Public()
  @Get(':game/tags')
  async tags(@Param('game') game: string) {
    return { ok: true, data: await this.news.tagsFor(game) };
  }
}
