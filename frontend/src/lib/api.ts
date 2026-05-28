import type { ApiResponse } from '@gpt/shared';

/**
 * Resolve the API base URL at runtime.
 *
 *   1. NEXT_PUBLIC_API_URL baked into the build (set via build ARG or .env)
 *   2. Same-origin /api — works behind nginx (which proxies /api/* → backend)
 *   3. http://localhost:4000 for `npm run dev`
 *
 * Heuristic: if NEXT_PUBLIC_API_URL is set but points at the SAME ORIGIN as
 * the page (i.e. the user is serving frontend + backend behind the same
 * reverse proxy) AND doesn't already include "/api", append "/api"
 * automatically. This stops the common deploy-config mistake the user hit —
 * setting NEXT_PUBLIC_API_URL=http://your.host:port without /api, which makes
 * the request 404 against the frontend instead of routing through nginx.
 */
const API_URL = (() => {
  const baked = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!baked) {
    if (typeof window !== 'undefined') return `${window.location.origin}/api`;
    return 'http://localhost:4000';
  }
  const trimmed = baked.replace(/\/$/, '');
  if (typeof window === 'undefined') return trimmed;
  try {
    const bakedUrl = new URL(trimmed);
    const sameOrigin = bakedUrl.origin === window.location.origin;
    const alreadyHasApiPath = /\/api(\/|$)/.test(bakedUrl.pathname);
    if (sameOrigin && !alreadyHasApiPath) return `${trimmed}/api`;
  } catch { /* not a parseable URL — fall through and use as-is */ }
  return trimmed;
})();

const TOKEN_KEY = 'gpt:access';
const REFRESH_KEY = 'gpt:refresh';

export function getAccess(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefresh(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export async function api<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.auth) {
    const t = getAccess();
    if (t) headers['authorization'] = `Bearer ${t}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.ok) {
    throw new ApiError(json.error.code, json.error.message, res.status);
  }
  return json.data;
}

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

export const apiUrl = API_URL;
