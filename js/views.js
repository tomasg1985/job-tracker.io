/* JobTrack · vistas 1/2: Dashboard y Postulaciones */
(function (g) {
  'use strict';
  const JT = g.JT, N = g.NLP, esc = JT.esc, ico = JT.ico;
  JT.views = {}; JT.acts = {}; JT.ui.proc = {};

  /* ----- estadística de palabras clave entre ofertas ----- */
  JT.kwStats = (offers) => {
    const m = new Map();
    offers.forEach(o => { const sc = JT.offerMatch(o); if (!sc) return; const have = new Set(sc.matched.map(k => k.term)); o.keywords.forEach(k => { const e = m.get(k.term) || { term: k.term, domain: k.domain, type: k.type, need: 0, have: 0, w: 0, dict: k.dict }; e.need++; e.w += k.w; if (have.has(k.term)) e.have++; m.set(k.term, e); }); });
    return [...m.values()].sort((a, b) => b.w - a.w);
  };
  const kpi = (l, v, d, pct) => `<div class="card kpi"><span class="l">${l}</span><span class="v num">${v}</span><span class="d">${d}</span>${pct != null ? `<div class="mini"><i style="width:${JT.clamp(pct, 0, 100)}%"></i></div>` : ''}</div>`;
  const STC = () => ({ espera: JT.series(1), aplicada: JT.series(7), sin_respuesta: JT.cssv('--muted'), entrevista: JT.series(3), oferta: JT.series(6), rechazada: JT.series(8) });
  const legend = items => `<div class="legend">${items.map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join('')}</div>`;

  /* =============== DASHBOARD =============== */
  JT.views.dashboard = () => {
    const S = JT.S(), st = S.settings, offers = S.offers, td = JT.today(), sent = JT.sentOn(td), wk = JT.sentWeek(), gw = JT.goalWeek();
    const queue = offers.filter(o => o.status === 'espera'), ready = offers.filter(o => o.score >= 80).length, avg = Math.round(JT.avg(offers.map(o => o.score)));
    const lowCV = S.cvs.filter(c => JT.analysis(c).score < 80), rdy = queue.filter(o => o.score >= st.threshold);
    const actions = [];
    if (rdy.length) actions.push([`Procesar ${rdy.length} oferta${rdy.length > 1 ? 's' : ''} en espera con match ≥ ${st.threshold}%`, 'Postulaciones', 'go-cola']);
    lowCV.slice(0, 2).forEach(c => actions.push([`Mejorar “${esc(c.name)}” (ATS ${JT.analysis(c).score}/100)`, 'Editar CV', 'edit-cv', c.id]));
    if (sent < st.dailyMin) actions.push([`Te faltan ${st.dailyMin - sent} envíos para la meta mínima de hoy`, 'Registrar envíos', 'go-metas']);
    actions.push(['Buscar ofertas nuevas con pocos postulantes (últimas 24 h)', 'Abrir radar', 'go-radar']);
    const recent = [...offers].sort((a, b) => new Date(b.appliedAt || b.createdAt) - new Date(a.appliedAt || a.createdAt)).slice(0, 6);
    const html = `
    <div class="grid g5">
      ${kpi('Enviadas hoy', `${sent}<small> / ${st.dailyMin}</small>`, sent >= st.dailyMax ? 'Meta máxima alcanzada' : sent >= st.dailyMin ? 'Meta mínima cumplida' : `Faltan ${st.dailyMin - sent} para la mínima`, sent / st.dailyMin * 100)}
      ${kpi('Esta semana', `${wk}<small> / ${gw.min}</small>`, `Rango objetivo ${gw.min}–${gw.max}`, wk / gw.min * 100)}
      ${kpi('Compatibilidad media', `${avg}%`, JT.bandPill(avg), null)}
      ${kpi('Listas para entrevista', ready, `de ${offers.length} ofertas analizadas (≥ 80%)`, ready / Math.max(1, offers.length) * 100)}
      ${kpi('En espera', queue.length, `${rdy.length} sobre el umbral de ${st.threshold}%`, null)}
    </div>
    <div class="grid g-21">
      <div class="card"><div class="card-h"><h3>Envíos de los últimos 14 días</h3><span class="hint">barras = enviados · línea = meta mínima</span></div><div class="chart"><canvas id="c-sends" role="img" aria-label="Envíos diarios frente a la meta"></canvas></div></div>
      <div class="card"><div class="card-h"><h3>Estado de postulaciones</h3></div><div class="chart sm"><canvas id="c-status" role="img" aria-label="Distribución por estado"></canvas></div><div id="stLegend"></div></div>
    </div>
    <div class="grid g2">
      <div class="card"><div class="card-h"><h3>Compatibilidad CV ↔ oferta</h3><span class="hint">escala ATS</span></div><div class="chart sm"><canvas id="c-bands" role="img" aria-label="Ofertas por banda de compatibilidad"></canvas></div>
        <div class="band-scale"><div><i class="a"></i>&lt; 60 No pasa</div><div><i class="b"></i>60–79 Riesgo</div><div><i class="c"></i>≥ 80 Listo</div></div></div>
      <div class="card"><div class="card-h"><h3>Palabras clave más pedidas</h3><span class="hint">en cuántas ofertas aparecen</span></div><div class="chart sm"><canvas id="c-kw" role="img" aria-label="Palabras clave más pedidas"></canvas></div>${legend([[JT.series(3), 'Ya está en tu CV'], [JT.series(8), 'Te falta']])}</div>
    </div>
    <div class="grid g2">
      <div class="card"><div class="card-h"><h3>Siguientes acciones</h3></div><div style="display:grid;gap:8px">${actions.map(a => `<div style="display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid var(--line);border-radius:12px;flex-wrap:wrap"><span style="flex:1;min-width:180px">${a[0]}</span><button class="btn sm" data-act="${a[2]}" data-id="${a[3] || ''}">${a[1]}</button></div>`).join('')}</div></div>
      <div class="card"><div class="card-h"><h3>Actividad reciente</h3></div>${recent.length ? recent.map(o => `<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)"><span class="score ${N.bandOf(o.score).id} num">${o.score}%</span><div style="flex:1;min-width:0"><div class="t" style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(o.title)}</div><div class="s cv-note">${esc(o.company)} · ${esc(o.portal)} · ${JT.fdate(o.appliedAt || o.createdAt)}</div></div>${JT.statusPill(o.status)}</div>`).join('') : '<div class="empty">Todavía no hay actividad.</div>'}</div>
    </div>
    <div class="banner"><span>${ico('bulb', 'width="20" height="20"')}</span><span class="sp"><b>Referencia ATS.</b> Se estima que entre el 70 % y el 75 % de los CVs se descartan antes de que los lea una persona, y cerca del 98 % de las empresas Fortune 500 usan software ATS. Mantén la compatibilidad entre 80 y 95 %: un 100 % puede indicar exceso de palabras clave.</span></div>`;
    const after = () => {
      const days = JT.days(14), sc = STC(), cnt = {}; offers.forEach(o => cnt[o.status] = (cnt[o.status] || 0) + 1);
      JT.chart('c-sends', { type: 'bar', data: { labels: days.map(JT.dm), datasets: [{ type: 'line', label: 'Meta mínima', data: days.map(() => st.dailyMin), borderColor: JT.cssv('--ink2'), borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0, order: 0 }, { label: 'Enviadas', data: days.map(JT.sentOn), backgroundColor: JT.series(1), borderRadius: { topLeft: 4, topRight: 4 }, maxBarThickness: 26, order: 1 }] } });
      const keys = Object.keys(JT.STATUS).filter(k => cnt[k]);
      JT.chart('c-status', { type: 'doughnut', data: { labels: keys.map(k => JT.STATUS[k][0]), datasets: [{ data: keys.map(k => cnt[k]), backgroundColor: keys.map(k => sc[k]), borderColor: JT.cssv('--surface'), borderWidth: 3 }] }, options: { cutout: '66%' } });
      JT.$('#stLegend').innerHTML = legend(keys.map(k => [sc[k], `${JT.STATUS[k][0]} · ${cnt[k]}`]));
      const b = [0, 0, 0]; offers.forEach(o => b[o.score >= 80 ? 2 : o.score >= 60 ? 1 : 0]++);
      JT.chart('c-bands', { type: 'bar', data: { labels: ['No pasa (<60)', 'Riesgo (60–79)', 'Listo (≥80)'], datasets: [{ data: b, backgroundColor: [JT.series(8), JT.series(4), JT.series(3)], borderRadius: 6, maxBarThickness: 64 }] }, options: { scales: { y: { ticks: { precision: 0 }, beginAtZero: true } } } });
      const ks = JT.kwStats(offers).slice(0, 8);
      JT.chart('c-kw', { type: 'bar', data: { labels: ks.map(k => k.term), datasets: [{ label: 'Ya en tu CV', data: ks.map(k => k.have), backgroundColor: JT.series(3), borderRadius: 3 }, { label: 'Te falta', data: ks.map(k => k.need - k.have), backgroundColor: JT.series(8), borderRadius: 3 }] }, options: { indexAxis: 'y', scales: { x: { stacked: true, ticks: { precision: 0 } }, y: { stacked: true, grid: { display: false } } } } });
    };
    return { title: 'Dashboard', sub: new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }), html, after };
  };

  /* =============== POSTULACIONES =============== */
  JT.views.postulaciones = () => {
    const q = JT.S().offers.filter(o => o.status === 'espera').length, t = JT.ui.ptab;
    const tabs = [['nueva', 'Cargar oferta'], ['cola', 'Cola en espera', q], ['radar', 'Radar 24 h'], ['consejos', 'Consejos para el CV'], ['optimizados', 'CVs optimizados']];
    const html = `<div class="tabs" role="tablist">${tabs.map(x => `<button role="tab" class="${t === x[0] ? 'on' : ''}" data-act="ptab" data-id="${x[0]}">${x[1]}${x[2] != null ? `<span class="cnt">${x[2]}</span>` : ''}</button>`).join('')}</div><div id="ptabBody">${JT.ptabs[t]()}</div>`;
    return { title: 'Postulaciones', sub: 'Carga, evalúa, deja en espera y procesa', html, after: () => { if (JT.ptabsAfter[t]) JT.ptabsAfter[t](); } };
  };
  JT.ptabs = {}; JT.ptabsAfter = {};
  const PORTALS = SEED.PORTALS.concat(['Behance Jobs', 'Remotive', 'Otro']).filter((v, i, a) => a.indexOf(v) === i);

  /* ----- Cargar oferta ----- */
  JT.ptabs.nueva = () => {
    const S = JT.S();
    return `<div class="grid g-11w">
      <div class="card"><div class="card-h"><h3>Nueva oferta laboral</h3><span class="sp"></span><button class="btn sm" data-act="draft-sample">Cargar ejemplo</button></div>
        <form class="form" id="offerForm" onsubmit="return false">
          <div class="row"><label class="f">Puesto<input type="text" id="f-title" placeholder="Backend Developer Node.js"></label><label class="f">Empresa<input type="text" id="f-company" placeholder="Nombre de la empresa"></label></div>
          <div class="row r3"><label class="f">Portal<select id="f-portal">${PORTALS.map(p => `<option>${p}</option>`).join('')}</select></label><label class="f">Enlace (opcional)<input type="url" id="f-url" placeholder="https://"></label><label class="f">CV a comparar<select id="f-cv"><option value="auto">Mejor CV (automático)</option>${S.cvs.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label></div>
          <label class="f">Oferta completa (pega todo el texto)<textarea id="f-text" style="min-height:240px" placeholder="Pega aquí la descripción completa: funciones, requisitos, deseables, beneficios…"></textarea></label>
          <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" data-act="draft-analyze">${ico('sparkle')}Extraer palabras clave y evaluar</button><span class="cv-note" style="align-self:center">El análisis corre en tu navegador: nada se envía a servidores.</span></div>
        </form></div>
      <div id="draftResult">${JT.draftHTML()}</div></div>`;
  };
  JT.draftHTML = () => {
    const d = JT.ui.draft;
    if (!d) return `<div class="card empty" style="display:grid;place-items:center;min-height:320px;gap:8px">${ico('tags', 'width="34" height="34"')}<b>El resultado aparece aquí</b><span>Pega una oferta y pulsa “Extraer palabras clave y evaluar”.</span></div>`;
    const cur = d.ranking.find(r => r.cv.id === d.chosen) || d.ranking[0], sc = cur.sc, b = sc.band;
    return `<div class="card"><div class="card-h"><h3>Resultado de la evaluación</h3><span class="sp"></span><span class="pill info nodot">Área: ${esc(d.area)}</span></div>
      <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">${JT.ring(sc.final, 128, 12, '', '', 'compatibilidad')}<div style="display:grid;gap:8px;flex:1;min-width:200px">${JT.bandPill(sc.final)}<div class="cv-note">CV: <b>${esc(cur.cv.name)}</b></div>
        <div class="sparkrow" style="grid-template-columns:96px 1fr 40px;margin:0"><span>Palabras clave</span><span class="tr"><i style="width:${sc.coverage}%;background:${JT.series(1)}"></i></span><b class="num">${sc.coverage}</b></div>
        <div class="sparkrow" style="grid-template-columns:96px 1fr 40px;margin:0"><span>Estructura ATS</span><span class="tr"><i style="width:${sc.structure}%;background:${JT.series(7)}"></i></span><b class="num">${sc.structure}</b></div>
        <div class="sparkrow" style="grid-template-columns:96px 1fr 40px;margin:0"><span>Impacto (XYZ)</span><span class="tr"><i style="width:${sc.impact}%;background:${JT.series(3)}"></i></span><b class="num">${sc.impact}</b></div></div></div>
      ${sc.stuffing ? `<div class="banner warn" style="margin-top:12px"><span class="sp"><b>Posible keyword stuffing.</b> ${sc.stuff.length ? 'Repites ' + sc.stuff.map(s => `${esc(s.term)} (×${s.count})`).join(', ') + '. ' : ''}Un puntaje cercano a 100 % puede verse forzado para un reclutador humano.</span></div>` : ''}
      <div class="sep" style="margin:14px 0"></div>
      <div class="card-h"><h3 style="font-size:13.5px">Palabras clave de la oferta (${d.kws.length})</h3><span class="hint">similitud coseno ${sc.cosine}%</span></div>
      <div class="chips">${sc.matched.map(k => `<span class="kw ok">${ico('check')}${esc(k.term)}</span>`).join('')}${sc.missing.map(k => `<span class="kw miss">${ico('x')}${esc(k.term)}</span>`).join('')}</div>
      <div class="sep" style="margin:14px 0"></div>
      <div class="card-h"><h3 style="font-size:13.5px">Ranking de tus CVs</h3><span class="hint">toca uno para compararlo</span></div>
      ${d.ranking.map(r => `<button class="btn" style="width:100%;margin-bottom:6px;justify-content:space-between;${r.cv.id === cur.cv.id ? 'border-color:var(--accent);background:var(--accent-soft)' : ''}" data-act="draft-cv" data-id="${r.cv.id}"><span>${esc(r.cv.name)}</span>${JT.scoreBadge(r.sc.final)}</button>`).join('')}
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px"><button class="btn primary" data-act="draft-save">${ico('plus')}Guardar en cola de espera</button><button class="btn" data-act="draft-saveapplied">Registrar como ya aplicada</button></div></div>`;
  };
  JT.acts['draft-sample'] = () => { JT.$('#f-title').value = 'Backend Developer Node.js'; JT.$('#f-company').value = 'Empresa de ejemplo'; JT.$('#f-text').value = SEED.T.backend; JT.toast('Oferta de ejemplo cargada: pulsa “Extraer palabras clave y evaluar”.'); };
  JT.acts['draft-analyze'] = () => {
    const text = JT.$('#f-text').value.trim(); if (text.length < 40) return JT.toast('Pega la oferta completa (mínimo unas líneas) para poder analizarla.', 'err');
    if (!JT.S().cvs.length) return JT.toast('Primero carga al menos un CV en la sección CVs.', 'err');
    const kws = N.extractKeywords(text), title = JT.$('#f-title').value.trim() || text.split('\n')[0].slice(0, 70), ranking = JT.rankCVs(kws, text), sel = JT.$('#f-cv').value;
    JT.ui.draft = { title, company: JT.$('#f-company').value.trim(), portal: JT.$('#f-portal').value, url: JT.$('#f-url').value.trim(), text, kws, area: N.detectArea(kws), ranking, chosen: sel === 'auto' ? ranking[0].cv.id : sel };
    JT.$('#draftResult').innerHTML = JT.draftHTML();
  };
  JT.acts['draft-cv'] = el => { JT.ui.draft.chosen = el.dataset.id; JT.$('#draftResult').innerHTML = JT.draftHTML(); };
  const saveDraft = applied => {
    const d = JT.ui.draft; if (!d) return; const cur = d.ranking.find(r => r.cv.id === d.chosen);
    const o = { id: JT.uid('o'), title: d.title, company: d.company || '—', portal: d.portal, url: d.url, area: d.area, text: d.text, createdAt: new Date().toISOString(), appliedAt: applied ? new Date().toISOString() : null, status: applied ? 'aplicada' : 'espera', cvId: cur.cv.id, keywords: d.kws, score: cur.sc.final, coverage: cur.sc.coverage, source: 'manual' };
    JT.S().offers.unshift(o); JT.save(); JT.ui.draft = null; ['f-title', 'f-company', 'f-url', 'f-text'].forEach(i => JT.$('#' + i).value = ''); JT.$('#draftResult').innerHTML = JT.draftHTML(); JT.updateChrome();
    JT.toast(applied ? 'Registrada como aplicada en el historial.' : `“${esc(o.title)}” quedó en la cola de espera (${o.score}%).`, 'ok', 'Oferta guardada');
  };
  JT.acts['draft-save'] = () => saveDraft(false); JT.acts['draft-saveapplied'] = () => saveDraft(true);

  /* ----- Cola en espera + auto-postulación ----- */
  JT.ptabs.cola = () => {
    const S = JT.S(), st = S.settings, q = S.offers.filter(o => o.status === 'espera'), busy = Object.keys(JT.ui.proc).length > 0, auto = JT.ui.auto;
    const eligible = q.filter(o => o.score >= st.threshold).length;
    return `<div class="card"><div class="card-h"><h3>Auto-postulación</h3><span class="hint">procesa la cola completa respetando tu umbral de compatibilidad</span></div>
      <div class="grid g3" style="align-items:end">
        <label class="f">Umbral mínimo: <b class="num" id="thVal">${st.threshold}%</b><input type="range" id="thRange" min="30" max="95" step="5" value="${st.threshold}" data-act-input="set-threshold"></label>
        <label class="f">CV a usar<select id="autoMode" data-act-change="set-automode"><option value="assigned" ${st.autoMode === 'assigned' ? 'selected' : ''}>El asignado a cada oferta</option><option value="best" ${st.autoMode === 'best' ? 'selected' : ''}>El de mayor compatibilidad</option></select></label>
        <label class="f" style="grid-auto-flow:column;justify-content:start;align-items:center;gap:8px"><input type="checkbox" id="coverChk" ${st.cover ? 'checked' : ''} data-act-change="set-cover">Generar mensaje de presentación</label></div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px"><button class="btn primary" data-act="auto-run" ${busy || !eligible ? 'disabled' : ''}>${busy ? '<span class="spin"></span>Procesando…' : ico('play') + `Auto-postular ${eligible} oferta${eligible === 1 ? '' : 's'}`}</button>
        <span class="cv-note">${st.webhook ? 'Cada solicitud se envía a tu webhook configurado.' : 'Modo registro: prepara el paquete (CV + mensaje) y marca la oferta como aplicada. Para envío real conecta un webhook en Ajustes.'}</span></div>
      ${auto ? `<div style="margin-top:12px"><div class="progress"><i style="width:${auto.done / auto.total * 100}%"></i></div><div class="cv-note" style="margin-top:6px">${auto.msg}</div></div>` : ''}</div>
      <div class="card"><div class="card-h"><h3>Ofertas en espera</h3><span class="hint">${q.length} pendiente${q.length === 1 ? '' : 's'}</span></div>
      ${q.length ? q.map(o => queueItem(o)).join('') : `<div class="empty">No hay ofertas en espera. Carga una oferta o agrega alguna desde el radar.</div>`}</div>`;
  };
  const queueItem = o => {
    const proc = JT.ui.proc[o.id], cv = JT.cvOf(o.cvId), sc = JT.offerMatch(o), below = o.score < JT.S().settings.threshold;
    return `<div class="queue-item ${proc ? 'proc' : ''}"><div>${JT.scoreBadge(o.score)}</div>
      <div style="min-width:0"><div class="qt">${esc(o.title)}</div><div class="qs"><span>${esc(o.company)}</span><span>${esc(o.portal)}</span><span>${esc(o.area)}</span><span>${proc ? '<span class="spin"></span> En espera · procesando solicitud…' : (below ? `<span style="color:var(--warn)">Bajo el umbral</span>` : `Cargada ${JT.ago(o.createdAt)}`)}</span></div>
        <div class="qs"><span>CV:</span><select data-act-change="q-cv" data-id="${o.id}" ${proc ? 'disabled' : ''} style="width:auto;padding:3px 8px;font-size:12.5px">${JT.S().cvs.map(c => `<option value="${c.id}" ${c.id === o.cvId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select><span>${sc ? `${sc.matched.length}/${o.keywords.length} claves cubiertas` : ''}</span></div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="btn sm" data-act="view-offer" data-id="${o.id}" ${proc ? 'disabled' : ''}>${ico('eye')}Análisis</button><button class="btn sm primary" data-act="proc-one" data-id="${o.id}" ${proc ? 'disabled' : ''}>${proc ? '<span class="spin"></span>Procesando' : 'Procesar solicitud'}</button><button class="btn sm danger" data-act="del-offer" data-id="${o.id}" ${proc ? 'disabled' : ''} aria-label="Quitar">${ico('trash')}</button></div></div>`;
  };
  JT.refreshQueue = () => { JT.updateChrome(); if (JT.ui.view === 'postulaciones' && JT.ui.ptab === 'cola') JT.$('#ptabBody').innerHTML = JT.ptabs.cola(); };
  JT.processOffer = async (id, auto) => {
    const S = JT.S(), st = S.settings, o = S.offers.find(x => x.id === id); if (!o || JT.ui.proc[id]) return false;
    JT.ui.proc[id] = true; JT.refreshQueue();
    if (auto && st.autoMode === 'best') { o.cvId = JT.rankCVs(o.keywords, o.text)[0].cv.id; }
    const cv = JT.cvOf(o.cvId); JT.refreshScores(); const sc = JT.offerMatch(o);
    await JT.sleep(1400);
    let via = 'registro local', msg = st.cover ? JT.cover(o, cv, sc) : '';
    if (st.webhook) { try { await fetch(st.webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: o.title, company: o.company, url: o.url, portal: o.portal, score: o.score, cvName: cv.name, cvText: N.toText(cv), message: msg }) }); via = 'webhook'; } catch (e) { via = 'registro local (webhook sin respuesta)'; } }
    o.status = 'aplicada'; o.appliedAt = new Date().toISOString(); o.message = msg; o.via = via; delete JT.ui.proc[id]; JT.save(); JT.refreshQueue();
    JT.toast(`${esc(o.title)} · ${esc(o.company)} se procesó con “${esc(cv.name)}” y pasó al historial${via === 'webhook' ? ' (enviada al webhook)' : ' (paquete preparado y registrado)'}.`, 'ok', 'Solicitud procesada con éxito');
    return true;
  };
  JT.acts['proc-one'] = el => JT.processOffer(el.dataset.id, false);
  JT.acts['auto-run'] = async () => {
    const S = JT.S(), th = S.settings.threshold, list = S.offers.filter(o => o.status === 'espera' && o.score >= th), skipped = S.offers.filter(o => o.status === 'espera' && o.score < th).length;
    if (!list.length) return;
    JT.ui.auto = { done: 0, total: list.length, msg: `Procesando 1 de ${list.length}…` };
    for (const o of list) { JT.ui.auto.msg = `Procesando ${JT.ui.auto.done + 1} de ${list.length}: ${esc(o.title)} · ${esc(o.company)}`; JT.refreshQueue(); await JT.processOffer(o.id, true); JT.ui.auto.done++; }
    JT.ui.auto.msg = `Listo: ${list.length} procesadas. ${skipped} siguen en espera por estar bajo ${th}%.`; JT.refreshQueue();
    JT.toast(`${list.length} solicitud${list.length === 1 ? '' : 'es'} procesada${list.length === 1 ? '' : 's'}. ${skipped ? skipped + ' quedaron en espera por bajo match.' : ''}`, 'ok', 'Auto-postulación completada');
    setTimeout(() => { JT.ui.auto = null; }, 100);
  };
  JT.acts['set-threshold'] = el => { JT.S().settings.threshold = +el.value; JT.$('#thVal').textContent = el.value + '%'; JT.save(); };
  JT.acts['set-automode'] = el => { JT.S().settings.autoMode = el.value; JT.save(); };
  JT.acts['set-cover'] = el => { JT.S().settings.cover = el.checked; JT.save(); };
  JT.acts['q-cv'] = el => { const o = JT.S().offers.find(x => x.id === el.dataset.id); o.cvId = el.value; JT.refreshScores(); JT.save(); JT.refreshQueue(); };
  JT.acts['del-offer'] = el => { const S = JT.S(); S.offers = S.offers.filter(o => o.id !== el.dataset.id); JT.save(); JT.refreshQueue(); if (JT.ui.view === 'historial') JT.render(); };

  /* ----- Radar 24 h ----- */
  const radarGen = () => SEED.RADAR.map((r, i) => { const text = SEED.T[r[3]], kws = N.extractKeywords(text), rk = JT.rankCVs(kws, text)[0]; return { id: 'r' + i + Date.now().toString(36), title: r[0], company: r[1], portal: r[2], text, url: '', hours: 1 + Math.floor(Math.random() * 23), applicants: Math.floor(Math.random() * 16), kws, area: N.detectArea(kws), cvId: rk.cv.id, score: rk.sc.final, demo: true }; });
  const radarLoad = async () => {
    const R = JT.ui.radar, st = JT.S().settings; R.scan = { i: 0, total: SEED.PORTALS.length, name: SEED.PORTALS[0] }; JT.$('#ptabBody').innerHTML = JT.ptabs.radar();
    let real = null;
    if (st.apiUrl) {
      const terms = [...new Set(JT.S().cvs.flatMap(c => N.extractKeywords(N.toText(c), 12).filter(k => k.dict && k.domain !== 'SOFT').map(k => k.term)))].slice(0, 6);
      try { const ctl = new AbortController(); setTimeout(() => ctl.abort(), 12000); const r = await fetch(st.apiUrl.replace(/\/$/, '') + '/api/scan?q=' + encodeURIComponent(terms.join(',')), { signal: ctl.signal }); const j = await r.json(); real = (j.items || []).map((x, i) => { const kws = N.extractKeywords(x.text || x.title, 30), rk = JT.rankCVs(kws, x.text || ''); return { id: 'rr' + i, title: x.title, company: x.company, portal: x.portal, text: x.text || x.title, url: x.url || '', hours: Math.max(0, Math.round((Date.now() - new Date(x.postedAt)) / 3600000)), applicants: x.applicants == null ? null : x.applicants, kws, area: N.detectArea(kws), cvId: rk[0].cv.id, score: rk[0].sc.final, demo: false }; }); } catch (e) { JT.toast('No pude conectar con tu servidor de rastreo. Muestro datos de demostración.', 'err'); }
    }
    for (let i = 0; i < SEED.PORTALS.length; i++) { R.scan = { i: i + 1, total: SEED.PORTALS.length, name: SEED.PORTALS[Math.min(i + 1, SEED.PORTALS.length - 1)] }; if (JT.ui.view === 'postulaciones' && JT.ui.ptab === 'radar') JT.$('#ptabBody').innerHTML = JT.ptabs.radar(); await JT.sleep(real ? 120 : 380); }
    R.items = real && real.length ? real : radarGen(); R.demo = !(real && real.length); R.scan = null; R.at = new Date();
    if (JT.ui.view === 'postulaciones' && JT.ui.ptab === 'radar') JT.$('#ptabBody').innerHTML = JT.ptabs.radar();
    JT.toast(`${R.items.length} ofertas detectadas en ${SEED.PORTALS.length} portales.`, 'ok', 'Rastreo completado');
  };
  JT.ptabs.radar = () => {
    const R = JT.ui.radar = JT.ui.radar || { items: null, f: { hours: 24, applicants: 5, min: 50, area: '' } };
    return `<div class="card"><div class="card-h"><h3>Radar de ofertas nuevas</h3><span class="hint">publicadas hace menos de 24 h, con pocos o ningún postulante y relacionadas con tus CVs</span></div>
      <div class="grid g4" style="align-items:end">
        <label class="f">Antigüedad máx.: <b class="num" id="rHv">${R.f.hours} h</b><input type="range" min="1" max="24" value="${R.f.hours}" data-act-input="radar-f" data-k="hours"></label>
        <label class="f">Postulantes máx.: <b class="num" id="rAv">${R.f.applicants}</b><input type="range" min="0" max="30" value="${R.f.applicants}" data-act-input="radar-f" data-k="applicants"></label>
        <label class="f">Match mínimo: <b class="num" id="rMv">${R.f.min}%</b><input type="range" min="0" max="90" step="5" value="${R.f.min}" data-act-input="radar-f" data-k="min"></label>
        <button class="btn primary" data-act="radar-scan" ${R.scan ? 'disabled' : ''}>${R.scan ? '<span class="spin"></span>Rastreando…' : ico('radar') + (R.items ? 'Volver a escanear' : 'Escanear portales')}</button></div>
      ${R.scan ? `<div style="margin-top:14px"><div class="progress"><i style="width:${R.scan.i / R.scan.total * 100}%"></i></div><div class="cv-note" style="margin-top:6px">Rastreando ${esc(R.scan.name)}… (${R.scan.i}/${R.scan.total} portales)</div></div>` : ''}
      <div class="cv-note" style="margin-top:12px">${JT.S().settings.apiUrl ? 'Fuente: tu servidor de rastreo (los portales que no publican el número de postulantes aparecen como “n/d”).' : 'Sin servidor conectado: se usan <b>datos de demostración</b>. Para rastrear portales reales, ejecuta el servidor incluido (carpeta backend) y pega su URL en Ajustes.'}</div></div>
      <div class="card"><div class="card-h"><h3>Oportunidades detectadas</h3><span class="hint" id="rCount"></span></div><div id="radarList">${radarList()}</div></div>`;
  };
  const radarList = () => {
    const R = JT.ui.radar; if (!R.items) return `<div class="empty">Pulsa “Escanear portales” para buscar ofertas recientes con baja competencia.</div>`;
    const f = R.f, list = R.items.filter(x => x.hours <= f.hours && (x.applicants == null || x.applicants <= f.applicants) && x.score >= f.min).sort((a, b) => b.score - a.score || (a.applicants ?? 99) - (b.applicants ?? 99));
    return (R.demo ? '<div class="banner warn" style="margin-bottom:12px"><span class="sp">Datos de demostración: las ofertas son ejemplos, no vacantes reales.</span></div>' : '') + (list.length ? list.map(x => `<div class="radar-item"><div>${JT.scoreBadge(x.score)}</div><div style="min-width:0"><div class="qt">${esc(x.title)}</div><div class="qs"><span>${esc(x.company)}</span><span>${esc(x.portal)}</span><span>Hace ${x.hours} h</span><span class="pill ${x.applicants == null ? '' : x.applicants <= 2 ? 'good' : 'warn'}">${x.applicants == null ? 'Postulantes n/d' : x.applicants === 0 ? 'Sin postulantes' : x.applicants + ' postulantes'}</span><span>${esc(x.area)}</span></div><div class="qs"><span>Mejor CV: ${esc(JT.cvOf(x.cvId).name)}</span></div></div><div style="display:flex;gap:6px">${x.url ? `<a class="btn sm" href="${esc(x.url)}" target="_blank" rel="noopener">Abrir</a>` : ''}<button class="btn sm primary" data-act="radar-add" data-id="${x.id}">${ico('plus')}A la cola</button></div></div>`).join('') : `<div class="empty">Ninguna oferta cumple los filtros actuales. Amplía el máximo de postulantes o baja el match mínimo.</div>`);
  };
  JT.ptabsAfter.radar = () => { const R = JT.ui.radar; if (R.items) JT.$('#rCount').textContent = ''; };
  JT.acts['radar-scan'] = () => JT.S().cvs.length ? radarLoad() : JT.toast('Carga al menos un CV para que el radar pueda relacionar las ofertas.', 'err');
  JT.acts['radar-f'] = el => { const R = JT.ui.radar; R.f[el.dataset.k] = +el.value; JT.$('#rHv').textContent = R.f.hours + ' h'; JT.$('#rAv').textContent = R.f.applicants; JT.$('#rMv').textContent = R.f.min + '%'; JT.$('#radarList').innerHTML = radarList(); };
  JT.acts['radar-add'] = el => {
    const x = JT.ui.radar.items.find(i => i.id === el.dataset.id); if (!x) return; const sc = JT.rankCVs(x.kws, x.text)[0];
    JT.S().offers.unshift({ id: JT.uid('o'), title: x.title, company: x.company, portal: x.portal, url: x.url, area: x.area, text: x.text, createdAt: new Date().toISOString(), appliedAt: null, status: 'espera', cvId: sc.cv.id, keywords: x.kws, score: sc.sc.final, coverage: sc.sc.coverage, source: 'radar' });
    JT.ui.radar.items = JT.ui.radar.items.filter(i => i.id !== x.id); JT.save(); JT.updateChrome(); JT.$('#radarList').innerHTML = radarList(); JT.toast(`${esc(x.title)} se agregó a la cola de espera.`, 'ok');
  };

  /* ----- Consejos ----- */
  JT.ptabs.consejos = () => {
    const S = JT.S(), tips = [
      ['Fórmula XYZ de Google', 'Logré [X] medido por [Y] mediante [Z]', 'Cada viñeta cuenta un resultado (X), lo mide (Y) y explica cómo lo lograste (Z).', 'Responsable de la API de pagos.', 'Reduje la latencia de la API de pagos de 800 ms a 300 ms (−62 %), al agregar caché con Redis e índices en PostgreSQL.'],
      ['Verbos de acción', 'Empieza con un verbo en pasado', 'Lideré, Diseñé, Implementé, Automaticé. Evita “responsable de”, “encargado de”, “ayudé en”.', 'Ayudé con tareas de soporte.', 'Resolví 120 tickets mensuales y bajé el tiempo de respuesta un 30 %.'],
      ['Cuantifica', 'Números en al menos 6 de cada 10 viñetas', 'Usa %, tiempos, dinero, usuarios, volumen o tamaño de equipo. Si no tienes el dato exacto, usa un rango honesto.', 'Mejoré el rendimiento del sitio.', 'Mejoré el tiempo de carga de 4,2 s a 1,8 s en un sitio con 25.000 visitas mensuales.']
    ], rules = [
      ['Modelo Harvard', 'Una página, una sola columna. Orden: encabezado, educación, experiencia, liderazgo/actividades, habilidades e intereses. Organización en negrita, cargo en cursiva, fechas alineadas a la derecha, viñetas con verbo de acción y sin pronombres.'],
      ['Formato ATS', 'PDF con texto seleccionable o DOCX. Sin tablas, columnas, gráficos ni íconos. Fuentes estándar de 10–12 pt. Títulos de sección convencionales (“Experiencia”, “Educación”, “Habilidades”).'],
      ['Palabras clave sin exceso', 'Usa los términos exactos de la oferta (y sus siglas) en Habilidades y en las viñetas. Un término repetido 7 veces o más suena a relleno: el objetivo es 80–95 %, no 100 %.'],
      ['Adapta cada postulación', 'Cambia el título del CV, el resumen y las 3 primeras viñetas según el puesto. Elige el CV con mayor compatibilidad desde la pestaña Cargar oferta.'],
      ['Resumen de 2–3 líneas', 'Rol + años de experiencia + 2 logros medibles + tecnologías clave. Sin “apasionado”, “proactivo”: demuestra, no declares.'],
      ['Nombre del archivo', 'Nombre_Apellido_Puesto.pdf. Evita “CV final v3”. Incluye enlaces a LinkedIn y a GitHub o portfolio.']
    ];
    const my = S.cvs.map(c => ({ c, a: JT.analysis(c) }));
    return `<div class="grid g3">${tips.map(t => `<div class="card tip"><span class="tag">${t[0]}</span><h4>${t[1]}</h4><p class="cv-note">${t[2]}</p><div class="ba"><div class="b"><b>Antes</b>${t[3]}</div><div class="a"><b>Después</b>${t[4]}</div></div></div>`).join('')}</div>
    <div class="grid g-12">
      <div class="card"><div class="card-h"><h3>Constructor XYZ</h3></div><div class="form">
        <label class="f">X · ¿Qué lograste?<input type="text" id="xyz-x" data-act-input="xyz" placeholder="Reduje el tiempo de respuesta de la API"></label>
        <label class="f">Y · ¿Cómo lo mediste?<input type="text" id="xyz-y" data-act-input="xyz" placeholder="de 800 ms a 300 ms (−62 %)"></label>
        <label class="f">Z · ¿Cómo lo lograste?<input type="text" id="xyz-z" data-act-input="xyz" placeholder="agregando caché con Redis e índices SQL"></label>
        <div class="xyz-out" id="xyz-out">Completa los tres campos para ver la viñeta.</div><button class="btn sm" data-act="xyz-copy" style="justify-self:start">${ico('copy')}Copiar viñeta</button></div></div>
      <div class="card"><div class="card-h"><h3>Buenas prácticas</h3></div><div class="grid g2" style="gap:12px">${rules.map(r => `<div style="display:grid;gap:3px"><b>${r[0]}</b><span class="cv-note">${r[1]}</span></div>`).join('')}</div></div></div>
    <div class="card"><div class="card-h"><h3>Mejoras detectadas en tus CVs</h3><span class="hint">calculadas con el analizador</span></div><div class="grid g3">${my.map(({ c, a }) => `<div class="card flat" style="display:grid;gap:8px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>${esc(c.name)}</b>${JT.scoreBadge(a.score)}</div>${a.suggestions.slice(0, 4).map(s => `<div class="cv-note">• ${esc(s)}</div>`).join('') || '<div class="cv-note">Sin mejoras pendientes de estructura.</div>'}<button class="btn sm" data-act="edit-cv" data-id="${c.id}" style="justify-self:start">${ico('edit')}Editar CV</button></div>`).join('')}</div></div>`;
  };
  JT.acts.xyz = () => { const x = JT.$('#xyz-x').value.trim(), y = JT.$('#xyz-y').value.trim(), z = JT.$('#xyz-z').value.trim(); JT.$('#xyz-out').textContent = x || y || z ? `${x || '[X]'}, ${y || '[Y]'}, ${z || '[Z]'}.`.replace(/^\w/, c => c.toUpperCase()) : 'Completa los tres campos para ver la viñeta.'; };
  JT.acts['xyz-copy'] = () => JT.copy(JT.$('#xyz-out').textContent);

  /* ----- CVs optimizados ----- */
  JT.ptabs.optimizados = () => {
    const cvs = JT.S().cvs;
    return `<div class="banner"><span class="sp"><b>CVs listos para postular.</b> Los CVs activos aparecen en la cola y en la auto-postulación. La optimización automática aplica solo correcciones seguras de formato; los logros (XYZ) los completas tú en el editor.</span></div>
    <div class="grid g3">${cvs.map(c => { const a = JT.analysis(c), ok = c.optimized || a.score >= 80; return `<div class="card cv-card"><div style="display:flex;gap:10px;justify-content:space-between;align-items:start"><div><h4>${esc(c.name)}</h4><div class="cv-note">${esc(c.area)} · .${esc(c.format || 'txt')}</div></div>${JT.ring(a.score, 64, 7, '', a.score + '', '')}</div>
      <div class="chips"><span class="pill ${ok ? 'good' : 'warn'}">${ok ? 'Optimizado' : 'Por optimizar'}</span><span class="pill nodot ${c.active ? 'info' : ''}">${c.active ? 'Activo en postulaciones' : 'Inactivo'}</span></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-act="cv-preview" data-id="${c.id}">${ico('eye')}Vista previa</button><button class="btn sm" data-act="cv-doc" data-id="${c.id}">${ico('download')}Word</button><button class="btn sm" data-act="cv-txt" data-id="${c.id}">${ico('download')}Texto</button><button class="btn sm" data-act="cv-copy" data-id="${c.id}">${ico('copy')}Copiar</button></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm primary" data-act="cv-autofix" data-id="${c.id}">${ico('sparkle')}Optimizar automáticamente</button><button class="btn sm" data-act="cv-active" data-id="${c.id}">${c.active ? 'Desactivar' : 'Activar'}</button></div></div>`; }).join('') || '<div class="card empty">Aún no hay CVs.</div>'}</div>`;
  };
})(window);
