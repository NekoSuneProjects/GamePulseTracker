import { StubIntegration } from '../stub.base';

/**
 * Common base for all Battlefield titles. They all share the same provider
 * choices today (gametools.network) and the same env key.
 *
 * Endpoint shape:
 *   GET https://api.gametools.network/<title>/stats/?name=<name>&platform=pc|xboxone|ps4&format_values=true&lang=en-us
 *
 * `q.platform` maps: pc→pc, xbl→xboxone, psn→ps4.
 */
export abstract class BattlefieldBaseIntegration extends StubIntegration {
  readonly providerLabel = 'gametools.network';
  readonly envKey = 'BATTLEFIELD_API_KEY';
  readonly platforms = ['pc', 'psn', 'xbl'] as const;
}
