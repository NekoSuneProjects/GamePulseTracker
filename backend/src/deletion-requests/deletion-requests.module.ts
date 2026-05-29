import { Module } from '@nestjs/common';
import { DeletionRequestsService } from './deletion-requests.service';
import { DeletionRequestsAdminController, DeletionRequestsController } from './deletion-requests.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [DeletionRequestsController, DeletionRequestsAdminController],
  providers: [DeletionRequestsService],
})
export class DeletionRequestsModule {}
