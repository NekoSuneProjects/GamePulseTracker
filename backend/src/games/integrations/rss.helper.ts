import { createHash } from 'crypto';
import { Logger } from '@nestjs/common';
import { request } from 'undici';
import type { NewsItem, GameSlug } from '@gpt/shared';

const log = new Logger('RssHelper');

/**
 * Minimal RSS/Atom parser — purpose-built so we don't pull in another dep.
 * Extracts title / link / pubDate / description / enclosure image. Good enough
 * for news widgets on game landing pages.
 *
 * Each game integration that returns a feed URL gets normalized NewsItem[]
 * back — already keyed by stable id (URL hash) so upserts are idempotent.
 */
export async function parseRssFeed(url: string, game: GameSlug, sourceName: string, limit = 12): Promise<NewsItem[]> {
  try {
    const res = await request(url, {
      method: 'GET',
      headers: { 'user-agent': 'GamePulseTracker/0.1', accept: 'application/rss+xml, application/atom+xml, text/xml, */*' },
    });
    if (res.statusCode >= 400) { log.warn(`RSS ${res.statusCode} ${url}`); return []; }
    const xml = await res.body.text();
    return parseRssXml(xml, game, sourceName, limit);
  } catch (e) {
    log.warn(`RSS fetch failed ${url}: ${(e as Error).message}`);
    return [];
  }
}

export function parseRssXml(xml: string, game: GameSlug, sourceName: string, limit = 12): NewsItem[] {
  // Crude but resilient: extract <item> ... </item> (RSS) and <entry>...</entry> (Atom).
  const itemBlocks: string[] = [];
  const itemRe  = /<item\b[\s\S]*?<\/item>/gi;
  const entryRe = /<entry\b[\s\S]*?<\/entry>/gi;
  for (const m of xml.matchAll(itemRe))  itemBlocks.push(m[0]);
  for (const m of xml.matchAll(entryRe)) itemBlocks.push(m[0]);

  const items: NewsItem[] = [];
  for (const block of itemBlocks.slice(0, limit)) {
    const title = pickTag(block, 'title') ?? '(untitled)';
    const link  = pickAttr(block, 'link', 'href') ?? pickTag(block, 'link') ?? '';
    const pub   = pickTag(block, 'pubDate') ?? pickTag(block, 'updated') ?? pickTag(block, 'published') ?? '';
    const desc  = pickTag(block, 'description') ?? pickTag(block, 'summary') ?? pickTag(block, 'content') ?? '';
    const image = pickAttr(block, 'enclosure', 'url') ?? extractFirstImg(desc);

    if (!link) continue;
    const id = createHash('sha1').update(link).digest('hex').slice(0, 16);
    items.push({
      id, game, title: decodeEntities(stripTags(title)),
      url: link,
      source: sourceName,
      publishedAt: parseDate(pub),
      summary: decodeEntities(stripTags(desc)).slice(0, 400),
      imageUrl: image,
    });
  }
  return items;
}

function pickTag(s: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = re.exec(s); return m ? m[1].trim() : null;
}
function pickAttr(s: string, tag: string, attr: string): string | null {
  const re = new RegExp(`<${tag}[^>]*\\b${attr}=["']([^"']+)["']`, 'i');
  const m = re.exec(s); return m ? m[1] : null;
}
function stripTags(s: string)        { return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim(); }
function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}
function extractFirstImg(html: string): string | undefined {
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return m?.[1];
}
function parseDate(s: string): string {
  if (!s) return new Date().toISOString();
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString() : new Date().toISOString();
}
