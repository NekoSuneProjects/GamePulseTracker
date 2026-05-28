import { Injectable } from '@nestjs/common';
import { BattlefieldBaseIntegration } from './battlefield.base';

@Injectable()
export class BattlefieldHardlineIntegration extends BattlefieldBaseIntegration {
  readonly slug = 'battlefield-hardline' as const;
  readonly name = 'Battlefield Hardline';
}
