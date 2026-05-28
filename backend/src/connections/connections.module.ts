import { Module } from '@nestjs/common';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';
import { IdentityResolveScheduler } from './identity-resolve.scheduler';

@Module({
  controllers: [ConnectionsController],
  providers: [ConnectionsService, IdentityResolveScheduler],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}
