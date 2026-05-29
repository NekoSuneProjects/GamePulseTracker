import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

class FollowDto {
  @IsString() @MaxLength(32) username!: string;
}

@ApiTags('social')
@Controller()
export class SocialController {
  constructor(private social: SocialService) {}

  // ---------- Follow ----------

  @Post('social/follow')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async follow(@CurrentUser() user: JwtPayload, @Body() dto: FollowDto) {
    return { ok: true, data: await this.social.follow(user.sub, dto.username) };
  }

  @Delete('social/follow/:username')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async unfollow(@CurrentUser() user: JwtPayload, @Param('username') username: string) {
    return { ok: true, data: await this.social.unfollow(user.sub, username) };
  }

  @Get('social/is-following/:username')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async isFollowing(@CurrentUser() user: JwtPayload, @Param('username') username: string) {
    return { ok: true, data: { following: await this.social.isFollowing(user.sub, username) } };
  }

  @Public()
  @Get('users/:username/followers')
  async followers(@Param('username') username: string) {
    return { ok: true, data: await this.social.followers(username) };
  }

  @Public()
  @Get('users/:username/following')
  async following(@Param('username') username: string) {
    return { ok: true, data: await this.social.following(username) };
  }

  // ---------- Activity feed ----------

  @Public()
  @Get('users/:username/feed')
  async feed(@Param('username') username: string, @Query('limit') limit?: string) {
    const n = limit ? Math.min(200, Math.max(1, Number(limit))) : 50;
    return { ok: true, data: await this.social.feedFor(username, n) };
  }

  // ---------- Achievements ----------

  @Public()
  @Get('achievements')
  async catalog() {
    return { ok: true, data: this.social.catalog() };
  }

  @Public()
  @Get('users/:username/achievements')
  async forUser(@Param('username') username: string) {
    return { ok: true, data: await this.social.forUser(username) };
  }

  /** Force a recompute for the signed-in user — useful right after a
   *  state change the caller knows would unlock something (e.g. enabling 2FA). */
  @Post('achievements/recompute')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async recompute(@CurrentUser() user: JwtPayload) {
    const newly = await this.social.recomputeAchievements(user.sub);
    return { ok: true, data: { unlocked: newly } };
  }
}
