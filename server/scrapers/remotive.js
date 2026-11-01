// Remotive: API pública JSON. Publica con ~24 h de retraso y pide enlazar a la oferta original (el botón "Ver oferta" lo hace).
import { getJson } from '../lib/http.js';
import { htmlStringToText } from '../lib/html.js';
import { toEnglish } from '../lib/query.js';

export function parseItems(json, now = Date.now()) {
  return (json.jobs || []).map(j => {
    const t = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(j.publication_date || '') ? j.publication_date : (j.publication_date || '') + 'Z');
    return {
      id: String(j.id), portal: 'Remotive', title: j.title || '', company: j.company_name || '', location: j.candidate_required_location || 'Remoto', url: j.url || '',
      modality: 'Remoto', hoursAgo: Number.isFinite(t) ? Math.max(0, (now - t) / 36e5) : null, applicants: null, text: `${htmlStringToText(j.description)}\n${(j.tags || []).join(', ')}`
    };
  });
}
export async function search(opts) {
  const { query, hours = 24, limit = 25 } = opts, q = toEnglish(query) || query;
  const items = parseItems(await getJson(`https://remotive.com/api/remote-jobs?${new URLSearchParams({ search: q, limit: '100' })}`));
  // Remotive retrasa ~24 h sus ofertas: se tolera ese desfase.
  return items.filter(x => x.hoursAgo == null || x.hoursAgo <= hours + 24).slice(0, limit).map(x => ({ ...x, hoursAgo: x.hoursAgo == null ? hours : Math.min(x.hoursAgo, hours) }));
}
