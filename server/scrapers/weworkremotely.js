// We Work Remotely: feed RSS público. Título "Empresa: Puesto".
import { getText } from '../lib/http.js';
import { cheerio, htmlStringToText } from '../lib/html.js';
import { matchesQuery } from '../lib/query.js';

export function parseRss(xml, now = Date.now()) {
  const $ = cheerio.load(xml, { xmlMode: true }), out = [];
  $('item').each((_, el) => {
    const $i = $(el), raw = $i.children('title').text().trim(), k = raw.indexOf(':'), link = $i.children('link').text().trim() || $i.children('guid').text().trim();
    if (!raw || !link) return;
    const t = Date.parse($i.children('pubDate').text());
    out.push({
      id: link.split('/').pop(), portal: 'WeWorkRemotely', title: k > 0 ? raw.slice(k + 1).trim() : raw, company: k > 0 ? raw.slice(0, k).trim() : '',
      location: $i.children('region').text().trim() || 'Remoto', url: link, modality: 'Remoto', hoursAgo: Number.isFinite(t) ? Math.max(0, (now - t) / 36e5) : null, applicants: null,
      skills: $i.children('skills').text().trim(), text: `${htmlStringToText($i.children('description').text())}\n${$i.children('skills').text().trim()}`
    });
  });
  return out;
}
export async function search(opts) {
  const { query, hours = 24, limit = 25 } = opts;
  return parseRss(await getText('https://weworkremotely.com/remote-jobs.rss')).filter(x => (x.hoursAgo == null || x.hoursAgo <= hours) && matchesQuery(query, `${x.title} ${x.skills} ${x.company}`)).slice(0, limit);
}
