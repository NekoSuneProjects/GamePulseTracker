import { Injectable } from '@nestjs/common';
import { BattlefieldBaseIntegration } from './battlefield.base';

@Injectable()
export class Battlefield4Integration extends BattlefieldBaseIntegration {
  readonly slug = 'battlefield-4' as const;
  readonly name = 'Battlefield 4';
}
