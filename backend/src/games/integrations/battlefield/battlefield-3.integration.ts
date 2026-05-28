import { Injectable } from '@nestjs/common';
import { BattlefieldBaseIntegration } from './battlefield.base';

@Injectable()
export class Battlefield3Integration extends BattlefieldBaseIntegration {
  readonly slug = 'battlefield-3' as const;
  readonly name = 'Battlefield 3';
}
