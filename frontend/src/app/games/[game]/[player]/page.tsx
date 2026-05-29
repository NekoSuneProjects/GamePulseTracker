'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useLiveProfile } from '@/lib/socket';
import { PlayerCard } from '@/components/PlayerCard';
import { StatCard, CountUp } from '@/components/StatCard';
import { LiveChart } from '@/components/LiveChart';
import { MatchHistory } from '@/components/MatchHistory';
import type { NormalizedProfile, NormalizedMatch } from '@gpt/shared';

interface ProfilePayload {
  profile: { id: string; game: string; platform: string; providerId: string; latestSnapshot: NormalizedProfile | null; lastFetchedAt: string };
  snapshot: NormalizedProfile;
  fresh: boolean;
}

const fetcher = <T,>(p: string) => api<T>(p);

export default function PlayerProfilePage({ params }: { params: { game: string; player: string } }) {
  const search = useSearchParams();
  const platform = search.get('platform') ?? undefined;
  const decoded = decodeURIComponent(params.player);
  const qs = platform ? `?platform=${encodeURIComponent(platform)}` : '';

  const { data, error, isLoading, mutate } = useSWR<ProfilePayload>(
    `/games/${params.game}/player/${encodeURIComponent(decoded)}${qs}`, fetcher, { refreshInterval: 60_000 },
  );

  const [history, setHistory] = useState<Array<{ createdAt: string; level: number | null; kd: number | null }>>([]);
  const [matches, setMatches] = useState<NormalizedMatch[]>([]);

  useEffect(() => {
    if (!data?.profile?.providerId) return;
    // Use the canonical platform the backend persisted (may differ from the
    // URL's platform — e.g. URL has no ?platform=, backend stored 'minecraft').
    const platformQs = data.profile.platform && data.profile.platform !== '_'
      ? `?platform=${encodeURIComponent(data.profile.platform)}`
      : '';
    const base = `/games/${params.game}/player/${encodeURIComponent(data.profile.providerId)}${platformQs}`;
    api<Array<{ createdAt: string; level: number | null; kd: number | null }> | null>(`${base}/history`)
      .then(d => setHistory(d ?? [])).catch(() => setHistory([]));
    api<NormalizedMatch[] | null>(`${base}/matches`)
      .then(d => setMatches(d ?? [])).catch(() => setMatches([]));
  }, [data?.profile?.providerId, data?.profile?.platform, params.game]);

  useLiveProfile(
    params.game,
    data?.profile?.platform,
    data?.profile?.providerId,
    (event) => { if (['stats:updated', 'level:up', 'rank:changed'].includes(event)) mutate(); },
  );

  const snap = data?.snapshot ?? data?.profile?.latestSnapshot ?? null;

  // Belt-and-suspenders: if history somehow lands as something other than an
  // array (race condition, stale cache, bad upstream payload), don't crash —
  // just show no chart for that metric.
  const levelSeries = useMemo(() => {
    if (!Array.isArray(history)) return [];
    return history.filter(h => h.level !== null).map(h => ({ createdAt: h.createdAt, value: Number(h.level) }));
  }, [history]);
  const kdSeries = useMemo(() => {
    if (!Array.isArray(history)) return [];
    return history.filter(h => h.kd !== null).map(h => ({ createdAt: h.createdAt, value: Number(h.kd) }));
  }, [history]);

  if (isLoading) return <div className="glass p-8 text-center text-ink-300 animate-pulse">Loading profile…</div>;
  if (error)     return <div className="glass p-8 text-center text-red-400">Failed: {String((error as Error).message)}</div>;
  if (!snap)     return <div className="glass p-8 text-center text-ink-300">No data available.</div>;

  const headline = snap.headline ?? {};

  return (
    <div className="space-y-8">
      <PlayerCard profile={snap} live />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {typeof headline.level === 'number'   && <StatCard accent label="Level"   value={<CountUp value={headline.level} />} />}
        {typeof headline.kd === 'number'      && <StatCard       label="K/D"     value={<CountUp value={headline.kd} decimals={2} />} />}
        {typeof headline.wins === 'number'    && <StatCard       label="Wins"    value={<CountUp value={headline.wins} />} />}
        {typeof headline.matches === 'number' && <StatCard       label="Matches" value={<CountUp value={headline.matches} />} />}
        {typeof headline.rank === 'string'    && <StatCard       label="Rank"    value={headline.rank} />}
        {typeof headline.xp === 'number'      && <StatCard       label="XP"      value={<CountUp value={headline.xp} />} />}
      </section>

      {(levelSeries.length > 0 || kdSeries.length > 0) && (
        <section className="grid md:grid-cols-2 gap-4">
          {levelSeries.length > 0 && <LiveChart data={levelSeries} label="Level progression" />}
          {kdSeries.length > 0    && <LiveChart data={kdSeries}    label="K/D over time" />}
        </section>
      )}

      <section>
        <h3 className="text-lg font-display font-semibold mb-3">Detailed stats</h3>
        <div className="glass p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 text-sm">
          {Object.entries(snap.details ?? {}).map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-ink-700/40 py-1.5">
              <span className="text-ink-400 truncate mr-3">{k}</span>
              <span className="text-ink-100 font-mono truncate">{v === null ? '—' : String(v)}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-display font-semibold mb-3">Match history</h3>
        <MatchHistory matches={
          Array.isArray(matches) && matches.length > 0
            ? (matches as NormalizedMatch[])
            : (Array.isArray(snap.recent) ? snap.recent : [])
        } />
      </section>
    </div>
  );
}
