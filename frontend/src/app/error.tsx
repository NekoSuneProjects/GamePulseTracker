'use client';

import { useEffect } from 'react';

/**
 * Global error boundary for the App Router. Catches any uncaught client-side
 * exception (or server-side render error in a server component) and shows the
 * actual error message instead of Next's bare "Application error: a
 * client-side exception has occurred" overlay.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Also log to console for the browser dev tools.
    // eslint-disable-next-line no-console
    console.error('[GamePulseTracker] uncaught render error:', error);
  }, [error]);

  return (
    <div className="glass-strong p-8 max-w-2xl mx-auto mt-12">
      <h1 className="text-2xl font-display font-semibold text-red-400 mb-3">Something went wrong</h1>
      <p className="text-ink-300 text-sm">{error.message || 'Unknown error'}</p>
      {error.digest && <p className="text-xs text-ink-500 mt-2 font-mono">digest: {error.digest}</p>}
      <details className="mt-4 text-xs text-ink-500">
        <summary className="cursor-pointer">stack trace</summary>
        <pre className="mt-2 whitespace-pre-wrap font-mono">{error.stack ?? '(no stack)'}</pre>
      </details>
      <div className="mt-6 flex gap-2">
        <button onClick={() => reset()} className="btn-primary">Try again</button>
        <a href="/" className="btn-ghost">Home</a>
      </div>
    </div>
  );
}
