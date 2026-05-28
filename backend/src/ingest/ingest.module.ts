import { Module } from '@nestjs/common';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [WsModule],
  controllers: [IngestController, DevicesController],
  providers: [IngestService, DevicesService],
  exports: [IngestService, DevicesService],
})
export class IngestModule {}
