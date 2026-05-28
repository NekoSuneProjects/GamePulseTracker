import { Injectable } from '@nestjs/common';
import { BattlefieldBaseIntegration } from './battlefield.base';

@Injectable()
export class Battlefield1Integration extends BattlefieldBaseIntegration {
  readonly slug = 'battlefield-1' as const;
  readonly name = 'Battlefield 1';
}
