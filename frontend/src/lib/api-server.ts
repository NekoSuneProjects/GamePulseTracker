/**
 * Helper for server-side fetches in RSC / route handlers.
 *
 * The client-side `api()` helper uses `NEXT_PUBLIC_API_URL` which can be a
 * relative path like `/api` (great for the browser — nginx → backend) but
 * Node's fetch can't resolve relative URLs from the server. Server components
 * need an ABSOLUTE URL.
 *
 * In a docker-compose deployment that's `http://backend:4000` (the compose
 * service name), set via the `INTERNAL_API_URL` env var on the frontend
 * container. For non-Docker setups (npm run dev, split hosts), fall back to
 * the bake-time NEXT_PUBLIC_API_URL if it's absolute, otherwise localhost.
 */
function serverApiBase(): string {
  const internal = process.env.INTERNAL_API_URL?.trim();
  if (internal) return internal.replace(/\/$/, '');

  const baked = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (baked && /^https?:\/\//i.test(baked)) return baked.replace(/\/$/, '');

  return 'http://localhost:4000';
}

/**
 * Fetch JSON from the backend server-side. Returns the parsed `data` field
 * on success and `null` on any error so callers can `?? defaultValue`.
 */
export async function serverFetch<T>(path: string): Promise<T | null> {
  const url = `${serverApiBase()}${path.startsWith('/') ? path : '/' + path}`;
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (r.status === 404) return null;
    if (!r.ok) return null;
    const j = (await r.json()) as { ok: boolean; data?: T; error?: unknown };
    return j.ok ? (j.data as T) : null;
  } catch {
    return null;
  }
}
