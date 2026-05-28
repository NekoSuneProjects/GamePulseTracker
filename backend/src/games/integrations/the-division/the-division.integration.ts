import { Injectable } from '@nestjs/common';
import { StubIntegration } from '../stub.base';

/** The Division (Tom Clancy's) — no public stats API. Companion ingest only. */
@Injectable()
export class TheDivisionIntegration extends StubIntegration {
  readonly slug = 'the-division' as const;
  readonly name = 'The Division';
  readonly providerLabel = 'none / companion ingest';
  readonly envKey = 'DIVISION_API_KEY';
  readonly platforms = ['pc', 'psn', 'xbl'] as const;
}
