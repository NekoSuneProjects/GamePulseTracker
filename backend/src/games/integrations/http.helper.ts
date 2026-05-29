import { Logger } from '@nestjs/common';
import { request } from 'undici';

const log = new Logger('IntegrationHttp');

export interface HttpOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  timeoutMs?: number;
}

export async function httpJson<T>(url: string, opts: HttpOptions = {}): Promise<T> {
  const u = new URL(url);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null) u.searchParams.append(k, String(v));
  }

  const headers: Record<string, string> = {
    'accept': 'application/json',
    'user-agent': 'GamePulseTracker/0.1 (+https://github.com)',
    ...opts.headers,
  };
  if (opts.body !== undefined) headers['content-type'] = 'application/json';

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), opts.timeoutMs ?? 10_000);

  try {
    const res = await request(u.toString(), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: ac.signal,
    });
    const text = await res.body.text();
    if (res.statusCode >= 400) {
      log.warn(`HTTP ${res.statusCode} ${u.host}${u.pathname}: ${text.slice(0, 200)}`);
      throw new IntegrationHttpError(res.statusCode, text);
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timer);
  }
}

export class IntegrationHttpError extends Error {
  constructor(public status: number, public bodySnippet: string) {
    super(`HTTP ${status}`);
  }
}

/**
 * Wrap an integration call so that auth-failure responses surface as a
 * helpful operator-facing message instead of a raw "HTTP 403" or the
 * provider's HTML error page snippet.
 *
 * Use at the call site that hits the auth-gated endpoint, not inside the
 * httpJson helper itself — only the integration knows which env var it's
 * configured by.
 */
export async function withTokenErrorHandling<T>(
  fn: () => Promise<T>,
  providerLabel: string,
  envVarName: string,
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof IntegrationHttpError && (e.status === 401 || e.status === 403)) {
      throw new Error(
        `${providerLabel} rejected the API key (HTTP ${e.status}). The token in ${envVarName} ` +
        `is missing, expired, or IP-restricted to a different host. ` +
        `Re-issue from the provider's dashboard and update the env var.`,
      );
    }
    throw e;
  }
}
