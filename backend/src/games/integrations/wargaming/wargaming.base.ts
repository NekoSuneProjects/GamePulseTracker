import type { NormalizedProfile } from '@gpt/shared';
import type { GameIntegration, ProfileQuery, ResolvedIdentity, SearchHit } from '../integration.interface';
import { httpJson } from '../http.helper';

/**
 * Common base for Wargaming.net titles (WoT, WoWS, WoWp).
 *
 * Wargaming provides a free public API. Register an "application" at
 * https://developers.wargaming.net/ and put the id in `WARGAMING_APPLICATION_ID`.
 *
 * Endpoint pattern:
 *   https://api.<hostGame>.<regionTld>/<urlPrefix>/account/list/
 *   https://api.<hostGame>.<regionTld>/<urlPrefix>/account/info/
 *   https://api.<hostGame>.<regionTld>/<urlPrefix>/clans/accountinfo/
 *
 * hostGame is `worldoftanks` | `worldofwarships` | `worldofwarplanes`.
 * urlPrefix is `wot` | `wows` | `wowp`.
 */
const REGION_TLD: Record<string, string> = { na: 'com', eu: 'eu', asia: 'asia' };

interface WgAccountList { status: string; data?: Array<{ nickname: string; account_id: number }> }
interface WgAccountInfo {
  status: string;
  data?: Record<string, {
    nickname: string; created_at: number; last_battle_time: number; global_rating?: number;
    statistics?: { all?: { battles?: number; wins?: number; losses?: number; survived_battles?: number; xp?: number; frags?: number; damage_dealt?: number; spotted?: number } };
  }>;
}
interface WgClanInfo {
  status: string;
  data?: Record<string, null | { clan_id: number; role: string; joined_at: number; clan: { tag: string; name: string; members_count: number } }>;
}

export abstract class WargamingBaseIntegration implements GameIntegration {
  abstract readonly slug: 'wot' | 'wows' | 'wowp';
  abstract readonly name: string;
  abstract readonly hostGame: string;   // 'worldoftanks' | 'worldofwarships' | 'worldofwarplanes'
  abstract readonly urlPrefix: string;  // 'wot' | 'wows' | 'wowp'
  readonly live = true;
  readonly platforms = ['na', 'eu', 'asia'] as const;

  isEnabled() { return Boolean(process.env.WARGAMING_APPLICATION_ID); }

  private base(region: string) {
    const tld = REGION_TLD[region] ?? 'eu';
    return `https://api.${this.hostGame}.${tld}/${this.urlPrefix}`;
  }

  async search(q: { query: string; platform?: string }): Promise<SearchHit[]> {
    if (!this.isEnabled() || !q.query.trim()) return [];
    const region = q.platform ?? 'eu';
    const r = await httpJson<WgAccountList>(`${this.base(region)}/account/list/`, {
      query: { application_id: process.env.WARGAMING_APPLICATION_ID!, search: q.query, limit: '10' },
    });
    return (r.data ?? []).map(d => ({ providerId: String(d.account_id), displayName: d.nickname, platform: region }));
  }

  async resolveIdentity(q: ProfileQuery): Promise<ResolvedIdentity> {
    if (!this.isEnabled()) throw new Error('WARGAMING_APPLICATION_ID is not set');
    const region = q.platform ?? 'eu';
    if (/^\d+$/.test(q.identifier)) {
      return { providerId: q.identifier, displayName: q.identifier, platform: region };
    }
    const r = await httpJson<WgAccountList>(`${this.base(region)}/account/list/`, {
      query: { application_id: process.env.WARGAMING_APPLICATION_ID!, search: q.identifier, limit: '1' },
    });
    const first = r.data?.[0];
    if (!first) throw new Error('Wargaming account not found');
    return { providerId: String(first.account_id), displayName: first.nickname, platform: region };
  }

  async getProfile(q: ProfileQuery): Promise<NormalizedProfile> {
    if (!this.isEnabled()) throw new Error('WARGAMING_APPLICATION_ID is not set');
    const region = q.platform ?? 'eu';
    const resolved = await this.resolveIdentity(q);

    const info = await httpJson<WgAccountInfo>(`${this.base(region)}/account/info/`, {
      query: { application_id: process.env.WARGAMING_APPLICATION_ID!, account_id: resolved.providerId },
    });
    const acc = info.data?.[resolved.providerId];
    if (!acc) throw new Error('Wargaming account not found');

    let clan: NonNullable<WgClanInfo['data']>[string] = null;
    if (this.urlPrefix !== 'wowp') {
      const c = await httpJson<WgClanInfo>(`${this.base(region)}/clans/accountinfo/`, {
        query: { application_id: process.env.WARGAMING_APPLICATION_ID!, account_id: resolved.providerId, extra: 'clan' },
      }).catch(() => null);
      clan = c?.data?.[resolved.providerId] ?? null;
    }

    const s = acc.statistics?.all ?? {};
    const winRate = s.wins && s.battles ? Number(((s.wins / s.battles) * 100).toFixed(2)) : undefined;

    return {
      game: this.slug,
      providerId: resolved.providerId,
      displayName: acc.nickname,
      platform: region,
      headline: {
        kd:      this.safeRatio(s.frags, (s.battles ?? 0) - (s.survived_battles ?? 0)),
        wins:    s.wins,
        losses:  s.losses,
        matches: s.battles,
        xp:      s.xp,
      },
      details: {
        winRatePct: winRate ?? null,
        survivedBattles: s.survived_battles ?? null,
        damageDealt: s.damage_dealt ?? null,
        spotted: s.spotted ?? null,
        globalRating: acc.global_rating ?? null,
        createdAt: acc.created_at ? new Date(acc.created_at * 1000).toISOString() : null,
        lastBattleTime: acc.last_battle_time ? new Date(acc.last_battle_time * 1000).toISOString() : null,
        clanTag:  clan?.clan?.tag  ?? null,
        clanName: clan?.clan?.name ?? null,
        clanRole: clan?.role ?? null,
        clanSize: clan?.clan?.members_count ?? null,
      },
      providerUpdatedAt: acc.last_battle_time ? new Date(acc.last_battle_time * 1000).toISOString() : undefined,
      fetchedAt: new Date().toISOString(),
    };
  }

  private safeRatio(a?: number, b?: number) {
    if (!a) return 0; if (!b) return a;
    return Number((a / b).toFixed(3));
  }
}
