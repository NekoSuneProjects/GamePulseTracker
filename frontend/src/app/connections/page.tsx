'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';
import { PLATFORMS } from '@gpt/shared';

interface LinkedAccount {
  id: string;
  platform: string;
  providerId: string;
  displayName: string;
  verified: boolean;
  autoResolve: boolean;
  identityHistory: Array<{ providerId: string; observedAt: string; reason: string }>;
  lastResolvedAt: string | null;
  createdAt: string;
}

export default function ConnectionsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [platform, setPlatform] = useState<string>('steam');
  const [providerId, setProviderId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const list = await api<LinkedAccount[] | null>('/connections', { auth: true });
    setAccounts(Array.isArray(list) ? list : []);
  }

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    refresh().catch(e => setError(e instanceof ApiError ? e.message : 'Failed to load connections'));
  }, [loading, user, router]);

  async function link(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api('/connections', {
        method: 'POST', auth: true,
        body: JSON.stringify({ platform, providerId, displayName }),
      });
      setProviderId(''); setDisplayName('');
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Link failed');
    } finally { setBusy(false); }
  }

  async function unlink(id: string) {
    await api(`/connections/${id}`, { method: 'DELETE', auth: true });
    setAccounts(a => a.filter(x => x.id !== id));
  }

  async function reResolve(id: string) {
    try {
      const res = await api<{ changed: boolean; oldProviderId?: string; newProviderId?: string }>(
        `/connections/${id}/re-resolve`, { method: 'POST', auth: true });
      if (res.changed) alert(`Updated: ${res.oldProviderId} → ${res.newProviderId}`);
      else             alert('No change — identity is up to date.');
      await refresh();
    } catch (e) {
      alert(`Re-resolve failed: ${(e as Error).message}`);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-display font-semibold">Connections</h1>
        <p className="text-ink-400 mt-1">
          Link your gaming platforms. We re-resolve identity nightly so if a console swaps its underlying
          account (e.g. PS5 ↔ a new EA account), stats follow the new account automatically. Use the
          <span className="text-pulse-300"> Re-resolve </span>button to force it now.
        </p>
      </header>

      <section className="glass p-6">
        <h2 className="font-display font-semibold mb-3">Add platform</h2>
        <form onSubmit={link} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={platform} onChange={e => setPlatform(e.target.value)} className="input">
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input value={providerId}  onChange={e => setProviderId(e.target.value)}  className="input" placeholder="Provider ID" required />
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="input" placeholder="Display name" required />
          <button disabled={busy} className="btn-primary">{busy ? 'Linking…' : 'Link'}</button>
        </form>
        {error && <div className="mt-2 text-red-400 text-sm">{error}</div>}
      </section>

      <section>
        <h2 className="font-display font-semibold mb-3">Linked accounts</h2>
        {accounts.length === 0 ? (
          <div className="glass p-6 text-ink-400 text-sm">No platforms linked yet.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {accounts.map(a => (
              <div key={a.id} className="glass p-4 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold capitalize">{a.platform}</div>
                    <div className="text-sm text-ink-300 truncate">{a.displayName}</div>
                    <div className="text-xs text-ink-500 font-mono truncate">{a.providerId}</div>
                    {a.lastResolvedAt && (
                      <div className="text-xs text-ink-500 mt-1">resolved {new Date(a.lastResolvedAt).toLocaleString()}</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => reResolve(a.id)} className="btn-ghost text-xs">Re-resolve</button>
                    <button onClick={() => unlink(a.id)}     className="btn-danger text-xs">Unlink</button>
                  </div>
                </div>
                {a.identityHistory && a.identityHistory.length > 1 && (
                  <details className="text-xs text-ink-400">
                    <summary className="cursor-pointer hover:text-pulse-400">Identity history ({a.identityHistory.length})</summary>
                    <ul className="mt-2 space-y-1 font-mono">
                      {a.identityHistory.slice().reverse().map((h, i) => (
                        <li key={i}>{new Date(h.observedAt).toLocaleString()} — {h.providerId} ({h.reason})</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
