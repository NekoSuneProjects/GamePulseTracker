import Link from 'next/link';
import { NewsList } from '@/components/NewsList';
import { NewsTagFilter } from '@/components/NewsTagFilter';
import { ShopGrid } from '@/components/ShopGrid';
import { GameHero } from '@/components/GameHero';
import { GameSubNav } from '@/components/GameSubNav';
import { GameTopStats, type LeaderRow, type MetricBlock } from '@/components/GameTopStats';
import { serverFetch } from '@/lib/api-server';
import type { GameSlug, NewsItem, ShopResponse } from '@gpt/shared';
import { getGame } from '@gpt/shared';

interface RecentRow {
  id: string; game: string; platform: string; providerId: string;
  displayName: string; avatarUrl?: string; lastFetchedAt: string | null;
}

const SHOP_GAMES = new Set(['fortnite']);

const METRICS: Array<{ label: string; metric: MetricBlock['metric'] }> = [
  { label: 'Top level',   metric: 'level' },
  { label: 'Top K/D',     metric: 'kd' },
  { label: 'Top wins',    metric: 'wins' },
  { label: 'Top matches', metric: 'matches' },
];

export default async function GamePage({ params, searchParams }: { params: { game: string }; searchParams?: { tag?: string } }) {
  const wantsShop = SHOP_GAMES.has(params.game);
  const game = getGame(params.game);
  const displayName = game?.name ?? params.game;
  const tag = searchParams?.tag?.trim();
  const newsQs = tag ? `?limit=9&tag=${encodeURIComponent(tag)}` : '?limit=9';

  const [recentAll, newsRaw, shop, ...metricResults] = await Promise.all([
    serverFetch<RecentRow[]>(`/stats/recent?limit=24`),
    serverFetch<NewsItem[]>(`/news/${encodeURIComponent(params.game)}${newsQs}`),
    wantsShop ? serverFetch<ShopResponse>(`/games/${encodeURIComponent(params.game)}/shop`) : Promise.resolve(null),
    ...METRICS.map(m => serverFetch<LeaderRow[]>(`/leaderboards/${encodeURIComponent(params.game)}?metric=${m.metric}&limit=2`)),
  ]);

  const recent = (Array.isArray(recentAll) ? recentAll : []).filter(r => r.game === params.game);
  const news = Array.isArray(newsRaw) ? newsRaw : [];

  const blocks: MetricBlock[] = METRICS.map((m, i) => ({
    label: m.label,
    metric: m.metric,
    rows: Array.isArray(metricResults[i]) ? (metricResults[i] as LeaderRow[]) : [],
  }));

  return (
    <div className="space-y-8">
      <GameHero slug={params.game as GameSlug} name={displayName} />
      <GameSubNav slug={params.game} />

      <GameTopStats game={params.game} blocks={blocks} />

      <section>
        <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
          <h2 className="text-lg font-display font-semibold">Latest news</h2>
          <NewsTagFilter game={params.game} />
        </div>
        <NewsList items={news} />
      </section>

      {shop && shop.sections.length > 0 && (
        <section>
          <h2 className="text-lg font-display font-semibold mb-3">Item shop</h2>
          <ShopGrid shop={shop} />
        </section>
      )}

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
