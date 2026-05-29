# GamePulseTracker — TODO

Running list of things to fix or build, in roughly the order they came up.
Keep entries short; link issues / commits when they land.

---

## 🛡 Security audit follow-ups

(From the audit on 2026-05-29. Critical items in this section were fixed
in-line; the rest are tracked here.)

### Medium

- [ ] **Pairing code uses `Math.random()`** — `devices.service.ts:80-85`.
      Predictable PRNG over a 32^6 alphabet. Switch to `crypto.randomInt`.
- [ ] **Refresh token reuse not detected** — `auth.service.ts:45-56`. When
      a previously-rotated refresh is presented, treat as theft signal and
      revoke the entire user's session family.
- [ ] **`AllExceptionsFilter` leaks `exception.message`** for non-HTTP
      exceptions (Prisma errors, raw constraint names). Return a generic
      `INTERNAL_ERROR` message, log details server-side only.
- [ ] **Swagger `/docs` exposed in production** by default. Gate
      `SwaggerModule.setup` on `NODE_ENV !== 'production'` OR behind admin
      auth + nginx ACL.
- [ ] **`ApiKeyGuard` fail-open when feature off** — when
      `PUBLIC_API_ENABLED !== 'true'` it returns true unconditionally. If
      the feature is off, return 404; document the intended behaviour.
- [ ] **Express `trust proxy` not set** — every audit row records the
      loopback IP behind nginx. Set `app.set('trust proxy', 1)` and parse
      `X-Forwarded-For`.

### Low

- [ ] **Frontend: socket singleton never disconnected on logout** —
      subscriptions from a previous user persist across login. Add
      `disconnectSocket()` to `lib/socket.ts` and call from `logout()`.
- [ ] **Frontend: no `eslint-plugin-react-hooks`** — useEffect dep-array
      mistakes don't warn. Enable `next/core-web-vitals` ruleset.

## 🐞 Code-quality audit follow-ups

### High

- [ ] **Connections/Devices error swallowed** — `app/connections/page.tsx`
      and `app/devices/page.tsx` `.catch(() => {})` hide 401/500 fetch
      failures. Set an error state and render it like other branches.

### Medium

- [ ] **News refresh is serial** — `news.service.ts:64` for-await across
      42 integrations. One slow RSS host blocks the whole tick. Use
      `Promise.allSettled` with a small concurrency limit (`pLimit(6)`).
- [ ] **News refresh runs for unused integrations** — wasted requests.
      Only run for games where at least one `TrackedProfile.active=true`
      exists (or where any LinkedAccount points at the platform).
- [ ] **Identity-resolve scheduler is serial** —
      `identity-resolve.scheduler.ts:26` walks 1000 accounts one-by-one.
      Chunked parallel with bounded concurrency.
- [ ] **VRChat concurrent 401 → multiple parallel logins** —
      `vrchat-worlds.integration.ts:128-134` + `vrchat-auth.service.ts:43`.
      Serialise via an in-flight login Promise singleton.
- [ ] **CoC tag regex is case-insensitive** — `clash-of-clans.integration.ts:100`.
      Drop the `i` flag (or uppercase first) so `quy` doesn't route to
      tag lookup and 404.
- [ ] **Roblox `Promise.all` tanks on transient 5xx of user lookup** —
      `roblox.integration.ts:63-71`. Wrap user lookup in `.catch` or use
      `Promise.allSettled`.
- [ ] **`games.service.ts:64` swallows all resolveIdentity errors** —
      including transient ones. Rethrow non-404 IntegrationHttpErrors, or
      at least log them.
- [ ] **`news.scheduler.ts` `onModuleInit` setTimeout** not cleared in
      `onModuleDestroy` — fast restart can fire against a closed Prisma.
- [ ] **`safeRatio(a, 0)` returns `a`** — `hypixel:109`, `wynncraft:118`,
      `wargaming.base:125`. Player with kills and zero deaths shows K/D
      == raw kill count. Return `a` only when both are 0.
- [ ] **OSRS/RS3 trailing CR** — `osrs.integration.ts:68`,
      `runescape.integration.ts:61`. `'-1,-1,-1\r'.split(',').map(Number)`
      → NaN → stored as null silently. `.trim()` each line.

### Low

- [ ] **`devices.service.ts:45` lastSeen update silently swallowed** —
      `.catch(() => {})`. At least `.catch(e => log.warn(...))`.
- [ ] **42-arg `IntegrationsModule` constructor** is fragile copy-paste.
      Use `ModuleRef` + iterate the array.
- [ ] **`logout()` in `auth.tsx` swallows server failure** — user thinks
      refresh tokens revoked when they weren't. Surface a warning.
- [ ] **Frontend `tsconfig.tsbuildinfo` not gitignored or cleaned** —
      `next build` doesn't drop it. Add to `.gitignore` and to a `prebuild`
      script.

### Nit

- [ ] **Stray `(TODO)` doc comment** in
      `warframe.integration.ts:18`.

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

## 📺 OBS overlays (Tracker.gg /overlays style)

Streamer-facing live stat overlays per game. Each user creates an overlay
configuration tied to one of their TrackedProfiles; the overlay renders at
a unique URL with transparent background that OBS adds as a Browser Source.
Live stats stream in via Socket.IO so kills/wins/rank update without a
refresh while the user is in-game.

Reference: https://tracker.gg/overlays — per-game designs with brand
colors, fonts, and stat layouts.

### Architecture
- **Prisma model** `OverlayConfig`: `{ id, userId, game, profileId,
  theme (vertical/horizontal/badge/banner), accent color, opacity, font,
  visibleFields[], publicSlug (short id used in the OBS URL), createdAt,
  updatedAt }`. Public slug means the overlay URL doesn't expose the
  internal id and can be revoked without leaking the database key.
- **Route** `/overlays` — landing page: per-game gallery showing what each
  overlay looks like (carousel of screenshots).
- **Route** `/overlays/new/:game` — designer:
  - Live preview iframe on the right.
  - Left panel: pick TrackedProfile, theme variant, accent color (preset
    palette + custom hex), opacity slider, font, "Show kills / KD / rank /
    level / win-streak" toggles.
  - Save → returns the OBS URL + size suggestion.
- **Route** `/o/:slug` — the overlay itself. Headless component, no nav,
  no auth. Subscribes to `subscribe:profile { game, platform, providerId }`
  via Socket.IO, animates stat changes (Framer Motion). transparent
  background. `?w=480&h=120` query params let OBS pick a width.

### Per-game variants (visual identity per screenshot reference)
- **Fortnite**: yellow / black, "victory royale" badge, K/D + wins +
  current placement bar.
- **Apex Legends**: neon orange / black, current legend portrait + RP +
  badges.
- **Valorant**: red / black, rank tier + RR + headshot %.
- **Rainbow Six**: navy / orange, MMR + K/D + clutch wins.
- **CoD Warzone**: green / black, kills + placement + revives.
- **Halo Infinite**: blue, CSR + win rate.
- **Rocket League**: cyan / pink, MMR + goals + saves.
- **Overwatch 2**: gold, role + SR.
- **Hypixel / Wynncraft**: minecraft pixel font, full-body skin to the
  left of the stat block.
- **Battlefield**: military stencil, K/D + score-per-min.
- **OSRS / RS3**: brown leather panel, total level + xp.
- **WoT/WoWS/WoWp**: tank silhouette, win rate + battles + WN8.
- **Beat Saber**: neon pink/blue, PP + global rank + last-played map.
- **Warframe**: orokin gold, mastery rank + plat earned this week.
- **Roblox**: pixel red, level + matches.
- **Clash of Clans**: gold/red, town hall level + trophies.

### Frontend internals
- Reuse the `useLiveProfile` hook so the overlay automatically gets the
  same realtime updates as the regular profile page.
- Themes live under `frontend/src/components/overlays/<theme>.tsx`,
  each exporting a `<Overlay snapshot={...} cfg={...}/>` component.
- Static screenshot generator (puppeteer at build time?) for the gallery.

### Open questions
- [ ] Auth model for overlays: anyone with the URL can see (no login)?
      That matches how Twitch overlays work but means the slug must be
      unguessable.
- [ ] Rate-limit: a popular streamer overlay shouldn't get blocked.
- [ ] Multi-game stack: should a user be able to have ONE overlay that
      auto-switches based on which game's currently broadcasting via the
      Overwolf companion?

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

- 🛡 **Critical: ingest can't hijack other users' TrackedProfiles** — the
  upsert now refuses cross-user reassignment and rejects with
  `PROFILE_OWNED_BY_OTHER_USER` (409-ish).
- 🛡 **Critical: empty `Device.scopes` no longer means "all games"** —
  inverted to deny-by-default; use `['*']` for all-access.
- 🛡 **High: JWT_SECRET fall-back to dev string in prod now throws at
  boot** — both `auth.module.ts` and `jwt.strategy.ts` use a shared
  `resolveJwtSecret()` that refuses to start with the dev default in
  production.
- 🛡 **High: bootstrap admin requires `BOOTSTRAP_ADMIN_ENABLED=true` in
  prod**, and refuses to use the dev-default password in prod. Plaintext
  password no longer logged.
- 🛡 **High: `prisma db seed` no longer logs the seeded password**.
- 🐞 **High: `ingestOnly` games skipped by RefreshScheduler** — stops the
  stub `getProfile` from overwriting device-ingested snapshots every
  minute. Scheduler also paginates instead of capping at 500.
- Single-domain nginx setup (`/api/*` → backend, `/socket.io/*` → backend, `/` → frontend).
- `INTERNAL_API_URL` for SSR fetches (fixes `/profile/<username>` 404).
- Prisma initial migration committed.
- Bootstrap admin auto-created on first boot (now gated, see above).
- Backend port pinned at 4000 in the container regardless of `.env`.
- Wynncraft v3: dropped `fullResult` (their API rejects values now).
- Hypixel + Wynncraft full-body MC skin avatars via mc-heads.net.
- Clash of Clans live integration (player + clan).
- Beat Saber multi-backend (ScoreSaber + BeatLeader + AccSaber + HitBloq).
- `Array.isArray()` guards in player-page `useMemo`s.
- User settings: change username + change password.

---

## Notes

- Tracker.gg-style hub is the design north star; we don't need to match
  pixel-perfectly, just feel.
- Don't add features that depend on closed APIs unless we have a clear
  community fallback. CoD-family stays ingest-only for the foreseeable
  future.
- Keep the LICENSE intent in mind: this is a community project, no
  paywalls in the OSS distribution.
