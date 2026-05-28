import type { GameSlug } from './games';
import type { NormalizedProfile, NormalizedMatch } from './stats';

/**
 * Companion ingest payload — what an Overwolf overlay or desktop client posts
 * to /ingest/:game when it has fresh stats to upload on behalf of a user who
 * has paired a device.
 *
 * The backend validates each field, attributes the data to the device's user,
 * and feeds it through the same normalization pipeline as server-side
 * integration fetches.
 */
export interface IngestPayload {
  game: GameSlug;
  platform?: string;
  /** Stable provider id (will be created if it does not exist yet). */
  providerId: string;
  /** Human-readable username at time of capture. */
  displayName: string;
  /** When the companion observed these stats (the client's wall clock). */
  capturedAt: string;
  /** A full or partial NormalizedProfile snapshot. */
  snapshot: Partial<NormalizedProfile> & Pick<NormalizedProfile, 'game' | 'providerId' | 'displayName' | 'headline' | 'details'>;
  /** Optional incremental matches the companion observed. */
  matches?: NormalizedMatch[];
  /** Optional structured event the companion wants to broadcast. */
  events?: IngestEvent[];
}

export type IngestEvent =
  | { type: 'level:up';    payload: { oldLevel?: number; newLevel: number } }
  | { type: 'rank:changed'; payload: { oldRank?: string; newRank: string } }
  | { type: 'match:end';   payload: { matchId: string; result: 'win' | 'loss' | 'draw' } }
  | { type: 'inventory:snapshot'; payload: Record<string, unknown> };

export interface DevicePairingChallenge {
  /** Short user-facing code shown on the device, e.g. "GH-39K2". */
  code: string;
  /** Expires-at timestamp. */
  expiresAt: string;
}

export interface DevicePairingResult {
  /** Long-lived device API key. Stored hashed server-side. */
  deviceKey: string;
  /** Friendly device id (uuid). */
  deviceId: string;
}
