import { Injectable } from '@nestjs/common';
import type { NormalizedProfile, NewsItem } from '@gpt/shared';
import type { GameIntegration, ProfileQuery, ResolvedIdentity, SearchHit } from '../integration.interface';
import { httpJson } from '../http.helper';
import { parseRssFeed } from '../rss.helper';

const MOJANG_API  = 'https://api.mojang.com';
const HYPIXEL_API = 'https://api.hypixel.net/v2';
const HYPIXEL_NEWS_RSS = 'https://hypixel.net/threads/.rss'; // placeholder; replace with real feed url

interface MojangProfile { id: string; name: string }
interface HypixelPlayerResp {
  success: boolean;
  player: null | {
    uuid: string; displayname: string; networkExp?: number;
    achievementPoints?: number; karma?: number; firstLogin?: number; lastLogin?: number;
    stats?: { Bedwars?: Record<string, unknown>; SkyWars?: Record<string, unknown>; Duels?: Record<string, unknown> };
  };
}

@Injectable()
export class HypixelIntegration implements GameIntegration {
  readonly slug = 'hypixel' as const;
  readonly name = 'Hypixel';
  readonly live = true;
  readonly platforms = ['minecraft'] as const;

  isEnabled(): boolean { return Boolean(process.env.HYPIXEL_API_KEY); }

  async search(q: { query: string }): Promise<SearchHit[]> {
    const clean = q.query.trim();
    if (!clean) return [];
    try {
      const profile = await httpJson<MojangProfile>(`${MOJANG_API}/users/profiles/minecraft/${encodeURIComponent(clean)}`);
      return [{ providerId: profile.id, displayName: profile.name, platform: 'minecraft' }];
    } catch { return []; }
  }

  async resolveIdentity(q: ProfileQuery): Promise<ResolvedIdentity> {
    // Hypixel uses Minecraft UUIDs. If input is a username, resolve via Mojang.
    const id = q.identifier.replace(/-/g, '');
    if (id.length === 32) return { providerId: id, displayName: q.identifier, platform: 'minecraft' };
    const m = await httpJson<MojangProfile>(`${MOJANG_API}/users/profiles/minecraft/${encodeURIComponent(q.identifier)}`);
    return { providerId: m.id, displayName: m.name, platform: 'minecraft' };
  }

  async getProfile(q: ProfileQuery): Promise<NormalizedProfile> {
    if (!this.isEnabled()) throw new Error('HYPIXEL_API_KEY is not set');

    const resolved = await this.resolveIdentity(q);
    const data = await httpJson<HypixelPlayerResp>(`${HYPIXEL_API}/player`, {
      query: { uuid: resolved.providerId },
      headers: { 'API-Key': process.env.HYPIXEL_API_KEY! },
    });
    if (!data.success || !data.player) throw new Error('Hypixel player not found');

    const p = data.player;
    const networkLevel = this.computeNetworkLevel(p.networkExp ?? 0);
    const bw = (p.stats?.Bedwars as Record<string, number> | undefined) ?? {};
    const sw = (p.stats?.SkyWars as Record<string, number> | undefined) ?? {};
    const du = (p.stats?.Duels   as Record<string, number> | undefined) ?? {};

    return {
      game: 'hypixel',
      providerId: p.uuid,
      displayName: p.displayname,
      platform: 'minecraft',
      // Full-body Minecraft skin render. mc-heads.net is more reliable than
      // Crafatar in 2026 (Crafatar's been returning 521 from Cloudflare).
      avatarUrl: `https://mc-heads.net/body/${p.uuid}/right`,
      headline: {
        level: Math.floor(networkLevel),
        xp: p.networkExp,
        kd: this.safeRatio(bw['kills_bedwars'], bw['deaths_bedwars']),
        wins:    (bw['wins_bedwars']   ?? 0) + (sw['wins']   ?? 0) + (du['wins']   ?? 0),
        losses:  (bw['losses_bedwars'] ?? 0) + (sw['losses'] ?? 0) + (du['losses'] ?? 0),
        matches: (bw['games_played_bedwars_1'] ?? 0) + (sw['games_played_skywars'] ?? 0) + (du['games_played'] ?? 0),
      },
      details: {
        karma: p.karma ?? null,
        achievementPoints: p.achievementPoints ?? null,
        networkExp: p.networkExp ?? null,
        firstLogin: p.firstLogin ?? null,
        lastLogin: p.lastLogin ?? null,
        bedwars_wins:   bw['wins_bedwars']   ?? null,
        bedwars_losses: bw['losses_bedwars'] ?? null,
        bedwars_kills:  bw['kills_bedwars']  ?? null,
        bedwars_deaths: bw['deaths_bedwars'] ?? null,
        skywars_wins:   sw['wins']   ?? null,
        skywars_losses: sw['losses'] ?? null,
        duels_wins:     du['wins']   ?? null,
      },
      fetchedAt: new Date().toISOString(),
    };
  }

  async getNews(): Promise<NewsItem[]> {
    try {
      const items = await parseRssFeed(HYPIXEL_NEWS_RSS, this.slug, 'Hypixel');
      return items;
    } catch { return []; }
  }

  private computeNetworkLevel(exp: number) {
    if (!exp || exp < 0) return 1;
    return (-3.5 + Math.sqrt(12.25 + 0.0008 * exp));
  }
  private safeRatio(a?: number, b?: number) {
    // 0 in numerator → 0. 0 in denominator with non-zero numerator → divide
    // by 1 (so a player with N kills and zero deaths shows K/D = N, not
    // an inflated "100k kills equals 100k K/D"). Both undefined → 0.
    if (!a) return 0;
    return Number((a / Math.max(1, b ?? 0)).toFixed(3));
  }
}
