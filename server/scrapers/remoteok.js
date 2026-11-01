// RemoteOK: API pública JSON (https://remoteok.com/api). Sus términos piden enlazar a su sitio: el botón "Ver oferta" lo hace.
import { getJson } from '../lib/http.js';
import { htmlStringToText } from '../lib/html.js';
import { matchesQuery } from '../lib/query.js';

const dec = s => htmlStringToText(String(s || ''));
export function parseItems(arr, now = Date.now()) {
  return (Array.isArray(arr) ? arr : []).filter(j => j && j.position && !j.legal).map(j => ({
    id: String(j.id || j.slug), portal: 'RemoteOK', title: dec(j.position), company: dec(j.company), location: j.location || 'Remoto', url: j.url || j.apply_url || '',
    modality: 'Remoto', hoursAgo: j.epoch ? Math.max(0, (now - j.epoch * 1000) / 36e5) : null, applicants: null,
    tags: j.tags || [], text: `${htmlStringToText(j.description)}\n${(j.tags || []).join(', ')}`
  }));
}
export async function search(opts) {
  const { query, hours = 24, limit = 25 } = opts;
  return parseItems(await getJson('https://remoteok.com/api')).filter(x => (x.hoursAgo == null || x.hoursAgo <= hours) && matchesQuery(query, `${x.title} ${x.tags.join(' ')} ${x.company}`)).slice(0, limit);
}
