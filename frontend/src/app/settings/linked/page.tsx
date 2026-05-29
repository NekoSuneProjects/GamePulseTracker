'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';
import { GAMING_BRANDS, SOCIAL_BRANDS, type PlatformBrand } from '@/lib/platform-brands';
import type { SocialKind, SocialLink } from '@gpt/shared';

interface LinkedAccount {
  id: string;
  platform: string;
  providerId: string;
  displayName: string;
  verified: boolean;
  autoResolve: boolean;
}

const KIND_TO_LABEL: Partial<Record<SocialKind, string>> = {
  twitter: 'Twitter / X',
  twitch:  'Twitch',
  youtube: 'YouTube',
  discord: 'Discord',
};

/**
 * Linked Accounts redesign — card grid in the style of Tracker Network's
 * Account Management page. Two sections:
 *
 *  - Gaming platforms (LinkedAccount rows keyed by platform).
 *  - Social platforms (User.socials JSON — handled via the existing
 *    /users/me/settings PATCH).
 *
 * Each card has the brand colour + abbreviation + handle + a green check
 * when `verified=true`, plus inline actions: re-resolve, unlink. Empty
 * cards (no link yet) show a "+ Link" prompt that opens an inline form.
 */
export default function SettingsLinkedPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [providerId, setProviderId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    try {
      const list = await api<LinkedAccount[] | null>('/connections', { auth: true });
      setAccounts(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed to load accounts');
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    setSocials(Array.isArray(user.socials) ? user.socials : []);
    void refreshList();
  }, [loading, user, router, refreshList]);

  if (loading || !user) return null;

  const byPlatform = new Map(accounts.map(a => [a.platform, a]));
  const socialBySlug = new Map(socials.map(s => [s.kind as string, s]));

  async function unlink(id: string) {
    if (!confirm('Unlink this account? You can re-link any time.')) return;
    try {
      await api(`/connections/${id}`, { method: 'DELETE', auth: true });
      await refreshList();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Unlink failed');
    }
  }

  async function reResolve(id: string) {
    try {
      const res = await api<{ changed: boolean; oldProviderId?: string; newProviderId?: string }>(
        `/connections/${id}/re-resolve`, { method: 'POST', auth: true });
      if (res.changed) {
        alert(`Provider ID updated: ${res.oldProviderId} → ${res.newProviderId}`);
      } else {
        alert('Already up to date.');
      }
      await refreshList();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Re-resolve failed');
    }
  }

  async function submitLink(platform: string, e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await api('/connections', {
        method: 'POST', auth: true,
        body: JSON.stringify({ platform, providerId, displayName: displayName || providerId }),
      });
      setProviderId(''); setDisplayName(''); setOpenSlug(null);
      await refreshList();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Link failed');
    } finally { setBusy(false); }
  }

  async function setSocial(kind: SocialKind, value: string) {
    const next = value
      ? [...socials.filter(s => s.kind !== kind), { kind, value }]
      : socials.filter(s => s.kind !== kind);
    setSocials(next);
    try {
      await api('/users/me/settings', {
        method: 'PATCH', auth: true,
        body: JSON.stringify({ socials: next }),
      });
      await refresh();
    } catch (e) {
      // Revert on failure.
      setSocials(socials);
      alert(e instanceof ApiError ? e.message : 'Save failed');
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-display font-semibold">Linked accounts</h1>
        <p className="text-ink-400 text-sm mt-1">
          Connect your gaming + social platforms so your tracked profiles show up
          on your public page and auto-resolve when platforms rotate your IDs.
        </p>
      </header>

      {err && <div className="glass p-3 text-sm text-red-400">{err}</div>}

      <section>
        <h2 className="font-display font-semibold text-lg mb-3">Gaming platforms</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {GAMING_BRANDS.map(b => (
            <PlatformCard
              key={b.slug}
              brand={b}
              account={byPlatform.get(b.slug)}
              isOpen={openSlug === b.slug}
              onOpenLink={() => { setOpenSlug(b.slug); setErr(null); }}
              onCancelLink={() => setOpenSlug(null)}
              onSubmitLink={e => submitLink(b.slug, e)}
              providerId={providerId} setProviderId={setProviderId}
              displayName={displayName} setDisplayName={setDisplayName}
              busy={busy}
              onUnlink={unlink}
              onReResolve={reResolve}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display font-semibold text-lg mb-3">Social platforms</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {SOCIAL_BRANDS.map(b => (
            <SocialCard
              key={b.slug}
              brand={b}
              current={socialBySlug.get(b.slug)?.value ?? ''}
              onSave={value => setSocial(b.slug as SocialKind, value)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

interface PlatformCardProps {
  brand: PlatformBrand;
  account?: LinkedAccount;
  isOpen: boolean;
  onOpenLink: () => void;
  onCancelLink: () => void;
  onSubmitLink: (e: React.FormEvent) => void;
  providerId: string; setProviderId: (s: string) => void;
  displayName: string; setDisplayName: (s: string) => void;
  busy: boolean;
  onUnlink: (id: string) => void;
  onReResolve: (id: string) => void;
}

function PlatformCard(p: PlatformCardProps) {
  const linked = Boolean(p.account);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink-700/60 min-h-[140px]">
      <div className={`absolute inset-0 bg-gradient-to-br ${p.brand.accent}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/40 to-transparent" />
      <div className="relative h-full p-3 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-ink-950/40 backdrop-blur flex items-center justify-center font-display font-bold text-sm">
              {p.brand.abbr}
            </div>
            <div>
              <div className="text-sm font-medium">{p.brand.label}</div>
              {linked && p.account!.verified && (
                <div className="text-[10px] text-emerald-300 flex items-center gap-1 mt-0.5">
                  <span aria-hidden>✓</span> verified
                </div>
              )}
            </div>
          </div>
          {linked && (
            <button onClick={() => p.onUnlink(p.account!.id)} aria-label="Unlink" title="Unlink"
              className="text-ink-300 hover:text-red-400 text-lg leading-none">×</button>
          )}
        </div>

        {linked ? (
          <div className="space-y-1.5">
            <div className="text-sm font-mono truncate" title={p.account!.providerId}>
              {p.account!.displayName}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-ink-300/80 truncate">
              {p.account!.providerId}
            </div>
            <button
              onClick={() => p.onReResolve(p.account!.id)}
              className="text-[11px] text-ink-200 hover:text-pulse-300 underline underline-offset-2"
            >
              Re-resolve
            </button>
          </div>
        ) : p.isOpen ? (
          <form onSubmit={p.onSubmitLink} className="space-y-1.5">
            <input
              autoFocus
              value={p.providerId}
              onChange={e => p.setProviderId(e.target.value)}
              placeholder="Account ID or handle"
              required maxLength={128}
              className="w-full bg-ink-950/60 border border-ink-700 rounded px-2 py-1 text-xs"
            />
            <input
              value={p.displayName}
              onChange={e => p.setDisplayName(e.target.value)}
              placeholder="Display name (optional)"
              maxLength={128}
              className="w-full bg-ink-950/60 border border-ink-700 rounded px-2 py-1 text-xs"
            />
            <div className="flex gap-1">
              <button disabled={p.busy} className="text-[11px] px-2 py-1 bg-pulse-500 text-ink-950 rounded font-medium">
                {p.busy ? '…' : 'Link'}
              </button>
              <button type="button" onClick={p.onCancelLink} className="text-[11px] px-2 py-1 bg-ink-800/60 rounded">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={p.onOpenLink}
            className="text-[11px] text-ink-100 hover:text-pulse-300 self-start px-2 py-1 rounded border border-ink-700/60 bg-ink-950/40"
          >
            + Link account
          </button>
        )}
      </div>
    </div>
  );
}

interface SocialCardProps {
  brand: PlatformBrand;
  current: string;
  onSave: (value: string) => void;
}

function SocialCard({ brand, current, onSave }: SocialCardProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current);

  function commit() {
    setEditing(false);
    if (value !== current) onSave(value.trim());
  }

  const linked = Boolean(current);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink-700/60 min-h-[120px]">
      <div className={`absolute inset-0 bg-gradient-to-br ${brand.accent}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/40 to-transparent" />
      <div className="relative h-full p-3 flex flex-col justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-ink-950/40 backdrop-blur flex items-center justify-center font-display font-bold text-xs">
            {brand.abbr}
          </div>
          <div className="text-sm font-medium">{KIND_TO_LABEL[brand.slug as SocialKind] ?? brand.label}</div>
        </div>

        {editing ? (
          <div className="space-y-1.5">
            <input
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="@handle or URL"
              maxLength={256}
              onBlur={commit}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setValue(current); setEditing(false); } }}
              className="w-full bg-ink-950/60 border border-ink-700 rounded px-2 py-1 text-xs"
            />
          </div>
        ) : linked ? (
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-mono truncate" title={current}>{current}</div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setEditing(true)} className="text-[11px] text-ink-200 hover:text-pulse-300">edit</button>
              <button onClick={() => onSave('')} className="text-[11px] text-ink-200 hover:text-red-400">×</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-[11px] text-ink-100 hover:text-pulse-300 self-start px-2 py-1 rounded border border-ink-700/60 bg-ink-950/40"
          >
            + Add
          </button>
        )}
      </div>
    </div>
  );
}
