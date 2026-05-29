import Link from 'next/link';
import { gameAccent } from '@gpt/shared';
import { SearchBar } from '@/components/SearchBar';
import type { GameSlug } from '@gpt/shared';

interface Props {
  slug: GameSlug;
  name: string;
}

/**
 * Game-hero banner used on /games/[game]. Full-bleed accent gradient with
 * the title overlaid + an embedded SearchBar (so the page lands with the
 * primary action front-and-centre, tracker.gg-style).
 *
 * Sits above the per-game subnav (Home / Leaderboards / Live).
 */
export function GameHero({ slug, name }: Props) {
  const accent = gameAccent(slug);
  return (
    <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${accent}`}>
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/30 to-transparent" />
      <div className="relative px-6 md:px-10 py-10 md:py-14 space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <div className="text-xs uppercase tracking-widest text-ink-200/80">Game hub</div>
            <h1 className="text-4xl md:text-5xl font-display font-bold drop-shadow-xl">{name}</h1>
          </div>
          <Link href={`/leaderboards?game=${slug}`} className="chip bg-ink-950/60 backdrop-blur">
            Leaderboard →
          </Link>
        </div>
        <div className="max-w-2xl">
          <SearchBar defaultGame={slug} />
        </div>
      </div>
    </section>
  );
}
