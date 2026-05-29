# GamePulseTracker — TODO

Running list of things to fix or build, in roughly the order they came up.
Keep entries short; link issues / commits when they land.

---

## 🛡 Security audit follow-ups

(From the audit on 2026-05-29. Critical items in this section were fixed
in-line. Everything below has been shipped to code; needs end-to-end test
on a deploy before being moved to Done.)

### Still open

- [ ] **42-arg `IntegrationsModule` constructor** is fragile copy-paste.
      Use `ModuleRef` + iterate the array. (Deferred — purely a refactor,
      no user-visible effect.)

---

## 🔥 Live blockers (fix next)

- [x] User settings: change username + change password (shipped).
- [x] Crafatar 521 — centralised `normaliseAvatarUrl` util now applied at
      every read path (games, stats, leaderboards, users). Old DB rows
      auto-rewrite on read; refreshed rows get mc-heads.net written back.
- [x] `_.filter is not a function` — added `Array.isArray()` guards on the
      pages that hit the issue (game hub, settings, connections, devices).

## 🚧 In progress

- [x] **`platform='_'` dedupe migration** — `backend/prisma/scripts/
      dedupe-canonical-platform.ts`. Run `npm run migrate:dedupe-platforms
      -- --apply` on the deploy (dry-run by default). Reparents
      Snapshot/Match/Season rows then deletes the stale `_` row.

## 🎨 UI redesign (Tracker.gg-style layout)

Per screenshots: Tracker.gg's hub + per-game pages have a much more
identifiable structure. Mimic the SHAPE (not the brand):

- [x] Top-level "TRACKER" header with horizontal game shortcuts —
      `Navbar` now has a 2-row layout: brand + main routes + user
      actions on top, scrollable live-games shortcut bar below.
- [x] Per-game subnav: `Home / Leaderboards / Live` (Premium dropped;
      App replaced by Live per OSS / no-paywalls intent).
- [x] Game-hero banner — `GameHero` component renders the per-game
      accent gradient + title overlay with an embedded SearchBar.
- [x] Centered platform-aware search bar — already existed; now also
      sits inside the hero on the per-game page.
- [x] "Recent Players" + "Favorites" side panel — `HubSidePanel` on
      the home page, Favorites only renders for logged-in users.
- [x] Top stats cards on landing pages — `GameTopStats` pulls top-of-
      leaderboard rows for level/KD/wins/matches and renders one card
      per non-empty metric, linking to the leader's profile.
- [x] My Games grid — `GameTile` rebuilt with `bg-gradient-to-br` from
      a per-game accent map (`GAME_ACCENTS` in `@gpt/shared`). Tiles
      now have 16:9 aspect, branded gradient, dark text-readability
      overlay, and a status chip. No cover-art assets required.
- [x] Battlefield series landing page — `/games/battlefield` lists
      every BF title in the catalog as branded gradient cards; titles
      we don't have integrations for yet are dimmed + non-clickable
      with a "not yet" chip.

## 🔗 Linked Accounts redesign (Tracker Network "Account Management" style)

- [x] Sidebar nav — `settings/layout.tsx` renders a left-rail nav with
      Profile / Linked accounts / Connections (legacy) / Change username
      / Change password / Devices. Premium/Geo/Delete-account omitted —
      no paywalls (OSS), delete-account is its own TODO under Auth.
- [x] "Gaming Platforms" grid — `settings/linked` renders one card per
      platform in `lib/platform-brands.GAMING_BRANDS` (12 platforms with
      brand-coloured gradients: Xbox green, PSN blue, Steam stone, EA
      red/orange, Ubisoft blue, Battle.net sky, Epic zinc, Riot red,
      Activision stone, FACEIT orange, Bungie cyan, plus a generic EA
      slot). Trademark-safe: brand colours + abbreviation only, no logo
      art.
- [x] "Social Platforms" grid — 5 cards (Twitch / YouTube / Discord /
      Twitter-X / Reddit) edit `User.socials` directly via the existing
      `/users/me/settings` PATCH.
- [x] Verified badge — green check on linked cards when
      `LinkedAccount.verified=true`.
- [x] Click a card → re-resolve / unlink inline action; empty card opens
      an inline link form with providerId + display name.
- [x] Empty cards show a "+ Link account" / "+ Add" prompt.

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

- [x] Prisma model `StatsDeletionRequest` + `DeletionStatus` enum +
      migration `20260529000000_add_stats_deletion_requests`.
- [x] Backend: `POST /deletion-requests` (auth) creates a request after
      verifying ownership — either profile.userId matches OR the user
      holds a LinkedAccount with the same providerId.
- [x] Backend: `GET /deletion-requests/mine` — user's own queue.
- [x] Backend: `GET /admin/deletion-requests?status=pending|approved|rejected`.
- [x] Backend: `POST /admin/deletion-requests/:id/approve` cascades the
      TrackedProfile delete (snapshots/matches/seasons cascade via FK).
- [x] Backend: `POST /admin/deletion-requests/:id/reject` (with optional
      adminNote shown to user).
- [x] Frontend: `DeletionRequestButton` on the player profile page,
      shown to any logged-in user; backend rejects with 403 if they don't
      own it.
- [x] Frontend: `/admin/deletion-requests` page with status filter +
      approve/reject inline. Linked from the admin overview.
- [x] Notification to the requester via the existing Notifications
      pipeline on both approve and reject (best-effort, won't fail the
      action if the push errors).

## 🆕 New game integrations

- [x] Fortnite **shop endpoint** — `getShop()` added to GameIntegration,
      live for Fortnite via `fortnite-api.com/v2/shop` (public, no key).
      Backend route `GET /games/:game/shop` (5-min Redis cache), frontend
      `ShopGrid` component rendered on the per-game page.
- [ ] Fortnite stats (live) — `/v2/stats/br/v2`, needs `FORTNITE_API_KEY`
      (operator action).
- [ ] Apex (live via apexlegendsapi) — needs operator key.
- [ ] Halo Infinite — HaloDotAPI key.
- [ ] R6 Siege — r6stats community (scraping risk).
- [ ] Valorant — Riot prod key OR henrikdev community proxy.
- [ ] Overwatch 2 — overfast-api community.
- [ ] Destiny / Destiny 2 — Bungie OAuth flow (multi-step).

## 🧠 Backend hardening

- [x] Drop NotFoundException for missing TrackedProfile rows — history,
      matches, and findProfileLoose now return null / [] (verified). The
      remaining NotFoundException uses are legitimate (integration slug
      doesn't exist, linked account owned by another user).
- [x] Snapshot reads re-derive avatar URL via `normaliseAvatarUrl` on
      every read — covered by the Crafatar centralisation above.
- [x] Background queue: dedupe in-flight `refreshProfile(...)` calls —
      `games.service.getProfile` now holds a Redis lock per
      `(game, platform, providerId)` for the duration of the integration
      fetch. Concurrent callers wait up to ~3s for the cache to be
      populated by the lock holder; fall through to a fetch of their own
      if the wait times out (covers a holder crash).
- [ ] Per-integration request log / metrics (Prometheus?) so we can
      see who's rate-limiting us.
- [x] Token rotation for Wynncraft / CoC: nicer error when the key
      expires — new `withTokenErrorHandling()` wrapper translates 401/403
      from auth-gated providers into an operator-readable message
      naming the env var to rotate.

## 🛡 Auth + security

- [x] Delete account (soft-delete + 30-day undo) — `DELETE /users/me`
      with password confirmation queues `deletionAt = now + 30d`,
      revokes all sessions, blocks login after the grace window. Signing
      back in inside the window auto-cancels. Hourly cron sweep hard-
      deletes (FK cascade handles owned rows). UI page at
      `/settings/delete-account`.
- [ ] Email verification flow (table already exists, SMTP not wired —
      blocked on operator).
- [ ] Password reset via email link (blocked on SMTP).
- [x] 2FA (TOTP) on user accounts — `TotpService` (enrol/verify/disable)
      using otplib. Login enforces a `totp` field on the LoginDto when
      `totpEnabled`; UI prompts inline at `/login` after the
      `TOTP_REQUIRED` 401. Settings page at `/settings/security` with
      QR via api.qrserver.com.
- [x] API key management UI — `ApiKeysModule` with list/create/revoke,
      plaintext returned exactly once on create. UI at
      `/settings/api-keys` with copy-to-clipboard.

## 🧑‍🤝‍🧑 Social / community

- [x] Favorites — `Favorite` Prisma model + `/favorites` CRUD endpoints,
      star toggle on player profile page, dedicated `/favorites` list
      page. Surfaced in the hub side panel for logged-in users.
- [x] Public profile feed — `ActivityEvent` model + capture in
      `StatsRefreshProcessor` for level-ups and rank-changes (only when
      the TrackedProfile is claimed by a user). `GET /users/:username/
      feed` returns the chronological list; rendered on the user profile
      page right-hand column.
- [x] Follow another GamePulseTracker user — `Follow` model + `POST
      /social/follow` + `DELETE /social/follow/:username` + follower /
      following list endpoints. `FollowButton` component on the profile
      page (hidden for self / anon). Follower count surfaced in the
      profile header.
- [x] Achievements / badges — hardcoded catalog in
      `social/achievements.catalog.ts` (verified-email, two-factor,
      first-link, public-profile, first-tracked, matches-100,
      matches-100k, followed-10). `SocialService.recomputeAchievements`
      re-evaluates and inserts new unlocks idempotently. Surfaced on
      the user profile page as an emoji-badge grid; unlocks also push
      an ActivityEvent into the feed.

## 📰 News + content

- [x] News deduplication: in-pass dedup by SHA1(normalised title + URL)
      so the same article from multiple feeds for a single game refresh
      no longer gets upserted twice.
- [x] Per-game news filtering by tag — `GET /news/:game?tag=<value>`
      filters by lowercase tag match; `GET /news/:game/tags` returns
      distinct tags + counts to populate the dropdown.
      `NewsTagFilter` component on the per-game page pushes the chosen
      tag into the URL so the server component re-runs.
- [ ] Battle pass / season banner on game hubs.

## 🖥 Dev experience

- [x] CI: also run frontend `next build` — added to `.github/workflows/
      ci.yml` after the typecheck steps. Would have caught the lockfile
      mismatch a deploy earlier than the docker workflow did.
- [ ] CI: e2e smoke test with Playwright (login → search → profile).
- [ ] Storybook for components.
- [x] Reproducible Postgres seed for demo deployments — `prisma/seed.ts`
      now seeds 7 users (admin + demo + alice/bob/carol/dave/eve/frank),
      a small follow graph, and a handful of tracked profiles. Set
      `SEED_DEMO_DATA=off` to limit to admin only.

## 📦 Deployment

- [ ] Helm chart for k8s.
- [ ] One-command Hetzner / DO Terraform module.
- [ ] Backup + restore docs for postgres.
- [ ] Backup of Redis stream for ingest replay.

---

## ✅ Done (recent)

### Audit follow-ups — shipped 2026-05-29 (needs deploy + smoke-test)

- 🛡 **Pairing code now uses `crypto.randomInt`** instead of `Math.random()`
  — `devices.service.ts`.
- 🛡 **Refresh token reuse detection** — a previously-rotated refresh now
  revokes the entire user's session family as a theft signal
  (`auth.service.ts`).
- 🛡 **`AllExceptionsFilter` no longer leaks `exception.message`** for
  non-HTTP errors. Returns generic "Internal server error" to the client,
  logs full details server-side.
- 🛡 **Swagger `/docs` gated** — only mounted when
  `SWAGGER_ENABLED=true` or `NODE_ENV !== 'production'`.
- 🛡 **`ApiKeyGuard` no longer fails open** when `PUBLIC_API_ENABLED !=
  'true'` — returns a 403 with `PUBLIC_API_DISABLED` instead.
- 🛡 **Express `trust proxy`** set from `TRUST_PROXY` env (defaults to 1
  hop for nginx). Audit rows now record the real client IP.
- 🛡 **Frontend socket disconnected on logout** — `disconnectSocket()`
  added to `lib/socket.ts`, called from `logout()`. No more previous-user
  subscriptions leaking across login.
- 🛡 **eslint `next/core-web-vitals` enabled in frontend** with
  `react-hooks/rules-of-hooks` error + `exhaustive-deps` warn. Added
  `eslint` + `eslint-config-next` to devDependencies.
- 🐞 **Connections + Devices error states surfaced** — `app/connections`
  and `app/devices` no longer `.catch(()=>{})` the fetch.
- 🐞 **News refresh runs in bounded-parallel** (`CONCURRENCY=6`) and
  **skips integrations with zero active `TrackedProfile`** — one slow RSS
  host no longer blocks the whole tick, and we don't burn requests on
  unused games.
- 🐞 **Identity-resolve scheduler** now batched parallel (`CONCURRENCY=8`)
  so the 3am tick can't stall past the next firing.
- 🐞 **VRChat in-flight login singleton** — `vrchat-auth.service.ts`
  shares one `Promise<string>` across concurrent 401-driven re-logins so
  we don't race N parallel `/auth/user` calls and rate-limit ourselves.
- 🐞 **CoC tag regex case-sensitive** — uppercase first, regex no longer
  has `i` flag. `quy` (the username) doesn't get routed to tag lookup
  and 404 anymore.
- 🐞 **Roblox user lookup wrapped in `.catch`** — a transient 5xx on
  `/v1/users/{id}` no longer tanks the full profile when
  friends/followers/thumbnail all succeeded.
- 🐞 **`games.service.resolveIdentity` errors logged** — non-404 errors
  surface a `Logger.warn` instead of being swallowed silently.
- 🐞 **News scheduler `onModuleInit` setTimeout** stored and cleared in
  `onModuleDestroy`. Tick wrapped in try/catch.
- 🐞 **`safeRatio(a, 0)` no longer returns `a`** — fixed in `hypixel`,
  `wynncraft`, `wargaming.base`, `clash-of-clans`. K/D with zero deaths
  no longer reports raw kill count.
- 🐞 **OSRS/RS3 hiscores CSV trim** — `.trim()` each line before parsing
  so the trailing `\r` Jagex sometimes emits doesn't turn every field
  into NaN.
- 🐞 **`devices.service` lastSeen update** now logs a warn instead of
  silently swallowing.
- 🐞 **`logout()` warns on server failure** — frontend no longer silently
  pretends refresh tokens were revoked when the network call failed.
- 🐞 **Frontend `tsconfig.tsbuildinfo` cleanup** — added `prebuild` script
  that deletes the file before `next build` (already gitignored).
- 🐞 **Stray `(TODO)` doc comment removed** from `warframe.integration.ts`.

### Prior fixes

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
