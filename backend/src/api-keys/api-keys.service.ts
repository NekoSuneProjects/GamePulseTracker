import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Self-service API key management for users who hit the public REST API
 * programmatically. Two-row design:
 *
 *  - `prefix` (8 chars) — shown in the UI so the user can identify keys.
 *  - `keyHash` (sha256) — what we actually compare against on each call.
 *
 * The plaintext is only ever returned ONCE — when the key is created. The
 * UI surfaces it as "copy now, can't be shown again". This matches the
 * ApiKeyGuard logic that does sha256(presented) === keyHash lookup.
 */
@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, label: true, prefix: true, rateLimit: true, lastUsed: true, createdAt: true },
    });
  }

  async create(userId: string, label: string, rateLimit = 60) {
    const trimmed = label.trim();
    if (!trimmed || trimmed.length > 64) {
      throw new BadRequestException({ code: 'INVALID_LABEL', message: 'Label must be 1-64 chars.' });
    }
    if (rateLimit < 1 || rateLimit > 1000) {
      throw new BadRequestException({ code: 'INVALID_RATE_LIMIT', message: 'rateLimit must be 1-1000 req/min.' });
    }

    const count = await this.prisma.apiKey.count({ where: { userId, revokedAt: null } });
    if (count >= 10) {
      throw new ConflictException({ code: 'TOO_MANY_KEYS', message: 'Max 10 active keys per user. Revoke one first.' });
    }

    // Prefix the plaintext key with `gpt_` so it's identifiable in logs/
    // searches without exposing entropy. The 32-byte random part stays
    // unguessable.
    const plaintext = `gpt_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(plaintext).digest('hex');
    const prefix = plaintext.slice(0, 12); // 'gpt_' + 8 hex chars

    const row = await this.prisma.apiKey.create({
      data: { userId, label: trimmed, keyHash, prefix, rateLimit },
      select: { id: true, label: true, prefix: true, rateLimit: true, createdAt: true },
    });
    // Return plaintext exactly once.
    return { ...row, plaintext };
  }

  async revoke(userId: string, id: string) {
    const found = await this.prisma.apiKey.findFirst({ where: { id, userId, revokedAt: null }, select: { id: true } });
    if (!found) throw new NotFoundException({ code: 'API_KEY_NOT_FOUND', message: 'API key not found' });
    await this.prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
    return { revoked: true };
  }
}
