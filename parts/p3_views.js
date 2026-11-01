
/* ==========================================================================
   3) Vistas: dashboard, estadísticas, metas, palabras clave, historial
   ========================================================================== */
const queueOffers = () => S.offers.filter(o => o.status === 'en_espera' || o.status === 'procesando');
const bestFor = o => (o.cvId && getCv(o.cvId) ? { cv: getCv(o.cvId), m: matchOffer(o, getCv(o.cvId)) } : bestMatch(o));
function genCover(o, cv) {
  if (!cv) return '';
  const m = matchOffer(o, cv), top = m.matched.slice(0, 4).map(i => i.k), b = cv.basics || {};
  const bl = allBullets(cv); const best = bl.find(x => bulletCheck(x).xyz) || bl.find(x => bulletCheck(x).metric);
  const list = a => (a.length > 1 ? a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1] : a[0] || 'las tecnologías y habilidades del puesto');
  const lf = s => s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, '');
  return `Estimado equipo de ${o.company}:\n\nMe dirijo a ustedes para postularme al puesto de ${o.title}. Cuento con experiencia en ${list(top)}, que son centrales para la posición.\n\n${best ? `Entre mis logros recientes: ${lf(best)}.\n\n` : ''}Me entusiasma la posibilidad de aportar a ${o.company} y crecer junto al equipo. Adjunto mi CV y quedo disponible para una entrevista.\n\nSaludos cordiales,\n${b.name || ''}\n${[b.email, b.phone].filter(Boolean).join(' · ')}`;
}
function recurringGap(limit = 15) {
  const offers = S.offers.filter(o => o.status !== 'descartada'); const map = new Map();
  offers.forEach(o => { const b = bestMatch(o); if (!b) return; b.m.missing.filter(i => i.cat !== 'term').forEach(i => { const a = map.get(i.k) || { k: i.k, n: 0, must: 0, cat: i.cat, grp: i.grp }; a.n++; if (i.must) a.must++; map.set(i.k, a); }); });
  const N = offers.length || 1;
  return [...map.values()].map(a => ({ ...a, N, pct: Math.round(100 * a.n / N) })).sort((a, b) => b.n - a.n || b.must - a.must).slice(0, limit);
}
function buildInsights() {
  const out = []; const g = S.goals; const hr = new Date().getHours();
  if (!S.cvs.length) return [{ t: 'warn', h: 'Sube tu primer CV', x: 'Sin CVs no puedo calcular el match. Ve a la sección CVs y sube un PDF, DOCX o texto.' }];
  if (!S.offers.length) out.push({ t: 'info', h: 'Carga tu primera oferta', x: 'Pega la descripción completa en Postulaciones → Cargar oferta y verás el match al instante.' });
  const today = sendsOn(new Date());
  if (today >= g.dMin) out.push({ t: 'ok', h: `Meta diaria cumplida (${today})`, x: `Superaste el mínimo de ${g.dMin}. ${today < g.dMax ? `Te faltan ${g.dMax - today} para el máximo.` : 'Alcanzaste también el máximo.'}` });
  else out.push({ t: hr >= 17 ? 'bad' : 'warn', h: `Hoy llevas ${today} de ${g.dMin} envíos`, x: `Faltan ${g.dMin - today}. ${queueOffers().length ? `Tienes ${queueOffers().length} ofertas en la cola lista para procesar.` : 'Usa el Radar 24 h para encontrar nuevas ofertas con poca competencia.'}` });
  const gap = recurringGap(3);
  if (gap.length && gap[0].pct >= 25) out.push({ t: 'warn', h: `Brecha recurrente: ${gap.map(x => x.k).join(', ')}`, x: `«${gap[0].k}» falta en tu mejor CV para el ${gap[0].pct} % de tus ofertas. Si lo dominas, agrégalo con contexto (proyecto/logro).` });
  const sc = S.offers.map(o => offerScore(o)).filter(x => x != null);
  if (sc.length) { const low = sc.filter(x => x < 60).length / sc.length; if (low > 0.3) out.push({ t: 'bad', h: `${Math.round(low * 100)} % de tus ofertas no pasa el filtro ATS`, x: 'Hay un desajuste entre tus CVs y esas ofertas: crea versiones optimizadas o apunta a puestos más afines.' }); else out.push({ t: 'ok', h: `Match medio ${Math.round(avg(sc))} %`, x: `${sc.filter(x => x >= 80).length} de ${sc.length} ofertas están en zona “Listo para entrevista”.` }); }
  const applied = S.offers.filter(o => APPLIED.includes(o.status));
  const perCv = S.cvs.map(cv => { const a = applied.filter(o => o.cvId === cv.id); return { cv, n: a.length, r: a.length ? a.filter(o => RESPONDED.includes(o.status)).length / a.length : 0 }; }).filter(x => x.n >= 3).sort((a, b) => b.r - a.r);
  if (perCv.length > 1 && perCv[0].r > perCv[perCv.length - 1].r) out.push({ t: 'ok', h: `Tu CV más efectivo: ${perCv[0].cv.name}`, x: `Tasa de respuesta ${Math.round(perCv[0].r * 100)} % (${perCv[0].n} envíos) frente a ${Math.round(perCv[perCv.length - 1].r * 100)} % de «${perCv[perCv.length - 1].cv.name}».` });
  const old = applied.filter(o => o.status === 'postulada' && Date.now() - (o.appliedAt || o.createdAt) > 8 * DAY).length;
  if (old) out.push({ t: 'info', h: `${old} postulaciones sin novedades hace > 8 días`, x: 'Buen momento para un mensaje de seguimiento al reclutador.' });
  const bp = {}; applied.forEach(o => { (bp[o.portal] = bp[o.portal] || { n: 0, r: 0 }).n++; if (RESPONDED.includes(o.status)) bp[o.portal].r++; });
  const pl = Object.entries(bp).filter(([, v]) => v.n >= 3).sort((a, b) => b[1].r / b[1].n - a[1].r / a[1].n);
  if (pl.length) out.push({ t: 'info', h: `Mejor portal: ${pl[0][0]}`, x: `${Math.round(100 * pl[0][1].r / pl[0][1].n)} % de respuesta en ${pl[0][1].n} postulaciones.` });
  return out;
}
const insightIcon = { ok: 'check', warn: 'alert', bad: 'alert', info: 'info' };
const insightHtml = list => list.map(i => `<div class="insight ${i.t}"><div class="dot">${ico(insightIcon[i.t] || 'info')}</div><div><b>${esc(i.h)}</b><span>${esc(i.x)}</span></div></div>`).join('') || '<div class="empty"><p>Sin insights todavía.</p></div>';

/* ───────────── Dashboard ───────────── */
function kpi(icon, color, label, value, delta = '', cls = '') { return `<div class="kpi" style="--kc:${color}"><div class="ico">${ico(icon, 20)}</div><small>${label}</small><b>${value}</b>${delta ? `<span class="delta ${cls}">${delta}</span>` : ''}</div>`; }
let dashRange = 30;
function renderDashboard() {
  $('#demoBanner').hidden = !S.demo;
  const g = S.goals, today = sendsOn(new Date()), yest = sendsOn(new Date(Date.now() - DAY)), wk = weekSends();
  const sc = S.offers.map(o => offerScore(o)).filter(x => x != null);
  const applied = S.offers.filter(o => APPLIED.includes(o.status)), resp = applied.filter(o => RESPONDED.includes(o.status));
  const rr = applied.length ? resp.length / applied.length : 0;
  const q = queueOffers().length, inter = S.offers.filter(o => o.status === 'entrevista').length;
  const P = PAL();
  const dd = today - yest;
  $('#kpis').innerHTML = [
    kpi('send', P[0], 'Envíos de hoy', today, `${dd >= 0 ? '▲' : '▼'} ${Math.abs(dd)} vs ayer · meta ${g.dMin}`, dd >= 0 ? 'up' : 'down'),
    kpi('target', P[1], 'Envíos de la semana', wk, `Meta ${g.wMin}–${g.wMax}`),
    kpi('file', P[4], 'Ofertas registradas', S.offers.length, `${q} en cola de espera`),
    kpi('spark', P[2], 'Match promedio', sc.length ? Math.round(avg(sc)) + ' %' : '—', sc.length ? bandOf(avg(sc)).label : 'Sin datos'),
    kpi('chart', P[5], 'Tasa de respuesta', applied.length ? Math.round(rr * 100) + ' %' : '—', `${resp.length} de ${applied.length} postulaciones`),
    kpi('users', P[6], 'Entrevistas activas', inter, `${S.offers.filter(o => o.status === 'oferta').length} oferta(s) recibida(s)`),
    kpi('brief', P[3], 'CVs en el sistema', S.cvs.length, `${S.cvs.filter(c => c.optimized).length} optimizados`),
    kpi('hourglass', P[0], 'En cola de espera', q, q ? 'Listas para procesar' : 'Cola vacía')
  ].join('');
  // línea de envíos
  const days = lastDays(dashRange);
  mkChart('chDashLine', {
    type: 'line', data: {
      labels: days.map(d => d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })),
      datasets: [
        { label: 'Envíos', data: days.map(sendsOn), borderColor: P[0], backgroundColor: ctxGrad(P[0]), fill: true, tension: .35, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2.5 },
        { label: 'Meta mínima', data: days.map(() => g.dMin), borderColor: P[1], borderDash: [6, 6], pointRadius: 0, borderWidth: 1.5 },
        { label: 'Meta máxima', data: days.map(() => g.dMax), borderColor: P[2], borderDash: [2, 5], pointRadius: 0, borderWidth: 1.5 }]
    }, options: { interaction: { mode: 'index', intersect: false }, scales: { y: { beginAtZero: true, grid: { color: css('--grid') } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } } } }
  });
  // estados
  const keys = Object.keys(STATUS), cnt = keys.map(k => S.offers.filter(o => o.status === k).length);
  const sCol = { en_espera: P[5], procesando: P[0], postulada: P[4], sin_respuesta: '#9AA0BE', entrevista: P[6], oferta: P[1], rechazada: P[3], descartada: '#C9CDE0' };
  mkChart('chDashStatus', { type: 'doughnut', data: { labels: keys.map(k => STATUS[k].l), datasets: [{ data: cnt, backgroundColor: keys.map(k => sCol[k]), borderWidth: 0 }] }, options: { cutout: '68%', plugins: { legend: { display: false } } } });
  $('#lgStatus').innerHTML = keys.map((k, i) => cnt[i] ? `<span style="--c:${sCol[k]}"><i></i>${STATUS[k].l} · ${cnt[i]}</span>` : '').join('');
  // keywords demandadas
  const freq = new Map();
  S.offers.forEach(o => o.keywords.filter(k => k.cat === 'tool' || k.cat === 'skill').forEach(k => freq.set(k.k, (freq.get(k.k) || 0) + 1)));
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const has = k => S.cvs.some(c => presence({ k, cat: 'tool' }, norm(cvText(c)), new Set()) === 1);
  mkChart('chDashKw', { type: 'bar', data: { labels: top.map(t => t[0]), datasets: [{ label: 'Ofertas', data: top.map(t => t[1]), backgroundColor: top.map(t => (has(t[0]) ? P[6] : P[3])), borderRadius: 6 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { afterLabel: c => (has(top[c.dataIndex][0]) ? 'Presente en alguno de tus CVs' : 'No aparece en tus CVs') } } }, scales: { x: { grid: { color: css('--grid') } }, y: { grid: { display: false } } } } });
  // bandas
  const bands = [['No pasa (<60)', s => s < 60, P[3]], ['Riesgo (60–75)', s => s >= 60 && s < 76, P[2]], ['Alto (76–79)', s => s >= 76 && s < 80, P[5]], ['Listo (80+)', s => s >= 80, P[6]]];
  const bc = bands.map(b => sc.filter(b[1]).length);
  mkChart('chDashBands', { type: 'doughnut', data: { labels: bands.map(b => b[0]), datasets: [{ data: bc, backgroundColor: bands.map(b => b[2]), borderWidth: 0 }] }, options: { cutout: '62%', plugins: { legend: { display: false } } } });
  $('#lgBands').innerHTML = bands.map((b, i) => `<span style="--c:${b[2]}"><i></i>${b[0]} · ${bc[i]}</span>`).join('');
  // meta
  const col = today >= g.dMax ? P[1] : today >= g.dMin ? P[6] : P[0];
  $('#dashGoalRing').innerHTML = ringSvg({ pct: today / g.dMax, color: col, center: today, sub: `de ${g.dMin}–${g.dMax}`, size: 168 });
  $('#dashGoalSub').textContent = `${g.dMin} – ${g.dMax} CVs por día`;
  // recientes
  const rec = [...S.offers].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
  $('#dashRecent').innerHTML = `<thead><tr><th>Oferta</th><th>Portal</th><th>Mejor CV</th><th>Match</th><th>Estado</th></tr></thead><tbody>${rec.map(o => { const b = bestFor(o); return `<tr data-act="open-offer" data-id="${o.id}" style="cursor:pointer"><td><div class="t-main">${esc(o.title)}</div><div class="t-sub">${esc(o.company)}</div></td><td>${esc(o.portal)}</td><td class="t-sub">${b ? esc(b.cv.name) : '—'}</td><td>${b ? scoreBar(b.m.score) : '—'}</td><td>${statusBadge(o.status)}</td></tr>`; }).join('') || '<tr><td colspan="5"><div class="empty"><p>Aún no hay ofertas. Carga la primera en Postulaciones.</p></div></td></tr>'}</tbody>`;
  renderDashRadar();
  $('#dashInsights').innerHTML = insightHtml(buildInsights().slice(0, 6));
  updateSideGoal();
}
function ctxGrad(color) {
  return ctx => { const c = ctx.chart, a = c.chartArea; if (!a) return color + '22'; const g = c.ctx.createLinearGradient(0, a.top, 0, a.bottom); g.addColorStop(0, color + '55'); g.addColorStop(1, color + '04'); return g; };
}
function renderDashRadar() {
  const box = $('#dashRadar'); const r = RADAR.results.slice(0, 4);
  box.innerHTML = r.length ? r.map(x => `<div class="mf"><div><b>${esc(x.title)}</b><small>${esc(x.company)} · ${esc(x.portal)} · ${x.hoursAgo < 1 ? '<1' : Math.round(x.hoursAgo)} h · ${x.applicants == null ? 'N/D' : x.applicants} postulantes</small></div>${scoreBar(x.relevance)}</div>`).join('') : `<div class="empty"><p>Aún no has escaneado.</p><button class="btn btn-sm btn-primary" data-act="goto" data-view="postulaciones" data-tab="radar">Escanear ahora</button></div>`;
}
function updateSideGoal() {
  const g = S.goals, t = sendsOn(new Date());
  $('#sideGoalTxt').textContent = `${t} / ${g.dMin}`;
  $('#sideRing').innerHTML = ringSvg({ pct: t / g.dMin, color: t >= g.dMin ? '#1FB76A' : '#8B8BFF', size: 46, stroke: 6, center: '', fs: 1 });
  const q = queueOffers().length; $('#navQueue').textContent = q || ''; $('#tabQueueCount').textContent = q || '';
}

/* ───────────── Estadísticas ───────────── */
let statRange = 30;
function renderStats() {
  const P = PAL(), since = Date.now() - statRange * DAY;
  const offers = S.offers.filter(o => o.createdAt >= since);
  const applied = offers.filter(o => APPLIED.includes(o.status)), resp = applied.filter(o => RESPONDED.includes(o.status));
  const scores = offers.map(o => ({ o, s: offerScore(o) })).filter(x => x.s != null);
  const days = lastDays(statRange); const sent = sum(days.map(sendsOn));
  const r = pearson(scores.filter(x => APPLIED.includes(x.o.status)).map(x => x.s), scores.filter(x => APPLIED.includes(x.o.status)).map(x => (RESPONDED.includes(x.o.status) ? 1 : 0)));
  $('#statKpis').innerHTML = [
    kpi('send', P[0], `Envíos (${statRange} d)`, sent, `${Math.round(sent / statRange)} por día en promedio`),
    kpi('chart', P[5], 'Tasa de respuesta', applied.length ? Math.round(100 * resp.length / applied.length) + ' %' : '—', `${resp.length} respuestas`),
    kpi('spark', P[2], 'Match medio', scores.length ? Math.round(avg(scores.map(x => x.s))) + ' %' : '—', `${scores.filter(x => x.s >= 80).length} ofertas ≥ 80 %`),
    kpi('target', P[4], 'Correlación match→respuesta', r == null ? '—' : r.toFixed(2), r == null ? 'Se necesitan ≥ 4 postulaciones' : (r > 0.3 ? 'Match alto = más respuestas' : 'Relación débil'))
  ].join('');
  const st = k => offers.filter(o => o.status === k).length;
  const stages = [['Ofertas evaluadas', offers.length], ['Postuladas', applied.length], ['Con respuesta', resp.length], ['Entrevistas + ofertas', st('entrevista') + st('oferta')], ['Ofertas', st('oferta')]];
  mkChart('chFunnel', { type: 'bar', data: { labels: stages.map(s => s[0]), datasets: [{ data: stages.map(s => s[1]), backgroundColor: [P[5], P[0], P[4], P[1], P[6]], borderRadius: 8 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: css('--grid') } }, y: { grid: { display: false } } } } });
  const bins = [[0, 39], [40, 59], [60, 69], [70, 79], [80, 89], [90, 100]];
  mkChart('chHist', { type: 'bar', data: { labels: bins.map(b => b[0] + '–' + b[1]), datasets: [{ data: bins.map(b => scores.filter(x => x.s >= b[0] && x.s <= b[1]).length), backgroundColor: bins.map(b => (b[0] + 1 >= 80 ? P[6] : b[0] + 1 >= 76 ? P[5] : b[0] + 1 >= 60 ? P[2] : P[3])), borderRadius: 6 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: css('--grid') } }, x: { grid: { display: false } } } } });
  const bp = {}; applied.forEach(o => { const a = bp[o.portal] = bp[o.portal] || { n: 0, r: 0 }; a.n++; if (RESPONDED.includes(o.status)) a.r++; });
  const pl = Object.entries(bp).sort((a, b) => b[1].r / b[1].n - a[1].r / a[1].n).slice(0, 8);
  mkChart('chPortal', { type: 'bar', data: { labels: pl.map(p => `${p[0]} (${p[1].n})`), datasets: [{ label: '% respuesta', data: pl.map(p => Math.round(100 * p[1].r / p[1].n)), backgroundColor: P[1], borderRadius: 6 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, grid: { color: css('--grid') } }, x: { grid: { display: false } } } } });
  const cvs = S.cvs.map(cv => { const a = applied.filter(o => o.cvId === cv.id), os = offers.filter(o => o.cvId === cv.id); return { cv, n: a.length, rr: a.length ? 100 * a.filter(o => RESPONDED.includes(o.status)).length / a.length : 0, m: avg(os.map(o => matchOffer(o, cv).score)) }; });
  mkChart('chCv', { type: 'bar', data: { labels: cvs.map(c => c.cv.name.slice(0, 22)), datasets: [{ label: 'Match medio %', data: cvs.map(c => Math.round(c.m)), backgroundColor: P[0], borderRadius: 6 }, { label: 'Respuesta %', data: cvs.map(c => Math.round(c.rr)), backgroundColor: P[2], borderRadius: 6 }] }, options: { scales: { y: { beginAtZero: true, max: 100, grid: { color: css('--grid') } }, x: { grid: { display: false } } } } });
  const bk = [[40, 59], [60, 69], [70, 79], [80, 89], [90, 100]].map(b => { const a = scores.filter(x => APPLIED.includes(x.o.status) && x.s >= b[0] && x.s <= b[1]); return { l: b[0] + '–' + b[1], n: a.length, v: a.length ? Math.round(100 * a.filter(x => RESPONDED.includes(x.o.status)).length / a.length) : null }; });
  mkChart('chScatter', { type: 'line', data: { labels: bk.map(b => `${b.l} (${b.n})`), datasets: [{ label: '% respuesta', data: bk.map(b => b.v), borderColor: P[4], backgroundColor: P[4] + '33', fill: true, tension: .3, pointRadius: 5, spanGaps: true }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, grid: { color: css('--grid') } }, x: { grid: { display: false }, title: { display: true, text: 'Rango de match (n)' } } } } });
  // mapa de calor
  const grid = Array.from({ length: 7 }, () => Array(8).fill(0));
  Object.entries(S.sends).forEach(([k, v]) => { const d = new Date(k + 'T12:00:00'); if (+d < since) return; const wd = (d.getDay() + 6) % 7; Object.entries(v.hours || {}).forEach(([h, n]) => { grid[wd][Math.floor(h / 3)] += n; }); });
  const mx = Math.max(1, ...grid.flat()), dn = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  $('#heatmap').innerHTML = `<div></div>${Array.from({ length: 8 }, (_, i) => `<div class="hh">${i * 3}–${i * 3 + 3}h</div>`).join('')}` + grid.map((row, i) => `<div class="hl">${dn[i]}</div>` + row.map(v => `<div class="hc" style="--v:${(v / mx).toFixed(2)}" title="${v} envíos">${v}</div>`).join('')).join('');
  // brecha de habilidades
  const gm = {};
  offers.forEach(o => { const b = bestFor(o); if (!b) return; const seen = {}; b.m.items.filter(i => i.cat !== 'term').forEach(i => { const a = gm[i.grp] = gm[i.grp] || { off: 0, w: 0, p: 0 }; if (!seen[i.grp]) { a.off++; seen[i.grp] = 1; } a.w += i.w; a.p += i.w * i.p; }); });
  const gl = Object.entries(gm).sort((a, b) => b[1].off - a[1].off).slice(0, 8);
  mkChart('chGapRadar', { type: 'radar', data: { labels: gl.map(g => g[0]), datasets: [{ label: 'Demanda en ofertas %', data: gl.map(g => Math.round(100 * g[1].off / Math.max(1, offers.length))), borderColor: P[3], backgroundColor: P[3] + '22' }, { label: 'Cobertura en tu CV %', data: gl.map(g => Math.round(100 * g[1].p / Math.max(0.001, g[1].w))), borderColor: P[6], backgroundColor: P[6] + '22' }] }, options: { scales: { r: { beginAtZero: true, max: 100, grid: { color: css('--grid') }, angleLines: { color: css('--grid') }, ticks: { display: false } } } } });
  // lectura analítica
  const ys = lastDays(14).map(sendsOn), reg = linreg(ys), fc = Array.from({ length: 7 }, (_, i) => Math.max(0, Math.round(reg.b + reg.m * (14 + i))));
  const ins = buildInsights();
  ins.unshift({ t: reg.m >= 0 ? 'ok' : 'warn', h: `Tendencia de envíos: ${reg.m >= 0 ? '+' : ''}${reg.m.toFixed(1)} por día`, x: `Regresión lineal sobre 14 días (R² ${reg.r2.toFixed(2)}). Pronóstico próximos 7 días: ≈ ${sum(fc)} envíos.` });
  if (r != null) ins.push({ t: r > 0.3 ? 'ok' : 'info', h: `Correlación match → respuesta: r = ${r.toFixed(2)}`, x: r > 0.3 ? 'Postular donde tu match es alto sí rinde: prioriza ofertas ≥ 76 %.' : 'Con los datos actuales el match explica poco la respuesta; acumula más postulaciones para afinar.' });
  $('#statInsights').innerHTML = insightHtml(ins);
}

/* ───────────── Metas ───────────── */
function renderGoals() {
  const g = S.goals, P = PAL(), today = sendsOn(new Date()), wk = weekSends();
  const col = today >= g.dMax ? P[1] : today >= g.dMin ? P[6] : P[0];
  $('#mdRing').innerHTML = ringSvg({ pct: today / g.dMax, color: col, center: today, sub: `de ${g.dMin}–${g.dMax}`, size: 176 });
  $('#mdSub').textContent = today >= g.dMin ? '¡Meta mínima cumplida!' : `Faltan ${g.dMin - today} para el mínimo`;
  const wcol = wk >= g.wMax ? P[1] : wk >= g.wMin ? P[6] : P[4];
  $('#mwRing').innerHTML = ringSvg({ pct: wk / g.wMax, color: wcol, center: wk, sub: `de ${g.wMin}–${g.wMax}`, size: 176 });
  const remDays = 7 - ((new Date().getDay() + 6) % 7);
  const need = Math.max(0, g.wMin - wk), per = Math.ceil(need / Math.max(1, remDays));
  $('#mwSub').textContent = `Semana desde el ${fmtDate(weekStart())}`;
  const avg7 = avg(lastDays(7).map(sendsOn)); const proj = Math.round(wk + avg7 * (remDays - 1));
  $('#mwPace').innerHTML = need ? `Necesitas ≈ <b>${per}</b> por día los ${remDays} días restantes.<br>Proyección al ritmo actual: <b>${proj}</b>` : `Mínimo semanal cumplido ✔ · Proyección <b>${proj}</b>`;
  const f = $('#goalForm'); ['dMin', 'dMax', 'wMin', 'wMax'].forEach(k => { f.elements[k].value = g[k]; });
  const days = lastDays(28);
  mkChart('chGoalDays', { type: 'bar', data: { labels: days.map(d => d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })), datasets: [{ type: 'bar', label: 'Envíos', data: days.map(sendsOn), backgroundColor: days.map(d => (sendsOn(d) >= g.dMin ? P[6] : sendsOn(d) >= g.dMin / 2 ? P[2] : P[0] + '88')), borderRadius: 5, order: 2 }, { type: 'line', label: 'Mínimo', data: days.map(() => g.dMin), borderColor: P[1], borderDash: [6, 5], pointRadius: 0, borderWidth: 1.6, order: 1 }, { type: 'line', label: 'Máximo', data: days.map(() => g.dMax), borderColor: P[3], borderDash: [2, 5], pointRadius: 0, borderWidth: 1.6, order: 1 }] }, options: { scales: { y: { beginAtZero: true, grid: { color: css('--grid') } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } } } } });
  let streak = 0; for (let i = 0; i < 90; i++) { const v = sendsOn(new Date(Date.now() - i * DAY)); if (v >= g.dMin) streak++; else if (i === 0) continue; else break; }
  let best = 0, run = 0; lastDays(90).forEach(d => { if (sendsOn(d) >= g.dMin) { run++; best = Math.max(best, run); } else run = 0; });
  const reg = linreg(lastDays(14).map(sendsOn)), fc = Array.from({ length: 7 }, (_, i) => Math.max(0, Math.round(reg.b + reg.m * (14 + i))));
  $('#goalStreak').innerHTML = `<div><div class="big">${streak} <small>días de racha</small></div><span class="muted">Mejor racha (90 d): ${best} días</span></div><div><div class="big">${Math.round(avg7)} <small>por día (7 d)</small></div><span class="muted">Pronóstico 7 días: ≈ ${sum(fc)} envíos</span></div>`;
  const today0 = dkey();
  $('#goalCal').innerHTML = days.map(d => { const v = sendsOn(d); return `<div class="d ${v >= g.dMin ? 'ok' : v >= g.dMin / 2 ? 'part' : ''} ${dkey(d) === today0 ? 'today' : ''}" title="${d.toLocaleDateString('es-AR')}: ${v} envíos">${d.getDate()}</div>`; }).join('');
}

/* ───────────── Palabras clave ───────────── */
const KW = { offerId: null, cvId: null, filter: 'all' };
function renderKeywords() {
  const offers = [...S.offers].sort((a, b) => b.createdAt - a.createdAt);
  const so = $('#kwOffer'), sc = $('#kwCv');
  if (!offers.length) { so.innerHTML = '<option>Sin ofertas</option>'; sc.innerHTML = ''; $('#kwChips').innerHTML = '<div class="empty"><p>Carga una oferta para ver su análisis de palabras clave.</p></div>'; $('#kwRing').innerHTML = ''; $('#kwTable').innerHTML = ''; $('#kwGap').innerHTML = ''; $('#kwBand').innerHTML = ''; $('#kwBreak').innerHTML = ''; return; }
  if (!KW.offerId || !getOffer(KW.offerId)) KW.offerId = offers[0].id;
  so.innerHTML = offers.map(o => `<option value="${o.id}" ${o.id === KW.offerId ? 'selected' : ''}>${esc(o.title)} — ${esc(o.company)}</option>`).join('');
  const o = getOffer(KW.offerId); const b = bestMatch(o);
  sc.innerHTML = `<option value="">Mejor CV (auto)</option>` + S.cvs.map(c => `<option value="${c.id}" ${c.id === KW.cvId ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  const cv = KW.cvId && getCv(KW.cvId) ? getCv(KW.cvId) : (b && b.cv);
  if (!cv) { $('#kwChips').innerHTML = '<div class="empty"><p>Sube un CV para comparar.</p></div>'; return; }
  const m = matchOffer(o, cv);
  $('#kwTitle').textContent = `${o.title} · ${cv.name}`;
  $('#kwRing').innerHTML = ringSvg({ pct: m.score / 100, color: bandColor(m.score), center: m.score + '%', sub: 'match', size: 176 });
  $('#kwBand').innerHTML = `<span class="badge ${m.band.cls}">${m.band.label}</span><p class="muted" style="margin-top:6px;font-size:12.5px">${m.band.desc}</p>`;
  const bar = (l, v, c) => `<div class="bar"><span>${l}</span><i style="--w:${v}%;--c:${c}"></i><b>${v}</b></div>`;
  $('#kwBreak').innerHTML = bar('Keywords', m.coverage, 'var(--primary)') + bar('Formato ATS', m.format, 'var(--teal)') + bar('Calidad viñetas', m.quality, 'var(--violet)') + bar('Similitud TF-IDF', m.cosine, 'var(--sky)');
  const items = m.items.filter(i => KW.filter === 'all' || (KW.filter === 'ok' ? i.p >= 0.6 : i.p < 0.6));
  $('#kwChips').innerHTML = items.map(i => kwChip(i, i.p)).join('') || '<span class="muted">Sin elementos en este filtro.</span>';
  const notes = [...m.notes]; if (m.partial.length) notes.push(`${m.partial.length} keyword(s) con coincidencia parcial (sinónimo o tecnología de la misma familia): escríbelas tal como aparecen en la oferta.`);
  const nb = $('#kwNote'); nb.hidden = !notes.length; nb.className = 'note ' + (m.stuffing ? 'warn' : ''); nb.innerHTML = `${ico('info')}<span>${notes.map(esc).join('<br>')}</span>`;
  $('#kwTable').innerHTML = `<thead><tr><th>Oferta</th><th>Área</th><th class="num"># keywords</th><th>Mejor CV</th><th>Match</th><th>Faltan (top)</th></tr></thead><tbody>${offers.map(x => { const bb = bestMatch(x); return `<tr data-act="kw-pick" data-id="${x.id}" style="cursor:pointer;${x.id === o.id ? 'background:var(--primary-50)' : ''}"><td><div class="t-main">${esc(x.title)}</div><div class="t-sub">${esc(x.company)}</div></td><td><span class="badge b-mute">${x.area}</span></td><td class="num">${x.keywords.length}</td><td class="t-sub">${bb ? esc(bb.cv.name) : '—'}</td><td>${bb ? scoreBar(bb.m.score) : '—'}</td><td class="t-sub">${bb ? bb.m.missing.slice(0, 3).map(i => esc(i.k)).join(', ') || '—' : ''}</td></tr>`; }).join('')}</tbody>`;
  const gap = recurringGap(16);
  $('#kwGap').innerHTML = gap.map(g => `<span class="kw miss" title="Falta en ${g.n} de ${g.N} ofertas">${esc(g.k)} <small>${g.n}/${g.N}</small></span>`).join('') || '<span class="muted">Sin brechas relevantes.</span>';
}

/* ───────────── Historial ───────────── */
const HIST = { sort: 'date', dir: -1, q: '', status: '', portal: '' };
function renderHistory() {
  const ss = $('#histStatus'), sp = $('#histPortal');
  if (ss.options.length <= 1) ss.innerHTML = '<option value="">Todos los estados</option>' + Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v.l}</option>`).join('');
  sp.innerHTML = '<option value="">Todos los portales</option>' + [...new Set(S.offers.map(o => o.portal))].sort().map(p => `<option ${p === HIST.portal ? 'selected' : ''}>${esc(p)}</option>`).join('');
  let list = S.offers.map(o => { const b = bestFor(o); return { o, cv: b && b.cv, s: b ? b.m.score : -1, d: o.appliedAt || o.createdAt }; });
  const q = norm(HIST.q);
  list = list.filter(x => (!q || norm(`${x.o.title} ${x.o.company} ${x.o.portal} ${x.o.keywords.map(k => k.k).join(' ')}`).includes(q)) && (!HIST.status || x.o.status === HIST.status) && (!HIST.portal || x.o.portal === HIST.portal));
  const key = { date: x => x.d, title: x => norm(x.o.title), company: x => norm(x.o.company), portal: x => x.o.portal, score: x => x.s, status: x => x.o.status };
  list.sort((a, b) => { const A = key[HIST.sort](a), B = key[HIST.sort](b); return (A > B ? 1 : A < B ? -1 : 0) * HIST.dir; });
  const th = (k, l) => `<th class="sortable" data-act="hist-sort" data-k="${k}">${l}${HIST.sort === k ? (HIST.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`;
  $('#histTable').innerHTML = `<thead><tr>${th('date', 'Fecha')}${th('title', 'Puesto')}${th('company', 'Empresa')}${th('portal', 'Portal')}<th>CV usado</th>${th('score', 'Match')}<th class="num">Postulantes</th>${th('status', 'Estado')}</tr></thead><tbody>${list.map(x => `<tr data-act="open-offer" data-id="${x.o.id}"><td>${fmtDate(x.d)}</td><td class="t-main">${esc(x.o.title)}</td><td>${esc(x.o.company)}</td><td>${esc(x.o.portal)}</td><td class="t-sub">${x.cv ? esc(x.cv.name) : '—'}</td><td>${x.s >= 0 ? scoreBar(x.s) : '—'}</td><td class="num">${x.o.applicants == null ? '—' : x.o.applicants}</td><td><select class="st-sel" data-id="${x.o.id}" onclick="event.stopPropagation()" style="padding:4px 8px;border-radius:99px;width:auto;font-size:12px">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === x.o.status ? 'selected' : ''}>${v.l}</option>`).join('')}</select></td></tr>`).join('') || `<tr><td colspan="8"><div class="empty"><p>No hay ofertas que coincidan.</p></div></td></tr>`}</tbody>`;
}
function exportCsv() {
  const rows = [['Fecha', 'Puesto', 'Empresa', 'Portal', 'Modalidad', 'Ubicación', 'CV', 'Match %', 'Postulantes', 'Estado', 'Enlace', 'Keywords']];
  S.offers.forEach(o => { const b = bestFor(o); rows.push([new Date(o.appliedAt || o.createdAt).toISOString().slice(0, 10), o.title, o.company, o.portal, o.modality, o.location, b ? b.cv.name : '', b ? b.m.score : '', o.applicants ?? '', STATUS[o.status]?.l || o.status, o.url, o.keywords.map(k => k.k).join('; ')]); });
  download('historial_postulaciones.csv', '﻿' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
}

/* ───────────── Detalle de oferta (modal) ───────────── */
function openOffer(id) {
  const o = getOffer(id); if (!o) return;
  const cvId = o.cvId && getCv(o.cvId) ? o.cvId : (bestMatch(o) || {}).cv?.id;
  const box = openModal(`${modalHead(o.title, `${o.company} · ${o.portal} · ${o.location || 'sin ubicación'} · ${o.modality}`)}
  <div class="m-b"><div class="grid" style="grid-template-columns:1fr 1fr;gap:22px">
    <div>
      <div class="an-h">CV utilizado</div>
      <select id="ofCv">${S.cvs.map(c => `<option value="${c.id}" ${c.id === cvId ? 'selected' : ''}>${esc(c.name)}${c.optimized ? ' ★' : ''}</option>`).join('')}</select>
      <div id="ofMatch" style="margin-top:14px"></div>
      <div class="an-h" style="margin-top:18px">Palabras clave</div><div id="ofKw" class="kw-chips"></div>
    </div>
    <div class="form">
      <label>Estado<select id="ofStatus">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === o.status ? 'selected' : ''}>${v.l}</option>`).join('')}</select></label>
      <div class="row"><label>Postulantes<input id="ofApp" type="number" min="0" value="${o.applicants ?? ''}"></label><label>Enlace<input id="ofUrl" value="${esc(o.url)}"></label></div>
      <label>Carta de presentación <textarea id="ofCover" rows="8" placeholder="Se genera automáticamente al postular. También puedes crearla aquí.">${esc(o.cover)}</textarea></label>
      <label>Notas<textarea id="ofNotes" rows="3">${esc(o.notes)}</textarea></label>
    </div>
  </div>
  <details style="margin-top:18px"><summary class="an-h" style="cursor:pointer">Texto de la oferta</summary><pre style="white-space:pre-wrap;font-family:var(--font);font-size:12.5px;color:var(--text-2);margin-top:8px">${esc(o.text)}</pre></details></div>
  <div class="m-f"><button class="btn btn-danger" id="ofDel">${ico('trash')}Eliminar</button><div class="spacer"></div>
    <button class="btn" id="ofGenCover">${ico('mail')}Generar carta</button>
    <button class="btn btn-primary" id="ofQuick">${ico('bolt')}Mejorar con IA y postular</button>
    <button class="btn" id="ofOpt">${ico('spark')}Optimizar CV</button>
    <button class="btn" id="ofAgents">${ico('users')}Agentes IA</button>
    ${safeUrl(o.url) ? `<a class="btn" href="${esc(o.url)}" target="_blank" rel="noopener">Abrir oferta</a>` : ''}
    <button class="btn btn-primary" id="ofSave">${ico('check')}Guardar</button></div>`, 'md');
  const draw = () => {
    const cv = getCv($('#ofCv', box).value); if (!cv) { $('#ofMatch', box).innerHTML = '<span class="muted">Sube un CV para ver el match.</span>'; return; }
    const m = matchOffer(o, cv);
    $('#ofMatch', box).innerHTML = `<div class="cv-match"><div style="flex:0 0 auto">${ringSvg({ pct: m.score / 100, color: bandColor(m.score), center: m.score + '%', size: 92, stroke: 9, fs: 20 })}</div><b><span class="badge ${m.band.cls}">${m.band.label}</span><small>${m.matched.length} keywords presentes · ${m.partial.length} parciales · ${m.missing.length} faltantes</small></b></div>` + m.notes.map(n => `<div class="note warn">${ico('alert')}<span>${esc(n)}</span></div>`).join('');
    $('#ofKw', box).innerHTML = m.items.map(i => kwChip(i, i.p)).join('');
  };
  draw(); $('#ofCv', box).onchange = draw;
  $('#ofSave', box).onclick = () => {
    const prev = o.status; o.status = $('#ofStatus', box).value; o.cvId = $('#ofCv', box).value; o.url = $('#ofUrl', box).value.trim(); o.cover = $('#ofCover', box).value; o.notes = $('#ofNotes', box).value; const a = $('#ofApp', box).value; o.applicants = a === '' ? null : +a;
    if (APPLIED.includes(o.status) && !o.appliedAt) o.appliedAt = Date.now();
    if (prev === 'en_espera' && APPLIED.includes(o.status)) addSends(1);
    touch(); closeModal(); renderCurrent(); toast('Oferta actualizada', '', 'success');
  };
  $('#ofDel', box).onclick = () => { if (confirm('¿Eliminar esta oferta?')) { S.offers = S.offers.filter(x => x.id !== o.id); touch(); closeModal(); renderCurrent(); toast('Oferta eliminada'); } };
  $('#ofGenCover', box).onclick = () => { $('#ofCover', box).value = genCover(o, getCv($('#ofCv', box).value)); };
  $('#ofQuick', box).onclick = () => { const cid = $('#ofCv', box).value; o.cvId = cid; closeModal(); quickAi(o.id); };
  $('#ofOpt', box).onclick = () => { const cid = $('#ofCv', box).value; closeModal(); openOptimize(cid, o.id); };
  $('#ofAgents', box).onclick = () => { const cid = $('#ofCv', box).value; closeModal(); go('agentes'); $('#agOffer').value = o.id; $('#agCv').value = cid; };
}
