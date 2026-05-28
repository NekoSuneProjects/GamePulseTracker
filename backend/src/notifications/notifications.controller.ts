import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload, @Query('unread') unread?: string) {
    const data = await this.svc.list(user.sub, { unreadOnly: unread === 'true' });
    return { ok: true, data };
  }

  @Patch(':id/read')
  async read(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.svc.markRead(user.sub, id);
    return { ok: true, data: null };
  }

  @Patch('read-all')
  async readAll(@CurrentUser() user: JwtPayload) {
    await this.svc.markAllRead(user.sub);
    return { ok: true, data: null };
  }
}
