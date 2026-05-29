import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AccountDeletionScheduler } from './account-deletion.scheduler';

@Module({
  controllers: [UsersController],
  providers: [UsersService, AccountDeletionScheduler],
  exports: [UsersService],
})
export class UsersModule {}
