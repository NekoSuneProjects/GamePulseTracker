'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Props {
  profileId: string;
}

/**
 * Star toggle for a TrackedProfile. Anonymous users see nothing (the API
 * requires auth). Maintains optimistic state — flips immediately, reverts
 * on error.
 */
export function FavoriteButton({ profileId }: Props) {
  const { user } = useAuth();
  const [favorited, setFavorited] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) { setFavorited(null); return; }
    api<{ favorited: boolean }>(`/favorites/${profileId}/is-favorited`, { auth: true })
      .then(r => setFavorited(r.favorited))
      .catch(() => setFavorited(false));
  }, [user, profileId]);

  if (!user || favorited === null) return null;

  async function toggle() {
    if (busy) return;
    const next = !favorited;
    setFavorited(next); setBusy(true);
    try {
      if (next) {
        await api('/favorites', { method: 'POST', auth: true, body: JSON.stringify({ profileId }) });
      } else {
        await api(`/favorites/${profileId}`, { method: 'DELETE', auth: true });
      }
    } catch (e) {
      // Revert on failure.
      setFavorited(!next);
      // eslint-disable-next-line no-console
      console.warn('[favorites]', e instanceof ApiError ? e.message : e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      className={`text-2xl leading-none transition-transform ${busy ? 'opacity-50' : 'hover:scale-110'}`}
      title={favorited ? 'Favorited — click to remove' : 'Add to favorites'}
    >
      {favorited ? <span className="text-yellow-300">★</span> : <span className="text-ink-500">☆</span>}
    </button>
  );
}
