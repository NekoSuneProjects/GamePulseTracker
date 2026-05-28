import { Injectable } from '@nestjs/common';
import { StubIntegration } from '../stub.base';

/**
 * Halo Infinite — autocode (halo.api.stdlib.com) shut down in 2023–24, so the
 * old wrapper this scaffold used at first is dead. Current community options:
 *
 *  - HaloDotAPI / `halodotapi.com` (community)
 *  - Direct Waypoint scraping (review Microsoft's ToS first)
 *  - Spnkr-style projects on GitHub
 *
 * When you wire up a provider, set HALO_API_KEY and replace the body of
 * `getProfile` in your override of this stub.
 */
@Injectable()
export class HaloInfiniteIntegration extends StubIntegration {
  readonly slug = 'halo-infinite' as const;
  readonly name = 'Halo Infinite';
  readonly providerLabel = 'community Waypoint mirror (autocode is dead)';
  readonly envKey = 'HALO_API_KEY';
  readonly platforms = ['xbl', 'pc', 'switch'] as const;
}
