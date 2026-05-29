'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, ApiError, clearTokens } from '@/lib/api';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.push('/login');
  }, [loading, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    if (newPw !== newPw2) { setErr('New password and confirmation do not match.'); return; }
    try {
      await api('/users/me/password', {
        method: 'PATCH', auth: true,
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      setCurrentPw(''); setNewPw(''); setNewPw2('');
      setMsg('Password changed. You’ve been logged out on other devices.');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Update failed');
    }
  }

  function logoutEverywhere() {
    clearTokens();
    router.push('/login');
  }

  if (loading || !user) return null;

  return (
    <form onSubmit={submit} className="glass p-6 space-y-4 max-w-2xl">
      <h1 className="font-display font-semibold text-xl">Change password</h1>
      <p className="text-xs text-ink-400">
        Changing your password signs out all other devices but keeps you logged
        in here. Hit the button below if you want to sign out everywhere too.
      </p>
      <label className="block">
        <span className="text-sm text-ink-300">Current password</span>
        <input className="input mt-1" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
          placeholder="••••••••" required autoComplete="current-password" />
      </label>
      <label className="block">
        <span className="text-sm text-ink-300">New password</span>
        <input className="input mt-1" type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
          minLength={8} maxLength={128} placeholder="At least 8 characters" required autoComplete="new-password" />
      </label>
      <label className="block">
        <span className="text-sm text-ink-300">Confirm new password</span>
        <input className="input mt-1" type="password" value={newPw2} onChange={e => setNewPw2(e.target.value)}
          minLength={8} maxLength={128} placeholder="Repeat new password" required autoComplete="new-password" />
      </label>
      {msg && <div className="text-pulse-400 text-sm">{msg}</div>}
      {err && <div className="text-red-400 text-sm">{err}</div>}
      <div className="flex gap-2">
        <button className="btn-primary">Change password</button>
        <button type="button" onClick={logoutEverywhere} className="btn-ghost text-sm">Sign out here too</button>
      </div>
    </form>
  );
}
