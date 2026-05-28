/**
 * Persistent config (Overwolf has no localStorage in background pages without
 * an extension permission, so we use overwolf.profile + window.localStorage).
 */
const GPT = {
  STORAGE_KEY: 'gpt:companion:config',

  get() {
    try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}'); }
    catch { return {}; }
  },
  set(patch) {
    const merged = { ...this.get(), ...patch };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
    return merged;
  },

  /** Defaults the UI will show if nothing has been stored yet. */
  defaults: {
    serverUrl: 'http://localhost:4000',
    deviceKey: '',
    enabledGames: {
      fortnite: true,
      'cod-warzone': true,
      valorant: true,
      lol: true,
      'r6-siege': true,
      apex: true,
      'rocket-league': true,
      'overwatch-2': true,
      warframe: true,
      'arc-raiders': true,
      'marvel-rivals': true,
    },
  },
};

// expose for other scripts
window.GPT = GPT;
