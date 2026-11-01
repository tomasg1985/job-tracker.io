// Coincidencia de la búsqueda (ES/EN) para fuentes que no filtran por su cuenta.
const strip = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const STOP = new Set(['de', 'del', 'la', 'el', 'en', 'y', 'o', 'para', 'con', 'a', 'jr', 'sr', 'ssr', 'junior', 'senior', 'semi']);
export const SYN = {
  desarrollador: ['developer', 'engineer', 'programmer'], desarrolladora: ['developer', 'engineer'], programador: ['developer', 'programmer', 'engineer'], ingeniero: ['engineer'], ingeniera: ['engineer'],
  disenador: ['designer', 'design'], disenadora: ['designer', 'design'], datos: ['data'], analista: ['analyst'], gerente: ['manager'], lider: ['lead', 'leader'], administrativo: ['administrative', 'admin'],
  redes: ['network'], nube: ['cloud'], pruebas: ['qa', 'test', 'testing'], calidad: ['qa', 'quality'], movil: ['mobile'], soporte: ['support'], producto: ['product'], marketing: ['marketing'],
  contador: ['accountant'], ventas: ['sales'], traductor: ['translator'], redactor: ['writer', 'copywriter'], backend: ['backend', 'back-end', 'back end'], frontend: ['frontend', 'front-end', 'front end'], fullstack: ['fullstack', 'full-stack', 'full stack']
};
export const tokens = q => strip(q).split(/[^a-z0-9+#.]+/).filter(t => t.length > 1 && !STOP.has(t));
/** Traduce los términos conocidos al inglés (para APIs que buscan por texto). */
export const toEnglish = q => [...new Set(tokens(q).map(t => (SYN[t] ? SYN[t][0] : t)))].join(' ');
/** Verdadero si al menos la mitad de los términos (o sus sinónimos) aparece en el texto. */
export function matchesQuery(query, haystack) {
  const ts = tokens(query); if (!ts.length) return true;
  const h = strip(haystack); let hit = 0;
  for (const t of ts) if ([t, ...(SYN[t] || [])].some(v => h.includes(v))) hit++;
  return hit >= Math.ceil(ts.length / 2);
}
