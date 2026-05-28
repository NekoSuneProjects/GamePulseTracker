import { Injectable } from '@nestjs/common';
import { StubIntegration } from '../stub.base';

/**
 * Splitgate — no official public API.
 * Companion-ingest is likely the cleanest path here.
 */
@Injectable()
export class SplitgateIntegration extends StubIntegration {
  readonly slug = 'splitgate' as const;
  readonly name = 'Splitgate';
  readonly providerLabel = 'none / manual';
  readonly envKey = 'SPLITGATE_API_KEY';
  readonly platforms = ['pc', 'psn', 'xbl'] as const;
}
