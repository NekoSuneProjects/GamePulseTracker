'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';

interface EnrollResp { otpauth: string; secret: string }

export default function SecurityPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const [enroll, setEnroll] = useState<EnrollResp | null>(null);
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.push('/login');
  }, [loading, user, router]);

  async function startEnroll() {
    setErr(null);
    try {
      const data = await api<EnrollResp>('/auth/totp/enroll', { method: 'POST', auth: true });
      setEnroll(data);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Enroll failed');
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    try {
      await api('/auth/totp/verify', { method: 'POST', auth: true, body: JSON.stringify({ code }) });
      setEnroll(null); setCode('');
      await refresh();
      setMsg('Two-factor authentication enabled.');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Verify failed');
    }
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    try {
      await api('/auth/totp/disable', { method: 'POST', auth: true, body: JSON.stringify({ password: pw }) });
      setPw('');
      await refresh();
      setMsg('Two-factor authentication disabled.');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Disable failed');
    }
  }

  if (loading || !user) return null;

  // Render the otpauth URI as a QR code via the public chart endpoint. We
  // build the URL with explicit size/encoding so a copy-paste of the secret
  // is always available as a fallback.
  const qrUrl = enroll
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(enroll.otpauth)}`
    : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="font-display font-semibold text-xl">Two-factor authentication</h1>
        <p className="text-sm text-ink-400 mt-1">
          Adds a 6-digit code from your authenticator app on every login.
          Status: <span className={user.totpEnabled ? 'text-pulse-400' : 'text-ink-300'}>
            {user.totpEnabled ? 'enabled' : 'disabled'}
          </span>
        </p>
      </header>

      {msg && <div className="glass p-3 text-sm text-pulse-400">{msg}</div>}
      {err && <div className="glass p-3 text-sm text-red-400">{err}</div>}

      {!user.totpEnabled && !enroll && (
        <div className="glass p-6 space-y-3">
          <p className="text-sm text-ink-300">
            We'll generate a secret you can scan with Google Authenticator, Authy,
            or any TOTP app. After scanning, enter the current code to confirm.
          </p>
          <button onClick={startEnroll} className="btn-primary">Set up 2FA</button>
        </div>
      )}

      {enroll && (
        <form onSubmit={verify} className="glass p-6 space-y-4">
          <h2 className="font-display font-semibold">Scan + verify</h2>
          {qrUrl && (
            <div className="flex justify-center bg-white p-4 rounded">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="TOTP QR code" width={200} height={200} />
            </div>
          )}
          <div className="text-xs text-ink-400 break-all">
            Can't scan? Enter this secret manually:{' '}
            <code className="text-ink-200 font-mono">{enroll.secret}</code>
          </div>
          <label className="block">
            <span className="text-sm text-ink-300">6-digit code from your app</span>
            <input className="input mt-1 font-mono" value={code} onChange={e => setCode(e.target.value)}
              placeholder="123456" inputMode="numeric" maxLength={6} required autoComplete="one-time-code" />
          </label>
          <button className="btn-primary">Verify + enable</button>
        </form>
      )}

      {user.totpEnabled && (
        <form onSubmit={disable} className="glass p-6 space-y-4 border-red-500/30">
          <h2 className="font-display font-semibold text-red-300">Disable 2FA</h2>
          <p className="text-sm text-ink-400">
            Confirm with your password to drop the second factor. You can re-enable
            any time.
          </p>
          <label className="block">
            <span className="text-sm text-ink-300">Current password</span>
            <input className="input mt-1" type="password" value={pw} onChange={e => setPw(e.target.value)}
              required autoComplete="current-password" />
          </label>
          <button className="btn-danger">Disable 2FA</button>
        </form>
      )}
    </div>
  );
}
