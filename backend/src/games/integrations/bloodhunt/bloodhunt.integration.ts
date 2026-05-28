import { Injectable } from '@nestjs/common';
import { StubIntegration } from '../stub.base';

/**
 * Bloodhunt — no official public stats API. Manual link only;
 * companion ingest is the only path to live data.
 */
@Injectable()
export class BloodhuntIntegration extends StubIntegration {
  readonly slug = 'bloodhunt' as const;
  readonly name = 'Bloodhunt';
  readonly providerLabel = 'none / companion ingest';
  readonly envKey = 'BLOODHUNT_API_KEY';
  readonly platforms = ['pc'] as const;
}
