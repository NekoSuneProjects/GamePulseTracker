import { Injectable } from '@nestjs/common';
import { BattlefieldBaseIntegration } from './battlefield.base';

@Injectable()
export class Battlefield2042Integration extends BattlefieldBaseIntegration {
  readonly slug = 'battlefield-2042' as const;
  readonly name = 'Battlefield 2042';
}
