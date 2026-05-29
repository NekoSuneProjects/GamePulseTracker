'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { gameAccent } from '@gpt/shared';

interface Props {
  slug: string;
  name: string;
  enabled: boolean;
  live: boolean;
}

/**
 * Branded game tile. Renders a per-game gradient background with the title
 * + a status chip. No image assets required — the accent map lives in
 * `shared/games.ts` so adding a game means picking a Tailwind colour pair,
 * not sourcing cover art.
 */
export function GameTile({ slug, name, enabled, live }: Props) {
  const accent = gameAccent(slug);
  return (
    <motion.div whileHover={{ y: -3, scale: 1.02 }} transition={{ type: 'spring', stiffness: 280, damping: 22 }}>
      <Link
        href={`/games/${slug}`}
        className="block relative overflow-hidden rounded-2xl border border-ink-700/60 aspect-[16/9] group"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
        {/* Subtle dark overlay so the title is always readable. */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/30 to-transparent" />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-grid-pulse" />
        <div className="relative h-full p-4 flex flex-col justify-between">
          <div className="self-end">
            {enabled
              ? <span className="chip"><span className="live-dot" />live</span>
              : <span className="chip-muted">{live ? 'key needed' : 'stub'}</span>}
          </div>
          <div>
            <div className="font-display text-xl font-semibold drop-shadow-lg">{name}</div>
            <div className="text-xs font-mono text-ink-200/80 mt-0.5">{slug}</div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
