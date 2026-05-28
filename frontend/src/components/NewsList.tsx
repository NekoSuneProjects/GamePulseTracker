import type { NewsItem } from '@gpt/shared';

interface Props { items: NewsItem[]; }

export function NewsList({ items }: Props) {
  if (!items?.length) {
    return <div className="glass p-6 text-ink-400 text-sm">No news yet — try again in a few minutes once the news scheduler has run.</div>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map(n => (
        <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer"
           className="glass p-4 hover:border-pulse-500/50 transition-all flex flex-col gap-2">
          {n.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={n.imageUrl} alt="" className="rounded-lg w-full h-32 object-cover" />
          )}
          <div className="text-xs text-pulse-400 uppercase tracking-wider">{n.source}</div>
          <div className="font-semibold text-ink-100 line-clamp-2">{n.title}</div>
          {n.summary && <div className="text-sm text-ink-300 line-clamp-3">{n.summary}</div>}
          <div className="text-xs text-ink-500 mt-auto">{new Date(n.publishedAt).toLocaleString()}</div>
        </a>
      ))}
    </div>
  );
}
