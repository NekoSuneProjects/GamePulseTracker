'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, ApiError, clearTokens } from '@/lib/api';

export default function DeleteAccountPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const [pw, setPw] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Date | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.push('/login');
  }, [loading, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (confirmText !== user?.username) {
      setErr('Type your username exactly to confirm.');
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ deletionAt: string }>('/users/me', {
        method: 'DELETE', auth: true,
        body: JSON.stringify({ password: pw }),
      });
      setSubmitted(new Date(res.deletionAt));
      clearTokens();
      // Stay on the page to show the confirmation; don't redirect.
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Request failed');
    } finally { setBusy(false); }
  }

  async function cancel() {
    try {
      await api('/users/me/delete-cancel', { method: 'POST', auth: true });
      await refresh();
      router.push('/settings');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Cancel failed');
    }
  }

  if (loading || !user) return null;

  if (submitted) {
    return (
      <div className="glass p-6 space-y-3 max-w-2xl">
        <h1 className="font-display font-semibold text-xl">Account deletion queued</h1>
        <p className="text-sm text-ink-300">
          Your account will be permanently deleted on{' '}
          <span className="font-mono">{submitted.toLocaleString()}</span>.
        </p>
        <p className="text-sm text-ink-300">
          To cancel, just sign back in any time before that date — it'll
          undo the request automatically.
        </p>
        <button type="button" onClick={() => router.push('/login')} className="btn-primary">
          Go to login
        </button>
      </div>
    );
  }

  const pending = Boolean(user.deletionAt);

  if (pending) {
    return (
      <div className="glass p-6 space-y-3 max-w-2xl border-yellow-500/50">
        <h1 className="font-display font-semibold text-xl text-yellow-300">Deletion already queued</h1>
        <p className="text-sm text-ink-300">
          Your account is scheduled for deletion on{' '}
          <span className="font-mono">{user.deletionAt && new Date(user.deletionAt).toLocaleString()}</span>.
        </p>
        <button type="button" onClick={cancel} className="btn-primary">
          Cancel deletion
        </button>
        {err && <div className="text-red-400 text-sm">{err}</div>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="glass p-6 space-y-4 max-w-2xl border-red-500/40">
      <h1 className="font-display font-semibold text-xl text-red-300">Delete account</h1>
      <div className="text-sm text-ink-300 space-y-2">
        <p>
          We'll queue your account for hard-deletion 30 days from now. During
          that window your account is invisible to others and login is blocked;
          sign back in any time to cancel.
        </p>
        <p>
          Public game data on profiles you tracked stays (the snapshots aren't
          yours), but your user account, sessions, linked accounts, favorites,
          follows, and notifications are erased.
        </p>
      </div>
      <label className="block">
        <span className="text-sm text-ink-300">Current password</span>
        <input className="input mt-1" type="password" value={pw} onChange={e => setPw(e.target.value)}
          required autoComplete="current-password" placeholder="••••••••" />
      </label>
      <label className="block">
        <span className="text-sm text-ink-300">Type your username to confirm</span>
        <input className="input mt-1" value={confirmText} onChange={e => setConfirmText(e.target.value)}
          placeholder={user.username} />
      </label>
      {err && <div className="text-red-400 text-sm">{err}</div>}
      <button className="btn-danger" disabled={busy}>
        {busy ? 'Submitting…' : 'Queue deletion'}
      </button>
    </form>
  );
}
