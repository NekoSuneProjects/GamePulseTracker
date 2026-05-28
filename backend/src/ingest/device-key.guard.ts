import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DevicesService } from './devices.service';

/**
 * Guard for the /ingest/* endpoints. Expects header `X-Device-Key: gpt_dev_...`.
 * On success, populates `req.device` with the resolved Device row.
 */
@Injectable()
export class DeviceKeyGuard implements CanActivate {
  constructor(private devices: DevicesService, private _reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const key = (req.headers['x-device-key'] as string | undefined) ?? '';
    if (!key.startsWith('gpt_dev_')) {
      throw new UnauthorizedException({ code: 'MISSING_DEVICE_KEY', message: 'X-Device-Key header is required' });
    }
    req.device = await this.devices.authenticate(key);
    return true;
  }
}
