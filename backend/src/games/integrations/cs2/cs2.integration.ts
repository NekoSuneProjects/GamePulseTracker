import { Injectable } from '@nestjs/common';
import { StubIntegration } from '../stub.base';

/**
 * CS2 — Steam Web API: ISteamUserStats/GetUserStatsForGame appid=730
 *   GET https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v2/
 *   Query: appid=730, key=<STEAM_API_KEY>, steamid=<steamid64>
 *
 * Resolve vanity URL → SteamID64 via ISteamUser/ResolveVanityURL.
 */
@Injectable()
export class Cs2Integration extends StubIntegration {
  readonly slug = 'cs2' as const;
  readonly name = 'CS2';
  readonly providerLabel = 'Steam Web API';
  readonly envKey = 'STEAM_API_KEY';
  readonly platforms = ['steam'] as const;
}
