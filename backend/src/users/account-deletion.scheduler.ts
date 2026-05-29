import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Sweeps users whose `deletionAt` has passed and hard-deletes them.
 *
 * All owned rows cascade via FK ON DELETE CASCADE — sessions, linked
 * accounts, tracked profiles (the `userId` becomes null), follows,
 * activity events, achievements, favorites, deletion requests. The
 * trackedProfiles cascade is `SetNull`, not delete, so their stat history
 * stays public (we're erasing the account, not the public game data).
 *
 * Runs hourly; the grace window is in days so we don't need finer.
 */
@Injectable()
export class AccountDeletionScheduler {
  private readonly log = new Logger(AccountDeletionScheduler.name);
  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async tick() {
    try {
      const due = await this.prisma.user.findMany({
        where: { deletionAt: { not: null, lte: new Date() } },
        select: { id: true, username: true },
        take: 100,
      });
      if (due.length === 0) return;

      for (const u of due) {
        try {
          await this.prisma.$transaction([
            this.prisma.auditLog.create({
              data: { actorId: null, action: 'user.hard-delete', target: u.id, meta: { username: u.username } as object },
            }),
            this.prisma.user.delete({ where: { id: u.id } }),
          ]);
          this.log.log(`Hard-deleted user ${u.id} (${u.username})`);
        } catch (e) {
          this.log.warn(`Hard-delete failed for ${u.id}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      this.log.warn(`account-deletion tick failed: ${(e as Error).message}`);
    }
  }
}
