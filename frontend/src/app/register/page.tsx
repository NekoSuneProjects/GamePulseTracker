'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await register(username, email, password);
      router.push('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-display font-semibold mb-2">Create account</h1>
      <p className="text-ink-400 mb-6">Track players, customize your dashboard, link platforms.</p>
      <form onSubmit={submit} className="glass p-6 space-y-4">
        <label className="block">
          <span className="text-sm text-ink-300">Username</span>
          <input className="input mt-1" value={username} onChange={e => setUsername(e.target.value)} required minLength={3} />
        </label>
        <label className="block">
          <span className="text-sm text-ink-300">Email</span>
          <input className="input mt-1" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm text-ink-300">Password</span>
          <input className="input mt-1" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
        </label>
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <button disabled={busy} className="btn-primary w-full">{busy ? 'Creating…' : 'Create account'}</button>
        <div className="text-sm text-ink-400 text-center">
          Already have one? <Link href="/login" className="text-pulse-400 hover:underline">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
