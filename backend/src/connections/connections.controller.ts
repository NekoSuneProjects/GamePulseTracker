import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ConnectionsService } from './connections.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

class LinkAccountDto {
  @IsString() @MaxLength(32)  platform!: string;
  @IsString() @MaxLength(128) providerId!: string;
  @IsString() @MaxLength(128) displayName!: string;
  @IsOptional() @IsObject()   meta?: Record<string, unknown>;
  @IsOptional() @IsBoolean()  verified?: boolean;
  @IsOptional() @IsBoolean()  autoResolve?: boolean;
}

@ApiTags('connections')
@ApiBearerAuth()
@Controller('connections')
@UseGuards(JwtAuthGuard)
export class ConnectionsController {
  constructor(private connections: ConnectionsService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return { ok: true, data: await this.connections.list(user.sub) };
  }

  @Post()
  async link(@CurrentUser() user: JwtPayload, @Body() dto: LinkAccountDto) {
    return { ok: true, data: await this.connections.link(user.sub, dto) };
  }

  @Delete(':id')
  async unlink(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.connections.unlink(user.sub, id);
    return { ok: true, data: null };
  }

  /** Manual identity refresh — handles the "PS5 swapped EA account" case. */
  @Post(':id/re-resolve')
  async reResolve(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { ok: true, data: await this.connections.reResolve(user.sub, id, 'manual') };
  }
}
