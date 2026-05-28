'use client';

import { useEffect, useState } from 'react';

/**
 * Polite ad-blocker detector. Tries to fetch a known AdSense URL via a
 * lightweight <img> probe. If the request is blocked or returns a network
 * error we assume an ad blocker, and show a soft banner.
 *
 * Disabled entirely if either NEXT_PUBLIC_ADSENSE_CLIENT is not set OR
 * NEXT_PUBLIC_ADBLOCK_NOTICE === 'false'.
 */
export function AdBlockNotice() {
  const enabled = Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT) && process.env.NEXT_PUBLIC_ADBLOCK_NOTICE !== 'false';
  const [blocked, setBlocked] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('gpt:adblock:dismissed') === '1') { setDismissed(true); return; }

    let cancelled = false;
    const test = document.createElement('img');
    test.src = 'https://pagead2.googlesyndication.com/pagead/show_ads.js';
    test.style.display = 'none';
    test.onerror = () => { if (!cancelled) setBlocked(true); };
    test.onload = () => { /* not blocked */ };
    document.body.appendChild(test);

    const timer = setTimeout(() => {
      if (cancelled) return;
      // Some adblockers neither error nor load — also check if adsbygoogle exists.
      if (typeof (window as { adsbygoogle?: unknown[] }).adsbygoogle === 'undefined') setBlocked(true);
    }, 1500);

    return () => { cancelled = true; clearTimeout(timer); test.remove(); };
  }, [enabled]);

  if (!enabled || dismissed || !blocked) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm glass-strong border border-pulse-500/40 p-4 shadow-glow text-sm">
      <div className="flex items-start gap-3">
        <div className="text-2xl" aria-hidden>📡</div>
        <div className="flex-1">
          <div className="font-semibold text-pulse-300">Ad blocker detected</div>
          <p className="text-ink-300 mt-1">
            GamePulseTracker is free and self-hosted. If you're on a public instance, please consider
            allow-listing this site so we can keep the servers running. We never load third-party trackers.
          </p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => { localStorage.setItem('gpt:adblock:dismissed', '1'); setDismissed(true); }}
              className="btn-ghost text-xs">Don't show again</button>
          </div>
        </div>
      </div>
    </div>
  );
}
