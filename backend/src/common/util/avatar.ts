/**
 * Crafatar (crafatar.com) has been intermittently returning 521 from
 * Cloudflare since early 2026. We standardised on mc-heads.net for all new
 * snapshots, but older DB rows still have crafatar URLs baked in. Every read
 * path that exposes `avatarUrl` to a client should run it through
 * `normaliseAvatarUrl` so users see the working CDN immediately, even before
 * the next refresh writes a fresh URL to the row.
 */

const CRAFATAR_RE = /crafatar\.com\/(?:avatars|renders\/body)\/([0-9a-f-]+)/i;

export function normaliseAvatarUrl(url: string | null | undefined): string | null {
  if (typeof url !== 'string' || !url) return url ?? null;
  const m = CRAFATAR_RE.exec(url);
  if (m) return `https://mc-heads.net/body/${m[1]}/right`;
  return url;
}

export function migrateAvatarUrlOn<T extends { avatarUrl?: string | null }>(row: T): T {
  if (typeof row.avatarUrl === 'string') {
    row.avatarUrl = normaliseAvatarUrl(row.avatarUrl) ?? row.avatarUrl;
  }
  return row;
}
