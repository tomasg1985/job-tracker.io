import * as cheerio from 'cheerio';
export { cheerio };
export const load = html => cheerio.load(html);
/** Primer texto no vacío entre varios selectores (tolerante a cambios de marcado). */
export function pickText($root, selectors) {
  for (const s of selectors) { const t = $root.find(s).first().text().replace(/\s+/g, ' ').trim(); if (t) return t; }
  return '';
}
export function pickAttr($root, selectors, attr) {
  for (const s of selectors) { const v = $root.find(s).first().attr(attr); if (v) return v; }
  return '';
}
/** Convierte un nodo HTML de descripción en texto con saltos de línea y viñetas. */
export function htmlToText($, node) {
  const c = $(node).clone();
  c.find('br').replaceWith('\n'); c.find('li').each((_, li) => { $(li).prepend('- ').append('\n'); });
  c.find('p,div,h1,h2,h3,h4,ul,ol').each((_, el) => { $(el).append('\n'); });
  return c.text().replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** HTML en texto plano (para descripciones que llegan como cadena HTML desde APIs/feeds). */
export function htmlStringToText(html) {
  const $ = load(`<div id="r">${html || ''}</div>`);
  return htmlToText($, $('#r'));
}
