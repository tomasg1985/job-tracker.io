// Indeed: renderizado con Playwright. Indeed no publica el número de postulantes (applicants = null).
import { load, pickText, pickAttr, htmlToText } from '../lib/html.js';
import { parseAgoHours } from '../lib/time.js';

const BLOCK = /(just a moment|verifying you are human|captcha|access denied|unusual traffic|verificando que eres humano)/i;
export const isBlocked = html => BLOCK.test(html) && !/job_seen_beacon|jobsearch-ResultsList/.test(html);

export function parseList(html, domain = 'ar.indeed.com') {
  const $ = load(html), out = [];
  $('.job_seen_beacon, li div.cardOutline, div[data-jk]').each((_, el) => {
    const $c = $(el), jk = pickAttr($c, ['a[data-jk]', 'h2 a'], 'data-jk') || $c.attr('data-jk') || (($c.find('h2 a').attr('href') || '').match(/jk=([a-z0-9]+)/i) || [])[1];
    const title = pickText($c, ['h2.jobTitle span[title]', 'h2.jobTitle a span', 'h2.jobTitle', 'a.jcs-JobTitle span']);
    if (!jk || !title) return;
    out.push({
      id: jk, portal: 'Indeed', title, company: pickText($c, ['[data-testid="company-name"]', '.companyName']),
      location: pickText($c, ['[data-testid="text-location"]', '.companyLocation']), url: `https://${domain}/viewjob?jk=${jk}`,
      hoursAgo: parseAgoHours(pickText($c, ['[data-testid="myJobsStateDate"]', 'span.date', '.result-footer .date', '.new']))
    });
  });
  return [...new Map(out.map(x => [x.id, x])).values()];
}
export function parseDetail(html) {
  const $ = load(html), n = $('#jobDescriptionText').first();
  return { text: n.length ? htmlToText($, n) : '', applicants: null, applicantsMax: null };
}
export async function search(opts, ctx) {
  const { query, location = '', hours = 24, limit = 25, detail = true, domains = {} } = opts, domain = domains.indeed || 'ar.indeed.com';
  const p = new URLSearchParams({ q: query, l: location, fromage: String(Math.max(1, Math.ceil(hours / 24))), sort: 'date' });
  const html = await ctx.getHtml(`https://${domain}/jobs?${p}`, { waitFor: '.job_seen_beacon' });
  const all = parseList(html, domain);
  if (!all.length && isBlocked(html)) throw new Error('Indeed bloqueó el acceso automatizado (anti-bot/captcha). Prueba con otro dominio, menos frecuencia o desde tu IP residencial.');
  // fromage ya limita la antigüedad; si la tarjeta no trae hora, se asume dentro del tope pedido.
  const items = all.filter(x => x.hoursAgo == null || x.hoursAgo < hours + 24).slice(0, limit);
  items.forEach(x => { x.hoursAgo = x.hoursAgo == null ? hours : Math.min(x.hoursAgo, hours); });
  if (detail) for (const it of items) { try { Object.assign(it, parseDetail(await ctx.getHtml(it.url, { waitFor: '#jobDescriptionText' }))); } catch (e) { it.detailError = e.message; } }
  return items;
}
