import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { normalisePlatform } from '../games/integrations/integration.interface';

type Metric = 'level' | 'kd' | 'wins' | 'matches';
const ORDERABLE: Record<Metric, string> = { level: 'level', kd: 'kd', wins: 'wins', matches: 'matches' };

@Injectable()
export class LeaderboardsService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  /**
   * Leaderboard for (game, platform, metric). Uses the latest snapshot per
   * profile, ordered DESC by the metric. Cached 60s in Redis.
   *
   * platform '_' means platform-agnostic games OR "all platforms combined".
   */
  async top(game: string, metric: Metric, opts: { platform?: string; limit?: number } = {}) {
    const limit = opts.limit ?? 100;
    const platform = normalisePlatform(opts.platform);
    const key = `gpt:lb:${game}:${platform}:${metric}:${limit}`;
    const cached = await this.redis.getJson<unknown[]>(key);
    if (cached) return cached;

    const col = ORDERABLE[metric] ?? 'level';

    // When platform is '_' we mean "any platform". Otherwise filter strictly.
    const platformFilter = platform === '_' ? '' : 'AND tp.platform = $3';
    const params: unknown[] = platform === '_' ? [game, limit] : [game, limit, platform];

    const rows = await this.prisma.$queryRawUnsafe<Array<{
      profileId: string; displayName: string; providerId: string; platform: string;
      avatarUrl: string | null; value: number;
    }>>(
      `
      WITH latest AS (
        SELECT DISTINCT ON ("profileId") "profileId", ${col} AS value, "createdAt"
        FROM "StatSnapshot"
        ORDER BY "profileId", "createdAt" DESC
      )
      SELECT tp.id AS "profileId", tp."displayName", tp."providerId", tp."platform", tp."avatarUrl", l.value
      FROM "TrackedProfile" tp
      INNER JOIN latest l ON l."profileId" = tp.id
      WHERE tp.game = $1 AND tp.active = true AND l.value IS NOT NULL ${platformFilter}
      ORDER BY l.value DESC
      LIMIT $2
      `,
      ...params,
    );

    const entries = rows.map((r, i) => ({
      rank: i + 1,
      providerId: r.providerId,
      displayName: r.displayName,
      platform: r.platform === '_' ? undefined : r.platform,
      avatarUrl: r.avatarUrl ?? undefined,
      metricLabel: metric,
      metricValue: Number(r.value ?? 0),
    }));

    await this.redis.setJson(key, entries, 60);
    return entries;
  }
}
