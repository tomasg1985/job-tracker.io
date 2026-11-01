// Utilidades de tiempo y postulantes (ES/EN). Funciones puras, sin dependencias.
const strip = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

/** "hace 3 horas", "3 hours ago", "Just posted", "Hoy", "hace 2 días"… → horas (número) o null */
export function parseAgoHours(text) {
  const t = strip(text);
  if (!t) return null;
  if (/(just posted|recien publicad|justo ahora|publicado ahora|active today)/.test(t)) return 1;
  if (/\b(hoy|today)\b/.test(t)) return 12;
  if (/\b(ayer|yesterday)\b/.test(t)) return 36;
  const m = t.match(/(\d+)\s*\+?\s*(minutos?|min|horas?|hours?|hrs?|h|dias?|days?|d|semanas?|weeks?|w|meses|mes|months?)\b/);
  if (!m) return null;
  const n = +m[1], u = m[2];
  if (/^min/.test(u)) return n / 60;
  if (/^(h|hr|hrs|hora|horas|hour|hours)$/.test(u)) return n;
  if (/^(d|dia|dias|day|days)$/.test(u)) return n * 24;
  if (/^(w|semana|semanas|week|weeks)$/.test(u)) return n * 24 * 7;
  return n * 24 * 30;
}

/** ISO completo o solo fecha (YYYY-MM-DD) → horas desde la publicación */
export function hoursFromDatetime(iso, now = Date.now()) {
  if (!iso) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const d = new Date(iso + 'T00:00:00'), today = new Date(now); today.setHours(0, 0, 0, 0);
    const days = Math.round((+today - +d) / 864e5);
    return days <= 0 ? 12 : days * 24 + 12; // solo hay fecha: hoy → "≤ 24 h", ayer → > 24 h
  }
  const t = Date.parse(iso); return Number.isNaN(t) ? null : Math.max(0, (now - t) / 36e5);
}

/** Texto de postulantes → { applicants, applicantsMax, over } */
export function parseApplicants(text) {
  const t = strip(text);
  if (!t) return { applicants: null, applicantsMax: null, over: false };
  let m = t.match(/(?:be among the first|se uno de los primeros|sé uno de los primeros)\s*(\d+)/) || t.match(/primeros\s*(\d+)\s*(?:solicitantes|candidatos|postulantes)/);
  if (m) return { applicants: null, applicantsMax: +m[1], over: false };
  m = t.match(/(?:over|mas de|more than)\s*(\d+)\s*(?:applicants|solicitantes|postulantes|candidatos|candidates|postulaciones)/);
  if (m) return { applicants: +m[1], applicantsMax: null, over: true };
  m = t.match(/(\d+)\s*(?:applicants|applicant|solicitantes|solicitud(?:es)?|postulantes|candidatos|candidates|postulaciones)/);
  if (m) return { applicants: +m[1], applicantsMax: null, over: false };
  return { applicants: null, applicantsMax: null, over: false };
}

export const slugify = s => strip(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const jitter = (a, b) => a + Math.random() * (b - a);
