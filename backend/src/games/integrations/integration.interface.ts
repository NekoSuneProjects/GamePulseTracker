import type { GameSlug, LeaderboardEntry, NormalizedProfile, NewsItem } from '@gpt/shared';

/**
 * Contract every game integration implements.
 *
 * Lives under `src/games/integrations/<slug>/<slug>.integration.ts` and is
 * registered in `integrations.module.ts`.
 *
 * The interface is **platform-aware** — every read takes a `ProfileQuery`
 * containing the user-supplied identifier (username, uuid, steamid64, ...)
 * AND the optional platform the user chose in the UI. Integrations that
 * are platform-agnostic (Hypixel, Wynncraft, OSRS, RS3, ...) ignore it.
 */

export interface ProfileQuery {
  /** What the user typed / clicked. Could be a username or a stable provider id. */
  identifier: string;
  /** The selected platform (matching this game's `platforms[]`); undefined = default. */
  platform?: string;
}

export interface SearchHit {
  providerId: string;
  displayName: string;
  platform?: string;
  avatarUrl?: string;
}

export interface ResolvedIdentity {
  providerId: string;
  displayName: string;
  platform?: string;
}

export interface GameIntegration {
  readonly slug: GameSlug;
  readonly name: string;
  /** Whether real-API calls are wired (false = stub). */
  readonly live: boolean;
  /** Selectable platforms for the UI dropdown. Empty/omitted = platform-agnostic. */
  readonly platforms?: readonly string[];
  /** True if this integration only receives data via the /ingest companion API. */
  readonly ingestOnly?: boolean;

  /** Disabled integrations are skipped by the registry / scheduler. */
  isEnabled(): boolean;

  /** Provider-side player search. May be empty if the provider doesn't support search. */
  search(q: { query: string; platform?: string }): Promise<SearchHit[]>;

  /** Fetch the normalized profile. */
  getProfile(q: ProfileQuery): Promise<NormalizedProfile>;

  /**
   * Optionally resolve a username (or other unstable input) into the platform's
   * stable id. Called by the IdentityResolveScheduler to detect when a
   * LinkedAccount has changed its underlying account (e.g. PS5 EA-account swap).
   */
  resolveIdentity?(q: ProfileQuery): Promise<ResolvedIdentity>;

  /** Optional extra: recent matches beyond what getProfile returned. */
  getRecentMatches?(q: ProfileQuery, limit?: number): Promise<NormalizedProfile['recent']>;

  /** Optional extra: leaderboard for a given metric (provider-side, may be empty). */
  getLeaderboard?(q: { metric: string; platform?: string; limit?: number }): Promise<LeaderboardEntry[]>;

  /** Optional extra: news feed for the game (RSS / blog / patch notes). */
  getNews?(): Promise<NewsItem[]>;
}

/** Minimum suggested cache TTL per endpoint, in seconds. */
export const DEFAULT_TTL = {
  profile:     60,
  matches:     30,
  leaderboard: 300,
  search:      60,
  news:        1800,
  resolve:     86400,
} as const;

export const PLATFORM_SENTINEL = '_';

/** Normalises platform: empty/undefined → sentinel; otherwise lowercased. */
export function normalisePlatform(p?: string | null): string {
  return p && p.trim() ? p.trim().toLowerCase() : PLATFORM_SENTINEL;
}
