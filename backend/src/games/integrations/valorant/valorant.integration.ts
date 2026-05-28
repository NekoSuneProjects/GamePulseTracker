import { Injectable } from '@nestjs/common';
import { StubIntegration } from '../stub.base';

/**
 * Valorant — Riot Games VAL-* endpoints (account-v1 + val-ranked-v1).
 * Getting a *production* API key from Riot is hard; their default dev key
 * expires daily. Community fallback: henrikdev.xyz (community proxy).
 *
 * Endpoint sketch (henrikdev):
 *   GET https://api.henrikdev.xyz/valorant/v1/account/<name>/<tag>
 *   Header: Authorization: <RIOT_API_KEY>  (sometimes optional)
 *
 * `q.platform` chooses the regional shard (na, eu, ap, br, kr, latam).
 */
@Injectable()
export class ValorantIntegration extends StubIntegration {
  readonly slug = 'valorant' as const;
  readonly name = 'Valorant';
  readonly providerLabel = 'Riot VAL-* / henrikdev community';
  readonly envKey = 'RIOT_API_KEY';
  readonly platforms = ['na', 'eu', 'ap', 'br', 'kr', 'latam'] as const;
}
