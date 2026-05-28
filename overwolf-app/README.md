# GamePulseTracker — Overwolf companion

This is the desktop companion app that runs inside **Overwolf** and forwards
in-game stats to your self-hosted GamePulseTracker server. Use it for games
whose stats are NOT available via a public API (CoD, Warframe inventory,
Arc Raiders, Marvel Rivals, etc.).

It's intentionally small. The interesting code lives in
[`js/background.js`](js/background.js) (subscribes to Overwolf events) and
[`js/games.js`](js/games.js) (per-game payload shapers).

---

## ⚠ Important: you need a whitelisted Overwolf developer account first

> **"Unauthorized App — You're trying to install an app from an unauthorized
> source. To download new apps, please visit the official Overwolf Appstore."**

This dialog is **not a bug in our app or our manifest**. Overwolf does not
allow sideloaded apps from accounts that have not been **server-side
whitelisted as developers**. The old "click version 5 times" trick was
removed. There is no self-serve toggle today, and no CLI sideload flow.

You have to apply once to unlock the Load Unpacked Extension path on your
account. After that, sideloading our (or any unsigned) app works
indefinitely.

### Get dev access (one-time, per Overwolf account)

1. Sign in at **<https://dev.overwolf.com>** with your Overwolf account.
2. Follow the **App Submission / Project Proposal** flow. This produces an app
   record in the Overwolf Developer Console. Approval is done by Overwolf
   QA/DevRel — turnaround is typically days, sometimes longer.
3. Once approved, your account gains access to
   <https://console.overwolf.com> and the ability to sideload.

### Switch to the Developers channel of the Overwolf client

After your account is whitelisted:

1. Open the public Overwolf client.
2. Go to **Settings → About**.
3. Hold **Ctrl+Shift** and **left-click the Overwolf logo**.
4. Type `Developers` in the channel field that appears, click **Update**,
   relaunch the client.

The Developers channel exposes the **Development Options** menu the public
channel hides.

### Sign in (this is the step that bypasses the "Unauthorized App" dialog)

Sign in to the Developers-channel client with the **whitelisted account**.
If you're signed out or signed in with a non-whitelisted account, you will
keep seeing the Unauthorized App dialog even after switching channels.

### Load this app as an unpacked extension

Either:

- **Wrench icon in the OW dock → About tab → Development Options → Load unpacked extension**, or
- **Right-click the OW system-tray icon → Packages → Load unpacked extension**.

Then point at the folder containing this app's `manifest.json` (i.e. the
`overwolf-app/` directory in this repo).

No `meta.uid` is required for local loading. UIDs only come into play if you
publish through `console.overwolf.com`.

---

## What if I can't (or don't want to) wait for Overwolf approval?

You don't have to. Companion ingest is the *desired* path for games like
Warframe inventory, Arc Raiders, CoD — but the server accepts ingest from
**any** client that has a paired device key. You can:

- Write a small Node/Python desktop script that tails game logs (Warframe's
  `EE.log` is well-documented) and POSTs to `/ingest/<game>`. No Overwolf
  required.
- Use a browser extension to grab stats from in-game-overlay alternatives
  like the Steam community overlay.
- Skip ingest entirely for games where you don't actually need it; live
  integrations cover the rest.

The Overwolf companion is the convenient option, not the only one.

---

## Build a distributable `.opk`

Once your app is in the Overwolf Developer Console you can package it for
the store with the bundled OWConsole CLI:

```
OWConsole.exe -pack <full path to overwolf-app> <full output path>\GamePulseTracker.opk
```

Then either upload to the Overwolf store (recommended for end-users) or host
the `.opk` on a GitHub Release / your own CDN and point
`NEXT_PUBLIC_OVERWOLF_DOWNLOAD_URL` at it. Note that **end-users still need
the Overwolf client installed** — the `.opk` only runs inside Overwolf.

## Adding a game

1. Find the Overwolf `classId` in
   <https://overwolf.github.io/docs/api/overwolf-games-events#supported-games>
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

## Sources for the install procedure above

- <https://dev.overwolf.com/ow-native/reference/ow-sdk-introduction/> (whitelist requirement)
- <https://dev.overwolf.com/ow-native/getting-started/onboarding-resources/setting-up-dev-environment/> (Developers channel + Ctrl+Shift+click logo)
- <https://dev.overwolf.com/ow-native/getting-started/onboarding-resources/basic-sample-app/> (Load unpacked extension UI path + the literal Unauthorized App text)
- <https://console.overwolf.com/> (post-approval portal)
