'use client';

import { motion } from 'framer-motion';
import { ReactNode, useEffect, useState } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: boolean;
  trend?: 'up' | 'down' | 'flat';
}

export function StatCard({ label, value, hint, accent, trend }: Props) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={`glass p-4 md:p-5 relative overflow-hidden ${accent ? 'neon-border' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="text-xs uppercase tracking-wider text-ink-300">{label}</div>
        {trend && (
          <span className={trend === 'up' ? 'text-pulse-400' : trend === 'down' ? 'text-red-400' : 'text-ink-400'}>
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '–'}
          </span>
        )}
      </div>
      <div className="mt-2 text-3xl md:text-4xl font-display font-semibold neon-text">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-400">{hint}</div>}
      <div className="pointer-events-none absolute inset-0 shimmer opacity-50" />
    </motion.div>
  );
}

/** Animated number counter that eases from old → new on prop change. */
export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const start = display;
    const end = value;
    const duration = 600;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplay(start + (end - start) * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{display.toFixed(decimals)}</>;
}
