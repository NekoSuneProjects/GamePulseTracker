import Link from 'next/link';
import { GAME_CATALOG } from '@gpt/shared';
import { SearchBar } from '@/components/SearchBar';
import { GameTile } from '@/components/GameTile';
import { serverFetch } from '@/lib/api-server';

type CatalogRow = { slug: string; name: string; enabled: boolean; live: boolean };

export default async function HomePage() {
  const games =
    (await serverFetch<CatalogRow[]>('/games')) ??
    GAME_CATALOG.map(g => ({ slug: g.slug, name: g.name, enabled: false, live: g.live }));

  return (
    <div className="space-y-12">
      <section className="text-center pt-8">
        <div className="inline-flex items-center gap-2 mb-3 chip"><span className="live-dot" />real-time tracking</div>
        <h1 className="text-4xl md:text-6xl font-display font-bold leading-tight">
          One <span className="neon-text">pulse</span> for every game you play.
        </h1>
        <p className="mt-4 text-ink-300 max-w-2xl mx-auto">
          Self-hosted player statistics across {GAME_CATALOG.length}+ games. Live leaderboards,
          rank-change alerts, match history, and a public REST API — all on your own server.
        </p>
        <div className="mt-6 max-w-2xl mx-auto">
          <SearchBar />
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-2xl font-display font-semibold">Supported games</h2>
          <Link href="/leaderboards" className="text-pulse-400 text-sm hover:underline">View leaderboards →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {games.map(g => <GameTile key={g.slug} {...g} />)}
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        {[
          { t: 'Real-time updates', d: 'WebSocket-driven stat & rank refreshes the moment they happen.' },
          { t: 'Modular integrations', d: 'Each game is a single file. Add a new title in minutes.' },
          { t: 'Open API',          d: 'REST endpoints, API-key rate limiting, Swagger docs at /docs.' },
        ].map(f => (
          <div key={f.t} className="glass p-5">
            <h3 className="font-display font-semibold text-lg neon-text">{f.t}</h3>
            <p className="text-ink-300 mt-1 text-sm">{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
