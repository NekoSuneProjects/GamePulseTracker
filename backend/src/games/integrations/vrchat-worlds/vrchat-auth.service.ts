import { Injectable, Logger } from '@nestjs/common';
import { authenticator } from 'otplib';
import { request } from 'undici';
import { RedisService } from '../../../redis/redis.service';

const CACHE_KEY = 'gpt:vrchat:auth';
/** VRChat session cookies last ~30 days. We refresh proactively after 6h so we
 *  never serve a stale cookie that's about to be rotated. */
const CACHE_TTL_SECONDS = 6 * 60 * 60;

interface AuthUserResp {
  requiresTwoFactorAuth?: string[];  // e.g. ['totp', 'emailOtp']
  id?: string;
  username?: string;
}

/**
 * Handles the VRChat login flow so the integration never asks the operator
 * for a raw browser cookie. Reads VRCHAT_USERNAME / VRCHAT_PASSWORD /
 * VRCHAT_TOTP_SECRET (optional) from env, performs the API login (including
 * 2FA via TOTP if required), and caches the resulting `auth=` cookie in Redis.
 *
 * On any 401 from a downstream call, the integration invalidates the cache
 * and retries once — that's how we recover when VRChat rotates the session.
 *
 * VRChat requires a contactable User-Agent per their ToS. Set
 * VRCHAT_USER_AGENT or we default to a sensible one identifying this software.
 */
@Injectable()
export class VrchatAuthService {
  private readonly log = new Logger(VrchatAuthService.name);
  constructor(private redis: RedisService) {}

  isConfigured(): boolean {
    return Boolean(process.env.VRCHAT_USERNAME && process.env.VRCHAT_PASSWORD);
  }

  userAgent(): string {
    return process.env.VRCHAT_USER_AGENT ?? 'GamePulseTracker/0.1 (self-hosted; worlds-only)';
  }

  /**
   * Shared in-flight login Promise. Without this, multiple concurrent 401s
   * (e.g. several parallel `/worlds/<id>` requests after the cookie expires)
   * each call `invalidate()` + `login()` independently, racing N parallel
   * /auth/user calls against VRChat's rate-limited login endpoint and
   * potentially temp-banning the operator's account.
   */
  private inflightLogin: Promise<string> | null = null;

  /** Returns a valid VRChat `Cookie` header value. Logs in if cache is empty. */
  async getCookieHeader(): Promise<string> {
    const cached = await this.redis.client.get(CACHE_KEY);
    if (cached) return cached;
    if (this.inflightLogin) return this.inflightLogin;
    this.inflightLogin = this.login().finally(() => { this.inflightLogin = null; });
    return this.inflightLogin;
  }

  async invalidate(): Promise<void> {
    await this.redis.del(CACHE_KEY);
  }

  /**
   * Performs the login flow, optionally handling TOTP 2FA, and stores the
   * resulting cookies in Redis. Returns the cookie header value.
   */
  private async login(): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('VRChat credentials are not configured — set VRCHAT_USERNAME and VRCHAT_PASSWORD.');
    }

    const username = process.env.VRCHAT_USERNAME!;
    const password = process.env.VRCHAT_PASSWORD!;
    const ua = this.userAgent();

    // VRChat expects URL-encoded username and password in the Basic auth header.
    const basic = Buffer.from(`${encodeURIComponent(username)}:${encodeURIComponent(password)}`).toString('base64');

    // Step 1 — initial auth call. Server replies with auth= cookie regardless of 2FA.
    const res1 = await request('https://api.vrchat.cloud/api/1/auth/user', {
      method: 'GET',
      headers: { authorization: `Basic ${basic}`, 'user-agent': ua, accept: 'application/json' },
    });
    const authCookie = this.extractCookie(res1.headers['set-cookie'], 'auth');
    const bodyText = await res1.body.text();
    if (res1.statusCode >= 400 || !authCookie) {
      throw new Error(`VRChat login failed (${res1.statusCode}): ${bodyText.slice(0, 200)}`);
    }

    let body: AuthUserResp = {};
    try { body = JSON.parse(bodyText) as AuthUserResp; } catch { /* ignore */ }

    if (body.requiresTwoFactorAuth?.length) {
      const cookie = `auth=${authCookie}`;
      const finalCookie = await this.completeTwoFactor(body.requiresTwoFactorAuth, cookie);
      await this.redis.client.setex(CACHE_KEY, CACHE_TTL_SECONDS, finalCookie);
      this.log.log(`VRChat login OK (${body.requiresTwoFactorAuth.join(',')} 2FA cleared)`);
      return finalCookie;
    }

    const cookie = `auth=${authCookie}`;
    await this.redis.client.setex(CACHE_KEY, CACHE_TTL_SECONDS, cookie);
    this.log.log('VRChat login OK (no 2FA)');
    return cookie;
  }

  /**
   * VRChat lists which 2FA methods the account requires. We support TOTP
   * (Google Authenticator / Authy) via VRCHAT_TOTP_SECRET. Email OTP is not
   * automatable — if email OTP is the only option, the operator must remove
   * 2FA from the account or set up TOTP instead.
   */
  private async completeTwoFactor(methods: string[], authCookieHeader: string): Promise<string> {
    const ua = this.userAgent();

    if (methods.includes('totp')) {
      const secret = process.env.VRCHAT_TOTP_SECRET;
      if (!secret) {
        throw new Error('VRChat account requires TOTP 2FA — set VRCHAT_TOTP_SECRET (base32 secret from the authenticator setup screen).');
      }
      const code = authenticator.generate(secret.replace(/\s+/g, ''));
      const res = await request('https://api.vrchat.cloud/api/1/auth/twofactorauth/totp/verify', {
        method: 'POST',
        headers: { 'user-agent': ua, accept: 'application/json', cookie: authCookieHeader, 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const text = await res.body.text();
      if (res.statusCode >= 400) {
        throw new Error(`VRChat TOTP verify failed (${res.statusCode}): ${text.slice(0, 200)}`);
      }
      const twoFa = this.extractCookie(res.headers['set-cookie'], 'twoFactorAuth');
      return twoFa ? `${authCookieHeader}; twoFactorAuth=${twoFa}` : authCookieHeader;
    }

    if (methods.includes('emailOtp')) {
      throw new Error('VRChat account uses email OTP 2FA, which cannot be automated. Switch the account to TOTP 2FA (set up an authenticator app in VRChat settings) and put the base32 secret in VRCHAT_TOTP_SECRET.');
    }

    throw new Error(`VRChat 2FA method not supported: ${methods.join(',')}`);
  }

  private extractCookie(header: string | string[] | undefined, name: string): string | null {
    const list = Array.isArray(header) ? header : header ? [header] : [];
    for (const c of list) {
      const m = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`, 'i').exec(c);
      if (m) return m[1];
    }
    return null;
  }
}
