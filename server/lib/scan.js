import * as linkedin from '../scrapers/linkedin.js';
import * as indeed from '../scrapers/indeed.js';
import * as computrabajo from '../scrapers/computrabajo.js';
import * as getonboard from '../scrapers/getonboard.js';
import * as remoteok from '../scrapers/remoteok.js';
import * as weworkremotely from '../scrapers/weworkremotely.js';
import * as remotive from '../scrapers/remotive.js';
import * as arbeitnow from '../scrapers/arbeitnow.js';
export const SCRAPERS = { getonboard, remoteok, weworkremotely, remotive, arbeitnow, computrabajo, linkedin, indeed };
/** Por defecto solo fuentes abiertas; LinkedIn e Indeed hay que pedirlos explícitamente. */
export const DEFAULT_PORTALS = ['getonboard', 'remoteok', 'weworkremotely', 'remotive', 'arbeitnow', 'computrabajo'];
const MODALITY = /(remot|remote|teletrabajo|home office)/i;

/** Ejecuta los scrapers pedidos y devuelve ofertas normalizadas + errores por portal. */
export async function scan(opts, ctx) {
  const portals = (opts.portals && opts.portals.length ? opts.portals : DEFAULT_PORTALS).filter(p => SCRAPERS[p]);
  const offers = [], errors = [], seen = new Set(), perPortal = {};
  for (const p of portals) {
    try {
      const items = await SCRAPERS[p].search(opts, ctx); perPortal[p] = items.length;
      items.forEach(x => {
        const key = `${x.title}|${x.company}`.toLowerCase(); if (seen.has(key)) return; seen.add(key);
        offers.push({
          id: `${p}:${x.id}`, portal: x.portal, title: x.title, company: x.company || '', location: x.location || '', url: x.url,
          modality: x.modality || (MODALITY.test(`${x.title} ${x.location} ${(x.text || '').slice(0, 400)}`) ? 'Remoto' : 'Presencial'),
          hoursAgo: x.hoursAgo ?? null, applicants: x.applicants ?? null, applicantsMax: x.applicantsMax ?? null, text: x.text || '', detailError: x.detailError || null
        });
      });
    } catch (e) { errors.push({ portal: p, message: e.message }); }
  }
  return { offers, errors, perPortal };
}
