'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { GAME_CATALOG, getGame, PLATFORM_LABELS, type GameSlug } from '@gpt/shared';

export function SearchBar({ defaultGame }: { defaultGame?: GameSlug }) {
  const router = useRouter();
  const [game, setGame] = useState<GameSlug>(defaultGame ?? 'hypixel');
  const [q, setQ] = useState('');

  const platforms = useMemo(() => getGame(game)?.platforms ?? [], [game]);
  const [platform, setPlatform] = useState<string>(platforms[0] ?? '');

  function go(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    const params = platform && platforms.length > 1 ? `?platform=${encodeURIComponent(platform)}` : '';
    router.push(`/games/${game}/${encodeURIComponent(q.trim())}${params}`);
  }

  return (
    <form onSubmit={go} className="glass-strong p-2 flex flex-col sm:flex-row gap-2">
      <select value={game} onChange={(e) => {
        const next = e.target.value as GameSlug;
        setGame(next);
        const ps = getGame(next)?.platforms ?? [];
        setPlatform(ps[0] ?? '');
      }} className="input sm:max-w-[200px]">
        {GAME_CATALOG.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}
      </select>

      {platforms.length > 1 && (
        <select value={platform} onChange={e => setPlatform(e.target.value)} className="input sm:max-w-[160px]">
          {platforms.map(p => <option key={p} value={p}>{PLATFORM_LABELS[p] ?? p}</option>)}
        </select>
      )}

      <input value={q} onChange={e => setQ(e.target.value)}
        placeholder="Player name, UUID, Steam ID..."
        className="input flex-1" />
      <button type="submit" className="btn-primary">Track</button>
    </form>
  );
}
