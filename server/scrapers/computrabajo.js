// Computrabajo: filtro nativo pubdate=1 (últimas 24 h). El número de postulantes se intenta leer del detalle.
import { load, pickText, pickAttr, htmlToText } from '../lib/html.js';
import { parseAgoHours, parseApplicants, slugify } from '../lib/time.js';

export function parseList(html, domain = 'ar.computrabajo.com') {
  const $ = load(html), out = [];
  $('article.box_offer, article[data-id]').each((_, el) => {
    const $c = $(el), id = $c.attr('data-id') || (($c.find('a.js-o-link').attr('href') || '').match(/-([A-F0-9]{16,})/i) || [])[1];
    const title = pickText($c, ['a.js-o-link', 'h2 a']); if (!id || !title) return;
    let href = pickAttr($c, ['a.js-o-link', 'h2 a'], 'href'); if (href && href.startsWith('/')) href = `https://${domain}${href}`;
    out.push({
      id, portal: 'Computrabajo', title, company: pickText($c, ['a.fc_base.t_ellipsis', 'p.fs16 a.fc_base', 'p.dFlex a']),
      location: pickText($c, ['p.fs16.fc_base span.mr10', 'p.fs16 span', '.fs16.fc_base']), url: href,
      hoursAgo: parseAgoHours(pickText($c, ['p.fs13.fc_aux', 'p.fs13', '.fc_aux']))
    });
  });
  return out;
}
export function parseDetail(html) {
  const $ = load(html), n = $('div[div-link="oferta"], #oferta-content, .box_detail, .fs16.t_word_wrap').first();
  const text = n.length ? htmlToText($, n) : '';
  return { text, ...parseApplicants($('body').text().slice(0, 20000)) };
}
export async function search(opts, ctx) {
  const { query, location = '', hours = 24, limit = 25, detail = true, domains = {} } = opts, domain = domains.computrabajo || 'ar.computrabajo.com';
  const pub = hours <= 24 ? 1 : hours <= 72 ? 3 : 7;
  const url = `https://${domain}/trabajo-de-${slugify(query)}${location ? `-en-${slugify(location)}` : ''}?pubdate=${pub}`;
  const html = await ctx.getHtml(url, { waitFor: 'article.box_offer' });
  if (/(captcha|just a moment|verifying you are human)/i.test(html) && !/box_offer/.test(html)) throw new Error('Computrabajo bloqueó el acceso automatizado (captcha).');
  // pubdate ya filtra en el portal ("Hoy"/"Ayer" sin hora exacta): se tolera hasta +24 h y se ajusta al tope pedido.
  const items = parseList(html, domain).filter(x => x.hoursAgo == null || x.hoursAgo < hours + 24).slice(0, limit);
  items.forEach(x => { x.hoursAgo = x.hoursAgo == null ? hours : Math.min(x.hoursAgo, hours); });
  if (detail) for (const it of items) { try { Object.assign(it, parseDetail(await ctx.getHtml(it.url, { waitFor: 'div[div-link="oferta"], .box_detail' }))); } catch (e) { it.detailError = e.message; } }
  return items;
}
