import { Injectable, NotFoundException } from '@nestjs/common';
import { GAME_CATALOG, getGame } from '@gpt/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { IntegrationRegistry } from './integrations/integration.registry';
import { DEFAULT_TTL, normalisePlatform } from './integrations/integration.interface';

@Injectable()
export class GamesService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private integrations: IntegrationRegistry,
  ) {}

  catalog() {
    return GAME_CATALOG.map((g) => ({
      ...g,
      enabled: this.integrations.has(g.slug) && this.integrations.get(g.slug).isEnabled(),
    }));
  }

  /** All search hits across the configured integration for a game (+ optional platform). */
  async search(game: string, query: string, platform?: string) {
    const integ = this.integrations.get(game);
    const cacheKey = `gpt:search:${game}:${platform ?? ''}:${query.toLowerCase()}`;
    const cached = await this.redis.getJson<unknown[]>(cacheKey);
    if (cached) return cached;

    const results = await integ.search({ query, platform });
    await this.redis.setJson(cacheKey, results, DEFAULT_TTL.search);
    return results;
  }

  /**
   * Fetch (or refresh) a normalized profile. `platform` is encoded into the
   * composite key, so e.g. Apex on PSN and Apex on Origin are distinct rows.
   */
  async getProfile(game: string, identifier: string, opts: { platform?: string; forceRefresh?: boolean } = {}) {
    const integ = this.integrations.get(game);
    const platform = normalisePlatform(opts.platform);

    const cached5min = await this.redis.getJson<unknown>(this.redisKey(game, platform, identifier));
    if (cached5min && !opts.forceRefresh) {
      return cached5min as { profile: unknown; snapshot: unknown; fresh: false };
    }

    const existing = await this.prisma.trackedProfile.findUnique({
      where: { game_platform_providerId: { game, platform, providerId: identifier } },
    });

    if (!existing || opts.forceRefresh || !existing.lastFetchedAt) {
      // First-time or forced refresh: resolve identity if available, then fetch.
      let resolved: { providerId: string; displayName: string; platform?: string } = {
        providerId: identifier, displayName: identifier, platform,
      };
      if (integ.resolveIdentity) {
        try {
          resolved = await integ.resolveIdentity({ identifier, platform: opts.platform });
        } catch { /* keep identifier as-is */ }
      }
      const snap = await integ.getProfile({ identifier: resolved.providerId, platform: opts.platform });

      const upserted = await this.prisma.trackedProfile.upsert({
        where: { game_platform_providerId: { game, platform, providerId: resolved.providerId } },
        update: {
          displayName: snap.displayName,
          platform: snap.platform ?? platform,
          avatarUrl: snap.avatarUrl,
          latestSnapshot: snap as unknown as object,
          providerUpdatedAt: snap.providerUpdatedAt ? new Date(snap.providerUpdatedAt) : null,
          lastFetchedAt: new Date(),
          lastAttemptedAt: new Date(),
        },
        create: {
          game,
          platform: snap.platform ?? platform,
          providerId: resolved.providerId,
          displayName: snap.displayName,
          avatarUrl: snap.avatarUrl,
          latestSnapshot: snap as unknown as object,
          providerUpdatedAt: snap.providerUpdatedAt ? new Date(snap.providerUpdatedAt) : null,
          lastFetchedAt: new Date(),
          lastAttemptedAt: new Date(),
        },
      });

      await this.recordSnapshot(upserted.id, snap as unknown as Record<string, unknown>);

      const result = { profile: upserted, snapshot: snap, fresh: true };
      await this.redis.setJson(this.redisKey(game, platform, resolved.providerId), result, 300);
      return result;
    }

    const result = { profile: existing, snapshot: existing.latestSnapshot, fresh: false };
    await this.redis.setJson(this.redisKey(game, platform, identifier), result, 300);
    return result;
  }

  async getProfileHistory(game: string, identifier: string, platform?: string, limit = 200) {
    const p = normalisePlatform(platform);
    const profile = await this.prisma.trackedProfile.findUnique({
      where: { game_platform_providerId: { game, platform: p, providerId: identifier } },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not tracked yet' });
    return this.prisma.statSnapshot.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { createdAt: true, level: true, xp: true, rank: true, kd: true, wins: true, losses: true, matches: true },
    });
  }

  async getMatchHistory(game: string, identifier: string, platform?: string, limit = 25) {
    const p = normalisePlatform(platform);
    const profile = await this.prisma.trackedProfile.findUnique({
      where: { game_platform_providerId: { game, platform: p, providerId: identifier } },
      select: { id: true },
    });
    if (!profile) return [];
    return this.prisma.matchRecord.findMany({
      where: { profileId: profile.id },
      orderBy: { playedAt: 'desc' },
      take: limit,
    });
  }

  gamePlatforms(game: string): readonly string[] {
    return getGame(game)?.platforms ?? [];
  }

  // --- helpers ---
  private redisKey(game: string, platform: string, id: string) {
    return `gpt:profile:${game}:${platform}:${id}`;
  }
  private async recordSnapshot(profileId: string, snap: Record<string, unknown>) {
    const headline = (snap.headline ?? {}) as Record<string, number | string | undefined>;
    await this.prisma.statSnapshot.create({
      data: {
        profileId,
        payload: snap as object,
        level:    numOrNull(headline.level),
        xp:       bigOrNull(headline.xp),
        rank:     strOrNull(headline.rank),
        rankTier: numOrNull(headline.rankTier),
        kd:       floatOrNull(headline.kd),
        wins:     numOrNull(headline.wins),
        losses:   numOrNull(headline.losses),
        matches:  numOrNull(headline.matches),
      },
    });
  }
}

function numOrNull(v: unknown):   number | null { return typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : null; }
function floatOrNull(v: unknown): number | null { return typeof v === 'number' && Number.isFinite(v) ? v : null; }
function bigOrNull(v: unknown):   bigint | null { return typeof v === 'number' && Number.isFinite(v) ? BigInt(Math.trunc(v)) : null; }
function strOrNull(v: unknown):   string | null { return typeof v === 'string' ? v : null; }
