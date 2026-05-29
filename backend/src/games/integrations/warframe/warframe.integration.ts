import { Injectable } from '@nestjs/common';
import type { NormalizedProfile, NewsItem } from '@gpt/shared';
import type { GameIntegration, ProfileQuery, ResolvedIdentity, SearchHit } from '../integration.interface';
import { httpJson } from '../http.helper';
import { parseRssFeed } from '../rss.helper';

/**
 * Warframe — three layers of data:
 *
 *  1. PUBLIC, server-wide (no auth)
 *     - World state: api.warframestat.us/<platform>
 *     - News:        api.warframestat.us/<platform>/news
 *
 *  2. PUBLIC market data (no auth required to read)
 *     - api.warframe.market/v1/profile/<name>             current open orders
 *     - api.warframe.market/v1/profile/<name>/statistics  90-day trade volume
 *     - api.warframe.market/v1/profile/<name>/reviews/1   review count
 *     - api.warframe.market/v1/auctions/search?type=riven riven listings
 *
 *  3. PRIVATE in-game state (mastery rank, credits, endo, syndicate REP — Suda
 *     et al., aya, focus, sortie streak, riven slot count, etc.) — not exposed
 *     by any official Warframe API. Path: Overwolf/desktop companion parses
 *     %LOCALAPPDATA%\Warframe\EE.log and POSTs to /ingest/warframe.
 *     See docs/CLIENT.md.
 *
 * `q.platform` is one of pc/ps4/xb1/switch (defaults to pc).
 */

interface WorldState {
  timestamp?: string;
  events?: Array<{ id: string; description?: string }>;
  cetusCycle?: { state?: string; expiry?: string };
  voidTrader?: { active?: boolean; location?: string; activation?: string; expiry?: string };
  arbitration?: { node?: string; type?: string };
}
interface MarketProfileResp {
  payload?: { user?: { id: string; ingame_name: string; avatar?: string; platform: string; status?: string; region?: string; reputation?: number; locale?: string; about?: string; banned?: boolean } }
}
interface MarketStatisticsResp {
  payload?: { statistics_closed?: { '90days'?: Array<{ datetime: string; volume: number; avg_price: number; min_price: number; max_price: number; mod_rank?: number; order_type: 'buy' | 'sell'; item_id: string }> } }
}
interface MarketReviewsResp { total?: number }

const PLATFORM_WSUFFIX: Record<string, string> = { pc: 'pc', ps4: 'ps4', xb1: 'xb1', switch: 'swi' };
const PLATFORM_MARKET:  Record<string, string> = { pc: 'pc', ps4: 'ps4', xb1: 'xbox', switch: 'switch' };

@Injectable()
export class WarframeIntegration implements GameIntegration {
  readonly slug = 'warframe' as const;
  readonly name = 'Warframe';
  readonly live = true;
  readonly platforms = ['pc', 'ps4', 'xb1', 'switch'] as const;
  isEnabled() { return true; }

  async search(q: { query: string; platform?: string }): Promise<SearchHit[]> {
    if (!q.query.trim()) return [];
    const mp = PLATFORM_MARKET[q.platform ?? 'pc'] ?? 'pc';
    try {
      const r = await httpJson<MarketProfileResp>(
        `https://api.warframe.market/v1/profile/${encodeURIComponent(q.query)}`,
        { headers: { Language: 'en', Platform: mp } },
      );
      const u = r.payload?.user;
      if (!u) return [];
      return [{
        providerId: u.ingame_name,
        displayName: u.ingame_name,
        platform: q.platform ?? 'pc',
        avatarUrl: u.avatar ? `https://warframe.market/static/assets/${u.avatar}` : undefined,
      }];
    } catch { return []; }
  }

  async resolveIdentity(q: ProfileQuery): Promise<ResolvedIdentity> {
    return { providerId: q.identifier, displayName: q.identifier, platform: q.platform ?? 'pc' };
  }

  async getProfile(q: ProfileQuery): Promise<NormalizedProfile> {
    const platform = q.platform && PLATFORM_WSUFFIX[q.platform] ? q.platform : 'pc';
    const wsHost = PLATFORM_WSUFFIX[platform];
    const mp = PLATFORM_MARKET[platform];
    const mHeaders = { Language: 'en', Platform: mp };

    const [worldState, profileResp, statsResp, reviewsResp] = await Promise.all([
      httpJson<WorldState>(`https://api.warframestat.us/${wsHost}`).catch(() => ({} as WorldState)),
      httpJson<MarketProfileResp>(`https://api.warframe.market/v1/profile/${encodeURIComponent(q.identifier)}`, { headers: mHeaders }).catch(() => ({} as MarketProfileResp)),
      httpJson<MarketStatisticsResp>(`https://api.warframe.market/v1/profile/${encodeURIComponent(q.identifier)}/statistics`, { headers: mHeaders }).catch(() => ({} as MarketStatisticsResp)),
      httpJson<MarketReviewsResp>(`https://api.warframe.market/v1/profile/${encodeURIComponent(q.identifier)}/reviews/1`, { headers: mHeaders }).catch(() => ({} as MarketReviewsResp)),
    ]);

    const user = profileResp.payload?.user;
    const ninety = statsResp.payload?.statistics_closed?.['90days'] ?? [];

    let trades90d = 0, platinum90d = 0, buys = 0, sells = 0;
    let weekTrades = 0, weekPlat = 0, monthTrades = 0, monthPlat = 0;
    const now = Date.now();
    const WEEK  = 7  * 24 * 60 * 60 * 1000;
    const MONTH = 30 * 24 * 60 * 60 * 1000;

    for (const row of ninety) {
      const dt = new Date(row.datetime).getTime();
      const vol = row.volume ?? 0;
      const plat = vol * (row.avg_price ?? 0);
      trades90d += vol; platinum90d += plat;
      if (row.order_type === 'buy') buys += vol; else sells += vol;
      if (now - dt <= WEEK)  { weekTrades  += vol; weekPlat  += plat; }
      if (now - dt <= MONTH) { monthTrades += vol; monthPlat += plat; }
    }

    return {
      game: 'warframe',
      providerId: q.identifier,
      displayName: user?.ingame_name ?? q.identifier,
      platform,
      avatarUrl: user?.avatar ? `https://warframe.market/static/assets/${user.avatar}` : undefined,
      headline: {
        rank: user?.reputation != null ? `Market rep: ${user.reputation}` : undefined,
        wins:    sells,
        losses:  buys,
        matches: trades90d,
      },
      details: {
        marketReputation: user?.reputation ?? null,
        marketRegion:     user?.region ?? null,
        marketLocale:     user?.locale ?? null,
        marketStatus:     user?.status ?? null,
        marketBanned:     user?.banned ?? null,
        reviewsCount:     reviewsResp.total ?? null,

        trades_90d: trades90d,
        trades_30d: monthTrades,
        trades_7d:  weekTrades,
        buys_90d:   buys,
        sells_90d:  sells,
        platinum_volume_90d: Math.round(platinum90d),
        platinum_volume_30d: Math.round(monthPlat),
        platinum_volume_7d:  Math.round(weekPlat),
        avg_platinum_per_trade_90d: trades90d ? Math.round(platinum90d / trades90d) : null,

        worldState_cetusCycle:       worldState.cetusCycle?.state ?? null,
        worldState_voidTraderActive: worldState.voidTrader?.active ?? null,
        worldState_arbitrationNode:  worldState.arbitration?.node ?? null,

        _note: 'Mastery rank, credits, endo, syndicate REP (Suda/etc.), aya, focus, and riven personal stats arrive via /ingest/warframe from a companion. See docs/CLIENT.md.',
      },
      providerUpdatedAt: worldState.timestamp,
      fetchedAt: new Date().toISOString(),
    };
  }

  async getNews(): Promise<NewsItem[]> {
    try {
      const news = await httpJson<Array<{ id: string; message: string; link: string; date: string; imageLink?: string }>>(
        `https://api.warframestat.us/pc/news`,
      );
      return (news ?? []).slice(0, 12).map(n => ({
        id: n.id, game: this.slug,
        title: n.message, url: n.link,
        source: 'Warframe News',
        publishedAt: n.date ?? new Date().toISOString(),
        imageUrl: n.imageLink,
      }));
    } catch {
      return parseRssFeed('https://forums.warframe.com/forum/2-news.xml/', this.slug, 'Warframe Forums').catch(() => []);
    }
  }
}
