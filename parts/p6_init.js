
/* ==========================================================================
   7) Navegación, eventos y arranque
   ========================================================================== */
let currentView = 'dashboard';
const VIEWS = {
  dashboard: ['Dashboard', 'Vista general de tu búsqueda', renderDashboard],
  postulaciones: ['Postulaciones', 'Carga, cola, auto-postulación, radar y consejos', () => setTab(postTab)],
  estadisticas: ['Estadísticas', 'Análisis de datos de tu búsqueda', renderStats],
  metas: ['Metas diarias y semanales', 'Constancia: 200–300 CVs por período', renderGoals],
  keywords: ['Palabras clave', 'Registro por oferta y compatibilidad con tus CVs', renderKeywords],
  historial: ['Historial de ofertas', 'Todas tus postulaciones y su estado', renderHistory],
  cvs: ['CVs', 'Base de CVs con análisis y editor Harvard', renderCvs],
  agentes: ['Agentes IA', 'Equipo de agentes que evalúan tu CV', renderAgents],
  ajustes: ['Ajustes y datos', 'Respaldo, demo y configuración', renderSettings]
};
function go(view, tab) {
  if (!VIEWS[view]) view = 'dashboard';
  currentView = view; if (tab) postTab = tab;
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
  $$('#nav button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $('#pageTitle').textContent = VIEWS[view][0]; $('#pageSub').textContent = VIEWS[view][1];
  $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show');
  try { history.replaceState(null, '', '#' + view); } catch (e) { /* file:// */ }
  VIEWS[view][2](); hydrateIcons(); window.scrollTo({ top: 0 });
}
function renderCurrent() { VIEWS[currentView][2](); updateSideGoal(); hydrateIcons(); }
function renderSettings() { $('#llmKey').value = S.settings.llmKey || ''; $('#llmModel').value = S.settings.llmModel || 'claude-sonnet-5-5'; }
function applyTheme() { document.documentElement.dataset.theme = S.settings.theme; const b = $('#themeBtn i'); b.dataset.done = ''; b.dataset.ic = S.settings.theme === 'dark' ? 'sun' : 'moon'; hydrateIcons($('#themeBtn')); chartTheme(); }

/* acciones delegadas por data-act */
const ACT = {
  'goto': t => go(t.dataset.view, t.dataset.tab),
  'close-modal': () => closeModal(),
  'open-offer': t => openOffer(t.dataset.id),
  'kw-pick': t => { KW.offerId = t.dataset.id; renderKeywords(); },
  'hist-sort': t => { const k = t.dataset.k; HIST.dir = HIST.sort === k ? -HIST.dir : 1; HIST.sort = k; renderHistory(); },
  'log-sends': t => { addSends(+t.dataset.n); toast('Envíos registrados', `+${t.dataset.n} en el contador de hoy.`, 'success'); renderCurrent(); },
  'process-one': t => processOffer(getOffer(t.dataset.id)),
  'radar-portal': t => { const r = S.settings.radar, p = t.dataset.p; r.portals = r.portals.includes(p) ? r.portals.filter(x => x !== p) : [...r.portals, p]; persist(); renderRadar(); },
  'radar-add': t => { const x = RADAR.results.find(r => r.id === t.dataset.id); if (x) { radarAdd(x); drawRadarResults(); toast('Agregada a la cola', x.title + ' · ' + x.company, 'success'); updateSideGoal(); } },
  'radar-add-all': () => { const l = radarFiltered().filter(x => !RADAR.added.has(x.id)); l.forEach(radarAdd); drawRadarResults(); updateSideGoal(); toast('Ofertas agregadas', `${l.length} ofertas pasaron a la cola de espera.`, 'success'); },
  'cv-view': t => viewCv(t.dataset.id),
  'cv-edit': t => { closeModal(); openCvEditor(t.dataset.id); },
  'cv-dl': t => { const m = t.closest('.dl-menu'); const open = m.classList.contains('open'); $$('.dl-menu').forEach(x => x.classList.remove('open')); if (!open) m.classList.add('open'); },
  'cv-export': t => { exportCv(getCv(t.dataset.id), t.dataset.fmt); $$('.dl-menu').forEach(x => x.classList.remove('open')); },
  'cv-dup': t => { const c = deep(getCv(t.dataset.id)); c.id = uid(); c.name += ' (copia)'; c.createdAt = c.updatedAt = Date.now(); S.cvs.push(c); touch(); renderCurrent(); toast('CV duplicado', c.name, 'success'); },
  'cv-toggle': t => { const c = getCv(t.dataset.id); c.useInApply = !c.useInApply; touch(); renderCurrent(); },
  'cv-del': t => { const c = getCv(t.dataset.id); if (!confirm(`¿Eliminar «${c.name}»? Las ofertas que lo usan se reasignarán al mejor CV disponible.`)) return; S.cvs = S.cvs.filter(x => x.id !== c.id); S.offers.forEach(o => { if (o.cvId === c.id) o.cvId = null; }); touch(); renderCurrent(); toast('CV eliminado'); },
  'quick-ai': t => quickAi(t.dataset.id),
  'quick-ai-bulk': () => quickAiBulk(),
  'opt-open': t => openOptimize(t.dataset.cv, t.dataset.offer),
  'export-csv': () => exportCsv(),
  'backup': () => download('jobtrack_respaldo.json', JSON.stringify(S, null, 2), 'application/json'),
  'load-demo': () => { if ((S.cvs.length || S.offers.length) && !S.demo && !confirm('Esto reemplazará tus CVs y ofertas actuales por datos de demostración. ¿Descargaste un respaldo?')) return; seedDemo(); RADAR.results = []; renderCurrent(); toast('Datos demo cargados', '3 CVs, 28 ofertas y 30 días de envíos.', 'success'); },
  'clear-demo': () => { clearDemo(); renderCurrent(); toast('Datos demo eliminados', 'Tus datos reales se conservaron.'); },
  'reset-all': () => { if (confirm('Se borrarán TODOS los CVs, ofertas y registros. ¿Continuar?')) { S = DEFAULTS(); RADAR.results = []; touch(); renderCurrent(); toast('Datos borrados'); } }
};
document.addEventListener('click', e => {
  if (!e.target.closest('.dl-menu')) $$('.dl-menu').forEach(x => x.classList.remove('open'));
  const t = e.target.closest('[data-act]'); if (!t) return;
  if (t.tagName === 'A' || t.tagName === 'LABEL') return;
  const f = ACT[t.dataset.act]; if (f) f(t, e);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
$('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') closeModal(); });

function bind() {
  $$('#nav button').forEach(b => b.addEventListener('click', () => go(b.dataset.view)));
  $('#menuBtn').onclick = () => { $('#sidebar').classList.add('open'); $('#scrim').classList.add('show'); };
  $('#scrim').onclick = () => { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show'); };
  $('#themeBtn').onclick = () => { S.settings.theme = S.settings.theme === 'dark' ? 'light' : 'dark'; persist(); applyTheme(); renderCurrent(); };
  $('#tourBtn').onclick = () => startTour(0);
  const ac = $('#auditCv'); if (ac) ac.onchange = renderSectionAudit;
  $('#quickAdd').onclick = () => go('postulaciones', 'cargar');
  $$('#postTabs button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  // búsqueda global
  const gs = $('#globalSearch'), gr = $('#searchResults');
  gs.addEventListener('input', () => {
    const q = norm(gs.value.trim()); if (q.length < 2) { gr.classList.remove('open'); return; }
    const o = S.offers.filter(x => norm(`${x.title} ${x.company} ${x.portal} ${x.keywords.map(k => k.k).join(' ')}`).includes(q)).slice(0, 6);
    const c = S.cvs.filter(x => norm(x.name + cvText(x)).includes(q)).slice(0, 3);
    gr.innerHTML = o.map(x => `<button data-s="o" data-id="${x.id}">${esc(x.title)}<small>${esc(x.company)} · ${esc(x.portal)} · ${(STATUS[x.status] || {}).l}</small></button>`).join('') + c.map(x => `<button data-s="c" data-id="${x.id}">CV: ${esc(x.name)}<small>${esc(x.area)}</small></button>`).join('') || '<button disabled>Sin resultados</button>';
    gr.classList.add('open');
  });
  gr.addEventListener('click', e => { const b = e.target.closest('button[data-s]'); if (!b) return; gr.classList.remove('open'); gs.value = ''; if (b.dataset.s === 'o') openOffer(b.dataset.id); else viewCv(b.dataset.id); });
  document.addEventListener('click', e => { if (!e.target.closest('.search')) gr.classList.remove('open'); });
  // oferta
  $('#offerForm').addEventListener('submit', submitOffer);
  $('#offerForm').addEventListener('input', debounce(renderAnalysisPreview, 350));
  $('#offerSample').onclick = () => { const f = $('#offerForm').elements; Object.entries(SAMPLE_OFFER).forEach(([k, v]) => { if (f[k]) f[k].value = v; }); renderAnalysisPreview(); };
  $('#offerClear').onclick = () => { $('#offerForm').reset(); renderAnalysisPreview(); };
  // cola
  $('#queueList').addEventListener('change', e => {
    const t = e.target;
    if (t.classList.contains('q-chk')) { t.checked ? QUEUE.sel.add(t.dataset.id) : QUEUE.sel.delete(t.dataset.id); renderQueue(); }
    if (t.classList.contains('q-cvsel')) { const o = getOffer(t.dataset.id); o.cvId = t.value; touch(); renderQueue(); }
  });
  $('#queueAll').onchange = e => { S.offers.filter(o => o.status === 'en_espera').forEach(o => (e.target.checked ? QUEUE.sel.add(o.id) : QUEUE.sel.delete(o.id))); renderQueue(); };
  $('#queueProcessSel').onclick = () => processMany([...QUEUE.sel]);
  $('#queueProcessAll').onclick = () => processMany(S.offers.filter(o => o.status === 'en_espera').map(o => o.id));
  // auto
  $('#autoForm').addEventListener('input', () => { $('#autoMinTxt').textContent = $('#autoMin').value + ' %'; autoCfg(); $('#autoCvFixed').disabled = $('#autoCvMode').value !== 'fixed'; const el = autoEligible(S.settings.auto); $('#autoElig').textContent = `${el.ok.length} ofertas elegibles · ${el.skip.length} fuera de las reglas`; $('#autoStart').disabled = AUTO.running || !el.ok.length; });
  $('#autoStart').onclick = autoRun;
  $('#autoPause').onclick = () => { AUTO.paused = !AUTO.paused; $('#autoPause').innerHTML = AUTO.paused ? `${ico('play')}Reanudar` : `${ico('pause')}Pausar`; hydrateIcons($('#autoPause')); autoLog(AUTO.paused ? 'En pausa.' : 'Reanudado.', 'warn'); };
  $('#autoStop').onclick = () => { AUTO.stop = true; AUTO.paused = false; };
  // radar
  $('#radarScan').onclick = () => radarScan(false); $('#radarLive').onclick = () => radarScan(true); $('#radarBackend').onclick = radarBackend; [['bkQuery','query'],['bkLoc','loc'],['bkUrl','url']].forEach(([id, k]) => $('#' + id).addEventListener('input', e => { S.settings.radar.bk[k] = e.target.value.trim(); persist(); }));
  const rf = (id, key, lab, fmt) => $('#' + id).addEventListener('input', e => { S.settings.radar[key] = +e.target.value; $('#' + lab).textContent = fmt(e.target.value); persist(); if (RADAR.results.length) drawRadarResults(); });
  rf('rfHours', 'hours', 'rfHoursTxt', v => v + ' h'); rf('rfApp', 'app', 'rfAppTxt', v => v); rf('rfRel', 'rel', 'rfRelTxt', v => v + ' %');
  // consejos / optimizados
  $('#xyzInput').addEventListener('input', debounce(renderXyz, 150));
  $('#optForm').addEventListener('submit', e => { e.preventDefault(); openOptimize($('#optCv').value, $('#optOffer').value); });
  // dashboards
  $('#dashRange').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; dashRange = +b.dataset.r; $$('#dashRange button').forEach(x => x.classList.toggle('on', x === b)); renderDashboard(); });
  $('#statRange').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; statRange = +b.dataset.r; $$('#statRange button').forEach(x => x.classList.toggle('on', x === b)); renderStats(); });
  // keywords
  $('#kwOffer').onchange = e => { KW.offerId = e.target.value; renderKeywords(); }; $('#kwCv').onchange = e => { KW.cvId = e.target.value; renderKeywords(); };
  $('#kwFilter').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; KW.filter = b.dataset.f; $$('#kwFilter button').forEach(x => x.classList.toggle('on', x === b)); renderKeywords(); });
  $('#kwCopy').onclick = () => { const o = getOffer(KW.offerId); if (!o) return; const cv = KW.cvId ? getCv(KW.cvId) : (bestMatch(o) || {}).cv; if (!cv) return; const txt = matchOffer(o, cv).missing.map(i => i.k).join(', '); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Copiado', txt || 'Sin faltantes', 'success')).catch(() => toast('Faltantes', txt)); };
  // historial
  $('#histSearch').addEventListener('input', debounce(e => { HIST.q = e.target.value; renderHistory(); }, 200));
  $('#histStatus').onchange = e => { HIST.status = e.target.value; renderHistory(); }; $('#histPortal').onchange = e => { HIST.portal = e.target.value; renderHistory(); };
  $('#histTable').addEventListener('change', e => { if (!e.target.classList.contains('st-sel')) return; const o = getOffer(e.target.dataset.id), prev = o.status; o.status = e.target.value; if (APPLIED.includes(o.status) && !o.appliedAt) o.appliedAt = Date.now(); if (prev === 'en_espera' && APPLIED.includes(o.status)) addSends(1); touch(); toast('Estado actualizado', `${o.title}: ${STATUS[o.status].l}`, 'success'); updateSideGoal(); });
  // metas
  $('#goalForm').addEventListener('submit', e => { e.preventDefault(); const f = e.target.elements; const g = { dMin: +f.dMin.value, dMax: +f.dMax.value, wMin: +f.wMin.value, wMax: +f.wMax.value }; if (g.dMin > g.dMax || g.wMin > g.wMax || Object.values(g).some(v => !(v > 0))) return toast('Metas inválidas', 'El mínimo no puede superar al máximo.', 'warn'); S.goals = g; persist(); renderGoals(); updateSideGoal(); toast('Metas guardadas', '', 'success'); });
  $$('[data-preset]').forEach(b => b.onclick = () => { const f = $('#goalForm').elements, p = b.dataset.preset === 'intenso' ? [200, 300, 1000, 1500] : [30, 50, 200, 300]; ['dMin', 'dMax', 'wMin', 'wMax'].forEach((k, i) => { f[k].value = p[i]; }); });
  // CVs
  const drop = $('#drop'), fi = $('#cvFile');
  drop.addEventListener('click', e => { if (e.target !== fi) fi.click(); e.preventDefault(); });
  drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); } });
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => handleFiles([...e.dataTransfer.files]));
  fi.onchange = () => { handleFiles([...fi.files]); fi.value = ''; };
  $('#cvPaste').onclick = openPaste; $('#cvBlank').onclick = newHarvardCv;
  // agentes / ajustes
  $('#agentForm').addEventListener('submit', runAgents);
  $('#llmForm').addEventListener('submit', e => { e.preventDefault(); S.settings.llmKey = $('#llmKey').value.trim(); S.settings.llmModel = $('#llmModel').value.trim() || 'claude-sonnet-5-5'; persist(); toast('Ajustes guardados', S.settings.llmKey ? 'Los agentes usarán el modelo para redactar.' : 'Agentes en modo local.', 'success'); });
  $('#restoreFile').onchange = async e => { try { const o = JSON.parse(await e.target.files[0].text()); if (!o.cvs || !o.offers) throw new Error('Archivo de respaldo inválido'); S = { ...DEFAULTS(), ...o }; touch(); renderCurrent(); toast('Respaldo restaurado', '', 'success'); } catch (err) { toast('No se pudo restaurar', err.message, 'error'); } e.target.value = ''; };
  window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (VIEWS[v] && v !== currentView) go(v); });
}

function init() {
  const firstRun = !localStorage.getItem(KEY);
  S.offers.forEach(o => { if (o.status === 'procesando') o.status = 'en_espera'; });
  hydrateIcons(); applyTheme(); bind();
  if (firstRun && !S.cvs.length && !S.offers.length) seedDemo();
  const h = location.hash.slice(1); go(VIEWS[h] ? h : 'dashboard');
  setTimeout(offerTour, 800);
  if (S.demo && !RADAR.results.length) { RADAR.results = scoreRadar(genRadarDemo(RADAR_PORTALS.slice(0, 8))); renderDashRadar(); }
}
window.addEventListener('resize', debounce(() => { Object.values(CH).forEach(c => c && c.resize()); }, 150));
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
