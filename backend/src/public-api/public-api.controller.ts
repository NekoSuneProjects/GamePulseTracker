import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { GamesService } from '../games/games.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { Public } from '../common/decorators/public.decorator';

/**
 * Versioned public REST API. Identical data layer as /games/..., but lives
 * under /api/... so versioning, rate-limit and API-key behavior are explicit.
 *
 * Pass ?platform=psn (or whatever platform applies for that game's catalog
 * entry) to disambiguate cross-platform titles. Pass X-API-Key for higher rate
 * limits.
 */
@ApiTags('public-api')
@Controller('api')
@UseGuards(ApiKeyGuard)
export class PublicApiController {
  constructor(private games: GamesService) {}

  @Public()
  @Throttle({ short: { ttl: 1000, limit: 5 }, long: { ttl: 60_000, limit: 120 } })
  @Get(':game/player/:id')
  async player(
    @Param('game') game: string,
    @Param('id') id: string,
    @Query('platform') platform?: string,
    @Query('refresh') refresh?: string,
  ) {
    const data = await this.games.getProfile(game, id, { platform, forceRefresh: refresh === 'true' });
    return { ok: true, data };
  }

  @Public()
  @Throttle({ short: { ttl: 1000, limit: 5 }, long: { ttl: 60_000, limit: 120 } })
  @Get(':game/search')
  async search(@Param('game') game: string, @Query('q') q: string, @Query('platform') platform?: string) {
    return { ok: true, data: await this.games.search(game, q ?? '', platform) };
  }

  @Public()
  @Get(':game/platforms')
  async platforms(@Param('game') game: string) {
    return { ok: true, data: this.games.gamePlatforms(game) };
  }
}
