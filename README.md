# GamePulseTracker

A self-hosted, real-time, multi-game player statistics and tracking platform.
Tracker.gg, with the things tracker.gg is missing: full platform-aware
identity, per-game news feeds, companion ingest for games without an API, and
ownership of the entire stack.

- **Backend** — NestJS, Prisma, PostgreSQL, Redis, BullMQ, Socket.IO
- **Frontend** — Next.js 14 (App Router), TailwindCSS, Framer Motion, Recharts
- **Stack glue** — npm workspaces, Docker Compose, nginx reverse proxy
- **Auth** — JWT access + opaque refresh tokens, Argon2id, role-based admin
- **~40 games** in the catalog with a modular plugin system. **11 live**
  integrations ship working. The remaining slots are typed stubs with the exact
  provider endpoint documented in each file.
- **Companion ingest** — paired devices (Overwolf overlays, screen-readers) can
  post stats for games with no public API. See [`docs/CLIENT.md`](docs/CLIENT.md).
- **Overwolf app** — full companion lives in [`overwolf-app/`](overwolf-app/) ready to pack into a `.opk`.
- **Optional AdSense** + built-in adblock-detect notice (env-gated, off by default).
- **GitHub Actions** publish multi-arch (`amd64` + `arm64`) Docker images to GHCR.

```
┌─────────────────────────────────────────────────────────────────┐
│                          nginx :80/:443                        │
└───────────────┬──────────────────────────────┬──────────────────┘
                │                              │
        ┌───────▼─────────┐            ┌───────▼─────────┐
        │  Next.js :3000  │◀──────────▶│  NestJS :4000   │
        │  TailwindCSS UI │   REST +   │  REST + WS API  │
        └─────────────────┘  Socket.IO └─┬────────┬──────┘
                                          │        │
                                ┌─────────▼┐  ┌────▼─────┐
                                │ Postgres │  │  Redis   │
                                │  (data)  │  │  (queues │
                                │          │  │  + cache)│
                                └──────────┘  └──────────┘
                                          ▲
                  Overwolf overlay  ──────┘  POST /ingest/<game>
                  Desktop companion ──────┘  (X-Device-Key)
```

---

## Quick start (Docker)

```bash
cp .env.example .env
# Edit JWT_SECRET, JWT_REFRESH_SECRET, POSTGRES_PASSWORD at minimum.
# Optional:
#   HYPIXEL_API_KEY          — enables Hypixel (free at https://developer.hypixel.net)
#   WARGAMING_APPLICATION_ID — enables WoT / WoWS / WoWp
# OSRS, RS3, Warframe, Roblox, Wynncraft all run with no key.

npm run docker:up
npm run docker:logs

# Seed admin user + demo profiles:
docker compose exec backend npx prisma db seed
```

- Web app                    → http://localhost (or :3000 direct)
- API                        → http://localhost:4000
- Swagger docs               → http://localhost:4000/docs
- Default admin              → `admin@gamepulse.local` / `ChangeMe!2026`

## Quick start (local, without Docker)

Need Node 20+, PostgreSQL 15+, Redis 7+ running locally.

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

---

## Game catalog

### Live integrations (no extra credentials required)

| Slug          | Game                   | Notes                                                            |
| ------------- | ---------------------- | ---------------------------------------------------------------- |
| `osrs`        | Old School RuneScape   | Jagex hiscores, 4 modes                                          |
| `runescape`   | RuneScape 3            | Jagex hiscores, 3 modes                                          |
| `wynncraft`   | Wynncraft              | Public Wynncraft v3 API                                          |
| `warframe`    | Warframe               | warframestat.us world state + **warframe.market trade analytics** |
| `roblox`      | Roblox                 | users.roblox.com public profile                                  |
| `beat-saber`  | Beat Saber             | Aggregates **ScoreSaber + BeatLeader + AccSaber + HitBloq** in parallel. Surfaces BeatLeader mod-usage (NoodleExtensions, Chroma, MappingExtensions) and HitBloq per-pool ranks. |
| `vrchat-worlds` | VRChat Worlds        | api.vrchat.cloud worlds endpoints (PII-free, requires user's own auth cookie) |

### Live integrations (free API key required)

| Slug         | Game                   | Env var                       |
| ------------ | ---------------------- | ----------------------------- |
| `hypixel`    | Hypixel                | `HYPIXEL_API_KEY`             |
| `wows`       | World of Warships      | `WARGAMING_APPLICATION_ID`    |
| `wot`        | World of Tanks         | `WARGAMING_APPLICATION_ID`    |
| `wowp`       | World of Warplanes     | `WARGAMING_APPLICATION_ID`    |

### Stubs ready for credentials (battle royale / arena shooters)

`fortnite`, `apex`, `r6-siege`, `valorant`, `overwatch-2`, `splitgate`,
`marvel-rivals`, `bloodhunt`, `halo-infinite`, `cs2`, `rocket-league`.

### Battlefield titles

`battlefield-3`, `battlefield-4`, `battlefield-hardline`, `battlefield-1`,
`battlefield-5`, `battlefield-2042` — share `gametools.network` provider.

### Call of Duty family (companion ingest only)

`cod-warzone`, `cod-cold-war`, `cod-mwii`, `cod-mwiii`, `cod-bo6`.
Activision shut down the public stats API; CoD data only arrives via paired
companion. See [`docs/CLIENT.md`](docs/CLIENT.md).

### Destiny, Division, For Honor, MOBAs

`destiny`, `destiny-2`, `the-division`, `the-division-2`, `for-honor`,
`lol`, `tft`.

### Ingest-only / specialty

`arc-raiders` (no public API; companion only), `vrchat-worlds` (worlds-only
analytics, no user PII).

---

## Why this beats tracker.gg

| Pain point                                                                | What we do                                                                                                                   |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| tracker.gg keeps stale stats when a console swaps its underlying account  | Nightly **identity re-resolve** + manual "Re-resolve" button per linked account. Identity history is kept on the row.        |
| Per-game news scattered across the web                                    | Each game's landing page shows news from `getNews()` or fallback RSS. 30 min Redis cache.                                    |
| No way to track games without an API                                      | `/ingest/:game` with paired device keys. Same DB + WS pipeline as live integrations.                                          |
| Closed system, no useful public API                                       | Versioned `/api/...` REST surface with API keys, per-key rate limits, and Swagger docs.                                       |
| Same-name accounts on different platforms collide                         | `(game, platform, providerId)` composite key. PSN Apex and Origin Apex are distinct rows.                                     |
| No social presence on profile                                             | Profile bio + Twitter/Twitch/YouTube/Discord/Kick/etc. link list.                                                            |

---

## Real-time pipeline

```
                         ┌────────────────────────────┐
                         │ /ingest/:game              │  ←── companion / overlay
                         │ (DeviceKeyGuard)           │
  ┌──────────────────┐   └─────────────┬──────────────┘
  │ RefreshScheduler │ ──┐             │
  │   @every-minute  │   │             │
  └──────────────────┘   │             ▼
                         │   ┌─────────────────────┐
                         └──▶│ stats-refresh queue │
                             │  (BullMQ / Redis)   │
                             └──────────┬──────────┘
                                        │
                                        ▼
                             ┌─────────────────────┐
                             │ StatsRefreshProcessor│
                             │  (integration call   │
                             │   OR ingest snapshot)│
                             └──────────┬──────────┘
                                        │
                                        ▼
                             ┌─────────────────────┐
                             │ EventsGateway (WS)   │
                             │ profile:<g>:<p>:<id> │
                             └─────────────────────┘
```

Identity re-resolve runs on its own daily schedule and updates
`LinkedAccount.providerId` when a platform's username→stable-id mapping has
changed under the user.

---

## REST API summary

Swagger UI at **`/docs`** when the backend is running. Highlights:

### Games / public lookups
- `GET  /games`
- `GET  /games/:game/platforms`
- `GET  /games/:game/search?q=...&platform=...`
- `GET  /games/:game/player/:providerId?platform=...&refresh=true`
- `GET  /games/:game/player/:providerId/history?platform=...`
- `GET  /games/:game/player/:providerId/matches?platform=...`
- `POST /games/:game/player/:providerId/refresh?platform=...`   *(admin)*

### News
- `GET  /news/:game?limit=12`

### Leaderboards
- `GET  /leaderboards/:game?metric=level|kd|wins|matches&platform=...&limit=100`

### Auth + user
- `POST /auth/{register,login,refresh,logout}`, `GET /auth/me`
- `GET  /users/:username`, `PATCH /users/me/settings` (avatarUrl, bio, socials, publicProfile)

### Connections + identity re-resolve
- `GET / POST / DELETE /connections`
- `POST /connections/:id/re-resolve`

### Devices + ingest (companion / Overwolf)
- `GET / POST / DELETE /devices`
- `POST /devices/pair/{start,complete}`
- `POST /ingest/:game` (`X-Device-Key` header)

### Public API (versioned, rate-limited, API-key aware)
- `GET /api/:game/player/:id?platform=...&refresh=true`
- `GET /api/:game/search?q=...&platform=...`
- `GET /api/:game/platforms`

### WebSocket (Socket.IO, default namespace)
- Client → server: `subscribe:profile { game, platform, providerId }`, `subscribe:leaderboard { game, platform, metric }`
- Server → client: `stats:updated`, `rank:changed`, `level:up`, `match:new`, `leaderboard:moved`, `notification`

---

## Frontend pages

| Route                                          | Description                                                  |
| ---------------------------------------------- | ------------------------------------------------------------ |
| `/`                                            | Home + search                                                |
| `/games`                                       | Catalog grid                                                 |
| `/games/:game`                                 | Per-game landing — search, news, recently tracked            |
| `/games/:game/:player?platform=...`            | Live profile (charts, K/D, match history)                    |
| `/leaderboards`                                | Per-game leaderboard                                         |
| `/login`, `/register`                          | Auth                                                         |
| `/profile/:username`                           | Public profile + socials + tracked players                   |
| `/connections`                                 | Link platforms, nightly re-resolve, identity history         |
| `/devices`                                     | Pair Overwolf companions / desktop ingest clients            |
| `/settings`                                    | Avatar, bio, public/private toggle, social links             |
| `/admin`                                       | Admin overview, queue stats, integrations status             |

---

## Security

- **Argon2id** passwords; **JWT** access + rotating opaque refresh.
- **Device keys** (`gpt_dev_…`) and **API keys** stored only as SHA-256 hashes.
- Helmet headers, CORS allow-list, NestJS Throttler global + tighter per-route limits on `/api` and `/ingest`.
- DTO validation everywhere via `class-validator` with `forbidNonWhitelisted`.
- Prisma parameterised queries (no string concat into SQL).
- RolesGuard for admin; DeviceKeyGuard for ingest; ApiKeyGuard for the public API.

Production hardening:
1. Replace JWT + Postgres secrets.
2. Encrypt `LinkedAccount.meta` before storing OAuth refresh tokens.
3. Issue TLS certs and uncomment the TLS block in [`docker/nginx/nginx.conf`](docker/nginx/nginx.conf).

---

## Adding a new game

1. Create `backend/src/games/integrations/<slug>/<slug>.integration.ts`.
   Extend `StubIntegration` for a typed placeholder, or implement
   `GameIntegration` directly for a live one. See
   [`hypixel.integration.ts`](backend/src/games/integrations/hypixel/hypixel.integration.ts)
   and [`osrs.integration.ts`](backend/src/games/integrations/osrs/osrs.integration.ts) as worked examples.
2. Add the slug + platforms to [`shared/src/games.ts`](shared/src/games.ts) `GAME_CATALOG`.
3. Register the new class in [`integrations.module.ts`](backend/src/games/integrations/integrations.module.ts).
4. (Optional) Add a credential env var to `.env.example`.

The registry, scheduler, REST routes, WS rooms, and frontend pages will pick
it up automatically.

---

## Scripts cheat-sheet

```bash
npm run dev              # backend + frontend
npm run build            # build shared → backend → frontend
npm run db:migrate       # prisma migrate dev
npm run db:seed          # admin + demo seed
npm run db:studio        # Prisma Studio
npm run docker:up        # full stack
npm run docker:logs
npm run docker:down
```

## License

MIT.
