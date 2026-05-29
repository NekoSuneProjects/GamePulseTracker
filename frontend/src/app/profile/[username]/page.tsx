import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { SocialLink } from '@gpt/shared';
import { serverFetch } from '@/lib/api-server';
import { FollowButton } from '@/components/FollowButton';

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

interface AchievementRow {
  slug: string; label: string; description: string; icon: string; unlockedAt: string;
}

interface FeedRow {
  id: string; kind: string; payload: Record<string, unknown>; createdAt: string;
}

interface FollowList {
  followers?: Array<{ follower: { id: string; username: string; avatarUrl: string | null }; createdAt: string }>;
  follows?: Array<{ followed: { id: string; username: string; avatarUrl: string | null }; createdAt: string }>;
}

const SOCIAL_ICON: Record<string, string> = {
  twitter: '𝕏', twitch: '🟣', youtube: '▶', discord: '🟦',
  tiktok: '🎵', kick: '🦵', instagram: '📷', github: '🐙', website: '🌐',
};

export default async function UserProfilePage({ params }: { params: { username: string } }) {
  const username = params.username;
  const [profile, achievements, activity, followers, following] = await Promise.all([
    serverFetch<PublicProfile>(`/users/${encodeURIComponent(username)}`),
    serverFetch<AchievementRow[]>(`/users/${encodeURIComponent(username)}/achievements`),
    serverFetch<FeedRow[]>(`/users/${encodeURIComponent(username)}/feed?limit=20`),
    serverFetch<FollowList>(`/users/${encodeURIComponent(username)}/followers`),
    serverFetch<FollowList>(`/users/${encodeURIComponent(username)}/following`),
  ]);
  if (!profile) notFound();

  const achList = Array.isArray(achievements) ? achievements : [];
  const feed = Array.isArray(activity) ? activity : [];
  const followerCount = followers?.followers?.length ?? 0;
  const followingCount = following?.follows?.length ?? 0;

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
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-display font-semibold">@{profile.username}</h1>
            <FollowButton username={profile.username} />
          </div>
          <p className="text-ink-400 text-sm">
            Member since {new Date(profile.createdAt).toLocaleDateString()}
            <span className="mx-2">·</span>
            <span className="text-ink-300">{followerCount}</span> followers
            <span className="mx-2">·</span>
            <span className="text-ink-300">{followingCount}</span> following
          </p>
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

      {achList.length > 0 && (
        <section>
          <h2 className="font-display font-semibold mb-3">Achievements</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {achList.map(a => (
              <div key={a.slug} className="glass p-3 text-center" title={`${a.description}\nUnlocked ${new Date(a.unlockedAt).toLocaleString()}`}>
                <div className="text-2xl">{a.icon}</div>
                <div className="text-xs font-medium truncate mt-1">{a.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid lg:grid-cols-[1fr,280px] gap-6">
        <div className="space-y-6 min-w-0">
          <div>
            <h2 className="font-display font-semibold mb-3">Tracked profiles</h2>
            {profile.trackedProfiles.length === 0 ? (
              <div className="glass p-6 text-ink-400 text-sm">No tracked profiles yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          </div>

          <div>
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
          </div>
        </div>

        <aside>
          <h2 className="font-display font-semibold mb-3">Activity</h2>
          {feed.length === 0 ? (
            <div className="glass p-4 text-sm text-ink-400">No recent activity.</div>
          ) : (
            <div className="space-y-1.5">
              {feed.map(e => <FeedItem key={e.id} event={e} />)}
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

function FeedItem({ event }: { event: FeedRow }) {
  const date = new Date(event.createdAt).toLocaleString();
  const p = event.payload;
  let text = event.kind;
  if (event.kind === 'level-up') {
    text = `Level ${p.from} → ${p.to} on ${p.game} (${p.displayName})`;
  } else if (event.kind === 'rank-change') {
    text = `Rank ${p.from ?? '?'} → ${p.to ?? '?'} on ${p.game}`;
  } else if (event.kind === 'achievement') {
    text = `Achievement unlocked: ${p.slug}`;
  } else if (event.kind === 'follow') {
    text = 'Gained a new follower';
  }
  return (
    <div className="glass px-3 py-2 text-xs">
      <div className="text-ink-200">{text}</div>
      <div className="text-ink-500 mt-0.5">{date}</div>
    </div>
  );
}
