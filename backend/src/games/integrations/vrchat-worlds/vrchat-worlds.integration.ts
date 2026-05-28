import { Injectable } from '@nestjs/common';
import type { NormalizedProfile } from '@gpt/shared';
import type { GameIntegration, ProfileQuery, ResolvedIdentity, SearchHit } from '../integration.interface';
import { httpJson } from '../http.helper';

/**
 * VRChat — WORLDS-ONLY integration.
 *
 * Why no user data: VRChat's ToS prohibits redistributing user-attached data
 * collected via their API. We restrict ourselves to public world analytics:
 * visit count, favorites, capacity, instance count, tags.
 *
 * Two ways to call:
 *   1. Direct HTTPS to api.vrchat.cloud — REQUIRES a logged-in cookie. Put the
 *      raw cookie value (auth=authcookie_...) in VRCHAT_AUTH_COOKIE.
 *   2. (If you want a typed client) install the `vrchat` npm package
 *      (https://www.npmjs.com/package/vrchat). The package wraps the same
 *      endpoints. If installed it will be picked up here automatically.
 *
 * Endpoints used (worlds-only, public-ish — still requires a cookie):
 *   GET  https://api.vrchat.cloud/api/1/worlds/<worldId>
 *   GET  https://api.vrchat.cloud/api/1/worlds?search=<q>&n=20
 *
 * `providerId` is the world id (`wrld_xxxxxxxx...`).
 */

interface VrcWorld {
  id: string;
  name: string;
  authorId: string;
  authorName: string;
  description?: string;
  imageUrl?: string;
  thumbnailImageUrl?: string;
  capacity?: number;
  recommendedCapacity?: number;
  occupants?: number;
  privateOccupants?: number;
  publicOccupants?: number;
  visits?: number;
  favorites?: number;
  popularity?: number;
  heat?: number;
  tags?: string[];
  releaseStatus?: 'public' | 'hidden' | 'private';
  publicationDate?: string;
  updated_at?: string;
}

@Injectable()
export class VrchatWorldsIntegration implements GameIntegration {
  readonly slug = 'vrchat-worlds' as const;
  readonly name = 'VRChat Worlds';
  readonly live = true;
  readonly platforms = ['vrchat'] as const;
  isEnabled() { return Boolean(process.env.VRCHAT_AUTH_COOKIE); }

  async search(q: { query: string }): Promise<SearchHit[]> {
    if (!this.isEnabled() || !q.query.trim()) return [];
    try {
      const worlds = await this.req<VrcWorld[]>(`/api/1/worlds`, { search: q.query, n: '12' });
      return worlds.map(w => ({
        providerId: w.id,
        displayName: w.name,
        platform: 'vrchat',
        avatarUrl: w.thumbnailImageUrl ?? w.imageUrl,
      }));
    } catch { return []; }
  }

  async resolveIdentity(q: ProfileQuery): Promise<ResolvedIdentity> {
    return { providerId: q.identifier, displayName: q.identifier, platform: 'vrchat' };
  }

  async getProfile(q: ProfileQuery): Promise<NormalizedProfile> {
    if (!this.isEnabled()) throw new Error('VRCHAT_AUTH_COOKIE is not set');
    if (!q.identifier.startsWith('wrld_')) {
      throw new Error('VRChat providerId must be a world id (wrld_xxx). Use search first.');
    }
    const w = await this.req<VrcWorld>(`/api/1/worlds/${encodeURIComponent(q.identifier)}`);

    return {
      game: 'vrchat-worlds',
      providerId: w.id,
      displayName: w.name,
      platform: 'vrchat',
      avatarUrl: w.thumbnailImageUrl ?? w.imageUrl,
      headline: {
        wins:    w.favorites,
        matches: w.visits,
        rank:    w.releaseStatus,
        rankTier: w.popularity,
      },
      details: {
        authorName: w.authorName,
        capacity: w.capacity ?? null,
        recommendedCapacity: w.recommendedCapacity ?? null,
        currentOccupants: w.occupants ?? null,
        publicOccupants: w.publicOccupants ?? null,
        privateOccupants: w.privateOccupants ?? null,
        favorites: w.favorites ?? null,
        visits: w.visits ?? null,
        popularity: w.popularity ?? null,
        heat: w.heat ?? null,
        tags: (w.tags ?? []).join(', '),
        releaseStatus: w.releaseStatus ?? null,
        publishedAt: w.publicationDate ?? null,
        updatedAt: w.updated_at ?? null,
        description: (w.description ?? '').slice(0, 400),
      },
      providerUpdatedAt: w.updated_at,
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * Note: we go direct to api.vrchat.cloud rather than depending on the `vrchat`
   * npm package at build time so the integration works whether or not the
   * optional dep is installed. If/when you want the typed client, install
   * `npm i vrchat` and re-implement these calls with it.
   */
  private req<T>(path: string, query: Record<string, string> = {}): Promise<T> {
    const cookie = process.env.VRCHAT_AUTH_COOKIE!;
    return httpJson<T>(`https://api.vrchat.cloud${path}`, {
      query,
      headers: {
        Cookie: cookie.startsWith('auth=') ? cookie : `auth=${cookie}`,
        'User-Agent': 'GamePulseTracker/0.1 (worlds-only)',
      },
    });
  }
}
