/**
 * POST helper for /ingest/<game>. Reads server URL + device key from config.
 * Returns { ok, status, body } and never throws — the background loop should
 * keep running even if the server is down.
 */
async function gptPostIngest(game, payload) {
  const cfg = window.GPT.get();
  const url = (cfg.serverUrl || window.GPT.defaults.serverUrl).replace(/\/$/, '');
  const key = cfg.deviceKey;
  if (!key) return { ok: false, status: 0, body: 'no device key configured' };

  try {
    const res = await fetch(`${url}/ingest/${encodeURIComponent(game)}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-device-key': key,
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text };
  } catch (e) {
    return { ok: false, status: 0, body: String(e && e.message || e) };
  }
}

window.gptPostIngest = gptPostIngest;
