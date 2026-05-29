/**
 * Game catalog — single source of truth.
 * `slug`      — URL segment, DB key, integration registry id (lowercase, kebab-case)
 * `platforms` — selectable platforms in the lookup UI; empty array = platform-agnostic
 *               (the URL omits ?platform=... and the DB stores '_' as the platform sentinel)
 * `live`      — true if an integration ships wired to a real API; false if it's a stub
 *               (a stub becomes "enabled" when its env credentials are set, even before code is added)
 * `provider`  — short hint about who serves the data
 * `ingestOnly` — true if data only arrives via a companion (Overwolf/desktop) ingest API
 */
export interface GameCatalogEntry {
  slug: string;
  name: string;
  provider: string;
  live: boolean;
  ingestOnly?: boolean;
  platforms: readonly string[];
  /** Short marketing-style tagline shown on hub tiles. Optional. */
  tagline?: string;
  /** UI category for grouping in the hub. */
  category?: 'shooter' | 'mmo' | 'mc' | 'survival' | 'mobile' | 'vr' | 'moba' | 'racing' | 'other';
  /** Tailwind classes for the tile gradient ("from-... to-..."). Renders behind the title. */
  accent?: string;
}

export const PLATFORM_SENTINEL = '_';

export const GAME_CATALOG = [
  // ---- Live (free APIs) ----
  { slug: 'hypixel',         name: 'Hypixel',              provider: 'hypixel.net',      live: true,  platforms: ['minecraft'] },
  { slug: 'wynncraft',       name: 'Wynncraft',            provider: 'wynncraft.com',    live: true,  platforms: ['minecraft'] },
  { slug: 'osrs',            name: 'Old School RuneScape', provider: 'jagex hiscores',   live: true,  platforms: ['main', 'ironman', 'hardcore-ironman', 'ultimate-ironman'] },
  { slug: 'runescape',       name: 'RuneScape 3',          provider: 'jagex hiscores',   live: true,  platforms: ['main', 'ironman', 'hardcore-ironman'] },
  { slug: 'warframe',        name: 'Warframe',             provider: 'warframestat.us',  live: true,  platforms: ['pc', 'ps4', 'xb1', 'switch'] },
  { slug: 'wows',            name: 'World of Warships',    provider: 'Wargaming.net',    live: true,  platforms: ['na', 'eu', 'asia'] },
  { slug: 'wot',             name: 'World of Tanks',       provider: 'Wargaming.net',    live: true,  platforms: ['na', 'eu', 'asia'] },
  { slug: 'wowp',            name: 'World of Warplanes',   provider: 'Wargaming.net',    live: true,  platforms: ['na', 'eu'] },
  { slug: 'roblox',          name: 'Roblox',               provider: 'roblox.com',       live: true,  platforms: ['roblox'] },

  // ---- Multi-platform competitive shooters / battle royale (stubs) ----
  { slug: 'fortnite',        name: 'Fortnite',             provider: 'fortnite-api.com', live: false, platforms: ['epic', 'psn', 'xbl', 'switch'] },
  { slug: 'apex',            name: 'Apex Legends',         provider: 'apexlegendsapi',   live: false, platforms: ['origin', 'psn', 'xbl', 'steam', 'switch'] },
  { slug: 'r6-siege',        name: 'Rainbow Six Siege',    provider: 'Ubisoft / r6tracker', live: false, platforms: ['pc', 'psn', 'xbl'] },
  { slug: 'valorant',        name: 'Valorant',             provider: 'Riot VAL-* API',   live: false, platforms: ['na', 'eu', 'ap', 'br', 'kr', 'latam'] },
  { slug: 'overwatch-2',     name: 'Overwatch 2',          provider: 'playoverwatch.com scrape', live: false, platforms: ['battle.net', 'psn', 'xbl', 'switch'] },
  { slug: 'splitgate',       name: 'Splitgate',            provider: 'none / manual',    live: false, platforms: ['pc', 'psn', 'xbl'] },
  { slug: 'marvel-rivals',   name: 'Marvel Rivals',        provider: 'community',        live: false, platforms: ['pc', 'psn', 'xbl'] },
  { slug: 'bloodhunt',       name: 'Bloodhunt',            provider: 'none / manual',    live: false, platforms: ['pc'] },

  // ---- Halo + Destiny family ----
  { slug: 'halo-infinite',   name: 'Halo Infinite',        provider: 'community Waypoint mirror', live: false, platforms: ['xbl', 'pc', 'switch'] },
  { slug: 'destiny',         name: 'Destiny',              provider: 'bungie.net',       live: false, platforms: ['xbl', 'psn'] },
  { slug: 'destiny-2',       name: 'Destiny 2',            provider: 'bungie.net',       live: false, platforms: ['steam', 'xbl', 'psn', 'epic', 'stadia'] },

  // ---- Battlefield (specific titles) ----
  { slug: 'battlefield-3',         name: 'Battlefield 3',         provider: 'gametools.network', live: false, platforms: ['pc', 'psn', 'xbl'] },
  { slug: 'battlefield-4',         name: 'Battlefield 4',         provider: 'gametools.network', live: false, platforms: ['pc', 'psn', 'xbl'] },
  { slug: 'battlefield-hardline',  name: 'Battlefield Hardline',  provider: 'gametools.network', live: false, platforms: ['pc', 'psn', 'xbl'] },
  { slug: 'battlefield-1',         name: 'Battlefield 1',         provider: 'gametools.network', live: false, platforms: ['pc', 'psn', 'xbl'] },
  { slug: 'battlefield-5',         name: 'Battlefield V',         provider: 'gametools.network', live: false, platforms: ['pc', 'psn', 'xbl'] },
  { slug: 'battlefield-2042',      name: 'Battlefield 2042',      provider: 'gametools.network', live: false, platforms: ['pc', 'psn', 'xbl'] },

  // ---- Call of Duty (Activision shut public API; stubs only) ----
  { slug: 'cod-warzone',  name: 'CoD: Warzone 2.0',         provider: 'no official API', live: false, platforms: ['activision', 'psn', 'xbl', 'steam', 'battle.net'] },
  { slug: 'cod-cold-war', name: 'CoD: Black Ops Cold War',  provider: 'no official API', live: false, platforms: ['activision', 'psn', 'xbl', 'steam', 'battle.net'] },
  { slug: 'cod-mwii',     name: 'CoD: Modern Warfare II',   provider: 'no official API', live: false, platforms: ['activision', 'psn', 'xbl', 'steam', 'battle.net'] },
  { slug: 'cod-mwiii',    name: 'CoD: Modern Warfare III',  provider: 'no official API', live: false, platforms: ['activision', 'psn', 'xbl', 'steam', 'battle.net'] },
  { slug: 'cod-bo6',      name: 'CoD: Black Ops 6',         provider: 'no official API', live: false, platforms: ['activision', 'psn', 'xbl', 'steam', 'battle.net'] },

  // ---- The Division / For Honor / CS ----
  { slug: 'the-division',   name: 'The Division',     provider: 'none / community', live: false, platforms: ['pc', 'psn', 'xbl'] },
  { slug: 'the-division-2', name: 'The Division 2',   provider: 'none / community', live: false, platforms: ['pc', 'psn', 'xbl'] },
  { slug: 'for-honor',      name: 'For Honor',        provider: 'none / community', live: false, platforms: ['pc', 'psn', 'xbl'] },
  { slug: 'cs2',            name: 'CS2 / CS:GO',      provider: 'Steam Web API',    live: false, platforms: ['steam'] },
  { slug: 'rocket-league',  name: 'Rocket League',    provider: 'ballchasing.com',  live: false, platforms: ['epic', 'steam', 'psn', 'xbl', 'switch'] },

  // ---- MOBA / autobattler ----
  { slug: 'lol', name: 'League of Legends', provider: 'Riot LoL API', live: false, platforms: ['na', 'euw', 'eune', 'kr', 'br', 'jp', 'lan', 'las', 'oce', 'tr', 'ru', 'vn'] },
  { slug: 'tft', name: 'Teamfight Tactics', provider: 'Riot TFT API', live: false, platforms: ['na', 'euw', 'eune', 'kr', 'br', 'jp', 'lan', 'las', 'oce', 'tr', 'ru', 'vn'] },

  // ---- Mobile / Supercell ----
  { slug: 'clash-of-clans', name: 'Clash of Clans',   provider: 'Supercell official', live: true,  platforms: ['player', 'clan'] },

  // ---- VR + rhythm ----
  { slug: 'beat-saber',     name: 'Beat Saber',       provider: 'ScoreSaber',       live: true,  platforms: ['pcvr', 'quest'] },

  // ---- Ingest-only / specialty ----
  { slug: 'arc-raiders',    name: 'Arc Raiders',      provider: 'companion ingest', live: false, ingestOnly: true, platforms: ['pc'] },
  { slug: 'vrchat-worlds',  name: 'VRChat Worlds',    provider: 'vrchat.cloud',     live: true,  platforms: ['vrchat'] },
] as const satisfies readonly GameCatalogEntry[];

export type GameSlug = typeof GAME_CATALOG[number]['slug'];
export const GAME_SLUGS: readonly GameSlug[] = GAME_CATALOG.map(g => g.slug);

/**
 * Per-game UI accents. Kept separate from the catalog rather than baked into
 * every entry so adding a new game doesn't force the operator to pick a
 * colour palette before they ship — entries without an accent get a neutral
 * fallback in the UI.
 *
 * Values are Tailwind gradient class fragments — the consumer composes
 * `bg-gradient-to-br <accent>`.
 */
export const GAME_ACCENTS: Partial<Record<GameSlug, string>> = {
  hypixel:           'from-yellow-600 to-red-700',
  wynncraft:         'from-teal-600 to-blue-800',
  osrs:              'from-amber-700 to-yellow-900',
  runescape:         'from-orange-700 to-amber-900',
  'clash-of-clans':  'from-yellow-500 to-red-700',
  warframe:          'from-amber-400 to-zinc-800',
  wot:               'from-stone-600 to-zinc-900',
  wows:              'from-blue-700 to-slate-900',
  wowp:              'from-sky-700 to-slate-900',
  roblox:            'from-red-600 to-rose-900',
  'beat-saber':      'from-pink-500 to-cyan-500',
  'vrchat-worlds':   'from-violet-600 to-fuchsia-900',
  fortnite:          'from-yellow-400 to-purple-700',
  apex:              'from-orange-600 to-red-900',
  valorant:          'from-red-600 to-rose-950',
  'overwatch-2':     'from-orange-400 to-amber-700',
  'r6-siege':        'from-slate-700 to-orange-700',
  'rocket-league':   'from-cyan-500 to-pink-600',
  'halo-infinite':   'from-blue-600 to-indigo-900',
  splitgate:         'from-purple-600 to-blue-900',
  'marvel-rivals':   'from-red-500 to-blue-700',
  bloodhunt:         'from-red-800 to-zinc-950',
  destiny:           'from-amber-600 to-stone-900',
  'destiny-2':       'from-amber-500 to-stone-900',
  'battlefield-1':       'from-amber-700 to-stone-900',
  'battlefield-3':       'from-blue-700 to-zinc-900',
  'battlefield-4':       'from-orange-600 to-zinc-900',
  'battlefield-5':       'from-stone-600 to-zinc-900',
  'battlefield-hardline':'from-yellow-600 to-red-800',
  'battlefield-2042':    'from-amber-600 to-stone-900',
  'cod-warzone':     'from-emerald-700 to-zinc-900',
  'cod-cold-war':    'from-orange-700 to-zinc-900',
  'cod-mwii':        'from-stone-600 to-zinc-900',
  'cod-mwiii':       'from-stone-700 to-zinc-900',
  'cod-bo6':         'from-orange-600 to-zinc-900',
  'the-division':    'from-orange-500 to-zinc-900',
  'the-division-2':  'from-orange-600 to-zinc-900',
  'for-honor':       'from-red-700 to-stone-900',
  cs2:               'from-yellow-600 to-stone-900',
  lol:               'from-amber-500 to-blue-900',
  tft:               'from-purple-500 to-blue-900',
  'arc-raiders':     'from-emerald-600 to-zinc-900',
};

export const GAME_ACCENT_FALLBACK = 'from-pulse-600 to-ink-900';

export function gameAccent(slug: string): string {
  return GAME_ACCENTS[slug as GameSlug] ?? GAME_ACCENT_FALLBACK;
}

export function getGame(slug: string): GameCatalogEntry | undefined {
  return GAME_CATALOG.find(g => g.slug === slug);
}

/** All distinct platform tokens across all games. */
export const PLATFORMS = [
  'epic', 'ea', 'origin', 'activision', 'bungie', 'riot',
  'steam', 'xbl', 'psn', 'switch', 'mobile',
  'battle.net', 'stadia',
  'discord', 'minecraft', 'jagex', 'roblox', 'vrchat',
  // Wargaming regions
  'na', 'eu', 'asia',
  // Riot regions (also shared with LoL/TFT)
  'euw', 'eune', 'kr', 'br', 'jp', 'lan', 'las', 'oce', 'tr', 'ru', 'vn', 'ap', 'latam',
  // OSRS / RS3 modes
  'main', 'ironman', 'hardcore-ironman', 'ultimate-ironman',
  // Warframe consoles
  'pc', 'ps4', 'xb1',
  // VR
  'pcvr', 'quest',
] as const;
export type Platform = typeof PLATFORMS[number];

/** Common platform => display label for the UI dropdown. */
export const PLATFORM_LABELS: Record<string, string> = {
  pc: 'PC',
  steam: 'Steam',
  epic: 'Epic Games',
  origin: 'EA / Origin',
  ea: 'EA',
  activision: 'Activision ID',
  battle: 'Battle.net',
  'battle.net': 'Battle.net',
  bungie: 'Bungie',
  psn: 'PlayStation',
  xbl: 'Xbox Live',
  switch: 'Nintendo Switch',
  ps4: 'PlayStation 4',
  xb1: 'Xbox One',
  na: 'Americas',
  eu: 'Europe',
  asia: 'Asia',
  euw: 'EU West',
  eune: 'EU Nordic / East',
  kr: 'Korea',
  jp: 'Japan',
  br: 'Brazil',
  lan: 'LAN',
  las: 'LAS',
  oce: 'Oceania',
  tr: 'Turkey',
  ru: 'Russia',
  vn: 'Vietnam',
  main: 'Main',
  ironman: 'Ironman',
  'hardcore-ironman': 'Hardcore Ironman',
  'ultimate-ironman': 'Ultimate Ironman',
  minecraft: 'Minecraft',
  jagex: 'Jagex',
  roblox: 'Roblox',
  vrchat: 'VRChat',
  discord: 'Discord',
  stadia: 'Stadia',
  mobile: 'Mobile',
  riot: 'Riot',
  pcvr: 'PC VR (Steam)',
  quest: 'Meta Quest',
};
