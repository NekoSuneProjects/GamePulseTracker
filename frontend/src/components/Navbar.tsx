'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { GAME_CATALOG } from '@gpt/shared';
import { useAuth } from '@/lib/auth';

const TOP_LINKS = [
  { href: '/',             label: 'Home' },
  { href: '/games',        label: 'Games' },
  { href: '/leaderboards', label: 'Leaderboards' },
];

/**
 * "TRACKER" header — site-wide top bar above the per-page nav.
 *
 * Row 1: brand + main routes + user actions.
 * Row 2: horizontal scrollable list of game shortcuts. We surface every
 *        live game (real API wired) so users can jump straight to a game
 *        hub from anywhere. Hidden on small screens to avoid eating
 *        vertical space — the search bar already covers that flow.
 */
export function Navbar() {
  const path = usePathname();
  const { user, logout } = useAuth();

  const liveGames = GAME_CATALOG.filter(g => g.live);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-ink-950/80 border-b border-ink-700/50">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="live-dot" aria-hidden />
          <span className="font-display text-lg font-semibold tracking-tight">
            Game<span className="neon-text">Pulse</span>Tracker
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {TOP_LINKS.map(l => (
            <Link key={l.href} href={l.href}
              className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition',
                path === l.href ? 'text-pulse-300 bg-pulse-500/10' : 'text-ink-200 hover:text-pulse-300 hover:bg-ink-800/60')}>
              {l.label}
            </Link>
          ))}
          {user && (
            <Link href="/favorites"
              className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition',
                path === '/favorites' ? 'text-yellow-300 bg-yellow-500/10' : 'text-ink-200 hover:text-yellow-300 hover:bg-ink-800/60')}>
              ★ Favorites
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href={`/profile/${user.username}`} className="btn-ghost text-sm">@{user.username}</Link>
              <Link href="/settings"                   className="btn-ghost text-sm hidden sm:inline-flex">Settings</Link>
              {user.role === 'ADMIN' && <Link href="/admin" className="btn-ghost text-sm hidden sm:inline-flex">Admin</Link>}
              <button onClick={logout} className="btn-ghost text-sm">Log out</button>
            </>
          ) : (
            <>
              <Link href="/login"    className="btn-ghost text-sm">Log in</Link>
              <Link href="/register" className="btn-primary text-sm">Sign up</Link>
            </>
          )}
        </div>
      </div>

      {/* Row 2 — horizontal game shortcuts. Scrolls horizontally on overflow. */}
      <div className="hidden md:block border-t border-ink-800/60">
        <div className="mx-auto max-w-7xl px-4 h-10 flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-none">
          <span className="text-[10px] uppercase tracking-widest text-ink-500 mr-2 shrink-0">Tracker</span>
          {liveGames.map(g => {
            const active = path.startsWith(`/games/${g.slug}`);
            return (
              <Link key={g.slug} href={`/games/${g.slug}`}
                className={clsx('px-2.5 py-1 rounded text-xs transition shrink-0',
                  active ? 'text-pulse-300 bg-pulse-500/10' : 'text-ink-300 hover:text-pulse-300 hover:bg-ink-800/60')}>
                {g.name}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
