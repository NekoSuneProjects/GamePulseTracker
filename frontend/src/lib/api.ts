import type { ApiResponse } from '@gpt/shared';

/**
 * Resolve the API base URL at runtime.
 *
 * Priority:
 *   1. NEXT_PUBLIC_API_URL baked into the build (set in docker-compose ARG or .env)
 *   2. Same-origin /api  — works behind nginx (which proxies /api/* → backend)
 *   3. http://localhost:4000 for `npm run dev`
 *
 * Step 2 is what stops the "POST /auth/login 404 from the frontend" case the
 * user hit: if the deployer forgot to set NEXT_PUBLIC_API_URL, the request
 * goes to /api/auth/login (nginx-handled) instead of /auth/login (frontend,
 * which has no such route).
 */
const API_URL = (() => {
  const baked = process.env.NEXT_PUBLIC_API_URL;
  if (baked) return baked.replace(/\/$/, '');
  if (typeof window !== 'undefined') return `${window.location.origin}/api`;
  return 'http://localhost:4000';
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
