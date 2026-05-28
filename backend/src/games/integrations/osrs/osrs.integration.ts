import { Injectable } from '@nestjs/common';
import { request } from 'undici';
import type { NormalizedProfile } from '@gpt/shared';
import type { GameIntegration, ProfileQuery, ResolvedIdentity, SearchHit } from '../integration.interface';

/**
 * Old School RuneScape — official public hiscores (no API key, no rate limit).
 *   GET https://secure.runescape.com/m=hiscore_oldschool[/category]/index_lite.ws?player=NAME
 * Returns CSV: 24 ranked skills then a list of activities. Order is documented
 * here: https://oldschool.runescape.wiki/w/Application_programming_interface
 *
 * `q.platform` selects the hiscore mode:
 *   main, ironman, hardcore-ironman, ultimate-ironman.
 */
const SKILL_ORDER = [
  'overall', 'attack', 'defence', 'strength', 'hitpoints', 'ranged',
  'prayer', 'magic', 'cooking', 'woodcutting', 'fletching', 'fishing',
  'firemaking', 'crafting', 'smithing', 'mining', 'herblore', 'agility',
  'thieving', 'slayer', 'farming', 'runecraft', 'hunter', 'construction',
];

const PLATFORM_PATH: Record<string, string> = {
  main: 'hiscore_oldschool',
  ironman: 'hiscore_oldschool_ironman',
  'hardcore-ironman': 'hiscore_oldschool_hardcore_ironman',
  'ultimate-ironman': 'hiscore_oldschool_ultimate',
};

@Injectable()
export class OsrsIntegration implements GameIntegration {
  readonly slug = 'osrs' as const;
  readonly name = 'Old School RuneScape';
  readonly live = true;
  readonly platforms = ['main', 'ironman', 'hardcore-ironman', 'ultimate-ironman'] as const;

  isEnabled() { return true; }

  async search(q: { query: string; platform?: string }): Promise<SearchHit[]> {
    if (!q.query.trim()) return [];
    // No proper search endpoint — just probe lookup.
    try {
      const profile = await this.getProfile({ identifier: q.query, platform: q.platform });
      return [{ providerId: profile.providerId, displayName: profile.displayName, platform: profile.platform }];
    } catch { return []; }
  }

  async resolveIdentity(q: ProfileQuery): Promise<ResolvedIdentity> {
    // Jagex IDs ARE the username, so resolution is identity.
    return { providerId: q.identifier.toLowerCase(), displayName: q.identifier, platform: q.platform ?? 'main' };
  }

  async getProfile(q: ProfileQuery): Promise<NormalizedProfile> {
    const platform = q.platform && PLATFORM_PATH[q.platform] ? q.platform : 'main';
    const path = PLATFORM_PATH[platform];
    const url = `https://secure.runescape.com/m=${path}/index_lite.ws?player=${encodeURIComponent(q.identifier)}`;

    const res = await request(url, { method: 'GET', headers: { 'user-agent': 'GamePulseTracker/0.1' } });
    if (res.statusCode === 404) throw new Error('OSRS player not found');
    if (res.statusCode >= 400)  throw new Error(`OSRS hiscores error ${res.statusCode}`);
    const csv = await res.body.text();

    const lines = csv.trim().split('\n');
    const skills: Record<string, { rank: number; level: number; xp: number }> = {};
    let totalLevel = 0;
    let totalXp = 0;

    for (let i = 0; i < SKILL_ORDER.length && i < lines.length; i++) {
      const [rank, level, xp] = lines[i].split(',').map(Number);
      const skill = SKILL_ORDER[i];
      skills[skill] = { rank, level, xp };
      if (skill !== 'overall') {
        totalLevel += Math.max(0, level);
        totalXp += Math.max(0, xp);
      }
    }

    const overall = skills.overall ?? { rank: -1, level: totalLevel, xp: totalXp };
    const combat = this.estimateCombat(skills);

    return {
      game: 'osrs',
      providerId: q.identifier.toLowerCase(),
      displayName: q.identifier,
      platform,
      avatarUrl: `https://secure.runescape.com/m=avatar-rs/${encodeURIComponent(q.identifier)}/chat.png`,
      headline: {
        level: overall.level,
        xp:    overall.xp,
        rank:  overall.rank > 0 ? `#${overall.rank.toLocaleString()}` : undefined,
        rankTier: combat,
      },
      details: Object.fromEntries([
        ...Object.entries(skills).map(([k, v]) => [`${k}_level`, v.level] as [string, number]),
        ...Object.entries(skills).map(([k, v]) => [`${k}_xp`,    v.xp]    as [string, number]),
      ]),
      fetchedAt: new Date().toISOString(),
    };
  }

  /** OSRS combat level. Source: oldschool.runescape.wiki/w/Combat_level */
  private estimateCombat(s: Record<string, { level: number }>): number {
    const lv = (k: string) => s[k]?.level ?? 1;
    const base = 0.25 * (lv('defence') + lv('hitpoints') + Math.floor(lv('prayer') / 2));
    const melee  = 0.325 * (lv('attack') + lv('strength'));
    const ranged = 0.325 * Math.floor(3 * lv('ranged') / 2);
    const magic  = 0.325 * Math.floor(3 * lv('magic') / 2);
    return Math.floor(base + Math.max(melee, ranged, magic));
  }
}
