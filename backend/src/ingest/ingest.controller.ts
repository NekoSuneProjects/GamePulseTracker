import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { IsArray, IsISO8601, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { IngestService } from './ingest.service';
import { DeviceKeyGuard } from './device-key.guard';
import { Public } from '../common/decorators/public.decorator';

class IngestPayloadDto {
  @IsString() @MaxLength(64) game!: string;
  @IsOptional() @IsString() @MaxLength(32) platform?: string;
  @IsString() @MaxLength(128) providerId!: string;
  @IsString() @MaxLength(128) displayName!: string;
  @IsISO8601() capturedAt!: string;
  @IsObject() snapshot!: Record<string, unknown>;
  @IsOptional() @IsArray() matches?: Array<Record<string, unknown>>;
  @IsOptional() @IsArray() events?: Array<{ type: string; payload: Record<string, unknown> }>;
}

@ApiTags('ingest')
@ApiHeader({ name: 'X-Device-Key', description: 'Device key issued at pairing time (starts with gpt_dev_)' })
@Controller('ingest')
@UseGuards(DeviceKeyGuard)
export class IngestController {
  constructor(private svc: IngestService) {}

  @Public()
  @Throttle({ short: { ttl: 1000, limit: 10 }, long: { ttl: 60_000, limit: 300 } })
  @Post(':game')
  async ingest(
    @Param('game') game: string,
    @Body() body: IngestPayloadDto,
    @Req() req: { device: { id: string } },
  ) {
    body.game = game; // path wins to keep one source of truth
    const profile = await this.svc.accept(req.device.id, body as never);
    return { ok: true, data: { profileId: profile.id, game: profile.game, platform: profile.platform, providerId: profile.providerId } };
  }
}
