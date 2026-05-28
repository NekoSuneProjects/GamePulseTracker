import { Injectable } from '@nestjs/common';
import { WargamingBaseIntegration } from './wargaming.base';

@Injectable()
export class WowpIntegration extends WargamingBaseIntegration {
  readonly slug = 'wowp' as const;
  readonly name = 'World of Warplanes';
  readonly hostGame = 'worldofwarplanes';
  readonly urlPrefix = 'wowp';
  // No global clan API on WoWp; the base skips it for slug 'wowp'.
}
