'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { StatCard } from '@/components/StatCard';

interface Overview {
  users: number; profiles: number; snapshots: number; audit: number;
  queue: { waiting: number; active: number; completed: number; failed: number; delayed: number };
  integrations: Array<{ slug: string; name: string; live: boolean; enabled: boolean }>;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'ADMIN') { router.push('/'); return; }
    api<Overview>('/admin/overview', { auth: true })
      .then(setData)
      .catch(e => setErr(String((e as Error).message)));
  }, [loading, user, router]);

  if (loading || !user) return null;
  if (err) return <div className="glass p-6 text-red-400">{err}</div>;
  if (!data) return <div className="glass p-6 text-ink-300 animate-pulse">Loading admin overview…</div>;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-display font-semibold">Admin</h1>
        <Link href="/admin/deletion-requests" className="chip hover:bg-pulse-500/30">
          Deletion requests →
        </Link>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard accent label="Users" value={data.users} />
        <StatCard label="Profiles"  value={data.profiles} />
        <StatCard label="Snapshots" value={data.snapshots} />
        <StatCard label="Audit logs" value={data.audit} />
      </section>

      <section>
        <h2 className="font-display font-semibold mb-3">Queue</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(data.queue).map(([k, v]) => (
            <div key={k} className="glass p-3">
              <div className="text-xs uppercase text-ink-400">{k}</div>
              <div className="text-2xl font-display">{v as number}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display font-semibold mb-3">Integrations</h2>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-800/60 text-ink-300 uppercase text-xs">
              <tr>
                <th className="text-left px-4 py-2">Game</th>
                <th className="text-left px-4 py-2">Slug</th>
                <th className="text-left px-4 py-2">Mode</th>
                <th className="text-left px-4 py-2">Enabled</th>
              </tr>
            </thead>
            <tbody>
              {data.integrations.map(i => (
                <tr key={i.slug} className="border-t border-ink-700/40">
                  <td className="px-4 py-2">{i.name}</td>
                  <td className="px-4 py-2 font-mono text-ink-300">{i.slug}</td>
                  <td className="px-4 py-2">{i.live ? <span className="chip">live</span> : <span className="chip-muted">stub</span>}</td>
                  <td className="px-4 py-2">{i.enabled ? <span className="text-pulse-400">yes</span> : <span className="text-ink-400">no</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
