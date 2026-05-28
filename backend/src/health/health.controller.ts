import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  @Public()
  @Get()
  async health() {
    const checks: Record<string, 'ok' | 'fail'> = { db: 'fail', redis: 'fail' };
    try { await this.prisma.$queryRaw`SELECT 1`; checks.db = 'ok'; } catch { /* */ }
    try { await this.redis.client.ping(); checks.redis = 'ok'; } catch { /* */ }
    const ok = Object.values(checks).every(v => v === 'ok');
    return { ok, checks, uptime: process.uptime(), timestamp: new Date().toISOString() };
  }
}
