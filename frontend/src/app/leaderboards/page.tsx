'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { GAME_CATALOG, type GameSlug, type LeaderboardEntry } from '@gpt/shared';
import { api } from '@/lib/api';

type Metric = 'level' | 'kd' | 'wins' | 'matches';
const METRICS: Metric[] = ['level', 'kd', 'wins', 'matches'];

const fetcher = <T,>(p: string) => api<T>(p);

export default function LeaderboardsPage() {
  const [game, setGame] = useState<GameSlug>('hypixel');
  const [metric, setMetric] = useState<Metric>('level');

  const { data, isLoading } = useSWR<LeaderboardEntry[]>(`/leaderboards/${game}?metric=${metric}&limit=100`, fetcher, {
    refreshInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-display font-semibold">Leaderboards</h1>
        <p className="text-ink-400 mt-1">Top tracked players, ranked by metric. Updates every 30s.</p>
      </header>

      <div className="glass-strong p-2 flex flex-wrap gap-2">
        <select value={game} onChange={e => setGame(e.target.value as GameSlug)} className="input max-w-xs">
          {GAME_CATALOG.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}
        </select>
        <div className="flex gap-1 ml-auto">
          {METRICS.map(m => (
            <button key={m} onClick={() => setMetric(m)}
              className={metric === m ? 'btn-primary text-xs' : 'btn-ghost text-xs'}>
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="glass overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-800/60 text-ink-300 uppercase text-xs">
            <tr>
              <th className="text-left  px-4 py-2 w-16">#</th>
              <th className="text-left  px-4 py-2">Player</th>
              <th className="text-right px-4 py-2">{metric}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={3} className="text-center py-10 text-ink-400">Loading…</td></tr>}
            {!isLoading && (!data || data.length === 0) && (
              <tr><td colSpan={3} className="text-center py-10 text-ink-400">
                No data yet — track at least one player to populate the leaderboard.
              </td></tr>
            )}
            {data?.map(row => (
              <tr key={row.providerId} className="border-t border-ink-700/40 hover:bg-ink-800/40">
                <td className="px-4 py-2 text-ink-300 font-mono">{row.rank}</td>
                <td className="px-4 py-2">
                  <Link href={`/games/${game}/${encodeURIComponent(row.providerId)}`} className="text-pulse-300 hover:underline">
                    {row.displayName}
                  </Link>
                </td>
                <td className="px-4 py-2 text-right font-mono">{row.metricValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
