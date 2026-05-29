import { Injectable } from '@nestjs/common';
import type { NormalizedProfile } from '@gpt/shared';
import type { GameIntegration, ProfileQuery, ResolvedIdentity, SearchHit } from '../integration.interface';
import { httpJson } from '../http.helper';

/**
 * Roblox — public profile API. No key required for the endpoints we hit.
 *
 *   POST   https://users.roblox.com/v1/usernames/users           { usernames: [name] }
 *   GET    https://users.roblox.com/v1/users/{id}
 *   GET    https://friends.roblox.com/v1/users/{id}/friends/count
 *   GET    https://friends.roblox.com/v1/users/{id}/followers/count
 *   GET    https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=ID&size=150x150&format=Png
 *
 * Roblox inventory/game stats require auth and per-game support — kept here as
 * a profile aggregator only.
 */

interface RbxUsernameLookup { data?: Array<{ id: number; name: string; displayName?: string }> }
interface RbxUser  { id: number; name: string; displayName: string; description?: string; created?: string; isBanned?: boolean }
interface RbxCount { count: number }
interface RbxThumb { data?: Array<{ targetId: number; state: string; imageUrl: string }> }

@Injectable()
export class RobloxIntegration implements GameIntegration {
  readonly slug = 'roblox' as const;
  readonly name = 'Roblox';
  readonly live = true;
  readonly platforms = ['roblox'] as const;
  isEnabled() { return true; }

  async search(q: { query: string }): Promise<SearchHit[]> {
    const clean = q.query.trim();
    if (!clean) return [];
    try {
      const r = await httpJson<RbxUsernameLookup>('https://users.roblox.com/v1/usernames/users', {
        method: 'POST',
        body: { usernames: [clean], excludeBannedUsers: false },
      });
      const u = r.data?.[0];
      if (!u) return [];
      return [{ providerId: String(u.id), displayName: u.displayName ?? u.name, platform: 'roblox' }];
    } catch { return []; }
  }

  async resolveIdentity(q: ProfileQuery): Promise<ResolvedIdentity> {
    if (/^\d+$/.test(q.identifier)) {
      return { providerId: q.identifier, displayName: q.identifier, platform: 'roblox' };
    }
    const r = await httpJson<RbxUsernameLookup>('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      body: { usernames: [q.identifier], excludeBannedUsers: false },
    });
    const u = r.data?.[0];
    if (!u) throw new Error('Roblox user not found');
    return { providerId: String(u.id), displayName: u.displayName ?? u.name, platform: 'roblox' };
  }

  async getProfile(q: ProfileQuery): Promise<NormalizedProfile> {
    const resolved = await this.resolveIdentity(q);
    const id = resolved.providerId;

    // Each call gets its own .catch so a single transient 5xx (the user
    // endpoint was previously bare and any failure tanked the whole profile
    // even though friends/followers/thumbnail had succeeded).
    const [user, friends, followers, following, thumb] = await Promise.all([
      httpJson<RbxUser>(`https://users.roblox.com/v1/users/${id}`)
        .catch(() => ({ id: Number(id), name: id, displayName: id } as RbxUser)),
      httpJson<RbxCount>(`https://friends.roblox.com/v1/users/${id}/friends/count`).catch(() => ({ count: 0 })),
      httpJson<RbxCount>(`https://friends.roblox.com/v1/users/${id}/followers/count`).catch(() => ({ count: 0 })),
      httpJson<RbxCount>(`https://friends.roblox.com/v1/users/${id}/followings/count`).catch(() => ({ count: 0 })),
      httpJson<RbxThumb>('https://thumbnails.roblox.com/v1/users/avatar-headshot', {
        query: { userIds: id, size: '150x150', format: 'Png' },
      }).catch(() => ({ data: [] as RbxThumb['data'] })),
    ]);

    return {
      game: 'roblox',
      providerId: id,
      displayName: user.displayName ?? user.name,
      platform: 'roblox',
      avatarUrl: thumb.data?.[0]?.imageUrl,
      headline: {
        wins: friends.count,
        matches: followers.count,
      },
      details: {
        username: user.name,
        description: user.description ?? null,
        created: user.created ?? null,
        isBanned: user.isBanned ?? null,
        friends: friends.count,
        followers: followers.count,
        following: following.count,
        _note: 'In-game stats per Roblox experience are not exposed by the public API. Use companion ingest for per-experience stats.',
      },
      fetchedAt: new Date().toISOString(),
    };
  }
}
