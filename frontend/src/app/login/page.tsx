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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await login(identifier, password);
      router.push('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Login failed');
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
          <input className="input mt-1" value={identifier} onChange={e => setIdentifier(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm text-ink-300">Password</span>
          <input className="input mt-1" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </label>
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <button disabled={busy} className="btn-primary w-full">{busy ? 'Signing in…' : 'Sign in'}</button>
        <div className="text-sm text-ink-400 text-center">
          No account? <Link href="/register" className="text-pulse-400 hover:underline">Create one</Link>
        </div>
      </form>
    </div>
  );
}
