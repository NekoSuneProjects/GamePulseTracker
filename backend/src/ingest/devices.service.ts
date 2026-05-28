import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const PREFIX = 'gpt_dev_';

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  /** Returns the *plaintext* device key once. Stored as SHA-256 hash. */
  async create(userId: string, label: string, scopes: string[] = []) {
    const rawKey = PREFIX + randomBytes(24).toString('hex');
    const keyHash = this.hash(rawKey);
    const prefix = rawKey.slice(0, 12);

    const device = await this.prisma.device.create({
      data: { userId, label, keyHash, prefix, scopes },
    });

    return { device, deviceKey: rawKey };
  }

  list(userId: string) {
    return this.prisma.device.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, label: true, prefix: true, scopes: true, lastSeen: true, revokedAt: true, createdAt: true },
    });
  }

  async revoke(userId: string, deviceId: string) {
    const d = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!d || d.userId !== userId) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Device not found' });
    await this.prisma.device.update({ where: { id: deviceId }, data: { revokedAt: new Date() } });
  }

  /** Returns the Device row if key valid + not revoked. Updates lastSeen. */
  async authenticate(rawKey: string) {
    const keyHash = this.hash(rawKey);
    const device = await this.prisma.device.findUnique({ where: { keyHash } });
    if (!device || device.revokedAt) {
      throw new UnauthorizedException({ code: 'INVALID_DEVICE_KEY', message: 'Device key invalid or revoked' });
    }
    await this.prisma.device.update({ where: { id: device.id }, data: { lastSeen: new Date() } }).catch(() => {});
    return device;
  }

  /** Generates a short pairing code the desktop client can enter in the web UI. */
  async startPairing(userId: string, label: string) {
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    // Stash a "pending" device with no usable key yet (key only issued at completePairing)
    // Use a sentinel hash so the unique constraint still holds.
    const sentinel = this.hash(`pending:${code}:${Date.now()}`);
    const d = await this.prisma.device.create({
      data: { userId, label, keyHash: sentinel, prefix: '(pending)', pairingCode: code, pairingExpiresAt: expiresAt, revokedAt: new Date() },
    });
    return { id: d.id, code, expiresAt: expiresAt.toISOString() };
  }

  async completePairing(userId: string, code: string) {
    const d = await this.prisma.device.findFirst({
      where: { userId, pairingCode: code, pairingExpiresAt: { gt: new Date() } },
    });
    if (!d) throw new NotFoundException({ code: 'PAIRING_NOT_FOUND', message: 'Pairing code invalid or expired' });

    const rawKey = PREFIX + randomBytes(24).toString('hex');
    const keyHash = this.hash(rawKey);
    const prefix = rawKey.slice(0, 12);

    await this.prisma.device.update({
      where: { id: d.id },
      data: { keyHash, prefix, pairingCode: null, pairingExpiresAt: null, revokedAt: null },
    });
    return { deviceId: d.id, deviceKey: rawKey };
  }

  private hash(s: string) { return createHash('sha256').update(s).digest('hex'); }
  private generateCode() {
    // Six alphanumeric chars, dash-separated, readable.
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const pick = () => alphabet[Math.floor(Math.random() * alphabet.length)];
    return `${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}`;
  }
}
