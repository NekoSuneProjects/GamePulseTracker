import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { GamesService } from './games.service';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { QueueService } from '../queue/queue.service';
import { normalisePlatform } from './integrations/integration.interface';

@ApiTags('games')
@Controller('games')
export class GamesController {
  constructor(private games: GamesService, private queue: QueueService) {}

  @Public()
  @Get()
  async list() {
    return { ok: true, data: this.games.catalog() };
  }

  @Public()
  @Get(':game/platforms')
  async platforms(@Param('game') game: string) {
    return { ok: true, data: this.games.gamePlatforms(game) };
  }

  @Public()
  @Get(':game/search')
  async search(@Param('game') game: string, @Query('q') q: string, @Query('platform') platform?: string) {
    const data = await this.games.search(game, q ?? '', platform);
    return { ok: true, data };
  }

  @Public()
  @Get(':game/player/:providerId')
  async profile(
    @Param('game') game: string,
    @Param('providerId') providerId: string,
    @Query('platform') platform?: string,
    @Query('refresh')  refresh?: string,
  ) {
    const data = await this.games.getProfile(game, providerId, { platform, forceRefresh: refresh === 'true' });
    return { ok: true, data };
  }

  @Public()
  @Get(':game/player/:providerId/history')
  async history(
    @Param('game') game: string,
    @Param('providerId') providerId: string,
    @Query('platform') platform?: string,
  ) {
    const data = await this.games.getProfileHistory(game, providerId, platform);
    return { ok: true, data };
  }

  @Public()
  @Get(':game/player/:providerId/matches')
  async matches(
    @Param('game') game: string,
    @Param('providerId') providerId: string,
    @Query('platform') platform?: string,
  ) {
    const data = await this.games.getMatchHistory(game, providerId, platform);
    return { ok: true, data };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Post(':game/player/:providerId/refresh')
  async forceRefresh(
    @Param('game') game: string,
    @Param('providerId') providerId: string,
    @Query('platform') platform?: string,
  ) {
    await this.queue.enqueueRefresh(game, providerId, normalisePlatform(platform), { priority: 'high' });
    return { ok: true, data: { queued: true } };
  }
}
