# GamePulseTracker — Overwolf companion

This is the desktop companion app that runs inside **Overwolf** and forwards
in-game stats to your self-hosted GamePulseTracker server. Use it for games
whose stats are NOT available via a public API (CoD, Warframe inventory,
Arc Raiders, Marvel Rivals, etc.).

It's intentionally small. The interesting code lives in
[`js/background.js`](js/background.js) (subscribes to Overwolf events) and
[`js/games.js`](js/games.js) (per-game payload shapers).

## Install for development

1. Install [Overwolf](https://www.overwolf.com/) on Windows.
2. Open Overwolf settings → **About** → **Development Options** → **Load unpacked extension** → pick this `overwolf-app/` folder.
3. Open the GamePulseTracker companion from your Overwolf dock.
4. Paste your server URL and a device key issued at `/devices` on the web app.
5. Toggle which games you want to forward, then launch one.

## Build a distributable `.opk`

Overwolf's `OWConsole` (bundled with Overwolf) packages a folder into a
`.opk` file:

```
OWConsole.exe -pack <full path to overwolf-app> <full output path>\GamePulseTracker.opk
```

Then either upload to the Overwolf store (recommended for end-users) or host
the `.opk` on a GitHub Release / your own CDN and point
`NEXT_PUBLIC_OVERWOLF_DOWNLOAD_URL` at it.

## Adding a game

1. Find the Overwolf `classId` in
   https://overwolf.github.io/docs/api/overwolf-games-events#supported-games
2. Add it to `GPT_GAME_MAP` in [`js/games.js`](js/games.js) with the matching
   GamePulseTracker game slug (matches `shared/src/games.ts` `GAME_CATALOG`).
3. Add a handler in `GPT_HANDLERS` that turns Overwolf's event/info payload
   into an `IngestPayload`. Keep it small — the server tolerates partial
   snapshots and there is a fallback handler if you don't write one.
4. Add the game to the manifest's `game_targeting.game_ids` array.

## What we DON'T do

- No memory reading, anti-cheat hooking, or DLL injection.
- No collection of other players' PII.
- No automatic streaming of Overwolf telemetry to anywhere but your own server.

If you're publishing your build to the Overwolf store, double-check Overwolf's
own ToS and the relevant game's ToS first.

## ToS reminder

This companion sends data the user *can already see in their own client* to
*their own server*. It does not provide any competitive advantage and is not
intended to facilitate cheating.
