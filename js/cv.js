/* JobTrack · CVs: carga, análisis de mejoras, editor por campos (modelo Harvard) */
(function (g) {
  'use strict';
  const JT = g.JT, N = g.NLP, esc = JT.esc, ico = JT.ico, ED = JT.ed = { draft: null, cv: null, tab: 'personal', before: 0 };

  /* =============== Vista CVs =============== */
  JT.views.cvs = () => {
    const S = JT.S();
    const html = `<div class="grid g-21"><div class="card drop" id="drop" data-act="cv-pick" tabindex="0" role="button" aria-label="Subir CV">${ico('upload', 'width="30" height="30"')}<b>Arrastra tu CV aquí o haz clic para elegirlo</b><span class="cv-note">PDF con texto, DOCX, TXT o MD · al subirlo se analiza y se proponen mejoras</span><input type="file" id="cvFile" accept=".pdf,.docx,.txt,.md" multiple hidden></div>
      <div class="card" style="display:grid;gap:10px;align-content:center"><button class="btn" data-act="cv-paste">${ico('copy')}Pegar texto de un CV</button><button class="btn" data-act="cv-new">${ico('plus')}Crear CV desde cero (modelo Harvard)</button></div></div>
    ${S.cvs.length ? `<div class="grid g3">${S.cvs.map(cvCard).join('')}</div>` : '<div class="card empty">Aún no hay CVs. Sube uno para empezar a comparar con ofertas.</div>'}
    <div class="banner"><span>${ico('bulb', 'width="20" height="20"')}</span><span class="sp"><b>Modelo Harvard.</b> Una página, una columna, secciones en este orden: Educación, Experiencia, Liderazgo y actividades, Habilidades e intereses. El editor valida cada viñeta con la fórmula XYZ.</span></div>`;
    return { title: 'CVs', sub: `${S.cvs.length} CV${S.cvs.length === 1 ? '' : 's'} en la base de datos`, html };
  };
  const cvCard = c => {
    const a = JT.analysis(c), b = a.bullets, used = JT.S().offers.filter(o => o.cvId === c.id).length;
    return `<div class="card cv-card"><div style="display:flex;gap:12px;justify-content:space-between;align-items:start"><div style="min-width:0"><h4>${esc(c.name)}</h4><div class="cv-note">${esc(c.area)} · .${esc(c.format || 'txt')} · usado en ${used} oferta${used === 1 ? '' : 's'}</div><div class="chips" style="margin-top:8px">${JT.bandPill(a.score)}${c.optimized ? '<span class="pill info nodot">Optimizado</span>' : ''}</div></div>${JT.ring(a.score, 78, 8, '', a.score + '', 'ATS')}</div>
      <div class="cv-note">Logros con fórmula XYZ completa: <b>${b.ok}/${b.total}</b> · con métrica: <b>${b.metric}/${b.total}</b></div>
      <div class="checks">${a.suggestions.slice(0, 3).map(s => `<div><span class="dot no">!</span><span>${esc(s)}</span><span></span></div>`).join('') || '<div><span class="dot ok">✓</span><span>Sin mejoras estructurales pendientes.</span><span></span></div>'}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm primary" data-act="edit-cv" data-id="${c.id}">${ico('edit')}Editar</button><button class="btn sm" data-act="cv-analysis" data-id="${c.id}">${ico('sparkle')}Mejoras</button><button class="btn sm" data-act="cv-preview" data-id="${c.id}">${ico('eye')}Harvard</button><button class="btn sm" data-act="cv-dup" data-id="${c.id}">${ico('copy')}</button><button class="btn sm danger" data-act="cv-del" data-id="${c.id}" aria-label="Eliminar">${ico('trash')}</button></div></div>`;
  };

  /* =============== Carga de archivos =============== */
  const readPdf = async file => {
    if (!g.pdfjsLib) throw new Error('pdfjs'); pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise; let out = '';
    for (let i = 1; i <= pdf.numPages; i++) { const tc = await (await pdf.getPage(i)).getTextContent(); let y = null; tc.items.forEach(it => { const ny = it.transform[5]; if (y !== null && Math.abs(ny - y) > 2) out += '\n'; else if (y !== null && out && !out.endsWith(' ')) out += ' '; out += it.str; y = ny; }); out += '\n'; }
    return out;
  };
  JT.handleFiles = async files => {
    for (const f of files) {
      const ext = (f.name.split('.').pop() || '').toLowerCase(); let text = '';
      try {
        if (['txt', 'md'].includes(ext)) text = await f.text();
        else if (ext === 'docx') { if (!g.mammoth) throw new Error('mammoth'); text = (await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() })).value; }
        else if (ext === 'pdf') text = await readPdf(f);
        else { JT.toast(`“${esc(f.name)}” no se puede leer: los ATS no procesan imágenes ni formatos cerrados. Usa PDF con texto, DOCX o TXT.`, 'err'); continue; }
      } catch (e) { JT.toast(`No pude leer “${esc(f.name)}” en este navegador. Pega su texto con “Pegar texto de un CV”.`, 'err'); continue; }
      if (text.trim().length < 80) { JT.toast(`“${esc(f.name)}” casi no tiene texto seleccionable. Si es un escaneo, los ATS tampoco lo leerán.`, 'err'); continue; }
      importCV(text, f.name.replace(/\.[^.]+$/, ''), ext);
    }
  };
  const importCV = (text, name, format) => {
    const fields = N.parseCVText(text), kws = N.extractKeywords(text, 20), area = N.detectArea(kws);
    const cv = { id: JT.uid('cv'), name: name || 'CV importado', area: area === 'RRHH' ? 'General' : area, format, fields, ver: 1, active: true, optimized: false, updatedAt: new Date().toISOString() };
    JT.S().cvs.push(cv); JT.save(); JT.refreshScores(); JT.render(); showAnalysis(cv, true);
  };
  JT.acts['cv-pick'] = () => JT.$('#cvFile') && JT.$('#cvFile').click();
  JT.acts['cv-paste'] = () => JT.modal({ title: 'Pegar texto de un CV', size: 'sm', body: `<div class="form"><label class="f">Nombre del CV<input type="text" id="pn" placeholder="CV Backend 2026"></label><label class="f">Texto completo<textarea id="pt" style="min-height:260px" placeholder="Pega aquí el contenido del CV. Usa títulos como EDUCACIÓN, EXPERIENCIA, HABILIDADES y viñetas con •"></textarea></label></div>`, footer: `<button class="btn primary" data-act="cv-paste-ok">Analizar y guardar</button>` });
  JT.acts['cv-paste-ok'] = () => { const t = JT.$('#pt').value; if (t.trim().length < 80) return JT.toast('Pega el texto completo del CV.', 'err'); JT.closeModal(); importCV(t, JT.$('#pn').value.trim() || 'CV pegado', 'txt'); };
  JT.acts['cv-new'] = () => { const f = N.emptyFields(); f.education.push(N.entry()); f.experience.push(N.entry()); const cv = { id: JT.uid('cv'), name: 'CV nuevo', area: 'General', format: 'docx', fields: f, ver: 1, active: true, optimized: false, updatedAt: new Date().toISOString() }; JT.S().cvs.push(cv); JT.save(); JT.render(); openEditor(cv.id); };

  /* =============== Análisis de mejoras =============== */
  const showAnalysis = (cv, fresh) => {
    const a = JT.analysis(cv);
    JT.modal({ title: fresh ? 'CV cargado: análisis de mejoras' : 'Mejoras para ' + esc(cv.name), body: `<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;margin-bottom:16px">${JT.ring(a.score, 120, 12, '', a.score + '', 'ATS / 100')}<div style="flex:1;min-width:220px;display:grid;gap:6px"><b style="font-size:16px">${esc(cv.name)}</b>${JT.bandPill(a.score)}<span class="cv-note">${a.words} palabras · ${a.bullets.total} viñetas · ${a.bullets.ok} con fórmula XYZ completa. ${a.harvardOrder ? '' : 'Falta Educación o Experiencia para el modelo Harvard.'}</span></div></div>
      <div class="grid g2"><div><h4 style="margin-bottom:8px">Verificaciones</h4><div class="checks">${a.checks.map(c => `<div><span class="dot ${c.ok ? 'ok' : 'no'}">${c.ok ? '✓' : '✕'}</span><span>${esc(c.label)}</span><span class="num cv-note">${c.earned}/${c.max}</span></div>`).join('')}</div></div>
      <div><h4 style="margin-bottom:8px">Qué mejorar primero</h4><ol class="recs" style="padding-left:18px">${a.suggestions.slice(0, 7).map(s => `<li>${esc(s)}</li>`).join('') || '<li>Sin pendientes de estructura. Afina las viñetas con la fórmula XYZ.</li>'}</ol>
      ${a.weak.length ? `<h4 style="margin:14px 0 8px">Viñetas a reescribir</h4>${a.weak.slice(0, 4).map(w => `<div class="card flat" style="padding:10px;margin-bottom:8px"><div class="cv-note" style="margin-bottom:4px">${esc(w.where)}</div>“${esc(w.b)}”<div class="cv-note" style="margin-top:4px">${esc(w.issues[0])}</div></div>`).join('')}` : ''}</div></div>`,
      footer: `<button class="btn" data-act="cv-autofix" data-id="${cv.id}">${ico('sparkle')}Aplicar correcciones automáticas</button><button class="btn primary" data-act="edit-cv" data-id="${cv.id}">${ico('edit')}Abrir editor</button>` });
  };
  JT.acts['cv-analysis'] = el => showAnalysis(JT.cvOf(el.dataset.id));

  /* =============== Acciones sobre CVs =============== */
  JT.acts['cv-preview'] = el => { const cv = JT.cvOf(el.dataset.id); JT.modal({ title: 'Vista previa · modelo Harvard', body: `<div class="harvard">${JT.harvardHTML(cv)}</div>`, footer: `<button class="btn" data-act="cv-copy" data-id="${cv.id}">${ico('copy')}Copiar texto</button><button class="btn" data-act="cv-doc" data-id="${cv.id}">${ico('download')}Word</button>` }); };
  JT.acts['cv-doc'] = el => { const cv = JT.cvOf(el.dataset.id); JT.download(JT.fileSlug(cv.name) + '.doc', JT.wordDoc(cv), 'application/msword'); };
  JT.acts['cv-txt'] = el => { const cv = JT.cvOf(el.dataset.id); JT.download(JT.fileSlug(cv.name) + '.txt', N.toText(cv)); };
  JT.acts['cv-copy'] = el => JT.copy(N.toText(JT.cvOf(el.dataset.id)), 'Texto del CV copiado');
  JT.acts['cv-active'] = el => { const c = JT.cvOf(el.dataset.id); c.active = !c.active; JT.save(); JT.render(); };
  JT.acts['cv-dup'] = el => { const c = JT.cvOf(el.dataset.id), n = JSON.parse(JSON.stringify(c)); n.id = JT.uid('cv'); n.name = c.name + ' (copia)'; n.ver = 1; JT.S().cvs.push(n); JT.save(); JT.render(); JT.toast('CV duplicado.'); };
  JT.acts['cv-del'] = el => {
    const S = JT.S(), c = JT.cvOf(el.dataset.id);
    if (S.cvs.length === 1 && S.offers.length) return JT.toast('Necesitas al menos un CV mientras tengas ofertas cargadas.', 'err');
    if (el.dataset.sure !== '1') { el.dataset.sure = '1'; el.innerHTML = 'Confirmar'; setTimeout(() => { el.dataset.sure = ''; el.innerHTML = ico('trash'); }, 3500); return; }
    S.cvs = S.cvs.filter(x => x.id !== c.id); const fb = S.cvs[0]; S.offers.forEach(o => { if (o.cvId === c.id && fb) o.cvId = fb.id; }); JT.refreshScores(); JT.save(); JT.render(); JT.toast('CV eliminado; sus ofertas pasaron a otro CV.');
  };
  JT.acts['cv-autofix'] = el => {
    const c = JT.cvOf(el.dataset.id), before = JT.analysis(c).score, r = N.autoFix(c);
    c.fields = r.cv.fields; c.optimized = true; c.optimizedAt = r.cv.optimizedAt; c.format = r.cv.format; c.ver++; c.updatedAt = new Date().toISOString(); JT.refreshScores(); JT.save(); const after = JT.analysis(c).score;
    JT.closeModal(); JT.render(); JT.toast(r.fixes.length ? `${r.fixes.join(', ')}. ATS ${before} → ${after}. Los logros XYZ debes completarlos tú en el editor.` : `El formato ya estaba en orden (ATS ${after}). Mejora las viñetas con la fórmula XYZ en el editor.`, 'ok', 'CV optimizado');
  };

  /* =============== Editor por campos =============== */
  const getP = (o, p) => p.split('.').reduce((a, k) => a == null ? '' : a[k], o);
  const setP = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); const t = ks.reduce((a, k) => a[k], o); t[last] = v; };
  const TABS = [['personal', 'Datos personales'], ['summary', 'Resumen'], ['education', 'Educación'], ['experience', 'Experiencia'], ['projects', 'Proyectos'], ['leadership', 'Liderazgo'], ['skills', 'Habilidades'], ['view', 'Vista Harvard'], ['check', 'Análisis']];
  const inp = (path, label, ph = '', type = 'text') => `<label class="f">${label}<input type="${type}" data-path="${path}" value="${esc(getP(ED.draft, path))}" placeholder="${esc(ph)}"></label>`;
  const hint = b => { const i = N.bulletInfo(b); return `<span class="xb ${i.verb ? 'y' : 'n'}">Verbo ${i.verb ? '✓' : '✕'}</span><span class="xb ${i.metric ? 'y' : 'n'}">Métrica ${i.metric ? '✓' : '✕'}</span><span class="xb ${i.by ? 'y' : 'n'}">Método ${i.by ? '✓' : '✕'}</span><span class="cv-note">${i.words} palabras</span>`; };
  const LAB = { education: ['Institución', 'Título / grado', 'Ubicación', 'Fechas (2019 - 2023)', 'Detalles (promedio, honores, tesis)'], experience: ['Organización', 'Cargo', 'Ubicación', 'Fechas (Ene 2022 - Presente)', 'Logros (fórmula XYZ)'], projects: ['Proyecto', 'Rol / tipo', 'Enlace o lugar', 'Fecha', 'Logros'], leadership: ['Organización / actividad', 'Rol', 'Ubicación', 'Fechas', 'Logros'] };
  const section = k => {
    const l = LAB[k], arr = ED.draft.fields[k], xyz = k !== 'education';
    return `${arr.map((e, i) => `<div class="entry"><div style="display:flex;gap:6px;justify-content:flex-end"><button class="btn sm ghost" data-act="ed-up" data-sec="${k}" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button><button class="btn sm ghost" data-act="ed-down" data-sec="${k}" data-i="${i}" ${i === arr.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button><button class="btn sm ghost danger" data-act="ed-del" data-sec="${k}" data-i="${i}" aria-label="Quitar entrada">${ico('trash')}</button></div>
      <div class="row">${inp(`fields.${k}.${i}.org`, l[0])}${inp(`fields.${k}.${i}.role`, l[1])}</div><div class="row">${inp(`fields.${k}.${i}.loc`, l[2])}${inp(`fields.${k}.${i}.dates`, l[3])}</div>
      <div class="f" style="font-size:12.5px;font-weight:600;color:var(--ink2)">${l[4]}</div>${e.bullets.map((b, j) => `<div class="bl"><input type="text" data-path="fields.${k}.${i}.bullets.${j}" ${xyz ? `data-bullet="1"` : ''} value="${esc(b)}" placeholder="${xyz ? 'Logré X medido por Y mediante Z' : 'Detalle'}"><button class="btn sm ghost danger" data-act="ed-delb" data-sec="${k}" data-i="${i}" data-j="${j}" aria-label="Quitar viñeta">${ico('x')}</button>${xyz ? `<div class="hintline" data-hint="fields.${k}.${i}.bullets.${j}">${hint(b)}</div>` : ''}</div>`).join('')}
      <button class="btn sm" data-act="ed-addb" data-sec="${k}" data-i="${i}" style="justify-self:start">${ico('plus')}Agregar viñeta</button></div>`).join('') || '<div class="empty">Sin entradas.</div>'}<button class="btn" style="margin-top:12px" data-act="ed-add" data-sec="${k}">${ico('plus')}Agregar ${k === 'education' ? 'estudio' : k === 'experience' ? 'experiencia' : k === 'projects' ? 'proyecto' : 'actividad'}</button>`;
  };
  const pane = () => {
    const t = ED.tab, f = ED.draft.fields;
    if (t === 'personal') return `<div class="form"><div class="row">${inp('name', 'Nombre del CV (interno)')}<label class="f">Área<select data-path="area">${['IT', 'Diseño', 'General'].map(a => `<option ${ED.draft.area === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label></div><div class="sep"></div><div class="row">${inp('fields.personal.name', 'Nombre completo', 'Nombre Apellido')}${inp('fields.personal.title', 'Título profesional', 'Desarrollador Backend')}</div><div class="row">${inp('fields.personal.email', 'Email', '', 'email')}${inp('fields.personal.phone', 'Teléfono', '+54 11 5555 0000')}</div><div class="row">${inp('fields.personal.location', 'Ubicación', 'Ciudad, País')}${inp('fields.personal.linkedin', 'LinkedIn', 'linkedin.com/in/usuario')}</div>${inp('fields.personal.links', 'GitHub / Portfolio / Behance', 'github.com/usuario | behance.net/usuario')}</div>`;
    if (t === 'summary') return `<div class="form"><label class="f">Resumen profesional (2–3 líneas)<textarea data-path="fields.summary" style="min-height:140px">${esc(f.summary)}</textarea></label><div class="cv-note" id="sumCount">${f.summary.split(/\s+/).filter(Boolean).length} palabras · ideal 25–70. Incluye rol, años de experiencia, 2 logros medibles y tus tecnologías clave.</div></div>`;
    if (['education', 'experience', 'projects', 'leadership'].includes(t)) return section(t);
    if (t === 'skills') return `<div class="form"><label class="f">Habilidades técnicas (separadas por comas; usa los términos exactos de las ofertas)<textarea data-path="fields.skills.technical">${esc(f.skills.technical)}</textarea></label>${inp('fields.skills.languages', 'Idiomas', 'Español (nativo), Inglés (B2)')}${inp('fields.skills.interests', 'Intereses', 'Open source, ajedrez')}<label class="f">Certificaciones (separadas por punto y coma)<textarea data-path="fields.certs" style="min-height:70px">${esc(f.certs)}</textarea></label></div>`;
    if (t === 'view') return `<div class="harvard">${JT.harvardHTML(ED.draft)}</div>`;
    const a = N.analyzeCV(ED.draft); return `<div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-bottom:14px">${JT.ring(a.score, 100, 10, '', a.score + '', 'ATS')}<div>${JT.bandPill(a.score)}<div class="cv-note" style="margin-top:6px">Antes de editar: ${ED.before}/100</div></div></div><div class="checks">${a.checks.map(c => `<div><span class="dot ${c.ok ? 'ok' : 'no'}">${c.ok ? '✓' : '✕'}</span><span>${esc(c.label)}${c.ok ? '' : `<br><span class="cv-note">${esc(c.tip)}</span>`}</span><span class="num cv-note">${c.earned}/${c.max}</span></div>`).join('')}</div>${a.weak.length ? `<h4 style="margin:16px 0 8px">Viñetas por reescribir</h4>${a.weak.slice(0, 6).map(w => `<div class="card flat" style="padding:10px;margin-bottom:8px">“${esc(w.b)}”<div class="cv-note" style="margin-top:4px">${esc(w.issues.join(' '))}</div><div class="cv-note" style="margin-top:4px"><b>Plantilla:</b> ${esc(N.xyzScaffold(w.b))}</div></div>`).join('')}` : ''}`;
  };
  const shell = () => `<div class="editor-grid"><div class="ed-nav">${TABS.map(([k, l]) => `<button class="${ED.tab === k ? 'on' : ''}" data-act="ed-tab" data-id="${k}">${l}</button>`).join('')}</div><div id="edPane" style="min-width:0">${pane()}</div></div>`;
  const live = () => { const el = JT.$('#edScore'); if (el) el.textContent = 'ATS ' + N.analyzeCV(ED.draft).score + '/100'; };
  const openEditor = id => {
    const cv = JT.cvOf(id); if (!cv) return; ED.cv = cv; ED.draft = JSON.parse(JSON.stringify(cv)); ED.tab = 'personal'; ED.before = JT.analysis(cv).score;
    JT.modal({ title: 'Editar CV · ' + esc(cv.name), body: shell(), footer: `<span class="pill info nodot" id="edScore" style="margin-right:auto"></span><button class="btn" data-act="close-modal">Cancelar</button><button class="btn primary" data-act="ed-save">Guardar cambios</button>`, onOpen: live });
    JT.onModalClose = () => { ED.draft = null; };
  };
  const repaint = () => { JT.$('#edPane').innerHTML = pane(); JT.$$('.ed-nav button').forEach(b => b.classList.toggle('on', b.dataset.id === ED.tab)); live(); };
  JT.acts['edit-cv'] = el => openEditor(el.dataset.id);
  JT.acts['ed-tab'] = el => { ED.tab = el.dataset.id; repaint(); };
  JT.acts['ed-add'] = el => { ED.draft.fields[el.dataset.sec].push(N.entry()); repaint(); };
  JT.acts['ed-del'] = el => { ED.draft.fields[el.dataset.sec].splice(+el.dataset.i, 1); repaint(); };
  JT.acts['ed-up'] = el => { const a = ED.draft.fields[el.dataset.sec], i = +el.dataset.i; [a[i - 1], a[i]] = [a[i], a[i - 1]]; repaint(); };
  JT.acts['ed-down'] = el => { const a = ED.draft.fields[el.dataset.sec], i = +el.dataset.i; [a[i + 1], a[i]] = [a[i], a[i + 1]]; repaint(); };
  JT.acts['ed-addb'] = el => { ED.draft.fields[el.dataset.sec][+el.dataset.i].bullets.push(''); repaint(); };
  JT.acts['ed-delb'] = el => { const b = ED.draft.fields[el.dataset.sec][+el.dataset.i].bullets; b.splice(+el.dataset.j, 1); if (!b.length) b.push(''); repaint(); };
  JT.acts['ed-save'] = () => {
    const cv = ED.cv, d = ED.draft, before = ED.before; cv.name = d.name.trim() || cv.name; cv.area = d.area; cv.fields = d.fields; cv.ver++; cv.updatedAt = new Date().toISOString();
    JT.refreshScores(); JT.save(); const after = JT.analysis(cv).score; JT.closeModal(); JT.render();
    JT.toast(`ATS ${before} → ${after}${after > before ? ' (mejoró)' : after < before ? ' (bajó: revisa el análisis)' : ''}. Se recalcularon las ${JT.S().offers.length} ofertas.`, 'ok', 'CV guardado');
  };
  JT.ed.onInput = el => {
    if (!ED.draft) return; const p = el.dataset.path; if (!p) return; setP(ED.draft, p, el.value);
    if (el.dataset.bullet) { const h = JT.$(`[data-hint="${p}"]`); if (h) h.innerHTML = hint(el.value); }
    if (p === 'fields.summary') { const c = JT.$('#sumCount'); if (c) c.textContent = el.value.split(/\s+/).filter(Boolean).length + ' palabras · ideal 25–70.'; }
    clearTimeout(JT.ed.t); JT.ed.t = setTimeout(live, 250);
  };
})(window);
