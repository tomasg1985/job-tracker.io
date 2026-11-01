// LinkedIn: usa los endpoints públicos "guest" (sin iniciar sesión). Respeta pausas y límites.
import { load, pickText, pickAttr, htmlToText } from '../lib/html.js';
import { parseApplicants, hoursFromDatetime, parseAgoHours } from '../lib/time.js';

const LIST = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';
const DETAIL = id => `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`;

export function parseList(html) {
  const $ = load(html), out = [];
  $('li').each((_, li) => {
    const $li = $(li), urn = $li.find('[data-entity-urn]').first().attr('data-entity-urn') || $li.attr('data-entity-urn') || '';
    const id = (urn.match(/(\d{6,})$/) || [])[1] || (($li.find('a.base-card__full-link').attr('href') || '').match(/(\d{8,})/) || [])[1];
    const title = pickText($li, ['.base-search-card__title', 'h3']);
    if (!id || !title) return;
    const dt = pickAttr($li, ['time'], 'datetime'), ttxt = pickText($li, ['time']);
    out.push({
      id, portal: 'LinkedIn', title, company: pickText($li, ['.base-search-card__subtitle', 'h4']),
      location: pickText($li, ['.job-search-card__location']), url: `https://www.linkedin.com/jobs/view/${id}`,
      hoursAgo: parseAgoHours(ttxt) ?? hoursFromDatetime(dt)
    });
  });
  return out;
}
export function parseDetail(html) {
  const $ = load(html);
  const node = $('.show-more-less-html__markup, .description__text').first();
  const text = node.length ? htmlToText($, node) : '';
  const appTxt = [pickText($('body'), ['.num-applicants__caption', '.num-applicants__figure', '.jobs-unified-top-card__applicant-count'])].join(' ') || $('body').text();
  const crit = $('.description__job-criteria-text').map((_, e) => $(e).text().trim()).get().join(' · ');
  return { text: (text + (crit ? `\n\nNivel/criterios: ${crit}` : '')).trim(), ...parseApplicants(appTxt) };
}

export async function search(opts, ctx) {
  const { query, location = '', hours = 24, limit = 25, detail = true } = opts, items = [];
  for (let start = 0; start < limit && start < 100; start += 25) {
    const p = new URLSearchParams({ keywords: query, location, f_TPR: `r${Math.round(hours * 3600)}`, sortBy: 'DD', start: String(start) });
    const html = await ctx.getHtml(`${LIST}?${p}`, { waitFor: 'li' });
    if (/authwall|sign in to view|iniciar sesi[oó]n para ver/i.test(html) && !/base-search-card/.test(html)) throw new Error('LinkedIn pidió iniciar sesión (muro de acceso). Reduce la frecuencia o intenta más tarde.');
    const page = parseList(html); if (!page.length) break; items.push(...page);
  }
  // LinkedIn ya filtra por f_TPR; su fecha solo trae el día, así que se tolera hasta +24 h de imprecisión y se ajusta al tope pedido.
  const fresh = items.filter(x => x.hoursAgo == null || x.hoursAgo < hours + 24).slice(0, limit);
  fresh.forEach(x => { x.hoursAgo = x.hoursAgo == null ? hours : Math.min(x.hoursAgo, hours); });
  if (detail) for (const it of fresh) {
    try { Object.assign(it, parseDetail(await ctx.getHtml(DETAIL(it.id), { waitFor: '.show-more-less-html__markup' }))); }
    catch (e) { it.detailError = e.message; }
  }
  return fresh;
}
