import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DeletionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DeletionRequestsService {
  private readonly log = new Logger(DeletionRequestsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Verify the user has standing to request deletion of this TrackedProfile.
   *
   * Standing rules (OR):
   *   (a) The profile was claimed by this user (TrackedProfile.userId).
   *   (b) The user holds a LinkedAccount whose providerId matches the
   *       profile's providerId. We don't enforce platform parity here
   *       because LinkedAccount.platform names the external service (epic,
   *       ea, steam, bungie, ...) while TrackedProfile.platform names the
   *       game's internal platform (psn, xbl, minecraft, ...). The shared
   *       providerId is the strongest cross-reference we have without
   *       building a full platform-mapping table.
   */
  private async assertOwnership(userId: string, profileId: string) {
    const tp = await this.prisma.trackedProfile.findUnique({
      where: { id: profileId },
      select: { id: true, userId: true, providerId: true, game: true, displayName: true },
    });
    if (!tp) {
      throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'TrackedProfile not found' });
    }
    if (tp.userId === userId) return tp;

    const link = await this.prisma.linkedAccount.findFirst({
      where: { userId, providerId: tp.providerId },
      select: { id: true },
    });
    if (link) return tp;

    throw new ForbiddenException({
      code: 'NOT_PROFILE_OWNER',
      message: 'You do not have a verified link to this profile.',
    });
  }

  /**
   * Create a deletion request. Idempotent against an existing PENDING request
   * for the same (user, profile) — returns the existing row instead of
   * creating a duplicate that would clog the admin queue.
   */
  async create(userId: string, profileId: string, reason?: string) {
    if (reason && reason.length > 1000) {
      throw new BadRequestException({ code: 'REASON_TOO_LONG', message: 'Reason must be 1000 chars or fewer.' });
    }
    const profile = await this.assertOwnership(userId, profileId);

    const existing = await this.prisma.statsDeletionRequest.findFirst({
      where: { userId, profileId, status: DeletionStatus.PENDING },
    });
    if (existing) {
      throw new ConflictException({
        code: 'REQUEST_ALREADY_PENDING',
        message: 'You already have a pending deletion request for this profile.',
        data: { id: existing.id },
      });
    }

    const row = await this.prisma.statsDeletionRequest.create({
      data: { userId, profileId, reason: reason ?? null },
    });
    this.log.log(`deletion request ${row.id}: user=${userId} profile=${profileId} (${profile.game}/${profile.displayName})`);
    return row;
  }

  listForUser(userId: string) {
    return this.prisma.statsDeletionRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        profile: { select: { id: true, game: true, platform: true, displayName: true, providerId: true } },
      },
    });
  }

  listForAdmin(status?: DeletionStatus) {
    return this.prisma.statsDeletionRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        user: { select: { id: true, username: true } },
        admin: { select: { id: true, username: true } },
        profile: { select: { id: true, game: true, platform: true, displayName: true, providerId: true } },
      },
    });
  }

  /**
   * Approve and cascade-delete. Snapshot / Match / Season rows are removed
   * by the FK ON DELETE CASCADE on TrackedProfile — we only need to delete
   * the TrackedProfile itself.
   *
   * If the user already deleted the profile manually (or another admin
   * approved a sibling request) we still mark this row APPROVED so it
   * leaves the queue, but skip the actual delete.
   */
  async approve(adminId: string, requestId: string, adminNote?: string) {
    const req = await this.prisma.statsDeletionRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException({ code: 'REQUEST_NOT_FOUND', message: 'Request not found' });
    if (req.status !== DeletionStatus.PENDING) {
      throw new ConflictException({ code: 'REQUEST_ALREADY_RESOLVED', message: `Already ${req.status.toLowerCase()}.` });
    }

    const profileStillExists = await this.prisma.trackedProfile.findUnique({
      where: { id: req.profileId },
      select: { id: true, game: true, displayName: true },
    });

    await this.prisma.$transaction(async (tx) => {
      if (profileStillExists) {
        await tx.trackedProfile.delete({ where: { id: req.profileId } });
      }
      await tx.statsDeletionRequest.update({
        where: { id: requestId },
        data: { status: DeletionStatus.APPROVED, adminId, adminNote: adminNote ?? null, resolvedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'deletion.approve',
          target: req.profileId,
          meta: { requestId, alreadyGone: !profileStillExists } as object,
        },
      });
    });

    // Best-effort user notification — don't fail the approval on notify error.
    await this.notifications.push(req.userId, {
      level: 'success',
      title: 'Stats deletion approved',
      body: profileStillExists
        ? `Your stats for ${profileStillExists.game}/${profileStillExists.displayName} have been erased.`
        : 'Your deletion request was approved (the profile had already been removed).',
      data: { requestId, profileId: req.profileId },
    }).catch(e => this.log.warn(`notify approve failed: ${(e as Error).message}`));

    return { ok: true };
  }

  async reject(adminId: string, requestId: string, adminNote?: string) {
    const req = await this.prisma.statsDeletionRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException({ code: 'REQUEST_NOT_FOUND', message: 'Request not found' });
    if (req.status !== DeletionStatus.PENDING) {
      throw new ConflictException({ code: 'REQUEST_ALREADY_RESOLVED', message: `Already ${req.status.toLowerCase()}.` });
    }

    await this.prisma.$transaction([
      this.prisma.statsDeletionRequest.update({
        where: { id: requestId },
        data: { status: DeletionStatus.REJECTED, adminId, adminNote: adminNote ?? null, resolvedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: { actorId: adminId, action: 'deletion.reject', target: req.profileId, meta: { requestId } as object },
      }),
    ]);

    await this.notifications.push(req.userId, {
      level: 'warn',
      title: 'Stats deletion request rejected',
      body: adminNote ? `Reason: ${adminNote}` : 'An admin reviewed and rejected your request.',
      data: { requestId, profileId: req.profileId },
    }).catch(e => this.log.warn(`notify reject failed: ${(e as Error).message}`));

    return { ok: true };
  }
}
