import { Injectable } from '@nestjs/common';
import { StubIntegration } from '../stub.base';

/**
 * Marvel Rivals — no official public API as of 2026.
 * Community option: tracker-network style scrape (review ToS).
 * Recommended: switch to ingest-only via Overwolf companion when available.
 */
@Injectable()
export class MarvelRivalsIntegration extends StubIntegration {
  readonly slug = 'marvel-rivals' as const;
  readonly name = 'Marvel Rivals';
  readonly providerLabel = 'community / overlay';
  readonly envKey = 'MARVEL_RIVALS_API_KEY';
  readonly platforms = ['pc', 'psn', 'xbl'] as const;
}
