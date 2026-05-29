import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { SocialLink } from '@gpt/shared';

class UpdateSettingsDto {
  @IsOptional() @IsString()                avatarUrl?: string;
  @IsOptional() @IsBoolean()               publicProfile?: boolean;
  @IsOptional() @IsString() @MaxLength(512) bio?: string;
  @IsOptional() @IsArray()                 socials?: SocialLink[];
}

class ChangePasswordDto {
  @IsString() currentPassword!: string;
  @IsString() @MinLength(8) @MaxLength(128) newPassword!: string;
}

class ChangeUsernameDto {
  @IsString() @MinLength(3) @MaxLength(32) @Matches(/^[a-zA-Z0-9_.-]+$/) newUsername!: string;
  @IsString() password!: string;
}

class DeleteAccountDto {
  @IsString() password!: string;
}

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Public()
  @Get(':username')
  async profile(@Param('username') username: string) {
    const data = await this.users.getPublicProfile(username);
    return { ok: true, data };
  }

  @Patch('me/settings')
  @ApiBearerAuth()
  async updateSettings(@CurrentUser() user: JwtPayload, @Body() dto: UpdateSettingsDto) {
    const data = await this.users.updateSettings(user.sub, dto);
    return { ok: true, data };
  }

  @Patch('me/password')
  @ApiBearerAuth()
  async changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    await this.users.changePassword(user.sub, dto.currentPassword, dto.newPassword);
    return { ok: true, data: null };
  }

  @Patch('me/username')
  @ApiBearerAuth()
  async changeUsername(@CurrentUser() user: JwtPayload, @Body() dto: ChangeUsernameDto) {
    const data = await this.users.changeUsername(user.sub, dto.newUsername, dto.password);
    return { ok: true, data };
  }

  /** Queue account deletion with a 30-day undo window. */
  @Delete('me')
  @ApiBearerAuth()
  async requestDeletion(@CurrentUser() user: JwtPayload, @Body() dto: DeleteAccountDto) {
    const data = await this.users.requestAccountDeletion(user.sub, dto.password);
    return { ok: true, data };
  }

  /** Cancel a pending deletion request. */
  @Post('me/delete-cancel')
  @ApiBearerAuth()
  async cancelDeletion(@CurrentUser() user: JwtPayload) {
    const data = await this.users.cancelAccountDeletion(user.sub);
    return { ok: true, data };
  }
}
