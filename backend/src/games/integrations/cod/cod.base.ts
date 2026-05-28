import { StubIntegration } from '../stub.base';

/**
 * Call of Duty family — Activision shut down the public API around 2022, and
 * has not replaced it. There is no first-party way to fetch CoD stats today.
 *
 * What still exists:
 *   - A handful of community proxies (very unstable, rate-limited, frequently
 *     blocked by Activision) — names change, lifespans are short.
 *   - The Activision Companion app (proprietary, OAuth-restricted) — out of
 *     scope for a self-hosted tracker.
 *
 * GamePulseTracker handles CoD via the companion ingest path: an Overwolf
 * overlay (or a local screen-reader) posts stats to /ingest/<slug> using a
 * paired device key. See /docs/CLIENT.md.
 *
 * If a stable public provider re-appears, replace this base's getProfile()
 * with the real call and all five CoD slugs inherit it.
 */
export abstract class CodBaseIntegration extends StubIntegration {
  readonly providerLabel = 'no public API — companion ingest only';
  readonly envKey = 'COD_API_KEY';
  readonly platforms = ['activision', 'psn', 'xbl', 'steam', 'battle.net'] as const;
}
