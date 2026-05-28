import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get('recent')
  async recent(@Query('limit') limit?: string) {
    const take = Math.max(1, Math.min(100, Number(limit ?? 25)));
    const rows = await this.prisma.trackedProfile.findMany({
      orderBy: { lastFetchedAt: { sort: 'desc', nulls: 'last' } },
      take,
      where: { active: true },
      select: {
        id: true, game: true, providerId: true, displayName: true, avatarUrl: true, platform: true,
        lastFetchedAt: true, latestSnapshot: true,
      },
    });
    return { ok: true, data: rows };
  }

  @Public()
  @Get('summary')
  async summary() {
    const [profiles, snapshots, users] = await Promise.all([
      this.prisma.trackedProfile.count(),
      this.prisma.statSnapshot.count(),
      this.prisma.user.count(),
    ]);
    return { ok: true, data: { profiles, snapshots, users } };
  }
}
