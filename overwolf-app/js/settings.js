function $(id) { return document.getElementById(id); }

function renderGames() {
  const container = $('games');
  const cfg = { ...window.GPT.defaults, ...window.GPT.get() };
  const enabled = cfg.enabledGames ?? window.GPT.defaults.enabledGames;
  const slugs = Object.keys(window.GPT.defaults.enabledGames);
  container.innerHTML = '';
  for (const slug of slugs) {
    const id = `game_${slug}`;
    const row = document.createElement('label');
    row.className = 'game-row';
    row.innerHTML = `<input type="checkbox" id="${id}" ${enabled[slug] !== false ? 'checked' : ''}/> <span>${slug}</span>`;
    container.appendChild(row);
  }
}

function loadInitial() {
  const cfg = { ...window.GPT.defaults, ...window.GPT.get() };
  $('serverUrl').value = cfg.serverUrl ?? '';
  $('deviceKey').value = cfg.deviceKey ?? '';
  $('providerId').value = cfg.providerId ?? '';
  renderGames();
}

async function testConnection() {
  const url = $('serverUrl').value.replace(/\/$/, '');
  const key = $('deviceKey').value.trim();
  $('status').textContent = 'Testing…';
  try {
    const r = await fetch(`${url}/health`);
    if (!r.ok) throw new Error('server unhealthy: ' + r.status);
    const j = await r.json();
    if (!j.ok) throw new Error('server returned ok=false');
    $('status').className = 'ok';
    $('status').textContent = `Server is healthy. db=${j.checks.db} redis=${j.checks.redis}. ${key ? '' : '(Set a device key to start ingesting.)'}`;
  } catch (e) {
    $('status').className = 'err';
    $('status').textContent = `Test failed: ${e.message}`;
  }
}

function save() {
  const enabledGames = {};
  for (const slug of Object.keys(window.GPT.defaults.enabledGames)) {
    enabledGames[slug] = $(`game_${slug}`).checked;
  }
  window.GPT.set({
    serverUrl: $('serverUrl').value.trim(),
    deviceKey: $('deviceKey').value.trim(),
    providerId: $('providerId').value.trim(),
    enabledGames,
  });
  $('status').className = 'ok';
  $('status').textContent = 'Saved. Restart the game session to apply.';
}

document.addEventListener('DOMContentLoaded', () => {
  loadInitial();
  $('test').addEventListener('click', testConnection);
  $('save').addEventListener('click', save);
});
