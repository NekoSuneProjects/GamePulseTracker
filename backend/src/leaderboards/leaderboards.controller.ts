import { Controller, Get, Param, Query } from '@nestjs/common';
import { LeaderboardsService } from './leaderboards.service';
import { Public } from '../common/decorators/public.decorator';
import { ApiTags } from '@nestjs/swagger';

const ALLOWED = new Set(['level', 'kd', 'wins', 'matches']);

@ApiTags('leaderboards')
@Controller('leaderboards')
export class LeaderboardsController {
  constructor(private svc: LeaderboardsService) {}

  @Public()
  @Get(':game')
  async top(
    @Param('game') game: string,
    @Query('metric') metric?: string,
    @Query('platform') platform?: string,
    @Query('limit') limit?: string,
  ) {
    const m = (ALLOWED.has(metric ?? '') ? metric : 'level') as 'level' | 'kd' | 'wins' | 'matches';
    const data = await this.svc.top(game, m, { platform, limit: Math.min(500, Math.max(10, Number(limit ?? 100))) });
    return { ok: true, data };
  }
}
