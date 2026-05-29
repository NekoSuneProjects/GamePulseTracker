import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email.toLowerCase() }, { username: dto.username }] },
    });
    if (existing) {
      throw new ConflictException({ code: 'USER_EXISTS', message: 'Email or username is already in use' });
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        username: dto.username,
        passwordHash,
      },
    });

    return this.issueSession(user.id, user.username, user.role);
  }

  async login(dto: LoginDto, ua?: string, ip?: string) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.identifier.toLowerCase() }, { username: dto.identifier }] },
    });
    if (!user) throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });

    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });

    return this.issueSession(user.id, user.username, user.role, ua, ip);
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hash(refreshToken);

    // First check: is this hash present in ANY session at all (including
    // already-revoked ones)? If we find a REVOKED session matching the
    // presented token, that's a refresh-token-reuse attack signal — the
    // legitimate user already rotated, so someone else is presenting an
    // old copy. Revoke the entire family.
    const any = await this.prisma.session.findFirst({
      where: { refreshHash: tokenHash },
      select: { id: true, userId: true, revokedAt: true, expiresAt: true },
    });
    if (!any) {
      throw new UnauthorizedException({ code: 'INVALID_REFRESH', message: 'Refresh token invalid' });
    }
    if (any.revokedAt || any.expiresAt <= new Date()) {
      // Theft signal — burn the whole user's session family.
      this.log.warn(`Refresh token reuse detected for user ${any.userId} — revoking all sessions`);
      await this.prisma.session.updateMany({
        where: { userId: any.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException({ code: 'INVALID_REFRESH', message: 'Refresh token invalid' });
    }

    // Legitimate rotation.
    const session = await this.prisma.session.findFirst({
      where: { id: any.id },
      include: { user: true },
    });
    if (!session) throw new UnauthorizedException({ code: 'INVALID_REFRESH', message: 'Refresh token invalid' });

    await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return this.issueSession(session.user.id, session.user.username, session.user.role);
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hash(refreshToken);
    await this.prisma.session.updateMany({
      where: { refreshHash: tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.sanitize(user);
  }

  // ----- helpers -----
  private async issueSession(userId: string, username: string, role: 'USER' | 'ADMIN', ua?: string, ip?: string) {
    const accessToken = await this.jwt.signAsync({ sub: userId, username, role });
    const refreshToken = randomBytes(48).toString('hex');
    const refreshHash = this.hash(refreshToken);

    const ttlDays = Number((process.env.JWT_REFRESH_EXPIRES_IN ?? '30d').replace('d', '')) || 30;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: { userId, refreshHash, expiresAt, userAgent: ua, ip },
    });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      user: this.sanitize(user),
      accessToken,
      refreshToken,
      expiresAt: expiresAt.toISOString(),
    };
  }

  private hash(t: string) { return createHash('sha256').update(t).digest('hex'); }

  private sanitize(u: {
    id: string; username: string; email: string;
    role: 'USER'|'ADMIN'; emailVerified: boolean;
    createdAt: Date; avatarUrl: string|null;
    publicProfile: boolean; bio: string|null;
    socials: unknown;
  }) {
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      emailVerified: u.emailVerified,
      avatarUrl: u.avatarUrl,
      publicProfile: u.publicProfile,
      bio: u.bio,
      socials: (u.socials as Array<{ kind: string; value: string }> | null) ?? [],
      createdAt: u.createdAt.toISOString(),
    };
  }
}
