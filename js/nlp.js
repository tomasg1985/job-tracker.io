/* JobTrack · Motor de análisis de texto (sin dependencias)
   TF-IDF ligero · diccionario de habilidades con sinónimos · similitud coseno · puntaje ATS */
(function (g) {
  'use strict';
  const STOP = new Set(('a al algo ante con contra de del desde donde el ella ellos en entre es esta este esto estos fue ha han hay la las le les lo los mas me mi muy no nos o para pero por que se si sin sobre su sus te tu un una uno unos y ya como cuando tambien ser son tiene tener sera seran puede pueden cada todo toda todos todas otros otras bien asi aqui ademas mediante segun hasta the and or of to in for with on at by an as is are be this that from your our you we will have has can not it its their they who what which about into such more other than also etc ellas nuestro nuestra nuestros nuestras tus buscamos busca').split(/\s+/));
  const JOBWORDS = new Set(('empresa oferta puesto posicion vacante trabajo trabajar experiencia anos minimo ofrecemos beneficios requisitos requerimientos funciones responsabilidades candidato candidata persona conocimientos valorable deseable incorporacion jornada salario modalidad nivel area equipo parte nuestro forma tareas contar contamos importante proyectos proyecto clientes cliente desarrollo gran junto mejor manera sobre horario completo contrato indefinido salarial compania sector ubicacion buscar unirte unite sumate seras serás role job work team years experience required requirements skills ability knowledge strong good great join looking company position candidate ideal plus nice').split(/\s+/));

  /* k | alias,alias | tipo (h=técnica, t=herramienta, s=blanda, l=idioma, m=metodología, o=otro) | dominio (IT, DIS, HR, SOFT, ALL) */
  const RAW = `javascript|js,ecmascript,es6,es2015,es modules,esm|h|IT
typescript|ts|h|IT
node.js|nodejs,node|h|IT
express|express.js,expressjs|h|IT
nestjs|nest.js|h|IT
react|react.js,reactjs|h|IT
next.js|nextjs|h|IT
vue|vue.js,vuejs|h|IT
angular||h|IT
html|html5|h|IT
css|css3|h|IT
sass|scss|h|IT
tailwind|tailwindcss|h|IT
python||h|IT
django||h|IT
flask||h|IT
fastapi||h|IT
java||h|IT
spring boot|spring|h|IT
c#|csharp|h|IT
.net|dotnet,asp.net,.net core|h|IT
php||h|IT
laravel||h|IT
golang|go lang|h|IT
sql|t-sql,pl/sql|h|IT
postgresql|postgres,psql|h|IT
mysql|mariadb|h|IT
sqlite||h|IT
mongodb|mongo|h|IT
redis||h|IT
sequelize||h|IT
prisma||h|IT
orm|orms|h|IT
rest api|rest,restful,api rest,apis rest,api restful,apis restful,web services,servicios web,apis,api|h|IT
graphql||h|IT
websockets|websocket,socket.io|h|IT
microservicios|microservices,microservicio|h|IT
backend|back-end,back end|h|IT
frontend|front-end,front end|h|IT
full stack|fullstack,full-stack|h|IT
bases de datos|base de datos,databases,database,rdbms,relacional,relational|h|IT
docker|contenedores,containers|t|IT
kubernetes|k8s|t|IT
aws|amazon web services,ec2,s3,lambda|t|IT
azure||t|IT
gcp|google cloud|t|IT
render||t|IT
heroku||t|IT
vercel||t|IT
ci/cd|cicd,ci cd,github actions,gitlab ci,jenkins,integracion continua,continuous integration|t|IT
git|github,gitlab,bitbucket,control de versiones,version control|t|IT
linux|ubuntu,bash|t|IT
nginx||t|IT
terraform|iac|t|IT
devops|sre|h|IT
jwt|json web token,json web tokens|h|IT
oauth|oauth2,oauth 2.0,sso|h|IT
seguridad|security,owasp,ciberseguridad|h|IT
testing|jest,mocha,pruebas unitarias,unit testing,unit tests,tdd,pruebas automatizadas,supertest,cypress,playwright,qa|h|IT
swagger|openapi,postman|t|IT
arquitectura de software|software architecture,clean architecture,arquitectura hexagonal,ddd,domain-driven design,diseno de sistemas,system design|h|IT
patrones de diseno|design patterns,solid|h|IT
programacion orientada a objetos|oop,poo,object oriented|h|IT
rendimiento|performance,optimizacion,optimization,escalabilidad,scalability|h|IT
code review|revision de codigo,pull requests,pull request|h|IT
machine learning|ml,aprendizaje automatico,scikit-learn|h|IT
etl|pipelines de datos,data pipelines|h|IT
kafka|rabbitmq,mensajeria|h|IT
power bi|powerbi|t|ALL
tableau||t|ALL
excel|hojas de calculo,spreadsheets|t|ALL
analisis de datos|data analysis,analytics,analitica|h|ALL
figma|figjam|t|DIS
adobe xd|xd|t|DIS
sketch||t|DIS
photoshop|adobe photoshop|t|DIS
illustrator|adobe illustrator|t|DIS
after effects|premiere,motion graphics|t|DIS
canva||t|DIS
ux|user experience,experiencia de usuario|h|DIS
ui|user interface,interfaz de usuario,interfaces de usuario|h|DIS
ux/ui|ui/ux,ux ui,ui ux|h|DIS
diseno de producto|product design|h|DIS
design system|design systems,sistema de diseno,sistemas de diseno,atomic design,biblioteca de componentes,component library|h|DIS
prototipado|prototyping,prototipos,prototype,wireframes,wireframing,wireframe,mockups,mockup|h|DIS
investigacion de usuarios|user research,research,entrevistas a usuarios,user interviews,ux research|h|DIS
usabilidad|usability,pruebas de usabilidad,usability testing,heuristicas|h|DIS
accesibilidad|accessibility,wcag,a11y|h|DIS
branding|identidad visual,identidad de marca,brand identity|h|DIS
tipografia|typography|h|DIS
diseno responsive|responsive,responsive design,mobile first|h|DIS
design thinking||m|DIS
arquitectura de informacion|information architecture,user flows,flujos de usuario,journey map,journey maps,customer journey|h|DIS
diseno grafico|graphic design|h|DIS
motion design|animacion,animaciones,animation|h|DIS
a/b testing|ab testing,test a/b,pruebas a/b|h|DIS
portfolio|portafolio,behance,dribbble|o|DIS
reclutamiento|recruiting,recruitment,seleccion de personal,talent acquisition,adquisicion de talento,headhunting|h|HR
onboarding|induccion|h|HR
entrevistas|entrevista,interviews,screening|h|HR
gestion de proyectos|project management,pmp,gestion de proyecto|m|ALL
metodologias agiles|agil,agiles,scrum,kanban,agile,sprint,sprints|m|ALL
jira|confluence,trello|t|ALL
comunicacion|communication,comunicacion efectiva,habilidades de comunicacion|s|SOFT
trabajo en equipo|teamwork,colaboracion,collaboration,team player,equipos multidisciplinarios,cross-functional|s|SOFT
liderazgo|leadership,lider de equipo,team lead|s|SOFT
resolucion de problemas|problem solving,troubleshooting|s|SOFT
adaptabilidad|adaptability,flexibilidad|s|SOFT
proactividad|proactivo,proactiva,iniciativa,proactive|s|SOFT
pensamiento critico|critical thinking|s|SOFT
gestion del tiempo|time management,organizacion|s|SOFT
autonomia|autonomo,autonoma,self-starter|s|SOFT
orientacion a resultados|results-driven,orientado a resultados|s|SOFT
creatividad|creativity,creativo,creativa|s|SOFT
mentoring|mentoria,mentor|s|SOFT
negociacion|negotiation|s|SOFT
ingles|english,b2,c1,c2,ingles intermedio,ingles avanzado|l|ALL
portugues|portuguese|l|ALL
remoto|remote,teletrabajo,home office|o|ALL
hibrido|hybrid|o|ALL`;

  const esc = s => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[’]/g, "'").replace(/[^a-z0-9+#./\-'\s]/g, ' ');
  const SKILLS = RAW.split('\n').map(l => {
    const [k, a, t, d] = l.split('|');
    const al = [k, ...(a ? a.split(',') : [])].filter(Boolean).sort((x, y) => y.length - x.length);
    return { k, t, d, re: new RegExp('(?<![a-z0-9+#.])(?:' + al.map(esc).join('|') + ')(?![a-z0-9+#])', 'g') };
  });
  const SKILL_BY = Object.fromEntries(SKILLS.map(s => [s.k, s]));
  const countRe = (re, s) => { re.lastIndex = 0; const m = s.match(re); return m ? m.length : 0; };

  const tokens = s => norm(s).split(/[\s/]+/).map(w => w.replace(/^[.\-']+|[.\-']+$/g, '')).filter(w => w.length > 2 && !/^\d+$/.test(w));

  /* ---------- Extracción de palabras clave de la oferta ---------- */
  function lineWeights(text) {
    let mult = 1; const out = [];
    for (const raw of String(text || '').split(/\n/)) {
      const l = raw.trim(); if (!l) continue;
      const n = norm(l), short = n.length < 60;
      if (short && /^(requisitos|requerimientos|requirements|perfil|se requiere|imprescindible|must have|qualifications|what you.?ll need)/.test(n)) mult = 1.4;
      else if (short && /^(deseable|valorable|nice to have|plus|se valorara|preferred|bonus)/.test(n)) mult = 0.7;
      else if (short && /^(ofrecemos|beneficios|we offer|benefits|que ofrecemos|sobre nosotros|about us|acerca)/.test(n)) mult = 0.3;
      else if (short && /^(funciones|responsabilidades|responsibilities|tareas|que haras|what you.?ll do)/.test(n)) mult = 1.1;
      let m = mult;
      if (/deseable|valorable|nice to have|\bplus\b|se valora/.test(n)) m = Math.min(m, 0.7);
      if (/imprescindible|excluyente|obligatorio|required|must/.test(n)) m = Math.max(m, 1.5);
      out.push({ n, m });
    }
    return out;
  }

  function extractKeywords(text, limit = 32) {
    const lw = lineWeights(text), map = new Map(), gen = new Map();
    for (const { n, m } of lw) {
      let rest = n;
      for (const s of SKILLS) {
        const c = countRe(s.re, n);
        if (c) {
          const e = map.get(s.k) || { term: s.k, type: s.t, domain: s.d, count: 0, mult: 0, dict: true };
          e.count += c; e.mult = Math.max(e.mult, m); map.set(s.k, e);
          rest = rest.replace(s.re, ' ');
        }
      }
      const toks = rest.split(/[\s/]+/).map(w => w.replace(/^[.\-']+|[.\-']+$/g, '')).filter(Boolean);
      let prev = null;
      for (const w of toks) {
        const ok = w.length > 3 && !STOP.has(w) && !JOBWORDS.has(w) && !/\d/.test(w);
        if (ok) {
          const e = gen.get(w) || { term: w, type: 'o', domain: 'ALL', count: 0, mult: 0, dict: false };
          e.count++; e.mult = Math.max(e.mult, m); gen.set(w, e);
          if (prev) { const bg = prev + ' ' + w, b = gen.get(bg) || { term: bg, type: 'o', domain: 'ALL', count: 0, mult: 0, dict: false, bigram: true }; b.count++; b.mult = Math.max(b.mult, m); gen.set(bg, b); }
          prev = w;
        } else prev = null;
      }
    }
    const dictKw = [...map.values()].map(e => ({ ...e, w: +((2 + Math.min(e.count, 4) * 0.7) * e.mult).toFixed(2) }));
    const genKw = [...gen.values()].filter(e => e.count >= 2).map(e => ({ ...e, w: +((0.8 + 0.4 * Math.min(e.count, 4)) * e.mult * (e.bigram ? 1.1 : 1)).toFixed(2) }))
      .sort((a, b) => b.w - a.w);
    // quitar unigramas contenidos en bigramas elegidos
    const keepGen = []; const seen = new Set();
    for (const e of genKw) { if (keepGen.length >= 10) break; if (!e.bigram && [...seen].some(b => b.split(' ').includes(e.term))) continue; keepGen.push(e); seen.add(e.term); }
    return [...dictKw, ...keepGen].sort((a, b) => b.w - a.w).slice(0, limit)
      .map(({ term, type, domain, count, w, dict }) => ({ term, type, domain, count, w, dict }));
  }

  function minYears(text) {
    const m = norm(text).match(/(\d{1,2})\s*\+?\s*(?:anos|years)/); return m ? +m[1] : 0;
  }
  function detectArea(kws) {
    let it = 0, dis = 0, hr = 0;
    kws.forEach(k => { if (k.domain === 'IT') it += k.w; else if (k.domain === 'DIS') dis += k.w; else if (k.domain === 'HR') hr += k.w; });
    if (Math.max(it, dis, hr) < 2) return 'General';
    return it >= dis && it >= hr ? 'IT' : dis >= hr ? 'Diseño' : 'RRHH';
  }

  /* ---------- Comparación CV ↔ oferta ---------- */
  function matchCV(kws, cvText) {
    const n = norm(cvText), words = tokens(cvText).length || 1;
    let tot = 0, got = 0; const matched = [], missing = [], stuff = [];
    for (const k of kws) {
      let c = 0;
      if (k.dict) c = countRe(SKILL_BY[k.term].re, n);
      else { const parts = k.term.split(' ').map(p => p.slice(0, Math.max(5, p.length - 2))); c = parts.every(p => n.includes(p)) ? 1 : 0; }
      tot += k.w;
      if (c > 0) { got += k.w; matched.push({ ...k, cvCount: c }); if (c > 6 && words < 1200) stuff.push({ term: k.term, count: c }); }
      else missing.push(k);
    }
    return { coverage: tot ? Math.round(got / tot * 100) : 0, matched, missing, stuff, words };
  }

  function cosine(a, b) {
    const f = t => { const m = new Map(); tokens(t).filter(w => !STOP.has(w) && !JOBWORDS.has(w)).forEach(w => m.set(w, (m.get(w) || 0) + 1)); return m; };
    const A = f(a), B = f(b); let dot = 0, na = 0, nb = 0;
    A.forEach((v, k) => { na += v * v; if (B.has(k)) dot += v * B.get(k); }); B.forEach(v => nb += v * v);
    return na && nb ? Math.round(dot / Math.sqrt(na * nb) * 100) : 0;
  }

  /* ---------- Análisis de logros (fórmula XYZ de Google) ---------- */
  const VERBS = new Set(('lidere desarrolle disene implemente reduje aumente optimice automatice cree construi migre coordine gestione lance mejore escribi dirigi logre incremente analice configure despliegue integre redisene investigue presente capacite negocie genere produje cerre mantuve documente estructure modele deploye refactorice testee valide supervise planifique ejecute entregue acelere simplifique unifique estandarice monitoree publique redacte facilite impulse ahorre duplique triplique cuadruplique mentore entrene organice gane obtuve consegui resolvi automatizar desarrollar disenar implementar liderar optimizar crear construir reducir aumentar mejorar gestionar coordinar developed designed built led created implemented reduced increased improved managed launched optimized automated deployed migrated analyzed delivered achieved architected integrated mentored established generated streamlined resolved authored engineered launched drove spearheaded').split(/\s+/));
  const BY = /\b(mediante|usando|utilizando|a traves de|implementando|aplicando|con ayuda de|by|using|through|via|leveraging)\b/;
  const WEAK = /^(responsable de|encargado de|a cargo de|participe|ayude|colabore en|tareas de|funciones de|responsible for|helped|worked on|in charge of|duties)/;
  function bulletInfo(b) {
    const n = norm(b).trim(), first = n.split(/\s+/)[0] || '';
    const metric = /\d|%|\$|\bmillon|\bmil\b/.test(n);
    const verb = VERBS.has(first) && !WEAK.test(n);
    const by = BY.test(n);
    const words = n.split(/\s+/).filter(Boolean).length;
    const issues = [];
    if (WEAK.test(n) || !verb) issues.push('Empieza con un verbo de acción en pasado (Lideré, Diseñé, Reduje…).');
    if (!metric) issues.push('Falta una métrica (Y): %, tiempo, dinero, usuarios, volumen.');
    if (!by) issues.push('Explica cómo lo lograste (Z): “mediante…”, “usando…”.');
    if (words > 32) issues.push('Es largo: apunta a 1–2 líneas (menos de 30 palabras).');
    return { metric, verb, by, words, issues, ok: metric && verb && by };
  }
  function xyzScaffold(b) { return `Logré [X: resultado] medido por [Y: métrica] mediante [Z: acción/tecnología] — base: «${b.replace(/\.$/, '')}»`; }

  /* ---------- Modelo de CV (formato Harvard) ---------- */
  const emptyFields = () => ({
    personal: { name: '', title: '', email: '', phone: '', location: '', linkedin: '', links: '' },
    summary: '', education: [], experience: [], projects: [], leadership: [],
    skills: { technical: '', languages: '', interests: '' }, certs: ''
  });
  const entry = () => ({ org: '', role: '', loc: '', dates: '', bullets: [''] });
  const bulletsOf = f => ['experience', 'projects', 'leadership'].flatMap(s => (f[s] || []).flatMap(e => (e.bullets || []).filter(x => x.trim()).map(b => ({ b, where: (e.org || e.role || s) }))));

  function toText(cv) {
    const f = cv.fields, p = f.personal, L = [];
    L.push(p.name.toUpperCase());
    if (p.title) L.push(p.title);
    L.push([p.location, p.phone, p.email, p.linkedin, p.links].filter(Boolean).join(' | '));
    if (f.summary) L.push('', 'RESUMEN PROFESIONAL', f.summary);
    const sec = (t, arr, edu) => { if (!arr.length) return; L.push('', t); arr.forEach(e => { L.push([e.org, e.loc].filter(Boolean).join(', ')); L.push([e.role, e.dates].filter(Boolean).join(' | ')); (e.bullets || []).filter(x => x.trim()).forEach(b => L.push('• ' + b)); }); };
    sec('EDUCACIÓN', f.education); sec('EXPERIENCIA', f.experience); sec('PROYECTOS', f.projects); sec('LIDERAZGO Y ACTIVIDADES', f.leadership);
    const s = f.skills, sl = [];
    if (s.technical) sl.push('Técnicas: ' + s.technical); if (s.languages) sl.push('Idiomas: ' + s.languages); if (s.interests) sl.push('Intereses: ' + s.interests);
    if (f.certs) sl.push('Certificaciones: ' + f.certs);
    if (sl.length) L.push('', 'HABILIDADES E INTERESES', ...sl);
    return L.join('\n');
  }

  function analyzeCV(cv) {
    const f = cv.fields, p = f.personal, checks = [], sug = [];
    const chk = (max, ratio, label, tip) => { ratio = Math.max(0, Math.min(1, ratio)); checks.push({ label, tip, max, earned: Math.round(max * ratio), ok: ratio >= 0.7 }); if (ratio < 0.7 && tip) sug.push(tip); };
    chk(4, p.name ? 1 : 0, 'Nombre completo', 'Agrega tu nombre completo en la primera línea.');
    chk(4, /@/.test(p.email) ? 1 : 0, 'Email profesional', 'Incluye un email profesional y legible por ATS.');
    chk(3, p.phone.replace(/\D/g, '').length >= 8 ? 1 : 0, 'Teléfono', 'Agrega un teléfono con código de país.');
    chk(3, p.location ? 1 : 0, 'Ubicación', 'Indica ciudad y país (los ATS filtran por ubicación).');
    chk(4, /linkedin/i.test(p.linkedin + ' ' + p.links) ? 1 : 0, 'LinkedIn', 'Agrega la URL de tu perfil de LinkedIn.');
    chk(3, /github|behance|dribbble|portfolio|portafolio|figma|http|www\./i.test(p.links + ' ' + p.linkedin) ? 1 : 0, 'Portfolio / GitHub', 'Suma enlace a GitHub, portfolio o Behance según tu área.');
    const sw = f.summary.trim().split(/\s+/).filter(Boolean).length;
    chk(5, sw >= 25 && sw <= 70 ? 1 : sw ? 0.5 : 0, 'Resumen de 2–3 líneas', 'Escribe un resumen de 25–70 palabras con tu rol, años de experiencia y 2–3 logros clave.');
    chk(6, f.education.length ? 1 : 0, 'Sección Educación', 'Agrega Educación (en el modelo Harvard va primero).');
    const B = bulletsOf(f), info = B.map(x => bulletInfo(x.b));
    chk(10, Math.min(1, B.length / 6), `Experiencia con viñetas (${B.length})`, 'Usa al menos 3 viñetas por cargo reciente (6+ en total).');
    chk(5, f.skills.technical.trim() ? 1 : 0, 'Habilidades técnicas', 'Agrega una línea de habilidades con las palabras clave exactas de las ofertas.');
    chk(3, f.projects.length || f.certs.trim() || f.leadership.length ? 1 : 0, 'Proyectos / certificaciones / liderazgo', 'Añade proyectos, certificaciones o actividades de liderazgo.');
    const n = info.length || 1, mR = info.filter(i => i.metric).length / n, vR = info.filter(i => i.verb).length / n, bR = info.filter(i => i.by).length / n;
    chk(14, mR / 0.6, `Logros cuantificados (${info.filter(i => i.metric).length}/${info.length})`, 'Cuantifica al menos 6 de cada 10 viñetas: %, tiempo, dinero, usuarios, volumen.');
    chk(10, vR / 0.8, `Verbos de acción (${info.filter(i => i.verb).length}/${info.length})`, 'Empieza cada viñeta con un verbo de acción en pasado.');
    chk(6, bR / 0.5, `Fórmula XYZ completa (${info.filter(i => i.ok).length}/${info.length})`, 'Aplica la fórmula XYZ: logré X, medido por Y, mediante Z.');
    const avg = info.reduce((a, i) => a + i.words, 0) / n;
    chk(5, info.length ? (avg <= 28 ? 1 : avg <= 38 ? 0.5 : 0) : 0, 'Viñetas concisas', 'Acorta las viñetas a menos de 28 palabras.');
    const txt = toText(cv), fp = /\b(yo|mi|me|soy|i am|my)\b/i.test(f.summary + ' ' + B.map(x => x.b).join(' '));
    chk(5, fp ? 0 : 1, 'Sin pronombres personales', 'Elimina “yo”, “mi”, “soy”: el modelo Harvard usa frases sin sujeto.');
    const ext = (cv.format || 'txt').toLowerCase();
    chk(5, ['pdf', 'docx', 'txt', 'md'].includes(ext) ? 1 : 0, `Formato de archivo (.${ext})`, 'Usa PDF con texto seleccionable o DOCX de una sola columna, sin tablas ni gráficos.');
    const w = txt.split(/\s+/).filter(Boolean).length;
    chk(5, w >= 250 && w <= 750 ? 1 : w >= 150 && w <= 950 ? 0.5 : 0, `Longitud (${w} palabras)`, 'Apunta a una página (350–650 palabras).');
    const score = checks.reduce((a, c) => a + c.earned, 0);
    const weak = B.map((x, i) => ({ ...x, issues: info[i].issues })).filter(x => x.issues.length);
    const impact = Math.round((mR * 0.5 + vR * 0.3 + bR * 0.2) * 100);
    const ei = f.education.length ? 0 : 1, order = f.education.length && f.experience.length;
    return { score, checks, suggestions: sug, weak, impact, words: w, bullets: { total: info.length, metric: info.filter(i => i.metric).length, verb: info.filter(i => i.verb).length, by: info.filter(i => i.by).length, ok: info.filter(i => i.ok).length }, harvardOrder: !!order };
  }

  const bandOf = s => s >= 80 ? { id: 'ready', label: 'Listo para entrevista' } : s >= 60 ? { id: 'risk', label: 'Riesgo moderado' } : { id: 'fail', label: 'No pasa el filtro' };

  function scoreOffer(kws, cv, offerText) {
    const A = analyzeCV(cv), M = matchCV(kws, toText(cv));
    const pen = Math.min(15, M.stuff.length * 5);
    let final = Math.round(0.65 * M.coverage + 0.20 * A.score + 0.15 * A.impact - pen);
    final = Math.max(0, Math.min(100, final));
    return { final, band: bandOf(final), coverage: M.coverage, structure: A.score, impact: A.impact, stuffing: M.stuff.length > 0 || (final >= 98), stuff: M.stuff, matched: M.matched, missing: M.missing, cosine: offerText ? cosine(toText(cv), offerText) : 0, cvAnalysis: A };
  }

  /* ---------- Importar texto plano → campos del CV ---------- */
  const HEAD = [['education', /^(educacion|formacion|estudios|education|academic)/], ['experience', /^(experiencia|experience|work|employment|trayectoria|historial laboral)/], ['projects', /^(proyectos|projects)/], ['leadership', /^(liderazgo|leadership|voluntariado|actividades|activities|volunteer)/], ['skills', /^(habilidades|skills|competencias|tecnologias|conocimientos|idiomas|technical|herramientas)/], ['certs', /^(certificaciones|certifications|cursos|courses|licencias)/], ['summary', /^(resumen|perfil|summary|profile|objetivo|about|sobre mi)/]];
  const BUL = /^\s*[•\-*·▪●–◦]\s+/;
  const DATE = /((?:ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic|jan|apr|aug|dec)[a-z]*\.?\s+)?(19|20)\d{2}\s*[-–—a]\s*((?:(?:ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic|jan|apr|aug|dec)[a-z]*\.?\s+)?(19|20)\d{2}|actual|presente|present|current|hoy)/i;
  function headingOf(line) {
    const t = line.trim().replace(/[:\-–_*#]+$/g, '').replace(/^[#*\s]+/, ''), n = norm(t).trim();
    if (!n || n.length > 45 || BUL.test(line)) return null;
    const upper = t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(t), few = n.split(/\s+/).length <= 4;
    if (!(upper || /:\s*$/.test(line.trim()) || few)) return null;
    const h = HEAD.find(([, re]) => re.test(n)); return h ? h[0] : null;
  }
  function parseCVText(text) {
    const f = emptyFields(), lines = String(text || '').replace(/\r/g, '').split('\n');
    const nonEmpty = lines.filter(l => l.trim());
    f.personal.name = (nonEmpty[0] || '').trim().replace(/\b\w/g, c => c).slice(0, 80);
    const sections = { pre: [] }; let cur = 'pre';
    lines.forEach((l, i) => { if (i === lines.indexOf(nonEmpty[0])) return; const h = headingOf(l); if (h) { cur = h; sections[cur] = sections[cur] || []; } else (sections[cur] = sections[cur] || []).push(l); });
    const pre = (sections.pre || []).filter(l => l.trim()).join(' | '), all = pre + ' ' + (nonEmpty[1] || '');
    f.personal.email = (all.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [''])[0];
    f.personal.phone = (all.match(/\+?\d[\d\s().-]{7,}\d/) || [''])[0].trim();
    f.personal.linkedin = (all.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s|,]+/i) || [''])[0];
    f.personal.links = (all.match(/(?:https?:\/\/)?(?:www\.)?(?:github|behance|dribbble)\.[a-z]+\/[^\s|,]+/gi) || []).join(' | ');
    const chunks = pre.split(/\s*[|•·]\s*/).map(s => s.trim()).filter(s => s && !/@|linkedin|github|behance|dribbble|http/i.test(s) && !/\d{6,}/.test(s.replace(/\D/g, '') ? s : ''));
    f.personal.location = chunks.find(c => /,/.test(c) && c.length < 50) || '';
    f.personal.title = chunks.find(c => c !== f.personal.location && c.length < 60 && !/\d/.test(c)) || '';
    const entries = (arr) => {
      const out = []; let curE = null;
      (arr || []).forEach(l => {
        if (!l.trim()) return;
        if (BUL.test(l)) { if (!curE) { curE = { hdr: [], bullets: [] }; out.push(curE); } curE.bullets.push(l.replace(BUL, '').trim()); }
        else { if (!curE || curE.bullets.length) { curE = { hdr: [], bullets: [] }; out.push(curE); } curE.hdr.push(l.trim()); }
      });
      return out.map(e => {
        const hdr = e.hdr.join(' | '), dm = hdr.match(DATE), dates = dm ? dm[0] : '';
        const parts = e.hdr.map(x => x.replace(DATE, '').replace(/[|,\-–—\s]+$/g, '').trim()).filter(Boolean);
        const first = (parts[0] || '').split(/\s*\|\s*/);
        const en = entry(); en.org = first[0] || ''; en.loc = first[1] || ''; en.role = parts[1] || first[2] || ''; en.dates = dates;
        en.bullets = e.bullets.length ? e.bullets : ['']; return en;
      });
    };
    ['education', 'experience', 'projects', 'leadership'].forEach(k => {
      f[k] = entries(sections[k]);
      if (['experience', 'projects'].includes(k) && f[k].length && f[k].every(e => !e.bullets.some(Boolean)) && f[k].length > 3) f[k] = [Object.assign(entry(), { org: '', role: '', bullets: (sections[k] || []).filter(l => l.trim()).map(l => l.trim()) })];
    });
    (sections.skills || []).filter(l => l.trim()).forEach(l => {
      const m = l.replace(BUL, '').match(/^([^:]{2,30}):\s*(.+)$/), v = m ? m[2] : l.replace(BUL, ''), lab = m ? norm(m[1]) : '';
      const key = /idioma|language/.test(lab) ? 'languages' : /interes|hobb/.test(lab) ? 'interests' : 'technical';
      f.skills[key] = (f.skills[key] ? f.skills[key] + ', ' : '') + v.trim();
    });
    f.summary = (sections.summary || []).map(l => l.trim()).filter(Boolean).join(' ');
    f.certs = (sections.certs || []).map(l => l.replace(BUL, '').trim()).filter(Boolean).join('; ');
    return f;
  }

  function autoFix(cv) {
    const c = JSON.parse(JSON.stringify(cv)), f = c.fields, fixes = [];
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    ['experience', 'projects', 'leadership'].forEach(k => f[k].forEach(e => { e.bullets = e.bullets.map(b => { let x = b.trim().replace(/\s+/g, ' ').replace(/^(yo|mi)\s+/i, ''); x = cap(x); if (x && !/[.!?]$/.test(x)) x += '.'; if (x !== b) fixes.push('Viñeta normalizada'); return x; }).filter((b, i, a) => b || a.length === 1); }));
    ['technical', 'languages', 'interests'].forEach(k => { const seen = new Set(); const v = f.skills[k].split(/[,;]\s*/).map(s => s.trim()).filter(s => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase())).join(', '); if (v !== f.skills[k]) fixes.push('Habilidades sin duplicados'); f.skills[k] = v; });
    f.summary = f.summary.replace(/\b(yo soy|soy)\s+/i, '').trim(); if (f.summary) f.summary = cap(f.summary);
    c.optimized = true; c.optimizedAt = new Date().toISOString(); c.format = ['pdf', 'docx'].includes(c.format) ? c.format : 'docx';
    return { cv: c, fixes: [...new Set(fixes)] };
  }

  function yearsOfExperience(cv) {
    const now = new Date().getFullYear(); let tot = 0;
    (cv.fields.experience || []).forEach(e => {
      const m = String(e.dates).match(/((?:19|20)\d{2}).{1,12}?((?:19|20)\d{2}|actual|presente|present|current|hoy)/i);
      if (m) { const a = +m[1], b = /\d/.test(m[2]) ? +m[2] : now; tot += Math.max(0, b - a); }
    });
    return tot;
  }

  g.NLP = { norm, tokens, SKILLS, SKILL_BY, extractKeywords, detectArea, minYears, matchCV, cosine, bulletInfo, xyzScaffold, emptyFields, entry, toText, analyzeCV, scoreOffer, bandOf, parseCVText, autoFix, yearsOfExperience, bulletsOf };
  if (typeof module !== 'undefined') module.exports = g.NLP;
})(typeof window !== 'undefined' ? window : globalThis);
