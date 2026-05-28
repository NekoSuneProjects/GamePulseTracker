import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import Script from 'next/script';
import { AuthProvider } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { AdBlockNotice } from '@/components/AdBlockNotice';

export const metadata: Metadata = {
  title: 'GamePulseTracker — multi-game player statistics',
  description: 'Real-time, self-hosted player tracking and leaderboards across 40+ games.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const adsense = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  return (
    <html lang="en" className="dark">
      <body>
        {adsense && (
          <Script
            id="adsbygoogle-js"
            async
            crossOrigin="anonymous"
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense}`}
          />
        )}
        <AuthProvider>
          <Navbar />
          <main className="mx-auto max-w-7xl px-4 py-6 md:py-10">{children}</main>
          <footer className="mt-16 border-t border-ink-700/50 py-8 text-center text-sm text-ink-400">
            <span className="font-display">GamePulseTracker</span> &middot; self-hosted &middot;
            <a href="/docs" className="ml-1 text-pulse-400 hover:underline">API docs</a>
          </footer>
          <AdBlockNotice />
        </AuthProvider>
      </body>
    </html>
  );
}
