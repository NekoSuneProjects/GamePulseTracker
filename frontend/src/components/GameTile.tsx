'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

interface Props {
  slug: string;
  name: string;
  enabled: boolean;
  live: boolean;
}

export function GameTile({ slug, name, enabled, live }: Props) {
  return (
    <motion.div whileHover={{ y: -3, scale: 1.02 }} transition={{ type: 'spring', stiffness: 280, damping: 22 }}>
      <Link href={`/games/${slug}`} className="block glass p-5 hover:border-pulse-500/40 transition-all relative overflow-hidden group">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-grid-pulse" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xl font-display font-semibold">{name}</span>
            {enabled ? <span className="chip"><span className="live-dot" />live</span>
                     : <span className="chip-muted">{live ? 'key needed' : 'stub'}</span>}
          </div>
          <div className="text-xs text-ink-400 font-mono">{slug}</div>
        </div>
      </Link>
    </motion.div>
  );
}
