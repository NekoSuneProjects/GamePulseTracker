import { Injectable } from '@nestjs/common';
import type { NormalizedProfile } from '@gpt/shared';
import type { GameIntegration, ProfileQuery, ResolvedIdentity, SearchHit } from '../integration.interface';
import { httpJson, IntegrationHttpError } from '../http.helper';
import { VrchatAuthService } from './vrchat-auth.service';

/**
 * VRChat — WORLDS-ONLY integration.
 *
 * Why no user data: VRChat's ToS prohibits redistributing user-attached data
 * collected via their API. We restrict ourselves to public world analytics:
 * visit count, favorites, capacity, instance count, tags.
 *
 * Auth: we DON'T require a manually-extracted browser cookie. Instead we
 * accept the user's VRChat credentials in env (VRCHAT_USERNAME +
 * VRCHAT_PASSWORD, plus VRCHAT_TOTP_SECRET if the account has TOTP 2FA
 * enabled). The VrchatAuthService logs in, handles 2FA, caches the resulting
 * session cookie in Redis, and refreshes it transparently on 401.
 *
 * Endpoints used:
 *   GET https://api.vrchat.cloud/api/1/worlds/<worldId>
 *   GET https://api.vrchat.cloud/api/1/worlds?search=<q>&n=12
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

  constructor(private auth: VrchatAuthService) {}

  isEnabled(): boolean { return this.auth.isConfigured(); }

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
    if (!this.isEnabled()) throw new Error('VRChat credentials not configured');
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
        wins:     w.favorites,
        matches:  w.visits,
        rank:     w.releaseStatus,
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
   * Fetch with auth cookie. On 401 we invalidate the cached cookie, re-login,
   * and retry once. Any other error bubbles up.
   */
  private async req<T>(path: string, query: Record<string, string> = {}, retried = false): Promise<T> {
    const cookie = await this.auth.getCookieHeader();
    try {
      return await httpJson<T>(`https://api.vrchat.cloud${path}`, {
        query,
        headers: { Cookie: cookie, 'User-Agent': this.auth.userAgent() },
      });
    } catch (e) {
      if (e instanceof IntegrationHttpError && e.status === 401 && !retried) {
        await this.auth.invalidate();
        return this.req(path, query, true);
      }
      throw e;
    }
  }
}
