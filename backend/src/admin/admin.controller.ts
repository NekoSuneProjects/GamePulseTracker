import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('overview')
  async overview() { return { ok: true, data: await this.admin.overview() }; }

  @Get('users')
  async users() { return { ok: true, data: await this.admin.listUsers() }; }

  @Post('users/:id/ban')
  async ban(@Param('id') id: string) { return { ok: true, data: await this.admin.banUser(id) }; }

  @Get('logs')
  async logs() { return { ok: true, data: await this.admin.recentLogs() }; }
}
