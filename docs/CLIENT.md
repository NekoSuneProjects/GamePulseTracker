# Companion ingest spec — `CLIENT.md`

This document describes how a desktop / Overwolf / screen-reader companion app
pairs with a GamePulseTracker server and uploads stats for games that don't
expose a public API.

There are two kinds of clients we expect:

1. **Overwolf overlays** — listen to in-game events that Overwolf exposes
   (Fortnite, CoD, Valorant, LoL, etc.) and forward those events to the
   server.
2. **Screen-reader / local-companion** desktop apps — read in-game UI text
   or files the user has access to on their own machine (e.g. Warframe's
   `EE.log`, Arc Raiders' local cache, VRChat world favorites).

Neither path should violate any game's ToS, because **the user voluntarily
sends data they themselves can already see**. No anti-cheat hooking, no memory
reading, no scraping of authenticated APIs unless the user is logged in on
their own.

---

## 1. Pair the device

In the web app, sign in and visit **`/devices`**.

You can pair in two ways:

### Option A — Direct create (UI-only)

POST `/devices` with a label. The response returns the plaintext device key
once. Copy it into your companion's settings.

```http
POST /devices
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "label": "Gaming PC Overwolf",
  "scopes": ["warframe", "arc-raiders"]
}
```

```json
{ "ok": true, "data": { "deviceId": "ckxxx", "prefix": "gpt_dev_ab",
  "deviceKey": "gpt_dev_ab8f0..._never_shown_again" } }
```

`scopes` is optional — leave it empty/`[]` to allow ingesting for any game.

### Option B — Pairing-code flow (companion-led)

Use this when the companion app can't display a long key safely. The web UI
issues a short 7-character code, the companion sends it back, the server
returns a fresh key.

```
1. Web UI:           POST /devices/pair/start    → { code: "K3X-9PQ" }
2. Companion shows:  "Type K3X-9PQ on the website"
3. Web UI:           POST /devices/pair/complete { code: "K3X-9PQ" } → { deviceKey: ... }
4. Web UI sends key to companion (e.g. via local IPC, QR, or copy/paste).
```

---

## 2. Post stats to `/ingest/:game`

```http
POST /ingest/warframe
X-Device-Key: gpt_dev_ab8f0...
Content-Type: application/json

{
  "game": "warframe",
  "platform": "pc",
  "providerId": "warframename",
  "displayName": "WarframeName",
  "capturedAt": "2026-05-28T15:32:11Z",
  "snapshot": {
    "game": "warframe",
    "providerId": "warframename",
    "displayName": "WarframeName",
    "headline": {
      "level": 30,
      "xp": 84210,
      "matches": 1421
    },
    "details": {
      "masteryRank": 30,
      "credits": 5_120_000,
      "platinum": 1450,
      "primeFrames": 28
    }
  },
  "matches": [
    {
      "matchId": "abc-123",
      "playedAt": "2026-05-28T15:25:00Z",
      "mode": "Survival",
      "map": "Ceres",
      "result": "win",
      "kills": 482,
      "deaths": 0,
      "durationSec": 1200
    }
  ],
  "events": [
    { "type": "level:up",    "payload": { "oldLevel": 29, "newLevel": 30 } },
    { "type": "inventory:snapshot", "payload": { "primeFrames": 28, "credits": 5120000 } }
  ]
}
```

Response:
```json
{ "ok": true, "data": { "profileId": "ckxxx", "game": "warframe",
                        "platform": "pc", "providerId": "warframename" } }
```

The server:
- Authenticates the device key
- Checks `scopes` (if set, must include the path's `:game`)
- Persists a `StatSnapshot`
- Upserts matches into `MatchRecord`
- Broadcasts `stats:updated` (and `level:up` / `rank:changed` if `events[]` are provided) over Socket.IO
- Stores the raw payload in `IngestEvent` for replay/debug

### Rate limits

Default per-device: **10 req/sec** + **300 req/min**. Override per device by
updating its `rateLimit` field. The throttle uses a short and long bucket so
short bursts (e.g. one-per-match) work even if you post several frames around
a match-end event.

### Recommended cadence

- **Once per match end** — full snapshot + the match.
- **Once every 5 minutes** while in-game — partial snapshot (just `headline` deltas).
- **Once on session start** — full snapshot for accurate baseline.

Avoid polling the server. Subscribe via Socket.IO if your overlay needs to
react to other players' stats moving on the same machine.

---

## 3. Payload schema (TypeScript)

All shapes live in [`shared/src/ingest.ts`](../shared/src/ingest.ts) and
[`shared/src/stats.ts`](../shared/src/stats.ts). The relevant types:

```ts
interface IngestPayload {
  game: GameSlug;
  platform?: string;
  providerId: string;
  displayName: string;
  capturedAt: string;     // ISO8601
  snapshot: Partial<NormalizedProfile> & {
    game: GameSlug; providerId: string; displayName: string;
    headline: Record<string, number | string | undefined>;
    details: Record<string, string | number | boolean | null>;
  };
  matches?: NormalizedMatch[];
  events?: IngestEvent[];
}

type IngestEvent =
  | { type: 'level:up';    payload: { oldLevel?: number; newLevel: number } }
  | { type: 'rank:changed'; payload: { oldRank?: string; newRank: string } }
  | { type: 'match:end';   payload: { matchId: string; result: 'win' | 'loss' | 'draw' } }
  | { type: 'inventory:snapshot'; payload: Record<string, unknown> };
```

---

## 4. What NOT to ingest

- Other players' PII (gamertags + stats are okay for *public* leaderboards; never collect IP/email/etc.)
- Game files protected by anti-cheat / DRM
- Authenticated VRChat or Discord user data — only world-level public analytics
- Anything you can't prove originated from a UI the user themselves can already see

When in doubt, leave it out. The server will reject malformed payloads with
clear error codes (`INVALID_INGEST`, `SCOPE_DENIED`, `DEVICE_REVOKED`).

---

## 5. Suggested companion implementations

| Game           | Implementation hint                                                                  |
| -------------- | ------------------------------------------------------------------------------------ |
| Warframe       | Tail `%LOCALAPPDATA%\Warframe\EE.log`. Extract mission-end blocks, mastery rank ups, syndicate REP gains (Suda/Loka/Meridian/Veil/Perrin/Arbiters), aya/credits/endo balance, riven slot count. Trade volume comes free from the server-side warframe.market integration. |
| Arc Raiders    | Overwolf manifest + game-events `experience`, `gun`, `match`.                       |
| CoD family     | Overwolf manifest `match_summary`. (Activision API not available.)                   |
| LoL / TFT      | Overwolf manifest `live_client_data`. (Riot prod-key fallback also possible.)        |
| Roblox         | Pull `users.roblox.com` server-side; per-game stats need Roblox HttpService bridges. |
| VRChat Worlds  | Use the API for world-info only (cookies provided by the user, worlds-only). Server-side integration already does this — no companion needed. |
| Beat Saber     | ScoreSaber's API is fully public — server-side integration already covers it. Companion can add `play-end` events for richer match history if desired. |

---

## 6. Testing locally

```bash
# 1) Create a device via curl:
curl -X POST http://localhost:4000/devices \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"label":"local-test"}'

# 2) Use the deviceKey to ingest:
curl -X POST http://localhost:4000/ingest/warframe \
  -H "X-Device-Key: gpt_dev_..." -H 'content-type: application/json' \
  -d @sample-warframe-payload.json
```
