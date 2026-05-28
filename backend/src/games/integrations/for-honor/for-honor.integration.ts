import { Injectable } from '@nestjs/common';
import { StubIntegration } from '../stub.base';

/**
 * For Honor — no public stats API; Ubisoft Connect is auth-gated.
 * Companion ingest is the supported path here.
 */
@Injectable()
export class ForHonorIntegration extends StubIntegration {
  readonly slug = 'for-honor' as const;
  readonly name = 'For Honor';
  readonly providerLabel = 'none / companion ingest';
  readonly envKey = 'FOR_HONOR_API_KEY';
  readonly platforms = ['pc', 'psn', 'xbl'] as const;
}
