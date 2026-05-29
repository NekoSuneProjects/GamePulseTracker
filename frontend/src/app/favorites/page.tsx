'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';

interface FavoriteRow {
  id: string;
  createdAt: string;
  profile: {
    id: string;
    game: string;
    platform: string;
    providerId: string;
    displayName: string;
    avatarUrl: string | null;
    lastFetchedAt: string | null;
  };
}

export default function FavoritesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<FavoriteRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    api<FavoriteRow[] | null>('/favorites', { auth: true })
      .then(d => setRows(Array.isArray(d) ? d : []))
      .catch(e => setErr(e instanceof ApiError ? e.message : 'Failed to load favorites'));
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display font-semibold">Favorites</h1>
      {err && <div className="glass p-4 text-red-400 text-sm">{err}</div>}
      {rows.length === 0 ? (
        <div className="glass p-6 text-ink-300 text-sm">
          No favorites yet. Star a profile from any player page to bookmark it.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {rows.map(r => {
            const platformQs = r.profile.platform && r.profile.platform !== '_'
              ? `?platform=${encodeURIComponent(r.profile.platform)}` : '';
            return (
              <Link
                key={r.id}
                href={`/games/${r.profile.game}/${encodeURIComponent(r.profile.providerId)}${platformQs}`}
                className="glass p-4 hover:border-pulse-500/50"
              >
                <div className="font-semibold truncate">{r.profile.displayName}</div>
                <div className="text-xs text-ink-400 font-mono truncate">{r.profile.game} · {r.profile.providerId}</div>
                {r.profile.platform && r.profile.platform !== '_' && (
                  <div className="text-xs text-pulse-300 mt-1">{r.profile.platform}</div>
                )}
                {r.profile.lastFetchedAt && (
                  <div className="text-xs text-ink-500 mt-2">
                    updated {new Date(r.profile.lastFetchedAt).toLocaleString()}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
