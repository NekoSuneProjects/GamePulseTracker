import { Injectable } from '@nestjs/common';
import type { NormalizedProfile, LeaderboardEntry } from '@gpt/shared';
import type { GameIntegration, ProfileQuery, ResolvedIdentity, SearchHit } from '../integration.interface';
import { httpJson } from '../http.helper';

/**
 * Beat Saber — ScoreSaber (default) or BeatLeader (fallback).
 *
 *   Docs:    https://docs.scoresaber.com/
 *   Profile: GET https://scoresaber.com/api/player/<playerId>/full
 *   Search:  GET https://scoresaber.com/api/players?search=<name>&page=1
 *   Top:     GET https://scoresaber.com/api/players?page=1&sort=0  (sort=0 = pp desc)
 *
 * No key required.
 *
 * `playerId` = the player's Steam id (vanilla PCVR) or Oculus id. ScoreSaber
 * normalises both into a numeric "playerId" string.
 */

const SS = 'https://scoresaber.com/api';

interface SsPlayer {
  id: string;
  name: string;
  profilePicture?: string;
  country?: string;
  pp?: number;
  rank?: number;
  countryRank?: number;
  histories?: string;
  scoreStats?: { totalScore?: number; totalRankedScore?: number; averageRankedAccuracy?: number; totalPlayCount?: number; rankedPlayCount?: number; replaysWatched?: number };
  banned?: boolean;
  inactive?: boolean;
  badges?: Array<{ description: string; image: string }>;
}

interface SsPlayerList { players: SsPlayer[]; metadata: { total: number; page: number; itemsPerPage: number } }

@Injectable()
export class BeatSaberIntegration implements GameIntegration {
  readonly slug = 'beat-saber' as const;
  readonly name = 'Beat Saber';
  readonly live = true;
  readonly platforms = ['pcvr', 'quest'] as const;
  isEnabled() { return true; }

  async search(q: { query: string }): Promise<SearchHit[]> {
    if (!q.query.trim()) return [];
    try {
      const r = await httpJson<SsPlayerList>(`${SS}/players`, { query: { search: q.query, page: 1 } });
      return (r.players ?? []).slice(0, 10).map(p => ({
        providerId: p.id,
        displayName: p.name,
        platform: 'pcvr',
        avatarUrl: p.profilePicture,
      }));
    } catch { return []; }
  }

  async resolveIdentity(q: ProfileQuery): Promise<ResolvedIdentity> {
    if (/^\d+$/.test(q.identifier)) {
      return { providerId: q.identifier, displayName: q.identifier, platform: q.platform ?? 'pcvr' };
    }
    const r = await httpJson<SsPlayerList>(`${SS}/players`, { query: { search: q.identifier, page: 1 } });
    const first = r.players?.[0];
    if (!first) throw new Error('ScoreSaber player not found');
    return { providerId: first.id, displayName: first.name, platform: q.platform ?? 'pcvr' };
  }

  async getProfile(q: ProfileQuery): Promise<NormalizedProfile> {
    const resolved = await this.resolveIdentity(q);
    const p = await httpJson<SsPlayer>(`${SS}/player/${resolved.providerId}/full`);

    const s = p.scoreStats ?? {};
    return {
      game: 'beat-saber',
      providerId: p.id,
      displayName: p.name,
      platform: q.platform ?? 'pcvr',
      avatarUrl: p.profilePicture,
      headline: {
        rank:    p.rank ? `#${p.rank.toLocaleString()}` : undefined,
        rankTier: p.countryRank ?? undefined,
        xp:      Math.round(p.pp ?? 0),
        wins:    s.rankedPlayCount,
        matches: s.totalPlayCount,
        kd:      s.averageRankedAccuracy ? Number(s.averageRankedAccuracy.toFixed(3)) : undefined,
      },
      details: {
        country: p.country ?? null,
        pp: p.pp ?? null,
        countryRank: p.countryRank ?? null,
        totalScore: s.totalScore ?? null,
        totalRankedScore: s.totalRankedScore ?? null,
        averageRankedAccuracy: s.averageRankedAccuracy ?? null,
        totalPlayCount: s.totalPlayCount ?? null,
        rankedPlayCount: s.rankedPlayCount ?? null,
        replaysWatched: s.replaysWatched ?? null,
        banned: p.banned ?? null,
        inactive: p.inactive ?? null,
        badges: p.badges?.length ?? 0,
      },
      fetchedAt: new Date().toISOString(),
    };
  }

  async getLeaderboard(q: { metric: string; limit?: number }): Promise<LeaderboardEntry[]> {
    // ScoreSaber's global ranking is PP-based; we expose it as the "level" metric.
    const r = await httpJson<SsPlayerList>(`${SS}/players`, { query: { page: 1, sort: 0 } });
    return (r.players ?? []).slice(0, q.limit ?? 100).map((p, i) => ({
      rank: p.rank ?? i + 1,
      providerId: p.id,
      displayName: p.name,
      avatarUrl: p.profilePicture,
      metricLabel: q.metric,
      metricValue: Math.round(p.pp ?? 0),
    }));
  }
}
