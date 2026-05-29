import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

class CreateKeyDto {
  @IsString() @MaxLength(64) label!: string;
  @IsOptional() @IsInt() @Min(1) @Max(1000) rateLimit?: number;
}

@ApiTags('api-keys')
@ApiBearerAuth()
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private keys: ApiKeysService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return { ok: true, data: await this.keys.list(user.sub) };
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateKeyDto) {
    return { ok: true, data: await this.keys.create(user.sub, dto.label, dto.rateLimit) };
  }

  @Delete(':id')
  async revoke(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { ok: true, data: await this.keys.revoke(user.sub, id) };
  }
}
