'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';

type Status = 'PENDING' | 'APPROVED' | 'REJECTED';

interface DeletionRequestRow {
  id: string;
  status: Status;
  reason: string | null;
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  user:    { id: string; username: string } | null;
  admin:   { id: string; username: string } | null;
  profile: { id: string; game: string; platform: string; displayName: string; providerId: string } | null;
}

const STATUS_LABEL: Record<Status, string> = {
  PENDING:  'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};
const STATUS_CHIP: Record<Status, string> = {
  PENDING:  'bg-yellow-600/30 text-yellow-200',
  APPROVED: 'bg-emerald-600/30 text-emerald-200',
  REJECTED: 'bg-red-600/30 text-red-200',
};

export default function AdminDeletionRequestsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<DeletionRequestRow[]>([]);
  const [filter, setFilter] = useState<Status | 'ALL'>('PENDING');
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const path = filter === 'ALL' ? '/admin/deletion-requests' : `/admin/deletion-requests?status=${filter}`;
    try {
      const data = await api<DeletionRequestRow[] | null>(path, { auth: true });
      setRows(Array.isArray(data) ? data : []);
      setErr(null);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed to load requests');
    }
  }, [filter]);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'ADMIN') { router.push('/'); return; }
    void refresh();
  }, [loading, user, router, refresh]);

  async function act(id: string, action: 'approve' | 'reject') {
    const note = window.prompt(action === 'approve'
      ? 'Approval note (optional, shown to user)'
      : 'Rejection reason (shown to user)') ?? undefined;
    if (action === 'reject' && !note?.trim()) {
      const confirmEmpty = window.confirm('Reject without a reason? The user will see a generic message.');
      if (!confirmEmpty) return;
    }
    setBusyId(id);
    try {
      await api(`/admin/deletion-requests/${id}/${action}`, {
        method: 'POST', auth: true,
        body: JSON.stringify({ note: note?.trim() || undefined }),
      });
      await refresh();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-display font-semibold">Deletion requests</h1>
        <div className="flex gap-2">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded text-sm ${filter === s ? 'bg-pulse-500/30 text-pulse-100' : 'bg-ink-800/60 text-ink-300 hover:bg-ink-700/60'}`}
            >
              {s === 'ALL' ? 'All' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </header>

      {err && <div className="glass p-4 text-red-400 text-sm">{err}</div>}

      {rows.length === 0 ? (
        <div className="glass p-6 text-center text-ink-300 text-sm">No requests in this view.</div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="glass p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm">
                    <span className="text-ink-400">User:</span>{' '}
                    <span className="font-mono text-ink-100">{r.user?.username ?? '(deleted)'}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-ink-400">Profile:</span>{' '}
                    <span className="font-mono text-ink-100">
                      {r.profile ? `${r.profile.game}/${r.profile.platform}/${r.profile.displayName}` : '(deleted)'}
                    </span>
                  </div>
                  <div className="text-xs text-ink-500 mt-1">
                    Requested {new Date(r.createdAt).toLocaleString()}
                    {r.resolvedAt && r.admin && (
                      <> · resolved by {r.admin.username} {new Date(r.resolvedAt).toLocaleString()}</>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${STATUS_CHIP[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </span>
              </div>

              {r.reason && (
                <div className="text-sm border-l-2 border-ink-700 pl-3 text-ink-200">
                  <div className="text-xs uppercase text-ink-400 mb-1">User reason</div>
                  {r.reason}
                </div>
              )}
              {r.adminNote && (
                <div className="text-sm border-l-2 border-pulse-500/40 pl-3 text-ink-200">
                  <div className="text-xs uppercase text-ink-400 mb-1">Admin note</div>
                  {r.adminNote}
                </div>
              )}

              {r.status === 'PENDING' && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => act(r.id, 'approve')}
                    disabled={busyId === r.id}
                    className="px-3 py-1.5 rounded bg-emerald-600/80 hover:bg-emerald-600 text-sm disabled:opacity-50"
                  >
                    Approve + delete
                  </button>
                  <button
                    type="button"
                    onClick={() => act(r.id, 'reject')}
                    disabled={busyId === r.id}
                    className="px-3 py-1.5 rounded bg-red-600/80 hover:bg-red-600 text-sm disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
