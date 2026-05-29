/**
 * Brand metadata for the linked-accounts grid (gaming + social platforms).
 *
 * Each row maps a platform's slug → label + Tailwind gradient. We deliberately
 * don't ship raw logo SVGs from the brand owners — too many trademark
 * landmines for an OSS project. The card design uses the brand's signature
 * colour pair + the platform initials in big bold type, which is the same
 * shape tracker.gg uses on their "Account Management" page.
 */
export interface PlatformBrand {
  slug: string;
  label: string;
  /** Short visual abbreviation shown as the "logo". 1–3 chars. */
  abbr: string;
  /** Tailwind gradient fragment ("from-... to-..."). */
  accent: string;
}

export const GAMING_BRANDS: PlatformBrand[] = [
  { slug: 'xbl',         label: 'Xbox Live',     abbr: 'XB',  accent: 'from-green-600 to-green-900' },
  { slug: 'psn',         label: 'PlayStation',   abbr: 'PSN', accent: 'from-blue-600 to-blue-900' },
  { slug: 'steam',       label: 'Steam',         abbr: 'ST',  accent: 'from-stone-600 to-stone-900' },
  { slug: 'origin',      label: 'EA / Origin',   abbr: 'EA',  accent: 'from-orange-600 to-red-800' },
  { slug: 'ea',          label: 'EA',            abbr: 'EA',  accent: 'from-red-600 to-stone-900' },
  { slug: 'ubisoft',     label: 'Ubisoft',       abbr: 'UB',  accent: 'from-blue-500 to-indigo-900' },
  { slug: 'battle.net',  label: 'Battle.net',    abbr: 'BN',  accent: 'from-sky-500 to-sky-900' },
  { slug: 'epic',        label: 'Epic Games',    abbr: 'EP',  accent: 'from-zinc-700 to-zinc-950' },
  { slug: 'riot',        label: 'Riot Games',    abbr: 'RT',  accent: 'from-red-600 to-rose-950' },
  { slug: 'activision',  label: 'Activision',    abbr: 'AC',  accent: 'from-stone-700 to-zinc-950' },
  { slug: 'faceit',      label: 'FACEIT',        abbr: 'FC',  accent: 'from-orange-500 to-stone-900' },
  { slug: 'bungie',      label: 'Bungie',        abbr: 'BG',  accent: 'from-cyan-500 to-blue-900' },
];

export const SOCIAL_BRANDS: PlatformBrand[] = [
  { slug: 'twitch',  label: 'Twitch',  abbr: 'TW',  accent: 'from-violet-600 to-purple-900' },
  { slug: 'youtube', label: 'YouTube', abbr: 'YT',  accent: 'from-red-600 to-red-900' },
  { slug: 'discord', label: 'Discord', abbr: 'DS',  accent: 'from-indigo-500 to-indigo-900' },
  { slug: 'twitter', label: 'Twitter / X', abbr: 'X', accent: 'from-zinc-700 to-zinc-950' },
  { slug: 'reddit',  label: 'Reddit',  abbr: 'RD',  accent: 'from-orange-500 to-red-900' },
];
