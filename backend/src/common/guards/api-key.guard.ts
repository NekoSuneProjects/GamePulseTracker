import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard for the public /api/* surface.
 *
 * - When `PUBLIC_API_ENABLED=false` (the default), this guard rejects ALL
 *   requests with 403. Previously it returned `true` here, which meant the
 *   flag "disabled" the auth but kept the routes open via the throttler —
 *   confusing and almost-certainly the opposite of what the operator wanted.
 *
 * - When enabled, an `X-API-Key` header is OPTIONAL: anonymous callers hit
 *   the shared per-IP throttle bucket; authenticated callers get the higher
 *   per-key rate limit attached to their ApiKey row.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (process.env.PUBLIC_API_ENABLED !== 'true') {
      throw new ForbiddenException({
        code: 'PUBLIC_API_DISABLED',
        message: 'The public API is not enabled on this deployment.',
      });
    }

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
