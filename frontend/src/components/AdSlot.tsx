'use client';

import { useEffect, useRef } from 'react';

interface Props {
  slot: string | undefined;          // ad slot id (env var)
  format?: string;                   // 'auto' | 'rectangle' | ...
  responsive?: boolean;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Wrapper around an AdSense <ins> element. Renders nothing if the AdSense
 * client id or the slot id is missing — so the same component is safe to drop
 * into a page even when ads are turned off in env.
 */
export function AdSlot({ slot, format = 'auto', responsive = true, className }: Props) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const ref = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    if (!client || !slot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch { /* ignore — adblockers throw here, the AdBlockNotice covers it */ }
  }, [client, slot]);

  if (!client || !slot) return null;

  return (
    <ins
      ref={ref}
      className={`adsbygoogle block ${className ?? ''}`}
      style={{ display: 'block' }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  );
}
