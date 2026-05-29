import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';
import { ApiTags } from '@nestjs/swagger';

const CRAFATAR_RE = /crafatar\.com\/(?:avatars|renders\/body)\/([0-9a-f-]+)/i;
function migrateAvatar<T extends { avatarUrl?: string | null }>(row: T): T {
  if (typeof row.avatarUrl === 'string') {
    const m = CRAFATAR_RE.exec(row.avatarUrl);
    if (m) row.avatarUrl = `https://mc-heads.net/body/${m[1]}/right`;
  }
  return row;
}

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
    return { ok: true, data: rows.map(migrateAvatar) };
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
