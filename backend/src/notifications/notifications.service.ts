import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type NotifLevel = 'info' | 'success' | 'warn' | 'error';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async push(userId: string, opts: { level?: NotifLevel; title: string; body: string; data?: Record<string, unknown> }) {
    return this.prisma.notification.create({
      data: {
        userId,
        level: opts.level ?? 'info',
        title: opts.title,
        body: opts.body,
        data: opts.data ? (opts.data as object) : undefined,
      },
    });
  }

  list(userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}) {
    return this.prisma.notification.findMany({
      where: { userId, ...(opts.unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 50,
    });
  }

  markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
