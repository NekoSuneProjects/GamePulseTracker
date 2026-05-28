import type { GameSlug } from './games';
import type { NormalizedProfile } from './stats';

/** Server -> client real-time events. */
export type WsServerEvent =
  | { type: 'stats:updated';     payload: { game: GameSlug; providerId: string; profile: NormalizedProfile; delta?: Record<string, [unknown, unknown]> } }
  | { type: 'rank:changed';      payload: { game: GameSlug; providerId: string; oldRank?: string; newRank?: string } }
  | { type: 'level:up';          payload: { game: GameSlug; providerId: string; oldLevel?: number; newLevel: number } }
  | { type: 'match:new';         payload: { game: GameSlug; providerId: string; matchId: string } }
  | { type: 'leaderboard:moved'; payload: { game: GameSlug; providerId: string; oldRank?: number; newRank: number } }
  | { type: 'notification';      payload: { id: string; title: string; body: string; level: 'info' | 'success' | 'warn' | 'error' } };

/** Client -> server events. */
export type WsClientEvent =
  | { type: 'subscribe:profile';   payload: { game: GameSlug; providerId: string } }
  | { type: 'unsubscribe:profile'; payload: { game: GameSlug; providerId: string } }
  | { type: 'subscribe:leaderboard';   payload: { game: GameSlug; metric: string } }
  | { type: 'unsubscribe:leaderboard'; payload: { game: GameSlug; metric: string } };
