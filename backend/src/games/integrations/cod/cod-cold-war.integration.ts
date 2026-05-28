import { Injectable } from '@nestjs/common';
import { CodBaseIntegration } from './cod.base';

@Injectable()
export class CodColdWarIntegration extends CodBaseIntegration {
  readonly slug = 'cod-cold-war' as const;
  readonly name = 'CoD: Black Ops Cold War';
}
