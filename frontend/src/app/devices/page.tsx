'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';

interface Device {
  id: string; label: string; prefix: string; scopes: string[];
  lastSeen: string | null; revokedAt: string | null; createdAt: string;
}

export default function DevicesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [label, setLabel] = useState('Gaming PC');
  const [scopes, setScopes] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const list = await api<Device[] | null>('/devices', { auth: true });
    setDevices(Array.isArray(list) ? list : []);
  }

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    refresh().catch(e => setError(e instanceof ApiError ? e.message : 'Failed to load devices'));
  }, [loading, user, router]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setCreatedKey(null);
    try {
      const r = await api<{ deviceId: string; prefix: string; deviceKey: string }>('/devices', {
        method: 'POST', auth: true,
        body: JSON.stringify({ label, scopes: scopes.split(',').map(s => s.trim()).filter(Boolean) }),
      });
      setCreatedKey(r.deviceKey);
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Create failed');
    }
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this device? Any companion using it stops working immediately.')) return;
    await api(`/devices/${id}`, { method: 'DELETE', auth: true });
    await refresh();
  }

  if (loading || !user) return null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-display font-semibold">Devices</h1>
        <p className="text-ink-400 mt-1">
          Pair an Overwolf overlay or other companion app so it can post stats for games without a public API
          (Warframe inventory, Arc Raiders, CoD, etc). See the <span className="text-pulse-400 font-mono">CLIENT.md</span> spec for the ingest contract.
        </p>
      </header>

      <section className="glass p-6">
        <h2 className="font-display font-semibold mb-3">Create new device</h2>
        <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="input" value={label} onChange={e => setLabel(e.target.value)} placeholder="Gaming PC Overwolf" required />
          <input className="input" value={scopes} onChange={e => setScopes(e.target.value)} placeholder="warframe,arc-raiders (blank = all)" />
          <button className="btn-primary">Create</button>
        </form>
        {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
        {createdKey && (
          <div className="mt-4 p-4 rounded-xl bg-pulse-500/10 border border-pulse-500/40 text-sm">
            <div className="font-semibold mb-1 text-pulse-300">Copy this key — it will not be shown again</div>
            <div className="font-mono break-all text-pulse-200">{createdKey}</div>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display font-semibold mb-3">Devices</h2>
        {devices.length === 0 ? (
          <div className="glass p-6 text-ink-400 text-sm">No devices paired yet.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {devices.map(d => (
              <div key={d.id} className="glass p-4 flex justify-between items-start gap-2">
                <div>
                  <div className="font-semibold">{d.label}</div>
                  <div className="text-xs font-mono text-ink-400 truncate">{d.prefix}…</div>
                  <div className="text-xs text-ink-500 mt-1">
                    scopes: {d.scopes.length > 0 ? d.scopes.join(', ') : 'all games'}
                  </div>
                  {d.lastSeen && <div className="text-xs text-ink-500">last seen {new Date(d.lastSeen).toLocaleString()}</div>}
                  {d.revokedAt && <div className="text-xs text-red-400">revoked {new Date(d.revokedAt).toLocaleString()}</div>}
                </div>
                {!d.revokedAt && <button onClick={() => revoke(d.id)} className="btn-danger text-xs">Revoke</button>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
