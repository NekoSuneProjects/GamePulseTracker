import Link from 'next/link';
import { SearchBar } from '@/components/SearchBar';
import { NewsList } from '@/components/NewsList';
import { serverFetch } from '@/lib/api-server';
import type { GameSlug, NewsItem } from '@gpt/shared';

interface RecentRow {
  id: string; game: string; platform: string; providerId: string;
  displayName: string; avatarUrl?: string; lastFetchedAt: string | null;
}

export default async function GamePage({ params }: { params: { game: string } }) {
  const [recentAll, newsRaw] = await Promise.all([
    serverFetch<RecentRow[]>(`/stats/recent?limit=24`),
    serverFetch<NewsItem[]>(`/news/${encodeURIComponent(params.game)}?limit=9`),
  ]);
  const recent = (recentAll ?? []).filter(r => r.game === params.game);
  const news = newsRaw ?? [];

  return (
    <div className="space-y-10">
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-3xl font-display font-semibold capitalize">{params.game.replace(/-/g, ' ')}</h1>
        <Link href={`/leaderboards?game=${params.game}`} className="chip">Leaderboard →</Link>
      </header>

      <SearchBar defaultGame={params.game as GameSlug} />

      <section>
        <h2 className="text-lg font-display font-semibold mb-3">Latest news</h2>
        <NewsList items={news} />
      </section>

      <section>
        <h2 className="text-lg font-display font-semibold mb-3">Recently tracked</h2>
        {recent.length === 0 ? (
          <div className="glass p-6 text-ink-400 text-sm">
            No tracked players yet for this game. Search above to start tracking.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {recent.map(r => {
              const platformQs = r.platform && r.platform !== '_' ? `?platform=${encodeURIComponent(r.platform)}` : '';
              return (
                <Link key={r.id} href={`/games/${r.game}/${encodeURIComponent(r.providerId)}${platformQs}`}
                  className="glass p-4 hover:border-pulse-500/50">
                  <div className="font-semibold truncate">{r.displayName}</div>
                  <div className="text-xs text-ink-400 font-mono truncate">{r.providerId}</div>
                  {r.platform && r.platform !== '_' && <div className="text-xs text-pulse-300 mt-1">{r.platform}</div>}
                  {r.lastFetchedAt && <div className="text-xs text-ink-500 mt-2">updated {new Date(r.lastFetchedAt).toLocaleString()}</div>}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
