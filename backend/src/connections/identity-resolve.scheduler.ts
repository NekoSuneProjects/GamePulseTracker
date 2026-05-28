import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectionsService } from './connections.service';

/**
 * Nightly re-resolve. For every LinkedAccount with `autoResolve=true`, we ask
 * the relevant integration (matched by platform → game) to re-resolve the
 * username to the current platform-side stable id, and update the row if it
 * changed. This handles the "PS5 swapped EA account" case the user described.
 */
@Injectable()
export class IdentityResolveScheduler {
  private readonly log = new Logger(IdentityResolveScheduler.name);
  constructor(private prisma: PrismaService, private connections: ConnectionsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async tick() {
    const accounts = await this.prisma.linkedAccount.findMany({
      where: { autoResolve: true },
      take: 1000,
      orderBy: [{ lastResolvedAt: { sort: 'asc', nulls: 'first' } }],
    });

    let changed = 0;
    for (const a of accounts) {
      try {
        const result = await this.connections.reResolve(a.userId, a.id, 'auto-resolve');
        if (result?.changed) changed++;
      } catch (e) {
        this.log.warn(`re-resolve ${a.id} (${a.platform}/${a.providerId}) failed: ${(e as Error).message}`);
      }
    }
    if (changed > 0) this.log.log(`Identity re-resolve: ${changed} account(s) updated`);
  }
}
