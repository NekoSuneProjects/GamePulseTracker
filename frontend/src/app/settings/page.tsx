'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';
import type { SocialKind, SocialLink } from '@gpt/shared';

const KINDS: SocialKind[] = ['twitter','twitch','youtube','discord','tiktok','kick','instagram','github','website'];

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [publicProfile, setPublicProfile] = useState(true);
  const [bio, setBio] = useState('');
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    setAvatarUrl(user.avatarUrl ?? '');
    setPublicProfile(user.publicProfile ?? true);
    setBio(user.bio ?? '');
    setSocials(user.socials ?? []);
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

  if (loading || !user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-display font-semibold">Settings</h1>
      <form onSubmit={save} className="glass p-6 space-y-4">
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
    </div>
  );
}
