import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationRegistry } from '../games/integrations/integration.registry';
import type { IdentityHistoryEntry } from '@gpt/shared';

export interface LinkAccountInput {
  platform: string;
  providerId: string;
  displayName: string;
  meta?: Record<string, unknown>;
  verified?: boolean;
  autoResolve?: boolean;
}

@Injectable()
export class ConnectionsService {
  constructor(private prisma: PrismaService, private integrations: IntegrationRegistry) {}

  list(userId: string) {
    return this.prisma.linkedAccount.findMany({
      where: { userId },
      select: {
        id: true, platform: true, providerId: true, displayName: true,
        verified: true, autoResolve: true, identityHistory: true,
        lastResolvedAt: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async link(userId: string, input: LinkAccountInput) {
    const existing = await this.prisma.linkedAccount.findUnique({
      where: { platform_providerId: { platform: input.platform, providerId: input.providerId } },
    });
    if (existing) {
      throw new ConflictException({
        code: 'ACCOUNT_LINKED_ELSEWHERE',
        message: 'This platform account is already linked to a user',
      });
    }

    const history: IdentityHistoryEntry[] = [
      { providerId: input.providerId, observedAt: new Date().toISOString(), reason: 'first-link' },
    ];

    return this.prisma.linkedAccount.create({
      data: {
        userId,
        platform: input.platform,
        providerId: input.providerId,
        displayName: input.displayName,
        meta: input.meta ?? {},
        verified: input.verified ?? false,
        autoResolve: input.autoResolve ?? true,
        identityHistory: history as unknown as object,
        lastResolvedAt: new Date(),
      },
    });
  }

  async unlink(userId: string, id: string) {
    const acc = await this.prisma.linkedAccount.findUnique({ where: { id } });
    if (!acc || acc.userId !== userId) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Linked account not found' });
    }
    await this.prisma.linkedAccount.delete({ where: { id } });
  }

  /**
   * Re-resolve a linked account's stable provider id from its displayName via
   * the relevant integration. Returns `{ changed }` so the scheduler can log
   * useful counts.
   *
   * Strategy: find any integration whose `platforms[]` contains this account's
   * platform (or whose slug matches the platform), then call resolveIdentity()
   * if implemented.
   */
  async reResolve(userId: string, accountId: string, reason: 'manual' | 'auto-resolve' = 'manual') {
    const acc = await this.prisma.linkedAccount.findUnique({ where: { id: accountId } });
    if (!acc || acc.userId !== userId) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Linked account not found' });
    }

    // Pick the first registered integration that can resolve identity on this platform.
    const candidate = this.integrations.list().find(i =>
      !!i.resolveIdentity && (
        (i.platforms ?? []).includes(acc.platform) ||
        i.slug === acc.platform
      ),
    );
    if (!candidate?.resolveIdentity) return { changed: false, reason: 'no-resolver' as const };

    const fresh = await candidate.resolveIdentity({ identifier: acc.displayName, platform: acc.platform });
    const history = ((acc.identityHistory as unknown as IdentityHistoryEntry[]) ?? []).slice();
    const changed = fresh.providerId !== acc.providerId;

    if (changed) {
      history.push({ providerId: fresh.providerId, observedAt: new Date().toISOString(), reason });
    }

    await this.prisma.linkedAccount.update({
      where: { id: acc.id },
      data: {
        providerId: fresh.providerId,
        displayName: fresh.displayName,
        lastResolvedAt: new Date(),
        identityHistory: history as unknown as object,
      },
    });

    return { changed, oldProviderId: acc.providerId, newProviderId: fresh.providerId };
  }
}
