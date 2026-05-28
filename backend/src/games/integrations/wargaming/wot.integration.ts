import { Injectable } from '@nestjs/common';
import { WargamingBaseIntegration } from './wargaming.base';

@Injectable()
export class WotIntegration extends WargamingBaseIntegration {
  readonly slug = 'wot' as const;
  readonly name = 'World of Tanks';
  readonly hostGame = 'worldoftanks';
  readonly urlPrefix = 'wot';
}
