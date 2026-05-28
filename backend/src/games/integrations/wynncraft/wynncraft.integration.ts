import { Injectable } from '@nestjs/common';
import type { NormalizedProfile } from '@gpt/shared';
import type { GameIntegration, ProfileQuery, ResolvedIdentity, SearchHit } from '../integration.interface';
import { httpJson } from '../http.helper';

const WYNN_API   = 'https://api.wynncraft.com/v3';
const MOJANG_API = 'https://api.mojang.com';

interface MojangProfile { id: string; name: string }
interface WynnPlayerResp {
  username: string;
  uuid: string;
  rank?: string; shortenedRank?: string;
  veteran?: boolean;
  firstJoin?: string; lastJoin?: string; playtime?: number;
  guild?: { name?: string; prefix?: string; rank?: string };
  globalData?: {
    wars?: number; totalLevel?: number;
    killedMobs?: number; chestsFound?: number;
    dungeons?: { total?: number }; raids?: { total?: number };
    completedQuests?: number; pvp?: { kills?: number; deaths?: number };
  };
  characters?: Record<string, { type?: string; level?: number; xp?: number; totalLevel?: number; playtime?: number }>;
}

@Injectable()
export class WynncraftIntegration implements GameIntegration {
  readonly slug = 'wynncraft' as const;
  readonly name = 'Wynncraft';
  readonly live = true;
  readonly platforms = ['minecraft'] as const;
  isEnabled(): boolean { return true; }

  async search(q: { query: string }): Promise<SearchHit[]> {
    const clean = q.query.trim();
    if (!clean) return [];
    try {
      const p = await this.getProfile({ identifier: clean });
      return [{ providerId: p.providerId, displayName: p.displayName, platform: 'minecraft', avatarUrl: p.avatarUrl }];
    } catch { return []; }
  }

  async resolveIdentity(q: ProfileQuery): Promise<ResolvedIdentity> {
    const id = q.identifier.replace(/-/g, '');
    if (id.length === 32) return { providerId: id, displayName: q.identifier, platform: 'minecraft' };
    const m = await httpJson<MojangProfile>(`${MOJANG_API}/users/profiles/minecraft/${encodeURIComponent(q.identifier)}`);
    return { providerId: m.id, displayName: m.name, platform: 'minecraft' };
  }

  async getProfile(q: ProfileQuery): Promise<NormalizedProfile> {
    const data = await httpJson<WynnPlayerResp>(`${WYNN_API}/player/${encodeURIComponent(q.identifier)}`, {
      query: { fullResult: 'True' },
    });
    const g = data.globalData ?? {};
    const pvpKd = this.safeRatio(g.pvp?.kills, g.pvp?.deaths);
    const totalLevel = g.totalLevel ?? 0;

    const recent = Object.entries(data.characters ?? {}).slice(0, 6).map(([id, c]) => ({
      matchId: id,
      playedAt: data.lastJoin ?? new Date().toISOString(),
      mode: c.type ?? 'character',
      result: 'unknown' as const,
      details: { level: c.level ?? null, totalLevel: c.totalLevel ?? null, playtime: c.playtime ?? null },
    }));

    return {
      game: 'wynncraft',
      providerId: data.uuid,
      displayName: data.username,
      platform: 'minecraft',
      avatarUrl: `https://crafatar.com/avatars/${data.uuid}?size=128&overlay`,
      headline: {
        level: totalLevel,
        rank: data.shortenedRank ?? data.rank ?? undefined,
        kd: pvpKd,
        wins: g.wars ?? undefined,
        matches: (g.dungeons?.total ?? 0) + (g.raids?.total ?? 0),
        timePlayedSec: data.playtime ? Math.round(data.playtime * 60) : undefined,
      },
      details: {
        guild: data.guild?.name ?? null, guildRank: data.guild?.rank ?? null,
        veteran: data.veteran ?? null,
        firstJoin: data.firstJoin ?? null, lastJoin: data.lastJoin ?? null,
        wars: g.wars ?? null, killedMobs: g.killedMobs ?? null, chestsFound: g.chestsFound ?? null,
        dungeonsCompleted: g.dungeons?.total ?? null, raidsCompleted: g.raids?.total ?? null,
        quests: g.completedQuests ?? null,
        pvpKills: g.pvp?.kills ?? null, pvpDeaths: g.pvp?.deaths ?? null,
      },
      recent,
      providerUpdatedAt: data.lastJoin,
      fetchedAt: new Date().toISOString(),
    };
  }

  private safeRatio(a?: number, b?: number) { if (!a) return 0; if (!b) return a; return Number((a / b).toFixed(3)); }
}
