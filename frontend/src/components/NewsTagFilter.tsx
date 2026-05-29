'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

interface TagRow { tag: string; count: number }

/**
 * Per-game news tag dropdown. Pushes the chosen tag into the URL as
 * ?tag=<value>; the per-game server component re-runs with the filter.
 */
export function NewsTagFilter({ game }: { game: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const current = search.get('tag') ?? '';
  const [tags, setTags] = useState<TagRow[]>([]);

  useEffect(() => {
    api<TagRow[]>(`/news/${encodeURIComponent(game)}/tags`)
      .then(d => setTags(Array.isArray(d) ? d : []))
      .catch(() => setTags([]));
  }, [game]);

  if (tags.length === 0) return null;

  function set(tag: string) {
    const params = new URLSearchParams(search.toString());
    if (tag) params.set('tag', tag); else params.delete('tag');
    const qs = params.toString();
    router.push(`/games/${game}${qs ? `?${qs}` : ''}`);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs uppercase tracking-widest text-ink-500">Filter:</span>
      <button
        type="button"
        onClick={() => set('')}
        className={`px-2 py-0.5 rounded text-xs ${!current ? 'bg-pulse-500/20 text-pulse-200' : 'bg-ink-800/60 text-ink-300 hover:bg-ink-700/60'}`}
      >
        all
      </button>
      {tags.slice(0, 8).map(t => (
        <button
          key={t.tag}
          type="button"
          onClick={() => set(t.tag)}
          className={`px-2 py-0.5 rounded text-xs ${current === t.tag ? 'bg-pulse-500/20 text-pulse-200' : 'bg-ink-800/60 text-ink-300 hover:bg-ink-700/60'}`}
        >
          {t.tag} <span className="text-ink-500">({t.count})</span>
        </button>
      ))}
    </div>
  );
}
