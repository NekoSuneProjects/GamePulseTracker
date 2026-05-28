'use client';

import type { NormalizedProfile } from '@gpt/shared';
import { motion } from 'framer-motion';
import Image from 'next/image';

export function PlayerCard({ profile, live }: { profile: NormalizedProfile; live?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-strong p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start">
      <div className="relative">
        {profile.avatarUrl ? (
          <Image src={profile.avatarUrl} alt={profile.displayName} width={96} height={96} className="rounded-xl border border-pulse-500/40" />
        ) : (
          <div className="h-24 w-24 rounded-xl bg-ink-700 grid place-items-center text-3xl font-display">
            {profile.displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <span className="absolute -bottom-1 -right-1 chip">
          {profile.game}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-display font-semibold truncate">{profile.displayName}</h1>
          {profile.platform && <span className="chip-muted">{profile.platform}</span>}
          {live && <span className="chip"><span className="live-dot" />live</span>}
        </div>
        <div className="mt-1 text-sm text-ink-400 font-mono break-all">{profile.providerId}</div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-ink-300">
          <span className="chip-muted">last fetched: {profile.fetchedAt ? new Date(profile.fetchedAt).toLocaleString() : '—'}</span>
          {profile.providerUpdatedAt && <span className="chip-muted">provider: {new Date(profile.providerUpdatedAt).toLocaleString()}</span>}
        </div>
      </div>
    </motion.div>
  );
}
