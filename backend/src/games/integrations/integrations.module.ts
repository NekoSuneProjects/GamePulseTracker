import { Global, Module, OnModuleInit } from '@nestjs/common';
import { IntegrationRegistry } from './integration.registry';

// Live integrations
import { HypixelIntegration }     from './hypixel/hypixel.integration';
import { WynncraftIntegration }   from './wynncraft/wynncraft.integration';
import { OsrsIntegration }        from './osrs/osrs.integration';
import { RunescapeIntegration }   from './runescape/runescape.integration';
import { WarframeIntegration }    from './warframe/warframe.integration';
import { WotIntegration }         from './wargaming/wot.integration';
import { WowsIntegration }        from './wargaming/wows.integration';
import { WowpIntegration }        from './wargaming/wowp.integration';
import { RobloxIntegration }      from './roblox/roblox.integration';
import { BeatSaberIntegration }   from './beat-saber/beat-saber.integration';

// Stubs (multi-platform)
import { FortniteIntegration }      from './fortnite/fortnite.integration';
import { ApexIntegration }          from './apex/apex.integration';
import { MarvelRivalsIntegration }  from './marvel-rivals/marvel-rivals.integration';
import { HaloInfiniteIntegration }  from './halo-infinite/halo-infinite.integration';
import { RocketLeagueIntegration }  from './rocket-league/rocket-league.integration';
import { Cs2Integration }           from './cs2/cs2.integration';
import { SplitgateIntegration }     from './splitgate/splitgate.integration';
import { DestinyIntegration }       from './destiny/destiny.integration';
import { Destiny2Integration }      from './destiny-2/destiny-2.integration';
import { R6SiegeIntegration }       from './r6-siege/r6-siege.integration';
import { ValorantIntegration }      from './valorant/valorant.integration';
import { Overwatch2Integration }    from './overwatch-2/overwatch-2.integration';
import { BloodhuntIntegration }     from './bloodhunt/bloodhunt.integration';
import { TheDivisionIntegration }   from './the-division/the-division.integration';
import { TheDivision2Integration }  from './the-division-2/the-division-2.integration';
import { ForHonorIntegration }      from './for-honor/for-honor.integration';
import { LolIntegration }           from './lol/lol.integration';
import { TftIntegration }           from './tft/tft.integration';
import { ArcRaidersIntegration }    from './arc-raiders/arc-raiders.integration';
import { VrchatWorldsIntegration }  from './vrchat-worlds/vrchat-worlds.integration';
import { VrchatAuthService }        from './vrchat-worlds/vrchat-auth.service';

// Battlefield titles (share base)
import { Battlefield3Integration }        from './battlefield/battlefield-3.integration';
import { Battlefield4Integration }        from './battlefield/battlefield-4.integration';
import { BattlefieldHardlineIntegration } from './battlefield/battlefield-hardline.integration';
import { Battlefield1Integration }        from './battlefield/battlefield-1.integration';
import { Battlefield5Integration }        from './battlefield/battlefield-5.integration';
import { Battlefield2042Integration }     from './battlefield/battlefield-2042.integration';

// CoD titles (share base)
import { CodWarzoneIntegration } from './cod/cod-warzone.integration';
import { CodColdWarIntegration } from './cod/cod-cold-war.integration';
import { CodMwiiIntegration }    from './cod/cod-mwii.integration';
import { CodMwiiiIntegration }   from './cod/cod-mwiii.integration';
import { CodBo6Integration }     from './cod/cod-bo6.integration';

const integrations = [
  // Live
  HypixelIntegration, WynncraftIntegration, OsrsIntegration, RunescapeIntegration,
  WarframeIntegration, WotIntegration, WowsIntegration, WowpIntegration, RobloxIntegration,
  BeatSaberIntegration,
  // Stubs (single-class)
  FortniteIntegration, ApexIntegration, MarvelRivalsIntegration, HaloInfiniteIntegration,
  RocketLeagueIntegration, Cs2Integration, SplitgateIntegration, DestinyIntegration,
  Destiny2Integration, R6SiegeIntegration, ValorantIntegration, Overwatch2Integration,
  BloodhuntIntegration, TheDivisionIntegration, TheDivision2Integration, ForHonorIntegration,
  LolIntegration, TftIntegration, ArcRaidersIntegration, VrchatWorldsIntegration,
  // Battlefield
  Battlefield3Integration, Battlefield4Integration, BattlefieldHardlineIntegration,
  Battlefield1Integration, Battlefield5Integration, Battlefield2042Integration,
  // CoD
  CodWarzoneIntegration, CodColdWarIntegration, CodMwiiIntegration, CodMwiiiIntegration, CodBo6Integration,
];

@Global()
@Module({
  providers: [IntegrationRegistry, VrchatAuthService, ...integrations],
  exports:   [IntegrationRegistry, VrchatAuthService, ...integrations],
})
export class IntegrationsModule implements OnModuleInit {
  constructor(
    private registry: IntegrationRegistry,
    // Inject every integration so Nest instantiates + registers them.
    private a01: HypixelIntegration,    private a02: WynncraftIntegration,
    private a03: OsrsIntegration,       private a04: RunescapeIntegration,
    private a05: WarframeIntegration,
    private a06: WotIntegration,        private a07: WowsIntegration,    private a08: WowpIntegration,
    private a09: RobloxIntegration,
    private a10: FortniteIntegration,   private a11: ApexIntegration,
    private a12: MarvelRivalsIntegration, private a13: HaloInfiniteIntegration,
    private a14: RocketLeagueIntegration, private a15: Cs2Integration,
    private a16: SplitgateIntegration,  private a17: DestinyIntegration,  private a18: Destiny2Integration,
    private a19: R6SiegeIntegration,    private a20: ValorantIntegration, private a21: Overwatch2Integration,
    private a22: BloodhuntIntegration,  private a23: TheDivisionIntegration, private a24: TheDivision2Integration,
    private a25: ForHonorIntegration,   private a26: LolIntegration,      private a27: TftIntegration,
    private a28: ArcRaidersIntegration, private a29: VrchatWorldsIntegration,
    private a30: Battlefield3Integration, private a31: Battlefield4Integration,
    private a32: BattlefieldHardlineIntegration, private a33: Battlefield1Integration,
    private a34: Battlefield5Integration, private a35: Battlefield2042Integration,
    private a36: CodWarzoneIntegration, private a37: CodColdWarIntegration,
    private a38: CodMwiiIntegration,    private a39: CodMwiiiIntegration, private a40: CodBo6Integration,
    private a41: BeatSaberIntegration,
  ) {}

  onModuleInit() {
    const all = [
      this.a01, this.a02, this.a03, this.a04, this.a05, this.a06, this.a07, this.a08, this.a09,
      this.a10, this.a11, this.a12, this.a13, this.a14, this.a15, this.a16, this.a17, this.a18,
      this.a19, this.a20, this.a21, this.a22, this.a23, this.a24, this.a25, this.a26, this.a27,
      this.a28, this.a29, this.a30, this.a31, this.a32, this.a33, this.a34, this.a35,
      this.a36, this.a37, this.a38, this.a39, this.a40, this.a41,
    ];
    for (const integ of all) this.registry.register(integ);
  }
}
