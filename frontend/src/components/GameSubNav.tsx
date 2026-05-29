'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

/**
 * Per-game subnav: Home / Leaderboards / Live.
 *
 * Premium dropped intentionally — this is an OSS project, no paywalls. App
 * replaced with Live, which (today) just deep-links to the leaderboard
 * filtered by recently-updated; once the activity feed lands it'll point
 * there instead.
 */
export function GameSubNav({ slug }: { slug: string }) {
  const path = usePathname();
  const tabs = [
    { href: `/games/${slug}`,                      label: 'Home',         match: (p: string) => p === `/games/${slug}` },
    { href: `/leaderboards?game=${slug}`,          label: 'Leaderboards', match: (p: string) => p === '/leaderboards' },
    { href: `/games/${slug}?view=live`,            label: 'Live',         match: (p: string) => p === `/games/${slug}` && false /* future */ },
  ];
  return (
    <nav className="border-b border-ink-700/60 -mt-2">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        {tabs.map(t => {
          const active = t.match(path);
          return (
            <Link
              key={t.label}
              href={t.href}
              className={clsx(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition shrink-0',
                active ? 'border-pulse-500 text-pulse-300' : 'border-transparent text-ink-300 hover:text-pulse-300',
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
