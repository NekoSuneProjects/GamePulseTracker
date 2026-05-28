import { Injectable } from '@nestjs/common';
import { StubIntegration } from '../stub.base';

/** The Division 2 — same as TD1, no public API; companion ingest only. */
@Injectable()
export class TheDivision2Integration extends StubIntegration {
  readonly slug = 'the-division-2' as const;
  readonly name = 'The Division 2';
  readonly providerLabel = 'none / companion ingest';
  readonly envKey = 'DIVISION2_API_KEY';
  readonly platforms = ['pc', 'psn', 'xbl'] as const;
}
