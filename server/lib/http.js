// Descargas por HTTP simple (sin navegador) para fuentes con API/feeds públicos. Requiere Node 18+.
const UA = 'JobTrack-Radar/1.0 (uso personal; contacto: ver README)';
async function get(url, accept) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), 25000);
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept }, signal: c.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status} en ${new URL(url).host}`);
    return r;
  } catch (e) { throw new Error(e.name === 'AbortError' ? `Tiempo agotado en ${new URL(url).host}` : e.message); }
  finally { clearTimeout(t); }
}
export const getJson = async url => (await get(url, 'application/json')).json();
export const getText = async url => (await get(url, '*/*')).text();
