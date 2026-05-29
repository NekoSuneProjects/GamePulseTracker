import type { ShopResponse } from '@gpt/shared';

interface Props {
  shop: ShopResponse;
}

/**
 * Generic shop renderer used by any game whose integration implements
 * getShop(). Currently wired for Fortnite — others can opt in later
 * without UI changes.
 *
 * Rendering is intentionally minimal: name, image, rarity chip, price.
 * If a section has more than 12 items we cap it; if you want the full
 * shop, hit the API directly.
 */
const RARITY_COLOR: Record<string, string> = {
  common:    'bg-gray-500/40 text-gray-200',
  uncommon:  'bg-emerald-500/40 text-emerald-200',
  rare:      'bg-sky-500/40 text-sky-200',
  epic:      'bg-purple-500/40 text-purple-200',
  legendary: 'bg-orange-500/40 text-orange-200',
  mythic:    'bg-yellow-500/40 text-yellow-200',
  marvel:    'bg-red-500/40 text-red-200',
  dc:        'bg-blue-500/40 text-blue-200',
  gaminglegends: 'bg-violet-500/40 text-violet-200',
};

export function ShopGrid({ shop }: Props) {
  if (!shop.sections.length) {
    return (
      <div className="glass p-6 text-ink-400 text-sm">
        Shop data is currently unavailable.
      </div>
    );
  }
  return (
    <div className="space-y-8">
      {shop.sections.map(sec => (
        <section key={sec.name}>
          <h3 className="text-sm uppercase tracking-wider text-ink-400 mb-3">{sec.name}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {sec.items.slice(0, 24).map(item => (
              <div key={item.id} className="glass p-3 space-y-2">
                {item.imageUrl ? (
                  <div className="relative w-full aspect-square overflow-hidden rounded">
                    {/* Use a vanilla <img> rather than next/image — Fortnite asset CDN
                        rotates URLs daily and we'd otherwise cache a stale optimised copy. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.imageUrl} alt={item.name} className="object-cover w-full h-full" loading="lazy" />
                  </div>
                ) : (
                  <div className="w-full aspect-square bg-ink-800 rounded" />
                )}
                <div className="text-sm font-medium truncate">{item.name}</div>
                <div className="flex justify-between items-center text-xs">
                  {item.rarity ? (
                    <span className={`px-2 py-0.5 rounded ${RARITY_COLOR[item.rarity] ?? 'bg-ink-700 text-ink-200'}`}>
                      {item.rarity}
                    </span>
                  ) : <span />}
                  <span className="text-ink-300 font-mono">{item.priceLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
