import { Injectable } from '@nestjs/common';
import { WargamingBaseIntegration } from './wargaming.base';

@Injectable()
export class WowsIntegration extends WargamingBaseIntegration {
  readonly slug = 'wows' as const;
  readonly name = 'World of Warships';
  readonly hostGame = 'worldofwarships';
  readonly urlPrefix = 'wows';
}
