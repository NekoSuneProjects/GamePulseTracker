import { Injectable } from '@nestjs/common';
import type { NormalizedProfile } from '@gpt/shared';
import type { GameIntegration, ProfileQuery, ResolvedIdentity, SearchHit } from '../integration.interface';
import { httpJson } from '../http.helper';

const COC_API = 'https://api.clashofclans.com/v1';

/**
 * Clash of Clans — official Supercell API.
 *   Docs:      https://developer.clashofclans.com/#/documentation
 *   Sign-up:   https://developer.clashofclans.com  (IP-whitelisted key)
 *
 *   GET /players/%23<TAG>     — player by their #ABCDE0123 tag
 *   GET /clans/%23<TAG>       — clan by tag
 *   GET /clans?name=<name>    — search clans by name
 *
 * `q.platform` is treated as either 'player' or 'clan'. The same integration
 * serves both: pass platform=clan and the providerId is treated as a clan tag
 * instead of a player tag. UI-side both are reachable via search.
 *
 * Player/clan tags use a leading '#'. We accept the user typing it with or
 * without the '#' and normalise — the API encodes it as %23 in the URL.
 */

interface CocPlayer {
  tag: string;                 // '#ABC123'
  name: string;
  townHallLevel?: number;
  townHallWeaponLevel?: number;
  expLevel?: number;
  trophies?: number;
  bestTrophies?: number;
  warStars?: number;
  attackWins?: number;
  defenseWins?: number;
  builderHallLevel?: number;
  builderBaseTrophies?: number;
  bestBuilderBaseTrophies?: number;
  donations?: number;
  donationsReceived?: number;
  role?: string;
  warPreference?: 'in' | 'out';
  clanCapitalContributions?: number;
  league?: { id: number; name: string; iconUrls?: { small?: string; medium?: string; tiny?: string } };
  clan?: { tag: string; name: string; clanLevel?: number; badgeUrls?: { medium?: string } };
  achievements?: Array<{ name: string; stars: number; value: number; target: number }>;
}

interface CocClan {
  tag: string;
  name: string;
  type?: string;
  description?: string;
  badgeUrls?: { small?: string; medium?: string; large?: string };
  clanLevel?: number;
  clanPoints?: number;
  clanVersusPoints?: number;
  clanCapitalPoints?: number;
  requiredTrophies?: number;
  requiredTownhallLevel?: number;
  warFrequency?: string;
  warWinStreak?: number;
  warWins?: number;
  warTies?: number;
  warLosses?: number;
  isWarLogPublic?: boolean;
  members?: number;
  location?: { id: number; name: string; isCountry?: boolean; countryCode?: string };
}

interface CocClanList { items?: CocClan[] }

@Injectable()
export class ClashOfClansIntegration implements GameIntegration {
  readonly slug = 'clash-of-clans' as const;
  readonly name = 'Clash of Clans';
  readonly live = true;
  readonly platforms = ['player', 'clan'] as const;

  isEnabled() { return Boolean(process.env.COC_API_KEY); }

  private headers(): Record<string, string> {
    return { Authorization: `Bearer ${process.env.COC_API_KEY!}` };
  }

  /** Accept '#ABC123' or 'ABC123' or with lowercase chars — normalise to UPPER+'#'. */
  private normaliseTag(raw: string): string {
    const t = raw.trim().replace(/^#/, '').toUpperCase();
    return `#${t}`;
  }
  private encodeTag(tag: string): string {
    return encodeURIComponent(tag);   // turns '#' into %23
  }

  async search(q: { query: string; platform?: string }): Promise<SearchHit[]> {
    if (!this.isEnabled() || !q.query.trim()) return [];
    const platform = q.platform === 'clan' ? 'clan' : 'player';

    // Tag-shaped query? Resolve directly.
    if (/^#?[0289CGJLPQRUVY]+$/i.test(q.query.trim())) {
      try {
        const profile = await this.getProfile({ identifier: q.query, platform });
        return [{ providerId: profile.providerId, displayName: profile.displayName, platform }];
      } catch { return []; }
    }

    // Otherwise, only clans support name-search via the API.
    if (platform === 'clan') {
      try {
        const r = await httpJson<CocClanList>(`${COC_API}/clans`, {
          query: { name: q.query, limit: 10 },
          headers: this.headers(),
        });
        return (r.items ?? []).map(c => ({
          providerId: c.tag,
          displayName: c.name,
          platform: 'clan',
          avatarUrl: c.badgeUrls?.medium,
        }));
      } catch { return []; }
    }

    // No public player-name search exists on the CoC API.
    return [];
  }

  async resolveIdentity(q: ProfileQuery): Promise<ResolvedIdentity> {
    const tag = this.normaliseTag(q.identifier);
    return { providerId: tag, displayName: tag, platform: q.platform ?? 'player' };
  }

  async getProfile(q: ProfileQuery): Promise<NormalizedProfile> {
    if (!this.isEnabled()) throw new Error('Clash of Clans integration not configured — set COC_API_KEY.');
    const platform = q.platform === 'clan' ? 'clan' : 'player';
    const tag = this.normaliseTag(q.identifier);

    if (platform === 'clan') return this.getClan(tag);
    return this.getPlayer(tag);
  }

  private async getPlayer(tag: string): Promise<NormalizedProfile> {
    const p = await httpJson<CocPlayer>(`${COC_API}/players/${this.encodeTag(tag)}`, { headers: this.headers() });

    const kd = this.safeRatio(p.attackWins, p.defenseWins);

    return {
      game: 'clash-of-clans',
      providerId: p.tag,
      displayName: p.name,
      platform: 'player',
      avatarUrl: p.league?.iconUrls?.medium ?? p.clan?.badgeUrls?.medium,
      headline: {
        level:   p.expLevel,
        rank:    p.league?.name,
        rankTier: p.trophies,
        kd,
        wins:    p.attackWins,
        losses:  p.defenseWins,
        matches: (p.attackWins ?? 0) + (p.defenseWins ?? 0),
      },
      details: {
        tag: p.tag,
        townHallLevel: p.townHallLevel ?? null,
        townHallWeaponLevel: p.townHallWeaponLevel ?? null,
        expLevel: p.expLevel ?? null,
        trophies: p.trophies ?? null,
        bestTrophies: p.bestTrophies ?? null,
        warStars: p.warStars ?? null,
        attackWins: p.attackWins ?? null,
        defenseWins: p.defenseWins ?? null,
        builderHallLevel: p.builderHallLevel ?? null,
        builderBaseTrophies: p.builderBaseTrophies ?? null,
        bestBuilderBaseTrophies: p.bestBuilderBaseTrophies ?? null,
        donations: p.donations ?? null,
        donationsReceived: p.donationsReceived ?? null,
        clanTag: p.clan?.tag ?? null,
        clanName: p.clan?.name ?? null,
        clanLevel: p.clan?.clanLevel ?? null,
        clanRole: p.role ?? null,
        league: p.league?.name ?? null,
        warPreference: p.warPreference ?? null,
        capitalContributions: p.clanCapitalContributions ?? null,
        achievementsCompleted: (p.achievements ?? []).filter(a => a.stars >= 3).length,
        achievementsTotal: p.achievements?.length ?? null,
      },
      fetchedAt: new Date().toISOString(),
    };
  }

  private async getClan(tag: string): Promise<NormalizedProfile> {
    const c = await httpJson<CocClan>(`${COC_API}/clans/${this.encodeTag(tag)}`, { headers: this.headers() });

    return {
      game: 'clash-of-clans',
      providerId: c.tag,
      displayName: c.name,
      platform: 'clan',
      avatarUrl: c.badgeUrls?.medium,
      headline: {
        level: c.clanLevel,
        rank:  c.type,
        rankTier: c.clanPoints,
        wins:    c.warWins,
        losses:  c.warLosses,
        matches: (c.warWins ?? 0) + (c.warLosses ?? 0) + (c.warTies ?? 0),
      },
      details: {
        tag: c.tag,
        type: c.type ?? null,                    // open / inviteOnly / closed
        description: (c.description ?? '').slice(0, 400),
        clanLevel: c.clanLevel ?? null,
        clanPoints: c.clanPoints ?? null,
        clanVersusPoints: c.clanVersusPoints ?? null,
        clanCapitalPoints: c.clanCapitalPoints ?? null,
        requiredTrophies: c.requiredTrophies ?? null,
        requiredTownhallLevel: c.requiredTownhallLevel ?? null,
        warFrequency: c.warFrequency ?? null,
        warWinStreak: c.warWinStreak ?? null,
        warWins: c.warWins ?? null,
        warTies: c.warTies ?? null,
        warLosses: c.warLosses ?? null,
        isWarLogPublic: c.isWarLogPublic ?? null,
        members: c.members ?? null,
        locationName: c.location?.name ?? null,
        locationCountryCode: c.location?.countryCode ?? null,
      },
      fetchedAt: new Date().toISOString(),
    };
  }

  private safeRatio(a?: number, b?: number) { if (!a) return 0; if (!b) return a; return Number((a / b).toFixed(3)); }
}
