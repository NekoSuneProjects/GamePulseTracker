import type { GameSlug } from './games';

/** Normalized stat shape every integration produces. */
export interface NormalizedProfile {
  game: GameSlug;
  /** Stable identifier the integration uses to address this player (uuid, accountId, etc). */
  providerId: string;
  /** Human-readable display name as returned by the provider. */
  displayName: string;
  /** Optional platform-specific tag (e.g. epic, steam, xbox). */
  platform?: string;
  /** Avatar URL if available. */
  avatarUrl?: string;
  /** Headline numbers shown on the player card. */
  headline: {
    level?: number;
    xp?: number;
    rank?: string;
    rankTier?: number;
    kd?: number;
    wins?: number;
    losses?: number;
    matches?: number;
    timePlayedSec?: number;
  };
  /** Long-tail stat dictionary, integration-specific. Front-end may render as table. */
  details: Record<string, string | number | boolean | null>;
  /** Optional list of recent matches. */
  recent?: NormalizedMatch[];
  /** Optional list of seasonal stat snapshots. */
  seasons?: NormalizedSeason[];
  /** Provider's report of when this data was last updated server-side. */
  providerUpdatedAt?: string;
  /** When *we* fetched the data. */
  fetchedAt: string;
}

export interface NormalizedMatch {
  matchId: string;
  playedAt: string;
  mode?: string;
  map?: string;
  result?: 'win' | 'loss' | 'draw' | 'unknown';
  kills?: number;
  deaths?: number;
  assists?: number;
  score?: number;
  durationSec?: number;
  details?: Record<string, string | number | boolean | null>;
}

export interface NormalizedSeason {
  seasonId: string;
  label: string;
  startedAt?: string;
  endedAt?: string;
  rank?: string;
  rankTier?: number;
  stats: Record<string, number>;
}

export interface LeaderboardEntry {
  rank: number;
  providerId: string;
  displayName: string;
  metricValue: number;
  metricLabel: string;
  avatarUrl?: string;
}
