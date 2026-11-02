// Clave de acceso de un solo usuario. Sin ACCESS_KEY solo se permite en loopback (desarrollo local).
import crypto from 'node:crypto';

const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const fails = new Map(); // ip -> { n, until }

export function makeAuth({ key = process.env.ACCESS_KEY, host = '127.0.0.1' } = {}) {
  const loopback = /^(127\.|localhost|::1)/.test(host);
  const configured = !!key;
  const mw = (req, res, next) => {
    if (!configured) {
      if (loopback) return next();
      return res.status(503).json({ ok: false, error: 'El servidor no tiene ACCESS_KEY configurada: defínela en las variables de entorno.' });
    }
    const ip = req.ip || 'x', f = fails.get(ip);
    if (f && f.n >= 8 && Date.now() < f.until) return res.status(429).json({ ok: false, error: 'Demasiados intentos. Espera unos minutos.' });
    const given = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (given && crypto.timingSafeEqual(sha(given), sha(key))) { fails.delete(ip); return next(); }
    const n = (f && Date.now() < f.until ? f.n : 0) + 1; fails.set(ip, { n, until: Date.now() + 10 * 60 * 1000 });
    res.status(401).json({ ok: false, error: 'Clave de acceso incorrecta.' });
  };
  return { mw, configured, loopback };
}
