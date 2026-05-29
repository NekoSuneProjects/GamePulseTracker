'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, ApiError, clearTokens } from '@/lib/api';
import type { SocialKind, SocialLink } from '@gpt/shared';

const KINDS: SocialKind[] = ['twitter','twitch','youtube','discord','tiktok','kick','instagram','github','website'];

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  // ---- Profile section
  const [avatarUrl, setAvatarUrl] = useState('');
  const [publicProfile, setPublicProfile] = useState(true);
  const [bio, setBio] = useState('');
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // ---- Change username
  const [newUsername, setNewUsername] = useState('');
  const [usernamePw, setUsernamePw] = useState('');
  const [uMsg, setUMsg] = useState<string | null>(null);
  const [uErr, setUErr] = useState<string | null>(null);

  // ---- Change password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [pMsg, setPMsg] = useState<string | null>(null);
  const [pErr, setPErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    setAvatarUrl(user.avatarUrl ?? '');
    setPublicProfile(user.publicProfile ?? true);
    setBio(user.bio ?? '');
    setSocials(Array.isArray(user.socials) ? user.socials : []);
    setNewUsername(user.username);
  }, [loading, user, router]);

  function addSocial() { setSocials(s => [...s, { kind: 'twitter', value: '' }]); }
  function updateSocial(i: number, patch: Partial<SocialLink>) {
    setSocials(s => s.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  }
  function removeSocial(i: number) { setSocials(s => s.filter((_, idx) => idx !== i)); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      await api('/users/me/settings', {
        method: 'PATCH', auth: true,
        body: JSON.stringify({
          avatarUrl: avatarUrl || undefined, publicProfile, bio,
          socials: socials.filter(s => s.value.trim()),
        }),
      });
      await refresh();
      setMsg('Saved.');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Save failed');
    }
  }

  async function submitUsername(e: React.FormEvent) {
    e.preventDefault();
    setUMsg(null); setUErr(null);
    try {
      await api('/users/me/username', {
        method: 'PATCH', auth: true,
        body: JSON.stringify({ newUsername: newUsername.trim(), password: usernamePw }),
      });
      setUsernamePw('');
      await refresh();
      setUMsg('Username updated.');
    } catch (e) {
      setUErr(e instanceof ApiError ? e.message : 'Update failed');
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setPMsg(null); setPErr(null);
    if (newPw !== newPw2) {
      setPErr('New password and confirmation do not match.');
      return;
    }
    try {
      await api('/users/me/password', {
        method: 'PATCH', auth: true,
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      setCurrentPw(''); setNewPw(''); setNewPw2('');
      setPMsg('Password changed. You’ve been logged out on other devices.');
      // Server revoked our refresh tokens but kept the current access token
      // until it expires. Local copy is still valid; nothing to do here.
    } catch (e) {
      setPErr(e instanceof ApiError ? e.message : 'Update failed');
    }
  }

  function logoutEverywhere() {
    clearTokens();
    router.push('/login');
  }

  if (loading || !user) return null;

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-3xl font-display font-semibold">Settings</h1>

      {/* ---------- Profile ---------- */}
      <form onSubmit={save} className="glass p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg">Profile</h2>
        <label className="block">
          <span className="text-sm text-ink-300">Avatar URL</span>
          <input className="input mt-1" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." />
        </label>
        <label className="block">
          <span className="text-sm text-ink-300">Bio</span>
          <textarea className="input mt-1" rows={3} maxLength={512}
            value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell people who you are..." />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={publicProfile} onChange={e => setPublicProfile(e.target.checked)}
            className="h-4 w-4 accent-pulse-500" />
          <span className="text-sm">Make my profile public</span>
        </label>

        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-ink-300">Social links</span>
            <button type="button" onClick={addSocial} className="btn-ghost text-xs">+ Add</button>
          </div>
          <div className="space-y-2">
            {socials.map((s, i) => (
              <div key={i} className="grid grid-cols-[120px_1fr_auto] gap-2">
                <select value={s.kind} onChange={e => updateSocial(i, { kind: e.target.value as SocialKind })} className="input">
                  {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <input className="input" value={s.value} onChange={e => updateSocial(i, { value: e.target.value })}
                  placeholder="https://... or @handle" />
                <button type="button" onClick={() => removeSocial(i)} className="btn-danger text-xs">×</button>
              </div>
            ))}
            {socials.length === 0 && <div className="text-xs text-ink-500">No social links yet.</div>}
          </div>
        </div>

        {msg && <div className="text-pulse-400 text-sm">{msg}</div>}
        {err && <div className="text-red-400 text-sm">{err}</div>}
        <button className="btn-primary">Save changes</button>
      </form>

      {/* ---------- Change username ---------- */}
      <form onSubmit={submitUsername} className="glass p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg">Username</h2>
        <p className="text-xs text-ink-400">
          Current: <span className="font-mono">@{user.username}</span>.
          Changing your username updates all profile URLs immediately.
        </p>
        <label className="block">
          <span className="text-sm text-ink-300">New username</span>
          <input className="input mt-1" value={newUsername} onChange={e => setNewUsername(e.target.value)}
            placeholder="newname" minLength={3} maxLength={32} required />
        </label>
        <label className="block">
          <span className="text-sm text-ink-300">Current password</span>
          <input className="input mt-1" type="password" value={usernamePw} onChange={e => setUsernamePw(e.target.value)}
            placeholder="••••••••" required autoComplete="current-password" />
        </label>
        {uMsg && <div className="text-pulse-400 text-sm">{uMsg}</div>}
        {uErr && <div className="text-red-400 text-sm">{uErr}</div>}
        <button className="btn-primary">Change username</button>
      </form>

      {/* ---------- Change password ---------- */}
      <form onSubmit={submitPassword} className="glass p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg">Password</h2>
        <p className="text-xs text-ink-400">
          Changing your password signs out all other devices but keeps you logged
          in here. Hit the button below if you want to sign out everywhere too.
        </p>
        <label className="block">
          <span className="text-sm text-ink-300">Current password</span>
          <input className="input mt-1" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
            placeholder="••••••••" required autoComplete="current-password" />
        </label>
        <label className="block">
          <span className="text-sm text-ink-300">New password</span>
          <input className="input mt-1" type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
            minLength={8} maxLength={128} placeholder="At least 8 characters" required autoComplete="new-password" />
        </label>
        <label className="block">
          <span className="text-sm text-ink-300">Confirm new password</span>
          <input className="input mt-1" type="password" value={newPw2} onChange={e => setNewPw2(e.target.value)}
            minLength={8} maxLength={128} placeholder="Repeat new password" required autoComplete="new-password" />
        </label>
        {pMsg && <div className="text-pulse-400 text-sm">{pMsg}</div>}
        {pErr && <div className="text-red-400 text-sm">{pErr}</div>}
        <div className="flex gap-2">
          <button className="btn-primary">Change password</button>
          <button type="button" onClick={logoutEverywhere} className="btn-ghost text-sm">Sign out here too</button>
        </div>
      </form>
    </div>
  );
}
