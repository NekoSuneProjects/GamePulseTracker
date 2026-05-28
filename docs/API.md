# GamePulseTracker API reference

The live Swagger UI is at **`http://<host>:4000/docs`** when the backend is running.
Schemas are auto-generated from the NestJS controllers and DTOs in
[backend/src/](../backend/src/) — that file is the source of truth. This doc is
the human-readable summary.

All responses share a single envelope:

```json
// success
{ "ok": true,  "data": <payload> }
// error
{ "ok": false, "error": { "code": "ERROR_CODE", "message": "...", "details": ... } }
```

All authenticated endpoints expect `Authorization: Bearer <accessToken>`. The
public API endpoints under `/api/...` optionally accept `X-API-Key: <key>` to
lift their rate limit.

---

## Auth

### POST /auth/register
Body: `{ username, email, password }`
→ `AuthSession { user, accessToken, refreshToken, expiresAt }`

### POST /auth/login
Body: `{ identifier (username or email), password }`
→ `AuthSession`

### POST /auth/refresh
Body: `{ refreshToken }`
→ `AuthSession` — rotates the refresh token (old one is revoked).

### POST /auth/logout  (bearer)
Body: `{ refreshToken }`

### GET /auth/me  (bearer)
→ `AuthUser`

---

## Users

### GET /users/:username
Public profile (404 if user doesn't exist, 403 if private).
→ `{ id, username, avatarUrl, createdAt, linkedAccounts, trackedProfiles }`

### PATCH /users/me/settings  (bearer)
Body: `{ avatarUrl?, publicProfile? }`

---

## Connections (account linking)

### GET /connections  (bearer)
→ `LinkedAccount[]`

### POST /connections  (bearer)
Body: `{ platform, providerId, displayName, meta?, verified? }`
Platforms supported in catalog: `epic`, `ea`, `activision`, `bungie`, `riot`,
`steam`, `xbox`, `playstation`, `discord`, `minecraft`.

### DELETE /connections/:id  (bearer)

---

## Games

### GET /games
→ `[ { slug, name, provider, live, enabled }, ... ]`

### GET /games/:game/search?q=...
Provider-side search. Cached 60s in Redis.

### GET /games/:game/player/:providerId?refresh=true
Fetches normalized profile. If `refresh=true` or no snapshot exists,
queries the integration synchronously. Otherwise returns the latest cached
snapshot from `TrackedProfile.latestSnapshot`.

Response:
```json
{
  "ok": true,
  "data": {
    "profile":  { /* TrackedProfile row */ },
    "snapshot": { /* NormalizedProfile */ },
    "fresh":    true
  }
}
```

### GET /games/:game/player/:providerId/history
→ Last 200 `StatSnapshot` rows ordered ascending. Used by the profile page
charts to render time-series.

### GET /games/:game/player/:providerId/matches
→ `MatchRecord[]` (last 25).

### POST /games/:game/player/:providerId/refresh  (admin)
Enqueues a high-priority refresh via BullMQ.

---

## Leaderboards

### GET /leaderboards/:game?metric=level&limit=100
`metric` ∈ `level | kd | wins | matches`. Result cached 60s in Redis.

→ `LeaderboardEntry[] = [{ rank, providerId, displayName, avatarUrl?, metricLabel, metricValue }, ...]`

---

## Stats

### GET /stats/recent?limit=25
Most-recently-fetched tracked profiles across all games.

### GET /stats/summary
→ `{ profiles, snapshots, users }`

---

## Notifications  (bearer)

- `GET /notifications?unread=true`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`

---

## Admin  (role=ADMIN)

- `GET  /admin/overview` — counts, integrations, queue stats
- `GET  /admin/users`
- `POST /admin/users/:id/ban`
- `GET  /admin/logs`

---

## Public API

These endpoints are designed for third-party / API-key consumers. They share
the same data layer as `/games/...`, but live under `/api/...` to make
versioning / rate-limit / API-key behavior explicit.

Headers (optional): `X-API-Key: gpt_<your_key>`

- `GET /api/:game/player/:id?refresh=true` — same shape as `/games/:game/player/:providerId`
- `GET /api/:game/search?q=...`

Examples from the original spec:
- `GET /api/fortnite/player/Ninja`
- `GET /api/apex/player/iiTzTimmy`
- `GET /api/destiny-2/player/4611686018470031068`
- `GET /api/hypixel/player/069a79f4-44e9-4726-a5be-fca90e38aaf5`

Rate limits (per IP, configurable):
- `5 req/sec` + `120 req/min` without API key
- Configurable per-key via `ApiKey.rateLimit` in the database

---

## WebSocket (Socket.IO)

Default namespace at the backend's root. The same origin/port as REST.

```ts
import { io } from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000');

socket.emit('subscribe:profile', { game: 'hypixel', providerId: '<uuid>' });

socket.on('stats:updated',  (payload) => { /* { game, providerId, profile, delta } */ });
socket.on('rank:changed',   (payload) => { /* { game, providerId, oldRank, newRank } */ });
socket.on('level:up',       (payload) => { /* { game, providerId, oldLevel, newLevel } */ });
socket.on('match:new',      (payload) => { /* { game, providerId, matchId } */ });
socket.on('leaderboard:moved', (payload) => { /* { game, providerId, oldRank, newRank } */ });
```

Subscriptions are room-based, so a client only receives events for profiles
it has subscribed to. The frontend's [`useLiveProfile`](../frontend/src/lib/socket.ts)
hook manages this lifecycle automatically.

---

## Error codes

| Code                    | HTTP | Meaning                                   |
| ----------------------- | ---- | ----------------------------------------- |
| `INVALID_CREDENTIALS`   | 401  | login failed                              |
| `INVALID_TOKEN`         | 401  | bearer token expired or revoked           |
| `INVALID_REFRESH`       | 401  | refresh token invalid / rotated           |
| `INVALID_API_KEY`       | 401  | `X-API-Key` invalid                       |
| `FORBIDDEN`             | 403  | role check failed                         |
| `PROFILE_PRIVATE`       | 403  | viewing a non-public user profile         |
| `USER_NOT_FOUND`        | 404  | `/users/:username` not found              |
| `PROFILE_NOT_FOUND`     | 404  | tracked profile history not yet recorded  |
| `INTEGRATION_NOT_FOUND` | 404  | unknown `:game` slug                      |
| `USER_EXISTS`           | 409  | duplicate username/email                  |
| `ACCOUNT_LINKED_ELSEWHERE` | 409 | platform account already linked        |
| `INTERNAL_ERROR`        | 5xx  | unhandled, see logs                       |
