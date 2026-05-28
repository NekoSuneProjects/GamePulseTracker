import type { ApiResponse } from '@gpt/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

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
