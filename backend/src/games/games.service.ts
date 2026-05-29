import { Injectable, Logger } from '@nestjs/common';
import { GAME_CATALOG, getGame } from '@gpt/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { IntegrationRegistry } from './integrations/integration.registry';
import { DEFAULT_TTL, normalisePlatform } from './integrations/integration.interface';
import { normaliseAvatarUrl } from '../common/util/avatar';

@Injectable()
export class GamesService {
  private readonly log = new Logger(GamesService.name);
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
    const inputPlatform = normalisePlatform(opts.platform);

    // 1. Try the row keyed exactly as the user requested.
    let existing = await this.prisma.trackedProfile.findUnique({
      where: { game_platform_providerId: { game, platform: inputPlatform, providerId: identifier } },
    });

    // 2. If not found, resolve identity (might canonicalize username → uuid,
    //    `_` → 'minecraft', etc.) and check the row again under canonical key.
    let resolvedProviderId = identifier;
    let resolvedPlatform   = inputPlatform;
    let resolvedDisplay    = identifier;
    if (!existing && integ.resolveIdentity) {
      try {
        const r = await integ.resolveIdentity({ identifier, platform: opts.platform });
        resolvedProviderId = r.providerId;
        resolvedPlatform   = normalisePlatform(r.platform);
        resolvedDisplay    = r.displayName ?? identifier;
        if (resolvedPlatform !== inputPlatform || resolvedProviderId !== identifier) {
          existing = await this.prisma.trackedProfile.findUnique({
            where: { game_platform_providerId: { game, platform: resolvedPlatform, providerId: resolvedProviderId } },
          });
        }
      } catch (e) {
        // Don't fail the whole lookup if the resolver errored — many integrations
        // legitimately throw "not found" for invalid usernames. But log
        // non-404-ish errors so we don't silently degrade to a wrong-platform
        // key when (say) Mojang's API is having an outage.
        const msg = (e as Error).message ?? String(e);
        if (!/not found|404/i.test(msg)) {
          this.log.warn(`resolveIdentity(${game}, ${identifier}) failed: ${msg}`);
        }
      }
    }

    const canonicalKey = { game, platform: resolvedPlatform, providerId: resolvedProviderId };
    const cacheKey = this.redisKey(canonicalKey.game, canonicalKey.platform, canonicalKey.providerId);

    // 3. Cache hit? Use it (after migrating any legacy fields like old avatar URLs).
    if (!opts.forceRefresh) {
      const cached = await this.redis.getJson<{ profile: unknown; snapshot: unknown; fresh: boolean }>(cacheKey);
      if (cached) {
        this.migrateSnapshotInPlace(cached.snapshot);
        return cached as { profile: unknown; snapshot: unknown; fresh: false };
      }
    }

    // 4. Already in DB and not forcing a refresh? Use the row, no fetch.
    if (existing && !opts.forceRefresh && existing.lastFetchedAt) {
      const migrated = this.migrateSnapshotInPlace(existing.latestSnapshot);
      const result = { profile: existing, snapshot: migrated, fresh: false };
      await this.redis.setJson(cacheKey, result, 300);
      return result;
    }

    // 5. Otherwise fetch fresh from the integration and upsert.
    //
    // In-flight dedup: an HTTP request hitting forceRefresh + a queue
    // worker firing the same job + another simultaneous client request
    // were all triggering parallel fetches against the same integration
    // endpoint. We hold a short Redis lock keyed by the canonical
    // (game, platform, providerId) for the duration of the fetch, and
    // any concurrent caller waits briefly for the cache to be populated
    // by the holder before falling through to its own fetch (the latter
    // covers a holder crash mid-fetch).
    const lockKey = `gpt:lock:profile:${canonicalKey.game}:${canonicalKey.platform}:${canonicalKey.providerId}`;
    const haveLock = await this.redis.acquireLock(lockKey, 30);
    if (!haveLock) {
      // Wait up to ~3s for the holder to populate the cache, polling
      // every 250ms. Keep this tight — if the holder is slow we'd rather
      // duplicate the fetch than block the HTTP request.
      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 250));
        const cached = await this.redis.getJson<{ profile: unknown; snapshot: unknown; fresh: boolean }>(cacheKey);
        if (cached) {
          this.migrateSnapshotInPlace(cached.snapshot);
          return cached as { profile: unknown; snapshot: unknown; fresh: false };
        }
      }
      // Fall through and fetch ourselves — better than deadlocking the request.
    }

    const snap = await (async () => {
      try {
        return await integ.getProfile({ identifier: resolvedProviderId, platform: opts.platform });
      } finally {
        if (haveLock) await this.redis.releaseLock(lockKey);
      }
    })();
    // Some integrations report a more specific platform in the snapshot than
    // the resolver did. Use that as the final, canonical platform for storage.
    const finalPlatform = snap.platform ? normalisePlatform(snap.platform) : canonicalKey.platform;

    const upserted = await this.prisma.trackedProfile.upsert({
      where: { game_platform_providerId: { game, platform: finalPlatform, providerId: resolvedProviderId } },
      update: {
        displayName: snap.displayName ?? resolvedDisplay,
        platform: finalPlatform,
        avatarUrl: snap.avatarUrl,
        latestSnapshot: snap as unknown as object,
        providerUpdatedAt: snap.providerUpdatedAt ? new Date(snap.providerUpdatedAt) : null,
        lastFetchedAt: new Date(),
        lastAttemptedAt: new Date(),
      },
      create: {
        game,
        platform: finalPlatform,
        providerId: resolvedProviderId,
        displayName: snap.displayName ?? resolvedDisplay,
        avatarUrl: snap.avatarUrl,
        latestSnapshot: snap as unknown as object,
        providerUpdatedAt: snap.providerUpdatedAt ? new Date(snap.providerUpdatedAt) : null,
        lastFetchedAt: new Date(),
        lastAttemptedAt: new Date(),
      },
    });

    await this.recordSnapshot(upserted.id, snap as unknown as Record<string, unknown>);

    const finalCacheKey = this.redisKey(game, finalPlatform, resolvedProviderId);
    const result = { profile: upserted, snapshot: snap, fresh: true };
    await this.redis.setJson(finalCacheKey, result, 300);
    return result;
  }

  /**
   * Look up a TrackedProfile by (game, providerId), tolerant of the URL
   * platform mismatching the stored canonical platform. Used by history/
   * matches/etc. so they don't blindly miss the row.
   */
  private async findProfileLoose(game: string, identifier: string, platform?: string) {
    const p = normalisePlatform(platform);
    // Try the URL-supplied platform first.
    const direct = await this.prisma.trackedProfile.findUnique({
      where: { game_platform_providerId: { game, platform: p, providerId: identifier } },
      select: { id: true },
    });
    if (direct) return direct;
    // Otherwise fall back to the first row matching this (game, providerId)
    // regardless of platform — handles "/games/wynncraft/<uuid>" where the
    // row was stored under platform='minecraft' rather than '_'.
    return this.prisma.trackedProfile.findFirst({
      where: { game, providerId: identifier },
      select: { id: true },
    });
  }

  async getProfileHistory(game: string, identifier: string, platform?: string, limit = 200) {
    const profile = await this.findProfileLoose(game, identifier, platform);
    if (!profile) return [];  // empty history is friendlier than 404 for the UI
    return this.prisma.statSnapshot.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { createdAt: true, level: true, xp: true, rank: true, kd: true, wins: true, losses: true, matches: true },
    });
  }

  async getMatchHistory(game: string, identifier: string, platform?: string, limit = 25) {
    const profile = await this.findProfileLoose(game, identifier, platform);
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

  /**
   * Migrate legacy fields in a cached snapshot on every read. Currently:
   *   - Rewrites Crafatar URLs to mc-heads.net (Crafatar's been 521ing).
   * Old DB rows / Redis blobs auto-upgrade without a backfill migration.
   */
  private migrateSnapshotInPlace(snap: unknown): unknown {
    if (!snap || typeof snap !== 'object') return snap;
    const s = snap as Record<string, unknown>;
    if (typeof s.avatarUrl === 'string') {
      s.avatarUrl = normaliseAvatarUrl(s.avatarUrl) ?? s.avatarUrl;
    }
    return s;
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
