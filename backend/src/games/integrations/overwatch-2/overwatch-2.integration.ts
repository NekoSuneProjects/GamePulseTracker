import { Injectable } from '@nestjs/common';
import { StubIntegration } from '../stub.base';

/**
 * Overwatch 2 — no official API. Community options:
 *   - overfast-api (community FastAPI wrapper, scrapes playoverwatch.com)
 *   - ow-api.com / overwatch-api.tekrop.fr
 *
 * Endpoint sketch (overfast):
 *   GET https://overfast-api.tekrop.fr/players/<battletag-with-hyphen>
 *
 * `q.platform` is informational only — Blizzard merged stats across platforms.
 */
@Injectable()
export class Overwatch2Integration extends StubIntegration {
  readonly slug = 'overwatch-2' as const;
  readonly name = 'Overwatch 2';
  readonly providerLabel = 'overfast-api / playoverwatch.com scrape';
  readonly envKey = 'OVERWATCH_API_KEY';
  readonly platforms = ['battle.net', 'psn', 'xbl', 'switch'] as const;
}
