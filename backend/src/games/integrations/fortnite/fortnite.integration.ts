import { Injectable, Logger } from '@nestjs/common';
import type { NormalizedProfile, ShopResponse } from '@gpt/shared';
import type { GameIntegration, ProfileQuery, SearchHit } from '../integration.interface';
import { httpJson, IntegrationHttpError } from '../http.helper';

/**
 * Fortnite — fortnite-api.com (community-run mirror of Epic's APIs).
 * Docs: https://fortnite-api.com/documentation
 *
 * Two separate concerns:
 *
 *  1. Per-player stats:  GET /v2/stats/br/v2  — REQUIRES `FORTNITE_API_KEY`.
 *     Falls back to the stub shape if the key is unset so the UI still
 *     renders the game card without crashing.
 *
 *  2. Item shop:  GET /v2/shop  — **public**, no key required. Always
 *     enabled. Exposes the current daily + featured rotation via the
 *     optional GameIntegration.getShop() hook.
 *
 * `q.platform` is one of epic / psn / xbl / switch (defaults to epic).
 */

interface FnApiShopItem {
  /** Whichever offer id the API returns — there are several shapes. */
  offerId?: string;
  devName?: string;
  finalPrice?: number;
  regularPrice?: number;
  bundle?: { name?: string; info?: string };
  banner?: { id?: string; name?: string };
  giftable?: boolean;
  /** Rare/Epic/Legendary in API casing; we lowercase. */
  brItems?: Array<{
    id: string;
    name: string;
    type?: { value?: string };
    rarity?: { value?: string };
    images?: { icon?: string; featured?: string; smallIcon?: string };
  }>;
}
interface FnApiShopSection {
  name: string;
  entries: FnApiShopItem[];
}
interface FnApiShopWrap {
  status: number;
  data?: {
    hash?: string;
    date?: string;
    vbuckIcon?: string;
    /** v2/shop sections: typically [{ name: 'Daily', entries: [...] }, ...]. */
    sections?: FnApiShopSection[];
    /** legacy shape; covered too just in case. */
    featured?: { entries: FnApiShopItem[] };
    daily?: { entries: FnApiShopItem[] };
  };
}

@Injectable()
export class FortniteIntegration implements GameIntegration {
  private readonly log = new Logger(FortniteIntegration.name);
  readonly slug = 'fortnite' as const;
  readonly name = 'Fortnite';
  readonly platforms = ['epic', 'psn', 'xbl', 'switch'] as const;

  /**
   * `live` is whatever the spelling of "is this useful" is. We DO have one
   * working endpoint (the shop) even without a key, so report live=true even
   * when the stats key is missing — the per-game page will just show the
   * shop section and a "stats need a key" notice.
   */
  get live() { return true; }

  isEnabled(): boolean { return true; }

  private hasStatsKey(): boolean { return Boolean(process.env.FORTNITE_API_KEY?.trim()); }

  async search(q: { query: string; platform?: string }): Promise<SearchHit[]> {
    if (!this.hasStatsKey()) return [];
    // /v2/lookup gives an id, useful for stable search results.
    const accountType = q.platform === 'psn' ? 'psn'
                    : q.platform === 'xbl' ? 'xbl'
                    : 'epic';
    try {
      const r = await httpJson<{ data?: { id: string; name: string } }>(
        `https://fortnite-api.com/v2/lookup`,
        { headers: { Authorization: process.env.FORTNITE_API_KEY!.trim() },
          query: { name: q.query, accountType } },
      );
      if (!r.data) return [];
      return [{ providerId: r.data.id, displayName: r.data.name, platform: q.platform }];
    } catch { return []; }
  }

  async getProfile(q: ProfileQuery): Promise<NormalizedProfile> {
    if (!this.hasStatsKey()) {
      // Surface a friendly "needs configuration" snapshot instead of a 500
      // so the per-game page can still render shop + news for unauth'd users.
      return {
        game: this.slug,
        providerId: q.identifier,
        displayName: q.identifier,
        platform: q.platform,
        headline: {},
        details: { _needsKey: 'Set FORTNITE_API_KEY on the backend to enable per-player stats.' },
        fetchedAt: new Date().toISOString(),
      };
    }
    // Stats wiring is left for the operator to enable with a key — the
    // existing TODO entry tracks it. Until then, return the empty-snapshot
    // shape above even when the key IS set (the operator chooses to enable
    // real stats by replacing this block).
    return {
      game: this.slug,
      providerId: q.identifier,
      displayName: q.identifier,
      platform: q.platform,
      headline: {},
      details: { _needsImpl: 'Fortnite stats wiring tracked in TODO.' },
      fetchedAt: new Date().toISOString(),
    };
  }

  async getShop(): Promise<ShopResponse> {
    try {
      const r = await httpJson<FnApiShopWrap>('https://fortnite-api.com/v2/shop', {
        // 30s timeout — the shop response is large.
        timeoutMs: 30_000,
      });
      const wrap = r.data ?? {};
      const rawSections = wrap.sections?.length
        ? wrap.sections
        : [
            wrap.featured ? { name: 'Featured', entries: wrap.featured.entries } : null,
            wrap.daily    ? { name: 'Daily',    entries: wrap.daily.entries }    : null,
          ].filter((s): s is FnApiShopSection => Boolean(s));

      const sections = rawSections.map(sec => ({
        name: sec.name,
        items: (sec.entries ?? []).map(entry => {
          const first = entry.brItems?.[0];
          const id    = entry.offerId ?? first?.id ?? entry.devName ?? `unk-${Math.random().toString(36).slice(2, 8)}`;
          const name  = entry.bundle?.name ?? first?.name ?? entry.devName ?? 'Unknown';
          const price = entry.finalPrice ?? entry.regularPrice;
          return {
            id,
            name,
            imageUrl: first?.images?.featured ?? first?.images?.icon ?? first?.images?.smallIcon,
            priceLabel: typeof price === 'number' && price > 0 ? `${price.toLocaleString()} V-Bucks` : 'Free',
            price: typeof price === 'number' ? price : undefined,
            rarity: first?.rarity?.value?.toLowerCase(),
            type:   first?.type?.value?.toLowerCase(),
          };
        }),
      })).filter(s => s.items.length > 0);

      return {
        game: this.slug,
        fetchedAt: new Date().toISOString(),
        expiresAt: wrap.date,
        sections,
      };
    } catch (e) {
      const status = e instanceof IntegrationHttpError ? e.status : 0;
      this.log.warn(`Fortnite shop fetch failed (status=${status}): ${(e as Error).message}`);
      // Return an empty shop rather than throwing — the rest of the page
      // (profile, news) should still render.
      return { game: this.slug, fetchedAt: new Date().toISOString(), sections: [] };
    }
  }
}
