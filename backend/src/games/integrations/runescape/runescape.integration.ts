import { Injectable } from '@nestjs/common';
import { request } from 'undici';
import type { NormalizedProfile, NewsItem } from '@gpt/shared';
import type { GameIntegration, ProfileQuery, ResolvedIdentity, SearchHit } from '../integration.interface';
import { parseRssFeed } from '../rss.helper';

/**
 * RuneScape 3 — official public hiscores. Same CSV format as OSRS but with
 * many more skills (29) and many activity rows.
 *   GET https://secure.runescape.com/m=hiscore[/mode]/index_lite.ws?player=NAME
 *
 * News feed: https://secure.runescape.com/m=news/latest_news.rss
 */
const RS3_SKILLS = [
  'overall', 'attack', 'defence', 'strength', 'constitution', 'ranged',
  'prayer', 'magic', 'cooking', 'woodcutting', 'fletching', 'fishing',
  'firemaking', 'crafting', 'smithing', 'mining', 'herblore', 'agility',
  'thieving', 'slayer', 'farming', 'runecrafting', 'hunter', 'construction',
  'summoning', 'dungeoneering', 'divination', 'invention', 'archaeology', 'necromancy',
];

const PLATFORM_PATH: Record<string, string> = {
  main: 'hiscore',
  ironman: 'hiscore_ironman',
  'hardcore-ironman': 'hiscore_hardcore_ironman',
};

@Injectable()
export class RunescapeIntegration implements GameIntegration {
  readonly slug = 'runescape' as const;
  readonly name = 'RuneScape 3';
  readonly live = true;
  readonly platforms = ['main', 'ironman', 'hardcore-ironman'] as const;
  isEnabled() { return true; }

  async search(q: { query: string; platform?: string }): Promise<SearchHit[]> {
    if (!q.query.trim()) return [];
    try {
      const p = await this.getProfile({ identifier: q.query, platform: q.platform });
      return [{ providerId: p.providerId, displayName: p.displayName, platform: p.platform }];
    } catch { return []; }
  }

  async resolveIdentity(q: ProfileQuery): Promise<ResolvedIdentity> {
    return { providerId: q.identifier.toLowerCase(), displayName: q.identifier, platform: q.platform ?? 'main' };
  }

  async getProfile(q: ProfileQuery): Promise<NormalizedProfile> {
    const platform = q.platform && PLATFORM_PATH[q.platform] ? q.platform : 'main';
    const path = PLATFORM_PATH[platform];
    const url = `https://secure.runescape.com/m=${path}/index_lite.ws?player=${encodeURIComponent(q.identifier)}`;

    const res = await request(url, { method: 'GET', headers: { 'user-agent': 'GamePulseTracker/0.1' } });
    if (res.statusCode === 404) throw new Error('RS3 player not found');
    if (res.statusCode >= 400) throw new Error(`RS3 hiscores error ${res.statusCode}`);
    const csv = await res.body.text();

    const lines = csv.trim().split('\n');
    const skills: Record<string, { rank: number; level: number; xp: number }> = {};
    for (let i = 0; i < RS3_SKILLS.length && i < lines.length; i++) {
      const [rank, level, xp] = lines[i].split(',').map(Number);
      skills[RS3_SKILLS[i]] = { rank, level, xp };
    }
    const overall = skills.overall ?? { rank: -1, level: 0, xp: 0 };

    return {
      game: 'runescape',
      providerId: q.identifier.toLowerCase(),
      displayName: q.identifier,
      platform,
      avatarUrl: `https://secure.runescape.com/m=avatar-rs/${encodeURIComponent(q.identifier)}/chat.png`,
      headline: {
        level: overall.level,
        xp: overall.xp,
        rank: overall.rank > 0 ? `#${overall.rank.toLocaleString()}` : undefined,
      },
      details: Object.fromEntries([
        ...Object.entries(skills).map(([k, v]) => [`${k}_level`, v.level] as [string, number]),
        ...Object.entries(skills).map(([k, v]) => [`${k}_xp`,    v.xp]    as [string, number]),
      ]),
      fetchedAt: new Date().toISOString(),
    };
  }

  async getNews(): Promise<NewsItem[]> {
    return parseRssFeed('https://secure.runescape.com/m=news/latest_news.rss', this.slug, 'RuneScape News');
  }
}
