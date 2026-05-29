import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normaliseAvatarUrl } from '../common/util/avatar';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  /** List a user's favorites, hydrated with the profile's display info. */
  async list(userId: string) {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        profile: {
          select: {
            id: true, game: true, platform: true, providerId: true,
            displayName: true, avatarUrl: true, lastFetchedAt: true,
          },
        },
      },
    });
    return rows.map(r => ({
      id: r.id,
      createdAt: r.createdAt,
      profile: { ...r.profile, avatarUrl: normaliseAvatarUrl(r.profile.avatarUrl) },
    }));
  }

  /**
   * Add a favorite. Idempotent — if the user already favorited this profile
   * the existing row is returned instead of throwing.
   */
  async add(userId: string, profileId: string) {
    const tp = await this.prisma.trackedProfile.findUnique({ where: { id: profileId } });
    if (!tp) throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'TrackedProfile not found' });
    return this.prisma.favorite.upsert({
      where: { userId_profileId: { userId, profileId } },
      update: {},
      create: { userId, profileId },
    });
  }

  /** Remove. Safe if it doesn't exist. */
  async remove(userId: string, profileId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId, profileId } });
    return { ok: true };
  }

  /** Quick check used by the per-profile page to render the star state. */
  async isFavorited(userId: string, profileId: string): Promise<boolean> {
    const row = await this.prisma.favorite.findUnique({
      where: { userId_profileId: { userId, profileId } },
      select: { id: true },
    });
    return Boolean(row);
  }
}
