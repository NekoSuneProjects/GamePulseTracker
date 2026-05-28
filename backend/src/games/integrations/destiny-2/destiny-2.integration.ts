import { Injectable } from '@nestjs/common';
import { StubIntegration } from '../stub.base';

/**
 * Destiny 2 — Bungie API.
 *   Search:  GET .../Destiny2/SearchDestinyPlayer/{membershipType}/{displayName}/
 *   Profile: GET .../Destiny2/{membershipType}/Profile/{destinyMembershipId}/
 *
 * For OAuth-only fields, wire BUNGIE_OAUTH_CLIENT_ID/SECRET via Connections.
 * `q.platform` maps to membershipType: steam=3, xbl=1, psn=2, epic=6, stadia=5.
 */
@Injectable()
export class Destiny2Integration extends StubIntegration {
  readonly slug = 'destiny-2' as const;
  readonly name = 'Destiny 2';
  readonly providerLabel = 'bungie.net Platform';
  readonly envKey = 'BUNGIE_API_KEY';
  readonly platforms = ['steam', 'xbl', 'psn', 'epic', 'stadia'] as const;
}
