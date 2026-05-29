'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Props {
  username: string;
}

/**
 * Follow / Unfollow toggle. Hidden for anonymous viewers and self.
 * Optimistic update with revert on error.
 */
export function FollowButton({ username }: Props) {
  const { user } = useAuth();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || user.username === username) { setFollowing(null); return; }
    api<{ following: boolean }>(`/social/is-following/${encodeURIComponent(username)}`, { auth: true })
      .then(r => setFollowing(r.following))
      .catch(() => setFollowing(false));
  }, [user, username]);

  if (!user || user.username === username || following === null) return null;

  async function toggle() {
    if (busy) return;
    const next = !following;
    setFollowing(next); setBusy(true);
    try {
      if (next) {
        await api('/social/follow', { method: 'POST', auth: true, body: JSON.stringify({ username }) });
      } else {
        await api(`/social/follow/${encodeURIComponent(username)}`, { method: 'DELETE', auth: true });
      }
    } catch (e) {
      setFollowing(!next);
      // eslint-disable-next-line no-console
      console.warn('[follow]', e instanceof ApiError ? e.message : e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={following ? 'btn-ghost text-sm' : 'btn-primary text-sm'}
    >
      {following ? 'Following ✓' : '+ Follow'}
    </button>
  );
}
