import { Injectable, NotFoundException, ForbiddenException, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import type { SocialLink, SocialKind } from '@gpt/shared';
import { migrateAvatarUrlOn } from '../common/util/avatar';

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
      trackedProfiles: user.trackedProfiles.map(migrateAvatarUrlOn),
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

  /**
   * Change the user's password. Requires the current password to confirm,
   * so a stolen JWT alone can't change the credentials.
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException({ code: 'WEAK_PASSWORD', message: 'New password must be at least 8 characters' });
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ok = await argon2.verify(user.passwordHash, currentPassword);
    if (!ok) {
      throw new UnauthorizedException({ code: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect' });
    }
    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    // Revoke all existing refresh tokens — force re-login everywhere else.
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Change the user's username. Requires password confirmation. Will collide
   * with a 409 if someone else has the new username.
   */
  async changeUsername(userId: string, newUsername: string, password: string) {
    const trimmed = newUsername.trim();
    if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(trimmed)) {
      throw new BadRequestException({ code: 'INVALID_USERNAME', message: 'Username must be 3–32 chars, letters/digits/_.-' });
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) {
      throw new UnauthorizedException({ code: 'INVALID_PASSWORD', message: 'Password is incorrect' });
    }
    if (trimmed === user.username) {
      return { id: user.id, username: user.username };
    }
    const taken = await this.prisma.user.findUnique({ where: { username: trimmed }, select: { id: true } });
    if (taken) {
      throw new ConflictException({ code: 'USERNAME_TAKEN', message: 'That username is already in use' });
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { username: trimmed },
      select: { id: true, username: true },
    });
    return updated;
  }

  /**
   * Soft-delete account. Marks `deletionRequestedAt` + `deletionAt` 30 days
   * from now, revokes all sessions, and stops the user being able to log in
   * via the existing AuthService check. Signing in again before deletionAt
   * cancels the request.
   *
   * Password confirmation required so a stolen JWT alone can't queue a
   * delete.
   */
  async requestAccountDeletion(userId: string, password: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) {
      throw new UnauthorizedException({ code: 'INVALID_PASSWORD', message: 'Password is incorrect' });
    }
    const now = new Date();
    const deletionAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { deletionRequestedAt: now, deletionAt },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.auditLog.create({
        data: { actorId: userId, action: 'user.delete-request', target: userId, meta: { deletionAt: deletionAt.toISOString() } as object },
      }),
    ]);
    return { deletionAt };
  }

  /**
   * Cancel a pending deletion. Called automatically on a successful sign-in
   * within the grace window — see AuthService.login. Also exposed as a
   * standalone endpoint for the explicit "Cancel deletion" button.
   */
  async cancelAccountDeletion(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletionRequestedAt: null, deletionAt: null },
    });
    await this.prisma.auditLog.create({
      data: { actorId: userId, action: 'user.delete-cancel', target: userId, meta: {} as object },
    });
    return { cancelled: true };
  }
}
