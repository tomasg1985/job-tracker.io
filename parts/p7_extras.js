
/* ==========================================================================
   8) Extras: auditoría por sección ATS, más agentes, validación del radar, tour
   ========================================================================== */
IC.help = '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 17h.01"/>';

/* ───────────── enlaces seguros ───────────── */
const safeUrl = u => (/^https?:\/\/[^\s]+\.[^\s]+/.test(u || '') && !/example\.(com|org)/.test(u) ? u : '');
function portalSearchUrl(p, title, company) {
  const q = encodeURIComponent(`${title} ${company || ''}`.trim());
  if (p === 'LinkedIn') return `https://www.linkedin.com/jobs/search/?keywords=${q}&f_TPR=r86400`;
  if (p === 'Indeed') return `https://www.indeed.com/jobs?q=${q}&fromage=1`;
  if (p === 'Glassdoor') return `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${q}`;
  const dom = { Computrabajo: 'computrabajo.com', Bumeran: 'bumeran.com.ar', GetOnBoard: 'getonbrd.com', Workana: 'workana.com', Remotive: 'remotive.com', RemoteOK: 'remoteok.com', Arbeitnow: 'arbeitnow.com', Torre: 'torre.ai' }[p];
  return dom ? `https://www.google.com/search?q=${encodeURIComponent('site:' + dom + ' ')}${q}` : `https://www.google.com/search?q=${q}`;
}

/* ───────────── validación de ofertas del radar ───────────── */
function radarValidate(list) {
  const ok = [], bad = [], seen = new Set(), areas = new Set(S.cvs.map(c => c.area));
  const maxY = Math.max(0, ...S.cvs.map(c => analyzeCv(c).stats.years));
  list.forEach(x => {
    const r = [];
    if (!x.title || x.title.trim().length < 4 || !x.company) r.push('datos incompletos');
    if ((x.text || '').length < 200) r.push('descripción incompleta');
    if (x.url && !/^https?:\/\/[^\s]+\.[^\s]+/.test(x.url)) r.push('enlace inválido');
    if (!x.sim && !x.url) r.push('sin enlace de postulación');
    if (x.hoursAgo < 0 && x.hoursAgo > -2) x.hoursAgo = 0;
    if (!isFinite(x.hoursAgo) || x.hoursAgo < 0 || x.hoursAgo > 24 * 45) r.push('fecha inválida');
    if ((x.keywords || []).filter(k => k.cat !== 'term').length < 3) r.push('sin requisitos identificables');
    const k = norm(x.title + '|' + x.company); if (seen.has(k)) r.push('duplicada'); seen.add(k);
    if (S.cvs.length && x.area !== 'General' && !areas.has(x.area)) r.push(`área ${x.area}: no corresponde a tus CVs`);
    if (S.cvs.length && x.years && x.years > maxY + 3) r.push(`pide ${x.years}+ años (tu CV refleja ≈ ${maxY})`);
    if (S.cvs.length && /(director|head of|principal|staff)/.test(norm(x.title)) && maxY < 8) r.push('nivel directivo: no corresponde a tu seniority');
    (r.length ? bad.push({ x, r }) : ok.push(x));
  });
  return { ok, bad };
}

/* ───────────── auditoría ATS por sección del CV ───────────── */
const SECTION_GUIDE = {
  header: ['Encabezado y contacto', 'Nombre, ciudad/país, email profesional, teléfono con prefijo y 1–2 enlaces (LinkedIn, GitHub o portafolio) como texto visible. Evita foto, íconos y datos en cabeceras o pies de página: muchos ATS no los leen.'],
  education: ['Educación', 'Modelo Harvard: institución, ubicación, título y fechas, en orden cronológico inverso. Usa el nombre oficial del título; cursos y certificaciones van aparte si no son formación formal.'],
  experience: ['Experiencia', 'Organización, ubicación, puesto y fechas (Mmm AAAA – Mmm AAAA). 3–5 viñetas por puesto reciente con verbo de acción + resultado medible (fórmula XYZ). Las tecnologías deben aparecer dentro de las viñetas, no solo en Habilidades.'],
  leadership: ['Liderazgo y actividades', 'Voluntariado, mentoría, comunidades u organización de eventos. Misma estructura que Experiencia. Si tienes poca experiencia laboral, esta sección suma señales blandas verificables.'],
  projects: ['Proyectos', 'Nombre, enlace, stack y resultado. En perfiles IT y de Diseño es evidencia clave: incluye repositorio o caso de estudio con enlace.'],
  skills: ['Habilidades, idiomas y certificaciones', 'Una categoría por línea en texto plano (“Backend: Node.js, Express”). Escribe los términos exactos de la oferta; evita barras, estrellas o porcentajes de nivel. Idiomas con nivel (B2, C1, nativo).'],
  format: ['Formato general', 'Una columna, sin tablas, cuadros ni gráficos; encabezados estándar; PDF con texto o .docx; fuente 10–12 pt; 1 página (2 solo con +10 años de experiencia).']
};
function sectionAudit(cv) {
  const an = analyzeCv(cv), b = cv.basics || {}, s = cv.skills || {}, m = cv.meta || {};
  const C = (ok, msg, fix) => ({ ok: !!ok, msg, fix });
  const yrs = e => yearsOf(e.dates);
  const desc = arr => { const ys = (arr || []).map(yrs).filter(Boolean); return ys.every((y, i) => i === 0 || ys[i - 1].b >= y.b - 0); };
  const exp = cv.experience || [], lead = cv.leadership || [], edu = cv.education || [], pr = cv.projects || [];
  const eb = exp.flatMap(e => e.bullets || []).filter(x => x.trim()), ec = eb.map(bulletCheck), n = Math.max(1, ec.length);
  const out = {};
  out.header = [
    C(b.name && b.name.split(/\s+/).length <= 6, 'Nombre completo visible', 'Escribe nombre y apellido en la primera línea, en texto (no imagen).'),
    C(b.email, 'Email presente', 'Añade un email profesional.'),
    C(!b.email || !/\d{3,}|[_]{2,}/.test(b.email.split('@')[0]), 'Email con aspecto profesional', 'Usa nombre.apellido@… sin números ni apodos.'),
    C(/^\+?\d[\d\s().-]{7,}$/.test((b.phone || '').trim()) && /^\+/.test((b.phone || '').trim()), 'Teléfono con prefijo internacional', 'Formato +54 11 5555-0000.'),
    C(/,/.test(b.location || ''), 'Ubicación con ciudad y país', 'Ejemplo: Buenos Aires, Argentina (los filtros de ubicación lo usan).'),
    C(b.linkedin || b.github || b.web, 'Enlace profesional (LinkedIn/GitHub/portafolio)', 'Añade al menos un enlace en texto visible.'),
    C(!m.emoji, 'Sin emojis ni íconos', 'Quita íconos de contacto: el ATS los lee como caracteres basura.')
  ];
  out.education = [
    C(edu.length, 'Hay al menos una formación', 'Agrega tu formación principal (o curso/bootcamp relevante).'),
    C(edu.every(e => e.school && e.degree), 'Cada formación tiene institución y título', 'Completa institución y título/programa.'),
    C(edu.every(e => e.dates && yearsOf(e.dates)), 'Fechas en formato AAAA – AAAA', 'Usa años claros; evita “en curso” sin año.'),
    C(desc(edu), 'Orden cronológico inverso', 'Pon primero lo más reciente.'),
    C(!cv.sectionOrder || cv.sectionOrder.indexOf('education') <= cv.sectionOrder.indexOf('experience') || cv.sectionOrder.indexOf('education') < 0, 'Educación antes que Experiencia (Harvard)', 'Mueve Educación al inicio, salvo que tu experiencia supere por mucho a tu formación.')
  ];
  const first2 = exp.slice(0, 2);
  const verbCount = {}; eb.forEach(x => { const w = norm(x.split(/\s+/)[0]); verbCount[w] = (verbCount[w] || 0) + 1; });
  const skillItems = String(s.technical || '').split(/[\n,;:]/).map(x => norm(x.trim())).filter(x => x.length > 2);
  const inBul = skillItems.filter(k => eb.some(x => norm(x).includes(k))).length;
  out.experience = [
    C(exp.length, 'Hay experiencia registrada', 'Agrega experiencia laboral, freelance o prácticas.'),
    C(exp.every(e => e.org && e.role && e.dates), 'Cada puesto con organización, rol y fechas', 'Completa los tres datos: el ATS los usa para calcular tu antigüedad.'),
    C(desc(exp), 'Orden cronológico inverso', 'Lo más reciente primero.'),
    C(first2.every(e => (e.bullets || []).filter(Boolean).length >= 3), '3–5 viñetas en los 2 puestos más recientes', 'Amplía con logros concretos.'),
    C(ec.filter(c => c.verb).length / n >= 0.8, '≥ 80 % de viñetas con verbo de acción', 'Empieza con Lideré, Implementé, Reduje…'),
    C(ec.filter(c => c.metric).length / n >= 0.5, '≥ 50 % de viñetas con métricas', 'Cuantifica: %, tiempo, usuarios, volumen, dinero.'),
    C(ec.filter(c => c.xyz).length / n >= 0.35, '≥ 35 % de viñetas con fórmula XYZ', '“Logré X, medido por Y, al hacer Z”.'),
    C(!ec.some(c => c.weak), 'Sin frases débiles (“responsable de…”)', 'Cámbialas por verbos de impacto.'),
    C(!ec.some(c => c.long), 'Viñetas de máximo 2 líneas', 'Divide las que superen 32 palabras.'),
    C(Math.max(0, ...Object.values(verbCount)) < 3, 'Variedad de verbos (sin repetir 3+ veces)', 'Alterna: Diseñé, Construí, Automaticé, Migré.'),
    C(!skillItems.length || inBul / skillItems.length >= 0.35, 'Tecnologías respaldadas en las viñetas', 'Menciona en las viñetas las herramientas que listas en Habilidades: el ATS puntúa el contexto.')
  ];
  out.leadership = lead.length ? [
    C(lead.every(e => e.org && e.role), 'Organización y rol completos', 'Completa los datos de cada actividad.'),
    C(allBullets({ experience: lead }).every(x => bulletCheck(x).verb), 'Viñetas con verbo de acción', 'Empieza con verbo en pasado.'),
    C(allBullets({ experience: lead }).some(x => bulletCheck(x).metric), 'Al menos un logro cuantificado', 'Ej.: “Mentoricé a 12 estudiantes”.')
  ] : [C(false, 'Sin sección de liderazgo/actividades', 'Opcional pero valiosa: voluntariado, mentoría, comunidades o eventos.')];
  out.projects = pr.length ? [
    C(pr.every(p => p.name), 'Cada proyecto con nombre', 'Nombra el proyecto.'),
    C(pr.every(p => p.link), 'Cada proyecto con enlace', 'Agrega repositorio, demo o caso de estudio.'),
    C(pr.every(p => (p.bullets || []).some(x => x.trim() && bulletCheck(x).metric)), 'Resultado medible en cada proyecto', 'Incluye usuarios, rendimiento o impacto.')
  ] : [C(cv.area === 'General', `Sin proyectos${cv.area !== 'General' ? ' (recomendados en perfiles ' + cv.area + ')' : ''}`, 'Añade 1–2 proyectos con stack, enlace y resultado.')];
  const nSk = skillItems.length;
  const tech = String(s.technical || '');
  out.skills = [
    C(tech.trim(), 'Sección de habilidades presente', 'Añade “Habilidades técnicas” en texto plano.'),
    C(!tech.trim() || tech.split('\n').filter(l => /:/.test(l)).length >= Math.min(2, tech.split('\n').length), 'Organizadas por categoría', 'Una línea por categoría: “Backend: Node.js, Express”.'),
    C(nSk <= 45, 'Cantidad razonable (≤ 45 términos)', 'Listas enormes parecen keyword stuffing; conserva las relevantes.'),
    C(!/(\d{2}\s*%|★|●|▪|nivel\s*(alto|medio|bajo)|\((b[aá]sico|intermedio|avanzado)\))/i.test(tech), 'Sin barras, estrellas ni niveles', 'Elimina porcentajes y estrellas: no son legibles ni verificables.'),
    C(/(a1|a2|b1|b2|c1|c2|nativ|bilingu|avanzad|intermedi|b[aá]sic|fluido|fluent)/i.test(s.languages || ''), 'Idiomas con nivel', 'Indica nivel (B2, C1, nativo).'),
    C(!s.certs || /(19|20)\d{2}/.test(s.certs), 'Certificaciones con año o emisor', 'Añade institución y año.')
  ];
  out.format = [
    C(!m.hasTables, 'Sin tablas ni separadores “|”', 'Usa texto lineal con viñetas.'),
    C(!m.multiColumn, 'Una sola columna', 'Evita diseños a 2 columnas.'),
    C(!m.noText, 'Texto seleccionable (no imagen)', 'Exporta a PDF desde Word/Docs.'),
    C(an.stats.words >= 180 && an.stats.words <= 850, `Extensión adecuada (${an.stats.words} palabras)`, 'Apunta a 450–700 palabras (1 página).'),
    C(exp.length && edu.length && tech.trim(), 'Encabezados estándar presentes', 'Educación, Experiencia y Habilidades.'),
    C(!cv.parsedPoorly, 'Estructura reconocida por el parser', 'Revisa el orden de las secciones en el editor.')
  ];
  const res = {};
  Object.entries(out).forEach(([k, checks]) => { res[k] = { key: k, label: SECTION_GUIDE[k][0], guide: SECTION_GUIDE[k][1], checks, score: Math.round(100 * checks.filter(c => c.ok).length / checks.length) }; });
  return res;
}
const auditHtml = (a, only) => (only ? a.checks.filter(c => !c.ok) : a.checks).map(c => `<div class="chk ${c.ok ? 'ok' : 'no'}"><i>${c.ok ? '✓' : '✗'}</i><div><b>${esc(c.msg)}</b>${c.ok ? '' : ` <span class="muted">${esc(c.fix)}</span>`}</div></div>`).join('');
function renderSectionAudit() {
  const sel = $('#auditCv'); if (!sel) return; const prev = sel.value;
  sel.innerHTML = S.cvs.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('') || '<option value="">Sin CVs</option>'; if (prev && getCv(prev)) sel.value = prev;
  const cv = getCv(sel.value), box = $('#auditGrid');
  if (!cv) { box.innerHTML = '<div class="empty"><p>Sube un CV para recibir consejos por sección.</p></div>'; return; }
  const au = sectionAudit(cv);
  box.innerHTML = Object.values(au).map(a => `<div class="tip audit"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h4>${a.label}</h4><span class="badge ${a.score >= 80 ? 'b-ok' : a.score >= 50 ? 'b-warn' : 'b-bad'}">${a.score} %</span></div><p>${a.guide}</p><div class="xyz-out" style="margin-top:10px">${auditHtml(a)}</div><button class="btn btn-sm" style="margin-top:10px" data-act="cv-edit" data-id="${cv.id}">${ico('edit', 14)}Corregir en el editor</button></div>`).join('');
  hydrateIcons(box);
}

/* ───────────── agentes especialistas adicionales ───────────── */
AGENTS.push(
  { id: 'ats', n: 'Auditor ATS técnico', short: 'Auditor ATS', role: 'Parseo, encabezados estándar, fechas y formato', c: '#0EA5A5', i: 'AT' },
  { id: 'redac', n: 'Coach de Redacción', short: 'Redacción', role: 'Viñetas XYZ, verbos, tono y concisión', c: '#E0529C', i: 'RD' },
  { id: 'marca', n: 'Especialista en Marca Personal', short: 'Marca personal', role: 'LinkedIn, GitHub/portafolio y presencia profesional', c: '#7C5CFA', i: 'MP' },
  { id: 'carrera', n: 'Especialista en Trayectoria', short: 'Trayectoria', role: 'Progresión, permanencia, huecos y seniority', c: '#D97706', i: 'TR' }
);
const failList = (arr, k) => arr.filter(c => !c.ok).slice(0, k);
Object.assign(AGENT_FN, {
  ats(c) {
    const au = sectionAudit(c.cv), F = [], A = [], an = c.an;
    const groups = [au.format, au.header, au.skills, au.education]; const score = Math.round(0.45 * an.format + 0.55 * avg(groups.map(g => g.score)));
    groups.forEach(g => failList(g.checks, 2).forEach(x => { F.push({ t: 'warn', x: `${g.label}: ${x.msg}.` }); A.push({ x: x.fix, pts: 3 }); }));
    if (!F.length) F.push({ t: 'ok', x: 'El CV se parsea limpio: encabezados estándar, una columna y texto plano.' });
    F.push({ t: 'info', x: `Legibilidad de formato ${an.format}/100; secciones estándar y contacto verificados.` });
    return { score: clamp(score, 0, 100), verdict: score >= 80 ? 'Un ATS lo leerá sin errores de parseo.' : 'Hay riesgos de parseo que pueden descartar el CV antes de leer su contenido.', F, A };
  },
  redac(c) {
    const { buls, an } = c, s = an.stats, F = [], A = []; const n = Math.max(1, buls.length);
    const wc = buls.map(b => b.split(/\s+/).length), avgW = avg(wc);
    const firsts = {}; buls.forEach(b => { const w = norm(b.split(/\s+/)[0]); firsts[w] = (firsts[w] || 0) + 1; });
    const rep = Object.entries(firsts).filter(([, v]) => v >= 3).map(([k]) => k);
    const score = clamp(Math.round(30 * s.verbR + 30 * Math.min(1, s.metR * 1.4) + 25 * Math.min(1, s.xyzR * 2.2) + 15 * (avgW >= 10 && avgW <= 28 ? 1 : 0.5) - rep.length * 3), 0, 100);
    F.push({ t: s.xyzR >= .35 ? 'ok' : 'bad', x: `Fórmula XYZ en ${Math.round(s.xyzR * 100)} % de las viñetas.` });
    F.push({ t: avgW >= 10 && avgW <= 28 ? 'ok' : 'warn', x: `Longitud media de viñeta: ${Math.round(avgW)} palabras (ideal 12–25).` });
    if (rep.length) { F.push({ t: 'warn', x: `Verbos repetidos al iniciar: ${rep.join(', ')}.` }); A.push({ x: `Varía los verbos iniciales (${rep.join(', ')} se repiten 3+ veces).`, pts: 3 }); }
    if (s.weakN) { F.push({ t: 'warn', x: `${s.weakN} viñeta(s) con voz pasiva o de responsabilidad.` }); A.push({ x: 'Reescribe las viñetas pasivas en voz activa con resultado.', pts: 4 }); }
    if (s.xyzR < .35) A.push({ x: 'Convierte tus 5 viñetas más relevantes a XYZ: resultado + métrica + método.', pts: 8 });
    return { score, verdict: score >= 75 ? 'Redacción directa y orientada a resultados.' : 'La redacción describe tareas; reescribe con impacto medible.', F, A };
  },
  marca(c) {
    const { cv } = c, b = cv.basics, F = [], A = []; let sc = 20;
    const needsCode = cv.area === 'IT', needsPort = cv.area === 'Diseño';
    if (b.linkedin) sc += 25; else { F.push({ t: 'bad', x: 'Sin LinkedIn: es lo primero que busca un reclutador.' }); A.push({ x: 'Agrega la URL de tu perfil de LinkedIn y alinea cargos y fechas con el CV.', pts: 6 }); }
    if (needsCode) { if (b.github) sc += 25; else { F.push({ t: 'warn', x: 'Sin GitHub (perfil IT).' }); A.push({ x: 'Enlaza GitHub con 2–3 repositorios fijados y README claros.', pts: 6 }); } } else sc += 12;
    if (needsPort) { if (b.web) sc += 25; else { F.push({ t: 'bad', x: 'Sin portafolio (perfil de diseño).' }); A.push({ x: 'Añade Behance/Dribbble/web con 2–3 casos de estudio.', pts: 8 }); } } else sc += 12;
    if (b.email && !/\d{3,}/.test(b.email.split('@')[0])) sc += 10; else if (b.email) F.push({ t: 'warn', x: 'El email contiene números o apodos.' });
    if (cv.targetRole) sc += 10; else A.push({ x: 'Define un puesto objetivo claro (aparece como titular y mejora la coincidencia de título).', pts: 3 });
    if (b.name) sc += 10;
    if (!F.length) F.push({ t: 'ok', x: 'Presencia profesional coherente y verificable.' });
    return { score: clamp(sc, 0, 100), verdict: sc >= 75 ? 'Un reclutador puede verificar tu perfil en segundos.' : 'Faltan enlaces que respalden lo que afirma el CV.', F, A, na: false };
  },
  carrera(c) {
    const { cv, an } = c, exp = cv.experience || [], F = [], A = [];
    const ivs = exp.map(e => ({ e, y: yearsOf(e.dates) })).filter(x => x.y); const durs = ivs.map(x => Math.max(0.5, x.y.b - x.y.a));
    const short = durs.filter(d => d < 1).length, avgT = avg(durs);
    const yrs = an.stats.years, need = Math.max(0, ...c.offers.map(o => o.years || 0));
    let sc = 55 + Math.min(20, yrs * 4) - short * 6 + (avgT >= 1.5 ? 10 : 0) + (need ? (yrs >= need ? 10 : -Math.min(15, (need - yrs) * 4)) : 5);
    if (exp.length > 1 && /(senior|sr|lead|jefe)/i.test(exp[0].role || '') ) sc += 5;
    F.push({ t: yrs >= 2 ? 'ok' : 'warn', x: `Experiencia total visible ≈ ${yrs} año(s).` });
    if (need) F.push({ t: yrs >= need ? 'ok' : 'warn', x: `Las ofertas piden hasta ${need}+ años; tu CV refleja ${yrs}.` });
    if (short >= 2) { F.push({ t: 'warn', x: `${short} puestos de menos de 1 año: puede leerse como inestabilidad.` }); A.push({ x: 'Explica los puestos cortos (contrato, proyecto, freelance) en la misma línea.', pts: 3 }); }
    const ys = ivs.map(x => x.y).sort((a, b) => a.a - b.a); let gap = 0; for (let i = 1; i < ys.length; i++) gap = Math.max(gap, ys[i].a - ys[i - 1].b);
    if (gap > 1) { F.push({ t: 'warn', x: `Hueco de ${gap} años entre puestos.` }); A.push({ x: 'Cubre los huecos con formación, proyectos o trabajo independiente.', pts: 3 }); }
    if (need && yrs < need) A.push({ x: 'Postula a puestos de tu nivel o resalta proyectos/logros que compensen los años requeridos.', pts: 5 });
    if (!(cv.education || []).length) A.push({ x: 'Agrega tu formación: sin ella la trayectoria carece de contexto.', pts: 3 });
    if (!F.length) F.push({ t: 'ok', x: 'Trayectoria coherente.' });
    return { score: clamp(Math.round(sc), 0, 100), verdict: sc >= 70 ? 'Trayectoria clara y coherente con las ofertas.' : 'La trayectoria necesita contexto o un mejor encaje de nivel.', F, A };
  }
});

/* ───────────── tour guiado ───────────── */
const TOUR = [
  { view: 'dashboard', sel: '.sidebar', title: 'Bienvenido a JobTrack', text: 'Este tour de 2 minutos te muestra cómo usar la plataforma: cargar CVs, evaluar ofertas, postular rápido y medir tu avance. Puedes salir cuando quieras.' },
  { view: 'dashboard', sel: '#nav', title: 'Las secciones', text: 'Desde aquí navegas: Dashboard, Postulaciones, Estadísticas, Metas, Palabras clave, Historial, CVs, Agentes IA y Ajustes.' },
  { view: 'dashboard', sel: '#kpis', title: 'Tu resumen', text: 'Envíos del día y la semana, match promedio, tasa de respuesta y la cola pendiente. Los datos de ejemplo se borran desde el aviso azul.' },
  { view: 'cvs', sel: '#drop', title: '1 · Sube tus CVs', text: 'Arrastra PDF, DOCX o TXT (o pega el texto). Cada CV se analiza al instante: formato ATS, métricas, verbos de acción y fórmula XYZ.' },
  { view: 'cvs', sel: '#cvGrid', title: 'Análisis y edición', text: 'Cada tarjeta muestra su puntaje ATS y las mejoras sugeridas. “Editar” abre el editor Harvard con vista previa y consejos por sección; “Descargar” exporta PDF, Word o TXT.' },
  { view: 'postulaciones', tab: 'cargar', sel: '#offerForm', title: '2 · Carga una oferta', text: 'Pega la oferta completa. Usa “Cargar ejemplo” para probar. Se extraen las palabras clave y se calcula el match con cada CV.' },
  { view: 'postulaciones', tab: 'cargar', sel: '#analysisPreview', title: 'Análisis en vivo', text: 'Verde = la palabra clave está en tu CV, rojo = falta. Escala: 80–100 listo para entrevista, 60–75 riesgo moderado, menos de 60 no pasa el filtro.' },
  { view: 'postulaciones', tab: 'cola', sel: '#tab-cola .card', title: '3 · Cola de espera', text: 'Las ofertas evaluadas esperan aquí. “Procesar” envía la solicitud y confirma con un mensaje de éxito; “Mejorar con IA” ajusta tu CV a la oferta antes de postular.' },
  { view: 'postulaciones', tab: 'auto', sel: '#autoForm', title: '4 · Auto-postulación', text: 'Define el puntaje mínimo, el CV a usar y el límite por ejecución. El sistema recorre la cola y registra cada postulación con su carta.' },
  { view: 'postulaciones', tab: 'radar', sel: '.radar-filters', title: '5 · Radar de ofertas', text: 'Busca ofertas de menos de 24 h con pocos postulantes y afines a tus CVs. Las incompletas, duplicadas o que no corresponden a tu perfil se descartan y puedes ver el motivo.' },
  { view: 'postulaciones', tab: 'consejos', sel: '#auditGrid', title: '6 · Consejos por sección', text: 'Elige un CV y revisa cada sección (contacto, educación, experiencia, habilidades, formato) con qué corregir para pasar los filtros ATS.' },
  { view: 'keywords', sel: '#kwRing', title: 'Palabras clave y compatibilidad', text: 'Elige una oferta y un CV para ver el % de match, qué keywords tienes y cuáles faltan. Abajo, la brecha recurrente entre todas tus ofertas.' },
  { view: 'agentes', sel: '#agRoster', title: 'Agentes IA', text: 'Diez especialistas (RRHH, reclutamiento, IT, diseño, directores, auditor ATS, redacción, marca personal y trayectoria) auditan tu CV y entregan un plan de mejora priorizado.' },
  { view: 'metas', sel: '#mdRing', title: 'Metas diarias y semanales', text: 'Sigue tu avance frente a 200–300 envíos, con racha, calendario y proyección. Ajusta los rangos en “Configurar metas”.' },
  { view: 'historial', sel: '#histTable', title: 'Historial', text: 'Todas tus postulaciones con CV usado, match y estado. Cambia el estado desde la tabla y exporta a CSV.' },
  { view: 'dashboard', sel: '#tourBtn', title: '¡Listo!', text: 'Puedes repetir este tour cuando quieras con este botón. Empieza subiendo tu CV y cargando tu primera oferta.' }
];
const TOUR_KEY = 'jobtrack.tour.v1';
let tourI = -1, tourLayer = null;
function tourEnd(mark = true) { if (tourLayer) { tourLayer.remove(); tourLayer = null; } tourI = -1; window.removeEventListener('resize', tourPlace); window.removeEventListener('scroll', tourPlace, true); if (mark) { try { localStorage.setItem(TOUR_KEY, '1'); } catch (e) { /* */ } } }
async function tourShow(i) {
  if (i < 0) i = 0; if (i >= TOUR.length) return tourEnd();
  tourI = i; const st = TOUR[i];
  if (!tourLayer) {
    tourLayer = document.createElement('div'); tourLayer.className = 'tour-layer';
    tourLayer.innerHTML = '<div class="tour-block"></div><div class="tour-spot"></div><div class="tour-pop" role="dialog" aria-live="polite"></div>'; document.body.appendChild(tourLayer);
    window.addEventListener('resize', tourPlace); window.addEventListener('scroll', tourPlace, true);
  }
  if (currentView !== st.view || (st.tab && postTab !== st.tab)) { go(st.view, st.tab); await sleep(450); }
  const el = $(st.sel); if (el) { el.scrollIntoView({ block: 'center', behavior: 'instant' }); await sleep(80); }
  const pop = $('.tour-pop', tourLayer);
  pop.innerHTML = `<div class="tour-step">Paso ${i + 1} de ${TOUR.length}</div><h4>${esc(st.title)}</h4><p>${esc(st.text)}</p><div class="tour-dots">${TOUR.map((_, k) => `<i class="${k === i ? 'on' : k < i ? 'done' : ''}"></i>`).join('')}</div><div class="tour-actions"><button class="btn btn-sm btn-ghost" data-tour="skip">Salir</button><div class="spacer"></div>${i > 0 ? '<button class="btn btn-sm" data-tour="prev">Atrás</button>' : ''}<button class="btn btn-sm btn-primary" data-tour="next">${i === TOUR.length - 1 ? 'Finalizar' : 'Siguiente'}</button></div>`;
  tourPlace();
}
function tourPlace() {
  if (!tourLayer || tourI < 0) return; const st = TOUR[tourI], el = $(st.sel), spot = $('.tour-spot', tourLayer), pop = $('.tour-pop', tourLayer);
  const r = el && el.getBoundingClientRect().width ? el.getBoundingClientRect() : null, vw = innerWidth, vh = innerHeight, pw = Math.min(360, vw - 24);
  pop.style.width = pw + 'px';
  if (!r) { spot.style.cssText = 'opacity:0'; pop.style.left = (vw - pw) / 2 + 'px'; pop.style.top = Math.max(16, vh / 2 - 120) + 'px'; return; }
  const pad = 8, h = Math.min(r.height + pad * 2, vh - 8);
  spot.style.cssText = `opacity:1;left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${h}px`;
  const ph = pop.offsetHeight || 220; let top, left = clamp(r.left, 12, vw - pw - 12);
  if (vw > 900 && r.right + pw + 24 < vw && r.width < vw * 0.5) { left = r.right + 18; top = clamp(r.top, 12, vh - ph - 12); }
  else if (r.bottom + ph + 24 < vh) top = r.bottom + 18;
  else if (r.top - ph - 24 > 0) top = r.top - ph - 18;
  else { top = clamp(vh - ph - 16, 12, vh); left = clamp(vw - pw - 16, 12, vw); }
  pop.style.left = left + 'px'; pop.style.top = top + 'px';
}
function startTour(i = 0) { tourEnd(false); tourShow(i); }
document.addEventListener('click', e => { const b = e.target.closest('[data-tour]'); if (!b) return; const a = b.dataset.tour; if (a === 'skip') tourEnd(); else if (a === 'next') tourShow(tourI + 1); else if (a === 'prev') tourShow(tourI - 1); else if (a === 'start') { closeModal(); startTour(); } else if (a === 'later') { closeModal(); try { localStorage.setItem(TOUR_KEY, '1'); } catch (er) { /* */ } } });
document.addEventListener('keydown', e => { if (tourI < 0) return; if (e.key === 'Escape') tourEnd(); if (e.key === 'ArrowRight') tourShow(tourI + 1); if (e.key === 'ArrowLeft') tourShow(tourI - 1); });
function offerTour() {
  let seen = false; try { seen = !!localStorage.getItem(TOUR_KEY); } catch (e) { /* */ } if (seen) return;
  openModal(`<div class="m-b" style="text-align:center;padding:34px 28px"><div class="brand-mark" style="margin:0 auto 14px;width:54px;height:54px">${ico('spark', 26)}</div><h3 style="font-size:22px;margin-bottom:8px">¡Bienvenido a JobTrack!</h3><p class="muted" style="font-size:14px;max-width:420px;margin:0 auto 20px">¿Quieres un tour guiado de 2 minutos para conocer la plataforma?</p><div class="btn-group" style="justify-content:center"><button class="btn btn-primary" data-tour="start">${ico('play')}Comenzar tour</button><button class="btn" data-tour="later">Ahora no</button></div></div>`, 'sm');
}
