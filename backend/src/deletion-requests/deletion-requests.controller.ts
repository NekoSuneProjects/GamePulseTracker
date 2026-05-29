import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role, DeletionStatus } from '@prisma/client';
import { DeletionRequestsService } from './deletion-requests.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

class CreateDeletionRequestDto {
  @IsString() @MaxLength(64) profileId!: string;
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}

class AdminResolveDto {
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

@ApiTags('deletion-requests')
@ApiBearerAuth()
@Controller('deletion-requests')
@UseGuards(JwtAuthGuard)
export class DeletionRequestsController {
  constructor(private deletions: DeletionRequestsService) {}

  /** Create a new deletion request for a TrackedProfile the user owns. */
  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDeletionRequestDto) {
    return { ok: true, data: await this.deletions.create(user.sub, dto.profileId, dto.reason) };
  }

  /** Browse my own requests + their current status. */
  @Get('mine')
  async mine(@CurrentUser() user: JwtPayload) {
    return { ok: true, data: await this.deletions.listForUser(user.sub) };
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/deletion-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class DeletionRequestsAdminController {
  constructor(private deletions: DeletionRequestsService) {}

  @Get()
  async list(@Query('status') status?: string) {
    const s = status?.toUpperCase();
    const parsed = (s === 'PENDING' || s === 'APPROVED' || s === 'REJECTED')
      ? (s as DeletionStatus)
      : undefined;
    return { ok: true, data: await this.deletions.listForAdmin(parsed) };
  }

  @Post(':id/approve')
  async approve(@CurrentUser() admin: JwtPayload, @Param('id') id: string, @Body() dto: AdminResolveDto) {
    return { ok: true, data: await this.deletions.approve(admin.sub, id, dto.note) };
  }

  @Post(':id/reject')
  async reject(@CurrentUser() admin: JwtPayload, @Param('id') id: string, @Body() dto: AdminResolveDto) {
    return { ok: true, data: await this.deletions.reject(admin.sub, id, dto.note) };
  }
}
