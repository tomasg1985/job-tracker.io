
/* ==========================================================================
   2) Parser de CVs, datos demo, helpers de UI
   ========================================================================== */

/* ───────────── parser de CV (texto → estructura Harvard) ───────────── */
const SEC_RE = [
  ['summary', /^(resumen|perfil|summary|profile|objetivo|acerca de mi|about me|sobre mi)/],
  ['education', /^(educacion|formacion|education|estudios|academic|formacion academica)/],
  ['experience', /^(experiencia|experience|work history|employment|trayectoria|historial laboral|professional experience)/],
  ['leadership', /^(liderazgo|leadership|actividades|activities|voluntariado|volunteer)/],
  ['projects', /^(proyectos|projects)/],
  ['skills', /^(habilidades|skills|competencias|tecnologias|technical|conocimientos|stack|herramientas|technologies)/],
  ['languages', /^(idiomas|languages)/],
  ['interests', /^(intereses|interests)/],
  ['certs', /^(certificaciones|certifications|cursos|courses|licencias)/]
];
function sectionOf(line) {
  if (/:\s*\S/.test(line)) return null;
  const n = norm(line).replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!n || n.split(' ').length > 5 || /^[\-•*·▪◦]/.test(line.trim())) return null;
  for (const [k, re] of SEC_RE) if (re.test(n)) return k;
  return null;
}
const MON = '(?:ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic|jan|apr|aug|dec)[a-z]*\\.?';
const DATE_RANGE = new RegExp(`((?:${MON}\\s*(?:de\\s*)?)?(?:19|20)\\d{2})\\s*(?:-|–|—|a|to|al|hasta)\\s*((?:${MON}\\s*(?:de\\s*)?)?(?:(?:19|20)\\d{2}|presente|actual|actualidad|present|current|hoy))`, 'i');
const BUL = /^[\-•*·▪◦–—▸►]\s*/;
function assignHead(e, text) {
  text.split(/\s+[|·•–—-]\s+|\s*\|\s*/).map(s => s.trim()).filter(Boolean).forEach(p => {
    if (!e.org) e.org = p; else if (!e.role) e.role = p; else if (!e.location) e.location = p; else e.role += ', ' + p;
  });
}
function parseEntries(lines) {
  const out = []; let cur = null;
  const start = () => { cur = { org: '', location: '', role: '', dates: '', bullets: [] }; out.push(cur); };
  lines.forEach(line => {
    if (BUL.test(line)) { if (!cur) start(); cur.bullets.push(line.replace(BUL, '').trim()); return; }
    const dm = line.match(DATE_RANGE);
    if (dm) {
      const rest = line.replace(dm[0], '').replace(/^[\s|·•,–—-]+|[\s|·•,–—(),-]+$/g, '').trim();
      if (!cur || cur.bullets.length || cur.dates) start();
      cur.dates = dm[0].trim(); if (rest) assignHead(cur, rest); return;
    }
    const first = norm(line.split(/\s+/)[0]).replace(/[^a-z]/g, '');
    if (cur && cur.bullets.length) {
      if (/^[a-záéíóúñ]/.test(line)) { cur.bullets[cur.bullets.length - 1] += ' ' + line; return; }
      if (line.length > 40 || ACTION.has(first)) { cur.bullets.push(line); return; }
      start(); assignHead(cur, line); return;
    }
    if (cur && cur.org && cur.role && cur.dates) { cur.bullets.push(line); return; }
    if (!cur) start();
    assignHead(cur, line);
  });
  return out.filter(e => e.org || e.role || e.bullets.length);
}
function detectMeta(text, ext, extra = {}) {
  const lines = text.split(/\n/).filter(l => l.trim());
  const tbl = lines.filter(l => (l.match(/\s\|\s/g) || []).length >= 2 || (l.match(/\t/g) || []).length >= 2).length;
  const col = lines.filter(l => /\S {5,}\S/.test(l)).length;
  return {
    ext, hasTables: tbl >= 3 || !!extra.tables, multiColumn: lines.length > 10 && col / lines.length > 0.28,
    noText: text.split(/\s+/).filter(Boolean).length < 30, emoji: /[\u{1F300}-\u{1FAFF}☀-➿⭐]/u.test(text)
  };
}
function parseCvText(text, fileName = '', ext = 'txt', extra = {}) {
  text = text.replace(/\r/g, '').replace(/ /g, ' ');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const cv = blankCv({ fileName, source: 'upload', raw: text });
  cv.meta = detectMeta(text, ext, extra);
  // localizar secciones
  const secs = {}; let cur = 'header'; const order = [];
  secs.header = [];
  lines.forEach(l => {
    const s = sectionOf(l);
    if (s) { cur = s; if (!secs[s]) { secs[s] = []; order.push(s); } return; }
    (secs[cur] = secs[cur] || []).push(l);
  });
  if (!order.length) { // sin encabezados reconocibles
    secs.header = lines.slice(0, 4); secs.experience = lines.slice(4); order.push('experience'); cv.parsedPoorly = true;
  }
  cv.sectionOrder = order;
  // encabezado
  const h = secs.header || [];
  const b = cv.basics; const pieces = h.flatMap(l => l.split(/\s*[|·•]\s*/)).map(s => s.trim()).filter(Boolean);
  if (pieces[0] && pieces[0].split(/\s+/).length <= 6 && !/@/.test(pieces[0]) && !/\d{5,}/.test(pieces[0])) b.name = pieces[0];
  pieces.forEach(p => {
    const em = p.match(/[\w.+-]+@[\w-]+\.[\w.-]+/); if (em && !b.email) b.email = em[0];
    const ph = p.match(/\+?\d[\d\s().-]{7,}\d/); if (ph && !b.phone && !/(19|20)\d{2}\s*[-–]/.test(p)) b.phone = ph[0].trim();
    const li = p.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[\w\-/%.]+/i); if (li && !b.linkedin) b.linkedin = li[0];
    const gh = p.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w\-./]+/i); if (gh && !b.github) b.github = gh[0];
    const w = p.match(/(?:https?:\/\/)?(?:www\.)?[\w-]+\.(?:com|io|dev|me|design|net|org|ar)\b[\w\-/.]*/i);
    if (w && !/linkedin|github|@/.test(w[0]) && !b.web && !em) b.web = w[0];
    if (!b.location && !em && !ph && !li && !gh && p !== b.name && /[A-Za-zÀ-ÿ]/.test(p) && p.length < 60 && /,/.test(p)) b.location = p;
  });
  cv.summary = (secs.summary || []).join(' ');
  cv.experience = parseEntries(secs.experience || []);
  cv.leadership = parseEntries(secs.leadership || []);
  cv.education = parseEntries(secs.education || []).map(e => ({ school: e.org, location: e.location, degree: e.role, dates: e.dates, details: e.bullets.join('; ') }));
  cv.projects = parseEntries(secs.projects || []).map(e => ({ name: [e.org, e.role].filter(Boolean).join(' — '), link: '', dates: e.dates, bullets: e.bullets }));
  const sk = cv.skills; const tech = [];
  const pushSk = (lines2, field) => lines2.forEach(l => { const t = l.replace(BUL, '').trim(); if (!t) return; if (field) sk[field] += (sk[field] ? '\n' : '') + t; else tech.push(t); });
  (secs.skills || []).forEach(l => {
    const m = l.replace(BUL, '').match(/^([^:]{2,32}):\s*(.+)$/);
    if (m && /idiom|language/i.test(norm(m[1]))) sk.languages += (sk.languages ? '; ' : '') + m[2];
    else if (m && /interes/i.test(norm(m[1]))) sk.interests += (sk.interests ? '; ' : '') + m[2];
    else if (m && /certif|curso/i.test(norm(m[1]))) sk.certs += (sk.certs ? '; ' : '') + m[2];
    else tech.push(l.replace(BUL, '').trim());
  });
  sk.technical = tech.join('\n');
  pushSk(secs.languages || [], 'languages'); pushSk(secs.interests || [], 'interests'); pushSk(secs.certs || [], 'certs');
  cv.name = (fileName || b.name || 'CV').replace(/\.[a-z0-9]+$/i, '');
  // área automática
  const ex = extractKeywords(cvText(cv), '');
  cv.area = ex.area === 'General' ? 'IT' : ex.area;
  return cv;
}

/* ───────────── lectura de archivos ───────────── */
async function readPdf(buf) {
  if (typeof pdfjsLib === 'undefined') throw new Error('pdf.js no está disponible (¿sin conexión?). Pega el texto del CV en su lugar.');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise; let out = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await (await pdf.getPage(p)).getTextContent();
    const items = page.items.filter(i => i.str && i.str.trim()).map(i => ({ s: i.str, x: i.transform[4], y: i.transform[5], w: i.width }));
    items.sort((a, b) => (Math.abs(b.y - a.y) > 3 ? b.y - a.y : a.x - b.x));
    let line = '', py = null, px = 0;
    items.forEach(it => {
      if (py !== null && Math.abs(it.y - py) > 3) { out += line.trimEnd() + '\n'; line = ''; px = 0; }
      if (line && it.x - px > 24) line += '     '; else if (line && !/\s$/.test(line)) line += ' ';
      line += it.s; px = it.x + it.w; py = it.y;
    });
    out += line + '\n';
  }
  return out;
}
async function readDocx(buf) {
  if (typeof mammoth === 'undefined') throw new Error('mammoth no está disponible (¿sin conexión?). Pega el texto del CV en su lugar.');
  const { value } = await mammoth.convertToHtml({ arrayBuffer: buf });
  const d = new DOMParser().parseFromString(value, 'text/html');
  const tables = d.querySelectorAll('table').length;
  const lines = [];
  d.body.childNodes.forEach(n => {
    if (n.nodeName === 'UL' || n.nodeName === 'OL') n.querySelectorAll('li').forEach(li => lines.push('• ' + li.textContent.trim()));
    else if (n.textContent.trim()) lines.push(n.textContent.trim());
  });
  return { text: lines.join('\n'), tables };
}
async function importCvFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'json') {
    const o = JSON.parse(await file.text());
    const cv = Object.assign(blankCv(), o, { id: uid(), updatedAt: Date.now(), createdAt: Date.now() }); cv.fileName = file.name; return cv;
  }
  if (ext === 'pdf') return parseCvText(await readPdf(await file.arrayBuffer()), file.name, 'pdf');
  if (ext === 'docx') { const r = await readDocx(await file.arrayBuffer()); return parseCvText(r.text, file.name, 'docx', { tables: r.tables }); }
  if (['txt', 'md', 'text'].includes(ext)) return parseCvText(await file.text(), file.name, ext);
  const cv = parseCvText(await file.text(), file.name, ext); return cv;
}

/* ───────────── exportación de CV (Harvard) ───────────── */
function renderPaper(cv) {
  const b = cv.basics || {}, s = cv.skills || {};
  const contact = [b.location, b.email, b.phone, b.linkedin, b.github, b.web].filter(Boolean).map(esc).join(' · ');
  const li = bl => { const x = (bl || []).filter(t => t && t.trim()); return x.length ? `<ul>${x.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''; };
  const entry = e => `<div class="blk"><div class="row2"><b>${esc(e.org)}</b><span>${esc(e.location)}</span></div><div class="row2"><i>${esc(e.role)}</i><span>${esc(e.dates)}</span></div>${li(e.bullets)}</div>`;
  const edu = (cv.education || []).filter(e => e.school || e.degree).map(e => `<div class="blk"><div class="row2"><b>${esc(e.school)}</b><span>${esc(e.location)}</span></div><div class="row2"><i>${esc(e.degree)}</i><span>${esc(e.dates)}</span></div>${e.details ? `<p>${esc(e.details)}</p>` : ''}</div>`).join('');
  const exp = (cv.experience || []).filter(e => e.org || e.role || (e.bullets || []).some(Boolean)).map(entry).join('');
  const lead = (cv.leadership || []).filter(e => e.org || e.role || (e.bullets || []).some(Boolean)).map(entry).join('');
  const proj = (cv.projects || []).filter(p => p.name || (p.bullets || []).some(Boolean)).map(p => `<div class="blk"><div class="row2"><b>${esc(p.name)}${p.link ? ' · ' + esc(p.link) : ''}</b><span>${esc(p.dates)}</span></div>${li(p.bullets)}</div>`).join('');
  const lines = t => String(t || '').split('\n').filter(x => x.trim()).map(x => `<div>${esc(x)}</div>`).join('');
  const skl = [];
  if (s.technical) skl.push(`<div>${lines(s.technical)}</div>`);
  if (s.certs) skl.push(`<div><b>Certificaciones:</b> ${esc(s.certs)}</div>`);
  if (s.languages) skl.push(`<div><b>Idiomas:</b> ${esc(s.languages)}</div>`);
  if (s.interests) skl.push(`<div><b>Intereses:</b> ${esc(s.interests)}</div>`);
  return `<div class="paper"><h1>${esc(b.name || 'Nombre Apellido')}</h1><div class="contact">${contact || 'Ciudad · email · teléfono'}</div>` +
    (cv.summary ? `<h2>Resumen</h2><p>${esc(cv.summary)}</p>` : '') +
    (edu ? `<h2>Educación</h2>${edu}` : '') + (exp ? `<h2>Experiencia</h2>${exp}` : '') + (proj ? `<h2>Proyectos</h2>${proj}` : '') +
    (lead ? `<h2>Liderazgo y actividades</h2>${lead}` : '') + (skl.length ? `<h2>Habilidades e intereses</h2>${skl.join('')}` : '') + `</div>`;
}
function cvPlain(cv) {
  const b = cv.basics || {}, s = cv.skills || {}; const L = [];
  L.push((b.name || '').toUpperCase()); L.push([b.location, b.email, b.phone, b.linkedin, b.github, b.web].filter(Boolean).join(' | ')); L.push('');
  if (cv.summary) { L.push('RESUMEN', cv.summary, ''); }
  if ((cv.education || []).length) { L.push('EDUCACIÓN'); cv.education.forEach(e => { L.push(`${e.school}${e.location ? ', ' + e.location : ''}`, `${e.degree}${e.dates ? ' | ' + e.dates : ''}`); if (e.details) L.push(e.details); L.push(''); }); }
  const ent = (t, a) => { if ((a || []).length) { L.push(t); a.forEach(e => { L.push(`${e.org}${e.location ? ', ' + e.location : ''}`, `${e.role}${e.dates ? ' | ' + e.dates : ''}`); (e.bullets || []).filter(Boolean).forEach(x => L.push('- ' + x)); L.push(''); }); } };
  ent('EXPERIENCIA', cv.experience);
  if ((cv.projects || []).length) { L.push('PROYECTOS'); cv.projects.forEach(p => { L.push(`${p.name}${p.dates ? ' | ' + p.dates : ''}`); (p.bullets || []).filter(Boolean).forEach(x => L.push('- ' + x)); L.push(''); }); }
  ent('LIDERAZGO Y ACTIVIDADES', cv.leadership);
  L.push('HABILIDADES E INTERESES'); if (s.technical) L.push(s.technical); if (s.certs) L.push('Certificaciones: ' + s.certs); if (s.languages) L.push('Idiomas: ' + s.languages); if (s.interests) L.push('Intereses: ' + s.interests);
  return L.join('\n');
}
const PAPER_CSS = `body{margin:0;background:#fff}.paper{font-family:'Times New Roman',Times,serif;font-size:11pt;line-height:1.3;color:#111;max-width:8.27in;margin:0 auto;padding:.55in .7in}h1{font-size:20pt;text-align:center;margin:0 0 2pt}.contact{text-align:center;font-size:10pt;margin-bottom:8pt}h2{font-size:11pt;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #111;margin:10pt 0 4pt;padding-bottom:1pt}.row2{display:flex;justify-content:space-between}ul{margin:2pt 0 4pt 16pt;padding:0}li{margin:1pt 0}p{margin:2pt 0 4pt}.blk{margin-bottom:5pt}@page{size:A4;margin:0}`;
function exportCv(cv, fmt) {
  const base = slug(cv.name || 'cv') || 'cv';
  if (fmt === 'txt') return download(base + '.txt', cvPlain(cv));
  if (fmt === 'json') return download(base + '.json', JSON.stringify(cv, null, 2), 'application/json');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(cv.basics.name || cv.name)} - CV</title><style>${PAPER_CSS}</style></head><body>${renderPaper(cv)}</body></html>`;
  if (fmt === 'html') return download(base + '.html', html, 'text/html');
  if (fmt === 'doc') return download(base + '.doc', `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>${PAPER_CSS}</style></head><body>${renderPaper(cv)}</body></html>`, 'application/msword');
  if (fmt === 'pdf') {
    const w = window.open('', '_blank');
    if (!w) return toast('Ventana bloqueada', 'Permite ventanas emergentes para generar el PDF.', 'warn');
    w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
  }
}

/* ───────────── optimización de CV para una oferta ───────────── */
const baseName = n => String(n).replace(/\s·\soptimizado.*$/i, '');
function optimizeProposals(cv, offer) {
  const m = matchOffer(offer, cv), P = [];
  m.partial.filter(i => DICTMAP.has(i.k)).slice(0, 6).forEach(i => P.push({ id: 'p' + P.length, type: 'skill', k: i.k, on: true, label: `Añadir «${i.k}» a Habilidades`, detail: 'Ya tienes tecnologías de la misma familia; confirma que también la dominas.' }));
  m.missing.filter(i => i.cat !== 'term').slice(0, 10).forEach(i => P.push({ id: 'p' + P.length, type: 'skill', k: i.k, on: false, must: i.must, label: `Añadir «${i.k}» a Habilidades`, detail: i.must ? 'Requisito importante de la oferta. Marca solo si realmente lo has usado.' : 'Marca solo si realmente lo has usado.' }));
  P.push({ id: 'p' + P.length, type: 'reorder', on: true, label: 'Priorizar en Habilidades las tecnologías que pide la oferta', detail: 'Reordena cada línea para que las keywords de la oferta aparezcan primero.' });
  const weak = allBullets(cv).filter(b => WEAK_RE.test(b)).length;
  if (weak) P.push({ id: 'p' + P.length, type: 'verbs', on: true, label: `Reformular ${weak} viñeta(s) débil(es)`, detail: '“Responsable de…” → “Lideré…”, “Ayudé a…” → “Apoyé…”' });
  P.push({ id: 'p' + P.length, type: 'role', on: true, label: `Titular del CV orientado a «${offer.title}»`, detail: 'Añade el puesto objetivo bajo el nombre para reforzar la coincidencia de título.' });
  return P;
}
function reorderSkills(text, kws) {
  const ks = kws.map(k => norm(k.k));
  return String(text).split('\n').map(line => {
    const m = line.match(/^([^:]{2,30}:\s*)(.+)$/); const head = m ? m[1] : ''; const body = m ? m[2] : line;
    const items = body.split(/\s*,\s*/); if (items.length < 2) return line;
    const sc = it => (ks.some(k => norm(it).includes(k) || k.includes(norm(it))) ? 0 : 1);
    return head + items.map((it, i) => ({ it, i })).sort((a, b) => sc(a.it) - sc(b.it) || a.i - b.i).map(x => x.it).join(', ');
  }).join('\n');
}
function applyOptimization(cv, offer, chosen) {
  const n = deep(cv); n.id = uid(); n.optimized = true; n.parentId = cv.parentId || cv.id; n.targetOfferId = offer.id; n.useInApply = true; n.source = 'optimized';
  n.name = `${baseName(cv.name)} · optimizado ${offer.company}`; n.createdAt = n.updatedAt = Date.now();
  const adds = chosen.filter(p => p.type === 'skill').map(p => p.k);
  if (adds.length) n.skills.technical = (n.skills.technical ? n.skills.technical + '\n' : '') + 'Complementarias: ' + adds.join(', ');
  if (chosen.some(p => p.type === 'reorder')) n.skills.technical = reorderSkills(n.skills.technical, offer.keywords);
  if (chosen.some(p => p.type === 'verbs')) [n.experience, n.leadership, n.projects].forEach(arr => (arr || []).forEach(e => { e.bullets = (e.bullets || []).map(b => { let r = b; WEAK_MAP.forEach(([re, rep]) => { r = r.replace(re, rep); }); return r.charAt(0).toUpperCase() + r.slice(1); }); }));
  if (chosen.some(p => p.type === 'role')) n.targetRole = offer.title;
  return n;
}

/* ───────────── datos demo ───────────── */
const DEMO_COMPANIES = ['Nubelab', 'Kiwi Systems', 'Andes Digital', 'Pixelforge', 'Orbita Tech', 'Cobalto Software', 'Lumen Studio', 'Rioplata Labs', 'Fintrack', 'Mercado Norte', 'Vertice IT', 'Atlas Cloud', 'Brújula Apps', 'Tango Data', 'Sierra Design', 'Plataforma Sur', 'Quasar Dev', 'Montaña Pay', 'Delta Retail', 'Hexágono Digital'];
const DEMO_TPL = [
  { title: 'Backend Developer Node.js', area: 'IT', years: 2, req: ['Node.js', 'Express', 'PostgreSQL', 'Sequelize', 'REST API', 'Git', 'JWT'], nice: ['Docker', 'Redis', 'Jest', 'CI/CD', 'AWS'], resp: ['APIs REST escalables', 'modelos de datos y migraciones', 'autenticación y autorización'] },
  { title: 'Full Stack Developer (React + Node)', area: 'IT', years: 3, req: ['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'REST API', 'Git', 'HTML', 'CSS'], nice: ['TypeScript', 'Docker', 'AWS', 'Testing', 'Next.js'], resp: ['interfaces web responsive', 'servicios backend', 'pruebas automatizadas'] },
  { title: 'Frontend Developer React', area: 'IT', years: 2, req: ['React', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'Git', 'REST API'], nice: ['Redux', 'Jest', 'Figma', 'Accesibilidad', 'Tailwind'], resp: ['componentes reutilizables', 'rendimiento web', 'integración con APIs'] },
  { title: 'DevOps Engineer', area: 'IT', years: 4, req: ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Linux', 'Git'], nice: ['Prometheus', 'Grafana', 'Ansible', 'Python'], resp: ['pipelines de despliegue', 'infraestructura como código', 'monitoreo y observabilidad'] },
  { title: 'Data Engineer', area: 'IT', years: 3, req: ['Python', 'SQL', 'ETL', 'PostgreSQL', 'Spark', 'AWS'], nice: ['Kafka', 'Docker', 'Power BI', 'Pandas'], resp: ['pipelines de datos', 'modelado de datos', 'calidad de datos'] },
  { title: 'QA Automation Engineer', area: 'IT', years: 2, req: ['Cypress', 'Playwright', 'JavaScript', 'Testing', 'CI/CD', 'Postman'], nice: ['Jest', 'Jira', 'Scrum', 'Docker'], resp: ['suites de pruebas end-to-end', 'pruebas de API', 'reportes de calidad'] },
  { title: 'Backend Java Spring Boot', area: 'IT', years: 4, req: ['Java', 'Spring Boot', 'MySQL', 'Microservicios', 'REST API', 'Git'], nice: ['Kafka', 'Docker', 'Kubernetes', 'AWS'], resp: ['microservicios', 'integraciones', 'optimización de consultas'] },
  { title: 'Engineering Manager', area: 'IT', years: 7, req: ['Liderazgo', 'Scrum', 'Arquitectura de software', 'Stakeholders', 'Mentoring', 'AWS'], nice: ['Node.js', 'OKR', 'Gestión de proyectos'], resp: ['liderar equipos de ingeniería', 'definir roadmap técnico', 'mentoría y desarrollo del equipo'] },
  { title: 'UX/UI Designer', area: 'Diseño', years: 2, req: ['Figma', 'UX', 'UI', 'Wireframes', 'Prototipado', 'Design System', 'Accesibilidad'], nice: ['UX Research', 'Usabilidad', 'Design Thinking', 'Adobe XD'], resp: ['flujos y wireframes', 'prototipos de alta fidelidad', 'mantenimiento del sistema de diseño'] },
  { title: 'Product Designer', area: 'Diseño', years: 4, req: ['Figma', 'UX Research', 'Usabilidad', 'Prototipado', 'Design Thinking', 'A/B Testing'], nice: ['Design System', 'Stakeholders', 'Scrum', 'Customer Journey'], resp: ['descubrimiento de producto', 'pruebas con usuarios', 'colaboración con producto e ingeniería'] },
  { title: 'Diseñador Gráfico / Brand', area: 'Diseño', years: 3, req: ['Photoshop', 'Illustrator', 'Branding', 'Tipografía', 'Diseño gráfico'], nice: ['After Effects', 'InDesign', 'Motion Design', 'Canva'], resp: ['identidad visual', 'piezas para redes', 'guías de marca'] },
  { title: 'Design Lead', area: 'Diseño', years: 7, req: ['Liderazgo', 'Design System', 'Stakeholders', 'Mentoring', 'UX Research', 'Figma'], nice: ['Accesibilidad', 'OKR', 'Cross-functional'], resp: ['liderar el equipo de diseño', 'escalar el design system', 'alinear diseño con negocio'] }
];
function genOfferText(t, company, rnd, modality) {
  const pick = (a, n) => [...a].sort(() => rnd() - 0.5).slice(0, n);
  const req = t.req, nice = pick(t.nice, Math.min(t.nice.length, 3));
  const rep = req[0];
  return `${company} busca ${t.title} para sumarse a su equipo (${modality}).\n\nResponsabilidades:\n- Trabajar en ${t.resp[0]} usando ${req[0]} y ${req[1] || req[0]}.\n- Participar en ${t.resp[1]} y en ${t.resp[2]}.\n- Colaborar con equipos multidisciplinarios y comunicar avances a stakeholders.\n- Documentar y compartir buenas prácticas de ${rep}.\n\nRequisitos:\n- ${t.years}+ años de experiencia comprobable.\n- Experiencia sólida con ${req.join(', ')}.\n- Fuerte manejo de ${rep}; ${req[1] || rep} en proyectos reales.\n- Trabajo en equipo, comunicación efectiva y resolución de problemas.\n- Inglés intermedio.\n\nDeseable:\n- ${nice.join(', ')}.\n\nBeneficios:\n- Trabajo ${modality.toLowerCase()}, horario flexible, capacitaciones, obra social.`;
}
function seedDemo() {
  const rnd = mulberry32(2026);
  const mk = (name, area, role, b, edu, exp, lead, sk, extra = {}) => blankCv({ name, area, targetRole: role, source: 'demo', demo: true, meta: { ext: 'pdf', hasTables: false, multiColumn: false, noText: false, emoji: false }, basics: b, education: edu, experience: exp, leadership: lead, skills: sk, sectionOrder: ['education', 'experience', 'leadership', 'skills'], ...extra });
  const bB = { name: 'Candidato Demo', location: 'Buenos Aires, Argentina', email: 'demo@correo.com', phone: '+54 11 5555-0000', linkedin: 'linkedin.com/in/candidato-demo', github: 'github.com/candidato-demo', web: '' };
  const cv1 = mk('Backend Node.js', 'IT', '', bB,
    [{ school: 'Universidad Tecnológica Nacional', location: 'Buenos Aires, Argentina', degree: 'Tecnicatura Universitaria en Programación', dates: '2019 – 2022', details: '' }, { school: 'Bootcamp Full Stack', location: 'Remoto', degree: 'Programa intensivo en desarrollo web', dates: '2022', details: '' }],
    [{ org: 'Tech Studio', location: 'Remoto', role: 'Backend Developer', dates: 'Mar 2023 – Presente', bullets: ['Desarrollé una API REST con Node.js, Express y PostgreSQL para el módulo de pedidos', 'Responsable de mantener la base de datos y escribir consultas con Sequelize', 'Reduje 40 % el tiempo de respuesta de los endpoints principales al agregar índices y paginación en PostgreSQL', 'Implementé autenticación JWT y control de roles'] },
    { org: 'Freelance', location: 'Remoto', role: 'Desarrollador Web', dates: 'Ene 2021 – Feb 2023', bullets: ['Construí 8 sitios web para pymes con HTML, CSS y JavaScript', 'Ayudé a clientes con tareas de hosting y dominios'] }],
    [{ org: 'Comunidad de programación', location: 'Buenos Aires', role: 'Mentor voluntario', dates: '2022 – Presente', bullets: ['Mentoricé a 12 estudiantes en fundamentos de JavaScript y Git'] }],
    { technical: 'Lenguajes: JavaScript (ES Modules), SQL, HTML, CSS\nBackend: Node.js, Express, REST API, JWT\nBases de datos: PostgreSQL, Sequelize\nHerramientas: Git, GitHub, Postman, Render', languages: 'Español (nativo), Inglés (intermedio)', interests: 'Ciclismo, ajedrez, código abierto', certs: '' });
  const cv2 = mk('UX/UI Designer', 'Diseño', '', { ...bB, github: '', web: 'candidato-demo.design' },
    [{ school: 'Universidad de Buenos Aires', location: 'Buenos Aires, Argentina', degree: 'Licenciatura en Diseño Gráfico', dates: '2016 – 2021', details: '' }],
    [{ org: 'Estudio Creativo Sur', location: 'Buenos Aires', role: 'UX/UI Designer', dates: 'Abr 2022 – Presente', bullets: ['Diseñé el rediseño de una app de e-commerce en Figma, aumentando 18 % la conversión del checkout al simplificar el flujo de 5 a 3 pasos', 'Creé un design system con 40 componentes que redujo 30 % el tiempo de entrega de pantallas', 'Realicé 15 tests de usabilidad con usuarios y prioricé mejoras de accesibilidad WCAG', 'Colaboré con desarrolladores en la entrega de prototipos'] },
    { org: 'Agencia Pixel', location: 'Remoto', role: 'Diseñador Gráfico', dates: 'Mar 2020 – Mar 2022', bullets: ['Produje identidades visuales para 20 marcas con Photoshop e Illustrator', 'Participé en campañas de redes sociales'] }],
    [], { technical: 'Diseño: Figma, Adobe XD, Photoshop, Illustrator\nMetodologías: UX Research, Wireframes, Prototipado, Design Thinking, Design System\nOtros: Accesibilidad, Usabilidad, HTML, CSS', languages: 'Español (nativo), Inglés (avanzado)', interests: 'Fotografía, ilustración', certs: '' });
  const cv3 = deep(cv1); Object.assign(cv3, { id: uid(), name: 'Backend Node.js · optimizado Nubelab', optimized: true, parentId: cv1.id, source: 'demo', targetRole: 'Backend Developer Node.js' });
  cv3.experience[0].bullets = ['Desarrollé 14 endpoints REST con Node.js, Express y PostgreSQL para el módulo de pedidos, atendiendo 25 mil solicitudes diarias', 'Reduje 40 % el tiempo de respuesta (de 780 a 470 ms) al agregar índices y paginación en PostgreSQL con Sequelize', 'Implementé autenticación JWT y control de roles, cubriendo 100 % de las rutas sensibles', 'Automaticé despliegues en Render con GitHub Actions, reduciendo de 25 a 6 minutos cada release'];
  cv3.experience[1].bullets = ['Construí 8 sitios web para pymes con HTML, CSS y JavaScript, generando +30 % de consultas para los clientes', 'Gestioné hosting y dominios de 8 clientes sin incidentes de disponibilidad'];
  cv3.skills.technical = 'Lenguajes: JavaScript (ES Modules), SQL, HTML, CSS\nBackend: Node.js, Express, REST API, JWT\nBases de datos: PostgreSQL, Sequelize, Redis\nHerramientas: Git, GitHub, GitHub Actions, CI/CD, Docker, Jest, Postman, Render';
  [cv1, cv2, cv3].forEach(c => { c.createdAt = c.updatedAt = Date.now() - 20 * DAY; });
  S.cvs = [cv1, cv2, cv3];
  S.offers = []; MATCH_CACHE.clear(); IDF_CACHE = null;
  const N = 28;
  for (let i = 0; i < N; i++) {
    const FAV = [0, 0, 1, 1, 0, 2, 8, 8, 9, 9, 5, 6, 3, 10, 7, 11];
    const t = DEMO_TPL[rnd() < 0.78 ? FAV[Math.floor(rnd() * FAV.length)] : Math.floor(rnd() * DEMO_TPL.length)];
    const company = DEMO_COMPANIES[Math.floor(rnd() * DEMO_COMPANIES.length)];
    const modality = ['Remoto', 'Remoto', 'Híbrido', 'Presencial'][Math.floor(rnd() * 4)];
    const daysAgo = i < 4 ? rnd() * 1.2 : 1 + rnd() * 27;
    const o = makeOffer({ title: t.title, company, portal: PORTALS[Math.floor(rnd() * 8)], modality, location: modality === 'Remoto' ? 'Latam' : 'Buenos Aires, AR', applicants: Math.floor(Math.pow(rnd(), 2) * 150), hoursAgo: Math.round(daysAgo * 24 + 2), text: genOfferText(t, company, rnd, modality), createdAt: Date.now() - daysAgo * DAY, source: 'demo', url: '' });
    S.offers.push(o);
  }
  S.offers.forEach((o, i) => {
    const b = offerBest(o); o.cvId = b.id; const sc = b.score; const age = (Date.now() - o.createdAt) / DAY;
    if (i < 4) { o.status = 'en_espera'; return; }
    o.appliedAt = o.createdAt + (2 + rnd() * 18) * HOUR;
    const p = clamp((sc - 45) / 90, 0.03, 0.62);
    if (rnd() < p) { const r = rnd(); o.status = r < 0.12 ? 'oferta' : r < 0.62 ? 'entrevista' : 'rechazada'; }
    else o.status = age > 12 ? (rnd() < 0.25 ? 'rechazada' : 'sin_respuesta') : 'postulada';
    o.cover = '';
  });
  // envíos diarios (incluye envíos masivos fuera de las ofertas registradas)
  S.sends = {}; const hw = [0, 0, 0, 0, 0, 0, 1, 2, 6, 9, 10, 9, 6, 6, 8, 9, 8, 6, 4, 3, 2, 1, 1, 0];
  const hs = sum(hw);
  for (let d = 30; d >= 0; d--) {
    const dt = new Date(Date.now() - d * DAY), wd = dt.getDay();
    let total = wd === 0 || wd === 6 ? Math.round(15 + rnd() * 70) : Math.round(150 + rnd() * 150);
    if (d === 0) total = Math.round(60 + rnd() * 70);
    const hours = {}; let left = total;
    const maxH = d === 0 ? new Date().getHours() : 23;
    const ws = hw.map((w, h) => (h <= maxH ? w : 0)); const wsum = sum(ws) || 1;
    for (let h = 0; h <= maxH; h++) { const n = h === maxH ? left : Math.round(total * ws[h] / wsum); if (n > 0) { hours[h] = Math.min(n, left); left -= hours[h]; } }
    S.sends[dkey(dt)] = { total: total - Math.max(0, left), hours };
  }
  S.demo = true; touch();
}
function clearDemo() {
  S.cvs = S.cvs.filter(c => !c.demo && c.source !== 'demo');
  S.offers = S.offers.filter(o => o.source !== 'demo');
  if (S.demo) S.sends = {};
  S.demo = false; RADAR.results = []; touch();
}

/* ───────────── UI helpers ───────────── */
function toast(title, msg = '', type = 'info') {
  const box = $('#toasts'); if (!box) return;
  const t = document.createElement('div'); t.className = 'toast ' + type;
  t.innerHTML = `<div><b>${esc(title)}</b>${msg ? `<span>${esc(msg)}</span>` : ''}</div>`;
  box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, type === 'success' ? 4200 : 5200);
}
let modalOnClose = null;
function openModal(html, size = '') {
  const m = $('#modal'), box = $('#modalBox');
  box.className = 'modal-box ' + size; box.innerHTML = html; m.hidden = false; hydrateIcons(box);
  document.body.style.overflow = 'hidden'; return box;
}
function closeModal() {
  $('#modal').hidden = true; $('#modalBox').innerHTML = ''; document.body.style.overflow = '';
  if (modalOnClose) { const f = modalOnClose; modalOnClose = null; f(); }
}
const modalHead = (t, sub = '') => `<div class="m-h"><div style="flex:1"><h3>${esc(t)}</h3>${sub ? `<small class="muted">${esc(sub)}</small>` : ''}</div><button class="icon-btn" data-act="close-modal" aria-label="Cerrar">${ico('x')}</button></div>`;
function ringSvg({ pct, color, size = 170, stroke = 14, center = '', sub = '', fs = 34 }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - clamp(pct, 0, 1));
  return `<svg class="ring-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(center)} ${esc(sub)}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 ${size / 2} ${size / 2})"/><text x="50%" y="${sub ? '47%' : '53%'}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" font-weight="800">${esc(center)}</text>${sub ? `<text x="50%" y="66%" text-anchor="middle" font-size="12" style="fill:var(--text-3);font-family:var(--font)">${esc(sub)}</text>` : ''}</svg>`;
}
const scoreBar = s => `<span class="score" style="--w:${clamp(s, 0, 100)}%;--c:${bandColor(s)}"><i></i>${Math.round(s)}%</span>`;
const kwChip = (k, p, extra = '') => `<span class="kw ${p >= 0.6 ? 'ok' : p > 0 ? '' : 'miss'} cat-${k.cat} ${extra}" title="${esc(k.grp || '')} · importancia ${k.imp}">${esc(k.k)}${p > 0 && p < 0.6 ? ' <small>~</small>' : ''}${k.must ? ' <small>★</small>' : ''}</span>`;

/* ───────────── gráficos (Chart.js) ───────────── */
const CH = {};
function chartTheme() {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.color = css('--text-2'); Chart.defaults.borderColor = css('--grid');
  Chart.defaults.font.family = "'Inter',system-ui,sans-serif"; Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.labels.usePointStyle = true; Chart.defaults.plugins.legend.labels.boxWidth = 8;
  Chart.defaults.plugins.tooltip.backgroundColor = '#12152E'; Chart.defaults.plugins.tooltip.padding = 10; Chart.defaults.plugins.tooltip.cornerRadius = 10;
  Chart.defaults.maintainAspectRatio = false;
}
function mkChart(id, cfg) {
  const cv = document.getElementById(id); if (!cv) return null;
  if (CH[id]) { CH[id].destroy(); delete CH[id]; }
  if (typeof Chart === 'undefined') { cv.parentElement.innerHTML = '<div class="empty"><p>Chart.js no se pudo cargar (sin conexión). Los datos siguen disponibles en las tablas.</p></div>'; return null; }
  CH[id] = new Chart(cv, cfg); return CH[id];
}
const PAL = () => [css('--primary'), css('--teal'), css('--amber'), css('--rose'), css('--violet'), css('--sky'), css('--green')];
const lastDays = n => Array.from({ length: n }, (_, i) => new Date(Date.now() - (n - 1 - i) * DAY));
const sendsOn = d => (S.sends[dkey(d)] || {}).total || 0;
function addSends(n, when = Date.now()) {
  const k = dkey(when); const o = S.sends[k] = S.sends[k] || { total: 0, hours: {} };
  o.total += n; const h = new Date(when).getHours(); o.hours[h] = (o.hours[h] || 0) + n; persist();
}
function weekStart(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
function weekSends(d = new Date()) { const s = weekStart(d); return sum(Array.from({ length: 7 }, (_, i) => sendsOn(new Date(+s + i * DAY)))); }
function linreg(ys) {
  const n = ys.length; if (n < 2) return { m: 0, b: ys[0] || 0, r2: 0 };
  const xs = ys.map((_, i) => i), mx = avg(xs), my = avg(ys);
  const sxy = sum(xs.map((x, i) => (x - mx) * (ys[i] - my))), sxx = sum(xs.map(x => (x - mx) ** 2)), syy = sum(ys.map(y => (y - my) ** 2));
  const m = sxx ? sxy / sxx : 0; return { m, b: my - m * mx, r2: sxx && syy ? (sxy * sxy) / (sxx * syy) : 0 };
}
function pearson(x, y) {
  const n = x.length; if (n < 4) return null; const mx = avg(x), my = avg(y);
  const a = sum(x.map((v, i) => (v - mx) * (y[i] - my))), b = Math.sqrt(sum(x.map(v => (v - mx) ** 2)) * sum(y.map(v => (v - my) ** 2)));
  return b ? a / b : null;
}
