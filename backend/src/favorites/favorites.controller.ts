import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

class FavoriteDto {
  @IsString() @MaxLength(64) profileId!: string;
}

@ApiTags('favorites')
@ApiBearerAuth()
@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private favorites: FavoritesService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return { ok: true, data: await this.favorites.list(user.sub) };
  }

  @Post()
  async add(@CurrentUser() user: JwtPayload, @Body() dto: FavoriteDto) {
    return { ok: true, data: await this.favorites.add(user.sub, dto.profileId) };
  }

  @Delete(':profileId')
  async remove(@CurrentUser() user: JwtPayload, @Param('profileId') profileId: string) {
    return { ok: true, data: await this.favorites.remove(user.sub, profileId) };
  }

  /** Used by the player page to render the star state. */
  @Get(':profileId/is-favorited')
  async isFavorited(@CurrentUser() user: JwtPayload, @Param('profileId') profileId: string) {
    return { ok: true, data: { favorited: await this.favorites.isFavorited(user.sub, profileId) } };
  }
}
