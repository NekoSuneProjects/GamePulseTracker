import { Injectable } from '@nestjs/common';
import { StubIntegration } from '../stub.base';

/**
 * Destiny (D1) — Bungie API: https://www.bungie.net/en/Application
 *   GET https://www.bungie.net/Platform/Destiny/Stats/Account/{membershipType}/{destinyMembershipId}/
 *   Header: X-API-Key: <BUNGIE_API_KEY>
 */
@Injectable()
export class DestinyIntegration extends StubIntegration {
  readonly slug = 'destiny' as const;
  readonly name = 'Destiny';
  readonly providerLabel = 'bungie.net Platform';
  readonly envKey = 'BUNGIE_API_KEY';
  readonly platforms = ['xbl', 'psn'] as const;
}
