// Diagnóstico: node probe.mjs "desarrollador backend" "Buenos Aires"
// Guarda el HTML real de cada portal en server/debug/ y muestra cuántas ofertas logra leer cada parser.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createContext } from './lib/browser.js';
import * as li from './scrapers/linkedin.js';
import * as ind from './scrapers/indeed.js';
import * as ct from './scrapers/computrabajo.js';
import { slugify } from './lib/time.js';
const q = process.argv[2] || 'desarrollador backend', loc = process.argv[3] || '';
mkdirSync('debug', { recursive: true });
const ctx = await createContext({ headless: process.env.HEADLESS !== '0' });
const jobs = [
  ['linkedin', `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${new URLSearchParams({ keywords: q, location: loc, f_TPR: 'r86400', sortBy: 'DD', start: '0' })}`, 'li', h => li.parseList(h)],
  ['indeed', `https://ar.indeed.com/jobs?${new URLSearchParams({ q, l: loc, fromage: '1', sort: 'date' })}`, '.job_seen_beacon', h => ind.parseList(h)],
  ['computrabajo', `https://ar.computrabajo.com/trabajo-de-${slugify(q)}${loc ? '-en-' + slugify(loc) : ''}?pubdate=1`, 'article.box_offer', h => ct.parseList(h)]
];
for (const [name, url, wait, parse] of jobs) {
  try {
    const html = await ctx.getHtml(url, { waitFor: wait }); writeFileSync(`debug/${name}.html`, html);
    const r = parse(html);
    console.log(`${name}: HTML ${html.length} bytes · ofertas leídas: ${r.length}${r[0] ? ' · ej: ' + r[0].title + ' / ' + r[0].company + ' / ' + r[0].hoursAgo + ' h' : ''}`);
  } catch (e) { console.log(`${name}: ERROR ${e.message}`); }
}
await ctx.close();
