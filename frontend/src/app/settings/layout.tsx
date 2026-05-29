'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { ReactNode } from 'react';

/**
 * Settings shell — sidebar nav + content area. Replaces the previous
 * single big form layout with discrete sub-routes
 * (Tracker Network "Account Management" shape).
 *
 * Premium routes intentionally omitted — OSS project, no paywalls.
 */
const NAV = [
  { href: '/settings',                label: 'Profile' },
  { href: '/settings/linked',         label: 'Linked accounts' },
  { href: '/connections',             label: 'Connections (legacy)' },
  { href: '/settings/username',       label: 'Change username' },
  { href: '/settings/password',       label: 'Change password' },
  { href: '/settings/security',       label: 'Two-factor auth' },
  { href: '/settings/api-keys',       label: 'API keys' },
  { href: '/devices',                 label: 'Devices' },
  { href: '/settings/delete-account', label: 'Delete account' },
] as const;

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="grid lg:grid-cols-[220px,1fr] gap-6">
      <aside className="glass p-3 space-y-0.5 h-fit lg:sticky lg:top-28">
        <h2 className="text-xs uppercase tracking-widest text-ink-400 px-2 py-1.5">Account</h2>
        {NAV.map(n => (
          <Link
            key={n.href}
            href={n.href}
            className={clsx(
              'block px-3 py-1.5 rounded text-sm transition',
              path === n.href
                ? 'bg-pulse-500/10 text-pulse-300'
                : 'text-ink-200 hover:bg-ink-800/60 hover:text-pulse-300',
            )}
          >
            {n.label}
          </Link>
        ))}
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
