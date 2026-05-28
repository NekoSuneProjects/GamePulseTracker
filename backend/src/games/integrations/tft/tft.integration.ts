import { Injectable } from '@nestjs/common';
import { StubIntegration } from '../stub.base';

/**
 * Teamfight Tactics — Riot TFT API. Uses the same RIOT_API_KEY as LoL/Valorant.
 *   Ranked: GET https://<platform>.api.riotgames.com/tft/league/v1/entries/by-summoner/<id>
 *   Match:  GET https://<regional>.api.riotgames.com/tft/match/v1/matches/<matchId>
 */
@Injectable()
export class TftIntegration extends StubIntegration {
  readonly slug = 'tft' as const;
  readonly name = 'Teamfight Tactics';
  readonly providerLabel = 'Riot TFT API';
  readonly envKey = 'RIOT_API_KEY';
  readonly platforms = ['na', 'euw', 'eune', 'kr', 'br', 'jp', 'lan', 'las', 'oce', 'tr', 'ru', 'vn'] as const;
}
