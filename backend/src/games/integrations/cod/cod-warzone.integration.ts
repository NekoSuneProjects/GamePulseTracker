import { Injectable } from '@nestjs/common';
import { CodBaseIntegration } from './cod.base';

@Injectable()
export class CodWarzoneIntegration extends CodBaseIntegration {
  readonly slug = 'cod-warzone' as const;
  readonly name = 'CoD: Warzone 2.0';
}
