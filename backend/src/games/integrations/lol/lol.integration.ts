import { Injectable } from '@nestjs/common';
import { StubIntegration } from '../stub.base';

/**
 * League of Legends — Riot API requires a production key.
 *   Account lookup:    GET https://<regional>.api.riotgames.com/riot/account/v1/accounts/by-riot-id/<name>/<tag>
 *   Summoner by puuid: GET https://<platform>.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/<puuid>
 *   Ranked entries:    GET https://<platform>.api.riotgames.com/lol/league/v4/entries/by-summoner/<id>
 *
 * `q.platform` maps to Riot's PLATFORM_ROUTING (NA1, EUW1, KR, etc.) and the
 * regional routing (AMERICAS, EUROPE, ASIA) is derived from it.
 */
@Injectable()
export class LolIntegration extends StubIntegration {
  readonly slug = 'lol' as const;
  readonly name = 'League of Legends';
  readonly providerLabel = 'Riot LoL API';
  readonly envKey = 'RIOT_API_KEY';
  readonly platforms = ['na', 'euw', 'eune', 'kr', 'br', 'jp', 'lan', 'las', 'oce', 'tr', 'ru', 'vn'] as const;
}
