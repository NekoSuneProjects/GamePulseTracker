import { Injectable } from '@nestjs/common';
import type { NormalizedProfile, LeaderboardEntry } from '@gpt/shared';
import type { GameIntegration, ProfileQuery, ResolvedIdentity, SearchHit } from '../integration.interface';
import { httpJson } from '../http.helper';

/**
 * Beat Saber — multi-backend aggregator.
 *
 * Beat Saber has several independent ranking ecosystems. None has the full
 * picture by itself, so we query each in parallel and merge what we get. The
 * `providerId` is the player's Steam id (PCVR) or Oculus id, which all four
 * APIs key off of.
 *
 *   - ScoreSaber (https://docs.scoresaber.com/)
 *     Vanilla ranked PP, country rank, accuracy. The big public one.
 *
 *   - BeatLeader (https://api.beatleader.xyz/)
 *     Modded + vanilla. Tracks replay mods (NoodleExtensions, MappingExtensions,
 *     Chroma, etc.) and surfaces per-replay modifier usage. We pull these
 *     into the `mods_*` details so users can see what they actually play.
 *
 *   - AccSaber (https://accsaber.com/api/)
 *     Accuracy-focused ranking on the AccSaber playlist.
 *
 *   - HitBloq (https://hitbloq.com/api/)
 *     Pool-based ranking with custom curves. Surfaces per-pool ranks if found.
 *
 * Detection: if a provider returns 404 we skip it silently. `details._sources`
 * lists which providers had data so the UI can show source badges.
 */

interface SsPlayer {
  id: string; name: string;
  profilePicture?: string; country?: string;
  pp?: number; rank?: number; countryRank?: number;
  scoreStats?: { totalScore?: number; totalRankedScore?: number; averageRankedAccuracy?: number; totalPlayCount?: number; rankedPlayCount?: number; replaysWatched?: number };
  banned?: boolean; inactive?: boolean;
  badges?: Array<{ description: string; image: string }>;
}
interface SsPlayerList { players: SsPlayer[]; metadata: { total: number; page: number; itemsPerPage: number } }

interface BlPlayer {
  id: string;            // same id space as ScoreSaber (Steam/Oculus)
  name: string;
  avatar?: string;
  country?: string;
  pp?: number;
  rank?: number;
  countryRank?: number;
  banned?: boolean;
  inactive?: boolean;
  scoreStats?: {
    totalScore?: number;
    totalRankedScore?: number;
    averageRankedAccuracy?: number;
    averageAccuracy?: number;
    totalPlayCount?: number;
    rankedPlayCount?: number;
    topPp?: number;
    topAccuracy?: number;
    medianAccuracy?: number;
    medianRankedAccuracy?: number;
    averageHmd?: number;
    modifiersRatings?: Record<string, number>;
  };
  /** BeatLeader's per-replay mod usage roll-up. */
  scoreStatsHistoryRecent?: Array<{ date: string; pp?: number; accuracy?: number; mods?: string[] }>;
  /** Some endpoints also return a `mods` field on the player root with the most-used modifier list. */
  preferredModifiers?: string[];
}

interface AccSaberPlayer {
  rank?: number;
  ap?: number;          // AccSaber's PP equivalent
  averageAcc?: number;
  rankedPlays?: number;
  hmd?: number;
  name?: string;
}

interface HitbloqProfile {
  cr?: Record<string, number>;       // per-pool CR (ranking points), e.g. { tech: 12.4, dance: 8.2 }
  ranks?: Record<string, number>;    // per-pool rank
}

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
      // ScoreSaber's player search is best for discovery (largest user base).
      const r = await httpJson<SsPlayerList>(`https://scoresaber.com/api/players`, { query: { search: q.query, page: 1 } });
      const ss = (r.players ?? []).slice(0, 10).map(p => ({
        providerId: p.id, displayName: p.name, platform: 'pcvr' as const, avatarUrl: p.profilePicture,
      }));
      if (ss.length > 0) return ss;
    } catch { /* fall through to BeatLeader */ }

    try {
      const r = await httpJson<{ data: BlPlayer[] }>(`https://api.beatleader.xyz/players`, { query: { search: q.query, count: 10 } });
      return (r.data ?? []).map(p => ({
        providerId: p.id, displayName: p.name, platform: 'pcvr' as const, avatarUrl: p.avatar,
      }));
    } catch { return []; }
  }

  async resolveIdentity(q: ProfileQuery): Promise<ResolvedIdentity> {
    if (/^\d+$/.test(q.identifier)) {
      return { providerId: q.identifier, displayName: q.identifier, platform: q.platform ?? 'pcvr' };
    }
    // Resolve by name via ScoreSaber first, BeatLeader as fallback.
    try {
      const r = await httpJson<SsPlayerList>(`https://scoresaber.com/api/players`, { query: { search: q.identifier, page: 1 } });
      const p = r.players?.[0];
      if (p) return { providerId: p.id, displayName: p.name, platform: q.platform ?? 'pcvr' };
    } catch { /* try BeatLeader */ }

    try {
      const r = await httpJson<{ data: BlPlayer[] }>(`https://api.beatleader.xyz/players`, { query: { search: q.identifier, count: 1 } });
      const p = r.data?.[0];
      if (p) return { providerId: p.id, displayName: p.name, platform: q.platform ?? 'pcvr' };
    } catch { /* */ }

    throw new Error('Beat Saber player not found on ScoreSaber or BeatLeader');
  }

  async getProfile(q: ProfileQuery): Promise<NormalizedProfile> {
    const resolved = await this.resolveIdentity(q);
    const id = resolved.providerId;

    const [ss, bl, acc, hb] = await Promise.allSettled([
      httpJson<SsPlayer>(`https://scoresaber.com/api/player/${id}/full`),
      httpJson<BlPlayer>(`https://api.beatleader.xyz/player/${id}?stats=true&keepOriginalId=true`),
      httpJson<AccSaberPlayer>(`https://accsaber.com/api/player/${id}/profile`),
      httpJson<HitbloqProfile>(`https://hitbloq.com/api/player_data/${id}`),
    ]);

    const sources: string[] = [];

    const ssData = ss.status === 'fulfilled' ? ss.value : null;
    const blData = bl.status === 'fulfilled' ? bl.value : null;
    const accData = acc.status === 'fulfilled' ? acc.value : null;
    const hbData = hb.status === 'fulfilled' ? hb.value : null;

    if (ssData) sources.push('scoresaber');
    if (blData) sources.push('beatleader');
    if (accData) sources.push('accsaber');
    if (hbData) sources.push('hitbloq');

    if (sources.length === 0) {
      throw new Error('Beat Saber player not found on any backend');
    }

    const displayName = ssData?.name ?? blData?.name ?? accData?.name ?? resolved.displayName;
    const avatarUrl = ssData?.profilePicture ?? blData?.avatar;

    // Mod / modifier roll-up from BeatLeader (only it exposes this).
    const modUsage = this.aggregateMods(blData);

    // Pick a headline that's stable across providers.
    const ssScores = ssData?.scoreStats ?? {};
    const blScores = blData?.scoreStats ?? {};

    return {
      game: 'beat-saber',
      providerId: id,
      displayName,
      platform: q.platform ?? 'pcvr',
      avatarUrl,
      headline: {
        rank:     ssData?.rank ? `#${ssData.rank.toLocaleString()}` : (blData?.rank ? `BL #${blData.rank.toLocaleString()}` : undefined),
        rankTier: ssData?.countryRank ?? blData?.countryRank,
        xp:       Math.round(ssData?.pp ?? blData?.pp ?? accData?.ap ?? 0),
        wins:     ssScores.rankedPlayCount ?? blScores.rankedPlayCount ?? accData?.rankedPlays,
        matches:  ssScores.totalPlayCount  ?? blScores.totalPlayCount,
        kd:       Number((ssScores.averageRankedAccuracy ?? blScores.averageRankedAccuracy ?? accData?.averageAcc ?? 0).toFixed(4)),
      },
      details: {
        _sources: sources.join(','),
        country: ssData?.country ?? blData?.country ?? null,

        // ScoreSaber metrics
        ss_pp:               ssData?.pp ?? null,
        ss_rank:             ssData?.rank ?? null,
        ss_country_rank:     ssData?.countryRank ?? null,
        ss_ranked_play_count: ssScores.rankedPlayCount ?? null,
        ss_total_play_count: ssScores.totalPlayCount ?? null,
        ss_average_ranked_accuracy: ssScores.averageRankedAccuracy ?? null,
        ss_total_score:      ssScores.totalScore ?? null,
        ss_total_ranked_score: ssScores.totalRankedScore ?? null,
        ss_replays_watched:  ssScores.replaysWatched ?? null,
        ss_banned:           ssData?.banned ?? null,
        ss_inactive:         ssData?.inactive ?? null,
        ss_badges:           ssData?.badges?.length ?? 0,

        // BeatLeader metrics — includes modded + vanilla
        bl_pp:               blData?.pp ?? null,
        bl_rank:             blData?.rank ?? null,
        bl_country_rank:     blData?.countryRank ?? null,
        bl_ranked_play_count: blScores.rankedPlayCount ?? null,
        bl_total_play_count: blScores.totalPlayCount ?? null,
        bl_top_pp:           blScores.topPp ?? null,
        bl_top_accuracy:     blScores.topAccuracy ?? null,
        bl_average_accuracy: blScores.averageAccuracy ?? null,
        bl_average_ranked_accuracy: blScores.averageRankedAccuracy ?? null,
        bl_median_accuracy:  blScores.medianAccuracy ?? null,
        bl_average_hmd:      blScores.averageHmd ?? null,

        // BeatLeader mod / modifier rollup
        mods_top_used:       modUsage.topUsed.join(',') || null,
        mods_total_plays_with_mods: modUsage.totalWithMods,
        mods_preferred:      (blData?.preferredModifiers ?? []).join(',') || null,
        mods_modifier_ratings: blData?.scoreStats?.modifiersRatings ? JSON.stringify(blData.scoreStats.modifiersRatings) : null,

        // AccSaber metrics (accuracy-focused ladder)
        acc_ap:              accData?.ap ?? null,
        acc_rank:            accData?.rank ?? null,
        acc_average_acc:     accData?.averageAcc ?? null,
        acc_ranked_plays:    accData?.rankedPlays ?? null,
        acc_hmd:             accData?.hmd ?? null,

        // HitBloq per-pool ranks (top 3 by CR)
        hb_pools:            hbData?.cr ? Object.entries(hbData.cr).sort((a,b) => b[1]-a[1]).slice(0,3).map(([pool, cr]) => `${pool}:${cr.toFixed(1)}`).join(',') : null,
        hb_top_pool:         hbData?.cr ? Object.entries(hbData.cr).sort((a,b) => b[1]-a[1])[0]?.[0] ?? null : null,
      },
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * BeatLeader returns recent scores with a `mods` array per score. We roll
   * that up into top-used modifiers and a count of plays with any mod set.
   */
  private aggregateMods(bl: BlPlayer | null): { topUsed: string[]; totalWithMods: number } {
    const recent = bl?.scoreStatsHistoryRecent ?? [];
    if (recent.length === 0) return { topUsed: [], totalWithMods: 0 };
    const counts: Record<string, number> = {};
    let withMods = 0;
    for (const s of recent) {
      if (!s.mods?.length) continue;
      withMods++;
      for (const m of s.mods) counts[m] = (counts[m] ?? 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([m]) => m);
    return { topUsed: top, totalWithMods: withMods };
  }

  async getLeaderboard(q: { metric: string; limit?: number }): Promise<LeaderboardEntry[]> {
    // Global ScoreSaber leaderboard (PP-based).
    const r = await httpJson<SsPlayerList>(`https://scoresaber.com/api/players`, { query: { page: 1, sort: 0 } });
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
