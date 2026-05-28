import { Injectable } from '@nestjs/common';
import { StubIntegration } from '../stub.base';

/**
 * Rainbow Six Siege — Ubisoft has no public stats API. Community options:
 *   - r6tracker.network (tracker.gg backend, ToS-sensitive)
 *   - r6stats.com community API (rate-limited)
 *
 * Endpoint sketch (r6stats):
 *   GET https://api2.r6stats.com/public-api/stats/<playerId>/<platform>/generic
 *   Header: Authorization: Bearer <R6_API_KEY>
 *
 * `q.platform` → r6stats: pc → uplay, psn → psn, xbl → xbl
 */
@Injectable()
export class R6SiegeIntegration extends StubIntegration {
  readonly slug = 'r6-siege' as const;
  readonly name = 'Rainbow Six Siege';
  readonly providerLabel = 'r6stats.com';
  readonly envKey = 'R6_API_KEY';
  readonly platforms = ['pc', 'psn', 'xbl'] as const;
}
