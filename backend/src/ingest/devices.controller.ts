import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

class CreateDeviceDto {
  @IsString() @MaxLength(64) label!: string;
  @IsOptional() @IsArray() scopes?: string[];
}

class PairCompleteDto {
  @IsString() code!: string;
}

@ApiTags('devices')
@ApiBearerAuth()
@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private devices: DevicesService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return { ok: true, data: await this.devices.list(user.sub) };
  }

  /** Create a device + return the plaintext key once (for headless installs). */
  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDeviceDto) {
    const result = await this.devices.create(user.sub, dto.label, dto.scopes ?? []);
    return { ok: true, data: { deviceId: result.device.id, prefix: result.device.prefix, deviceKey: result.deviceKey } };
  }

  /** UI flow: user clicks "Pair a new device", gets a short code, types into companion. */
  @Post('pair/start')
  async pairStart(@CurrentUser() user: JwtPayload, @Body() dto: CreateDeviceDto) {
    const out = await this.devices.startPairing(user.sub, dto.label);
    return { ok: true, data: out };
  }

  @Post('pair/complete')
  async pairComplete(@CurrentUser() user: JwtPayload, @Body() dto: PairCompleteDto) {
    const out = await this.devices.completePairing(user.sub, dto.code);
    return { ok: true, data: out };
  }

  @Delete(':id')
  async revoke(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.devices.revoke(user.sub, id);
    return { ok: true, data: null };
  }
}
