import { Injectable } from '@nestjs/common';
import { CodBaseIntegration } from './cod.base';

@Injectable()
export class CodBo6Integration extends CodBaseIntegration {
  readonly slug = 'cod-bo6' as const;
  readonly name = 'CoD: Black Ops 6';
}
