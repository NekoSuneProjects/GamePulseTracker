import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationRegistry } from '../games/integrations/integration.registry';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private integrations: IntegrationRegistry,
    private queue: QueueService,
  ) {}

  async overview() {
    const [users, profiles, snapshots, audit, queueStats] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.trackedProfile.count(),
      this.prisma.statSnapshot.count(),
      this.prisma.auditLog.count(),
      this.queue.stats(),
    ]);

    const integrations = this.integrations.list().map((i) => ({
      slug: i.slug, name: i.name, live: i.live, enabled: i.isEnabled(),
    }));

    return { users, profiles, snapshots, audit, queue: queueStats, integrations };
  }

  listUsers(limit = 50) {
    return this.prisma.user.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, username: true, email: true, role: true, emailVerified: true, createdAt: true },
    });
  }

  async banUser(id: string) {
    // Soft-ban: revoke sessions and disable login by changing role to USER then disabling.
    // For brevity here we just revoke all sessions; a real ban field could be added.
    await this.prisma.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    return { ok: true };
  }

  recentLogs(limit = 100) {
    return this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}
