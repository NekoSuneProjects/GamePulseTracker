import Link from 'next/link';
import { gameAccent, GAME_CATALOG } from '@gpt/shared';

/**
 * Battlefield series landing page — picks one of the BF titles before
 * drilling into a player. The catalog has each variant as a distinct
 * `battlefield-*` slug; this page just renders them as branded cards.
 *
 * Tracker.gg has equivalent landing pages for game series; we mirror the
 * shape without bringing in real art (matches the rest of the redesign).
 */
const BF_SLUGS = [
  'battlefield-6',  // not in catalog yet — surfaces as "coming soon"
  'battlefield-2042',
  'battlefield-5',
  'battlefield-1',
  'battlefield-hardline',
  'battlefield-4',
  'battlefield-3',
] as const;

export default function BattlefieldHubPage() {
  const present = BF_SLUGS.map(slug => {
    const entry = GAME_CATALOG.find(g => g.slug === slug);
    return { slug, name: entry?.name ?? slug.replace(/-/g, ' '), live: entry?.live ?? false, present: Boolean(entry) };
  });
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-ink-400">Game series</div>
        <h1 className="text-4xl font-display font-bold">Battlefield</h1>
        <p className="text-ink-300 max-w-2xl">
          Pick a title to drill into players, leaderboards, and match history.
          Integrations land per-title — check the chip for status.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {present.map(v => {
          const accent = gameAccent(v.slug);
          const card = (
            <div className="relative overflow-hidden rounded-2xl border border-ink-700/60 aspect-[16/9] group">
              <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/30 to-transparent" />
              <div className="relative h-full p-4 flex flex-col justify-between">
                <div className="self-end">
                  {!v.present
                    ? <span className="chip-muted">not yet</span>
                    : v.live
                      ? <span className="chip"><span className="live-dot" />live</span>
                      : <span className="chip-muted">stub</span>}
                </div>
                <div className="font-display text-xl font-semibold drop-shadow-lg capitalize">{v.name}</div>
              </div>
            </div>
          );
          return v.present
            ? <Link key={v.slug} href={`/games/${v.slug}`} className="block hover:opacity-90 transition">{card}</Link>
            : <div key={v.slug} className="opacity-60 cursor-not-allowed" title="Integration not added yet">{card}</div>;
        })}
      </div>
    </div>
  );
}
