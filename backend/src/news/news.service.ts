import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { IntegrationRegistry } from '../games/integrations/integration.registry';
import { parseRssFeed } from '../games/integrations/rss.helper';
import type { NewsItem, GameSlug } from '@gpt/shared';

/**
 * Fallback RSS feeds for games whose integrations don't implement getNews().
 * Each entry is `(slug, sourceName, feedUrl)`. Keep these to well-known
 * official sources to avoid drift.
 */
const FALLBACK_FEEDS: Array<{ slug: GameSlug; source: string; url: string }> = [
  { slug: 'osrs',         source: 'OSRS News',          url: 'https://secure.runescape.com/m=news/latest_news.rss?oldschool=true' },
  { slug: 'runescape',    source: 'RuneScape News',     url: 'https://secure.runescape.com/m=news/latest_news.rss' },
  { slug: 'fortnite',     source: 'Epic Fortnite News', url: 'https://www.fortnite.com/news.rss' },
  { slug: 'destiny-2',    source: 'Bungie News',        url: 'https://www.bungie.net/News?currentpage=1&itemsPerPage=10' }, // RSS-ish; integration provider may swap
  { slug: 'cs2',          source: 'Steam CS2 News',     url: 'https://store.steampowered.com/feeds/news/app/730/?cc=US&l=english' },
  { slug: 'rocket-league',source: 'Steam RL News',      url: 'https://store.steampowered.com/feeds/news/app/252950/?cc=US&l=english' },
  { slug: 'apex',         source: 'EA Apex News',       url: 'https://www.ea.com/games/apex-legends/news.rss' },
  { slug: 'valorant',     source: 'Valorant News',      url: 'https://playvalorant.com/page-data/en-us/news/page-data.json' }, // placeholder
];

@Injectable()
export class NewsService {
  private readonly log = new Logger(NewsService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private integrations: IntegrationRegistry,
  ) {}

  async list(game: string, limit = 12): Promise<NewsItem[]> {
    const cacheKey = `gpt:news:${game}:${limit}`;
    const cached = await this.redis.getJson<NewsItem[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.prisma.newsItem.findMany({
      where: { game },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
    const items: NewsItem[] = rows.map(r => ({
      id: r.id,
      game: r.game as GameSlug,
      title: r.title,
      url: r.url,
      source: r.source,
      summary: r.summary ?? undefined,
      imageUrl: r.imageUrl ?? undefined,
      tags: (r.tags as string[] | null) ?? [],
      publishedAt: r.publishedAt.toISOString(),
    }));
    await this.redis.setJson(cacheKey, items, 600);
    return items;
  }

  /**
   * Refresh news for ALL games. Called by NewsScheduler every 30 min.
   *
   * Two optimisations vs. the previous serial loop:
   *  1. Only refresh integrations that anyone cares about (at least one
   *     active TrackedProfile for this game). Avoids hammering Wynncraft +
   *     OSRS + Roblox RSS feeds when nobody has tracked them yet.
   *  2. Bounded-concurrency parallelism (6 at a time) so one slow feed host
   *     doesn't block the whole tick. Was a real problem when a single host
   *     hung past the next cron firing.
   */
  async refreshAll() {
    const allIntegrations = this.integrations.list();

    // Skip games where nothing is tracked.
    const usedSlugs = new Set(
      (await this.prisma.trackedProfile.findMany({
        where: { active: true },
        select: { game: true },
        distinct: ['game'],
      })).map(r => r.game),
    );
    const integrations = allIntegrations.filter(i => usedSlugs.has(i.slug));
    if (integrations.length === 0) {
      this.log.verbose?.('news refresh: no tracked games — skipping');
      return;
    }

    let upserted = 0;
    const CONCURRENCY = 6;

    // Process the integrations in parallel batches.
    for (let i = 0; i < integrations.length; i += CONCURRENCY) {
      const batch = integrations.slice(i, i + CONCURRENCY);
      await Promise.allSettled(batch.map(async (integ) => {
        try {
          let items: NewsItem[] = [];
          if (integ.getNews) {
            items = await integ.getNews();
          } else {
            const fb = FALLBACK_FEEDS.find(f => f.slug === integ.slug);
            if (fb) items = await parseRssFeed(fb.url, fb.slug, fb.source);
          }

          for (const item of items.slice(0, 20)) {
            await this.prisma.newsItem.upsert({
              where: { game_url: { game: integ.slug, url: item.url } },
              update: { title: item.title, summary: item.summary, imageUrl: item.imageUrl, publishedAt: new Date(item.publishedAt), source: item.source, tags: item.tags ?? [] },
              create: {
                id: item.id, game: integ.slug, title: item.title, url: item.url,
                source: item.source, summary: item.summary, imageUrl: item.imageUrl,
                tags: item.tags ?? [], publishedAt: new Date(item.publishedAt),
              },
            }).then(() => { upserted++; }).catch(e => this.log.warn(`news upsert failed for ${integ.slug}: ${(e as Error).message}`));
          }
          await this.redis.del(`gpt:news:${integ.slug}:12`);
        } catch (e) {
          this.log.warn(`news refresh ${integ.slug} failed: ${(e as Error).message}`);
        }
      }));
    }
    if (upserted > 0) this.log.log(`Refreshed news: ${upserted} item(s) across ${integrations.length} active game(s)`);
  }
}
