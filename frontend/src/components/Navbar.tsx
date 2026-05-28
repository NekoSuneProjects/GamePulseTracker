'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useAuth } from '@/lib/auth';

const links = [
  { href: '/',             label: 'Home' },
  { href: '/games',        label: 'Games' },
  { href: '/leaderboards', label: 'Leaderboards' },
];

export function Navbar() {
  const path = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-ink-950/70 border-b border-ink-700/50">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="live-dot" aria-hidden />
          <span className="font-display text-lg font-semibold tracking-tight">
            Game<span className="neon-text">Pulse</span>Tracker
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition',
                path === l.href ? 'text-pulse-300 bg-pulse-500/10' : 'text-ink-200 hover:text-pulse-300 hover:bg-ink-800/60')}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href={`/profile/${user.username}`} className="btn-ghost text-sm">@{user.username}</Link>
              <Link href="/connections"                className="btn-ghost text-sm hidden sm:inline-flex">Connections</Link>
              <Link href="/devices"                    className="btn-ghost text-sm hidden md:inline-flex">Devices</Link>
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
    </header>
  );
}
