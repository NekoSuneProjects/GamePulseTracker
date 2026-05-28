import { Injectable } from '@nestjs/common';
import { CodBaseIntegration } from './cod.base';

@Injectable()
export class CodMwiiiIntegration extends CodBaseIntegration {
  readonly slug = 'cod-mwiii' as const;
  readonly name = 'CoD: Modern Warfare III';
}
