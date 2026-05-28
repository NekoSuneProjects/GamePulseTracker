import { GAME_CATALOG } from '@gpt/shared';
import { GameTile } from '@/components/GameTile';
import { SearchBar } from '@/components/SearchBar';
import { serverFetch } from '@/lib/api-server';

type CatalogRow = { slug: string; name: string; enabled: boolean; live: boolean };

export default async function GamesPage() {
  const games =
    (await serverFetch<CatalogRow[]>('/games')) ??
    GAME_CATALOG.map(g => ({ slug: g.slug, name: g.name, enabled: false, live: g.live }));
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
