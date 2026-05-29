/**
 * Generic shop-item shape. Each integration may return zero or more
 * sections (e.g. Fortnite returns a daily + featured section).
 *
 * Designed for the simplest possible rendering — title, image, price,
 * optional rarity tag, optional sub-items (bundles).
 */
export interface ShopItem {
  id: string;
  name: string;
  imageUrl?: string;
  /** Display price (e.g. "1,500 V-Bucks", "Free"). */
  priceLabel: string;
  /** Numeric price in the shop's native currency, if known. */
  price?: number;
  /** Lowercased rarity slug ("common" / "rare" / "epic" / "legendary" / ...). */
  rarity?: string;
  /** Item type when known ("outfit", "emote", "wrap", "bundle", ...). */
  type?: string;
}

export interface ShopSection {
  /** Display name for the section (e.g. "Daily Shop", "Featured", "Bundles"). */
  name: string;
  items: ShopItem[];
}

export interface ShopResponse {
  game: string;
  /** When the shop was last fetched from the provider. */
  fetchedAt: string;
  /** When the provider says this rotation expires, if known (ISO timestamp). */
  expiresAt?: string;
  sections: ShopSection[];
}
