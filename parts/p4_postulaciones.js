
/* ==========================================================================
   4) Postulaciones: cargar oferta, cola, auto-postulación, radar, consejos
   ========================================================================== */
let postTab = 'cargar';
function setTab(tab) {
  postTab = tab;
  $$('#postTabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.tabpane').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
  ({ cargar: renderOfferForm, cola: renderQueue, auto: renderAuto, radar: renderRadar, consejos: renderTips, optimizados: renderOptimized }[tab] || (() => { }))();
}
const hashStr = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

/* ───────────── Cargar oferta ───────────── */
const SAMPLE_OFFER = {
  title: 'Backend Developer Node.js', company: 'Nubelab', portal: 'LinkedIn', modality: 'Remoto', location: 'Latam', applicants: 4, hoursAgo: 3, url: 'https://example.com/jobs/backend-node',
  text: `Nubelab busca Backend Developer Node.js para sumarse a su equipo de producto.\n\nResponsabilidades:\n- Diseñar y mantener APIs REST escalables con Node.js y Express.\n- Modelar bases de datos en PostgreSQL y trabajar con Sequelize como ORM.\n- Implementar autenticación JWT y control de roles.\n- Escribir pruebas automatizadas con Jest y participar en revisiones de código.\n- Desplegar servicios con Docker y pipelines de CI/CD.\n\nRequisitos:\n- 2+ años de experiencia con Node.js y JavaScript (ES Modules).\n- Experiencia sólida con PostgreSQL y diseño de APIs REST.\n- Manejo de Git y GitHub.\n- Conocimientos de Docker y despliegue en la nube (AWS, Render o similar).\n- Trabajo en equipo, comunicación efectiva y resolución de problemas.\n- Inglés intermedio.\n\nDeseable:\n- Redis, TypeScript, Kubernetes.\n- Experiencia con metodologías ágiles (Scrum).\n\nBeneficios:\n- Trabajo 100% remoto, horario flexible, capacitaciones y obra social.`
};
function renderOfferForm() {
  const f = $('#offerForm'); const sel = f.elements.portal;
  if (!sel.options.length) sel.innerHTML = PORTALS.map(p => `<option>${p}</option>`).join('');
  renderAnalysisPreview();
}
function formOffer() {
  const f = $('#offerForm'), d = Object.fromEntries(new FormData(f).entries());
  return d;
}
function renderAnalysisPreview() {
  const d = formOffer(), box = $('#analysisPreview');
  if (!d.text || d.text.trim().length < 80) { box.innerHTML = '<div class="empty"><i data-ic="spark"></i><p>Pega una oferta (mínimo unas líneas) para ver las palabras clave y el match con tus CVs.</p></div>'; hydrateIcons(box); $('#liveArea').textContent = 'Área: —'; return; }
  const ex = extractKeywords(d.text, d.title || '');
  const tmp = { id: 'tmp_' + hashStr(d.text + (d.title || '')), title: d.title || '', text: d.text, keywords: ex.keywords, years: ex.years };
  $('#liveArea').textContent = 'Área: ' + ex.area;
  const ranked = S.cvs.map(cv => ({ cv, m: matchOffer(tmp, cv) })).sort((a, b) => b.m.score - a.m.score);
  const best = ranked[0];
  const items = best ? best.m.items : ex.keywords.map(k => ({ ...k, p: 0 }));
  box.innerHTML = `<div><div class="an-h">Datos detectados</div><div class="chips"><span class="chip">${ex.keywords.length} palabras clave</span>${ex.years ? `<span class="chip">${ex.years}+ años</span>` : ''}${ex.seniority ? `<span class="chip">${esc(ex.seniority)}</span>` : ''}<span class="chip">${ex.keywords.filter(k => k.must).length} imprescindibles ★</span></div></div>
  <div><div class="an-h">Palabras clave ${best ? '(color según tu mejor CV)' : ''}</div><div class="kw-chips">${items.map(i => kwChip(i, i.p || 0)).join('')}</div></div>
  <div><div class="an-h">Match por CV</div>${ranked.length ? ranked.map(r => `<div class="cv-match"><b>${esc(r.cv.name)}<small>${r.m.matched.length} presentes · ${r.m.partial.length} parciales · ${r.m.missing.length} faltantes</small></b><span class="badge ${r.m.band.cls}">${r.m.band.label}</span>${scoreBar(r.m.score)}</div>`).join('') : '<div class="note warn">' + ico('alert') + '<span>Aún no tienes CVs. Sube uno en la sección CVs para calcular el match.</span></div>'}</div>
  ${best && best.m.notes.length ? best.m.notes.map(n => `<div class="note warn">${ico('alert')}<span>${esc(n)}</span></div>`).join('') : ''}`;
  hydrateIcons(box);
  [...MATCH_CACHE.keys()].filter(k => k.startsWith('tmp_')).forEach(k => MATCH_CACHE.delete(k));
}
function submitOffer(e) {
  e.preventDefault(); const d = formOffer();
  if (!d.text.trim() || !d.title.trim() || !d.company.trim()) return toast('Faltan datos', 'Puesto, empresa y descripción son obligatorios.', 'warn');
  if (S.offers.some(o => norm(o.title) === norm(d.title) && norm(o.company) === norm(d.company)) && !confirm('Ya existe una oferta con el mismo puesto y empresa. ¿Cargarla de todos modos?')) return;
  const o = makeOffer({ ...d, status: 'en_espera' }); S.offers.push(o);
  const b = bestMatch(o); if (b) o.cvId = b.cv.id; touch();
  toast('Oferta evaluada', b ? `Mejor CV: «${b.cv.name}» con ${b.m.score} % (${b.m.band.label}). Quedó en la cola de espera.` : 'Guardada en la cola. Sube un CV para calcular el match.', 'success');
  $('#offerForm').reset(); renderAnalysisPreview(); updateSideGoal(); setTab('cola');
}

/* ───────────── Cola de espera ───────────── */
const QUEUE = { sel: new Set(), done: new Set(), busy: false };
function renderQueue() {
  const list = S.offers.filter(o => o.status === 'en_espera' || o.status === 'procesando' || QUEUE.done.has(o.id)).sort((a, b) => a.createdAt - b.createdAt);
  const box = $('#queueList');
  if (!list.length) { box.innerHTML = `<div class="empty"><i data-ic="hourglass"></i><p>La cola está vacía. Carga una oferta o agrega ofertas desde el Radar 24 h.</p><button class="btn btn-primary" data-act="goto" data-view="postulaciones" data-tab="cargar">Cargar oferta</button></div>`; hydrateIcons(box); }
  else box.innerHTML = list.map(o => {
    const proc = o.status === 'procesando', done = QUEUE.done.has(o.id);
    const b = bestFor(o), cv = b && b.cv, m = b && b.m;
    const cvs = S.cvs;
    return `<div class="q-item ${proc ? 'processing' : ''} ${done ? 'done' : ''}" data-id="${o.id}">
      <input type="checkbox" class="q-chk" data-id="${o.id}" ${QUEUE.sel.has(o.id) ? 'checked' : ''} ${proc || done ? 'disabled' : ''} aria-label="Seleccionar">
      <div class="q-t"><b>${esc(o.title)}</b><small>${esc(o.company)} · ${esc(o.portal)} · ${o.applicants == null ? 'N/D' : o.applicants} postulantes · cargada ${agoTxt(o.createdAt)}</small></div>
      <div class="q-cv"><select class="q-cvsel" data-id="${o.id}" ${proc || done ? 'disabled' : ''}>${cvs.map(c => `<option value="${c.id}" ${cv && c.id === cv.id ? 'selected' : ''}>${esc(c.name)}${c.optimized ? ' ★' : ''}</option>`).join('') || '<option>Sin CVs</option>'}</select>${m ? `<span style="display:flex;gap:8px;align-items:center">${scoreBar(m.score)}<span class="badge ${m.band.cls}">${m.band.label}</span></span>` : ''}</div>
      <div class="q-state">${done ? `<span class="badge b-ok">${ico('check', 14)} Procesada con éxito</span>` : proc ? `<span class="spinner"></span><span class="badge b-prim">En espera · procesando…</span>` : `<button class="btn btn-sm" data-act="open-offer" data-id="${o.id}">Detalle</button><button class="btn btn-sm" data-act="quick-ai" data-id="${o.id}" title="Mejorar el CV con IA para esta oferta y postular">${ico('spark', 14)}Mejorar con IA</button><button class="btn btn-sm btn-primary" data-act="process-one" data-id="${o.id}">${ico('send', 14)}Procesar</button>`}</div>
    </div>`;
  }).join('');
  hydrateIcons(box);
  const n = QUEUE.sel.size; $('#queueSel').textContent = `${n} seleccionada${n === 1 ? '' : 's'}`;
  $('#queueAll').checked = list.length > 0 && list.filter(o => o.status === 'en_espera').every(o => QUEUE.sel.has(o.id));
  updateSideGoal();
}
async function processOffer(o) {
  if (!S.cvs.length) { toast('Sin CVs', 'Sube un CV antes de postular.', 'warn'); return false; }
  const cv = (o.cvId && getCv(o.cvId)) || bestMatch(o).cv;
  o.cvId = cv.id; o.status = 'procesando'; persist(); renderQueue();
  await sleep(1300 + Math.random() * 1200);
  if (!o.cover) o.cover = genCover(o, cv);
  o.status = 'postulada'; o.appliedAt = Date.now(); addSends(1);
  QUEUE.done.add(o.id); QUEUE.sel.delete(o.id); touch(); renderQueue();
  toast('Solicitud procesada con éxito', `${o.title} · ${o.company} — enviada con «${cv.name}».`, 'success');
  setTimeout(() => { QUEUE.done.delete(o.id); if (postTab === 'cola') renderQueue(); }, 1800);
  return true;
}
async function processMany(ids) {
  if (QUEUE.busy) return toast('Procesando…', 'Espera a que termine el lote actual.', 'warn');
  const list = ids.map(getOffer).filter(o => o && o.status === 'en_espera');
  if (!list.length) return toast('Nada para procesar', 'Selecciona ofertas en espera.', 'warn');
  QUEUE.busy = true; $('#queueProgress').hidden = false; let ok = 0;
  for (let i = 0; i < list.length; i++) {
    $('#queueBar').style.width = (100 * i / list.length) + '%'; $('#queueProgTxt').textContent = `Procesando ${i + 1} de ${list.length}…`;
    if (await processOffer(list[i])) ok++;
  }
  $('#queueBar').style.width = '100%'; $('#queueProgTxt').textContent = `Lote completado: ${ok} de ${list.length} solicitudes procesadas con éxito.`;
  QUEUE.busy = false; if (list.length > 1) toast('Lote completado', `${ok} solicitudes procesadas con éxito.`, 'success');
  setTimeout(() => { $('#queueProgress').hidden = true; }, 4000);
}

/* ───────────── Auto-postulación ───────────── */
const AUTO = { running: false, paused: false, stop: false };
function autoCfg() {
  const a = S.settings.auto; a.min = +$('#autoMin').value; a.mode = $('#autoCvMode').value; a.fixed = $('#autoCvFixed').value; a.cap = +$('#autoCap').value || 50; a.delay = +$('#autoDelay').value || 0;
  a.maxApp = $('#autoMaxApp').value; a.send = $('#autoMode').value; a.cover = $('#autoCover').checked; a.skipStuff = $('#autoSkipStuff').checked; persist(); return a;
}
function autoPick(o, a) {
  let pool = S.cvs;
  if (a.mode === 'optimized') pool = S.cvs.filter(c => c.optimized);
  if (a.mode === 'fixed') pool = S.cvs.filter(c => c.id === a.fixed);
  const b = bestMatch(o, pool); return b;
}
function autoEligible(a) {
  const res = { ok: [], skip: [] };
  S.offers.filter(o => o.status === 'en_espera').forEach(o => {
    const b = autoPick(o, a);
    if (!b) return res.skip.push({ o, why: 'sin CV disponible según la regla elegida' });
    if (b.m.score < a.min) return res.skip.push({ o, why: `match ${b.m.score} % < ${a.min} %` });
    if (a.maxApp !== '' && o.applicants != null && o.applicants > +a.maxApp) return res.skip.push({ o, why: `${o.applicants} postulantes > ${a.maxApp}` });
    if (a.skipStuff && b.m.stuffing) return res.skip.push({ o, why: 'CV con posible keyword stuffing' });
    res.ok.push({ o, ...b });
  });
  res.ok.sort((x, y) => y.m.score - x.m.score); return res;
}
function renderAuto() {
  const a = S.settings.auto;
  $('#autoMin').value = a.min; $('#autoMinTxt').textContent = a.min + ' %'; $('#autoCvMode').value = a.mode; $('#autoCap').value = a.cap; $('#autoDelay').value = a.delay; $('#autoMaxApp').value = a.maxApp; $('#autoMode').value = a.send; $('#autoCover').checked = a.cover; $('#autoSkipStuff').checked = a.skipStuff;
  $('#autoCvFixed').innerHTML = S.cvs.map(c => `<option value="${c.id}" ${c.id === a.fixed ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  $('#autoCvFixed').disabled = a.mode !== 'fixed';
  const el = autoEligible(a);
  $('#autoElig').textContent = `${el.ok.length} ofertas elegibles · ${el.skip.length} fuera de las reglas`;
  $('#autoStart').disabled = AUTO.running || !el.ok.length;
}
function autoLog(html, cls = '') { const c = $('#autoLog'); const d = document.createElement('div'); if (cls) d.className = cls; d.innerHTML = `<span class="dim">[${new Date().toLocaleTimeString('es-AR')}]</span> ${html}`; c.appendChild(d); c.scrollTop = c.scrollHeight; }
async function autoRun() {
  const a = autoCfg(); const el = autoEligible(a); const list = el.ok.slice(0, a.cap);
  if (!list.length) return toast('Sin ofertas elegibles', 'Ajusta el puntaje mínimo o carga más ofertas.', 'warn');
  AUTO.running = true; AUTO.paused = false; AUTO.stop = false;
  $('#autoStart').disabled = true; $('#autoPause').disabled = false; $('#autoStop').disabled = false; $('#autoLog').innerHTML = '';
  autoLog(`Iniciando auto-postulación: ${list.length} ofertas (puntaje ≥ ${a.min} %, modo «${a.mode}»).`, 'ok');
  el.skip.slice(0, 8).forEach(s => autoLog(`Omitida: ${esc(s.o.title)} — ${esc(s.o.company)} (${esc(s.why)})`, 'warn'));
  let done = 0;
  for (let i = 0; i < list.length; i++) {
    while (AUTO.paused && !AUTO.stop) await sleep(200);
    if (AUTO.stop) { autoLog('Detenido por el usuario.', 'err'); break; }
    const { o, cv, m } = list[i]; o.cvId = cv.id; o.status = 'procesando'; persist(); if (postTab === 'cola') renderQueue();
    autoLog(`→ ${esc(o.portal)} · <b>${esc(o.title)}</b> — ${esc(o.company)} · CV «${esc(cv.name)}» · ${m.score} %`);
    await sleep(a.delay * 1000);
    if (a.cover && !o.cover) { o.cover = genCover(o, cv); autoLog('  carta de presentación generada', 'dim'); }
    o.status = 'postulada'; o.appliedAt = Date.now(); addSends(1); touch(); done++;
    autoLog(`✔ Postulación registrada${a.send === 'open' && safeUrl(o.url) ? ` · <a href="${esc(o.url)}" target="_blank" rel="noopener" style="color:#9BB8FF">abrir oferta para finalizar</a>` : ''}`, 'ok');
    $('#autoBar').style.width = (100 * (i + 1) / list.length) + '%'; $('#autoProgTxt').textContent = `${i + 1} de ${list.length} · ${Math.round(100 * (i + 1) / list.length)} %`;
    if (postTab === 'cola') renderQueue(); updateSideGoal();
  }
  // restaurar las que quedaron en "procesando" por detención
  S.offers.forEach(o => { if (o.status === 'procesando') o.status = 'en_espera'; });
  AUTO.running = false; $('#autoPause').disabled = true; $('#autoStop').disabled = true; touch();
  autoLog(`Finalizado: ${done} postulaciones registradas.`, 'ok');
  toast('Auto-postulación completada', `${done} postulaciones procesadas con éxito.`, 'success'); renderAuto(); updateSideGoal();
}

/* ───────────── Radar 24 h ───────────── */
const RADAR = { results: [], rejected: [], scanning: false, added: new Set(), live: false };
const RADAR_PORTALS = PORTALS.filter(p => p !== 'Otro');
function renderRadar() {
  const r = S.settings.radar; if (!r.portals.length) r.portals = RADAR_PORTALS.slice(0, 8);
  $('#rfHours').value = r.hours; $('#rfHoursTxt').textContent = r.hours + ' h'; $('#rfApp').value = r.app; $('#rfAppTxt').textContent = r.app; $('#rfRel').value = r.rel; $('#rfRelTxt').textContent = r.rel + ' %';
  $('#rfPortals').innerHTML = RADAR_PORTALS.map(p => `<span class="chip toggle ${r.portals.includes(p) ? 'on' : ''}" data-act="radar-portal" data-p="${p}" role="button" tabindex="0">${p}</span>`).join('');
  const bk = r.bk || (r.bk = { url: 'http://127.0.0.1:3001', query: '', loc: '' }); $('#bkQuery').value = bk.query; $('#bkLoc').value = bk.loc; $('#bkUrl').value = bk.url;
  drawRadarResults();
}
function genRadarDemo(portals) {
  const rnd = Math.random, out = [];
  portals.forEach(p => {
    const n = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const t = DEMO_TPL[Math.floor(rnd() * DEMO_TPL.length)], company = DEMO_COMPANIES[Math.floor(rnd() * DEMO_COMPANIES.length)], mod = ['Remoto', 'Remoto', 'Híbrido'][Math.floor(rnd() * 3)];
      const hoursAgo = Math.round((0.2 + rnd() * 30) * 10) / 10, applicants = Math.floor(Math.pow(rnd(), 2.2) * 40);
      out.push({ id: uid(), title: t.title, company, portal: p, modality: mod, location: mod === 'Remoto' ? 'Latam' : 'Buenos Aires, AR', hoursAgo, applicants, url: portalSearchUrl(p, t.title, company), sim: true, text: genOfferText(t, company, rnd, mod), demo: true });
    }
  });
  return out;
}
const htmlToText = h => { const d = new DOMParser().parseFromString(String(h).replace(/<\/(li|p|div|h\d)>|<br\s*\/?>/gi, '\n').replace(/<li[^>]*>/gi, '- '), 'text/html'); return (d.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim(); };
async function fetchJson(url) { const c = new AbortController(); const t = setTimeout(() => c.abort(), 12000); try { const r = await fetch(url, { signal: c.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); } finally { clearTimeout(t); } }
async function fetchLive() {
  const out = [], errs = [];
  await Promise.all([
    fetchJson('https://www.arbeitnow.com/api/job-board-api').then(j => (j.data || []).forEach(x => out.push({ id: uid(), title: x.title, company: x.company_name, portal: 'Arbeitnow', modality: x.remote ? 'Remoto' : 'Presencial', location: x.location || '', hoursAgo: (Date.now() / 1000 - x.created_at) / 3600, applicants: null, url: x.url, text: htmlToText(x.description || '') + '\n' + (x.tags || []).join(', ') }))).catch(e => errs.push('Arbeitnow')),
    fetchJson('https://remotive.com/api/remote-jobs?limit=100').then(j => (j.jobs || []).forEach(x => out.push({ id: uid(), title: x.title, company: x.company_name, portal: 'Remotive', modality: 'Remoto', location: x.candidate_required_location || '', hoursAgo: (Date.now() - new Date(x.publication_date + 'Z').getTime()) / HOUR, applicants: null, url: x.url, text: htmlToText(x.description || '') + '\n' + (x.tags || []).join(', ') }))).catch(e => errs.push('Remotive'))
  ]);
  return { out, errs };
}
function scoreRadar(list) {
  list.forEach(x => {
    const ex = extractKeywords(x.text, x.title); x.area = ex.area; x.years = ex.years;
    const tmp = { id: 'tmp_' + x.id, title: x.title, text: x.text, keywords: ex.keywords, years: ex.years }; x.keywords = ex.keywords;
    const b = bestMatch(tmp); x.relevance = b ? b.m.score : 0; x.bestCv = b ? b.cv.name : null; x.matched = b ? b.m.matched.slice(0, 4).map(i => i.k) : [];
  });
  [...MATCH_CACHE.keys()].filter(k => k.startsWith('tmp_')).forEach(k => MATCH_CACHE.delete(k));
  return list.sort((a, b) => b.relevance - a.relevance);
}
async function radarScan(live = false) {
  if (RADAR.scanning) return;
  if (!S.cvs.length) toast('Sin CVs cargados', 'El radar calcula la relevancia contra tus CVs. Sube al menos uno.', 'warn');
  const r = S.settings.radar; RADAR.scanning = true; RADAR.live = live; RADAR.added.clear();
  $('#radarProg').hidden = false; const bar = $('#radarBar'), txt = $('#radarProgTxt'); bar.style.width = '0%';
  let results = [];
  if (live) {
    txt.textContent = 'Consultando fuentes públicas (Arbeitnow, Remotive)…'; bar.style.width = '35%';
    const { out, errs } = await fetchLive();
    if (errs.length) toast('Fuentes no disponibles', `${errs.join(' y ')} no respondió (red o CORS). ${out.length ? 'Se muestran los resultados de la otra fuente.' : 'Prueba el escaneo de demostración.'}`, 'warn');
    results = out;
    $('#radarNote').textContent = `Resultados en vivo: ${out.length} ofertas reales. Estas fuentes no publican el número de postulantes (N/D).`;
  } else {
    const ps = r.portals.length ? r.portals : RADAR_PORTALS;
    for (let i = 0; i < ps.length; i++) { txt.textContent = `Rastreando ${ps[i]}… (${i + 1}/${ps.length})`; bar.style.width = (100 * (i + 1) / ps.length) + '%'; await sleep(160); }
    results = genRadarDemo(ps);
    $('#radarNote').textContent = 'SIMULACIÓN: ofertas inventadas para probar el sistema (no son publicaciones reales; su botón abre una búsqueda en el portal). Usa “Buscar ofertas reales” para fuentes públicas.';
  }
  txt.textContent = 'Calculando relevancia contra tus CVs…'; await sleep(120);
  const scored = scoreRadar(results), val = radarValidate(scored); RADAR.results = val.ok; RADAR.rejected = val.bad; bar.style.width = '100%';
  const shown = radarFiltered().length;
  txt.textContent = `Listo: ${results.length} ofertas analizadas · ${val.bad.length} descartadas (incompletas, rotas o no afines) · ${shown} cumplen tus filtros.`; RADAR.scanning = false;
  toast('Escaneo completado', `${shown} ofertas < ${r.hours} h con poca competencia y afines a tus CVs.`, 'success');
  drawRadarResults(); if (currentView === 'dashboard') renderDashRadar();
}
const BK_MAP = { LinkedIn: 'linkedin', Indeed: 'indeed', Computrabajo: 'computrabajo' };
async function radarBackend() {
  if (RADAR.scanning) return;
  const r = S.settings.radar, bk = r.bk; bk.query = $('#bkQuery').value.trim(); bk.loc = $('#bkLoc').value.trim(); bk.url = ($('#bkUrl').value.trim() || 'http://127.0.0.1:3001').replace(/\/+$/, '').replace(/\/\/localhost\b/i, '//127.0.0.1'); $('#bkUrl').value = bk.url; persist();
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(bk.url)) return toast('URL no permitida', 'El servidor debe estar en tu equipo (http://localhost:3001).', 'warn');
  if (bk.query.length < 2) return toast('Falta el puesto', 'Escribe el puesto o palabras clave a buscar.', 'warn');
  if (!S.cvs.length) toast('Sin CVs cargados', 'El radar calcula la relevancia contra tus CVs. Sube al menos uno.', 'warn');
  RADAR.scanning = true; RADAR.live = false; RADAR.added.clear();
  $('#radarProg').hidden = false; const bar = $('#radarBar'), txt = $('#radarProgTxt'); bar.style.width = '10%'; txt.textContent = 'Conectando con el servidor local…';
  const fail = (t, m) => { RADAR.scanning = false; txt.textContent = m; toast(t, m, 'warn'); };
  try {
    const hc = new AbortController(), ht = setTimeout(() => hc.abort(), 4000);
    try { const h = await fetch(bk.url + '/api/health', { signal: hc.signal }); if (!h.ok) throw 0; } catch { clearTimeout(ht); return fail('Servidor no disponible', 'No responde en ' + bk.url + ' (¿otro programa usa ese puerto? prueba PORT=3002). En la carpeta server/ ejecuta: npm i && npx playwright install chromium && npm start'); } clearTimeout(ht);
    const sel = r.portals.map(p => BK_MAP[p]).filter(Boolean), portals = sel.length ? sel : Object.values(BK_MAP);
    txt.textContent = `Rastreando ${portals.join(', ')} con Playwright… puede tardar 1–3 minutos.`; bar.style.width = '40%';
    const ac = new AbortController(), at = setTimeout(() => ac.abort(), 600000);
    const res = await fetch(bk.url + '/api/scan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: bk.query, location: bk.loc, hours: r.hours, limit: 25, portals, detail: true }), signal: ac.signal }); clearTimeout(at);
    const j = await res.json().catch(() => ({})); if (!res.ok || !j.ok) return fail('El servidor devolvió un error', j.error || 'HTTP ' + res.status);
    (j.errors || []).forEach(e => toast('Aviso de ' + e.portal, e.message, 'warn')); 
    const results = (j.offers || []).map(o => ({ ...o, sim: false }));
    bar.style.width = '75%'; txt.textContent = 'Calculando relevancia contra tus CVs…'; await sleep(80);
    const scored = scoreRadar(results), val = radarValidate(scored); RADAR.results = val.ok; RADAR.rejected = val.bad; bar.style.width = '100%';
    const shown = radarFiltered().length;
    const pp = Object.entries(j.perPortal || {}).map(([k, n]) => `${k}: ${n}`).join(' · '); $('#radarNote').textContent = `Resultados reales desde tu servidor local (${(j.tookMs / 1000).toFixed(0)} s). Encontradas por portal → ${pp || 'ninguno respondió'}. LinkedIn informa un tope (“menos de N”) y Computrabajo a veces el total; Indeed no publica postulantes (N/D, no se descarta).`;
    txt.textContent = `Listo: ${results.length} ofertas · ${val.bad.length} descartadas · ${shown} cumplen tus filtros.`; RADAR.scanning = false;
    toast('Escaneo completado', `${shown} ofertas reales cumplen tus filtros.`, 'success'); drawRadarResults(); if (currentView === 'dashboard') renderDashRadar();
  } catch (e) { fail('Error de conexión', e.name === 'AbortError' ? 'Tiempo de espera agotado.' : String(e.message || e)); }
}
function radarFiltered() {
  const r = S.settings.radar;
  return RADAR.results.filter(x => x.hoursAgo <= r.hours && (x.applicants == null || x.applicants <= r.app) && x.relevance >= r.rel && (RADAR.live || r.portals.includes(x.portal)));
}
function drawRadarResults() {
  const box = $('#radarResults'); if (!RADAR.results.length) { box.innerHTML = '<div class="empty" style="grid-column:1/-1"><i data-ic="radar"></i><p>Pulsa “Escanear portales” para buscar ofertas recientes con poca competencia.</p></div>'; hydrateIcons(box); return; }
  const list = radarFiltered();
  box.innerHTML = (list.length ? `<div style="grid-column:1/-1;display:flex;align-items:center;gap:12px"><b>${list.length} resultado${list.length === 1 ? '' : 's'}</b><span class="muted">ordenados por relevancia</span><div class="spacer"></div><button class="btn btn-sm btn-primary" data-act="radar-add-all">Agregar todas a la cola</button></div>` : '<div class="empty" style="grid-column:1/-1"><p>Ninguna oferta cumple los filtros actuales. Sube el límite de postulantes o baja la relevancia mínima.</p></div>') +
    list.map(x => `<div class="rd"><div style="display:flex;gap:8px;justify-content:space-between;align-items:flex-start"><h4>${esc(x.title)}</h4>${scoreBar(x.relevance)}</div><div class="meta"><span class="badge b-mute">${esc(x.company)}</span><span class="badge b-prim">${esc(x.portal)}</span><span class="badge b-info">${x.hoursAgo < 1 ? '< 1' : Math.round(x.hoursAgo)} h</span><span class="badge ${x.applicants == null ? (x.applicantsMax ? 'b-ok' : 'b-mute') : x.applicants <= 2 ? 'b-ok' : 'b-warn'}">${x.applicants == null ? (x.applicantsMax ? '< ' + x.applicantsMax : 'N/D') : x.applicants} postulantes</span><span class="badge b-mute">${esc(x.area)}</span>${x.sim ? '<span class="badge b-warn" title="Oferta de demostración: no es una publicación real">Simulada</span>' : '<span class="badge b-ok">Real</span>'}</div><small class="muted">${x.bestCv ? `Mejor CV: ${esc(x.bestCv)}` : ''}${x.matched.length ? ' · ' + x.matched.map(esc).join(', ') : ''}</small><div class="rd-foot">${RADAR.added.has(x.id) ? '<span class="badge b-ok">Agregada a la cola</span>' : `<button class="btn btn-sm btn-primary" data-act="radar-add" data-id="${x.id}">${ico('plus', 14)}A la cola</button>`}${safeUrl(x.url) ? `<a class="btn btn-sm" href="${esc(x.url)}" target="_blank" rel="noopener">${x.sim ? 'Buscar en ' + esc(x.portal) : 'Ver oferta'}</a>` : ''}</div></div>`).join('') +
    (RADAR.rejected.length ? `<details style="grid-column:1/-1" class="rej"><summary><b>${RADAR.rejected.length} ofertas descartadas</b> <span class="muted">por estar incompletas, tener enlace roto o no corresponder a tu perfil</span></summary><div class="table-wrap"><table class="tbl"><tbody>${RADAR.rejected.slice(0, 60).map(d => `<tr><td class="t-main">${esc(d.x.title || '(sin título)')}</td><td>${esc(d.x.company || '—')}</td><td>${esc(d.x.portal)}</td><td>${d.r.map(m => `<span class="badge b-bad" style="margin:2px">${esc(m)}</span>`).join('')}</td></tr>`).join('')}</tbody></table></div></details>` : '');
  hydrateIcons(box);
}
function radarAdd(x) {
  if (RADAR.added.has(x.id)) return;
  const o = makeOffer({ title: x.title, company: x.company, portal: x.portal, url: x.url, location: x.location, modality: x.modality, applicants: x.applicants, hoursAgo: x.hoursAgo, text: x.text, status: 'en_espera', source: 'radar' });
  const b = bestMatch(o); if (b) o.cvId = b.cv.id; S.offers.push(o); RADAR.added.add(x.id); touch();
}

/* ───────────── Consejos para el CV ───────────── */
const TIPS = [
  { ic: 'target', h: 'Fórmula XYZ de Google', p: '“Logré [X], medido por [Y], al hacer [Z]”. Cada viñeta debe mostrar el impacto, la métrica y el método.' },
  { ic: 'check', h: 'Método CAR / STAR', p: 'Contexto → Acción → Resultado. Útil para viñetas y para responder en entrevistas con la misma historia.' },
  { ic: 'bolt', h: 'Verbos de acción', p: 'Empieza cada viñeta con un verbo en pasado y evita “responsable de…”.', ul: ['Lideré, Implementé, Diseñé, Optimicé', 'Reduje, Aumenté, Automaticé, Migré'] },
  { ic: 'tag', h: 'Keywords exactas', p: 'Usa los mismos términos de la oferta. Incluye sigla y nombre completo la primera vez: “CI/CD (integración continua)”.' },
  { ic: 'shield', h: 'Formato amigable para ATS', ul: ['Una sola columna', 'Sin tablas, cuadros ni gráficos', 'Encabezados estándar (Experiencia, Educación, Habilidades)', 'PDF con texto o .docx; fuente 10–12 pt'] },
  { ic: 'file', h: 'Modelo Harvard', ul: ['Educación primero', 'Organización, ubicación, puesto y fechas', 'Viñetas con verbo de acción', 'Una página; sin foto'] },
  { ic: 'layers', h: 'Adapta cada postulación', p: 'Reordena habilidades y viñetas según la oferta. Mantén una versión por área (IT, Diseño) y optimizadas por puesto.' },
  { ic: 'alert', h: 'Evita el keyword stuffing', p: 'Repetir palabras clave sin contexto se nota. Apunta a 80–95 %: un 100 % forzado puede verse artificial para un reclutador humano.' },
  { ic: 'star', h: 'Cuantifica tus logros', ul: ['%, tiempos, volumen, dinero, usuarios', 'Si no hay cifra exacta, usa rangos honestos'] },
  { ic: 'users', h: 'Resultados, no tareas', p: 'Pasa de “qué hacía” a “qué logré”: alcance, escala, equipo y negocio.' },
  { ic: 'mail', h: 'Contacto y enlaces', p: 'Email profesional, teléfono, LinkedIn y GitHub/portafolio en texto visible (no solo como ícono).' },
  { ic: 'clock', h: 'Seguimiento', p: 'Si pasan 7–10 días sin respuesta, envía un mensaje breve de seguimiento al reclutador.' }
];
function renderTips() {
  $('#tipsGrid').innerHTML = TIPS.map(t => `<div class="tip"><div class="tip-i">${ico(t.ic, 18)}</div><h4>${t.h}</h4>${t.p ? `<p>${t.p}</p>` : ''}${t.ul ? `<ul>${t.ul.map(u => `<li>${u}</li>`).join('')}</ul>` : ''}</div>`).join('');
  const ok = v => `<span class="badge ${v ? 'b-ok' : 'b-bad'}">${v ? '✓' : '✗'}</span>`;
  const pc = v => { const n = Math.round(v * 100); return `<span class="badge ${n >= 70 ? 'b-ok' : n >= 40 ? 'b-warn' : 'b-bad'}">${n} %</span>`; };
  $('#tipsCompliance').innerHTML = S.cvs.length ? `<thead><tr><th>CV</th><th>Formato ATS</th><th>Verbos de acción</th><th>Con métricas</th><th>Fórmula XYZ</th><th>Extensión</th><th>Contacto</th><th>Global</th></tr></thead><tbody>${S.cvs.map(cv => { const a = analyzeCv(cv), s = a.stats; return `<tr><td class="t-main">${esc(cv.name)}${cv.optimized ? ' ★' : ''}</td><td>${scoreBar(a.format)}</td><td>${pc(s.verbR)}</td><td>${pc(s.metR)}</td><td>${pc(s.xyzR)}</td><td>${ok(s.words >= 180 && s.words <= 850)} <small class="muted">${s.words} palabras</small></td><td>${ok(!!(cv.basics.email && cv.basics.phone))}</td><td>${scoreBar(a.overall)}</td></tr>`; }).join('')}</tbody>` : '<tbody><tr><td><div class="empty"><p>Sube un CV para verificarlo.</p></div></td></tr></tbody>';
  renderXyz(); renderSectionAudit();
}
function renderXyz() {
  const t = $('#xyzInput').value.trim(), out = $('#xyzOut');
  if (!t) { out.innerHTML = '<span class="muted">Escribe o pega una viñeta de tu CV para evaluarla.</span>'; return; }
  const c = bulletCheck(t), res = RESULT_RE.test(t), meth = METHOD_RE.test(t);
  const row = (v, label, hint) => `<div class="chk ${v ? 'ok' : 'no'}"><i>${v ? '✓' : '✗'}</i><div><b>${label}</b> <span class="muted">${v ? '' : hint}</span></div></div>`;
  let sug = t; WEAK_MAP.forEach(([re, rep]) => { sug = sug.replace(re, rep); });
  out.innerHTML = row(c.verb, 'Empieza con verbo de acción', 'Usa Lideré, Implementé, Reduje…') + row(res, 'Muestra un resultado (X)', 'Indica qué lograste: reducir, aumentar, lanzar…') + row(c.metric, 'Incluye una métrica (Y)', 'Agrega %, tiempo, volumen o monto') + row(meth, 'Explica el método (Z)', 'Añade “al implementar…”, “mediante…”') + row(!c.long, 'Longitud adecuada (≤ 32 palabras)', 'Acórtala a 1–2 líneas') +
    `<div class="note ${c.xyz ? '' : 'warn'}">${ico(c.xyz ? 'check' : 'bulb')}<span>${c.xyz ? 'Esta viñeta sigue la fórmula XYZ.' : `Plantilla: <b>${esc(sug !== t ? sug : 'Verbo')}</b> + <i>[X resultado]</i>, medido por <i>[Y métrica]</i>, al <i>[Z acción]</i>.`}</span></div>`;
  hydrateIcons(out);
}

/* ───────────── CVs optimizados ───────────── */
function renderOptimized() {
  $('#optCv').innerHTML = S.cvs.filter(c => !c.optimized).concat(S.cvs.filter(c => c.optimized)).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('') || '<option value="">Sin CVs</option>';
  $('#optOffer').innerHTML = [...S.offers].sort((a, b) => b.createdAt - a.createdAt).map(o => `<option value="${o.id}">${esc(o.title)} — ${esc(o.company)}</option>`).join('') || '<option value="">Sin ofertas</option>';
  const opt = S.cvs.filter(c => c.optimized);
  $('#optGrid').innerHTML = opt.length ? opt.map(cvCard).join('') : '<div class="card empty" style="grid-column:1/-1"><i data-ic="spark"></i><p>Aún no hay versiones optimizadas. Genera una desde una oferta cargada.</p></div>';
  hydrateIcons($('#optGrid'));
}
function openOptimize(cvId, offerId) {
  const cv = getCv(cvId), o = getOffer(offerId); if (!cv || !o) return toast('Selecciona un CV y una oferta', '', 'warn');
  const props = optimizeProposals(cv, o), before = matchOffer(o, cv);
  const manual = allBullets(cv).filter(b => !bulletCheck(b).metric).slice(0, 4);
  const box = openModal(`${modalHead('Optimizar CV para esta oferta', `${cv.name} → ${o.title} · ${o.company}`)}
  <div class="m-b"><div class="grid" style="grid-template-columns:1.2fr .8fr;gap:22px">
    <div><div class="an-h">Cambios propuestos</div><div style="display:flex;flex-direction:column;gap:8px">${props.map(p => `<label class="cv-match" style="cursor:pointer"><input type="checkbox" class="opt-chk" data-pid="${p.id}" ${p.on ? 'checked' : ''}><b>${esc(p.label)}<small>${esc(p.detail)}</small></b>${p.must ? '<span class="badge b-warn">Requisito</span>' : ''}</label>`).join('')}</div>
      ${manual.length ? `<div class="note warn" style="margin-top:14px">${ico('bulb')}<span><b>Pendiente manual (sin métricas):</b><br>${manual.map(b => '• ' + esc(b)).join('<br>')}<br>Edítalas con la fórmula XYZ en el editor.</span></div>` : ''}
      <div class="note">${ico('info')}<span>Solo agrega habilidades que realmente tengas. Las versiones con keywords inventadas pasan el ATS pero fallan en la entrevista.</span></div></div>
    <div><div class="an-h">Impacto estimado</div><div id="optPrev"></div></div></div></div>
  <div class="m-f"><button class="btn" data-act="close-modal">Cancelar</button><button class="btn btn-primary" id="optApply">${ico('check')}Crear versión optimizada</button></div>`, 'md');
  const chosen = () => props.filter(p => $(`.opt-chk[data-pid="${p.id}"]`, box).checked);
  const upd = () => {
    const tmp = applyOptimization(cv, o, chosen()); tmp.id = 'tmp_' + uid(); const after = matchOffer(o, tmp);
    const d = after.score - before.score;
    $('#optPrev', box).innerHTML = `<div style="display:flex;gap:10px;align-items:center;justify-content:center">${ringSvg({ pct: before.score / 100, color: bandColor(before.score), center: before.score + '%', sub: 'antes', size: 118, stroke: 10, fs: 22 })}<span style="font-size:22px">→</span>${ringSvg({ pct: after.score / 100, color: bandColor(after.score), center: after.score + '%', sub: 'después', size: 118, stroke: 10, fs: 22 })}</div><p style="text-align:center;margin-top:10px"><span class="badge ${after.band.cls}">${after.band.label}</span></p><p class="muted" style="text-align:center;font-size:12.5px;margin-top:6px">${d >= 0 ? '+' : ''}${d} puntos · ${after.missing.length} keywords aún faltan</p>${after.notes.map(n => `<div class="note warn">${ico('alert')}<span>${esc(n)}</span></div>`).join('')}`;
    hydrateIcons(box); MATCH_CACHE.forEach((v, k) => { if (k.startsWith(o.id + '|tmp_')) MATCH_CACHE.delete(k); });
  };
  box.addEventListener('change', e => { if (e.target.classList.contains('opt-chk')) upd(); }); upd();
  $('#optApply', box).onclick = () => {
    const n = applyOptimization(cv, o, chosen()); S.cvs.push(n); o.cvId = n.id; touch(); closeModal();
    toast('CV optimizado creado', `«${n.name}» ya está disponible para descargar y para tus postulaciones.`, 'success'); go('postulaciones', 'optimizados');
  };
}

/* ───────────── Mejora con IA + postulación rápida ───────────── */
function rewriteCandidates(cv) {
  const out = [];
  [['experience', cv.experience], ['leadership', cv.leadership], ['projects', cv.projects]].forEach(([l, arr]) => (arr || []).forEach((e, i) => (e.bullets || []).forEach((b, j) => { if (b.trim() && !bulletCheck(b).xyz) out.push({ id: `${l}.${i}.bullets.${j}`, text: b }); })));
  return out.slice(0, 8);
}
async function llmRewrite(cv, offer, cands) {
  const key = S.settings.llmKey; if (!key || !cands.length) return null;
  const kws = offer.keywords.filter(k => k.must).slice(0, 12).map(k => k.k).join(', ');
  const prompt = `Mejora viñetas de un CV para esta oferta: "${offer.title}" en ${offer.company}. Keywords clave: ${kws}.\nReescribe cada viñeta con la fórmula XYZ de Google (logré X, medido por Y, al hacer Z), en español, empezando con verbo de acción en pasado. Reglas: conserva los hechos originales; incorpora keywords de la oferta SOLO si son coherentes con lo ya escrito; NO inventes cifras ni herramientas: si falta una métrica escribe [métrica] entre corchetes. Máximo 30 palabras por viñeta.\nResponde SOLO un JSON: [{"id":"...","text":"..."}]\nViñetas:\n${cands.map(c => `${c.id} :: ${c.text}`).join('\n')}`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: S.settings.llmModel || 'claude-sonnet-5-5', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json(); const t = (j.content && j.content[0] && j.content[0].text) || ''; const m = t.match(/\[[\s\S]*\]/);
    const arr = JSON.parse(m ? m[0] : t); return arr.filter(x => x && x.id && x.text && cands.some(c => c.id === x.id));
  } catch (e) { return { error: e.message }; }
}
async function quickAi(offerId) {
  const o = getOffer(offerId); if (!o) return;
  if (!S.cvs.length) return toast('Sin CVs', 'Sube un CV primero.', 'warn');
  const base = (o.cvId && getCv(o.cvId)) || bestMatch(o).cv, before = matchOffer(o, base);
  const steps = ['Analizando la oferta', 'Comparando palabras clave', 'Mejorando el CV con IA', 'Calculando el nuevo match'];
  const box = openModal(`${modalHead('Mejorar con IA y postular', `${o.title} · ${o.company} · base: ${base.name}`)}<div class="m-b" id="qaBody"><div id="qaSteps" style="display:flex;flex-direction:column;gap:10px"></div></div><div class="m-f" id="qaFoot"><button class="btn" data-act="close-modal">Cancelar</button></div>`, 'md');
  const sl = $('#qaSteps', box); sl.innerHTML = steps.map((s, i) => `<div class="cv-match" data-s="${i}"><span class="spinner" style="visibility:hidden"></span><b>${s}</b></div>`).join('');
  const mark = i => { const el = $(`[data-s="${i}"] .spinner`, box); if (el) el.style.visibility = 'visible'; };
  const doneStep = i => { const el = $(`[data-s="${i}"]`, box); if (el) el.innerHTML = `<span class="badge b-ok">✓</span><b>${steps[i]}</b>`; };
  mark(0); await sleep(450); doneStep(0); mark(1); await sleep(450); doneStep(1); mark(2);
  const props = optimizeProposals(base, o), cands = rewriteCandidates(base);
  let rew = await llmRewrite(base, o, cands), llmErr = null; if (rew && rew.error) { llmErr = rew.error; rew = null; }
  if (!rew && !S.settings.llmKey) await sleep(500);
  doneStep(2); mark(3); await sleep(350); doneStep(3);
  const local = !rew;
  const body = $('#qaBody', box);
  body.innerHTML = `<div id="qaPrev"></div>
    ${local ? `<div class="note ${llmErr ? 'warn' : ''}">${ico('info')}<span>${llmErr ? `No se pudo usar el modelo (${esc(llmErr)}). Se aplicó el motor local.` : 'Modo local: reordena habilidades, corrige verbos débiles y ajusta el titular. Conecta tu API key en <b>Ajustes</b> para que la IA reescriba tus viñetas con la fórmula XYZ.'}</span></div>` : ''}
    <div class="an-h" style="margin-top:14px">Mejoras automáticas</div><div style="display:flex;flex-direction:column;gap:8px">${props.map(p => `<label class="cv-match" style="cursor:pointer"><input type="checkbox" class="qa-chk" data-pid="${p.id}" ${p.on ? 'checked' : ''}><b>${esc(p.label)}<small>${esc(p.detail)}</small></b>${p.must ? '<span class="badge b-warn">Requisito</span>' : ''}</label>`).join('')}</div>
    ${rew && rew.length ? `<div class="an-h" style="margin-top:16px">Viñetas reescritas por la IA (editables)</div><div style="display:flex;flex-direction:column;gap:10px">${rew.map((r, i) => `<div class="ed-item"><label class="check"><input type="checkbox" class="qa-rw" data-i="${i}" checked><span class="muted" style="text-decoration:line-through">${esc(cands.find(c => c.id === r.id).text)}</span></label><textarea class="qa-rwt" data-i="${i}" rows="2">${esc(r.text)}</textarea>${/\[/.test(r.text) ? '<span class="badge b-warn" style="align-self:flex-start">Completa la métrica entre corchetes</span>' : ''}</div>`).join('')}</div>` : ''}
    <div class="note">${ico('shield')}<span>Solo marca habilidades que realmente tengas. La IA no inventa cifras: si falta una métrica verás [métrica] para que la completes.</span></div>`;
  $('#qaFoot', box).innerHTML = `<button class="btn" data-act="close-modal">Cancelar</button><div class="spacer"></div><button class="btn" id="qaSave">${ico('download')}Solo guardar CV mejorado</button><button class="btn btn-primary" id="qaGo">${ico('bolt')}Mejorar y postular ahora</button>`; hydrateIcons(box);
  const build = () => {
    const chosen = props.filter(p => $(`.qa-chk[data-pid="${p.id}"]`, box).checked), n = applyOptimization(base, o, chosen);
    if (rew) $$('.qa-rw', box).forEach(c => { if (!c.checked) return; const r = rew[+c.dataset.i], t = $(`.qa-rwt[data-i="${c.dataset.i}"]`, box).value.trim(); const ks = r.id.split('.'); const last = ks.pop(); const tgt = ks.reduce((a, k) => a[k], n); tgt[last] = t; });
    return n;
  };
  const upd = () => { const t = build(); t.id = 'tmp_' + uid(); const a = matchOffer(o, t); const d = a.score - before.score; $('#qaPrev', box).innerHTML = `<div style="display:flex;gap:14px;align-items:center;justify-content:center">${ringSvg({ pct: before.score / 100, color: bandColor(before.score), center: before.score + '%', sub: 'antes', size: 118, stroke: 10, fs: 22 })}<span style="font-size:24px">→</span>${ringSvg({ pct: a.score / 100, color: bandColor(a.score), center: a.score + '%', sub: 'con IA', size: 118, stroke: 10, fs: 22 })}<div><span class="badge ${a.band.cls}">${a.band.label}</span><p class="muted" style="font-size:12.5px;margin-top:6px">${d >= 0 ? '+' : ''}${d} puntos · ${a.missing.length} keywords aún faltan</p></div></div>`; MATCH_CACHE.forEach((v, k) => { if (k.includes('|tmp_')) MATCH_CACHE.delete(k); }); };
  box.addEventListener('input', upd); box.addEventListener('change', upd); upd();
  const commit = post => {
    const n = build(); if (post && $$('.qa-rwt', box).some(t => /\[/.test(t.value)) && !confirm('Quedan métricas sin completar entre corchetes [ ]. ¿Postular igualmente?')) return;
    S.cvs.push(n); o.cvId = n.id; touch(); closeModal();
    toast('CV mejorado creado', `«${n.name}» · match ${matchOffer(o, n).score} %`, 'success');
    if (post && o.status === 'en_espera') { go('postulaciones', 'cola'); processOffer(o); } else renderCurrent();
  };
  $('#qaGo', box).onclick = () => commit(true); $('#qaSave', box).onclick = () => commit(false);
}
async function quickAiBulk() {
  const list = S.offers.filter(o => o.status === 'en_espera'); if (!list.length) return toast('Cola vacía', '', 'warn'); if (!S.cvs.length) return toast('Sin CVs', '', 'warn');
  let improved = 0;
  list.forEach(o => {
    const base = bestFor(o).cv, before = matchOffer(o, base).score, props = optimizeProposals(base, o).filter(p => p.on);
    const n = applyOptimization(base, o, props); if (matchOffer(o, n).score > before) { S.cvs.push(n); o.cvId = n.id; improved++; }
  });
  touch(); toast('CVs mejorados', `${improved} de ${list.length} ofertas recibieron un CV ajustado (solo cambios seguros: orden, verbos, titular).`, 'success'); renderQueue(); processMany(list.map(o => o.id));
}
