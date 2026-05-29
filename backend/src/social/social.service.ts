import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_SLUG, type AchievementCtx } from './achievements.catalog';

@Injectable()
export class SocialService {
  private readonly log = new Logger(SocialService.name);
  constructor(private prisma: PrismaService) {}

  // ---------- Follow / unfollow ----------

  async follow(followerId: string, followedUsername: string) {
    if (!followedUsername.trim()) {
      throw new BadRequestException({ code: 'INVALID_USERNAME', message: 'Username is required' });
    }
    const target = await this.prisma.user.findUnique({
      where: { username: followedUsername },
      select: { id: true, username: true, deletionAt: true },
    });
    if (!target || target.deletionAt) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }
    if (target.id === followerId) {
      throw new BadRequestException({ code: 'CANNOT_FOLLOW_SELF', message: "You can't follow yourself." });
    }
    try {
      await this.prisma.follow.create({ data: { followerId, followedId: target.id } });
    } catch (e) {
      // Unique constraint violation = already following. Idempotent.
      if ((e as { code?: string }).code !== 'P2002') throw e;
    }
    // Activity event on the followed user's feed.
    await this.prisma.activityEvent.create({
      data: {
        userId: target.id,
        kind: 'follow',
        payload: { followerId } as object,
      },
    }).catch(e => this.log.warn(`activity event failed: ${(e as Error).message}`));
    // Re-check achievements for the followed user (followerCount may have crossed).
    await this.recomputeAchievements(target.id).catch(() => {});
    return { ok: true, followed: target.username };
  }

  async unfollow(followerId: string, followedUsername: string) {
    const target = await this.prisma.user.findUnique({ where: { username: followedUsername }, select: { id: true } });
    if (!target) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    await this.prisma.follow.deleteMany({ where: { followerId, followedId: target.id } });
    return { ok: true };
  }

  followers(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      select: {
        followers: {
          select: { follower: { select: { id: true, username: true, avatarUrl: true } }, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });
  }

  following(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      select: {
        follows: {
          select: { followed: { select: { id: true, username: true, avatarUrl: true } }, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });
  }

  async isFollowing(followerId: string, followedUsername: string): Promise<boolean> {
    const t = await this.prisma.user.findUnique({ where: { username: followedUsername }, select: { id: true } });
    if (!t) return false;
    const row = await this.prisma.follow.findUnique({
      where: { followerId_followedId: { followerId, followedId: t.id } },
      select: { id: true },
    });
    return Boolean(row);
  }

  // ---------- Activity feed ----------

  async feedFor(username: string, limit = 50) {
    const user = await this.prisma.user.findUnique({ where: { username }, select: { id: true, publicProfile: true } });
    if (!user || !user.publicProfile) return [];
    return this.prisma.activityEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, limit),
    });
  }

  /**
   * Append an activity event from any backend caller (stats refresh processor,
   * social follow, achievement unlock, etc). Errors are logged and swallowed
   * so a feed-write failure doesn't tank the caller.
   */
  async appendActivity(userId: string, kind: string, payload: object, profileId?: string) {
    try {
      await this.prisma.activityEvent.create({
        data: { userId, kind, payload, profileId: profileId ?? null },
      });
    } catch (e) {
      this.log.warn(`activity append failed for ${userId} (${kind}): ${(e as Error).message}`);
    }
  }

  // ---------- Achievements ----------

  catalog() {
    return ACHIEVEMENTS.map(a => ({ slug: a.slug, label: a.label, description: a.description, icon: a.icon }));
  }

  async forUser(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!user) return [];
    const rows = await this.prisma.userAchievement.findMany({
      where: { userId: user.id },
      orderBy: { unlockedAt: 'desc' },
    });
    return rows.map(r => {
      const def = ACHIEVEMENTS_BY_SLUG.get(r.slug);
      return {
        slug: r.slug,
        label: def?.label ?? r.slug,
        description: def?.description ?? '',
        icon: def?.icon ?? '🏅',
        unlockedAt: r.unlockedAt.toISOString(),
      };
    });
  }

  /**
   * Re-evaluate every achievement criterion for `userId` and insert rows
   * for any newly-met ones (idempotent via the unique index). Called from
   * social follow + can be invoked by an admin or a scheduled task later.
   */
  async recomputeAchievements(userId: string) {
    const [user, trackedCount, matchCount, linkedCount, followerCount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { emailVerified: true, totpEnabled: true, publicProfile: true, avatarUrl: true },
      }),
      this.prisma.trackedProfile.count({ where: { userId } }),
      this.prisma.matchRecord.count({ where: { profile: { userId } } }),
      this.prisma.linkedAccount.count({ where: { userId } }),
      this.prisma.follow.count({ where: { followedId: userId } }),
    ]);
    if (!user) return [];

    const ctx: AchievementCtx = {
      trackedProfileCount: trackedCount,
      matchCount,
      linkedAccountCount: linkedCount,
      followerCount,
      emailVerified: user.emailVerified,
      totpEnabled: user.totpEnabled,
      hasPublicProfile: user.publicProfile,
      hasAvatar: Boolean(user.avatarUrl),
    };

    const eligible = ACHIEVEMENTS.filter(a => a.check(ctx)).map(a => a.slug);
    const existing = new Set(
      (await this.prisma.userAchievement.findMany({
        where: { userId, slug: { in: eligible } },
        select: { slug: true },
      })).map(r => r.slug),
    );
    const newly = eligible.filter(s => !existing.has(s));
    for (const slug of newly) {
      try {
        await this.prisma.userAchievement.create({ data: { userId, slug } });
        await this.appendActivity(userId, 'achievement', { slug } as object);
      } catch (e) {
        // Unique violation = race; ignore.
        if ((e as { code?: string }).code !== 'P2002') {
          this.log.warn(`achievement unlock failed for ${userId}/${slug}: ${(e as Error).message}`);
        }
      }
    }
    return newly;
  }
}
