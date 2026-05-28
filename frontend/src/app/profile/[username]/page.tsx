import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { SocialLink } from '@gpt/shared';
import { serverFetch } from '@/lib/api-server';

interface PublicProfile {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  socials: SocialLink[];
  createdAt: string;
  linkedAccounts: Array<{ id: string; platform: string; displayName: string; verified: boolean }>;
  trackedProfiles: Array<{ id: string; game: string; platform: string; providerId: string; displayName: string; avatarUrl: string | null; lastFetchedAt: string | null }>;
}

const SOCIAL_ICON: Record<string, string> = {
  twitter: '𝕏', twitch: '🟣', youtube: '▶', discord: '🟦',
  tiktok: '🎵', kick: '🦵', instagram: '📷', github: '🐙', website: '🌐',
};

export default async function UserProfilePage({ params }: { params: { username: string } }) {
  const profile = await serverFetch<PublicProfile>(`/users/${encodeURIComponent(params.username)}`);
  if (!profile) notFound();

  return (
    <div className="space-y-8">
      <header className="glass-strong p-6 flex flex-col md:flex-row gap-4 items-start">
        <div className="h-16 w-16 rounded-xl bg-ink-700 grid place-items-center text-2xl font-display shrink-0">
          {profile.avatarUrl
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={profile.avatarUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
            : profile.username.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-display font-semibold">@{profile.username}</h1>
          <p className="text-ink-400 text-sm">Member since {new Date(profile.createdAt).toLocaleDateString()}</p>
          {profile.bio && <p className="text-ink-200 mt-2">{profile.bio}</p>}
          {profile.socials?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.socials.map((s, i) => {
                const href = s.value.startsWith('http') ? s.value : `https://${s.value.replace(/^@/, '')}`;
                return (
                  <a key={i} href={href} target="_blank" rel="noopener noreferrer"
                     className="chip-muted hover:bg-pulse-500/15 hover:text-pulse-300 hover:border-pulse-500/40">
                    <span aria-hidden>{SOCIAL_ICON[s.kind] ?? '🔗'}</span>
                    <span className="ml-1">{s.kind}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <section>
        <h2 className="font-display font-semibold mb-3">Tracked profiles</h2>
        {profile.trackedProfiles.length === 0 ? (
          <div className="glass p-6 text-ink-400 text-sm">No tracked profiles yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {profile.trackedProfiles.map(p => {
              const qs = p.platform && p.platform !== '_' ? `?platform=${encodeURIComponent(p.platform)}` : '';
              return (
                <Link key={p.id} href={`/games/${p.game}/${encodeURIComponent(p.providerId)}${qs}`} className="glass p-4 hover:border-pulse-500/50">
                  <div className="text-xs uppercase text-ink-400">{p.game}</div>
                  <div className="font-semibold mt-1">{p.displayName}</div>
                  <div className="text-xs text-ink-500 font-mono truncate">{p.providerId}</div>
                  {p.platform !== '_' && <div className="text-xs text-pulse-300 mt-1">{p.platform}</div>}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display font-semibold mb-3">Linked platforms</h2>
        {profile.linkedAccounts.length === 0 ? (
          <div className="glass p-6 text-ink-400 text-sm">No linked platforms.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profile.linkedAccounts.map(a => (
              <span key={a.id} className={a.verified ? 'chip' : 'chip-muted'}>
                {a.platform}: {a.displayName} {a.verified ? '✓' : ''}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
