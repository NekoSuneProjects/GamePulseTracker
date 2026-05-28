import { Injectable } from '@nestjs/common';
import { BattlefieldBaseIntegration } from './battlefield.base';

@Injectable()
export class Battlefield5Integration extends BattlefieldBaseIntegration {
  readonly slug = 'battlefield-5' as const;
  readonly name = 'Battlefield V';
}
