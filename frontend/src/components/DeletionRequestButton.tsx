'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Props {
  profileId: string;
  game: string;
  displayName: string;
}

/**
 * Renders a small "Request stats deletion" link that opens an inline
 * confirmation form. The backend enforces ownership, so we show the button
 * to any logged-in user — they'll get a 403 if they're not the owner, which
 * we surface as the inline error.
 */
export function DeletionRequestButton({ profileId, game, displayName }: Props) {
  const { user } = useAuth();
  const [open, setOpen]       = useState(false);
  const [reason, setReason]   = useState('');
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState<string | null>(null);
  const [done, setDone]       = useState<'submitted' | 'duplicate' | null>(null);

  if (!user) return null;

  async function submit() {
    setBusy(true); setErr(null);
    try {
      await api('/deletion-requests', {
        method: 'POST', auth: true,
        body: JSON.stringify({ profileId, reason: reason.trim() || undefined }),
      });
      setDone('submitted');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'REQUEST_ALREADY_PENDING') {
        setDone('duplicate');
      } else {
        setErr(e instanceof ApiError ? e.message : 'Failed to submit request');
      }
    } finally { setBusy(false); }
  }

  if (done === 'submitted') {
    return (
      <div className="glass p-3 text-sm text-emerald-300">
        Deletion request submitted. An admin will review it shortly.
      </div>
    );
  }
  if (done === 'duplicate') {
    return (
      <div className="glass p-3 text-sm text-ink-300">
        You already have a pending deletion request for this profile.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-ink-400 hover:text-red-400 underline underline-offset-2"
      >
        Request stats deletion
      </button>
    );
  }

  return (
    <div className="glass p-4 space-y-3">
      <div className="text-sm">
        Request erasure of stats for <span className="font-mono text-ink-100">{game}/{displayName}</span>.
        An admin must approve before any data is removed.
      </div>
      <textarea
        rows={3}
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="Reason (optional, max 1000 chars)"
        maxLength={1000}
        className="w-full bg-ink-900/60 border border-ink-700 rounded px-3 py-2 text-sm"
      />
      {err && <div className="text-sm text-red-400">{err}</div>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="px-3 py-1.5 rounded bg-red-600/80 hover:bg-red-600 text-sm disabled:opacity-50"
        >
          {busy ? 'Submitting…' : 'Submit request'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setReason(''); setErr(null); }}
          disabled={busy}
          className="px-3 py-1.5 rounded bg-ink-700/60 hover:bg-ink-700 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
