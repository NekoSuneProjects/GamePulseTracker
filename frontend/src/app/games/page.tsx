import { GAME_CATALOG } from '@gpt/shared';
import { GameTile } from '@/components/GameTile';
import { SearchBar } from '@/components/SearchBar';

async function getCatalog() {
  const url = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/games`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const j = await res.json();
    return (j?.data ?? []) as Array<{ slug: string; name: string; enabled: boolean; live: boolean }>;
  } catch {
    return GAME_CATALOG.map(g => ({ slug: g.slug, name: g.name, enabled: false, live: g.live }));
  }
}

export default async function GamesPage() {
  const games = await getCatalog();
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-display font-semibold">Games</h1>
        <p className="text-ink-400 mt-1">Search a player on any supported game.</p>
      </header>
      <SearchBar />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {games.map(g => <GameTile key={g.slug} {...g} />)}
      </div>
    </div>
  );
}
