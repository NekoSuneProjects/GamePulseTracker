import Link from 'next/link';

interface LeaderRow {
  profileId: string;
  displayName: string;
  providerId: string;
  platform?: string;
  metricLabel?: string;
  metricValue: number;
}

interface MetricBlock {
  label: string;
  metric: 'level' | 'kd' | 'wins' | 'matches';
  rows: LeaderRow[];
}

/**
 * Top-stat cards on a game landing page — each card surfaces the leader on
 * a different metric, hydrated from the leaderboards endpoint at request
 * time. If a metric has no data (e.g. the game has no recorded matches),
 * its card is omitted rather than shown empty.
 */
export function GameTopStats({ game, blocks }: { game: string; blocks: MetricBlock[] }) {
  const populated = blocks.filter(b => b.rows.length > 0);
  if (populated.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-display font-semibold mb-3">Top players</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {populated.map(b => {
          const top = b.rows[0];
          const platformQs = top.platform && top.platform !== '_'
            ? `?platform=${encodeURIComponent(top.platform)}` : '';
          return (
            <Link
              key={b.metric}
              href={`/games/${game}/${encodeURIComponent(top.providerId)}${platformQs}`}
              className="glass p-4 hover:border-pulse-500/40 transition block"
            >
              <div className="text-[10px] uppercase tracking-widest text-ink-400">{b.label}</div>
              <div className="font-display text-2xl mt-1 truncate">{Number(top.metricValue).toLocaleString()}</div>
              <div className="text-xs text-ink-300 truncate mt-1">
                <span className="text-pulse-400">#1</span> {top.displayName}
              </div>
              {b.rows[1] && (
                <div className="text-[11px] text-ink-500 truncate mt-0.5">
                  #2 {b.rows[1].displayName}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export type { LeaderRow, MetricBlock };
