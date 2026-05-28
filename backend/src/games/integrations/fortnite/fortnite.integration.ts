import { Injectable } from '@nestjs/common';
import { StubIntegration } from '../stub.base';

/**
 * Fortnite — fortnite-api.com (community, free key).
 * Docs: https://fortnite-api.com/documentation
 *
 * Endpoint to wire:
 *   GET https://fortnite-api.com/v2/stats/br/v2
 *     Header: Authorization: <FORTNITE_API_KEY>
 *     Query:  name=<username>&accountType=epic|psn|xbl
 *
 * Use `q.platform` in your call to select epic / psn / xbl / switch.
 */
@Injectable()
export class FortniteIntegration extends StubIntegration {
  readonly slug = 'fortnite' as const;
  readonly name = 'Fortnite';
  readonly providerLabel = 'fortnite-api.com';
  readonly envKey = 'FORTNITE_API_KEY';
  readonly platforms = ['epic', 'psn', 'xbl', 'switch'] as const;
}
