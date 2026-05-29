/**
 * Hardcoded achievement catalog. New achievements are added here — there's
 * no operator UI for authoring them (yet). Each entry has:
 *
 *  - `slug` — stable id stored in UserAchievement
 *  - `label` / `description` — UI copy
 *  - `icon` — short emoji or text shown as the badge "logo"
 *  - `check(ctx)` — predicate that returns true when the user qualifies
 *
 * Computation is intentionally cheap so we can run all checks on every
 * stats refresh — a heavy criterion gets a denormalised counter in the
 * future, not a slow query here.
 */
export interface AchievementCtx {
  trackedProfileCount: number;
  matchCount: number;
  linkedAccountCount: number;
  followerCount: number;
  emailVerified: boolean;
  totpEnabled: boolean;
  hasPublicProfile: boolean;
  hasAvatar: boolean;
}

export interface AchievementDef {
  slug: string;
  label: string;
  description: string;
  icon: string;
  check: (ctx: AchievementCtx) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    slug: 'verified-email',
    label: 'Verified',
    description: 'Verified your email address.',
    icon: '✓',
    check: c => c.emailVerified,
  },
  {
    slug: 'two-factor',
    label: 'Two-factor',
    description: 'Enabled two-factor authentication.',
    icon: '🔐',
    check: c => c.totpEnabled,
  },
  {
    slug: 'first-link',
    label: 'Linked up',
    description: 'Connected at least one external platform.',
    icon: '🔗',
    check: c => c.linkedAccountCount >= 1,
  },
  {
    slug: 'public-profile',
    label: 'Public profile',
    description: 'Made your profile public + set an avatar.',
    icon: '🌐',
    check: c => c.hasPublicProfile && c.hasAvatar,
  },
  {
    slug: 'first-tracked',
    label: 'First track',
    description: 'Tracked your first player profile.',
    icon: '⭐',
    check: c => c.trackedProfileCount >= 1,
  },
  {
    slug: 'matches-100',
    label: 'Centurion',
    description: '100 matches recorded across your tracked profiles.',
    icon: '💯',
    check: c => c.matchCount >= 100,
  },
  {
    slug: 'matches-100k',
    label: 'Centi-grinder',
    description: '100,000 matches recorded.',
    icon: '🏆',
    check: c => c.matchCount >= 100_000,
  },
  {
    slug: 'followed-10',
    label: 'Crowd-puller',
    description: '10 or more followers.',
    icon: '🎯',
    check: c => c.followerCount >= 10,
  },
];

export const ACHIEVEMENTS_BY_SLUG = new Map(ACHIEVEMENTS.map(a => [a.slug, a]));
