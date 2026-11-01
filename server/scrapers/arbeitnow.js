// Arbeitnow: API pública JSON (sobre todo ofertas de Europa/Alemania).
import { getJson } from '../lib/http.js';
import { htmlStringToText } from '../lib/html.js';
import { matchesQuery } from '../lib/query.js';

export function parseItems(json, now = Date.now()) {
  return (json.data || []).map(j => ({
    id: j.slug, portal: 'Arbeitnow', title: j.title || '', company: j.company_name || '', location: j.location || '', url: j.url || '', modality: j.remote ? 'Remoto' : 'Presencial',
    hoursAgo: j.created_at ? Math.max(0, (now - j.created_at * 1000) / 36e5) : null, applicants: null, tags: j.tags || [], text: `${htmlStringToText(j.description)}\n${(j.tags || []).join(', ')}`
  }));
}
export async function search(opts) {
  const { query, hours = 24, limit = 25 } = opts;
  return parseItems(await getJson('https://www.arbeitnow.com/api/job-board-api')).filter(x => (x.hoursAgo == null || x.hoursAgo <= hours) && matchesQuery(query, `${x.title} ${x.tags.join(' ')}`)).slice(0, limit);
}
