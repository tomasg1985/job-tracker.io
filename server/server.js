import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import { scan, SCRAPERS } from './lib/scan.js';
import { createContext } from './lib/browser.js';
import { createStore } from './lib/store.js';
import { makeAuth } from './lib/auth.js';

const PORT = +process.env.PORT || 3001, HOST = process.env.HOST || (process.env.RENDER ? '0.0.0.0' : '127.0.0.1');
const app = express();
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
app.set('trust proxy', 1);
app.use(cors());
const store = await createStore(), auth = makeAuth({ host: HOST });
let ctx = null, busy = false;
// El navegador solo se abre si algún portal lo necesita (LinkedIn, Indeed, Computrabajo); las APIs no lo requieren.
const lazy = { getHtml: async (...a) => (ctx = ctx || await createContext({ headless: process.env.HEADLESS !== '0' })).getHtml(...a) };

app.get('/api/health', (_req, res) => res.json({ ok: true, version: '1.1.0', portals: Object.keys(SCRAPERS), busy, sync: { available: auth.configured || auth.loopback, needsKey: auth.configured, store: store.kind } }));

// ── Sincronización del estado entre dispositivos ──
app.get('/api/auth', auth.mw, (_req, res) => res.json({ ok: true }));
app.get('/api/state', auth.mw, async (req, res) => {
  try {
    const cur = await store.get(), since = req.query.since === undefined ? null : +req.query.since;
    if (since !== null && since === cur.version) return res.json({ ok: true, unchanged: true, version: cur.version });
    res.json({ ok: true, ...cur });
  } catch (e) { console.error('[state:get]', e); res.status(500).json({ ok: false, error: 'No se pudo leer la base de datos.' }); }
});
app.put('/api/state', auth.mw, express.json({ limit: '15mb' }), async (req, res) => {
  const { data, baseVersion } = req.body || {};
  if (!data || typeof data !== 'object' || !Array.isArray(data.cvs) || !Array.isArray(data.offers)) return res.status(400).json({ ok: false, error: 'Estado inválido.' });
  try {
    const r = await store.put(data, Number.isInteger(baseVersion) ? baseVersion : -1);
    res.status(r.ok ? 200 : 409).json(r.ok ? r : { ...r, error: 'Hay una versión más reciente en el servidor.' });
  } catch (e) { console.error('[state:put]', e); res.status(500).json({ ok: false, error: 'No se pudo guardar en la base de datos.' }); }
});

app.post('/api/scan', express.json({ limit: '200kb' }), async (req, res) => {
  if (busy) return res.status(429).json({ ok: false, error: 'Ya hay un escaneo en curso. Espera a que termine.' });
  const b = req.body || {}, query = String(b.query || '').trim();
  if (query.length < 2) return res.status(400).json({ ok: false, error: 'Falta "query" (puesto o palabras clave).' });
  const opts = {
    query, location: String(b.location || '').trim(), hours: Math.min(168, Math.max(1, +b.hours || 24)), limit: Math.min(60, Math.max(1, +b.limit || 25)),
    portals: Array.isArray(b.portals) ? b.portals.map(String) : [], detail: b.detail !== false, domains: b.domains || {}
  };
  busy = true; const t0 = Date.now();
  try {
        const { offers, errors, perPortal } = await scan(opts, lazy);
    res.json({ ok: true, tookMs: Date.now() - t0, count: offers.length, offers, errors, perPortal });
  } catch (e) {
    console.error('[scan]', e);
    if (/Executable doesn't exist|browserType\.launch/.test(e.message)) return res.status(500).json({ ok: false, error: 'Playwright no tiene Chromium instalado. Ejecuta: npx playwright install chromium' });
    res.status(500).json({ ok: false, error: e.message });
  } finally { busy = false; }
});

// Sirve JobTrack desde el mismo servidor: abre http://localhost:PORT y evita bloqueos de CORS/red privada del navegador.
for (const f of ['index.html', 'styles.css', 'app.js']) app.get('/' + (f === 'index.html' ? '' : f), (_q, r) => r.sendFile(path.join(ROOT, f)));

const server = app.listen(PORT, HOST, () => console.log(`JobTrack escuchando en http://${HOST}:${PORT} · almacenamiento: ${store.kind}${auth.configured ? ' · clave de acceso activa' : auth.loopback ? ' · sin clave (solo local)' : ' · ⚠ falta ACCESS_KEY'}`));
const bye = async () => { try { if (ctx) await ctx.close(); await store.close(); } catch { /* */ } server.close(() => process.exit(0)); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
