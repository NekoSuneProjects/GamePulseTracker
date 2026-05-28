import { Injectable } from '@nestjs/common';
import { StubIntegration } from '../stub.base';

/**
 * Apex Legends — apexlegendsapi.com (Mozambique Here). Needs API key.
 * Docs: https://apexlegendsapi.com/#documentation
 *
 * Endpoint to wire:
 *   GET https://api.mozambiquehe.re/bridge?auth=<APEX_API_KEY>&player=<name>&platform=PC|PS4|X1|SWITCH
 *
 * Use `q.platform` to map: origin/steam→PC, psn→PS4, xbl→X1, switch→SWITCH.
 */
@Injectable()
export class ApexIntegration extends StubIntegration {
  readonly slug = 'apex' as const;
  readonly name = 'Apex Legends';
  readonly providerLabel = 'apexlegendsapi (Mozambique Here)';
  readonly envKey = 'APEX_API_KEY';
  readonly platforms = ['origin', 'psn', 'xbl', 'steam', 'switch'] as const;
}
