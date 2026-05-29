'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';

export default function ChangeUsernamePage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  const [newUsername, setNewUsername] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    setNewUsername(user.username);
  }, [loading, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      await api('/users/me/username', {
        method: 'PATCH', auth: true,
        body: JSON.stringify({ newUsername: newUsername.trim(), password: pw }),
      });
      setPw('');
      await refresh();
      setMsg('Username updated.');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Update failed');
    }
  }

  if (loading || !user) return null;

  return (
    <form onSubmit={submit} className="glass p-6 space-y-4 max-w-2xl">
      <h1 className="font-display font-semibold text-xl">Change username</h1>
      <p className="text-xs text-ink-400">
        Current: <span className="font-mono">@{user.username}</span>.
        Changing your username updates all profile URLs immediately.
      </p>
      <label className="block">
        <span className="text-sm text-ink-300">New username</span>
        <input className="input mt-1" value={newUsername} onChange={e => setNewUsername(e.target.value)}
          placeholder="newname" minLength={3} maxLength={32} required />
      </label>
      <label className="block">
        <span className="text-sm text-ink-300">Current password</span>
        <input className="input mt-1" type="password" value={pw} onChange={e => setPw(e.target.value)}
          placeholder="••••••••" required autoComplete="current-password" />
      </label>
      {msg && <div className="text-pulse-400 text-sm">{msg}</div>}
      {err && <div className="text-red-400 text-sm">{err}</div>}
      <button className="btn-primary">Change username</button>
    </form>
  );
}
