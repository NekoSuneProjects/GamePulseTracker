'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface RecentRow {
  id: string; game: string; platform: string; providerId: string;
  displayName: string; avatarUrl?: string; lastFetchedAt: string | null;
}

interface FavoriteRow {
  id: string;
  profile: {
    id: string; game: string; platform: string; providerId: string;
    displayName: string; avatarUrl: string | null; lastFetchedAt: string | null;
  };
}

/**
 * Hub side panel — Recent Players (public) on top, Favorites (auth-only)
 * below. Each row is a thin profile link. Sits next to the My Games grid
 * on the home page; collapses below on mobile.
 */
export function HubSidePanel() {
  const { user } = useAuth();
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);

  useEffect(() => {
    api<RecentRow[]>('/stats/recent?limit=8').then(d => setRecent(Array.isArray(d) ? d : [])).catch(() => setRecent([]));
  }, []);

  useEffect(() => {
    if (!user) { setFavorites([]); return; }
    api<FavoriteRow[]>('/favorites', { auth: true }).then(d => setFavorites(Array.isArray(d) ? d : [])).catch(() => setFavorites([]));
  }, [user]);

  return (
    <aside className="space-y-6">
      {user && (
        <section>
          <header className="flex items-center justify-between mb-2">
            <h3 className="text-xs uppercase tracking-widest text-yellow-300/80">★ Favorites</h3>
            {favorites.length > 0 && <Link href="/favorites" className="text-xs text-pulse-400 hover:underline">All →</Link>}
          </header>
          {favorites.length === 0 ? (
            <div className="glass p-3 text-xs text-ink-400">
              Star a profile to pin it here.
            </div>
          ) : (
            <div className="space-y-1.5">
              {favorites.slice(0, 8).map(f => <ProfileRow key={f.id}
                game={f.profile.game}
                platform={f.profile.platform}
                providerId={f.profile.providerId}
                displayName={f.profile.displayName}
              />)}
            </div>
          )}
        </section>
      )}

      <section>
        <header className="flex items-center justify-between mb-2">
          <h3 className="text-xs uppercase tracking-widest text-pulse-300/80">Recent players</h3>
        </header>
        {recent.length === 0 ? (
          <div className="glass p-3 text-xs text-ink-400">
            No recent activity. Search a player to start.
          </div>
        ) : (
          <div className="space-y-1.5">
            {recent.map(r => <ProfileRow key={r.id}
              game={r.game}
              platform={r.platform}
              providerId={r.providerId}
              displayName={r.displayName}
            />)}
          </div>
        )}
      </section>
    </aside>
  );
}

function ProfileRow(props: { game: string; platform: string; providerId: string; displayName: string }) {
  const platformQs = props.platform && props.platform !== '_' ? `?platform=${encodeURIComponent(props.platform)}` : '';
  return (
    <Link
      href={`/games/${props.game}/${encodeURIComponent(props.providerId)}${platformQs}`}
      className="block glass px-3 py-2 hover:border-pulse-500/40 transition"
    >
      <div className="text-sm font-medium truncate">{props.displayName}</div>
      <div className="text-[10px] uppercase text-ink-400 tracking-wider mt-0.5">
        {props.game}{props.platform && props.platform !== '_' ? ` · ${props.platform}` : ''}
      </div>
    </Link>
  );
}
