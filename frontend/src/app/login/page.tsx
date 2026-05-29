'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needTotp, setNeedTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await login(identifier, password, needTotp ? totp : undefined);
      router.push('/');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'TOTP_REQUIRED') {
        setNeedTotp(true);
        setError('Enter the 6-digit code from your authenticator app.');
      } else {
        setError(e instanceof ApiError ? e.message : 'Login failed');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-display font-semibold mb-2">Log in</h1>
      <p className="text-ink-400 mb-6">Welcome back to GamePulseTracker.</p>
      <form onSubmit={submit} className="glass p-6 space-y-4">
        <label className="block">
          <span className="text-sm text-ink-300">Username or email</span>
          <input className="input mt-1" value={identifier} onChange={e => setIdentifier(e.target.value)} required disabled={needTotp} />
        </label>
        <label className="block">
          <span className="text-sm text-ink-300">Password</span>
          <input className="input mt-1" type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={needTotp} />
        </label>
        {needTotp && (
          <label className="block">
            <span className="text-sm text-ink-300">Two-factor code</span>
            <input className="input mt-1 font-mono" value={totp} onChange={e => setTotp(e.target.value)}
              placeholder="123456" inputMode="numeric" maxLength={6} required autoFocus autoComplete="one-time-code" />
          </label>
        )}
        {error && <div className={`text-sm ${needTotp ? 'text-ink-300' : 'text-red-400'}`}>{error}</div>}
        <button disabled={busy} className="btn-primary w-full">
          {busy ? 'Signing in…' : needTotp ? 'Verify code' : 'Sign in'}
        </button>
        <div className="text-sm text-ink-400 text-center">
          No account? <Link href="/register" className="text-pulse-400 hover:underline">Create one</Link>
        </div>
      </form>
    </div>
  );
}
