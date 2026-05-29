import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import { PrismaService } from '../prisma/prisma.service';

/**
 * TOTP enrolment is a two-step flow:
 *
 *   1. `enroll()` generates a secret + otpauth URL, stores the secret on the
 *      user row but leaves `totpEnabled=false` so an abandoned setup is
 *      invisible. UI renders the otpauth URL as a QR code via google charts
 *      / qrcode lib.
 *   2. `verify()` checks a code against the saved secret. First successful
 *      verify flips `totpEnabled=true` — now login requires a code too.
 *
 * `disable()` requires the user's current password (defence against a
 * stolen JWT being used to silently drop 2FA).
 *
 * Login enforcement: AuthService.login won't issue a session if the user
 * has totpEnabled=true and no `code` was supplied. The login DTO grows an
 * optional `totp` field.
 */
@Injectable()
export class TotpService {
  constructor(private prisma: PrismaService) {}

  async enroll(userId: string, issuer = 'GamePulseTracker') {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.totpEnabled) {
      throw new ConflictException({ code: 'TOTP_ALREADY_ENABLED', message: 'Two-factor auth is already enabled.' });
    }
    const secret = authenticator.generateSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { totpSecret: secret, totpEnabled: false } });
    const otpauth = authenticator.keyuri(user.username, issuer, secret);
    return { otpauth, secret };
  }

  async verify(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.totpSecret) {
      throw new BadRequestException({ code: 'TOTP_NOT_ENROLLED', message: 'No TOTP secret on file — call enroll first.' });
    }
    if (!authenticator.check(code.trim(), user.totpSecret)) {
      throw new UnauthorizedException({ code: 'TOTP_INVALID', message: 'Code did not match.' });
    }
    if (!user.totpEnabled) {
      await this.prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } });
    }
    return { enabled: true };
  }

  /**
   * Used by AuthService.login when the user has totpEnabled. Returns true
   * if the code matches, false otherwise — caller decides whether to
   * 401 with a friendly code or surface the underlying failure.
   */
  checkForLogin(secret: string | null, code: string | null | undefined): boolean {
    if (!secret) return true; // TOTP not configured at all
    if (!code) return false;
    return authenticator.check(code.trim(), secret);
  }

  async disable(userId: string, password: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException({ code: 'INVALID_PASSWORD', message: 'Password is incorrect' });
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: null, totpEnabled: false },
    });
    return { disabled: true };
  }
}
