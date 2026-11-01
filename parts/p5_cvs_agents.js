
/* ==========================================================================
   5) CVs: tarjetas, carga, análisis, editor Harvard
   ========================================================================== */
function cvCard(cv) {
  const a = analyzeCv(cv), b = bandOf(a.overall), top = a.issues.slice(0, 2);
  const used = S.offers.filter(o => o.cvId === cv.id).length;
  return `<div class="cv-card" data-id="${cv.id}">
    <h4>${esc(cv.name)} ${cv.optimized ? '<span class="badge b-viol">★ Optimizado</span>' : ''}</h4>
    <div class="cv-meta"><span class="badge b-prim">${esc(cv.area)}</span><span class="badge b-mute">${esc((cv.meta && cv.meta.ext) || 'manual').toUpperCase()}</span>${cv.demo || cv.source === 'demo' ? '<span class="badge b-info">Demo</span>' : ''}<span class="badge b-mute">${used} oferta(s)</span>${cv.useInApply ? '<span class="badge b-ok">Disponible para postular</span>' : '<span class="badge b-mute">No se usa al postular</span>'}</div>
    <div class="cv-score">${ringSvg({ pct: a.overall / 100, color: bandColor(a.overall), center: a.overall, size: 72, stroke: 8, fs: 18 })}<div><span class="badge ${b.cls}">${b.label}</span><div class="muted" style="font-size:12px;margin-top:4px">Formato ${a.format} · Calidad ${a.quality}</div></div></div>
    ${top.length ? `<ul>${top.map(i => `<li>${esc(i.msg)}</li>`).join('')}</ul>` : '<span class="muted" style="font-size:12.5px">Sin observaciones críticas.</span>'}
    <div class="cv-actions"><button class="btn btn-sm" data-act="cv-view" data-id="${cv.id}">${ico('eye', 14)}Ver</button><button class="btn btn-sm" data-act="cv-edit" data-id="${cv.id}">${ico('edit', 14)}Editar</button>
      <div class="dl-menu"><button class="btn btn-sm" data-act="cv-dl">${ico('download', 14)}Descargar</button><div class="dl-pop"><button data-act="cv-export" data-id="${cv.id}" data-fmt="pdf">PDF (imprimir)</button><button data-act="cv-export" data-id="${cv.id}" data-fmt="doc">Word (.doc)</button><button data-act="cv-export" data-id="${cv.id}" data-fmt="txt">Texto (.txt)</button><button data-act="cv-export" data-id="${cv.id}" data-fmt="html">HTML</button><button data-act="cv-export" data-id="${cv.id}" data-fmt="json">JSON</button></div></div>
      <button class="btn btn-sm" data-act="cv-toggle" data-id="${cv.id}" title="Usar este CV en las postulaciones">${cv.useInApply ? 'Pausar uso' : 'Activar uso'}</button><button class="btn btn-sm" data-act="cv-dup" data-id="${cv.id}">${ico('copy', 14)}</button><button class="btn btn-sm btn-danger" data-act="cv-del" data-id="${cv.id}">${ico('trash', 14)}</button></div></div>`;
}
function renderCvs() {
  $('#cvCount').textContent = `(${S.cvs.length})`;
  const g = $('#cvGrid');
  g.innerHTML = S.cvs.length ? S.cvs.map(cvCard).join('') : '<div class="card empty" style="grid-column:1/-1"><i data-ic="file"></i><p>No hay CVs. Sube un PDF/DOCX/TXT, pega el texto o crea uno desde la plantilla Harvard.</p></div>';
  hydrateIcons(g);
}
async function handleFiles(files) {
  let first = null;
  for (const f of files) {
    try { const cv = await importCvFile(f); S.cvs.push(cv); first = first || cv; toast('CV cargado', `«${cv.name}» analizado: ATS ${analyzeCv(cv).overall}/100`, 'success'); }
    catch (e) { toast('No se pudo leer ' + f.name, e.message || 'Formato no soportado', 'error'); }
  }
  touch(); renderCurrent(); if (first) showAnalysis(first, true);
}
function issuesHtml(a) {
  const sev = { high: ['b-bad', 'Alta'], med: ['b-warn', 'Media'], low: ['b-info', 'Baja'] };
  return (a.issues.length ? a.issues.map(i => `<div class="cv-match" style="align-items:flex-start"><span class="badge ${sev[i.sev][0]}">${sev[i.sev][1]}</span><b>${esc(i.msg)}<small>${esc(i.tag)} · ${esc(i.fix)}</small></b></div>`).join('') : '<div class="note">' + ico('check') + '<span>No se detectaron problemas relevantes.</span></div>') +
    (a.strengths.length ? `<div class="an-h" style="margin-top:14px">Fortalezas</div><div class="chips">${a.strengths.map(s => `<span class="badge b-ok">✓ ${esc(s)}</span>`).join('')}</div>` : '');
}
function showAnalysis(cv, fresh = false) {
  const a = analyzeCv(cv), b = bandOf(a.overall);
  const box = openModal(`${modalHead(fresh ? 'Análisis del CV cargado' : 'Análisis del CV', cv.name)}<div class="m-b"><div class="grid" style="grid-template-columns:240px 1fr;gap:24px">
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px">${ringSvg({ pct: a.overall / 100, color: bandColor(a.overall), center: a.overall, sub: 'ATS global', size: 170 })}<span class="badge ${b.cls}">${b.label}</span>
      <div class="agent-scores"><div class="as"><span>Formato</span><i style="--w:${a.format}%;--c:var(--teal)"></i><b>${a.format}</b></div><div class="as"><span>Calidad</span><i style="--w:${a.quality}%;--c:var(--violet)"></i><b>${a.quality}</b></div><div class="as"><span>Con métricas</span><i style="--w:${Math.round(a.stats.metR * 100)}%;--c:var(--amber)"></i><b>${Math.round(a.stats.metR * 100)}</b></div><div class="as"><span>XYZ</span><i style="--w:${Math.round(a.stats.xyzR * 100)}%;--c:var(--primary)"></i><b>${Math.round(a.stats.xyzR * 100)}</b></div></div></div>
    <div><div class="an-h">Mejoras sugeridas (${a.issues.length})</div><div style="display:flex;flex-direction:column;gap:8px">${issuesHtml(a)}</div></div></div></div>
    <div class="m-f"><button class="btn" data-act="close-modal">Cerrar</button><button class="btn btn-primary" id="anEdit">${ico('edit')}Corregir en el editor</button></div>`, 'md');
  $('#anEdit', box).onclick = () => { closeModal(); openCvEditor(cv.id); };
}
function viewCv(id) {
  const cv = getCv(id); if (!cv) return; const a = analyzeCv(cv);
  const box = openModal(`${modalHead(cv.name, 'Vista previa en formato Harvard')}<div class="m-b"><div class="grid" style="grid-template-columns:1fr 360px;gap:22px"><div class="paper-wrap" style="max-height:none">${renderPaper(cv)}</div><div><div style="text-align:center">${ringSvg({ pct: a.overall / 100, color: bandColor(a.overall), center: a.overall, sub: 'ATS global', size: 140 })}</div><div class="an-h" style="margin-top:14px">Observaciones</div><div style="display:flex;flex-direction:column;gap:8px">${issuesHtml(a)}</div></div></div></div>
  <div class="m-f"><button class="btn" data-act="cv-export" data-id="${cv.id}" data-fmt="pdf">${ico('download')}PDF</button><button class="btn" data-act="cv-export" data-id="${cv.id}" data-fmt="doc">Word</button><div class="spacer"></div><button class="btn btn-primary" id="vwEdit">${ico('edit')}Editar</button></div>`);
  $('#vwEdit', box).onclick = () => { closeModal(); openCvEditor(id); };
}

/* ───────────── editor del CV ───────────── */
const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const setP = (o, p, v) => { const ks = p.split('.'), last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
function openCvEditor(id, isNew = false) {
  const orig = isNew ? id : getCv(id); if (!orig) return;
  const draft = deep(orig); if (!draft.skills) draft.skills = { technical: '', languages: '', interests: '', certs: '' };
  let tab = 'basics';
  const F = (l, p, rows, ph = '') => { const v = getP(draft, p) ?? ''; return rows ? `<label>${l}<textarea data-p="${p}" rows="${rows}" placeholder="${esc(ph)}">${esc(v)}</textarea></label>` : `<label>${l}<input data-p="${p}" value="${esc(v)}" placeholder="${esc(ph)}"></label>`; };
  const hint = b => { if (!String(b).trim()) return ''; const c = bulletCheck(b); const t = (ok, l) => `<span class="badge ${ok ? 'b-ok' : 'b-mute'}">${ok ? '✓' : '○'} ${l}</span>`; return t(c.verb, 'Verbo de acción') + t(c.metric, 'Métrica') + t(c.xyz, 'XYZ') + (c.weak ? '<span class="badge b-bad">Frase débil</span>' : '') + (c.long ? '<span class="badge b-warn">Muy larga</span>' : ''); };
  const bullets = (list, i) => (draft[list][i].bullets || []).map((b, j) => `<div class="bullet-wrap"><div class="bullet-row"><textarea data-p="${list}.${i}.bullets.${j}" rows="2" placeholder="Verbo de acción + resultado medible (fórmula XYZ)">${esc(b)}</textarea><div class="bm"><button class="icon-btn" style="width:30px;height:30px" data-ed="delb" data-list="${list}" data-i="${i}" data-j="${j}" title="Quitar viñeta">${ico('x', 14)}</button></div></div><div class="bullet-hint">${hint(b)}</div></div>`).join('') + `<button class="btn btn-sm" style="align-self:flex-start" data-ed="addb" data-list="${list}" data-i="${i}">${ico('plus', 14)}Viñeta</button>`;
  const ctrl = (list, i) => `<span class="btn-group"><button class="btn btn-sm" data-ed="up" data-list="${list}" data-i="${i}" title="Subir">↑</button><button class="btn btn-sm" data-ed="down" data-list="${list}" data-i="${i}" title="Bajar">↓</button><button class="btn btn-sm btn-danger" data-ed="del" data-list="${list}" data-i="${i}">${ico('trash', 14)}</button></span>`;
  const entries = (list, lab, orgL, roleL) => draft[list].map((e, i) => `<div class="ed-item"><div class="ed-item-h"><span>${lab} ${i + 1}</span>${ctrl(list, i)}</div><div class="row">${F(orgL, `${list}.${i}.org`)}${F('Ubicación', `${list}.${i}.location`)}</div><div class="row">${F(roleL, `${list}.${i}.role`)}${F('Fechas (Mmm AAAA – Mmm AAAA)', `${list}.${i}.dates`)}</div><div class="an-h" style="margin:4px 0 0">Viñetas de logros</div>${bullets(list, i)}</div>`).join('') + `<button class="btn" style="align-self:flex-start" data-ed="add" data-list="${list}">${ico('plus', 14)}Agregar ${lab.toLowerCase()}</button>`;
  const panes = {
    basics: () => `<div class="row">${F('Nombre completo', 'basics.name')}${F('Ciudad, País', 'basics.location')}</div><div class="row">${F('Email', 'basics.email')}${F('Teléfono', 'basics.phone')}</div><div class="row">${F('LinkedIn', 'basics.linkedin')}${F('GitHub', 'basics.github')}</div>${F('Portafolio / Web', 'basics.web')}${F('Resumen (opcional, máx. 3 líneas — Harvard puede omitirlo)', 'summary', 3)}${F('Puesto objetivo (aparece en el análisis, no en el CV)', 'targetRole')}`,
    education: () => draft.education.map((e, i) => `<div class="ed-item"><div class="ed-item-h"><span>Educación ${i + 1}</span>${ctrl('education', i)}</div><div class="row">${F('Institución', `education.${i}.school`)}${F('Ubicación', `education.${i}.location`)}</div><div class="row">${F('Título / programa', `education.${i}.degree`)}${F('Fechas', `education.${i}.dates`)}</div>${F('Detalles (promedio, honores, cursos relevantes)', `education.${i}.details`, 2)}</div>`).join('') + `<button class="btn" style="align-self:flex-start" data-ed="add" data-list="education">${ico('plus', 14)}Agregar educación</button>`,
    experience: () => entries('experience', 'Experiencia', 'Organización', 'Puesto'),
    leadership: () => entries('leadership', 'Actividad', 'Organización', 'Rol'),
    projects: () => draft.projects.map((p, i) => `<div class="ed-item"><div class="ed-item-h"><span>Proyecto ${i + 1}</span>${ctrl('projects', i)}</div><div class="row">${F('Nombre', `projects.${i}.name`)}${F('Enlace', `projects.${i}.link`)}</div>${F('Fechas', `projects.${i}.dates`)}<div class="an-h" style="margin:4px 0 0">Viñetas</div>${bullets('projects', i)}</div>`).join('') + `<button class="btn" style="align-self:flex-start" data-ed="add" data-list="projects">${ico('plus', 14)}Agregar proyecto</button>`,
    skills: () => `${F('Habilidades técnicas (una categoría por línea: “Backend: Node.js, Express”)', 'skills.technical', 6)}${F('Certificaciones y cursos', 'skills.certs', 2)}${F('Idiomas', 'skills.languages')}${F('Intereses', 'skills.interests')}`,
    config: () => `${F('Nombre interno del CV', 'name')}<div class="row"><label>Área<select data-p="area">${['IT', 'Diseño', 'General'].map(a => `<option ${draft.area === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label><label class="check" style="padding-top:22px"><input type="checkbox" data-p="useInApply" ${draft.useInApply ? 'checked' : ''}><span>Usar en postulaciones</span></label></div>${F('Notas', 'notes', 3)}`
  };
  const TABS = [['basics', 'Datos personales'], ['education', 'Educación'], ['experience', 'Experiencia'], ['leadership', 'Liderazgo'], ['projects', 'Proyectos'], ['skills', 'Habilidades'], ['config', 'Ajustes']];
  const box = openModal(`${modalHead(isNew ? 'Nuevo CV (plantilla Harvard)' : 'Editar CV', 'Cada campo es editable · vista previa y puntaje en vivo')}<div class="m-b"><div class="editor"><div><div class="ed-tabs" id="edTabs"></div><div id="edBody"></div></div><div class="live-score"><div id="edScore"></div><div class="paper-wrap"><div id="edPaper"></div></div></div></div></div>
  <div class="m-f"><button class="btn" data-act="close-modal">Cancelar</button><div class="spacer"></div><button class="btn" id="edPdf">${ico('download')}PDF</button><button class="btn" id="edSaveNew">${ico('copy')}Guardar como nueva versión</button><button class="btn btn-primary" id="edSave">${ico('check')}Guardar cambios</button></div>`);
  const AUD = { basics: 'header', education: 'education', experience: 'experience', leadership: 'leadership', projects: 'projects', skills: 'skills', config: 'format' };
  const updAudit = () => { const a = sectionAudit(draft)[AUD[tab]], el = $('#edAudit', box); if (!el || !a) return; const bad = a.checks.filter(c => !c.ok); el.innerHTML = `<div class="note ${bad.length ? 'warn' : ''}" style="margin:0 0 14px;flex-direction:column;gap:6px"><b>Consejos ATS · ${esc(a.label)} (${a.score} %)</b><span>${esc(a.guide)}</span>${bad.length ? `<div class="xyz-out" style="margin-top:4px">${auditHtml({ checks: bad.slice(0, 5) })}</div>` : '<span>✓ Esta sección cumple las pautas ATS.</span>'}</div>`; };
  const drawTabs = () => { $('#edTabs', box).innerHTML = TABS.map(([k, l]) => `<button data-ed="tab" data-t="${k}" class="${k === tab ? 'on' : ''}">${l}${['education', 'experience', 'leadership', 'projects'].includes(k) ? ` (${draft[k].length})` : ''}</button>`).join(''); };
  const drawBody = () => { $('#edBody', box).innerHTML = `<div id="edAudit"></div><div class="ed-pane on form">${panes[tab]()}</div>`; drawTabs(); updAudit(); hydrateIcons(box); };
  const drawPrev = () => {
    draft.updatedAt = Date.now() + Math.random(); const a = analyzeCv(draft);
    const ms = S.offers.map(o => matchOffer(o, draft).score);
    $('#edPaper', box).innerHTML = renderPaper(draft);
    $('#edScore', box).innerHTML = `<div class="cv-match"><div>${ringSvg({ pct: a.overall / 100, color: bandColor(a.overall), center: a.overall, size: 84, stroke: 9, fs: 20 })}</div><b>ATS global<small>Formato ${a.format} · Calidad ${a.quality}${ms.length ? ` · Match medio ${Math.round(avg(ms))} %` : ''}</small></b><span class="badge ${bandOf(a.overall).cls}">${bandOf(a.overall).label}</span></div>${a.issues.slice(0, 3).map(i => `<div class="note ${i.sev === 'high' ? 'bad' : 'warn'}" style="margin-top:8px">${ico('alert')}<span>${esc(i.msg)}</span></div>`).join('')}`;
    hydrateIcons($('#edScore', box)); updAudit();
  };
  const dp = debounce(drawPrev, 220);
  drawBody(); drawPrev();
  box.addEventListener('input', e => {
    const t = e.target; if (!t.dataset || !t.dataset.p) return;
    setP(draft, t.dataset.p, t.type === 'checkbox' ? t.checked : t.value);
    const w = t.closest('.bullet-wrap'); if (w) $('.bullet-hint', w).innerHTML = hint(t.value);
    dp();
  });
  box.addEventListener('change', e => { const t = e.target; if (t.dataset && t.dataset.p && t.tagName === 'SELECT') { setP(draft, t.dataset.p, t.value); dp(); } });
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-ed]'); if (!b) return; const d = b.dataset, list = d.list, i = +d.i;
    switch (d.ed) {
      case 'tab': tab = d.t; drawBody(); return;
      case 'add': draft[list].push(list === 'education' ? blankEdu() : list === 'projects' ? blankProj() : blankExp()); break;
      case 'del': if (!confirm('¿Quitar este elemento?')) return; draft[list].splice(i, 1); break;
      case 'up': if (i > 0) [draft[list][i - 1], draft[list][i]] = [draft[list][i], draft[list][i - 1]]; break;
      case 'down': if (i < draft[list].length - 1) [draft[list][i + 1], draft[list][i]] = [draft[list][i], draft[list][i + 1]]; break;
      case 'addb': draft[list][i].bullets.push(''); break;
      case 'delb': draft[list][i].bullets.splice(+d.j, 1); break;
    }
    drawBody(); drawPrev();
  });
  const commit = asNew => {
    if (!draft.name.trim()) draft.name = draft.basics.name || 'CV';
    draft.updatedAt = Date.now();
    if (asNew || isNew) { draft.id = uid(); draft.createdAt = Date.now(); if (asNew) draft.name += ' (v2)'; S.cvs.push(draft); }
    else S.cvs[S.cvs.findIndex(c => c.id === orig.id)] = draft;
    draft.parsedPoorly = false; touch(); closeModal(); renderCurrent(); toast('CV guardado', `«${draft.name}» · ATS ${analyzeCv(draft).overall}/100`, 'success');
  };
  $('#edSave', box).onclick = () => commit(false); $('#edSaveNew', box).onclick = () => commit(true); $('#edPdf', box).onclick = () => exportCv(draft, 'pdf');
}
function newHarvardCv() {
  const cv = blankCv({ name: 'Nuevo CV Harvard', basics: { name: '', location: '', email: '', phone: '', linkedin: '', github: '', web: '' }, education: [blankEdu()], experience: [blankExp()], leadership: [blankExp()], sectionOrder: ['education', 'experience', 'leadership', 'skills'] });
  openCvEditor(cv, true);
}
function openPaste() {
  const box = openModal(`${modalHead('Pegar texto del CV', 'Copia el contenido de tu CV; lo estructuramos automáticamente')}<div class="m-b form"><label>Nombre interno<input id="psName" placeholder="Ej. Backend Node.js"></label><label>Texto del CV<textarea id="psText" rows="16" placeholder="Nombre\nCiudad | email | teléfono\n\nEDUCACIÓN\n…\nEXPERIENCIA\nEmpresa | Puesto  Ene 2022 – Presente\n• Logré…"></textarea></label></div><div class="m-f"><button class="btn" data-act="close-modal">Cancelar</button><button class="btn btn-primary" id="psGo">${ico('spark')}Analizar</button></div>`, 'md');
  $('#psGo', box).onclick = () => { const t = $('#psText', box).value; if (t.trim().length < 60) return toast('Texto muy corto', 'Pega el contenido completo del CV.', 'warn'); const cv = parseCvText(t, '', 'txt'); cv.name = $('#psName', box).value.trim() || cv.basics.name || 'CV pegado'; cv.source = 'paste'; S.cvs.push(cv); touch(); closeModal(); renderCurrent(); showAnalysis(cv, true); };
}

/* ==========================================================================
   6) Agentes IA
   ========================================================================== */
const AGENTS = [
  { id: 'rrhh', n: 'Agente de Recursos Humanos', short: 'RRHH', role: 'Claridad, historia profesional y habilidades blandas', c: '#F0466B', i: 'RH' },
  { id: 'recl', n: 'Agente de Reclutamiento', short: 'Reclutamiento', role: 'Filtro ATS, keywords y probabilidad de pasar', c: '#5B5BF0', i: 'RE' },
  { id: 'it', n: 'Especialista IT', short: 'Esp. IT', role: 'Stack técnico, herramientas y evidencia (GitHub/proyectos)', c: '#12B5A6', i: 'IT' },
  { id: 'dis', n: 'Especialista en Diseño', short: 'Esp. Diseño', role: 'Herramientas, proceso UX y portafolio', c: '#8B5CF6', i: 'DI' },
  { id: 'dirit', n: 'Director de Área IT', short: 'Dir. IT', role: 'Impacto, escala, arquitectura y liderazgo técnico', c: '#3B9DF8', i: 'DT' },
  { id: 'dirdis', n: 'Director de Área de Diseño', short: 'Dir. Diseño', role: 'Impacto de producto, design systems y liderazgo', c: '#F5A524', i: 'DD' }
];
function agentCtx(cv, offers) {
  const an = analyzeCv(cv), txt = cvText(cv), N = norm(txt);
  const ms = offers.map(o => ({ o, m: matchOffer(o, cv) }));
  const gap = new Map();
  ms.forEach(({ m }) => m.missing.filter(i => i.cat !== 'term').forEach(i => { const a = gap.get(i.k) || { k: i.k, n: 0, w: 0, grp: i.grp, area: i.area, must: 0 }; a.n++; a.w += i.imp; if (i.must) a.must++; gap.set(i.k, a); }));
  const gaps = [...gap.values()].sort((a, b) => b.must - a.must || b.w - a.w);
  const kws = ms.flatMap(x => x.m.items);
  const itShare = offers.length ? offers.filter(o => o.area === 'IT').length / offers.length + 0.5 * offers.filter(o => o.area === 'General').length / offers.length : (cv.area === 'IT' ? 1 : 0.2);
  const dsShare = offers.length ? offers.filter(o => o.area === 'Diseño').length / offers.length + 0.5 * offers.filter(o => o.area === 'General').length / offers.length : (cv.area === 'Diseño' ? 1 : 0.2);
  const buls = allBullets(cv);
  return { cv, offers, an, txt, N, ms, gaps, kws, itShare, dsShare, buls, avgScore: ms.length ? avg(ms.map(x => x.m.score)) : null };
}
function areaCoverage(c, area, fallbackDict) {
  const items = c.kws.filter(k => k.area === area && k.cat !== 'term');
  if (items.length) { const w = sum(items.map(i => i.w)); return { v: 100 * sum(items.map(i => i.w * i.p)) / (w || 1), n: items.length }; }
  const hits = DICT.filter(e => e.area === area && e.test(c.N)).length; return { v: clamp(hits * 7, 0, 100), n: 0, fb: true };
}
const lst = a => a.slice(0, 5).join(', ');
const AGENT_FN = {
  rrhh(c) {
    const { an, cv, buls } = c, F = [], A = []; const s = an.stats;
    const soft = c.kws.filter(k => k.cat === 'soft'); const softCov = soft.length ? 100 * sum(soft.map(i => i.p)) / soft.length : 60;
    const contact = (cv.basics.email ? 1 : 0) + (cv.basics.phone ? 1 : 0) + (cv.basics.linkedin || cv.basics.github || cv.basics.web ? 1 : 0);
    const score = clamp(Math.round(0.4 * an.quality + 0.25 * an.format + 0.2 * softCov + 0.15 * contact / 3 * 100), 0, 100);
    F.push(s.weakN ? { t: 'warn', x: `${s.weakN} viñeta(s) usan frases de responsabilidad (“responsable de…”) en lugar de logros.` } : { t: 'ok', x: 'Las viñetas describen logros, no solo tareas.' });
    if (s.metR < .5) F.push({ t: 'bad', x: `Solo ${Math.round(s.metR * 100)} % de las viñetas tiene cifras: al leerlo, el impacto no se percibe.` }); else F.push({ t: 'ok', x: 'Buen nivel de logros cuantificados.' });
    const missSoft = soft.filter(i => i.p === 0).map(i => i.k); if (missSoft.length) { F.push({ t: 'warn', x: `Las ofertas piden habilidades blandas que no se ven: ${lst(missSoft)}.` }); A.push({ x: `Muestra ${lst(missSoft)} con un ejemplo concreto dentro de una viñeta (no como lista suelta).`, pts: 4 }); }
    if (contact < 3) { F.push({ t: 'warn', x: 'Contacto incompleto (email, teléfono y un enlace profesional).' }); A.push({ x: 'Completa email, teléfono y LinkedIn/GitHub/portafolio en el encabezado.', pts: 3 }); }
    if (s.words > 850) F.push({ t: 'warn', x: 'El CV supera una página: un reclutador lo lee en 6–10 segundos.' });
    if (s.weakN) A.push({ x: `Reescribe ${s.weakN} viñeta(s) débil(es) con verbo de acción + resultado.`, pts: Math.min(8, s.weakN * 2) });
    if (s.xyzR < .35) A.push({ x: 'Reformula las 3–4 viñetas más importantes con la fórmula XYZ de Google.', pts: 7 });
    return { score, verdict: score >= 80 ? 'Se lee claro y con impacto. Listo para un reclutador humano.' : score >= 60 ? 'Se entiende, pero le falta evidencia de impacto para destacar.' : 'Hoy no comunica valor con claridad: prioriza logros medibles.', F, A };
  },
  recl(c) {
    const { an, ms } = c, F = [], A = []; const avgS = c.avgScore ?? an.overall;
    const prob = Math.round(100 / (1 + Math.exp(-(avgS - 62) / 8)));
    const score = clamp(Math.round(0.6 * avgS + 0.25 * an.format + 0.15 * (ms.length ? 100 * ms.filter(x => x.m.score >= 76).length / ms.length : 50)), 0, 100);
    F.push({ t: prob >= 60 ? 'ok' : prob >= 35 ? 'warn' : 'bad', x: `Probabilidad estimada de superar el filtro ATS: ${prob} % (match medio ${Math.round(avgS)} %).` });
    if (ms.length) { const hi = ms.filter(x => x.m.score >= 80).length, lo = ms.filter(x => x.m.score < 60).length; F.push({ t: lo > ms.length / 3 ? 'bad' : 'ok', x: `${hi} de ${ms.length} ofertas en zona “listo para entrevista”; ${lo} no pasan el filtro (<60 %).` }); }
    const must = c.gaps.filter(g => g.must).slice(0, 5); if (must.length) { F.push({ t: 'bad', x: `Keywords imprescindibles ausentes: ${lst(must.map(g => g.k))}.` }); A.push({ x: `Incorpora (si las dominas) ${lst(must.map(g => g.k))} en Habilidades y en alguna viñeta con contexto.`, pts: Math.min(15, must.length * 3.5) }); }
    if (ms.some(x => x.m.stuffing)) F.push({ t: 'warn', x: 'Hay señales de keyword stuffing: un 100 % forzado se ve artificial para el reclutador.' });
    if (an.format < 85) { F.push({ t: 'bad', x: 'Problemas de formato que el ATS puede leer mal (tablas, columnas, íconos).' }); A.push({ x: 'Simplifica el formato: una columna, sin tablas ni íconos, encabezados estándar.', pts: Math.round((100 - an.format) * .14) + 2 }); }
    F.push({ t: 'info', x: 'Contexto: 70–75 % de los CVs se descartan por ATS y ≈ 98 % de las Fortune 500 lo usan.' });
    A.push({ x: 'Crea una versión optimizada por oferta (sinónimos exactos del aviso) antes de postular.', pts: 6 });
    return { score, verdict: prob >= 60 ? `Buenas chances de pasar el ATS (${prob} %).` : `Riesgo alto de rechazo automático (${prob} % de pasar).`, F, A };
  },
  it(c) {
    const cov = areaCoverage(c, 'IT'), { cv, N } = c, F = [], A = [];
    const evidence = (cv.basics.github ? 1 : 0) + ((cv.projects || []).length ? 1 : 0); const score = clamp(Math.round(cov.v * 0.8 + evidence * 10), 0, 100);
    const have = c.kws.filter(k => k.area === 'IT' && k.cat !== 'term' && k.p >= .6).map(k => k.k); const uniq = [...new Set(have)];
    F.push({ t: cov.v >= 70 ? 'ok' : cov.v >= 45 ? 'warn' : 'bad', x: `Cobertura técnica del stack pedido: ${Math.round(cov.v)} %${cov.fb ? ' (estimada, sin ofertas de referencia)' : ''}.` });
    if (uniq.length) F.push({ t: 'ok', x: `Stack alineado: ${lst(uniq)}.` });
    const groups = {}; c.gaps.filter(g => g.area === 'IT').forEach(g => (groups[g.grp] = groups[g.grp] || []).push(g.k));
    Object.entries(groups).slice(0, 3).forEach(([g, ks]) => { F.push({ t: 'warn', x: `${g}: faltan ${lst(ks)}.` }); });
    const top = c.gaps.filter(g => g.area === 'IT').slice(0, 4); if (top.length) A.push({ x: `Añade proyectos o logros que demuestren ${lst(top.map(g => g.k))} (stack real usado, no solo mención).`, pts: Math.min(12, top.length * 3) });
    if (!cv.basics.github && !(cv.projects || []).length) { F.push({ t: 'warn', x: 'Sin GitHub ni proyectos: no hay evidencia verificable de código.' }); A.push({ x: 'Agrega enlace a GitHub y 1–2 proyectos con stack, escala y resultado.', pts: 6 }); }
    if (!/(testing|jest|mocha|cypress|playwright|pruebas)/.test(N)) { F.push({ t: 'warn', x: 'No se mencionan pruebas automatizadas.' }); A.push({ x: 'Menciona testing (Jest, Cypress…) y cobertura lograda.', pts: 3 }); }
    if (!/(docker|ci\/cd|github actions|despliegue|deploy|render|aws|azure)/.test(N)) { F.push({ t: 'warn', x: 'Falta evidencia de despliegue/DevOps (Docker, CI/CD, nube).' }); A.push({ x: 'Incluye cómo despliegas (Render, AWS, Docker, CI/CD).', pts: 4 }); }
    return { score, verdict: cov.v >= 70 ? 'El stack técnico está bien alineado a lo que piden.' : 'Hay brechas técnicas claras frente al stack de las ofertas.', F, A, na: c.itShare < .15 };
  },
  dis(c) {
    const cov = areaCoverage(c, 'Diseño'), { cv, N } = c, F = [], A = [];
    const portfolio = !!(cv.basics.web || /behance|dribbble|figma\.com|portfolio|portafolio/.test(N));
    const cases = c.buls.filter(b => /(usuari|conversi|usabilidad|accesib|research|test|retenci|nps|prototip)/i.test(b)).length;
    const score = clamp(Math.round(cov.v * 0.7 + (portfolio ? 15 : 0) + Math.min(15, cases * 4)), 0, 100);
    F.push({ t: cov.v >= 70 ? 'ok' : cov.v >= 45 ? 'warn' : 'bad', x: `Cobertura de herramientas y proceso de diseño: ${Math.round(cov.v)} %${cov.fb ? ' (estimada)' : ''}.` });
    F.push(portfolio ? { t: 'ok', x: 'Incluye portafolio/enlace visible.' } : { t: 'bad', x: 'No hay enlace a portafolio (Behance, Dribbble, sitio propio): es lo primero que se revisa.' });
    if (!portfolio) A.push({ x: 'Agrega el enlace a tu portafolio en el encabezado y 2–3 casos de estudio.', pts: 8 });
    F.push({ t: cases >= 2 ? 'ok' : 'warn', x: `${cases} viñeta(s) conectan diseño con usuarios o métricas (research, tests, conversión).` });
    const top = c.gaps.filter(g => g.area === 'Diseño').slice(0, 4); if (top.length) { F.push({ t: 'warn', x: `Faltan: ${lst(top.map(g => g.k))}.` }); A.push({ x: `Refleja ${lst(top.map(g => g.k))} en tu proceso con un ejemplo concreto.`, pts: 6 }); }
    if (!/(accesib|wcag)/.test(N)) A.push({ x: 'Menciona accesibilidad (WCAG) si la aplicas.', pts: 2 });
    return { score, verdict: score >= 70 ? 'Proceso y herramientas bien representados.' : 'El CV no deja ver el proceso de diseño ni resultados con usuarios.', F, A, na: c.dsShare < .15 && cov.fb };
  },
  dirit(c) {
    const { N, buls, cv, an } = c, F = [], A = []; const n = Math.max(1, buls.length);
    const lead = buls.filter(b => /(lider|dirig|arquitect|defin|mentor|coordin|estandar|led |architect|owned|mentored)/i.test(b)).length / n;
    const scale = buls.filter(b => /(\d+\s*(mil|k|m\b|millones)|usuarios|requests|solicitudes|endpoints|servicios|clientes|ms\b|latencia|disponibilidad)/i.test(b)).length / n;
    const biz = buls.filter(b => /(ingres|costo|ahorr|convers|revenue|retenci|roi|ventas|negocio)/i.test(b)).length / n;
    const arch = ['arquitectura', 'microservicios', 'escalab', 'ci/cd', 'seguridad', 'observab', 'alta disponibilidad'].filter(k => N.includes(k)).length / 7;
    const yrs = an.stats.years, need = Math.max(0, ...c.offers.map(o => o.years || 0)); const exp = need ? Math.min(1, yrs / need) : Math.min(1, yrs / 4);
    const score = clamp(Math.round(30 * Math.min(1, lead * 3) + 25 * Math.min(1, scale * 3) + 15 * Math.min(1, biz * 4) + 15 * Math.min(1, arch * 2.5) + 15 * exp), 0, 100);
    F.push({ t: lead >= .2 ? 'ok' : 'warn', x: `${Math.round(lead * 100)} % de las viñetas muestran liderazgo u ownership (lideré, definí, arquitecté, mentoricé).` });
    F.push({ t: scale >= .2 ? 'ok' : 'warn', x: `Señales de escala (usuarios, requests, latencia): ${Math.round(scale * 100)} % de las viñetas.` });
    if (need) F.push({ t: yrs >= need ? 'ok' : 'warn', x: `Experiencia visible ≈ ${yrs} años vs. ${need}+ que piden las ofertas.` });
    if (lead < .2) A.push({ x: 'Destaca decisiones técnicas que tomaste (arquitectura, trade-offs) y a quién influiste.', pts: 6 });
    if (scale < .2) A.push({ x: 'Indica la escala: usuarios, volumen de datos/peticiones, latencia o disponibilidad.', pts: 6 });
    if (biz < .1) A.push({ x: 'Conecta lo técnico con negocio: costos ahorrados, ingresos, conversión o tiempo de entrega.', pts: 5 });
    return { score, verdict: score >= 70 ? 'Perfil con señales claras de impacto técnico y ownership.' : 'Como perfil técnico se lee “ejecutor”: faltan señales de impacto, escala y liderazgo.', F, A, na: c.itShare < .15 };
  },
  dirdis(c) {
    const { N, buls, cv } = c, F = [], A = []; const n = Math.max(1, buls.length);
    const outcome = buls.filter(b => /(convers|retenci|nps|satisfacci|tiempo|reduj|aument|abandono|adopci)/i.test(b) && /\d/.test(b)).length / n;
    const system = /(design system|sistema de dise)/.test(N), research = /(research|investigaci|test(s)? de usabilidad|usabilidad|entrevistas)/.test(N), collab = /(desarrolladores|ingenier|producto|stakeholder|cross|multidisciplin)/.test(N), lead = /(lider|mentor|dirig|coordin)/.test(N);
    const portfolio = !!(cv.basics.web || /behance|dribbble|portfolio|portafolio/.test(N));
    const score = clamp(Math.round(35 * Math.min(1, outcome * 3) + 15 * system + 15 * research + 10 * collab + 15 * lead + 10 * portfolio), 0, 100);
    F.push({ t: outcome >= .2 ? 'ok' : 'warn', x: `${Math.round(outcome * 100)} % de las viñetas vincula diseño con resultados de producto (conversión, retención, tiempo).` });
    F.push({ t: system ? 'ok' : 'warn', x: system ? 'Menciona design system.' : 'No aparece experiencia en design systems.' });
    F.push({ t: research ? 'ok' : 'warn', x: research ? 'Hay decisiones basadas en research/usabilidad.' : 'Faltan decisiones respaldadas por research o tests con usuarios.' });
    F.push({ t: lead ? 'ok' : 'warn', x: lead ? 'Hay señales de liderazgo/mentoría.' : 'Sin señales de liderazgo de equipo o mentoría.' });
    if (outcome < .2) A.push({ x: 'Cuantifica el impacto de tus diseños: conversión, abandono, NPS, tiempo de tarea.', pts: 7 });
    if (!system) A.push({ x: 'Si trabajaste con componentes reutilizables, preséntalo como design system (alcance y adopción).', pts: 4 });
    if (!lead) A.push({ x: 'Muestra liderazgo: mentoría, facilitación de workshops, alineación con stakeholders.', pts: 4 });
    return { score, verdict: score >= 70 ? 'Perfil con visión de producto y resultados.' : 'Se lee como ejecución visual: falta conectar diseño con negocio y liderazgo.', F, A, na: c.dsShare < .15 && outcome === 0 };
  }
};
async function llmNarrative(agent, res, c) {
  const key = S.settings.llmKey; if (!key) return null;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: S.settings.llmModel || 'claude-sonnet-5-5', max_tokens: 350, messages: [{ role: 'user', content: `Eres el ${agent.n} (${agent.role}). Analizas el CV de un candidato frente a ofertas de empleo. En español, en 3-4 frases directas y accionables, comenta estos hallazgos sin inventar datos.\nPuntaje: ${res.score}/100.\nHallazgos: ${res.F.map(f => f.x).join(' | ')}\nAcciones: ${res.A.map(a => a.x).join(' | ')}\nCV (extracto): ${c.txt.slice(0, 2500)}` }] })
    });
    if (!r.ok) throw new Error('HTTP ' + r.status); const j = await r.json(); return (j.content && j.content[0] && j.content[0].text) || null;
  } catch (e) { return null; }
}
const AG = { running: false };
function renderAgents() {
  const cvSel = $('#agCv'), of = $('#agOffer'), pc = cvSel.value, po = of.value;
  cvSel.innerHTML = S.cvs.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('') || '<option value="">Sin CVs</option>';
  of.innerHTML = `<option value="all">Todas las ofertas cargadas (${S.offers.length})</option>` + [...S.offers].sort((a, b) => b.createdAt - a.createdAt).map(o => `<option value="${o.id}">${esc(o.title)} — ${esc(o.company)}</option>`).join('');
  if (pc && getCv(pc)) cvSel.value = pc; if (po && (po === 'all' || getOffer(po))) of.value = po;
  $('#agRoster').innerHTML = AGENTS.map(a => `<div class="ag"><div class="ag-av" style="--c:${a.c}">${a.i}</div><div><b>${a.short}</b><small>${a.role}</small></div></div>`).join('');
  $('#agLlmNote').hidden = !!S.settings.llmKey;
  if (!AG.running && !$('#agPipe').innerHTML) $('#agPipe').innerHTML = AGENTS.map(a => `<span class="st" data-a="${a.id}">${a.short}</span>`).join('') + '<span class="st" data-a="cons">Consenso</span>';
}
const msgHtml = (a, res) => `<div class="ag-av" style="--c:${a.c};width:38px;height:38px;border-radius:12px;display:grid;place-items:center;color:#fff;font-weight:700;background:${a.c};flex:none">${a.i}</div><div class="bubble"><header><b>${a.n}</b><span class="badge ${bandOf(res.score).cls}">${res.score}/100</span>${res.na ? '<span class="badge b-mute">Poca relevancia para estas ofertas</span>' : ''}</header><p><b>${esc(res.verdict)}</b></p><ul>${res.F.map(f => `<li>${{ ok: '✓', warn: '⚠', bad: '✗', info: 'ℹ' }[f.t]} ${esc(f.x)}</li>`).join('')}</ul>${res.llm ? `<p style="margin-top:8px;border-top:1px dashed var(--line);padding-top:8px">${esc(res.llm)}</p>` : ''}</div>`;
async function runAgents(e) {
  e.preventDefault(); if (AG.running) return;
  const cv = getCv($('#agCv').value); if (!cv) return toast('Selecciona un CV', 'Sube un CV primero.', 'warn');
  const ov = $('#agOffer').value, offers = ov === 'all' ? (() => { const a = S.offers.filter(o => o.status !== 'descartada'); const rel = a.filter(o => o.area === cv.area || o.area === 'General'); return rel.length ? rel : a; })() : [getOffer(ov)].filter(Boolean);
  AG.running = true; $('#agRun').disabled = true; const th = $('#agThread'); th.innerHTML = ''; $('#agConsensus').hidden = true;
  const c = agentCtx(cv, offers); $('#agArea').textContent = 'Área: ' + (c.itShare > c.dsShare ? 'IT' : c.dsShare > c.itShare ? 'Diseño' : cv.area);
  $('#agStatus').textContent = `Analizando «${cv.name}» frente a ${offers.length} oferta(s)…`;
  const pipe = $('#agPipe'); pipe.innerHTML = AGENTS.map(a => `<span class="st" data-a="${a.id}">${a.short}</span>`).join('') + '<span class="st" data-a="cons">Consenso</span>';
  if (!offers.length) { th.innerHTML = `<div class="note warn">${ico('alert')}<span>No hay ofertas cargadas: los agentes evalúan el CV de forma general. Carga ofertas para un análisis contra puestos reales.</span></div>`; }
  const results = {};
  for (const a of AGENTS) {
    const st = $(`.st[data-a="${a.id}"]`, pipe); st.classList.add('run');
    const row = document.createElement('div'); row.className = 'msg'; row.innerHTML = `<div style="width:38px;height:38px;border-radius:12px;background:${a.c};color:#fff;display:grid;place-items:center;font-weight:700;flex:none">${a.i}</div><div class="bubble"><header><b>${a.n}</b><span class="typing"><i></i><i></i><i></i></span></header></div>`; th.appendChild(row); th.scrollTop = th.scrollHeight;
    await sleep(550);
    const res = AGENT_FN[a.id](c); res.llm = await llmNarrative(a, res, c); results[a.id] = res;
    row.innerHTML = msgHtml(a, res); st.classList.remove('run'); st.classList.add('done'); th.scrollTop = th.scrollHeight;
  }
  const cons = $('.st[data-a="cons"]', pipe); cons.classList.add('run'); await sleep(500);
  // consenso ponderado según área de las ofertas
  const w = { rrhh: .18, recl: .22, it: .2 * c.itShare + .04, dis: .2 * c.dsShare + .04, dirit: .12 * c.itShare + .03, dirdis: .12 * c.dsShare + .03, ats: .1, redac: .08, marca: .05, carrera: .06 }; const ws = sum(Object.values(w));
  const overall = Math.round(sum(AGENTS.map(a => results[a.id].score * w[a.id])) / ws);
  const sorted = AGENTS.map(a => ({ a, r: results[a.id] })).filter(x => !x.r.na).sort((x, y) => y.r.score - x.r.score);
  const hi = sorted[0], lo = sorted[sorted.length - 1];
  const mod = document.createElement('div'); mod.className = 'msg';
  mod.innerHTML = `<div style="width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#5B5BF0,#8B5CF6);color:#fff;display:grid;place-items:center;flex:none">${ico('spark', 18)}</div><div class="bubble"><header><b>Moderador · Consenso</b><span class="badge ${bandOf(overall).cls}">${overall}/100</span></header><p>${hi && lo && hi.a !== lo.a ? `Mayor acuerdo en <b>${hi.a.short}</b> (${hi.r.score}); la mayor brecha está en <b>${lo.a.short}</b> (${lo.r.score}). ` : ''}Puntaje de preparación ponderado por el área de las ofertas: <b>${overall}/100</b> — ${bandOf(overall).label}.</p></div>`;
  th.appendChild(mod); th.scrollTop = th.scrollHeight; cons.classList.remove('run'); cons.classList.add('done');
  // plan de acción
  const acts = []; AGENTS.forEach(a => results[a.id].A.forEach(x => { if (!results[a.id].na) acts.push({ ...x, by: a.short }); }));
  acts.sort((x, y) => y.pts - x.pts); const seen = new Set(), top = acts.filter(x => { const k = norm(x.x).slice(0, 40); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 7);
  const best = c.ms.slice().sort((x, y) => y.m.score - x.m.score).slice(0, 3);
  const box = $('#agConsensus'); box.hidden = false;
  box.innerHTML = `<header class="card-h"><div><h3>Veredicto del equipo de agentes</h3><p>${esc(cv.name)} · ${offers.length} oferta(s) de referencia</p></div></header><div class="consensus"><div style="display:flex;flex-direction:column;align-items:center">${ringSvg({ pct: overall / 100, color: bandColor(overall), center: overall, sub: 'preparación', size: 190 })}<span class="badge ${bandOf(overall).cls}" style="margin-top:8px">${bandOf(overall).label}</span><div class="agent-scores">${AGENTS.map(a => `<div class="as"><span>${a.short}</span><i style="--w:${results[a.id].score}%;--c:${a.c}"></i><b>${results[a.id].score}</b></div>`).join('')}</div></div>
  <div><div class="an-h">Plan de mejora priorizado</div><div class="cons-list">${top.map((x, i) => `<div class="it"><div class="n">${i + 1}</div><div><b>${esc(x.x)}</b><div class="muted" style="font-size:12px">${esc(x.by)} · impacto estimado +${Math.round(x.pts)} pts</div></div></div>`).join('') || '<div class="note">' + ico('check') + '<span>Sin acciones críticas.</span></div>'}</div>
  ${c.gaps.length ? `<div class="an-h" style="margin-top:18px">Keywords a incorporar (si las dominas)</div><div class="kw-chips">${c.gaps.slice(0, 12).map(g => `<span class="kw miss">${esc(g.k)} <small>${g.n}/${offers.length}</small></span>`).join('')}</div>` : ''}
  ${best.length ? `<div class="an-h" style="margin-top:18px">Mejores ofertas para este CV</div>${best.map(x => `<div class="cv-match" style="margin-bottom:6px"><b>${esc(x.o.title)}<small>${esc(x.o.company)}</small></b>${scoreBar(x.m.score)}</div>`).join('')}` : ''}
  <div class="form-actions"><button class="btn btn-primary" data-act="cv-edit" data-id="${cv.id}">${ico('edit')}Abrir editor del CV</button>${best[0] ? `<button class="btn" data-act="opt-open" data-cv="${cv.id}" data-offer="${best[0].o.id}">${ico('spark')}Optimizar para la mejor oferta</button>` : ''}</div></div></div>`;
  hydrateIcons(box); $('#agStatus').textContent = `Deliberación completada · preparación ${overall}/100`; AG.running = false; $('#agRun').disabled = false;
}
