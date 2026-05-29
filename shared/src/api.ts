export interface ApiOk<T>  { ok: true;  data: T; }
export interface ApiErr    { ok: false; error: { code: string; message: string; details?: unknown }; }
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export interface PaginatedQuery {
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

/** Optional public socials a user can attach to their profile (tracker.gg style). */
export type SocialKind =
  | 'twitter' | 'twitch' | 'youtube' | 'discord'
  | 'tiktok'  | 'kick'   | 'instagram' | 'github'
  | 'website';

export interface SocialLink {
  kind: SocialKind;
  value: string;          // handle or full URL — server normalises to URL
  verified?: boolean;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  emailVerified: boolean;
  avatarUrl?: string | null;
  publicProfile?: boolean;
  bio?: string | null;
  socials?: SocialLink[];
  createdAt: string;
  /** Set if account deletion has been queued — UI can show a "queued" banner. */
  deletionAt?: string | null;
  /** True if the user has 2FA TOTP fully enrolled (secret saved + verified). */
  totpEnabled?: boolean;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

/** Represents a previous platform-side identifier that the same linked account
 *  used to resolve to — kept so historical TrackedProfile rows can still be
 *  traced back to the user even after an account migration. */
export interface IdentityHistoryEntry {
  providerId: string;
  observedAt: string;
  reason: 'manual' | 'auto-resolve' | 'first-link';
}
