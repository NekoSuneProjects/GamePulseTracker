/**
 * Map of Overwolf classId → GamePulseTracker game slug.
 * Add new entries as you wire more games. ClassIds:
 *   https://overwolf.github.io/docs/api/overwolf-games-events#supported-games
 */
const GPT_GAME_MAP = {
  21216: 'fortnite',
  21566: 'apex',
  21640: 'valorant',
   5426: 'lol',
  10826: 'r6-siege',
  10906: 'cod-warzone',
  10798: 'rocket-league',
  10844: 'overwatch-2',
   9898: 'hearthstone',
  21570: 'marvel-rivals',
  21277: 'cod-bo6',
  21509: 'cod-mwiii',
  21626: 'arc-raiders',
};

/**
 * Per-game event/info handlers. Each takes the raw Overwolf event payload and
 * returns an IngestPayload (or null to skip). Keep these small — the server
 * tolerates partial snapshots.
 */
const GPT_HANDLERS = {
  fortnite(info, providerId) {
    const stats = (info?.stats || {});
    const match = (info?.match_info || {});
    return {
      game: 'fortnite',
      providerId,
      displayName: providerId,
      capturedAt: new Date().toISOString(),
      snapshot: {
        game: 'fortnite', providerId, displayName: providerId,
        headline: {
          wins:    Number(stats.wins ?? 0),
          matches: Number(stats.matches ?? 0),
          kd:      Number(stats.kd ?? 0),
          level:   Number(stats.level ?? 0),
        },
        details: { mode: match.mode ?? null, map: match.map ?? null },
      },
    };
  },

  'cod-warzone'(info, providerId) {
    const m = (info?.match || {});
    return {
      game: 'cod-warzone', providerId, displayName: providerId,
      capturedAt: new Date().toISOString(),
      snapshot: {
        game: 'cod-warzone', providerId, displayName: providerId,
        headline: { kd: Number(m.kdr ?? 0), wins: Number(m.wins ?? 0), matches: Number(m.matches ?? 0) },
        details: { gameMode: m.mode ?? null, placement: m.placement ?? null },
      },
    };
  },

  warframe(info, providerId) {
    // Warframe doesn't expose live events via Overwolf; the desktop wrapper
    // tails EE.log and synthesises events. This default handler just relays
    // whatever the desktop side has pushed into the in-game window.
    const s = info?.warframe_snapshot;
    if (!s) return null;
    return {
      game: 'warframe', providerId, displayName: providerId,
      capturedAt: new Date().toISOString(),
      snapshot: { game: 'warframe', providerId, displayName: providerId, ...s },
    };
  },

  'arc-raiders'(info, providerId) {
    return {
      game: 'arc-raiders', providerId, displayName: providerId,
      capturedAt: new Date().toISOString(),
      snapshot: {
        game: 'arc-raiders', providerId, displayName: providerId,
        headline: { wins: Number(info?.wins ?? 0), matches: Number(info?.matches ?? 0) },
        details: info ?? {},
      },
    };
  },

  // Generic fallback: just dump whatever Overwolf told us into details.
  _fallback(slug, info, providerId) {
    return {
      game: slug, providerId, displayName: providerId,
      capturedAt: new Date().toISOString(),
      snapshot: { game: slug, providerId, displayName: providerId, headline: {}, details: info ?? {} },
    };
  },
};

window.GPT_GAME_MAP = GPT_GAME_MAP;
window.GPT_HANDLERS = GPT_HANDLERS;
