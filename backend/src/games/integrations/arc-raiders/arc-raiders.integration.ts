import { Injectable } from '@nestjs/common';
import { StubIntegration } from '../stub.base';

/**
 * Arc Raiders — no public API. This integration is INGEST-ONLY.
 *
 * Stats arrive via the companion Overwolf overlay or a desktop screen-reader
 * pairing with this server. See /docs/CLIENT.md for the contract.
 *
 * Server-side reads (`getProfile`) return whatever was most recently ingested
 * for the requested provider id — `latestSnapshot` on the TrackedProfile row.
 */
@Injectable()
export class ArcRaidersIntegration extends StubIntegration {
  readonly slug = 'arc-raiders' as const;
  readonly name = 'Arc Raiders';
  readonly providerLabel = 'companion ingest only';
  readonly envKey = null;
  readonly platforms = ['pc'] as const;
  readonly ingestOnly = true;
}
