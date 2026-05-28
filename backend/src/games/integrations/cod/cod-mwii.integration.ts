import { Injectable } from '@nestjs/common';
import { CodBaseIntegration } from './cod.base';

@Injectable()
export class CodMwiiIntegration extends CodBaseIntegration {
  readonly slug = 'cod-mwii' as const;
  readonly name = 'CoD: Modern Warfare II';
}
