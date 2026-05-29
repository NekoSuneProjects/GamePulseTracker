'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';

interface ApiKey {
  id: string;
  label: string;
  prefix: string;
  rateLimit: number;
  lastUsed: string | null;
  createdAt: string;
}

interface CreatedKey extends ApiKey {
  plaintext: string;
}

export default function ApiKeysPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [label, setLabel] = useState('');
  const [rateLimit, setRateLimit] = useState(60);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedKey | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await api<ApiKey[] | null>('/api-keys', { auth: true });
      setKeys(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed to load keys');
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    void refresh();
  }, [loading, user, router, refresh]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const k = await api<CreatedKey>('/api-keys', { method: 'POST', auth: true, body: JSON.stringify({ label, rateLimit }) });
      setCreated(k);
      setLabel('');
      await refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Create failed');
    } finally { setBusy(false); }
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this key? Any client using it will start getting 401s.')) return;
    try {
      await api(`/api-keys/${id}`, { method: 'DELETE', auth: true });
      await refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Revoke failed');
    }
  }

  if (loading || !user) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-display font-semibold">API keys</h1>
        <p className="text-sm text-ink-400 mt-1">
          Use these in the <code className="font-mono">X-API-Key</code> header to
          access the public REST API outside the browser.
        </p>
      </header>

      {created && (
        <div className="glass p-4 border-pulse-500/50 space-y-3">
          <div className="text-sm">
            <span className="text-pulse-300 font-semibold">New key created</span> — copy it now,
            it won't be shown again.
          </div>
          <div className="bg-ink-950 p-2 rounded font-mono text-xs break-all select-all">{created.plaintext}</div>
          <div className="flex gap-2">
            <button onClick={() => navigator.clipboard.writeText(created.plaintext)} className="btn-ghost text-xs">
              Copy
            </button>
            <button onClick={() => setCreated(null)} className="btn-primary text-xs">Done</button>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="glass p-4 space-y-3">
        <h2 className="font-display font-semibold">Create a new key</h2>
        <label className="block">
          <span className="text-sm text-ink-300">Label</span>
          <input className="input mt-1" value={label} onChange={e => setLabel(e.target.value)}
            placeholder="My dashboard script" required maxLength={64} />
        </label>
        <label className="block">
          <span className="text-sm text-ink-300">Rate limit (req/min)</span>
          <input className="input mt-1" type="number" min={1} max={1000}
            value={rateLimit} onChange={e => setRateLimit(Number(e.target.value))} />
        </label>
        {err && <div className="text-red-400 text-sm">{err}</div>}
        <button disabled={busy} className="btn-primary">{busy ? '…' : 'Create key'}</button>
      </form>

      <section>
        <h2 className="font-display font-semibold mb-2">Active keys</h2>
        {keys.length === 0 ? (
          <div className="glass p-4 text-sm text-ink-400">No keys yet.</div>
        ) : (
          <div className="space-y-2">
            {keys.map(k => (
              <div key={k.id} className="glass p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{k.label}</div>
                  <div className="text-xs text-ink-400 font-mono truncate">{k.prefix}…</div>
                  <div className="text-xs text-ink-500 mt-0.5">
                    {k.rateLimit} req/min · created {new Date(k.createdAt).toLocaleDateString()}
                    {k.lastUsed && ` · last used ${new Date(k.lastUsed).toLocaleString()}`}
                  </div>
                </div>
                <button onClick={() => revoke(k.id)} className="btn-danger text-xs shrink-0">Revoke</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
