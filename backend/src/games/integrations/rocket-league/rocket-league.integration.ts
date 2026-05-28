import { Injectable } from '@nestjs/common';
import { StubIntegration } from '../stub.base';

/**
 * Rocket League — no official public API.
 *
 * Recommended provider: BallChasing.com (free token, replays + derived stats).
 *   Sign up: https://ballchasing.com/upload
 *   Header: Authorization: <ROCKET_LEAGUE_API_KEY>
 */
@Injectable()
export class RocketLeagueIntegration extends StubIntegration {
  readonly slug = 'rocket-league' as const;
  readonly name = 'Rocket League';
  readonly providerLabel = 'ballchasing.com';
  readonly envKey = 'ROCKET_LEAGUE_API_KEY';
  readonly platforms = ['epic', 'steam', 'psn', 'xbl', 'switch'] as const;
}
