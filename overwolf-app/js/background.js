/**
 * Background controller: subscribes to Overwolf game events for every game in
 * GPT_GAME_MAP, normalises them through GPT_HANDLERS, and POSTs to the
 * GamePulseTracker /ingest endpoint.
 *
 * Overwolf docs:
 *   https://overwolf.github.io/docs/api/overwolf-games
 *   https://overwolf.github.io/docs/api/overwolf-games-events
 */

let activeGameSlug = null;
let activeProviderId = 'companion-user';     // user can override from /settings
let lastSnapshotTs = 0;

const SETTINGS_WIN = 'settings';
const IN_GAME_WIN = 'in_game';

function log(...a) { console.log('[GPT-companion]', ...a); }

function onGameInfo(info) {
  if (!info || !info.gameInfo) return;
  const classId = info.gameInfo.classId;
  const isRunning = info.gameInfo.isRunning;
  const slug = window.GPT_GAME_MAP[classId];

  if (isRunning && slug) {
    activeGameSlug = slug;
    log(`Game started: ${slug} (classId=${classId})`);
    overwolf.windows.obtainDeclaredWindow(IN_GAME_WIN, () => {});
    overwolf.games.events.setRequiredFeatures(['match_info','match','stats','kill','death','rank'], (r) => log('features', r));
  } else if (!isRunning && activeGameSlug) {
    log(`Game stopped: ${activeGameSlug}`);
    activeGameSlug = null;
  }
}

function onEventOrInfo(payload) {
  if (!activeGameSlug) return;
  const cfg = window.GPT.get();
  if (cfg.enabledGames && cfg.enabledGames[activeGameSlug] === false) return;

  // Light throttle: at most one snapshot every 5 seconds.
  const now = Date.now();
  if (now - lastSnapshotTs < 5_000) return;
  lastSnapshotTs = now;

  const handler = window.GPT_HANDLERS[activeGameSlug] || ((info, pid) => window.GPT_HANDLERS._fallback(activeGameSlug, info, pid));
  const body = handler(payload, activeProviderId);
  if (!body) return;

  window.gptPostIngest(activeGameSlug, body).then((r) => {
    if (!r.ok) log(`ingest failed for ${activeGameSlug}: ${r.status} ${r.body.slice(0, 200)}`);
    else      log(`ingest ok ${activeGameSlug}`);
  });
}

// Boot
(function start() {
  log('Companion starting');
  const cfg = { ...window.GPT.defaults, ...window.GPT.get() };
  activeProviderId = cfg.providerId || 'companion-user';

  overwolf.games.onGameInfoUpdated.addListener(onGameInfo);
  overwolf.games.events.onInfoUpdates2.addListener(onEventOrInfo);
  overwolf.games.events.onNewEvents.addListener(onEventOrInfo);

  // If a game is already running when we start, sync it.
  overwolf.games.getRunningGameInfo((g) => onGameInfo({ gameInfo: { classId: g?.classId, isRunning: g?.isRunning } }));

  // Open settings window on first run if no device key.
  if (!cfg.deviceKey) overwolf.windows.obtainDeclaredWindow(SETTINGS_WIN, (r) => {
    if (r.success && r.window?.id) overwolf.windows.restore(r.window.id, () => {});
  });
})();
