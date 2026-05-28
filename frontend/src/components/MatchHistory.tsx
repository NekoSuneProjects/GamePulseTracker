'use client';

import type { NormalizedMatch } from '@gpt/shared';
import clsx from 'clsx';

export function MatchHistory({ matches }: { matches: NormalizedMatch[] }) {
  if (!matches?.length) {
    return <div className="glass p-6 text-center text-ink-400">No recent matches yet.</div>;
  }

  return (
    <div className="glass overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-ink-800/60 text-ink-300 uppercase text-xs">
          <tr>
            <th className="text-left  px-4 py-2">When</th>
            <th className="text-left  px-4 py-2">Mode</th>
            <th className="text-left  px-4 py-2">Result</th>
            <th className="text-right px-4 py-2">K/D/A</th>
            <th className="text-right px-4 py-2">Score</th>
          </tr>
        </thead>
        <tbody>
          {matches.map(m => (
            <tr key={m.matchId} className="border-t border-ink-700/40 hover:bg-ink-800/40">
              <td className="px-4 py-2 text-ink-300">{m.playedAt ? new Date(m.playedAt).toLocaleString() : '—'}</td>
              <td className="px-4 py-2">{m.mode ?? '—'}</td>
              <td className={clsx('px-4 py-2 font-medium',
                m.result === 'win' ? 'text-pulse-400' : m.result === 'loss' ? 'text-red-400' : 'text-ink-300')}>
                {m.result ?? '—'}
              </td>
              <td className="px-4 py-2 text-right font-mono">{m.kills ?? '-'}/{m.deaths ?? '-'}/{m.assists ?? '-'}</td>
              <td className="px-4 py-2 text-right font-mono">{m.score ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
