import type { GameSlug } from './games';

export interface NewsItem {
  /** Stable id from source (URL or guid). */
  id: string;
  game: GameSlug;
  title: string;
  url: string;
  /** ISO date string. */
  publishedAt: string;
  source: string;          // e.g. "Hypixel Blog", "RuneScape News"
  summary?: string;
  imageUrl?: string;
  tags?: string[];
}
