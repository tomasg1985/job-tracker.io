// GetOnBoard (tecnología, Latinoamérica): API pública JSON. Incluye applications_count → postulantes reales.
import { getJson } from '../lib/http.js';
import { htmlStringToText } from '../lib/html.js';

const MOD = { remote: 'Remoto', hybrid: 'Híbrido', no_remote: 'Presencial', onsite: 'Presencial' };
export function parseItems(json, now = Date.now()) {
  return (json.data || []).map(j => {
    const a = j.attributes || {}, co = a.company?.data?.attributes?.name || '';
    const pub = typeof a.published_at === 'number' ? a.published_at * 1000 : Date.parse(a.published_at);
    const text = [a.description, a.projects, a.functions, a.desirable, a.benefits].filter(Boolean).map(htmlStringToText).join('\n\n');
    return {
      id: String(j.id), portal: 'GetOnBoard', title: a.title || '', company: co, location: (a.countries || []).join(', '), url: j.links?.public_url || '',
      modality: MOD[a.remote_modality] || (a.remote ? 'Remoto' : ''), hoursAgo: Number.isFinite(pub) ? Math.max(0, (now - pub) / 36e5) : null,
      applicants: Number.isFinite(a.applications_count) ? a.applications_count : null, text
    };
  });
}
export async function search(opts) {
  const { query, hours = 24, limit = 25 } = opts, out = [];
  for (let page = 1; page <= 3 && out.length < limit; page++) {
    const p = new URLSearchParams({ query, per_page: '50', page: String(page) }); p.append('expand[]', 'company');
    const items = parseItems(await getJson(`https://www.getonbrd.com/api/v0/search/jobs?${p}`));
    if (!items.length) break; out.push(...items.filter(x => x.hoursAgo == null || x.hoursAgo <= hours));
  }
  return out.slice(0, limit);
}
