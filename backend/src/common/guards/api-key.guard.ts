import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (process.env.PUBLIC_API_ENABLED !== 'true') return true;

    const req = ctx.switchToHttp().getRequest();
    const header = req.headers['x-api-key'] as string | undefined;
    if (!header) return true; // Anonymous — falls back to throttler

    const keyHash = createHash('sha256').update(header).digest('hex');
    const key = await this.prisma.apiKey.findUnique({ where: { keyHash } });
    if (!key || key.revokedAt) {
      throw new UnauthorizedException({ code: 'INVALID_API_KEY', message: 'API key invalid or revoked' });
    }

    await this.prisma.apiKey.update({ where: { id: key.id }, data: { lastUsed: new Date() } });
    req.apiKey = key;
    return true;
  }
}
