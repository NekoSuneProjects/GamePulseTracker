import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SocialLink, SocialKind } from '@gpt/shared';

const SOCIAL_KINDS = new Set<SocialKind>(['twitter','twitch','youtube','discord','tiktok','kick','instagram','github','website']);

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getPublicProfile(username: string, viewerId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        linkedAccounts: { select: { id: true, platform: true, displayName: true, verified: true } },
        trackedProfiles: {
          where: { active: true },
          select: { id: true, game: true, platform: true, providerId: true, displayName: true, avatarUrl: true, lastFetchedAt: true, latestSnapshot: true },
        },
      },
    });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });

    if (!user.publicProfile && user.id !== viewerId) {
      throw new ForbiddenException({ code: 'PROFILE_PRIVATE', message: 'This profile is private' });
    }

    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      socials: (user.socials as SocialLink[] | null) ?? [],
      createdAt: user.createdAt.toISOString(),
      linkedAccounts: user.linkedAccounts,
      trackedProfiles: user.trackedProfiles,
    };
  }

  async updateSettings(userId: string, dto: { avatarUrl?: string; publicProfile?: boolean; bio?: string; socials?: SocialLink[] }) {
    if (dto.socials) {
      // Validate each social: known kind + non-empty value.
      for (const s of dto.socials) {
        if (!SOCIAL_KINDS.has(s.kind)) {
          throw new BadRequestException({ code: 'INVALID_SOCIAL_KIND', message: `Unsupported social kind: ${s.kind}` });
        }
        if (!s.value || s.value.length > 256) {
          throw new BadRequestException({ code: 'INVALID_SOCIAL_VALUE', message: 'Social value missing or too long' });
        }
      }
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: dto.avatarUrl,
        publicProfile: dto.publicProfile,
        bio: dto.bio,
        ...(dto.socials ? { socials: dto.socials as unknown as object } : {}),
      },
      select: { id: true, username: true, avatarUrl: true, publicProfile: true, bio: true, socials: true },
    });
  }
}
