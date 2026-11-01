import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import { scan, SCRAPERS } from './lib/scan.js';
import { createContext } from './lib/browser.js';

const PORT = +process.env.PORT || 3001, HOST = process.env.HOST || '127.0.0.1';
const app = express();
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
app.use(cors()); app.use(express.json({ limit: '200kb' }));
let ctx = null, busy = false;
// El navegador solo se abre si algún portal lo necesita (LinkedIn, Indeed, Computrabajo); las APIs no lo requieren.
const lazy = { getHtml: async (...a) => (ctx = ctx || await createContext({ headless: process.env.HEADLESS !== '0' })).getHtml(...a) };

app.get('/api/health', (_req, res) => res.json({ ok: true, version: '1.0.0', portals: Object.keys(SCRAPERS), busy }));

app.post('/api/scan', async (req, res) => {
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

const server = app.listen(PORT, HOST, () => console.log(`JobTrack Radar escuchando en http://${HOST}:${PORT}`));
const bye = async () => { try { if (ctx) await ctx.close(); } catch { /* */ } server.close(() => process.exit(0)); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
