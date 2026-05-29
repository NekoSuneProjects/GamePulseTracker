# GamePulseTracker — TODO

Running list of things to fix or build, in roughly the order they came up.
Keep entries short; link issues / commits when they land.

---

## 🔥 Live blockers (fix next)

- [ ] Crafatar 521 from `/_next/image` — switch Minecraft avatars to a more
      reliable service and auto-rewrite old `crafatar.com/avatars/` URLs
      already baked into DB snapshots.
- [ ] Persistent `_.filter is not a function` after pull — investigate any
      site we haven't already guarded with `Array.isArray()`. (Most likely
      a stale snapshot's `recent` or `details` field shape.)
- [x] User settings: change username + change password (shipped).

## 🚧 In progress

- [ ] Restructure stale TrackedProfile rows that were created before the
      canonical-platform fix — they may have `platform='_'` rows that
      duplicate the canonical `platform='minecraft'` rows.

## 🎨 UI redesign (Tracker.gg-style layout)

Per screenshots: Tracker.gg's hub + per-game pages have a much more
identifiable structure. Mimic the SHAPE (not the brand):

- [ ] Top-level "TRACKER" header with a horizontal list of game shortcuts.
- [ ] Per-game subnav: `Home / Leaderboards / App / Premium`.
- [ ] Game-hero banner (full-bleed game art, title overlay).
- [ ] Centered platform-aware search bar with PSN / Xbox / Epic dropdown
      and a "Recent Players" + "Favorites" side panel.
- [ ] Top stats cards on landing pages (e.g. "Player Kills", "Player Rank",
      "Wins") sourced from leaderboards.
- [ ] My Games grid (hub) like the screenshot — game tiles 4x2 grid with
      cover art instead of the current solid-color tiles.
- [ ] Battlefield series landing page: variant picker (BF6 / BF2042 / BFV
      / BF1) before drilling into a player.

## 🔗 Linked Accounts redesign (Tracker Network "Account Management" style)

Per screenshots from `thetrackernetwork.com/manage/social`. Replace the
current flat list with a card-grid Account Management page:

- [ ] Sidebar nav: Premium Membership / Premium Settings / Linked Accounts
      / Geo Settings / Change Username / Change Email / Change Password /
      Delete Account. (Settings becomes sub-routes, not one big form.)
- [ ] "Gaming Platforms" grid of branded color cards: Xbox Live (green),
      PlayStation (blue), Steam (olive), Origin (orange), Ubisoft (blue),
      Battle.net (light blue), Epic Games (dark), Riot Games (red),
      Activision (black), Sharkmob (gray), FACEIT (orange), Bungie (cyan).
      Each card shows brand logo + handle + verified-check + trash icon.
- [ ] "Social Platforms" grid: Twitch, YouTube, Discord, Twitter, Reddit
      (same card shape, branded colors).
- [ ] Verified badge after each handle when `verified=true`.
- [ ] Click a card to re-resolve / unlink / re-verify.
- [ ] Empty cards (no link yet) show a "+ Link" prompt.

## 🗑 Stats deletion requests (user → admin approval)

Users can request deletion of any TrackedProfile that belongs to them.
The request goes into a queue an admin approves or rejects.

- [ ] Prisma model `StatsDeletionRequest`: id, userId, profileId, reason?,
      status (pending|approved|rejected), adminId?, resolvedAt?, createdAt.
- [ ] Backend: `POST /games/:game/player/:providerId/delete-request`
      (auth required; must own the linked account that resolved to this
      profile, OR be the user the profile is attached to).
- [ ] Backend: `GET /admin/deletion-requests?status=pending`.
- [ ] Backend: `POST /admin/deletion-requests/:id/approve` (cascade-deletes
      TrackedProfile + StatSnapshot + MatchRecord + SeasonRecord rows).
- [ ] Backend: `POST /admin/deletion-requests/:id/reject` (with reason).
- [ ] Frontend: "Request stats deletion" button on the player profile page,
      visible only when the logged-in user owns the profile.
- [ ] Frontend: Admin → Deletion Requests section with list + accept/reject.
- [ ] Notification to the requester when an admin acts.

## 🆕 New game integrations

- [ ] Fortnite **shop endpoint** — `fortnite-api.com/v2/shop` shows what's
      currently in the item shop. New optional `getShop()` on the
      integration interface; per-game page section.
- [ ] Fortnite stats (live) — `/v2/stats/br/v2`, needs `FORTNITE_API_KEY`.
- [ ] Apex (live via apexlegendsapi).
- [ ] Halo Infinite — HaloDotAPI or community Waypoint mirror.
- [ ] R6 Siege — r6stats community.
- [ ] Valorant — Riot prod key OR henrikdev community proxy.
- [ ] Overwatch 2 — overfast-api community.
- [ ] Destiny / Destiny 2 — Bungie OAuth flow.

## 🧠 Backend hardening

- [ ] Drop NotFoundException for missing TrackedProfile rows everywhere
      that calls `findUnique` — return `null`/`[]` so the UI handles it.
- [ ] Snapshot reads should re-derive computed fields (avatar URLs,
      recent links) instead of trusting whatever was stored, so old
      snapshots inherit current logic.
- [ ] Background queue: dedupe in-flight `refreshProfile(...)` calls.
- [ ] Per-integration request log / metrics (Prometheus?) so we can
      see who's rate-limiting us.
- [ ] Token rotation for Wynncraft / CoC: nicer error when the key expires.

## 🛡 Auth + security

- [ ] Change username (with password confirmation).
- [ ] Change password (with current-password confirmation).
- [ ] Delete account (soft-delete + 30-day undo).
- [ ] Email verification flow (table already exists, SMTP not wired).
- [ ] Password reset via email link.
- [ ] 2FA (TOTP) on user accounts.
- [ ] API key management UI for power users (table exists in Prisma).

## 🧑‍🤝‍🧑 Social / community

- [ ] Favorites — bookmark a tracked profile to "Favorites" so it shows
      up alongside Recent Players in the search drawer.
- [ ] Public profile feed (level-ups, rank changes) per linked account.
- [ ] Follow another GamePulseTracker user.
- [ ] Achievements / badges (verified, 100k matches tracked, etc.).

## 📰 News + content

- [ ] News deduplication: hash by title+url so the same item from
      multiple feeds doesn't appear twice.
- [ ] Per-game news filtering by tag (patch, esports, cosmetic).
- [ ] Battle pass / season banner on game hubs.

## 🖥 Dev experience

- [ ] CI: also run frontend `next build` (currently we only typecheck).
- [ ] CI: e2e smoke test with Playwright (login → search → profile).
- [ ] Storybook for components.
- [ ] Reproducible Postgres seed for demo deployments.

## 📦 Deployment

- [ ] Helm chart for k8s.
- [ ] One-command Hetzner / DO Terraform module.
- [ ] Backup + restore docs for postgres.
- [ ] Backup of Redis stream for ingest replay.

---

## ✅ Done (recent)

- Single-domain nginx setup (`/api/*` → backend, `/socket.io/*` → backend, `/` → frontend).
- `INTERNAL_API_URL` for SSR fetches (fixes `/profile/<username>` 404).
- Prisma initial migration committed.
- Bootstrap admin auto-created on first boot.
- Backend port pinned at 4000 in the container regardless of `.env`.
- Background admin password rotation reminder in boot log.
- Wynncraft v3: dropped `fullResult` (their API rejects values now).
- Hypixel + Wynncraft full-body MC skin avatars.
- Clash of Clans live integration (player + clan).
- Beat Saber multi-backend (ScoreSaber + BeatLeader + AccSaber + HitBloq).
- `Array.isArray()` guards in player-page `useMemo`s.

---

## Notes

- Tracker.gg-style hub is the design north star; we don't need to match
  pixel-perfectly, just feel.
- Don't add features that depend on closed APIs unless we have a clear
  community fallback. CoD-family stays ingest-only for the foreseeable
  future.
- Keep the LICENSE intent in mind: this is a community project, no
  paywalls in the OSS distribution.
