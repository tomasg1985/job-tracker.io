/* ==========================================================================
   JobTrack · app.js
   1) Núcleo: utilidades, almacenamiento, diccionario de habilidades, NLP,
      análisis de CV, motor de match ATS
   2) Datos demo, gráficos y vistas
   3) Postulaciones (cola, auto-postulación, radar, consejos, optimizados)
   4) CVs (carga, editor, exportación), agentes IA, ajustes, arranque
   ========================================================================== */
'use strict';

/* ───────────── utilidades ───────────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sum = a => a.reduce((x, y) => x + y, 0);
const avg = a => (a.length ? sum(a) / a.length : 0);
const DAY = 864e5, HOUR = 36e5;
const pad = n => String(n).padStart(2, '0');
const dkey = (d = new Date()) => { d = new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fmtDate = ts => new Date(ts).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
const fmtDT = ts => new Date(ts).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const deep = o => JSON.parse(JSON.stringify(o));
const debounce = (f, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const pct = n => Math.round(n) + ' %';
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function agoTxt(ts) {
  const h = (Date.now() - ts) / HOUR;
  if (h < 1) return `hace ${Math.max(1, Math.round(h * 60))} min`;
  if (h < 24) return `hace ${Math.round(h)} h`;
  return `hace ${Math.round(h / 24)} d`;
}
function download(name, content, type = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: type + ';charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase();

/* ───────────── iconos ───────────── */
const IC = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  tag: '<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  file: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  moon: '<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  hourglass: '<path d="M6 2h12M6 22h12M7 2v4l5 6-5 6v4M17 2v4l-5 6 5 6v4"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12l6-6"/>',
  bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0012 2z"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5M4 21h16"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/>',
  play: '<path d="M6 4l14 8-14 8z"/>',
  pause: '<path d="M8 4v16M16 4v16"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  edit: '<path d="M4 20h4L20 8l-4-4L4 16z"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  down: '<path d="M12 5v14M5 12l7 7 7-7"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M17 5a3.5 3.5 0 010 7M22 20c0-2.8-1.7-4.8-4.5-5.6"/>',
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  pen: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
  brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'
};
function hydrateIcons(root = document) {
  $$('i[data-ic]', root).forEach(el => {
    if (el.dataset.done === el.dataset.ic) return;
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[el.dataset.ic] || ''}</svg>`;
    el.dataset.done = el.dataset.ic;
  });
}
const ico = (n, s = 16) => `<i data-ic="${n}" style="width:${s}px;height:${s}px"></i>`;

/* ───────────── almacenamiento ───────────── */
const KEY = 'jobtrack.v1';
const DEFAULTS = () => ({
  v: 1, cvs: [], offers: [], sends: {}, demo: false,
  goals: { dMin: 200, dMax: 300, wMin: 1000, wMax: 1500 },
  settings: {
    theme: 'light', llmKey: '', llmModel: 'claude-sonnet-5-5',
    auto: { min: 75, mode: 'best', fixed: '', cap: 50, delay: 0.6, maxApp: '', send: 'record', cover: true, skipStuff: true },
    radar: { hours: 72, app: 100, rel: 35, v: 2, portals: [], bk: { url: 'http://127.0.0.1:3002', query: '', loc: '' } }
  }
});
function loadState() {
  const D = DEFAULTS();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw);
      return { ...D, ...o, goals: { ...D.goals, ...(o.goals || {}) },
        settings: { ...D.settings, ...(o.settings || {}), auto: { ...D.settings.auto, ...((o.settings || {}).auto || {}) }, radar: { ...D.settings.radar, ...((o.settings || {}).radar || {}), bk: { ...D.settings.radar.bk, ...((((o.settings || {}).radar) || {}).bk || {}) } } } };
    }
  } catch (e) { /* ignore */ }
  return D;
}
let S = loadState();
const persist = debounce(() => {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('No se pudo guardar', 'El almacenamiento del navegador está lleno o bloqueado.', 'error'); }
}, 120);
let cacheV = 0;
const touch = () => { cacheV++; MATCH_CACHE.clear(); IDF_CACHE = null; persist(); };

/* ───────────── constantes de dominio ───────────── */
const PORTALS = ['LinkedIn', 'Indeed', 'Computrabajo', 'Bumeran', 'Glassdoor', 'GetOnBoard', 'Workana', 'Remotive', 'RemoteOK', 'Arbeitnow', 'WeWorkRemotely', 'Torre', 'Otro'];
const STATUS = {
  en_espera: { l: 'En espera', c: 'b-info' },
  procesando: { l: 'Procesando', c: 'b-prim' },
  postulada: { l: 'Postulada', c: 'b-prim' },
  sin_respuesta: { l: 'Sin respuesta', c: 'b-mute' },
  entrevista: { l: 'Entrevista', c: 'b-ok' },
  oferta: { l: 'Oferta', c: 'b-viol' },
  rechazada: { l: 'Rechazada', c: 'b-bad' },
  descartada: { l: 'Descartada', c: 'b-mute' }
};
const APPLIED = ['postulada', 'sin_respuesta', 'entrevista', 'oferta', 'rechazada'];
const RESPONDED = ['entrevista', 'oferta', 'rechazada'];
const POSITIVE = ['entrevista', 'oferta'];
const statusBadge = s => `<span class="badge ${(STATUS[s] || STATUS.en_espera).c}">${(STATUS[s] || { l: s }).l}</span>`;

/* ───────────── diccionario de habilidades (ES/EN) ───────────── */
// formato: 'Canónico|sinónimo|sinónimo~palabra-requerida'
const DICT_SRC = {
  'Lenguajes': { cat: 'skill', area: 'IT', items: ['JavaScript|js|ecmascript|es6|es modules|esm', 'TypeScript', 'Python', 'Java', 'Kotlin', 'Swift', 'C#|csharp', 'C++|cpp', 'PHP', 'Ruby', 'Golang', 'Rust', 'SQL', 'Bash|shell scripting', 'HTML|html5', 'CSS|css3'] },
  'Frontend': { cat: 'tool', area: 'IT', items: ['React|reactjs|react.js', 'Next.js|nextjs', 'Vue|vuejs|vue.js', 'Angular', 'Svelte', 'Redux', 'Tailwind|tailwindcss', 'Bootstrap', 'Sass|scss', 'Webpack', 'Vite', 'React Native', 'Flutter', 'Diseño responsive|responsive design|responsive'] },
  'Backend': { cat: 'tool', area: 'IT', items: ['Node.js|nodejs|node js|node', 'Express|express.js|expressjs|express~node', 'NestJS|nest.js', 'Django', 'Flask', 'FastAPI', 'Spring Boot|spring~java', 'Laravel', '.NET|dotnet|asp.net', 'Rails|ruby on rails', 'REST API|rest|restful|api rest|apis rest|api restful|apis restful', 'GraphQL', 'gRPC', 'WebSockets|websocket|socket.io', 'Microservicios|microservices|microservicio', 'JWT|json web token', 'OAuth|oauth2', 'Sequelize', 'Prisma', 'TypeORM', 'ORM'] },
  'Bases de datos': { cat: 'tool', area: 'IT', items: ['PostgreSQL|postgres|psql', 'MySQL|mariadb', 'SQL Server|mssql', 'MongoDB|mongo', 'Redis', 'Elasticsearch', 'NoSQL', 'Oracle', 'DynamoDB', 'Modelado de datos|data modeling|data modelling'] },
  'Cloud / DevOps': { cat: 'tool', area: 'IT', items: ['Docker', 'Kubernetes|k8s', 'AWS|amazon web services', 'Azure', 'GCP|google cloud', 'Render', 'Vercel', 'Heroku', 'Terraform', 'Ansible', 'CI/CD|cicd|ci cd|integracion continua|continuous integration', 'GitHub Actions', 'GitLab CI', 'Jenkins', 'Git', 'GitHub', 'Linux', 'Nginx', 'Kafka', 'RabbitMQ', 'DevOps', 'Serverless|lambda', 'Observabilidad|observability|monitoreo|monitoring', 'Prometheus', 'Grafana', 'Datadog', 'Firebase', 'Supabase', 'Cloudflare'] },
  'Testing': { cat: 'skill', area: 'IT', items: ['Testing|pruebas automatizadas|pruebas unitarias|unit testing|unit tests', 'Jest', 'Mocha', 'Cypress', 'Playwright', 'Selenium', 'TDD', 'QA|quality assurance|aseguramiento de calidad', 'Postman', 'Swagger|openapi'] },
  'Datos / IA': { cat: 'skill', area: 'IT', items: ['Machine Learning|ml|aprendizaje automatico', 'Data Science|ciencia de datos', 'Pandas', 'NumPy', 'ETL', 'Power BI', 'Tableau', 'Excel', 'Data Analysis|analisis de datos', 'Big Data', 'Spark', 'LLM|llms|large language models', 'IA generativa|generative ai|genai', 'Prompt Engineering'] },
  'Arquitectura': { cat: 'skill', area: 'IT', items: ['Arquitectura de software|software architecture|arquitectura de sistemas|system design', 'Clean Architecture|arquitectura limpia', 'Patrones de diseño|design patterns', 'SOLID', 'MVC', 'POO|oop|programacion orientada a objetos|object oriented', 'Escalabilidad|scalability|escalable', 'Alta disponibilidad|high availability', 'Seguridad|security|owasp|ciberseguridad', 'Rendimiento|performance|optimizacion de rendimiento'] },
  'Metodologías': { cat: 'skill', area: 'General', items: ['Scrum', 'Agile|agil|agiles|metodologias agiles', 'Kanban', 'Jira', 'Trello', 'Gestión de proyectos|project management|gestion de proyectos', 'Product Management|gestion de producto', 'OKR|okrs', 'Roadmap'] },
  'Diseño UX/UI': { cat: 'skill', area: 'Diseño', items: ['UX|user experience|experiencia de usuario', 'UI|user interface|interfaz de usuario|diseño de interfaces', 'UX Research|user research|investigacion de usuarios|investigacion ux', 'Wireframes|wireframing|wireframe', 'Prototipado|prototyping|prototype|prototipos|prototipo', 'Design System|design systems|sistema de diseño|sistemas de diseño', 'Design Tokens', 'Accesibilidad|accessibility|wcag|a11y', 'Usabilidad|usability', 'Testing de usabilidad|usability testing|pruebas de usabilidad', 'Design Thinking', 'Customer Journey|journey map|mapa de experiencia|user journey', 'Personas|user personas', 'Arquitectura de la información|information architecture', 'Interaction Design|diseño de interaccion', 'Product Design|diseño de producto', 'Visual Design|diseño visual', 'A/B Testing|ab testing|test a/b', 'Atomic Design', 'Material Design', 'Lean UX', 'Mobile First'] },
  'Herramientas de diseño': { cat: 'tool', area: 'Diseño', items: ['Figma', 'Adobe XD', 'Sketch', 'Photoshop', 'Illustrator', 'After Effects', 'Premiere', 'InDesign', 'Blender', 'Procreate', 'Canva', 'Framer', 'Webflow', 'Miro', 'Zeplin', 'Maze', 'Hotjar', 'Lottie'] },
  'Diseño gráfico': { cat: 'skill', area: 'Diseño', items: ['Branding|identidad visual|brand identity|identidad de marca', 'Tipografía|typography', 'Motion Design|motion graphics|animacion|animation', 'Diseño gráfico|graphic design', 'Ilustración|illustration', '3D', 'Storytelling', 'Portfolio|portafolio', 'Dirección de arte|art direction', 'Maquetación|layout'] },
  'Soft skills': { cat: 'soft', area: 'General', items: ['Liderazgo|leadership|liderar equipos|liderazgo de equipos', 'Comunicación|communication|comunicacion efectiva|communication skills', 'Trabajo en equipo|teamwork|colaboracion|collaboration|team player', 'Resolución de problemas|problem solving|problem-solving', 'Pensamiento crítico|critical thinking', 'Adaptabilidad|adaptability|flexibilidad', 'Gestión del tiempo|time management', 'Proactividad|proactive|proactivo', 'Mentoring|mentoria|mentoring de equipos|coaching', 'Stakeholders', 'Negociación|negotiation', 'Orientación a resultados|results oriented|results-driven', 'Creatividad|creativity|creativo', 'Autonomía|autonomy|autonomo', 'Presentaciones|presentations|public speaking|hablar en publico', 'Cross-functional|multidisciplinario|equipos multidisciplinarios|interdisciplinary'] },
  'Idiomas': { cat: 'lang', area: 'General', items: ['Inglés|english|ingles', 'Español|spanish|espanol', 'Portugués|portuguese|portugues', 'Francés|french|frances', 'Alemán|german|aleman'] }
};
const FAMILIES = [
  ['PostgreSQL', 'MySQL', 'SQL Server', 'Oracle', 'SQL'], ['MongoDB', 'NoSQL', 'DynamoDB'], ['AWS', 'Azure', 'GCP', 'Cloud'],
  ['React', 'Vue', 'Angular', 'Svelte', 'Next.js'], ['Jest', 'Mocha', 'Cypress', 'Playwright', 'Selenium', 'Testing'],
  ['Figma', 'Sketch', 'Adobe XD', 'Framer'], ['Sequelize', 'Prisma', 'TypeORM', 'ORM'], ['Express', 'NestJS', 'Node.js'],
  ['Docker', 'Kubernetes'], ['GitHub Actions', 'GitLab CI', 'Jenkins', 'CI/CD'], ['Scrum', 'Agile', 'Kanban'],
  ['UX', 'UI', 'Product Design', 'Interaction Design'], ['Photoshop', 'Illustrator', 'InDesign']
];
const GRP_OF = {};
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[‘’]/g, "'").replace(/[ ]/g, ' ');
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
const BND_L = '(?<![a-z0-9+#])', BND_R = '(?![a-z0-9+#])';
const DICT = [], DICTMAP = new Map();
(function compileDict() {
  Object.entries(DICT_SRC).forEach(([grp, g]) => {
    g.items.forEach(item => {
      const parts = item.split('|'); const canon = parts[0];
      const base = [], cond = [];
      parts.forEach(p => {
        const [term, need] = p.split('~');
        const t = reEsc(norm(term)).replace(/\s+/g, '\\s+');
        (need ? cond : base).push({ t, need });
      });
      const mk = list => (list.length ? new RegExp(BND_L + '(?:' + list.sort((a, b) => b.t.length - a.t.length).map(x => x.t).join('|') + ')' + BND_R, 'g') : null);
      const condMap = {}; cond.forEach(c => (condMap[c.need] = condMap[c.need] || []).push(c));
      const e = {
        k: canon, cat: g.cat, area: g.area, grp, re: mk(base),
        cond: Object.entries(condMap).map(([need, l]) => ({ need: new RegExp(BND_L + reEsc(need) + BND_R), re: mk(l) })),
        count(text) {
          let n = 0;
          if (this.re) n += (text.match(this.re) || []).length;
          this.cond.forEach(c => { if (c.need.test(text)) n += (text.match(c.re) || []).length; });
          return n;
        },
        test(text) { return this.count(text) > 0; }
      };
      DICT.push(e); DICTMAP.set(canon, e); GRP_OF[canon] = grp;
    });
  });
})();

/* ───────────── NLP: stopwords y extracción de palabras clave ───────────── */
const STOP = new Set(('a al algo algunas algunos ante antes como con contra cual cuando de del desde donde durante e el ella ellas ellos en entre era erais eran eras eres es esa esas ese eso esos esta estaba estado estais estamos estan estar este esto estos estoy fue fueron fui ha hace hacer hasta hay la las le les lo los mas me mi mis mucho muy nada ni no nos nosotros o os otra otro para pero poco por porque que quien se sea ser si sin sobre su sus tambien tanto te tener ti todo tu tus un una uno unos vosotros y ya yo ' +
  'the a an and are as at be been but by can do does for from had has have he her his how i if in into is it its may more most my no not of on one or our out over so such than that their them then there these they this to up us was we were what when where which who will with would you your ' +
  'experiencia empresa equipo trabajo anos ano años puesto oferta buscamos busca ofrecemos ofrece requisitos requerimientos candidato candidatos profesional profesionales persona personas parte nuestro nuestra nuestros nuestras tener tendras serás sera seras formar formaras importante importantes ademas asi tipo tipos nivel niveles area areas manera forma tareas funciones responsabilidades conocimientos conocimiento habilidad habilidades capacidad capaz ser estar trabajar trabajando desarrollo cada todas todos todas mismo misma sino aunque mientras tambien siempre mejor mejores nuevo nueva nuevos nuevas actual actuales sector clientes cliente proyecto proyectos productos producto servicio servicios solucion soluciones ' +
  'work team company role job position looking candidate candidates experience years year skills skill ability strong knowledge solid good great new use using used including etc must should also well within across help ensure build building').split(/\s+/));
const NICE_RE = /(deseable|nice to have|\bplus\b|valorable|se valora|bonus|preferred|diferencial|suma puntos|a plus)/;
const REQ_RE = /(requisitos|requerimientos|se requiere|requirements|must have|required|qualifications|what you.ll need|imprescindible|indispensable|excluyente|perfil buscado|buscamos)/;
const BEN_RE = /(beneficios|ofrecemos|we offer|benefits|perks|que ofrecemos|que te ofrecemos|salario|compensacion|why join|por que unirte)/;
const RESP_RE = /(responsabilidades|funciones|tareas|responsibilities|what you.ll do|tu rol|day to day|que haras)/;

function extractKeywords(text, title = '') {
  const lines = String(text).split(/\r?\n/);
  let secW = 1.0;
  const acc = new Map();
  const bump = (e, n, w) => { const a = acc.get(e.k) || { e, count: 0, wmax: 0 }; a.count += n; a.wmax = Math.max(a.wmax, w); acc.set(e.k, a); };
  const tl = norm(title);
  DICT.forEach(e => { const n = e.count(tl); if (n) bump(e, n, 1.6); });
  lines.forEach(raw => {
    const l = norm(raw).trim(); if (!l) return;
    const short = l.length < 70 && l.split(/\s+/).length <= 9;
    if (short && (/:\s*$/.test(l) || !/[,.;]/.test(l))) {
      if (BEN_RE.test(l)) { secW = 0.15; return; }
      if (NICE_RE.test(l)) { secW = 0.6; return; }
      if (REQ_RE.test(l)) { secW = 1.5; return; }
      if (RESP_RE.test(l)) { secW = 1.15; return; }
    }
    let w = secW;
    if (NICE_RE.test(l) && l.length < 120) w = Math.min(w, 0.65);
    else if (/(obligatorio|excluyente|indispensable|must|requerido|required)/.test(l)) w = Math.max(w, 1.4);
    DICT.forEach(e => { const n = e.count(l); if (n) bump(e, n, w); });
  });
  const dictHits = [...acc.values()].map(a => ({
    k: a.e.k, cat: a.e.cat, grp: a.e.grp, area: a.e.area, count: a.count, w: a.wmax * (1 + 0.5 * Math.log(a.count))
  })).filter(x => x.w >= 0.2);

  // términos genéricos (n-gramas) que no están en el diccionario
  const known = new Set(); dictHits.forEach(h => norm(h.k).split(/[^a-z0-9+#.]+/).forEach(t => t && known.add(t)));
  const uni = new Map(), bi = new Map();
  lines.forEach(raw => {
    const toks = norm(raw).split(/[^a-z0-9+#.]+/).map(t => t.replace(/^\.+|\.+$/g, '')).filter(Boolean);
    toks.forEach((t, i) => {
      const ok = t.length >= 4 && !STOP.has(t) && !/^\d+$/.test(t) && !known.has(t);
      if (ok) uni.set(t, (uni.get(t) || 0) + 1);
      const n = toks[i + 1];
      if (ok && n && n.length >= 4 && !STOP.has(n) && !/^\d+$/.test(n) && !known.has(n)) { const b = t + ' ' + n; bi.set(b, (bi.get(b) || 0) + 1); }
    });
  });
  const gen = [];
  bi.forEach((c, k) => { if (c >= 2) gen.push({ k, count: c, w: 0.7 + 0.25 * c, kind: 'bi' }); });
  const used = new Set(gen.flatMap(g => g.k.split(' ')));
  uni.forEach((c, k) => { if (c >= 3 && !used.has(k)) gen.push({ k, count: c, w: 0.5 + 0.2 * c, kind: 'uni' }); });
  gen.sort((a, b) => b.w - a.w);
  const generic = gen.slice(0, 8).map(g => ({ k: g.k, cat: 'term', grp: 'Términos', area: 'General', count: g.count, w: Math.min(g.w, 2.2) }));

  const all = dictHits.sort((a, b) => b.w - a.w).slice(0, 26).concat(generic);
  const maxW = Math.max(1, ...all.map(a => a.w));
  all.forEach(a => { a.imp = Math.round(100 * a.w / maxW); a.must = a.imp >= 62; });
  all.sort((a, b) => b.imp - a.imp);

  // área
  let it = 0, ds = 0;
  dictHits.forEach(h => { if (h.area === 'IT') it += h.w; else if (h.area === 'Diseño') ds += h.w; });
  if (/(dise[nñ]|design|ux|\bui\b|creativ)/.test(tl)) ds += 4;
  if (/(develop|desarroll|engineer|ingenier|devops|data|backend|frontend|full ?stack|programador|qa|software|sre|tech)/.test(tl)) it += 4;
  const area = it < 1.5 && ds < 1.5 ? 'General' : (ds > it ? 'Diseño' : 'IT');

  const nt = norm(text + ' ' + title);
  const ym = nt.match(/(\d{1,2})\s*\+?\s*(?:a|-|to)?\s*\d{0,2}\s*\+?\s*(?:anos|years|yrs)/);
  const years = ym ? parseInt(ym[1], 10) : null;
  const sm = nt.match(/\b(senior|sr|ssr|semi[ -]?senior|junior|jr|trainee|lead|principal|staff|manager|director|head of)\b/);
  return { keywords: all, area, years, seniority: sm ? sm[1] : null };
}

/* ───────────── TF-IDF / coseno ───────────── */
let IDF_CACHE = null;
const tokenize = t => norm(t).split(/[^a-z0-9+#.]+/).map(x => x.replace(/^\.+|\.+$/g, '')).filter(x => x.length >= 3 && !STOP.has(x) && !/^\d+$/.test(x));
function idfMap() {
  if (IDF_CACHE) return IDF_CACHE;
  const docs = [...S.cvs.map(cvText), ...S.offers.map(o => o.text)].map(t => new Set(tokenize(t)));
  const N = Math.max(1, docs.length), df = new Map();
  docs.forEach(d => d.forEach(t => df.set(t, (df.get(t) || 0) + 1)));
  IDF_CACHE = { N, df }; return IDF_CACHE;
}
function tfidfVec(text) {
  const { N, df } = idfMap(); const tf = new Map();
  tokenize(text).forEach(t => tf.set(t, (tf.get(t) || 0) + 1));
  const v = new Map(); let n2 = 0;
  tf.forEach((c, t) => { const w = (1 + Math.log(c)) * (1 + Math.log((N + 1) / ((df.get(t) || 0) + 1))); v.set(t, w); n2 += w * w; });
  return { v, n: Math.sqrt(n2) || 1 };
}
function cosine(a, b) { let d = 0; a.v.forEach((w, t) => { const x = b.v.get(t); if (x) d += w * x; }); return d / (a.n * b.n); }
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const m = []; for (let i = 0; i <= a.length; i++) m[i] = [i];
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
}

/* ───────────── modelo de CV, texto, análisis ───────────── */
const blankCv = (over = {}) => ({
  id: uid(), name: 'Nuevo CV', area: 'IT', targetRole: '', fileName: '', source: 'manual', createdAt: Date.now(), updatedAt: Date.now(),
  optimized: false, parentId: null, targetOfferId: null, useInApply: true, notes: '', parsedPoorly: false, raw: '',
  basics: { name: '', location: '', email: '', phone: '', linkedin: '', github: '', web: '' },
  summary: '', education: [], experience: [], leadership: [], projects: [],
  skills: { technical: '', languages: '', interests: '', certs: '' },
  meta: { ext: 'manual', hasTables: false, multiColumn: false, noText: false, emoji: false },
  ...over
});
const blankExp = () => ({ org: '', location: '', role: '', dates: '', bullets: [''] });
const blankEdu = () => ({ school: '', location: '', degree: '', dates: '', details: '' });
const blankProj = () => ({ name: '', link: '', dates: '', bullets: [''] });

function cvText(cv) {
  const b = cv.basics || {}, s = cv.skills || {};
  const parts = [b.name, b.location, cv.targetRole, cv.summary];
  (cv.education || []).forEach(e => parts.push(e.school, e.degree, e.details));
  (cv.experience || []).concat(cv.leadership || []).forEach(e => parts.push(e.org, e.role, (e.bullets || []).join('\n')));
  (cv.projects || []).forEach(p => parts.push(p.name, (p.bullets || []).join('\n')));
  parts.push(s.technical, s.languages, s.interests, s.certs);
  let t = parts.filter(Boolean).join('\n');
  if (t.split(/\s+/).length < 40 && cv.raw) t = cv.raw;
  return t;
}
const allBullets = cv => (cv.experience || []).concat(cv.leadership || [], (cv.projects || [])).flatMap(e => (e.bullets || []).map(b => b.trim()).filter(Boolean));

const ACTION = new Set(('lidere lideré desarrolle desarrollé implemente implementé diseñe diseñé disene diseñe cree creé construi construí optimice optimicé reduje aumente aumenté mejore mejoré automatice automaticé migre migré lance lancé gestione gestioné coordine coordiné dirigi dirigí escribi escribí analice analicé integre integré despliegue desplegué configure configuré mantuve negocie negocié capacite capacité entrene entrené redisene rediseñé presente presenté genere generé logre logré incremente incrementé acelere aceleré simplifique simplifiqué elimine eliminé estandarice estandaricé documente documenté colabore colaboré impulse impulsé establecí estableci defini definí fundé funde produje produje consegui conseguí resolvi resolví investigue investigué prototipe prototipé testee valide validé arquitecte arquitecté refactorice refactoricé ' +
  'led developed implemented designed created built optimized reduced increased improved automated migrated launched managed coordinated directed wrote analyzed integrated deployed configured maintained negotiated trained redesigned presented generated achieved accelerated simplified eliminated standardized documented collaborated drove established defined founded produced resolved researched prototyped tested validated architected refactored delivered shipped scaled owned spearheaded mentored streamlined cut boosted authored engineered orchestrated').split(/\s+/));
const WEAK_RE = /^(responsable de|encargad[oa] de|a cargo de|particip[eé] en|ayud[eé] a|trabaj[eé] en|colabor[eé] en tareas|funciones de|responsible for|worked on|helped|assisted|duties|tasked with|in charge of)/i;
const WEAK_MAP = [[/^responsable de /i, 'Lideré '], [/^encargad[oa] de /i, 'Gestioné '], [/^a cargo de /i, 'Gestioné '], [/^particip[eé] en /i, 'Contribuí a '], [/^ayud[eé] a /i, 'Apoyé '], [/^trabaj[eé] en /i, 'Desarrollé '], [/^responsible for /i, 'Led '], [/^worked on /i, 'Built '], [/^helped /i, 'Supported '], [/^assisted /i, 'Supported '], [/^in charge of /i, 'Managed ']];
const METRIC_RE = /(\d[\d.,]*\s*(%|x\b|k\b|m\b|ms\b|seg|usuarios|users|clientes|customers|horas|hours|d[ií]as|days|semanas|weeks|mil\b|millones|million|requests|req\b|ventas|sales|tickets|endpoints|servicios|services|equipos|people|personas)|[$€£]\s?\d|\b\d{2,}\b)/i;
const RESULT_RE = /(reduj|reduc|aument|mejor|increment|optimiz|acelera|disminu|elimin|ahorr|logr|gener|lanc|escal|improv|increas|cut|boost|decreas|sav|accelerat|achiev|launch|grew|grow|generat|drove)/i;
const IMPACT_RE = /(ahorr|tiempo|usuarios|users|clientes|customers|ingresos|revenue|ventas|sales|costos|costs|errores|errors|latencia|latency|conversi|retenci|satisfacci|cobertura|coverage|disponibilidad|uptime|rendimiento|performance|productividad|alcance|requests|peticiones|transacciones|entregas|hitos|cumplimiento)/i;
const METHOD_RE = /(\b(al|mediante|usando|utilizando|implementando|con|tras|migrando|automatizando|introduciendo|aplicando|a trav[eé]s de|gracias a)\b|\b(by|using|through|via|with|after|leveraging|implementing|introducing)\b)/i;
function bulletCheck(b) {
  const t = String(b || '').trim(); if (!t) return { empty: true };
  const first = t.split(/\s+/)[0].toLowerCase().replace(/[^a-záéíóúñ]/gi, '');
  const verb = ACTION.has(first) || ACTION.has(norm(first)) || /[éíó]$/.test(first) && first.length > 4 || /^[a-z]{4,}ed$/.test(first);
  const weak = WEAK_RE.test(t);
  const metric = METRIC_RE.test(t), words = t.split(/\s+/).length;
  /* XYZ tolerante: X = logro (verbo + objeto), Y = resultado cuantificado, Z = método/herramienta */
  const numY = metric || /\b\d+[\d.,]*\s+\p{L}{3,}/u.test(t) || /\b(de|from)\s+\d[\d.,]*\s*\p{L}*\s+(a|to)\s+\d/iu.test(t) || /\b(el doble|la mitad|triplic|duplic|cuadruplic|doubled|tripled|halved)/i.test(t);
  const outcome = RESULT_RE.test(t) || IMPACT_RE.test(t) || /\b(de|from)\s+\d[\d.,]*\s*\p{L}*\s+(a|to)\s+\d/iu.test(t);
  const tech = typeof extractKeywords === 'function' && (extractKeywords(t, '').keywords || []).some(k => k.cat === 'tool' || k.cat === 'lang');
  const method = METHOD_RE.test(t) || tech;
  const X = !weak && verb && words >= 5, Y = numY && (outcome || metric), Z = method && (tech || METHOD_RE.test(t));
  const xyz = !!(X && Y && Z);
  const xyzMiss = [!X && 'X', !Y && 'Y', !Z && 'Z'].filter(Boolean);
  return { verb: verb && !weak, weak, metric, xyz, xyzMiss, hasTech: tech, words, long: words > 32, short: words < 6, pronoun: /^(yo|i)\s/i.test(t) };
}
function yearsOf(dates) {
  const ys = (String(dates).match(/(?:19|20)\d{2}/g) || []).map(Number);
  const now = new Date().getFullYear();
  const cur = /(presente|actual|actualidad|present|current|hoy|now)/i.test(dates);
  if (!ys.length) return null;
  let a = Math.min(...ys), b = Math.max(...ys); if (cur) b = now; if (ys.length === 1 && !cur) b = a;
  return { a, b };
}
function totalYears(cv) {
  const iv = (cv.experience || []).map(e => yearsOf(e.dates)).filter(Boolean).sort((x, y) => x.a - y.a);
  if (!iv.length) return 0;
  let tot = 0, cs = iv[0].a, ce = iv[0].b;
  for (let i = 1; i < iv.length; i++) { if (iv[i].a <= ce) ce = Math.max(ce, iv[i].b); else { tot += ce - cs; cs = iv[i].a; ce = iv[i].b; } }
  return tot + (ce - cs);
}
const ANALYSIS_CACHE = new Map();
function analyzeCv(cv) {
  const ck = cv.id + '|' + cv.updatedAt;
  if (ANALYSIS_CACHE.has(ck)) return ANALYSIS_CACHE.get(ck);
  const issues = [], strengths = [];
  const add = (sev, tag, msg, fix) => issues.push({ sev, tag, msg, fix });
  const txt = cvText(cv), words = txt.split(/\s+/).filter(Boolean).length, m = cv.meta || {}, b = cv.basics || {};
  let fmt = 100;
  // --- Formato / legibilidad ATS
  if (m.noText) { fmt -= 55; add('high', 'ATS', 'El archivo parece no tener texto seleccionable (imagen escaneada).', 'Exporta el CV como PDF desde Word/Docs, no como imagen: los ATS solo leen texto.'); }
  if (m.hasTables) { fmt -= 20; add('high', 'ATS', 'Se detectaron tablas o separadores tipo “|”.', 'Reemplaza tablas por texto lineal con viñetas; los ATS desordenan el contenido de las tablas.'); }
  if (m.multiColumn) { fmt -= 15; add('high', 'ATS', 'Posible diseño a dos columnas.', 'Usa una sola columna (modelo Harvard): el orden de lectura es predecible para el ATS.'); }
  if (m.emoji) { fmt -= 8; add('med', 'ATS', 'Contiene íconos o emojis.', 'Elimina íconos, barras de nivel y gráficos; escribe el texto de forma plana.'); }
  if (!b.email) { fmt -= 10; add('high', 'Contacto', 'Falta un correo electrónico visible.', 'Añade email profesional en el encabezado.'); }
  if (!b.phone) { fmt -= 4; add('low', 'Contacto', 'Falta teléfono.', 'Incluye teléfono con prefijo internacional.'); }
  if (!b.linkedin && !b.github && !b.web) { fmt -= 4; add('low', 'Contacto', 'No hay enlaces a LinkedIn, GitHub o portafolio.', 'Agrega al menos un enlace profesional (portafolio/GitHub para IT y Diseño).'); }
  if (!(cv.experience || []).length) { fmt -= 14; add('high', 'Estructura', 'No se detectó la sección Experiencia.', 'Usa el encabezado estándar “Experiencia” / “Experience”.'); }
  if (!(cv.education || []).length) { fmt -= 8; add('med', 'Estructura', 'No se detectó la sección Educación.', 'Modelo Harvard: coloca Educación primero (institución, ubicación, título, fechas).'); }
  if (!/\S/.test(Object.values(cv.skills || {}).join(''))) { fmt -= 10; add('med', 'Estructura', 'No se detectó la sección Habilidades.', 'Añade “Habilidades e intereses” con herramientas y tecnologías en texto plano.'); }
  if (words < 180) { fmt -= 14; add('high', 'Contenido', `CV muy corto (${words} palabras).`, 'Amplía logros y herramientas; el objetivo es 1 página (≈ 450–700 palabras).'); }
  else if (words > 850) { fmt -= 12; add('med', 'Harvard', `CV demasiado largo (${words} palabras).`, 'El modelo Harvard recomienda 1 página (2 solo con +10 años). Recorta viñetas antiguas.'); }
  else strengths.push('Extensión adecuada (' + words + ' palabras).');
  if (cv.parsedPoorly) { fmt -= 8; add('med', 'Estructura', 'No pude separar claramente las secciones del archivo.', 'Revisa el editor: ordena Educación, Experiencia, Liderazgo y Habilidades.'); }
  if ((cv.education || []).length && (cv.experience || []).length && cv.sectionOrder && cv.sectionOrder.indexOf('education') > cv.sectionOrder.indexOf('experience')) add('low', 'Harvard', 'Educación aparece después de Experiencia.', 'En el modelo Harvard, Educación va primero (salvo que tu experiencia sea muy superior).');
  const ext = (m.ext || '').toLowerCase();
  if (ext && !['pdf', 'docx', 'txt', 'manual', 'json', 'md'].includes(ext)) { fmt -= 20; add('high', 'ATS', 'Formato de archivo poco legible por ATS.', 'Guarda como .docx o PDF con texto.'); }

  // --- Calidad de contenido
  const buls = allBullets(cv), chk = buls.map(bulletCheck);
  const n = Math.max(1, chk.length);
  const verbR = chk.filter(c => c.verb).length / n, metR = chk.filter(c => c.metric).length / n, xyzR = chk.filter(c => c.xyz).length / n;
  const weakN = chk.filter(c => c.weak).length, longN = chk.filter(c => c.long).length, shortN = chk.filter(c => c.short).length;
  let q = 20 + 30 * verbR + 28 * metR + 22 * xyzR;
  if (!chk.length) { q = 25; add('high', 'Contenido', 'No hay viñetas de logros.', 'Cada puesto debe tener 3–5 viñetas con verbo de acción + resultado medible.'); }
  else {
    if (verbR < 0.8) add('med', 'Contenido', `Solo el ${Math.round(verbR * 100)} % de las viñetas empieza con verbo de acción.`, 'Comienza cada viñeta con un verbo en pasado (Lideré, Implementé, Reduje…).');
    else strengths.push('Viñetas con verbos de acción.');
    if (metR < 0.5) add('high', 'Contenido', `Solo el ${Math.round(metR * 100)} % de las viñetas incluye métricas.`, 'Cuantifica: %, tiempo, usuarios, ingresos, volumen. Si no tienes cifras exactas, estima con rangos honestos.');
    else strengths.push('Logros cuantificados.');
    if (xyzR < 0.35) add('med', 'Fórmula XYZ', `Solo el ${Math.round(xyzR * 100)} % de las viñetas sigue la fórmula XYZ de Google.`, '“Logré [X], medido por [Y], al hacer [Z]”. Ej.: Reduje 45 % la latencia (820→450 ms) al introducir caché con Redis.');
    else strengths.push('Uso de la fórmula XYZ.');
    if (weakN) add('med', 'Contenido', `${weakN} viñeta(s) usan frases débiles (“responsable de…”, “ayudé a…”).`, 'Reemplázalas por verbos de impacto: Lideré, Gestioné, Construí.');
    if (longN) add('low', 'Contenido', `${longN} viñeta(s) superan las 32 palabras.`, 'Máximo 1–2 líneas por viñeta.');
    if (shortN > 1) add('low', 'Contenido', `${shortN} viñeta(s) son demasiado cortas.`, 'Agrega contexto y resultado.');
    if (chk.some(c => c.pronoun)) add('low', 'Contenido', 'Hay viñetas en primera persona (“Yo…”).', 'Elimina pronombres; empieza directamente con el verbo.');
    const perRole = chk.length / Math.max(1, (cv.experience || []).length);
    if ((cv.experience || []).length && perRole < 2) add('med', 'Contenido', 'Pocas viñetas por puesto (< 2).', 'Apunta a 3–5 viñetas en los últimos puestos.');
  }
  // huecos de fechas
  const ivs = (cv.experience || []).map(e => yearsOf(e.dates)).filter(Boolean).sort((x, y) => x.a - y.a);
  for (let i = 1; i < ivs.length; i++) if (ivs[i].a - ivs[i - 1].b > 1) { add('low', 'Contenido', `Posible hueco laboral entre ${ivs[i - 1].b} y ${ivs[i].a}.`, 'Explica el hueco (estudios, proyectos, freelance) con una línea.'); break; }
  if ((cv.experience || []).some(e => e.dates && !yearsOf(e.dates))) add('low', 'Formato', 'Hay fechas en un formato no estándar.', 'Usa “Mmm AAAA – Mmm AAAA” de forma consistente.');
  if (cv.summary && cv.summary.length > 450) add('low', 'Contenido', 'El resumen es muy largo.', 'Máximo 3 líneas; Harvard puede omitirlo.');
  q = clamp(Math.round(q), 0, 100); fmt = clamp(Math.round(fmt), 0, 100);
  const out = {
    format: fmt, quality: q, overall: Math.round(fmt * 0.5 + q * 0.5), issues: issues.sort((a, b) => ({ high: 0, med: 1, low: 2 }[a.sev] - { high: 0, med: 1, low: 2 }[b.sev])), strengths,
    stats: { words, bullets: chk.length, verbR, metR, xyzR, weakN, years: totalYears(cv) }
  };
  ANALYSIS_CACHE.set(ck, out); return out;
}

/* ───────────── motor de match CV ↔ oferta ───────────── */
const MATCH_CACHE = new Map();
const bandOf = s => (s >= 80 ? { id: 'ok', cls: 'b-ok', label: 'Listo para entrevista', desc: 'Estructura limpia y alto porcentaje de keywords exactas.' }
  : s >= 76 ? { id: 'hi', cls: 'b-info', label: 'Zona alta · afina detalles', desc: 'Cerca del umbral de entrevista: faltan pocas keywords.' }
    : s >= 60 ? { id: 'mid', cls: 'b-warn', label: 'Riesgo moderado', desc: 'El ATS lee el documento, pero faltan habilidades, sinónimos o detalles del puesto.' }
      : { id: 'low', cls: 'b-bad', label: 'No pasa el filtro', desc: 'Problemas de formato o falta crítica de alineación con la descripción.' });
const bandColor = s => (s >= 80 ? 'var(--green)' : s >= 76 ? 'var(--sky)' : s >= 60 ? 'var(--amber)' : 'var(--rose)');
function presence(kw, cvN, cvTokens) {
  const e = DICTMAP.get(kw.k);
  if (e) {
    if (e.test(cvN)) return 1;
    const fam = FAMILIES.find(f => f.includes(kw.k));
    if (fam && fam.some(o => o !== kw.k && DICTMAP.get(o) && DICTMAP.get(o).test(cvN))) return 0.35;
    return 0;
  }
  const nk = norm(kw.k);
  if (cvN.includes(nk)) return 1;
  const toks = nk.split(/\s+/);
  const hit = toks.filter(t => cvTokens.has(t) || [...cvTokens].some(c => c.length > 4 && t.length > 4 && lev(c, t) <= 1)).length;
  if (hit === toks.length) return 0.6;
  return toks.length > 1 && hit / toks.length >= 0.5 ? 0.3 : 0;
}
function matchOffer(offer, cv) {
  const key = `${offer.id}|${cv.id}|${cv.updatedAt}|${offer.keywords.length}`;
  if (MATCH_CACHE.has(key)) return MATCH_CACHE.get(key);
  const an = analyzeCv(cv), txt = cvText(cv), cvN = norm(txt), cvTokens = new Set(tokenize(txt));
  const items = offer.keywords.map(k => ({ ...k, p: presence(k, cvN, cvTokens) }));
  const totW = sum(items.map(i => i.w)) || 1;
  const coverage = sum(items.map(i => i.w * i.p)) / totW;
  const cos = clamp(cosine(tfidfVec(txt), tfidfVec(offer.text)) / 0.45, 0, 1);
  let score = 62 * coverage + 10 * cos + 0.14 * an.format + 0.14 * an.quality;
  const notes = [];
  const yrs = an.stats.years;
  if (offer.years && yrs < offer.years) { const pen = Math.min(8, (offer.years - yrs) * 2.5); score -= pen; notes.push(`La oferta pide ${offer.years}+ años y tu CV refleja ≈ ${yrs}.`); }
  const tt = norm(offer.title).split(/[^a-z0-9+#.]+/).filter(t => t.length > 3 && !STOP.has(t));
  if (tt.length && tt.some(t => cvN.includes(t))) score += 2;
  // keyword stuffing
  const total = Math.max(1, cvN.split(/\s+/).length);
  let maxRep = 0, repSum = 0;
  items.forEach(i => { if (i.p === 1) { const e = DICTMAP.get(i.k); const c = e ? e.count(cvN) : (cvN.split(norm(i.k)).length - 1); maxRep = Math.max(maxRep, c); repSum += c; } });
  const stuffing = (maxRep >= 9 || repSum / total > 0.14) && coverage > 0.85;
  if (stuffing) { score = Math.min(score, 92); notes.push('Posible saturación de palabras clave (keyword stuffing): se ve forzado para un reclutador humano.'); }
  if (score >= 98) notes.push('Una puntuación de 100 % no siempre es ideal: puede indicar saturación forzada de keywords.');
  score = clamp(Math.round(score), 0, 100);
  const res = {
    score, band: bandOf(score), coverage: Math.round(coverage * 100), cosine: Math.round(cos * 100), format: an.format, quality: an.quality,
    items, matched: items.filter(i => i.p >= 0.6), partial: items.filter(i => i.p > 0 && i.p < 0.6), missing: items.filter(i => i.p === 0),
    stuffing, notes
  };
  MATCH_CACHE.set(key, res); return res;
}
const eligibleCvs = () => S.cvs.filter(c => true);
function bestMatch(offer, cvs = S.cvs) {
  let best = null;
  cvs.forEach(cv => { const m = matchOffer(offer, cv); if (!best || m.score > best.m.score) best = { cv, m }; });
  return best;
}
const getCv = id => S.cvs.find(c => c.id === id);
const getOffer = id => S.offers.find(o => o.id === id);
function makeOffer(f) {
  const ex = extractKeywords(f.text, f.title);
  return {
    id: uid(), title: f.title, company: f.company, portal: f.portal || 'Otro', url: f.url || '', location: f.location || '', modality: f.modality || 'Remoto',
    applicants: f.applicants === '' || f.applicants == null ? null : Number(f.applicants),
    postedAt: f.hoursAgo !== '' && f.hoursAgo != null ? Date.now() - Number(f.hoursAgo) * HOUR : null,
    text: f.text, area: ex.area, keywords: ex.keywords, years: ex.years, seniority: ex.seniority,
    status: f.status || 'en_espera', createdAt: f.createdAt || Date.now(), appliedAt: f.appliedAt || null, cvId: null, cover: '', notes: '', source: f.source || 'manual'
  };
}
function offerBest(o) { const b = bestMatch(o); return b ? { id: b.cv.id, name: b.cv.name, score: b.m.score, m: b.m } : null; }
function offerScore(o) {
  if (o.cvId && getCv(o.cvId)) return matchOffer(o, getCv(o.cvId)).score;
  const b = offerBest(o); return b ? b.score : null;
}

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
function renderPaperFlow(cv) {
  const b = cv.basics || {}, s = cv.skills || {};
  const contact = [b.location && esc(b.location), b.email && `<a href="mailto:${esc(b.email)}">${esc(b.email)}</a>`, b.phone && esc(b.phone), ...cvLinks(cv).map(l => `<a href="${esc(l.url)}">${esc(l.label)}</a>`)].filter(Boolean).join(' · ');
  const li = bl => { const x = (bl || []).filter(t => t && t.trim()); return x.length ? `<ul>${x.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''; };
  const entry = e => `<div class="blk"><div class="row2"><b>${esc(e.org)}</b><span>${esc(e.location)}</span></div><div class="row2"><i>${esc(e.role)}</i><span>${esc(e.dates)}</span></div>${li(e.bullets)}</div>`;
  const edu = (cv.education || []).filter(e => e.school || e.degree).map(e => `<div class="blk"><div class="row2"><b>${esc(e.school)}</b><span>${esc(e.location)}</span></div><div class="row2"><i>${esc(e.degree)}</i><span>${esc(e.dates)}</span></div>${e.details ? `<p>${esc(e.details)}</p>` : ''}</div>`).join('');
  const exp = (cv.experience || []).filter(e => e.org || e.role || (e.bullets || []).some(Boolean)).map(entry).join('');
  const lead = (cv.leadership || []).filter(e => e.org || e.role || (e.bullets || []).some(Boolean)).map(entry).join('');
  const proj = (cv.projects || []).filter(p => p.name || (p.bullets || []).some(Boolean)).map(p => `<div class="blk"><div class="row2"><b>${esc(p.name)}${projLink(cv, p) ? ` · <a href="${esc(projLink(cv, p).url)}">${esc(projLink(cv, p).label)}</a>` : ''}</b><span>${esc(p.dates)}</span></div>${li(p.bullets)}</div>`).join('');
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
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(cv.basics.name || cv.name)} - CV</title><style>${PAPER_CSS}</style></head><body>${renderPaperFlow(cv)}</body></html>`;
  if (fmt === 'html') return download(base + '.html', html, 'text/html');
  if (fmt === 'doc') return download(base + '.doc', `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>${PAPER_CSS}</style></head><body>${renderPaperFlow(cv)}</body></html>`, 'application/msword');
  if (fmt === 'pdf') { try { return download(base + '.pdf', buildPdf(cv), 'application/pdf'); } catch (e) { console.error(e); toast('No se pudo generar el PDF', String(e.message || e), 'warn'); } }
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
      <div class="q-state">${done ? `<span class="badge b-ok">${ico('check', 14)} Registrada con éxito</span>` : proc ? `<span class="spinner"></span><span class="badge b-prim">En espera · procesando…</span>` : `<button class="btn btn-sm" data-act="open-offer" data-id="${o.id}">Detalle</button>${cv ? `<button class="btn btn-sm" data-act="pack-open" data-cv="${cv.id}" data-offer="${o.id}" title="Carta de presentación y email personalizados">Carta + email</button>` : ''}<button class="btn btn-sm" data-act="quick-ai" data-id="${o.id}" title="Mejorar el CV con IA para esta oferta y postular">${ico('spark', 14)}Mejorar con IA</button><button class="btn btn-sm btn-primary" data-act="process-one" data-id="${o.id}">${ico('send', 14)}Procesar</button>`}</div>
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
  toast('Postulación registrada', `${o.title} · ${o.company} — registrada con «${cv.name}». JobTrack no la envía a la empresa: finalízala en el portal o con el email del paquete.`, 'success');
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
const radarHoursTxt = v => +v >= 48 ? `${v} h (${(v / 24).toFixed(v % 24 ? 1 : 0)} d)` : v + ' h';
const radarAppTxt = v => +v >= 200 ? 'sin límite' : v;
function renderRadar() {
  const r = S.settings.radar; if (!r.portals.length) r.portals = RADAR_PORTALS.slice(0, 8);
  if (!r.v) { r.v = 2; r.hours = Math.max(r.hours, 72); r.app = Math.max(r.app, 100); r.rel = Math.min(r.rel, 35); persist(); } // filtros anteriores (24 h / 5 postulantes / 50 %) ocultaban casi todo
  $('#rfHours').value = r.hours; $('#rfHoursTxt').textContent = radarHoursTxt(r.hours); $('#rfApp').value = r.app; $('#rfAppTxt').textContent = radarAppTxt(r.app); $('#rfRel').value = r.rel; $('#rfRelTxt').textContent = r.rel + ' %';
  $('#rfPortals').innerHTML = RADAR_PORTALS.map(p => `<span class="chip toggle ${r.portals.includes(p) ? 'on' : ''}" data-act="radar-portal" data-p="${p}" role="button" tabindex="0">${p}</span>`).join('');
  const bk = r.bk || (r.bk = { url: 'http://127.0.0.1:3002', query: '', loc: '' }); $('#bkQuery').value = bk.query; $('#bkLoc').value = bk.loc; $('#bkUrl').value = bk.url;
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
const BK_MAP = { GetOnBoard: 'getonboard', RemoteOK: 'remoteok', WeWorkRemotely: 'weworkremotely', Remotive: 'remotive', Arbeitnow: 'arbeitnow', Computrabajo: 'computrabajo', LinkedIn: 'linkedin', Indeed: 'indeed' };
const BK_SAFE = ['getonboard', 'remoteok', 'weworkremotely', 'remotive', 'arbeitnow', 'computrabajo'];
async function radarBackend() {
  if (RADAR.scanning) return;
  const r = S.settings.radar, bk = r.bk; bk.query = $('#bkQuery').value.trim(); bk.loc = $('#bkLoc').value.trim(); bk.url = ($('#bkUrl').value.trim() || 'http://127.0.0.1:3002').replace(/\/+$/, '').replace(/\/\/localhost\b/i, '//127.0.0.1'); $('#bkUrl').value = bk.url; persist();
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(bk.url)) return toast('URL no permitida', 'El servidor debe estar en tu equipo (http://localhost:3002).', 'warn');
  if (bk.query.length < 2) return toast('Falta el puesto', 'Escribe el puesto o palabras clave a buscar.', 'warn');
  if (!S.cvs.length) toast('Sin CVs cargados', 'El radar calcula la relevancia contra tus CVs. Sube al menos uno.', 'warn');
  RADAR.scanning = true; RADAR.live = true; RADAR.added.clear(); // el servidor ya filtró por los portales elegidos
  $('#radarProg').hidden = false; const bar = $('#radarBar'), txt = $('#radarProgTxt'); bar.style.width = '10%'; txt.textContent = 'Conectando con el servidor local…';
  const fail = (t, m) => { RADAR.scanning = false; txt.textContent = m; toast(t, m, 'warn'); };
  try {
    const hc = new AbortController(), ht = setTimeout(() => hc.abort(), 4000);
    try { const h = await fetch(bk.url + '/api/health', { signal: hc.signal }); if (!h.ok) throw 0; } catch { clearTimeout(ht); return fail('Servidor no disponible', 'No responde en ' + bk.url + ' (¿otro programa usa ese puerto? prueba PORT=3002). En la carpeta server/ ejecuta: npm i && npx playwright install chromium && npm start'); } clearTimeout(ht);
    const sel = r.portals.map(p => BK_MAP[p]).filter(Boolean), portals = sel.length ? sel : BK_SAFE;
    txt.textContent = `Consultando ${portals.join(', ')}… las fuentes con API tardan segundos; LinkedIn/Indeed/Computrabajo usan navegador (1–3 min).`; bar.style.width = '40%';
    const ac = new AbortController(), at = setTimeout(() => ac.abort(), 600000);
    const res = await fetch(bk.url + '/api/scan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: bk.query, location: bk.loc, hours: r.hours, limit: 40, portals, detail: true }), signal: ac.signal }); clearTimeout(at);
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
function radarEmptyDiag() {
  const r = S.settings.radar, L = RADAR.results, n = f => L.filter(f).length;
  const rows = [['antigüedad (> ' + r.hours + ' h)', n(x => !(x.hoursAgo <= r.hours)), 'sube “Publicada hace”'], ['postulantes (> ' + radarAppTxt(r.app) + ')', n(x => !(x.applicants == null || r.app >= 200 || x.applicants <= r.app)), 'sube “Postulantes”'], ['relevancia (< ' + r.rel + ' %)', n(x => !(x.relevance >= r.rel)), 'baja “Relevancia mínima”'], ['portal desactivado', n(x => !(RADAR.live || r.portals.includes(x.portal))), 'activa el chip del portal']].filter(a => a[1]);
  return `<div class="empty" style="grid-column:1/-1"><p><b>${L.length} ofertas llegaron pero ningún filtro las deja pasar.</b></p>${rows.length ? '<p class="muted">Ocultas por: ' + rows.map(a => `${a[0]} → ${a[1]} (${a[2]})`).join(' · ') + '</p>' : ''}</div>`;
}
function radarFiltered() {
  const r = S.settings.radar;
  return RADAR.results.filter(x => x.hoursAgo <= r.hours && (x.applicants == null || r.app >= 200 || x.applicants <= r.app) && x.relevance >= r.rel && (RADAR.live || r.portals.includes(x.portal)));
}
function drawRadarResults() {
  const box = $('#radarResults'); if (!RADAR.results.length) { box.innerHTML = '<div class="empty" style="grid-column:1/-1"><i data-ic="radar"></i><p>Pulsa “Escanear portales” para buscar ofertas recientes con poca competencia.</p></div>'; hydrateIcons(box); return; }
  const list = radarFiltered();
  box.innerHTML = (list.length ? `<div style="grid-column:1/-1;display:flex;align-items:center;gap:12px"><b>${list.length} resultado${list.length === 1 ? '' : 's'}</b><span class="muted">ordenados por relevancia</span><div class="spacer"></div><button class="btn btn-sm btn-primary" data-act="radar-add-all">Agregar todas a la cola</button></div>` : radarEmptyDiag()) +
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
    toast('CV optimizado creado', `«${n.name}» ya está disponible para descargar y para tus postulaciones.`, 'success'); go('postulaciones', 'optimizados'); setTimeout(() => openPackage(n.id, o.id), 350);
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
  let tab = 'basics', edOffer = (orig.targetOfferId && getOffer(orig.targetOfferId)) ? orig.targetOfferId : ([...S.offers].sort((a, b) => b.createdAt - a.createdAt)[0] || {}).id || '';
  const F = (l, p, rows, ph = '') => { const v = getP(draft, p) ?? ''; return rows ? `<label>${l}<textarea data-p="${p}" rows="${rows}" spellcheck="true" lang="es" placeholder="${esc(ph)}">${esc(v)}</textarea></label>` : `<label>${l}<input data-p="${p}" value="${esc(v)}" spellcheck="true" lang="es" placeholder="${esc(ph)}"></label>`; };
  /* Habilidades técnicas: una fila por categoría (se guarda igual: “Categoría: a, b, c” por línea) */
  let skRows = null;
  const skParse = str => String(str || '').split('\n').filter(l => l.trim()).map(l => { const m = l.match(/^([^:]{2,32}):\s*(.*)$/); return m ? { c: m[1].trim(), v: m[2].trim() } : { c: '', v: l.trim() }; });
  const skSave = () => { draft.skills.technical = skRows.filter(r => r.c.trim() || r.v.trim()).map(r => (r.c.trim() ? r.c.trim() + ': ' : '') + r.v.trim()).join('\n'); };
  const skHtml = () => { if (!skRows) skRows = skParse(draft.skills.technical); if (!skRows.length) skRows = [{ c: '', v: '' }]; return `<div class="sk-box"><div class="an-h" style="margin:0">Habilidades técnicas</div><small class="muted">Una fila por categoría: nombre a la izquierda y las habilidades separadas por coma a la derecha.</small><div class="sk-list">${skRows.map((r, i) => `<div class="sk-row"><input data-sk="c" data-i="${i}" value="${esc(r.c)}" placeholder="Categoría (ej. Backend)" spellcheck="true" lang="es"><input data-sk="v" data-i="${i}" value="${esc(r.v)}" placeholder="Node.js, Express, REST API, JWT" spellcheck="false"><span class="btn-group"><button class="icon-btn" style="width:30px;height:30px" data-ed="sk-up" data-i="${i}" title="Subir">↑</button><button class="icon-btn" style="width:30px;height:30px" data-ed="sk-down" data-i="${i}" title="Bajar">↓</button><button class="icon-btn" style="width:30px;height:30px" data-ed="sk-del" data-i="${i}" title="Quitar categoría">${ico('x', 14)}</button></span></div>`).join('')}</div><button class="btn btn-sm" style="align-self:flex-start" data-ed="sk-add">${ico('plus', 14)}Agregar categoría</button></div>`; };
  const offKw = () => { const o = getOffer(edOffer); return o ? new Set(o.keywords.map(k => k.k)) : new Set(); };
  const hint = b => { if (!String(b).trim()) return ''; const c = bulletCheck(b); const kws = (extractKeywords(b, '').keywords || []).filter(k => k.cat !== 'term' && DICTMAP.has(k.k)).slice(0, 6), ok = offKw(); const tg = kws.map(k => `<span class="tag-chip ${ok.has(k.k) ? 'tg-ok' : 'tg-plain'}" title="${ok.has(k.k) ? 'La oferta seleccionada pide esta etiqueta' : 'Etiqueta detectada en la viñeta'}">${esc(k.k)}</span>`).join(''); const t = (ok, l) => `<span class="badge ${ok ? 'b-ok' : 'b-mute'}">${ok ? '✓' : '○'} ${l}</span>`; return t(c.verb, 'Verbo de acción') + t(c.metric, 'Métrica') + t(c.xyz, 'XYZ') + (c.weak ? '<span class="badge b-bad">Frase débil</span>' : '') + (c.long ? '<span class="badge b-warn">Muy larga</span>' : '') + (tg ? `<span class="tg-wrap">${tg}</span>` : ''); };
  const bullets = (list, i) => (draft[list][i].bullets || []).map((b, j) => `<div class="bullet-wrap"><div class="bullet-row"><textarea data-p="${list}.${i}.bullets.${j}" rows="3" spellcheck="true" lang="es" placeholder="Verbo de acción + resultado medible (fórmula XYZ)">${esc(b)}</textarea><div class="bm"><button class="btn btn-sm" data-ed="rw" data-list="${list}" data-i="${i}" data-j="${j}" title="Ver cómo reformular esta viñeta con la fórmula XYZ">✎ XYZ</button><button class="icon-btn" style="width:30px;height:30px" data-ed="delb" data-list="${list}" data-i="${i}" data-j="${j}" title="Quitar viñeta">${ico('x', 14)}</button></div></div><div class="bullet-hint">${hint(b)}</div><div class="bullet-sug" data-list="${list}" data-i="${i}" data-j="${j}"></div><div class="rw-slot"></div></div>`).join('') + `<button class="btn btn-sm" style="align-self:flex-start" data-ed="addb" data-list="${list}" data-i="${i}">${ico('plus', 14)}Viñeta</button>`;
  const dateBtn = `<button class="btn btn-sm" style="align-self:flex-start" data-ed="norm-dates" title="Convierte 03/2023 - actual en Mar 2023 – Presente">Normalizar fechas (Mmm AAAA – Presente)</button>`;
  const ctrl = (list, i) => `<span class="btn-group"><button class="btn btn-sm" data-ed="up" data-list="${list}" data-i="${i}" title="Subir">↑</button><button class="btn btn-sm" data-ed="down" data-list="${list}" data-i="${i}" title="Bajar">↓</button><button class="btn btn-sm btn-danger" data-ed="del" data-list="${list}" data-i="${i}">${ico('trash', 14)}</button></span>`;
  const entries = (list, lab, orgL, roleL) => draft[list].map((e, i) => `<div class="ed-item"><div class="ed-item-h"><span>${lab} ${i + 1}</span>${ctrl(list, i)}</div><div class="row">${F(orgL, `${list}.${i}.org`)}${F('Ubicación', `${list}.${i}.location`)}</div><div class="row">${F(roleL, `${list}.${i}.role`)}${F('Fechas (Mmm AAAA – Mmm AAAA)', `${list}.${i}.dates`)}</div><div class="an-h" style="margin:4px 0 0">Viñetas de logros</div>${bullets(list, i)}</div>`).join('') + `<button class="btn" style="align-self:flex-start" data-ed="add" data-list="${list}">${ico('plus', 14)}Agregar ${lab.toLowerCase()}</button>`;
  const panes = {
    basics: () => `<div class="row">${F('Nombre completo', 'basics.name')}${F('Ciudad, País', 'basics.location')}</div><div class="row">${F('Email', 'basics.email')}${F('Teléfono', 'basics.phone')}</div><div class="row">${F('LinkedIn', 'basics.linkedin')}${F('GitHub', 'basics.github')}</div>${F('Portafolio / Web', 'basics.web')}${F('Resumen (opcional, máx. 3 líneas — Harvard puede omitirlo)', 'summary', 5)}${F('Puesto objetivo (aparece en el análisis, no en el CV)', 'targetRole')}`,
    education: () => dateBtn + draft.education.map((e, i) => `<div class="ed-item"><div class="ed-item-h"><span>Educación ${i + 1}</span>${ctrl('education', i)}</div><div class="row">${F('Institución', `education.${i}.school`)}${F('Ubicación', `education.${i}.location`)}</div><div class="row">${F('Título / programa', `education.${i}.degree`)}${F('Fechas', `education.${i}.dates`)}</div>${F('Detalles (promedio, honores, cursos relevantes)', `education.${i}.details`, 2)}</div>`).join('') + `<button class="btn" style="align-self:flex-start" data-ed="add" data-list="education">${ico('plus', 14)}Agregar educación</button>`,
    experience: () => dateBtn + entries('experience', 'Experiencia', 'Organización', 'Puesto'),
    leadership: () => dateBtn + entries('leadership', 'Actividad', 'Organización', 'Rol'),
    projects: () => draft.projects.map((p, i) => `<div class="ed-item"><div class="ed-item-h"><span>Proyecto ${i + 1}</span>${ctrl('projects', i)}</div><div class="row">${F('Nombre', `projects.${i}.name`)}${F('Enlace', `projects.${i}.link`)}</div>${F('Fechas', `projects.${i}.dates`)}<div class="an-h" style="margin:4px 0 0">Viñetas</div>${bullets('projects', i)}</div>`).join('') + `<button class="btn" style="align-self:flex-start" data-ed="add" data-list="projects">${ico('plus', 14)}Agregar proyecto</button>`,
    skills: () => `${skHtml()}${F('Certificaciones y cursos', 'skills.certs', 4)}${F('Idiomas', 'skills.languages')}${F('Intereses', 'skills.interests')}`,
    review: () => `<div class="note" style="margin-bottom:10px"><i data-ic="info"></i><span>Detecta tildes, errores frecuentes, palabras repetidas, verbos débiles, frases vagas y tiempos verbales mezclados. Pulsa «Corregir» en cada aviso.</span></div><div id="pfList">${proofHtml(proofread(draft))}</div>`,
    tags: () => { const offs = [...S.offers].sort((a, b) => b.createdAt - a.createdAt); if (!offs.length) return '<div class="empty"><p>Carga una oferta en Postulaciones para ver qué etiquetas (palabras clave) están o faltan en este CV.</p></div>'; return `<label>Oferta de referencia<select id="edOfferSel">${offs.map(o => `<option value="${o.id}" ${o.id === edOffer ? 'selected' : ''}>${esc(o.title)} — ${esc(o.company)}</option>`).join('')}</select></label>${getOffer(edOffer) ? tagsHtml(draft, getOffer(edOffer), totalYears(draft) < 2) : ''}`; },
    config: () => `${F('Nombre interno del CV', 'name')}<div class="row"><label>Área<select data-p="area">${['IT', 'Diseño', 'General'].map(a => `<option ${draft.area === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label><label>Enlaces en el CV<select data-p="linkStyle">${[['label', 'Etiqueta (LinkedIn, GitHub, Portafolio) con enlace activo'], ['short', 'Dirección corta (linkedin.com/in/usuario)'], ['full', 'Dirección completa']].map(([v, l]) => `<option value="${v}" ${(draft.linkStyle || 'label') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label class="check" style="padding-top:22px"><input type="checkbox" data-p="useInApply" ${draft.useInApply ? 'checked' : ''}><span>Usar en postulaciones</span></label></div>${F('Notas', 'notes', 3)}`
  };
  const TABS = [['basics', 'Datos personales'], ['education', 'Educación'], ['experience', 'Experiencia'], ['leadership', 'Liderazgo'], ['projects', 'Proyectos'], ['skills', 'Habilidades'], ['review', 'Redacción'], ['tags', 'Etiquetas'], ['config', 'Ajustes']];
  const box = openModal(`${modalHead(isNew ? 'Nuevo CV (plantilla Harvard)' : 'Editar CV', 'Cada campo es editable · vista previa y puntaje en vivo')}<div class="m-b"><div class="editor"><div><div class="ed-tabs" id="edTabs"></div><div id="edBody"></div></div><div class="live-score"><div id="edScore"></div><div class="paper-wrap"><div id="edPaper"></div></div></div></div></div>
  <div class="m-f"><button class="btn" data-act="close-modal">Cancelar</button><div class="spacer"></div><button class="btn" id="edPdf">${ico('download')}PDF</button><button class="btn" id="edSaveNew">${ico('copy')}Guardar como nueva versión</button><button class="btn btn-primary" id="edSave">${ico('check')}Guardar cambios</button></div>`);
  const AUD = { basics: 'header', education: 'education', experience: 'experience', leadership: 'leadership', projects: 'projects', skills: 'skills', config: 'format' };
  let fxLog = null, fxSnap = null;
  const edPanel = a => {
    const bad = a.checks.filter(c => !c.ok), ok = a.checks.filter(c => c.ok);
    const items = bad.slice(0, 6).map((c, k) => { const ex = exFor(c.msg); return `<div class="ed-fix"><div class="ed-fix-t"><span class="n">${k + 1}</span><b>${esc(c.msg)}</b></div><p>${esc(c.fix)}</p><div class="ed-fix-a">${c.act ? `<button class="btn btn-sm btn-primary" data-ed="${c.act}">${esc(c.actLabel || 'Corregir')}</button>` : ''}${c.go ? `<button class="btn btn-sm" data-ed="goto" data-p="${esc(c.go)}">Ir al campo</button>` : ''}</div>${ex ? `<details class="ed-ex"><summary>Ver ejemplo</summary>${exHtml(ex)}</details>` : ''}</div>`; }).join('');
    return `<div class="ed-autofix"><div><b>⚡ Autocorrección ATS</b><small>Aplica los arreglos seguros a todo el CV (contacto, fechas, enlaces, orden, habilidades, redacción).</small></div><button class="btn btn-sm btn-primary" data-ed="autofix">Corregir todo</button></div>${fxLog ? `<div class="ed-pend"><div class="ed-pend-h"><b>${fxLog.n ? fxLog.n + ' correcciones aplicadas' : 'Sin cambios automáticos'}</b>${fxSnap ? '<button class="btn btn-sm" data-ed="autofix-undo">Deshacer</button>' : ''}</div>${fxLog.n ? `<details class="ok-fold" open><summary>Ver cambios</summary>${fixItemsHtml({ items: fxLog.items }, false)}</details>` : ''}${fxLog.rem ? `<small class="muted">Quedan ${fxLog.rem} punto(s) que dependen de tus datos: revisa las pestañas con contador rojo.</small>` : '<small class="muted">✓ No quedan pendientes.</small>'}</div>` : ''}<div class="ed-pend"><div class="ed-pend-h"><b>${esc(a.label)}</b><span class="badge ${bad.length ? (a.score >= 50 ? 'b-warn' : 'b-bad') : 'b-ok'}">${bad.length ? bad.length + ' por corregir' : '✓ Todo en orden'}</span></div><div class="ed-prog"><i style="width:${a.score}%"></i></div>${items || '<p class="muted" style="margin:6px 0 0">Esta sección cumple las pautas ATS.</p>'}${bad.length > 6 ? `<small class="muted">+ ${bad.length - 6} más: corrige estos primero.</small>` : ''}${ok.length ? `<details class="ok-fold"><summary>${ok.length} criterios cumplidos</summary>${ok.map(c => `<div class="chk ok"><i>✓</i><div><b>${esc(c.msg)}</b></div></div>`).join('')}</details>` : ''}<details class="ok-fold"><summary>Qué lee el ATS en esta sección</summary><p style="margin:6px 0 4px">${esc(a.guide)}</p><ul class="ed-bul">${(a.bullets || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></details></div>`;
  };
  const updSug = () => { box.querySelectorAll('.bullet-sug').forEach(e => (e.innerHTML = '')); let SB; try { SB = skillBacking(draft); } catch (e) { return; } SB.unbacked.filter(u => u.best).forEach(u => { const el = box.querySelector(`.bullet-sug[data-list="${u.best.list}"][data-i="${u.best.i}"][data-j="${u.best.j}"]`); if (el) el.insertAdjacentHTML('beforeend', `<button class="sug-chip" data-ed="sug-add" data-list="${u.best.list}" data-i="${u.best.i}" data-j="${u.best.j}" data-s="${esc(u.s)}" title="Úsalo solo si aplicaste ${esc(u.s)} en este logro">💡 Respaldar «${esc(u.s)}» aquí</button>`); }); };
  const updAudit = () => { const a = sectionAudit(draft)[AUD[tab]], el = $('#edAudit', box); drawTabs(); updSug(); if (!el || !a) return; el.innerHTML = edPanel(a); };
  const drawTabs = () => { let au = {}; try { au = sectionAudit(draft); } catch (e) { } const pend = k => { const a = au[AUD[k]]; if (!a) return null; if ((k === 'leadership' && !draft.leadership.length)) return null; return a.checks.filter(c => !c.ok).length; }; $('#edTabs', box).innerHTML = TABS.map(([k, l]) => { const n = pend(k); return `<button data-ed="tab" data-t="${k}" class="${k === tab ? 'on' : ''}">${l}${['education', 'experience', 'leadership', 'projects'].includes(k) ? ` (${draft[k].length})` : ''}${n === null ? '' : `<em class="tb ${n ? 'bad' : 'ok'}" title="${n ? n + ' por corregir' : 'Sin pendientes'}">${n || '✓'}</em>`}</button>`; }).join(''); };
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
    const t = e.target; if (t.dataset && t.dataset.sk) { skRows[+t.dataset.i][t.dataset.sk] = t.value; skSave(); dp(); return; }
    if (!t.dataset || !t.dataset.p) return;
    setP(draft, t.dataset.p, t.type === 'checkbox' ? t.checked : t.value);
    const w = t.closest('.bullet-wrap'); if (w) $('.bullet-hint', w).innerHTML = hint(t.value);
    dp();
  });
  box.addEventListener('change', e => { const t = e.target; if (t.id === 'edOfferSel') { edOffer = t.value; drawBody(); return; } if (t.dataset && t.dataset.p && t.tagName === 'SELECT') { setP(draft, t.dataset.p, t.value); dp(); } });
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-ed]'); if (!b) return; const d = b.dataset, list = d.list, i = +d.i;
    switch (d.ed) {
      case 'sug-add': { const t = String(draft[list][i].bullets[+d.j] || '').replace(/[.;\s]+$/, ''); draft[list][i].bullets[+d.j] = / (usando|using) /.test(t) ? `${t} y ${d.s}` : `${t} ${isEs(t) ? 'usando' : 'using'} ${d.s}`; toast('Tecnología añadida', `«${d.s}» quedó en la viñeta. Compruébala: debe ser algo que realmente usaste.`, 'info'); break; }
      case 'tab': tab = d.t; drawBody(); return;
      case 'autofix': { const plan = atsFixPlan(draft, getOffer(edOffer)); fxSnap = deep(draft); plan.apply(draft); fxLog = { n: plan.items.length, items: plan.items, rem: plan.remaining.length }; skRows = null; toast(plan.items.length ? 'Autocorrección aplicada' : 'Nada que corregir automáticamente', plan.items.length ? `${plan.items.length} cambios. Puedes deshacerlos desde el panel.` : 'Lo que falta depende de tus datos.', plan.items.length ? 'success' : 'info'); break; }
      case 'autofix-undo': if (fxSnap) { Object.keys(draft).forEach(k => delete draft[k]); Object.assign(draft, fxSnap); fxSnap = null; fxLog = null; skRows = null; } break;
      case 'goto': { let f = box.querySelector(`[data-p="${d.p}"]`); if (!f && TABS.some(t => t[0] === d.p.split('.')[0])) { tab = d.p.split('.')[0]; drawBody(); f = box.querySelector(`[data-p="${d.p}"]`); } if (f) { f.scrollIntoView({ block: 'center', behavior: 'smooth' }); f.focus({ preventScroll: true }); f.classList.add('fld-hl'); setTimeout(() => f.classList.remove('fld-hl'), 2200); } return; }
      case 'rw': { const slot = $('.rw-slot', b.closest('.bullet-wrap')); if (slot.innerHTML) { slot.innerHTML = ''; return; } slot.innerHTML = rwHtml(rewriteSuggestions(draft[list][i].bullets[+d.j], draft.area, totalYears(draft)), `data-list="${list}" data-i="${i}" data-j="${d.j}"`) || '<small class="muted">Escribe primero la función que cumpliste y vuelve a pulsar.</small>'; return; }
      case 'rw-use': { const r = rewriteSuggestions(draft[list][i].bullets[+d.j], draft.area, totalYears(draft)); if (r) { draft[list][i].bullets[+d.j] = r.variants[+d.v].text; toast('Viñeta reformulada', 'Completa los datos entre [corchetes] con cifras reales.', 'info'); } break; }
      case 'pf-fix': { const lst = proofread(draft), it = lst[+d.i]; if (it && it.fix && it.path) { setP(draft, it.path, it.fix(String(getP(draft, it.path) || ''))); } break; }
      case 'tag-add': { const k = d.k, lines = String(draft.skills.technical || '').split('\n'), ix = lines.findIndex(l => /^otras?:/i.test(l)); if (ix >= 0) lines[ix] += ', ' + k; else lines.push('Otras: ' + k); draft.skills.technical = lines.join('\n').replace(/^\n/, ''); skRows = null; toast('Etiqueta agregada', `«${k}» quedó en Habilidades (solo conserva lo que realmente dominas).`, 'success'); break; }
      case 'norm-dates': { let n = 0; ['experience', 'leadership', 'education', 'projects'].forEach(l => (draft[l] || []).forEach(e => { const v = normDate(e.dates); if (v && v !== e.dates) { e.dates = v; n++; } })); toast('Fechas normalizadas', n ? `${n} fecha(s) ajustada(s) al formato Mmm AAAA – Presente.` : 'Las fechas ya tenían el formato correcto.', n ? 'success' : 'info'); break; }
      case 'sk-add': skRows.push({ c: '', v: '' }); skSave(); drawBody(); drawPrev(); { const ins = box.querySelectorAll('[data-sk="c"]'); if (ins.length) ins[ins.length - 1].focus(); } return;
      case 'sk-del': skRows.splice(i, 1); skSave(); break;
      case 'sk-up': if (i > 0) { [skRows[i - 1], skRows[i]] = [skRows[i], skRows[i - 1]]; skSave(); } break;
      case 'sk-down': if (i < skRows.length - 1) { [skRows[i + 1], skRows[i]] = [skRows[i], skRows[i + 1]]; skSave(); } break;
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
/** Qué agentes aplican según el área del CV: un CV de diseño no se analiza con IT y viceversa. */
function cvAreaEff(cv, c) { if (cv.area && cv.area !== 'General') return cv.area; if (!c) return 'General'; return c.itShare > c.dsShare + .1 ? 'IT' : c.dsShare > c.itShare + .1 ? 'Diseño' : 'General'; }
function agentsFor(cv, c) {
  const a = cvAreaEff(cv, c), skip = { IT: ['dis', 'dirdis'], 'Diseño': ['it', 'dirit'], General: ['it', 'dis', 'dirit', 'dirdis'] }[a] || [];
  return AGENTS.filter(x => !skip.includes(x.id));
}
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
  $('#agRoster').innerHTML = (() => { const cv0 = getCv(cvSel.value), on = cv0 ? agentsFor(cv0).map(x => x.id) : AGENTS.map(x => x.id); return AGENTS.map(a => `<div class="ag" style="${on.includes(a.id) ? '' : 'opacity:.38'}" title="${on.includes(a.id) ? '' : 'No aplica al área de este CV'}"><div class="ag-av" style="--c:${a.c}">${a.i}</div><div><b>${a.short}</b><small>${a.role}</small></div></div>`).join(''); })();
  $('#agLlmNote').hidden = !!S.settings.llmKey;
  if (!AG.running && !$('#agPipe').innerHTML) $('#agPipe').innerHTML = AGENTS.map(a => `<span class="st" data-a="${a.id}">${a.short}</span>`).join('') + '<span class="st" data-a="cons">Consenso</span>';
}
const msgHtml = (a, res) => `<div class="ag-av" style="--c:${a.c};width:38px;height:38px;border-radius:12px;display:grid;place-items:center;color:#fff;font-weight:700;background:${a.c};flex:none">${a.i}</div><div class="bubble"><header><b>${a.n}</b><span class="badge ${bandOf(res.score).cls}">${res.score}/100</span>${res.na ? '<span class="badge b-mute">Poca relevancia para estas ofertas</span>' : ''}</header><p><b>${esc(res.verdict)}</b></p><ul>${res.F.map(f => `<li>${{ ok: '✓', warn: '⚠', bad: '✗', info: 'ℹ' }[f.t]} ${esc(f.x)}</li>`).join('')}</ul>${res.llm ? `<p style="margin-top:8px;border-top:1px dashed var(--line);padding-top:8px">${esc(res.llm)}</p>` : ''}</div>`;
async function runAgents(e) {
  e.preventDefault(); if (AG.running) return;
  const cv = getCv($('#agCv').value); if (!cv) return toast('Selecciona un CV', 'Sube un CV primero.', 'warn');
  const ov = $('#agOffer').value, offers = ov === 'all' ? (() => { const a = S.offers.filter(o => o.status !== 'descartada'); const rel = a.filter(o => o.area === cv.area || o.area === 'General'); return rel.length ? rel : a; })() : [getOffer(ov)].filter(Boolean);
  AG.running = true; $('#agRun').disabled = true; const th = $('#agThread'); th.innerHTML = ''; $('#agConsensus').hidden = true;
  const c = agentCtx(cv, offers);
  const ACT_AG = agentsFor(cv, c); $('#agArea').textContent = 'Área: ' + (c.itShare > c.dsShare ? 'IT' : c.dsShare > c.itShare ? 'Diseño' : cv.area);
  $('#agStatus').textContent = `Analizando «${cv.name}» frente a ${offers.length} oferta(s)…`;
  const pipe = $('#agPipe'); pipe.innerHTML = ACT_AG.map(a => `<span class="st" data-a="${a.id}">${a.short}</span>`).join('') + '<span class="st" data-a="cons">Consenso</span>';
  if (!offers.length) { th.innerHTML = `<div class="note warn">${ico('alert')}<span>No hay ofertas cargadas: los agentes evalúan el CV de forma general. Carga ofertas para un análisis contra puestos reales.</span></div>`; }
  const results = {};
  for (const a of ACT_AG) {
    const st = $(`.st[data-a="${a.id}"]`, pipe); st.classList.add('run');
    const row = document.createElement('div'); row.className = 'msg'; row.innerHTML = `<div style="width:38px;height:38px;border-radius:12px;background:${a.c};color:#fff;display:grid;place-items:center;font-weight:700;flex:none">${a.i}</div><div class="bubble"><header><b>${a.n}</b><span class="typing"><i></i><i></i><i></i></span></header></div>`; th.appendChild(row); th.scrollTop = th.scrollHeight;
    await sleep(550);
    const res = AGENT_FN[a.id](c); res.llm = await llmNarrative(a, res, c); results[a.id] = res;
    row.innerHTML = msgHtml(a, res); st.classList.remove('run'); st.classList.add('done'); th.scrollTop = th.scrollHeight;
  }
  const cons = $('.st[data-a="cons"]', pipe); cons.classList.add('run'); await sleep(500);
  // consenso ponderado según área de las ofertas
  const w = { rrhh: .18, recl: .22, it: .2 * c.itShare + .04, dis: .2 * c.dsShare + .04, dirit: .12 * c.itShare + .03, dirdis: .12 * c.dsShare + .03, ats: .1, redac: .08, marca: .05, carrera: .06 }; const ws = sum(Object.values(w));
  const overall = Math.round(sum(ACT_AG.map(a => results[a.id].score * w[a.id])) / ws);
  const sorted = ACT_AG.map(a => ({ a, r: results[a.id] })).filter(x => !x.r.na).sort((x, y) => y.r.score - x.r.score);
  const hi = sorted[0], lo = sorted[sorted.length - 1];
  const mod = document.createElement('div'); mod.className = 'msg';
  mod.innerHTML = `<div style="width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#5B5BF0,#8B5CF6);color:#fff;display:grid;place-items:center;flex:none">${ico('spark', 18)}</div><div class="bubble"><header><b>Moderador · Consenso</b><span class="badge ${bandOf(overall).cls}">${overall}/100</span></header><p>${hi && lo && hi.a !== lo.a ? `Mayor acuerdo en <b>${hi.a.short}</b> (${hi.r.score}); la mayor brecha está en <b>${lo.a.short}</b> (${lo.r.score}). ` : ''}Puntaje de preparación ponderado por el área de las ofertas: <b>${overall}/100</b> — ${bandOf(overall).label}.</p></div>`;
  th.appendChild(mod); th.scrollTop = th.scrollHeight; cons.classList.remove('run'); cons.classList.add('done');
  // plan de acción
  const acts = []; ACT_AG.forEach(a => results[a.id].A.forEach(x => { if (!results[a.id].na) acts.push({ ...x, by: a.short }); }));
  acts.sort((x, y) => y.pts - x.pts); const seen = new Set(), top = acts.filter(x => { const k = norm(x.x).slice(0, 40); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 7);
  const best = c.ms.slice().sort((x, y) => y.m.score - x.m.score).slice(0, 3);
  const box = $('#agConsensus'); box.hidden = false;
  box.innerHTML = `<header class="card-h"><div><h3>Veredicto del equipo de agentes</h3><p>${esc(cv.name)} · ${offers.length} oferta(s) de referencia</p></div></header><div class="consensus"><div style="display:flex;flex-direction:column;align-items:center">${ringSvg({ pct: overall / 100, color: bandColor(overall), center: overall, sub: 'preparación', size: 190 })}<span class="badge ${bandOf(overall).cls}" style="margin-top:8px">${bandOf(overall).label}</span><div class="agent-scores">${ACT_AG.map(a => `<div class="as"><span>${a.short}</span><i style="--w:${results[a.id].score}%;--c:${a.c}"></i><b>${results[a.id].score}</b></div>`).join('')}</div></div>
  <div><div class="an-h">Plan de mejora priorizado</div><div class="cons-list">${top.map((x, i) => `<div class="it"><div class="n">${i + 1}</div><div><b>${esc(x.x)}</b><div class="muted" style="font-size:12px">${esc(x.by)} · impacto estimado +${Math.round(x.pts)} pts</div></div></div>`).join('') || '<div class="note">' + ico('check') + '<span>Sin acciones críticas.</span></div>'}</div>
  ${c.gaps.length ? `<div class="an-h" style="margin-top:18px">Keywords a incorporar (si las dominas)</div><div class="kw-chips">${c.gaps.slice(0, 12).map(g => `<span class="kw miss">${esc(g.k)} <small>${g.n}/${offers.length}</small></span>`).join('')}</div>` : ''}
  ${best.length ? `<div class="an-h" style="margin-top:18px">Mejores ofertas para este CV</div>${best.map(x => `<div class="cv-match" style="margin-bottom:6px"><b>${esc(x.o.title)}<small>${esc(x.o.company)}</small></b>${scoreBar(x.m.score)}</div>`).join('')}` : ''}
  <div class="form-actions"><button class="btn btn-primary" data-act="cv-edit" data-id="${cv.id}">${ico('edit')}Abrir editor del CV</button>${best[0] ? `<button class="btn" data-act="opt-open" data-cv="${cv.id}" data-offer="${best[0].o.id}">${ico('spark')}Optimizar para la mejor oferta</button>` : ''}</div></div></div>`;
  hydrateIcons(box); $('#agStatus').textContent = `Deliberación completada · preparación ${overall}/100`; AG.running = false; $('#agRun').disabled = false;
}

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
  const dom = { Computrabajo: 'computrabajo.com', Bumeran: 'bumeran.com.ar', GetOnBoard: 'getonbrd.com', Workana: 'workana.com', Remotive: 'remotive.com', RemoteOK: 'remoteok.com', WeWorkRemotely: 'weworkremotely.com', Arbeitnow: 'arbeitnow.com', Torre: 'torre.ai' }[p];
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
  header: ['Encabezado y contacto', 'Lo primero que lee el ATS. Debe estar en texto normal, en el cuerpo del documento (no en cabecera ni pie).', ['Nombre y apellido en la primera línea', 'Email, teléfono con prefijo (+54…) y «ciudad, país»', '1–2 enlaces visibles (LinkedIn, GitHub o portafolio)']],
  education: ['Educación', 'El ATS clasifica cada estudio por institución, título y año; los ordena del más reciente al más antiguo.', ['Institución + título + años en cada formación', 'Fechas como “2019 – 2022” o “2022 – Presente”', 'Cursos y bootcamps pueden ir aquí si no hay título formal']],
  experience: ['Experiencia', 'Con empresa, rol y fechas el ATS calcula tus años de experiencia; con las viñetas valida tus herramientas.', ['Cada puesto: organización, rol y “Mar 2023 – Presente”', '3–5 viñetas en los puestos recientes', 'Verbo de acción + métrica + herramienta (fórmula XYZ)']],
  leadership: ['Liderazgo y actividades', 'Sección opcional que suma señales blandas verificables (voluntariado, mentoría, comunidades).', ['Misma estructura que Experiencia', 'Un logro cuantificado como mínimo']],
  projects: ['Proyectos', 'Evidencia clave en perfiles IT y Diseño, sobre todo con poca experiencia.', ['Nombre, enlace y stack en cada proyecto', 'Un resultado medible por proyecto']],
  skills: ['Habilidades, idiomas y certificaciones', 'El ATS compara estos términos exactos con los de la oferta.', ['Una categoría por fila (Backend, Bases de datos…)', 'Sin barras, estrellas ni porcentajes', 'Idiomas con nivel (B2, C1, nativo) y certificaciones con año']],
  format: ['Formato general', 'Si la estructura se rompe, nada de lo anterior se lee bien.', ['Una columna, sin tablas ni cuadros', 'Encabezados estándar y texto seleccionable', 'Una página (dos solo con +10 años)']]
};
function sectionAudit(cv) {
  const an = analyzeCv(cv), b = cv.basics || {}, s = cv.skills || {}, m = cv.meta || {};
  const C = (ok, msg, fix, x) => ({ ok: !!ok, msg, fix, ...(x ? (typeof x === 'string' ? { go: x } : x) : {}) });
  const bp = pred => { for (const l of ['experience']) for (let i = 0; i < (cv[l] || []).length; i++) for (let j = 0; j < (cv[l][i].bullets || []).length; j++) { const t = cv[l][i].bullets[j]; if (t && t.trim() && pred(bulletCheck(t))) return `${l}.${i}.bullets.${j}`; } return null; };
  const yrs = e => yearsOf(e.dates);
  const desc = arr => { const ys = (arr || []).map(yrs).filter(Boolean); return ys.every((y, i) => i === 0 || ys[i - 1].b >= y.b - 0); };
  const exp = cv.experience || [], lead = cv.leadership || [], edu = cv.education || [], pr = cv.projects || [];
  const eb = exp.flatMap(e => e.bullets || []).filter(x => x.trim()), ec = eb.map(bulletCheck), n = Math.max(1, ec.length);
  const out = {}, PA = parseAudit(cv);
  out.header = [
    ...PA.contact,
    C(b.linkedin || b.github || b.web, 'Enlace profesional (LinkedIn/GitHub/portafolio)', 'Añade al menos un enlace en texto visible.', 'basics.linkedin'),
    C(!m.emoji, 'Sin emojis ni íconos', 'Quita íconos de contacto: el ATS los lee como caracteres basura.')
  ];
  out.education = [
    C(edu.length, 'Hay al menos una formación', 'Agrega tu formación principal (o curso/bootcamp relevante).'),
    ...PA.education,
    C(desc(edu), 'Orden cronológico inverso', 'Pon primero lo más reciente.'),
    C(!cv.sectionOrder || cv.sectionOrder.indexOf('education') <= cv.sectionOrder.indexOf('experience') || cv.sectionOrder.indexOf('education') < 0, 'Educación antes que Experiencia (Harvard)', 'Mueve Educación al inicio, salvo que tu experiencia supere por mucho a tu formación.')
  ];
  const first2 = exp.slice(0, 2);
  const verbCount = {}; eb.forEach(x => { const w = norm(x.split(/\s+/)[0]); verbCount[w] = (verbCount[w] || 0) + 1; });
  const skillItems = skillList(s.technical), SB = skillBacking(cv);
  out.experience = [
    C(exp.length, 'Hay experiencia registrada', 'Agrega experiencia laboral, freelance o prácticas.'),
    ...PA.experience,
    C(desc(exp), 'Orden cronológico inverso', 'Lo más reciente primero.'),
    C(first2.every(e => (e.bullets || []).filter(Boolean).length >= 3), '3–5 viñetas en los 2 puestos más recientes', 'Amplía con logros concretos.'),
    C(ec.filter(c => c.verb).length / n >= 0.8, '≥ 80 % de viñetas con verbo de acción', 'Empieza con Lideré, Implementé, Reduje…', bp(c => !c.verb)),
    C(ec.filter(c => c.metric).length / n >= 0.5, '≥ 50 % de viñetas con métricas', 'Cuantifica: %, tiempo, usuarios, volumen, dinero.', bp(c => !c.metric)),
    C(ec.filter(c => c.xyz).length / n >= 0.35, '≥ 35 % de viñetas con fórmula XYZ', 'Usa “Logré X, medido por Y, al hacer Z”: pulsa ✎ XYZ en la viñeta.', bp(c => !c.xyz)),
    C(!ec.some(c => c.weak), 'Sin frases débiles (“responsable de…”)', 'Cámbialas por verbos de impacto.', bp(c => c.weak)),
    C(!ec.some(c => c.long), 'Viñetas de máximo 2 líneas', 'Divide las que superen 32 palabras.', bp(c => c.long)),
    C(Math.max(0, ...Object.values(verbCount)) < 3, 'Variedad de verbos (sin repetir 3+ veces)', 'Alterna: Diseñé, Construí, Automaticé, Migré.'),
    C(!SB.total || SB.ratio >= 0.35, `Tecnologías respaldadas en las viñetas (${SB.backed.length} de ${SB.total})`, sugText(SB), (SB.unbacked.find(u => u.best) || {}).best ? { go: SB.unbacked.find(u => u.best).best.path } : null)
  ];
  out.leadership = lead.length ? [
    ...PA.leadership,
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
  Object.entries(out).forEach(([k, checks]) => { res[k] = { key: k, label: SECTION_GUIDE[k][0], guide: SECTION_GUIDE[k][1], bullets: SECTION_GUIDE[k][2], checks, score: Math.round(100 * checks.filter(c => c.ok).length / checks.length) }; });
  return res;
}
const auditHtml = (a, only) => (only ? a.checks.filter(c => !c.ok) : a.checks).map(c => `<div class="chk ${c.ok ? 'ok' : 'no'}"><i>${c.ok ? '✓' : '✗'}</i><div><b>${esc(c.msg)}</b>${c.ok ? '' : ` <span class="muted">${esc(c.fix)}</span>${exHtml(exFor(c.msg))}`}</div></div>`).join('');
function renderSectionAudit() {
  const sel = $('#auditCv'); if (!sel) return; const prev = sel.value;
  sel.innerHTML = S.cvs.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('') || '<option value="">Sin CVs</option>'; if (prev && getCv(prev)) sel.value = prev;
  const cv = getCv(sel.value), box = $('#auditGrid');
  if (!cv) { box.innerHTML = '<div class="empty"><p>Sube un CV para recibir consejos por sección.</p></div>'; return; }
  const au = sectionAudit(cv);
  box.innerHTML = Object.values(au).map(a => `<div class="tip audit"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h4>${a.label}</h4><span class="badge ${a.score >= 80 ? 'b-ok' : a.score >= 50 ? 'b-warn' : 'b-bad'}">${a.score} %</span></div><p>${a.guide}</p><div class="xyz-out" style="margin-top:var(--s-4)">${auditHtml(a, true)}${a.checks.some(c => c.ok) ? `<details class="ok-fold"><summary>${a.checks.filter(c => c.ok).length} criterios cumplidos</summary>${a.checks.filter(c => c.ok).map(c => `<div class="chk ok"><i>✓</i><div><b>${esc(c.msg)}</b></div></div>`).join('')}</details>` : ''}</div><button class="btn btn-sm" style="margin-top:10px" data-act="cv-edit" data-id="${cv.id}">${ico('edit', 14)}Corregir en el editor</button></div>`).join('');
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
/* ==========================================================================
   p8 · CV: enlaces cortos, maquetación única (vista previa = PDF), PDF real,
   reformulador de viñetas (XYZ), revisión ortográfica/gramatical, etiquetas por oferta
   ========================================================================== */

/* ───────────── enlaces ───────────── */
const urlOf = (v, kind) => {
  v = String(v || '').trim(); if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  if (kind === 'linkedin' && !/\./.test(v)) return 'https://www.linkedin.com/in/' + v.replace(/^\/?(in\/)?/, '');
  if (kind === 'github' && !/\./.test(v)) return 'https://github.com/' + v.replace(/^\//, '');
  return 'https://' + v.replace(/^\/+/, '');
};
const shortUrl = u => String(u).replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
const HOST_LABELS = [[/behance\.net/, 'Behance'], [/dribbble\.com/, 'Dribbble'], [/medium\.com/, 'Medium'], [/figma\.com/, 'Figma'], [/github\.com/, 'GitHub'], [/gitlab\.com/, 'GitLab'], [/linkedin\.com/, 'LinkedIn'], [/notion\.(site|so)/, 'Portafolio'], [/(github\.io|vercel\.app|netlify\.app|pages\.dev|onrender\.com)/, 'Portafolio']];
function linkLabel(kind, url, style = 'label') {
  if (style === 'full') return url;
  if (style === 'short') return shortUrl(url);
  const h = HOST_LABELS.find(([re]) => re.test(url));
  if (kind === 'project') return h && h[1] === 'GitHub' ? 'Repositorio' : h && h[1] !== 'Portafolio' ? h[1] : 'Ver proyecto';
  return { linkedin: 'LinkedIn', github: 'GitHub', web: h ? h[1] : 'Portafolio' }[kind] || (h ? h[1] : 'Enlace');
}
function cvLinks(cv) {
  const b = cv.basics || {}, st = cv.linkStyle || 'label';
  return [['linkedin', b.linkedin], ['github', b.github], ['web', b.web]].filter(x => x[1] && String(x[1]).trim()).map(([k, v]) => { const url = urlOf(v, k); return { kind: k, url, label: linkLabel(k, url, st) }; });
}
const projLink = (cv, p) => { const url = urlOf(p.link, 'project'); return url ? { url, label: linkLabel('project', url, cv.linkStyle || 'label') } : null; };

/* ───────────── maquetación única (PDF y vista previa) ───────────── */
const PG = { W: 595.28, H: 841.89, ML: 50, MR: 50, MT: 42, MB: 42, BODY: 10.5 };
let _mctx = null;
const textW = (t, size, f = 'R', sp = 0) => {
  _mctx = _mctx || document.createElement('canvas').getContext('2d');
  _mctx.font = `${f.includes('I') ? 'italic ' : ''}${f.includes('B') ? 'bold ' : ''}${size}px "Times New Roman",Times,"Liberation Serif",serif`;
  return (_mctx.measureText(t).width + sp * t.length) * 1.015;
};
function wrapText(text, size, f, maxW, firstW = maxW) {
  const words = String(text).split(/\s+/).filter(Boolean), lines = []; let cur = '', lim = firstW;
  words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (textW(t, size, f) <= lim || !cur) cur = t; else { lines.push(cur); cur = w; lim = maxW; } });
  if (cur) lines.push(cur); return lines.length ? lines : [''];
}
function cvLayout(cv) {
  const { W, H, ML, MR, MT, MB, BODY } = PG, CW = W - ML - MR, pages = [[]]; let y = MT, pi = 0;
  const b = cv.basics || {}, s = cv.skills || {}, LH = 1.27;
  const room = h => { if (y + h > H - MB) { pages.push([]); pi++; y = MT; } };
  const put = o => pages[pi].push(o);
  const txt = (x, base, text, size, f = 'R', extra = {}) => put({ t: 'text', x, y: base, text, size, f, ...extra });
  const baseOf = size => y + size * 0.92;
  // línea centrada compuesta por tramos (con enlaces)
  const centered = (runs, size) => {
    const lines = []; let cur = [], w = 0, sepW = textW(' · ', size);
    runs.forEach(r => { const rw = textW(r.text, size, r.f || 'R'); if (cur.length && w + sepW + rw > CW) { lines.push(cur); cur = []; w = 0; } w += (cur.length ? sepW : 0) + rw; cur.push(r); });
    if (cur.length) lines.push(cur);
    lines.forEach(ln => {
      room(size * LH); const tot = sum(ln.map(r => textW(r.text, size, r.f || 'R'))) + sepW * (ln.length - 1); let x = (W - tot) / 2;
      ln.forEach((r, i) => { if (i) { txt(x, baseOf(size), ' · ', size); x += sepW; } txt(x, baseOf(size), r.text, size, r.f || 'R', r.link ? { link: r.link } : {}); x += textW(r.text, size, r.f || 'R'); });
      y += size * LH;
    });
  };
  const h2 = title => { room(11 * LH + 22); y += 7; const sz = 11; txt(ML, baseOf(sz), title.toUpperCase(), sz, 'B', { sp: 0.6 }); put({ t: 'rule', x1: ML, x2: W - MR, y: y + sz + 1.5 }); y += sz * LH + 3.5; };
  const leftRight = (left, right, size, fl = 'B', fr = 'R', link = null) => {
    if (!left && !right) return; const rw = right ? textW(right, size, fr) + 10 : 0, lines = wrapText(left || '', size, fl, CW - rw);
    lines.forEach((l, i) => { room(size * LH); txt(ML, baseOf(size), l, size, fl, i === 0 && link ? { link } : {}); if (i === 0 && right) txt(W - MR - textW(right, size, fr), baseOf(size), right, size, fr); y += size * LH; });
  };
  const bullet = t => {
    const ind = 13, lines = wrapText(t, BODY, 'R', CW - ind - 2);
    lines.forEach((l, i) => { room(BODY * LH); if (i === 0) txt(ML + 3, baseOf(BODY), '•', BODY); txt(ML + ind, baseOf(BODY), l, BODY); y += BODY * LH; });
  };
  const para = (t, f = 'R') => wrapText(t, BODY, f, CW).forEach(l => { room(BODY * LH); txt(ML, baseOf(BODY), l, BODY, f); y += BODY * LH; });
  const labeled = (label, t) => {
    const lw = textW(label + ' ', BODY, 'B'), lines = wrapText(t, BODY, 'R', CW, CW - lw);
    lines.forEach((l, i) => { room(BODY * LH); if (i === 0) { txt(ML, baseOf(BODY), label, BODY, 'B'); txt(ML + lw, baseOf(BODY), l, BODY); } else txt(ML, baseOf(BODY), l, BODY); y += BODY * LH; });
  };
  const gap = n => { y += n; };
  const bl = a => (a || []).filter(x => x && x.trim());
  const entry = e => {
    room(BODY * LH * 3); leftRight(e.org, e.location, BODY, 'B', 'R'); leftRight(e.role, e.dates, BODY, 'I', 'R'); bl(e.bullets).forEach(bullet); gap(4);
  };
  // encabezado
  { const sz = 20, nm = (b.name || 'Nombre Apellido'); const w = textW(nm, sz, 'B', 0.3); txt((W - w) / 2, baseOf(sz), nm, sz, 'B', { sp: 0.3 }); y += sz * 1.2; }
  const runs = [b.location && { text: b.location }, b.email && { text: b.email, link: 'mailto:' + b.email }, b.phone && { text: b.phone }, ...cvLinks(cv).map(l => ({ text: l.label, link: l.url }))].filter(Boolean);
  centered(runs.length ? runs : [{ text: 'Ciudad · email · teléfono' }], 10); gap(2);
  if (cv.summary && cv.summary.trim()) { h2('Resumen'); para(cv.summary); }
  const edu = (cv.education || []).filter(e => e.school || e.degree);
  if (edu.length) { h2('Educación'); edu.forEach(e => { room(BODY * LH * 2); leftRight(e.school, e.location, BODY, 'B', 'R'); leftRight(e.degree, e.dates, BODY, 'I', 'R'); if (e.details) para(e.details); gap(4); }); }
  const exp = (cv.experience || []).filter(e => e.org || e.role || bl(e.bullets).length);
  if (exp.length) { h2('Experiencia'); exp.forEach(entry); }
  const pr = (cv.projects || []).filter(p => p.name || bl(p.bullets).length);
  if (pr.length) { h2('Proyectos'); pr.forEach(p => { room(BODY * LH * 2); const l = projLink(cv, p); const nameW = textW(p.name || '', BODY, 'B'); room(BODY * LH);
    txt(ML, baseOf(BODY), p.name || '', BODY, 'B'); if (l) { const sepW = textW(' · ', BODY); txt(ML + nameW, baseOf(BODY), ' · ', BODY); txt(ML + nameW + sepW, baseOf(BODY), l.label, BODY, 'R', { link: l.url }); }
    if (p.dates) txt(W - MR - textW(p.dates, BODY), baseOf(BODY), p.dates, BODY); y += BODY * LH; bl(p.bullets).forEach(bullet); gap(4); }); }
  const lead = (cv.leadership || []).filter(e => e.org || e.role || bl(e.bullets).length);
  if (lead.length) { h2('Liderazgo y actividades'); lead.forEach(entry); }
  const sk = [];
  if (s.technical && s.technical.trim()) s.technical.split('\n').filter(x => x.trim()).forEach(l => { const m = l.match(/^([^:]{2,32}:)\s*(.*)$/); sk.push(m ? [m[1], m[2]] : ['', l]); });
  if (s.certs) sk.push(['Certificaciones:', s.certs]); if (s.languages) sk.push(['Idiomas:', s.languages]); if (s.interests) sk.push(['Intereses:', s.interests]);
  if (sk.length) { h2('Habilidades e intereses'); sk.forEach(([l, t]) => l ? labeled(l, t) : para(t)); }
  return pages;
}

/* vista previa HTML: copia exacta de la maquetación que usa el PDF */
function renderPaper(cv) {
  const { W, H } = PG, pages = cvLayout(cv), px = v => (v / W * 100).toFixed(3) + 'cqw', py = v => (v / H * 100).toFixed(3) + '%';
  const html = pages.map((items, n) => `<div class="pdfpg" aria-label="Página ${n + 1}">` + items.filter(i => i.text !== '' || i.t === 'rule').map(i => {
    if (i.t === 'rule') return `<i class="pdfrule" style="left:${px(i.x1)};width:${px(i.x2 - i.x1)};top:${py(i.y)}"></i>`;
    const st = `left:${px(i.x)};top:${py(i.y - i.size * 0.86)};font-size:${px(i.size)};${i.f.includes('B') ? 'font-weight:700;' : ''}${i.f.includes('I') ? 'font-style:italic;' : ''}${i.sp ? `letter-spacing:${px(i.sp)};` : ''}`;
    return i.link ? `<a class="pdft pdfl" href="${esc(i.link)}" target="_blank" rel="noopener" style="${st}">${esc(i.text)}</a>` : `<span class="pdft" style="${st}">${esc(i.text)}</span>`;
  }).join('') + `<small class="pdfn">${n + 1}/${pages.length}</small></div>`).join('');
  return `<div class="pdfpages">${html}</div>`;
}

/* ───────────── PDF real (texto seleccionable, enlaces activos) ───────────── */
const WIN1252 = { '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8A, '‹': 0x8B, 'Œ': 0x8C, 'Ž': 0x8E, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9A, '›': 0x9B, 'œ': 0x9C, 'ž': 0x9E, 'Ÿ': 0x9F };
function pdfText(s) {
  let o = '(';
  for (const ch of String(s)) {
    let c = WIN1252[ch] || ch.codePointAt(0); if (c > 255) c = 63; if (c < 32) c = 32;
    o += (c === 40 || c === 41 || c === 92 ? '\\' : '') + String.fromCharCode(c);
  }
  return o + ')';
}
const f2 = n => (Math.round(n * 100) / 100).toString();
const buildPdf = cv => pdfFromPages(cvLayout(cv), (cv.basics && cv.basics.name || cv.name || 'CV') + ' - CV', (cv.basics && cv.basics.name) || '');
function pdfFromPages(pages, titleStr, authorStr) {
  const H = PG.H, W = PG.W, FONT = { R: 'F1', B: 'F2', I: 'F3', BI: 'F4' };
  const objs = []; const add = body => { objs.push(body); return objs.length; };
  const catalog = add(''), pagesObj = add(''), fonts = ['Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic'].map(n => add(`<< /Type /Font /Subtype /Type1 /BaseFont /${n} /Encoding /WinAnsiEncoding >>`));
  const info = add(`<< /Title ${pdfText(titleStr)} /Author ${pdfText(authorStr)} /Producer (JobTrack) >>`);
  const kids = [];
  pages.forEach(items => {
    let c = '0 g\n', annots = [];
    items.forEach(i => {
      if (i.t === 'rule') { c += `0.6 w 0 G ${f2(i.x1)} ${f2(H - i.y)} m ${f2(i.x2)} ${f2(H - i.y)} l S\n`; return; }
      if (!i.text) return;
      const fk = FONT[i.f] || 'F1', yy = H - i.y, w = textW(i.text, i.size, i.f, i.sp || 0) / 1.015;
      c += `BT ${i.link ? '0.05 0.2 0.6 rg' : '0 g'} /${fk} ${f2(i.size)} Tf ${f2(i.sp || 0)} Tc ${f2(i.x)} ${f2(yy)} Td ${pdfText(i.text)} Tj ET\n`;
      if (i.link) {
        c += `0.4 w 0.05 0.2 0.6 RG ${f2(i.x)} ${f2(yy - 1.5)} m ${f2(i.x + w)} ${f2(yy - 1.5)} l S\n`;
        const url = i.link.replace(/[^\x20-\x7E]/g, ch => encodeURIComponent(ch));
        annots.push(add(`<< /Type /Annot /Subtype /Link /Rect [${f2(i.x)} ${f2(yy - 3)} ${f2(i.x + w)} ${f2(yy + i.size)}] /Border [0 0 0] /A << /S /URI /URI ${pdfText(url)} >> >>`));
      }
    });
    const content = add(`<< /Length ${c.length} >>\nstream\n${c}endstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${fonts[0]} 0 R /F2 ${fonts[1]} 0 R /F3 ${fonts[2]} 0 R /F4 ${fonts[3]} 0 R >> >> /Contents ${content} 0 R${annots.length ? ` /Annots [${annots.map(a => a + ' 0 R').join(' ')}]` : ''} >>`));
  });
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R /Lang (es) >>`;
  objs[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
  let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
  return new Blob([bytes], { type: 'application/pdf' });
}

/* ───────────── reformulador de viñetas (XYZ) ───────────── */
const FUNC_EX = [
  { re: /(api|endpoint|rest|backend|servidor|microserv)/i, area: 'IT', fn: 'APIs / backend', ex: 'Diseñé e implementé 12 endpoints REST en Node.js y Express, reduciendo 35 % el tiempo de respuesta (de 800 a 520 ms) al incorporar caché con Redis.' },
  { re: /(base de datos|sql|postgres|mysql|mongo|consulta|query)/i, area: 'IT', fn: 'Bases de datos', ex: 'Optimicé 8 consultas críticas en PostgreSQL con índices y reescritura de joins, bajando de 4 s a 600 ms los reportes diarios que usaban 40 analistas.' },
  { re: /(deploy|despliegue|ci\/cd|docker|devops|pipeline|servidor|cloud|aws|render)/i, area: 'IT', fn: 'Despliegue / DevOps', ex: 'Automaticé el despliegue con GitHub Actions y Docker, reduciendo de 45 a 8 minutos cada release y eliminando 100 % de los errores manuales de configuración.' },
  { re: /(test|prueba|qa|calidad|bug|error)/i, area: 'IT', fn: 'Pruebas y calidad', ex: 'Escribí 120 pruebas automatizadas con Jest que elevaron la cobertura de 35 % a 82 % y redujeron 40 % los bugs reportados por usuarios en producción.' },
  { re: /(frontend|interfaz|react|vue|angular|web|pagina|página|html|css)/i, area: 'IT', fn: 'Frontend / web', ex: 'Reconstruí la interfaz de checkout en React con carga diferida, mejorando 28 % el tiempo de carga (Lighthouse 61 → 89) y 9 % la conversión mensual.' },
  { re: /(dise[nñ]|ux|ui|prototip|figma|wireframe|usabilidad)/i, area: 'Diseño', fn: 'UX / UI', ex: 'Rediseñé el flujo de registro en Figma tras 12 entrevistas y 3 pruebas de usabilidad, reduciendo 38 % el abandono y el tiempo de tarea de 4,5 a 2,8 minutos.' },
  { re: /(marca|branding|identidad|logo|manual de marca)/i, area: 'Diseño', fn: 'Identidad / branding', ex: 'Creé la identidad visual de 6 marcas de pymes (logo, paleta y manual), alcanzando 100 % de aprobación en primera ronda y 4,8/5 de satisfacción del cliente.' },
  { re: /(redes|social|contenido|instagram|campa[nñ]a|marketing|publicaci)/i, area: 'General', fn: 'Contenido / redes', ex: 'Diseñé 90 piezas gráficas mensuales para Instagram y LinkedIn, aumentando 45 % el alcance orgánico y 22 % la interacción en 3 meses con tableros de Canva y calendario editorial.' },
  { re: /(atenci[oó]n|cliente|soporte|reclamo|ticket)/i, area: 'General', fn: 'Atención al cliente', ex: 'Resolví 35 consultas diarias con 94 % de satisfacción, reduciendo 20 % el tiempo medio de respuesta al estandarizar 15 respuestas modelo en el CRM.' },
  { re: /(venta|comercial|cuenta|negoci|prospect)/i, area: 'General', fn: 'Ventas', ex: 'Capté 28 cuentas nuevas en 6 meses mediante prospección en LinkedIn y seguimiento semanal, superando 18 % la meta trimestral y generando USD 42 000 en ingresos.' },
  { re: /(proyecto|equipo|coordin|gesti|liderazgo|lider|planific)/i, area: 'General', fn: 'Gestión de proyectos / equipo', ex: 'Coordiné un equipo de 6 personas en 4 proyectos simultáneos, entregando 100 % de los hitos a tiempo y reduciendo 15 % los costos mediante planificación semanal en Jira.' },
  { re: /(capacit|ense[nñ]|mentor|docen|taller)/i, area: 'General', fn: 'Capacitación / mentoría', ex: 'Capacité a 25 colaboradores en 5 talleres prácticos, elevando 30 % la autonomía medida en evaluaciones y reduciendo a la mitad las consultas repetidas al equipo.' },
  { re: /(document|administr|archivo|factur|carga de datos|planilla|excel)/i, area: 'General', fn: 'Administración / documentos', ex: 'Digitalicé y ordené 1 200 documentos en Google Drive con una nomenclatura estándar, reduciendo de 15 a 3 minutos la búsqueda de archivos y evitando 100 % de duplicados.' },
  { re: /(dato|analis|an[aá]lisis|reporte|dashboard|metric|estad)/i, area: 'IT', fn: 'Análisis de datos', ex: 'Construí un dashboard en Power BI con 14 indicadores que consolidó 5 fuentes de datos, ahorrando 10 horas semanales de reportes manuales a 3 áreas.' }
];
const METRICS = {
  IT: [['reduciendo [X %] el tiempo de respuesta / los errores', 'latencia, tasa de errores, tiempo de despliegue'], ['atendiendo a [N] usuarios / [N] peticiones por día', 'usuarios activos, peticiones, volumen de datos'], ['ahorrando [N] horas por semana al equipo', 'horas ahorradas, tickets cerrados']],
  'Diseño': [['aumentando [X %] la conversión / interacción', 'conversión, clics, alcance, NPS'], ['reduciendo [X %] el tiempo de la tarea o de producción', 'minutos por tarea, ciclos de revisión'], ['entregando [N] piezas / pantallas para [N] clientes', 'piezas entregadas, aprobación en primera ronda']],
  General: [['logrando [X %] más / menos [ventas, costos, tiempos]', 'ventas, costos, tiempo de entrega'], ['para [N] clientes / personas / áreas', 'clientes atendidos, personas capacitadas'], ['superando [X %] la meta de [período]', 'cumplimiento de metas, satisfacción']]
};
function pickVerb(t, area) {
  const m = { IT: 'Desarrollé', 'Diseño': 'Diseñé', General: 'Gestioné' }; if (/^(el|la|los|las|un|una)\b/i.test(t)) return m[area] || 'Gestioné'; return m[area] || 'Gestioné';
}
const IRR = { mantener: 'Mantuve', hacer: 'Hice', tener: 'Tuve', reducir: 'Reduje', producir: 'Produje', conducir: 'Conduje', traducir: 'Traduje', poner: 'Puse', ser: 'Fui', estar: 'Estuve', dar: 'Di', ver: 'Vi', ir: 'Fui', crear: 'Creé', leer: 'Leí', proveer: 'Proveí', obtener: 'Obtuve', mejorar: 'Mejoré' };
function inf2past(w) {
  const x = w.toLowerCase(); if (IRR[x]) return IRR[x];
  let r; if (/zar$/.test(x)) r = x.slice(0, -3) + 'cé'; else if (/car$/.test(x)) r = x.slice(0, -3) + 'qué'; else if (/gar$/.test(x)) r = x.slice(0, -3) + 'gué'; else if (/ar$/.test(x)) r = x.slice(0, -2) + 'é'; else if (/[ei]r$/.test(x)) r = x.slice(0, -2) + 'í'; else return '';
  return cap1(r);
}
function rewriteSuggestions(raw, area = 'General', years = 0) {
  let t = String(raw || '').trim().replace(/[.;]+$/, ''); if (!t) return null;
  const c = bulletCheck(t); let verb = '', rest = t;
  for (const [re, rep] of WEAK_MAP) if (re.test(t)) { verb = rep.trim(); rest = t.replace(re, ''); const w1 = rest.split(/\s+/)[0], pv = /(ar|er|ir)$/i.test(w1) && w1.length > 4 ? inf2past(w1) : ''; if (pv) { verb = pv; rest = rest.slice(w1.length).trim(); } break; }
  if (!verb) { const m = t.match(/^(\S+)\s+(.*)$/); if (c.verb && m) { verb = m[1]; rest = m[2]; } else { verb = pickVerb(t, area); rest = t.charAt(0).toLowerCase() + t.slice(1); } }
  rest = rest.replace(/\s+/g, ' ').trim();
  const tech = (extractKeywords(t, '').keywords || []).filter(k => k.cat === 'tool' || k.cat === 'lang').slice(0, 2).map(k => k.k);
  const zTxt = tech.length ? tech.join(' y ') : (area === 'Diseño' ? '[herramienta o método: Figma, investigación, sistema de diseño…]' : area === 'IT' ? '[tecnología o método: Node.js, Docker, pruebas automatizadas…]' : '[herramienta o método: Excel, CRM, plan semanal…]');
  const M = METRICS[area] || METRICS.General, V = [];
  const hasMetric = c.metric;
  const miss = c.xyzMiss || [], orig = verb + ' ' + rest;
  const yAdd = (/venta|cliente|comercial|report|document|atenci/i.test(t) && area !== 'IT') ? M[2][0] : M[0][0], zAdd = tech.length ? `usando ${zTxt}` : `usando ${zTxt}`;
  if (!c.xyz) {
    const need = []; if (miss.includes('Y')) need.push(yAdd); if (miss.includes('Z')) need.push(zAdd);
    V.push({ title: 'Tu viñeta + lo que le falta para ser XYZ', text: `${orig}${need.length ? ', ' + need.join(', ') : ''}.`, why: `Conserva tu redacción y solo añade ${need.length === 2 ? 'el resultado medible (Y) y el método (Z)' : miss.includes('Y') ? 'el resultado medible (Y)' : 'el método o herramienta (Z)'}.` });
  } else {
    V.push({ title: 'Ya es XYZ: versión más clara', text: `${orig}.`, why: 'Cumple X, Y y Z. Verifica que la cifra sea real y que el resultado vaya antes que la herramienta.' });
  }
  V.push({ title: 'XYZ ordenada (logro → métrica → método)', text: `${verb} ${rest}${hasMetric ? '' : ', ' + M[0][0]}, medido por [${M[0][1].split(',')[0]}], mediante ${zTxt}.`, why: 'X = lo que lograste · Y = cómo lo mediste · Z = lo que hiciste para lograrlo.' });
  V.push({ title: 'Con alcance y escala', text: `${verb} ${rest} ${M[1][0]}${hasMetric ? '' : ', ' + M[2][0]}.`, why: 'Los números de escala (usuarios, equipos, volumen) dan contexto al reclutador y al ATS.' });
  V.push({ title: years < 2 ? 'Versión para proyecto / poca experiencia' : 'Versión corta de impacto', text: years < 2 ? `${verb} ${rest} en un proyecto ${area === 'Diseño' ? 'académico o personal' : 'académico, personal o de bootcamp'} ([N] usuarios de prueba / [N] funciones / [N] semanas), usando ${zTxt}.` : `${verb} ${rest} ([${M[0][1].split(',')[0]}: X %]) con ${zTxt}.`, why: years < 2 ? 'Sin experiencia laboral, un proyecto con alcance concreto vale como logro: indica cuántos usuarios, funciones o semanas.' : 'Cuando el espacio es poco, deja el verbo, el resultado y la herramienta.' });
  const fx = FUNC_EX.find(f => f.re.test(t) && (f.area === area || f.area === 'General' || area === 'General')) || FUNC_EX.find(f => f.re.test(t));
  const probs = []; if (!c.verb || c.weak) probs.push('Empieza con un verbo de acción en pasado'); if (!hasMetric) probs.push('Falta una métrica (%, tiempo, cantidad, dinero)'); if (!c.xyz) probs.push('No sigue XYZ' + (c.xyzMiss && c.xyzMiss.length ? ' (falta ' + c.xyzMiss.map(k => ({ X: 'logro claro', Y: 'resultado medible', Z: 'método/herramienta' })[k]).join(' y ') + ')' : '')); if (c.long) probs.push('Es muy larga: máximo 2 líneas');
  return { problems: probs, variants: V, model: fx ? { fn: fx.fn, ex: fx.ex } : null };
}
const rwHtml = (r, attrs) => !r ? '' : `<div class="rw-box">${r.problems.length ? `<div class="rw-pr">${r.problems.map(p => `<span class="badge b-warn">${esc(p)}</span>`).join('')}</div>` : '<div class="rw-pr"><span class="badge b-ok">✓ Ya cumple lo básico; aun así puedes pulirla</span></div>'}` +
  r.variants.map((v, i) => `<div class="rw-v"><b>${esc(v.title)}</b><p>${esc(v.text).replace(/\[([^\]]+)\]/g, '<mark>[$1]</mark>')}</p><small class="muted">${esc(v.why)}</small><div><button class="btn btn-sm" data-ed="rw-use" ${attrs} data-v="${i}">Usar esta y completar los [corchetes]</button></div></div>`).join('') +
  (r.model ? `<div class="rw-v rw-model"><b>Ejemplo real: ${esc(r.model.fn)}</b><p>${esc(r.model.ex)}</p><small class="muted">Cifras de ejemplo: reemplázalas por las tuyas; no inventes datos que no puedas defender en entrevista.</small></div>` : '') +
  `<small class="muted">Si no tienes la cifra exacta, usa un rango o estimación honesta (“≈ 30 %”, “más de 20 usuarios”).</small></div>`;

/* ───────────── revisor de ortografía y gramática ───────────── */
const SPELL_ES = { tambien: 'también', ademas: 'además', asi: 'así', analisis: 'análisis', metodologia: 'metodología', metodologias: 'metodologías', tecnologia: 'tecnología', tecnologias: 'tecnologías', informatica: 'informática', tecnico: 'técnico', tecnica: 'técnica', tecnicas: 'técnicas', tecnicos: 'técnicos', basico: 'básico', basica: 'básica', codigo: 'código', codigos: 'códigos', pagina: 'página', paginas: 'páginas', linea: 'línea', lineas: 'líneas', area: 'área', areas: 'áreas', exito: 'éxito', numero: 'número', ingles: 'inglés', frances: 'francés', aleman: 'alemán', portugues: 'portugués', telefono: 'teléfono', electronico: 'electrónico', dinamico: 'dinámico', automatico: 'automático', automaticos: 'automáticos', rapido: 'rápido', estadisticas: 'estadísticas', estadistica: 'estadística', matematicas: 'matemáticas', logistica: 'logística', grafico: 'gráfico', graficos: 'gráficos', graficas: 'gráficas', diseno: 'diseño', disenos: 'diseños', disenar: 'diseñar', anos: 'años', ano: 'año', companeros: 'compañeros', companero: 'compañero', espanol: 'español', economia: 'economía', categoria: 'categoría', garantia: 'garantía', energia: 'energía', compania: 'compañía', ingenieria: 'ingeniería', psicologia: 'psicología', biologia: 'biología', administracion: 'administración', gestion: 'gestión', cuestion: 'cuestión', arquitectonico: 'arquitectónico', analitica: 'analítica', unico: 'único', desarollo: 'desarrollo', desarollar: 'desarrollar', desarollador: 'desarrollador', experiensia: 'experiencia', esperiencia: 'experiencia', aprendisaje: 'aprendizaje', conocimento: 'conocimiento', implementacion: 'implementación' };
const SPELL_EN = { teh: 'the', recieve: 'receive', seperate: 'separate', definately: 'definitely', occured: 'occurred', managment: 'management', developement: 'development', experiance: 'experience', responsability: 'responsibility', acheived: 'achieved', enviroment: 'environment', sucessful: 'successful', bussiness: 'business', comunication: 'communication', langauge: 'language', knowlege: 'knowledge', begining: 'beginning', collegue: 'colleague', thier: 'their', aplication: 'application', databse: 'database', maintainance: 'maintenance', independant: 'independent' };
const TECH_CASE = ['JavaScript', 'TypeScript', 'Node.js', 'GitHub', 'GitLab', 'LinkedIn', 'MySQL', 'PostgreSQL', 'MongoDB', 'WordPress', 'Figma', 'Docker', 'React', 'Angular', 'Python', 'HTML', 'CSS', 'SQL', 'API', 'APIs', 'AWS', 'UI', 'UX', 'Photoshop', 'Illustrator', 'Kubernetes', 'Jira', 'Excel', 'PowerPoint', 'Sequelize', 'Express', 'Redis', 'Jenkins'];
const TECH_MAP = new Map(TECH_CASE.map(t => [t.toLowerCase(), t]).concat([['nodejs', 'Node.js'], ['postgres', 'PostgreSQL'], ['java script', 'JavaScript'], ['git hub', 'GitHub']]));
const VAGUE = [[/\b(varios|varias|muchos|muchas|diversos|diversas|algunos|algunas|bastantes?)\b/i, 'Cuantifica: cambia “varios/muchos” por una cifra o rango (“12 clientes”).'], [/\b(etc\.?|entre otros|y m[aá]s|y otras cosas)\b/i, 'Evita “etc.” y “entre otros”: nombra lo importante; el ATS solo lee lo escrito.'], [/\b(tareas varias|cosas|diferentes tareas|distintas tareas)\b/i, 'Frase vaga: describe la tarea concreta y su resultado.'], [/\b(mejor[eé] mucho|gran(des)? cantidad|a veces|bastante)\b/i, 'Impreciso: sustituye por una métrica (“mejoré 25 %”).'], [/\b(many|several|various|some|a lot of)\b/i, 'Vague quantity: use a number or range (“12 clients”).']];
const CLICHE = /\b(proactiv[oa]|din[aá]mic[oa]|apasionad[oa]|orientad[oa] a resultados|trabajo en equipo|buen[ao]s? comunicador|team player|hard-?working|detail-?oriented|go-?getter|self-?motivated|results-?driven)\b/i;
const STOPW = new Set('para como entre desde hasta sobre cuando donde porque pero sino este esta estos estas ellos ellas tiene tienen hacer with that this from have been were their which would about into'.split(' '));
const accentMap = (() => { const m = new Map(); ACTION.forEach(v => { const n = norm(v); if (n !== v) m.set(n, v); }); return m; })();
const escRe = x => String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wre = w => new RegExp(`(?<![\\p{L}])${escRe(w)}(?![\\p{L}])`, 'gu');
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
const matchCase = (src, rep) => (src === src.toUpperCase() && src.length > 1 ? rep.toUpperCase() : /^[A-ZÁÉÍÓÚÑ]/.test(src) ? cap1(rep) : rep);
function verbClass(w) {
  const x = String(w || '').toLowerCase().replace(/[^a-záéíóúñü]/g, ''); if (x.length < 4) return '';
  if (/(ción|sión|miento|ncia)$/.test(x)) return 'sustantivo'; if (/(ando|iendo)$/.test(x)) return 'gerundio'; if (/[éí]$/.test(x)) return 'pasado (1.ª persona)'; if (/ó$/.test(x)) return 'pasado (3.ª persona)';
  if (/(ar|er|ir)$/.test(x) && x.length > 4) return 'infinitivo'; if (/^[a-z]{3,}ed$/.test(x)) return 'past'; if (/^[a-z]{3,}ing$/.test(x)) return 'gerund'; return '';
}
function textFields(cv) {
  const F = [];
  if (cv.summary) F.push({ path: 'summary', text: cv.summary, label: 'Resumen', kind: 'para' });
  [['experience', 'Experiencia'], ['leadership', 'Liderazgo'], ['projects', 'Proyecto']].forEach(([l, nm]) => (cv[l] || []).forEach((e, i) => (e.bullets || []).forEach((b, j) => { if (b && b.trim()) F.push({ path: `${l}.${i}.bullets.${j}`, text: b, label: `${nm} ${i + 1} (${e.org || e.name || e.role || '—'}) · viñeta ${j + 1}`, kind: 'bullet', group: `${l}.${i}`, dates: e.dates }); })));
  (cv.education || []).forEach((e, i) => { if (e.details) F.push({ path: `education.${i}.details`, text: e.details, label: `Educación ${i + 1}`, kind: 'para' }); });
  return F;
}
const isEs = t => { const w = String(t).toLowerCase().match(/[\p{L}]+/gu) || []; const es = w.filter(x => /^(de|la|el|en|con|para|y|los|las|del|por|una|un|al|que|se)$/.test(x)).length, en = w.filter(x => /^(the|and|of|with|for|to|in|by|a|an|at|on|that|using)$/.test(x)).length; return es >= en; };
function proofread(cv) {
  const out = [], F = textFields(cv);
  const add = (f, kind, msg, o = {}) => out.push({ path: f.path, where: f.label, kind, msg, ...o });
  F.forEach(f => {
    const t = f.text;
    if (/ {2,}/.test(t)) add(f, 'ortografía', 'Espacios dobles.', { bad: t.match(/ {2,}/)[0], fix: x => x.replace(/ {2,}/g, ' ') });
    if (/\s[,.;:](?=\s|$)/.test(t)) add(f, 'gramática', 'Espacio antes de un signo de puntuación.', { bad: t.match(/\s[,.;:]/)[0], fix: x => x.replace(/\s+([,.;:])/g, '$1') });
    if (/[\p{L}][,;:][\p{L}]/u.test(t)) add(f, 'gramática', 'Falta un espacio después de la coma, punto y coma o dos puntos.', { bad: t.match(/[\p{L}][,;:][\p{L}]/u)[0], fix: x => x.replace(/([\p{L}])([,;:])(?=[\p{L}])/gu, '$1$2 ') });
    const rep = t.match(/(?<![\p{L}])([\p{L}]{2,})\s+\1(?![\p{L}])/iu); if (rep) add(f, 'repetición', `Palabra repetida: «${rep[0]}».`, { bad: rep[0], fix: x => x.replace(/(?<![\p{L}])([\p{L}]{2,})\s+\1(?![\p{L}])/giu, '$1') });
    if (/!{1,}/.test(t)) add(f, 'estilo', 'Evita signos de exclamación en un CV.', { bad: '!', fix: x => x.replace(/!+/g, '') });
    if (/^\s*(yo|mi|me)\b/i.test(t)) add(f, 'estilo', 'Evita la primera persona explícita (“Yo desarrollé…”): empieza directo con el verbo.', { bad: t.match(/^\s*(yo|mi|me)\b/i)[0], fix: x => cap1(x.replace(/^\s*(yo)\s+/i, '')) });
    if (f.kind === 'bullet') {
      if (/^[a-záéíóúñ]/.test(t.trim())) add(f, 'ortografía', 'La viñeta empieza con minúscula.', { bad: t.trim().split(' ')[0], fix: x => cap1(x.trim()) });
      const first = t.trim().split(/\s+/)[0].replace(/[^\p{L}]/gu, '');
      const acc = accentMap.get(norm(first)); if (acc && first.toLowerCase() !== acc && /[eao]$/i.test(first)) add(f, 'ortografía', `Verbo sin tilde al inicio: «${first}» → «${matchCase(first, acc)}» (pasado, 1.ª persona).`, { bad: first, sug: matchCase(first, acc), fix: x => x.replace(new RegExp('^\\s*' + first), matchCase(first, acc)) });
      for (const [re, rep2] of WEAK_MAP) if (re.test(t.trim())) { add(f, 'verbo débil', `Frase débil al inicio: «${t.trim().match(re)[0].trim()}».`, { bad: t.trim().match(re)[0], sug: rep2.trim(), fix: x => x.trim().replace(re, rep2) }); break; }
      if (WEAK_RE.test(t.trim()) && !WEAK_MAP.some(([re]) => re.test(t.trim()))) add(f, 'verbo débil', 'Frase débil: cámbiala por un verbo de impacto (Lideré, Implementé, Reduje…).');
    }
    // palabras con error conocido
    const seen = new Set(), ES = isEs(t);
    (t.match(/[\p{L}.]+/gu) || []).forEach(w0 => {
      const w = w0.replace(/\.+$/, ''), lw = w.toLowerCase(); if (!w || seen.has(lw)) return;
      const es = SPELL_ES[lw], en = SPELL_EN[lw], tc = TECH_MAP.get(lw), rx = wre(w);
      const mk = sug => { seen.add(lw); add(f, 'ortografía', `«${w}» → «${sug}».`, { bad: w, sug, fix: x => x.replace(rx, sug) }); };
      if (es && lw !== es && ES) mk(matchCase(w, es));
      else if (en) mk(matchCase(w, en));
      else if (ES && /^[\p{L}]{3,}(cion|sion)$/iu.test(w)) mk(w.replace(/cion$/i, 'ción').replace(/sion$/i, 'sión'));
      else if (tc && w !== tc && lw !== 'express') { seen.add(lw); add(f, 'estilo', `Escribe «${tc}» tal como se escribe la herramienta.`, { bad: w, sug: tc, fix: x => x.replace(rx, tc) }); }
    });
    VAGUE.forEach(([re, msg]) => { const m = t.match(re); if (m) add(f, 'frase vaga', `«${m[0]}»: ${msg}`); });
    const cl = t.match(CLICHE); if (cl) add(f, 'estilo', `«${cl[0]}» es un cliché: demuéstralo con un logro concreto en vez de declararlo.`);
    const words = (t.toLowerCase().match(/[\p{L}]{6,}/gu) || []).filter(w => !STOPW.has(w)), cnt = {}; words.forEach(w => cnt[w] = (cnt[w] || 0) + 1);
    const dup = Object.entries(cnt).filter(([, n]) => n >= 2)[0]; if (dup) add(f, 'repetición', `La palabra «${dup[0]}» aparece ${dup[1]} veces en la misma frase: usa un sinónimo.`);
    if (f.kind === 'bullet' && t.trim().split(/\s+/).length > 32) add(f, 'estilo', 'Viñeta muy larga (más de 32 palabras): divídela en dos.');
  });
  // consistencia de tiempos verbales y puntuación por puesto
  const groups = {}; F.filter(f => f.kind === 'bullet').forEach(f => (groups[f.group] = groups[f.group] || []).push(f));
  Object.values(groups).forEach(g => {
    if (g.length < 2) return;
    const cls = g.map(f => verbClass(f.text.trim().split(/\s+/)[0])), counts = {}; cls.filter(Boolean).forEach(c => counts[c] = (counts[c] || 0) + 1);
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top && Object.keys(counts).length > 1) g.forEach((f, i) => { if (cls[i] && cls[i] !== top[0]) add(f, 'tiempo verbal', `Inconsistencia de tiempos verbales: la mayoría de este puesto usa ${top[0]} y esta viñeta usa ${cls[i]} («${f.text.trim().split(/\s+/)[0]}»). Unifica la forma (en CV se recomienda pasado en 1.ª persona: «Desarrollé…»; en el puesto actual, presente).`); });
    const ends = g.map(f => /[.]$/.test(f.text.trim())), withDot = ends.filter(Boolean).length;
    if (withDot && withDot < g.length) g.forEach((f, i) => { if (ends[i] === (withDot < g.length / 2)) add(f, 'gramática', 'Puntuación inconsistente: algunas viñetas de este puesto terminan en punto y otras no.', { fix: x => (withDot >= g.length / 2 ? (x.trim().endsWith('.') ? x : x.trim() + '.') : x.trim().replace(/\.$/, '')) }); });
  });
  const verbs = {}; F.filter(f => f.kind === 'bullet').forEach(f => { const w = norm(f.text.trim().split(/\s+/)[0]); if (w.length > 3) verbs[w] = (verbs[w] || 0) + 1; });
  Object.entries(verbs).filter(([, n]) => n >= 3).forEach(([w, n]) => out.push({ path: '', where: 'Todo el CV', kind: 'repetición', msg: `Empiezas ${n} viñetas con «${w}»: alterna verbos (Diseñé, Construí, Automaticé, Migré…).` }));
  return out;
}
const PF_KIND = { 'ortografía': 'b-bad', 'gramática': 'b-bad', 'verbo débil': 'b-warn', 'repetición': 'b-warn', 'frase vaga': 'b-warn', 'tiempo verbal': 'b-warn', 'estilo': 'b-info' };
function proofHtml(list) {
  if (!list.length) return '<div class="note"><i data-ic="check"></i><span>No se detectaron errores con las reglas del revisor. Aun así, usa el corrector de tu navegador (subrayado rojo) y pide a otra persona que lo lea.</span></div>';
  const by = {}; list.forEach(x => by[x.kind] = (by[x.kind] || 0) + 1);
  return `<div class="pf-sum">${Object.entries(by).map(([k, n]) => `<span class="badge ${PF_KIND[k] || 'b-mute'}">${n} ${k}</span>`).join('')}</div>` + list.map((x, i) => `<div class="pf-it"><span class="badge ${PF_KIND[x.kind] || 'b-mute'}">${x.kind}</span><div><b>${esc(x.where)}</b><p>${esc(x.msg)}</p></div>${x.fix && x.path ? `<button class="btn btn-sm" data-ed="pf-fix" data-i="${i}">Corregir</button>` : ''}</div>`).join('');
}

/* ───────────── etiquetas (keywords) del CV frente a una oferta ───────────── */
function offerTags(cv, offer) {
  const m = matchOffer(offer, cv), bul = allBullets(cv), skills = String(cv.skills && cv.skills.technical || '');
  const where = k => { const n = norm(k); const b = bul.find(x => norm(x).includes(n)); if (b) return 'viñeta: «' + (b.length > 60 ? b.slice(0, 60) + '…' : b) + '»'; if (norm(skills).includes(n)) return 'sección Habilidades'; if (norm(cvText(cv)).includes(n)) return 'otra sección'; return ''; };
  return { m, present: m.matched.map(i => ({ ...i, at: where(i.k) })), partial: m.partial, missing: m.missing.filter(i => i.cat !== 'term') };
}
const tagsHtml = (cv, offer, junior) => {
  const t = offerTags(cv, offer);
  const chip = (cls, i, extra = '') => `<span class="tag-chip ${cls}" title="${esc(i.at || '')}">${esc(i.k)}${i.must ? ' <small>obligatoria</small>' : ''}${extra}</span>`;
  return `<div class="tg-box"><h5>✓ Ya están en tu CV (${t.present.length})</h5><div class="tg-row">${t.present.map(i => chip('tg-ok', i)).join('') || '<small class="muted">Ninguna todavía.</small>'}</div>` +
    (t.partial.length ? `<h5>◐ Parcialmente (tecnología de la misma familia) (${t.partial.length})</h5><div class="tg-row">${t.partial.map(i => chip('tg-mid', i, ` <button class="tg-add" data-ed="tag-add" data-k="${esc(i.k)}" title="Agregar a Habilidades (solo si la dominas)">＋</button>`)).join('')}</div>` : '') +
    `<h5>✕ Faltan en tu CV (${t.missing.length}) — agrégalas solo si realmente las tienes</h5><div class="tg-row">${t.missing.map(i => chip('tg-no', i, ` <button class="tg-add" data-ed="tag-add" data-k="${esc(i.k)}" title="Agregar a Habilidades">＋</button>`)).join('') || '<small class="muted">No faltan palabras clave importantes.</small>'}</div>` +
    `<div class="note" style="margin-top:8px"><i data-ic="info"></i><span>${junior ? 'Con poca experiencia, respalda cada etiqueta en un <b>proyecto</b>, curso o práctica: “Desarrollé una API REST con <b>Node.js</b> en el proyecto final…”.' : 'Para que la etiqueta puntúe más, además de listarla en Habilidades úsala dentro de una viñeta con resultado (el ATS valora el contexto).'}</span></div></div>`;
};
/* ==========================================================================
   p9 · Simulador ATS paso a paso, ejemplos en los consejos, perfil junior
   ========================================================================== */

/* ───────────── ejemplos (mal / bien) para los consejos ATS ───────────── */
const ATS_EX = [
  [/Nombre completo/, 'TOMI | Dev', 'Tomás Gabriel Herrera', 'El ATS busca el nombre en la primera línea, en texto normal.'],
  [/Email presente|Email con aspecto/, 'tomi_dev99@hotmail.com', 'tomas.herrera@gmail.com', 'Nombre y apellido, sin números ni apodos.'],
  [/Teléfono/, '11 5555 0000', '+54 11 5555-0000', 'Con prefijo internacional: los filtros de contacto lo validan.'],
  [/Ubicación/, 'Zona Norte', 'Buenos Aires, Argentina', 'Muchos filtros descartan por ciudad/país.'],
  [/Enlace profesional|enlaces a LinkedIn/, 'https://www.linkedin.com/in/tomas-herrera-1a2b3c4d5e6f7g8h9/?originalSubdomain=ar', 'LinkedIn · GitHub · Portafolio (enlaces activos)', 'JobTrack muestra una etiqueta clicable en vez de la dirección larga.'],
  [/emojis|íconos/, '📧 tomas@mail.com  ☎ 11 5555', 'tomas@mail.com · +54 11 5555-0000', 'Los íconos se leen como caracteres basura.'],
  [/formación|Institución y título|institución y título/, 'Estudios universitarios', 'Universidad Tecnológica Nacional — Tecnicatura Universitaria en Programación, 2019 – 2022', 'Institución + título + fechas: así lo clasifica el ATS.'],
  [/Fechas en formato|Fechas legibles/, '03/2023 a la fecha · desde hace unos años', 'Mar 2023 – Presente', 'El ATS suma fechas para calcular tus años de experiencia.'],
  [/fecha de inicio y de fin/, '2022', 'Ene 2022 – Dic 2022', 'Con un solo año no se puede calcular la duración.'],
  [/Rango de fechas/, 'Mar 2024 – Mar 2021', 'Mar 2021 – Mar 2024', 'El inicio va antes del fin.'],
  [/Enlaces con formato/, 'linkedin.com/in/ tomas herrera', 'linkedin.com/in/tomas-herrera', 'Sin espacios y con la dirección completa.'],
  [/Orden cronológico/, '2018 – 2020 primero, 2023 – Presente al final', '2023 – Presente primero, luego 2020 – 2023', 'Lo más reciente va arriba.'],
  [/Educación antes que Experiencia/, 'Experiencia → Educación (sin experiencia relevante)', 'Educación → Proyectos → Experiencia', 'Con poca experiencia, la formación va primero.'],
  [/organización, rol y fechas|Cada puesto|Organización y rol/, 'Backend', 'Tech Studio · Backend Developer · Mar 2023 – Presente', 'Los tres datos juntos permiten calcular tu antigüedad.'],
  [/3–5 viñetas/, '1 sola viñeta: «Programación»', '4 viñetas con logros: API, base de datos, pruebas, despliegue', 'Los puestos recientes concentran el puntaje.'],
  [/verbo de acción/, 'Responsable de la API de pagos', 'Diseñé la API de pagos…', 'Verbo en pasado, 1.ª persona.'],
  [/métricas/, 'Mejoré el rendimiento del sistema', 'Reduje 40 % el tiempo de respuesta (de 800 a 480 ms)', 'Números concretos: %, tiempos, usuarios, dinero.'],
  [/XYZ/, 'Hice reportes de ventas', 'Automaticé los reportes de ventas (de 6 h a 40 min por semana) con Python y Power BI', 'Logré [X], medido por [Y], haciendo [Z].'],
  [/frases débiles/, 'Ayudé a clientes con tareas de hosting', 'Resolví 35 consultas diarias de hosting con 94 % de satisfacción', 'Cambia responsabilidades por logros.'],
  [/máximo 2 líneas/, 'Una viñeta de 60 palabras con todo mezclado…', 'Dos viñetas de 20 palabras cada una', 'Una idea por viñeta.'],
  [/Variedad de verbos/, 'Desarrollé… Desarrollé… Desarrollé…', 'Desarrollé… Automaticé… Migré…', 'Repetir el verbo se lee como falta de alcance.'],
  [/Tecnologías respaldadas/, 'Habilidades: Docker (sin mención en la experiencia)', 'Desplegué la API en contenedores Docker en Render', 'El ATS puntúa más la tecnología cuando aparece en una viñeta.'],
  [/proyecto con nombre|Cada proyecto|Resultado medible en cada proyecto/, 'Proyecto personal', 'JobTrack · Repositorio — panel de postulaciones usado por 40 personas', 'Nombre + enlace + resultado.'],
  [/categoría/, 'JavaScript, Node, Photoshop, Excel, Inglés', 'Backend: Node.js, Express\nBases de datos: PostgreSQL', 'Una línea por categoría ordena la lectura.'],
  [/barras, estrellas/, 'JavaScript ★★★★☆ 80 %', 'JavaScript (uso diario, 3 años)', 'Los porcentajes no son verificables ni legibles.'],
  [/Idiomas con nivel/, 'Inglés', 'Inglés B2 (intermedio-alto)', 'Muchas ofertas filtran por nivel de idioma.'],
  [/Certificaciones/, 'Curso de Node', 'Node.js Application Developer — OpenJS Foundation, 2024', 'Emisor + año.'],
  [/Cantidad razonable/, '70 tecnologías en una lista', '15–25 tecnologías relevantes al puesto', 'Listas enormes parecen relleno de palabras clave.'],
  [/tablas/, 'Tabla de 2 columnas con habilidades', 'Lista lineal con viñetas', 'Las tablas se leen en desorden.'],
  [/columna/, 'Barra lateral con contacto y habilidades', 'Una columna, orden Harvard', 'El orden de lectura es lo primero que rompe un ATS.'],
  [/seleccionable/, 'PDF escaneado como imagen', 'PDF exportado desde Word/Docs o desde JobTrack', 'Si no puedes seleccionar el texto, el ATS tampoco.'],
  [/Extensión/, 'CV de 2 100 palabras (4 páginas)', 'CV de 450–700 palabras (1 página)', 'Menos de 10 años: una página.'],
  [/Encabezados estándar/, '«Mi recorrido» / «Lo que sé hacer»', '«Educación» / «Experiencia» / «Habilidades»', 'El ATS reconoce los nombres de sección estándar.'],
  [/Sin emojis/, '🚀 Proyectos', 'Proyectos', 'Sin símbolos decorativos.']
];
const exFor = msg => { const e = ATS_EX.find(([re]) => re.test(msg)); return e ? { bad: e[1], good: e[2], why: e[3] } : null; };
const exHtml = x => x ? `<div class="chk-ex"><div class="ex-bad"><b>✗ Mal</b><code>${esc(x.bad).replace(/\n/g, '<br>')}</code></div><div class="ex-good"><b>✓ Bien</b><code>${esc(x.good).replace(/\n/g, '<br>')}</code></div><small class="muted">${esc(x.why)}</small></div>` : '';

/* ───────────── parsing de campos: reglas únicas para el simulador y la auditoría por sección ───────────── */
const MON3 = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MON_KEY = { ene: 0, jan: 0, feb: 1, mar: 2, abr: 3, apr: 3, may: 4, jun: 5, jul: 6, ago: 7, aug: 7, set: 8, sep: 8, oct: 9, nov: 10, dic: 11, dec: 11 };
const DATE_PART = '(?:(?:Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic|Jan|Apr|Aug|Dec)\\.?\\s)?(?:19|20)\\d{2}';
const DATE_OK = new RegExp(`^${DATE_PART}(?:\\s*[–-]\\s*(?:${DATE_PART}|Presente|Present))?$`);
function normDate(str) {
  const s = String(str || '').trim(); if (!s) return null;
  const cur = /(presente|actual|actualidad|present|current|hoy|now|la fecha|date|en curso)/i.test(s);
  const re = /(?:(\d{1,2})\s*[\/.-]\s*|([A-Za-zÁÉÍÓÚáéíóú]{3,10})\.?\s+(?:de\s+|del\s+)?)?((?:19|20)\d{2})/g, parts = []; let m;
  while ((m = re.exec(s))) { let mo = null; if (m[1] && +m[1] >= 1 && +m[1] <= 12) mo = +m[1] - 1; else if (m[2]) { const k = norm(m[2]).slice(0, 3); if (k in MON_KEY) mo = MON_KEY[k]; } parts.push((mo !== null ? MON3[mo] + ' ' : '') + m[3]); }
  if (!parts.length) return null;
  if (parts.length === 1) return cur ? `${parts[0]} – Presente` : parts[0];
  return `${parts[0]} – ${cur && !/\d{4}.*\d{4}/.test(s) ? 'Presente' : parts[1]}`;
}
function parseAudit(cv) {
  const b = cv.basics || {}, jr = isJunior(cv), now = new Date().getFullYear();
  const K = (ok, msg, fix, sev, x) => ({ ok: !!ok, msg, fix: fix || '', sev: sev || (ok ? 'ok' : 'fail'), ...(x || {}) });
  const list = (arr, lab, f) => arr.map((e, i) => f(e) ? '' : `${lab} ${i + 1}${e.org || e.name || e.school ? ' («' + (e.org || e.name || e.school) + '»)' : ''}`).filter(Boolean);
  const where = a => a.length ? ` Revisa: ${a.slice(0, 4).join(', ')}${a.length > 4 ? '…' : ''}.` : '';
  const nm = (b.name || '').trim(), em = (b.email || '').trim(), ph = (b.phone || '').trim();
  const contact = [
    K(nm && nm.split(/\s+/).length >= 2 && nm.split(/\s+/).length <= 6 && !/[\d|@/\\]/.test(nm), 'Nombre completo visible', 'Escribe nombre y apellido en la primera línea, sin títulos, números ni símbolos (“Tomás Herrera”, no “TOMI | Dev”).', null, { go: 'basics.name' }),
    K(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(em), em ? 'Email presente' : 'Email presente', em ? 'El email no tiene un formato válido: revisa @ y dominio.' : 'Agrega un email visible en el encabezado.', null, { go: 'basics.email' }),
    K(!em || !/\d{3,}|_{2,}/.test(em.split('@')[0]), 'Email con aspecto profesional', 'Usa nombre.apellido@… sin números ni apodos.', 'warn', { go: 'basics.email' }),
    K(/^\+\d[\d\s().-]{7,}$/.test(ph), 'Teléfono con prefijo internacional', 'Formato +54 11 5555-0000: el parser separa el prefijo del número.', ph ? 'warn' : 'fail', { go: 'basics.phone' }),
    K(/\S+,\s*\S+/.test(b.location || ''), 'Ubicación con ciudad y país', 'Ejemplo: Buenos Aires, Argentina (los filtros por zona usan estos dos datos).', 'warn', { go: 'basics.location' })
  ];
  const links = [b.linkedin, b.github, b.web].filter(Boolean);
  if (links.length) contact.push(K(links.every(l => /(\.[a-z]{2,}|linkedin|github)/i.test(l) && !/\s/.test(l.trim())), 'Enlaces con formato válido', 'Cada enlace debe ser una dirección sin espacios (linkedin.com/in/usuario).', 'warn', { go: b.linkedin ? 'basics.linkedin' : b.github ? 'basics.github' : 'basics.web' }));
  const jobBlock = (arr, lab, key) => {
    const o = [];
    const G = (pred, f) => { const i = arr.findIndex(e => !pred(e)); return i < 0 ? {} : { go: `${key}.${i}.${f}` }; };
    const firstMiss = (() => { for (let i = 0; i < arr.length; i++) { const e = arr[i]; if (!(e.org || '').trim()) return { go: `${key}.${i}.org` }; if (!(e.role || '').trim()) return { go: `${key}.${i}.role` }; if (!yearsOf(e.dates || '')) return { go: `${key}.${i}.dates` }; } return {}; })();
    const DT = { act: 'norm-dates', actLabel: 'Normalizar fechas' };
    if (!arr.length) return o;
    const noOrg = list(arr, lab, e => (e.org || '').trim()), noRole = list(arr, lab, e => (e.role || '').trim()), noDate = list(arr, lab, e => yearsOf(e.dates || '')), badFmt = list(arr, lab, e => !yearsOf(e.dates || '') || DATE_OK.test((e.dates || '').trim())), noRange = list(arr, lab, e => !yearsOf(e.dates || '') || /–/.test(normDate(e.dates) || '')), rev = list(arr, lab, e => { const ys = ((e.dates || '').match(/(?:19|20)\d{2}/g) || []).map(Number); return !(ys.length >= 2 && ys[0] > ys[1]) && !ys.some(y => y > now + 1); });
    o.push(K(!noOrg.length && !noRole.length && !noDate.length, 'Cada puesto con organización, rol y fechas', `Faltan datos que el parser necesita para calcular tu antigüedad.${where([...new Set([...noOrg, ...noRole, ...noDate])])}`, jr ? 'warn' : 'fail', firstMiss));
    o.push(K(!badFmt.length, 'Fechas en formato Mmm AAAA – Mmm AAAA o Presente', `El ATS lee mejor “Mar 2023 – Presente”. Formatos como “03/2023 a la fecha” se interpretan mal. Usa el botón «Normalizar fechas».${where(badFmt)}`, 'warn', { ...G(e => !yearsOf(e.dates || '') || DATE_OK.test((e.dates || '').trim()), 'dates'), ...DT }));
    o.push(K(!noRange.length, 'Cada puesto con fecha de inicio y de fin', `Un solo año no permite calcular duración: indica inicio – fin o Presente.${where(noRange)}`, 'warn', { ...G(e => !yearsOf(e.dates || '') || /–/.test(normDate(e.dates) || ''), 'dates'), ...DT }));
    o.push(K(!rev.length, 'Rango de fechas coherente', `El inicio debe ser anterior al fin y no estar en el futuro.${where(rev)}`, null, G(e => { const ys = ((e.dates || '').match(/(?:19|20)\d{2}/g) || []).map(Number); return !(ys.length >= 2 && ys[0] > ys[1]) && !ys.some(y => y > now + 1); }, 'dates')));
    return o;
  };
  const edu = cv.education || [];
  const education = edu.length ? (() => {
    const noS = list(edu, 'Formación', e => (e.school || '').trim()), noD = list(edu, 'Formación', e => (e.degree || '').trim()), noY = list(edu, 'Formación', e => yearsOf(e.dates || '')), bad = list(edu, 'Formación', e => !yearsOf(e.dates || '') || DATE_OK.test((e.dates || '').trim()));
    return [
      K(!noS.length && !noD.length, 'Cada formación tiene institución y título', `Completa institución y título o programa.${where([...new Set([...noS, ...noD])])}`, null, (() => { const i = edu.findIndex(e => !(e.school || '').trim() || !(e.degree || '').trim()); return i < 0 ? {} : { go: `education.${i}.${(edu[i].school || '').trim() ? 'degree' : 'school'}` }; })()),
      K(!noY.length, 'Fechas legibles en cada formación', `Incluye un año (aunque sea de finalización prevista): “en curso” sin año se pierde.${where(noY)}`, 'warn', (() => { const i = edu.findIndex(e => !yearsOf(e.dates || '')); return i < 0 ? {} : { go: `education.${i}.dates` }; })()),
      K(!bad.length, 'Fechas en formato AAAA – AAAA', `Usa “2019 – 2022” o “2022 – Presente”.${where(bad)}`, 'warn', (() => { const i = edu.findIndex(e => yearsOf(e.dates || '') && !DATE_OK.test((e.dates || '').trim())); return i < 0 ? {} : { go: `education.${i}.dates`, act: 'norm-dates', actLabel: 'Normalizar fechas' }; })())
    ];
  })() : [];
  return { contact, experience: jobBlock(cv.experience || [], 'Puesto', 'experience'), leadership: jobBlock(cv.leadership || [], 'Actividad', 'leadership'), education };
}
function parsedRowsHtml(cv) {
  const rows = [...(cv.experience || []).map(e => ['Experiencia', e]), ...(cv.leadership || []).map(e => ['Actividad', e])];
  const ed = (cv.education || []).map(e => ['Educación', { org: e.school, role: e.degree, dates: e.dates }]);
  const all = rows.concat(ed); if (!all.length) return '';
  const cell = (v, ok) => `<td class="${ok ? '' : 'pr-bad'}">${v ? esc(v) : '<i>no detectado</i>'}</td>`;
  return `<table class="ats-parsed"><thead><tr><th>Bloque</th><th>Organización</th><th>Rol / título</th><th>Fechas leídas</th><th>Duración</th><th></th></tr></thead><tbody>${all.map(([k, e]) => { const y = yearsOf(e.dates || ''), okd = y && DATE_OK.test((e.dates || '').trim()), nd = normDate(e.dates); const dur = y ? `${y.b - y.a || '<1'} año${y.b - y.a === 1 ? '' : 's'}` : '—'; return `<tr><td>${k}</td>${cell(e.org, (e.org || '').trim())}${cell(e.role, (e.role || '').trim())}${cell(e.dates, okd)}<td>${dur}</td><td>${okd ? '<span class="badge b-ok">✓</span>' : y ? `<span class="badge b-warn" title="Formato sugerido">→ ${esc(nd || '')}</span>` : '<span class="badge b-bad">✗</span>'}</td></tr>`; }).join('')}</tbody></table>`;
}

/* ───────────── perfil con poca o nula experiencia ───────────── */
const isJunior = cv => totalYears(cv) < 2;
function juniorTips(cv) {
  const A = cv.area, des = A === 'Diseño', it = A === 'IT';
  const proj = it ? 'Desarrollé una API REST con Node.js y PostgreSQL en el proyecto final del bootcamp: 6 endpoints, 40 pruebas automatizadas y despliegue en Render, usada por 15 compañeros.' : des ? 'Rediseñé la app de un comercio local en Figma tras 8 entrevistas, reduciendo de 5 a 3 pasos el flujo de compra; presentado en un caso de estudio en Behance.' : 'Organicé el inventario de un comercio familiar en Excel con 300 productos, reduciendo 50 % el tiempo de reposición durante 3 meses.';
  return [
    ['Ordena el CV para que lo mejor vaya arriba', 'Educación → Proyectos → Experiencia/Prácticas → Habilidades. Sin experiencia laboral, los proyectos pasan a ser tu “experiencia”.', 'Educación · Proyectos · Voluntariado · Habilidades'],
    ['Convierte proyectos y estudios en logros (fórmula XYZ)', 'Un proyecto académico o personal vale como experiencia si indicas alcance, herramienta y resultado.', proj],
    ['Escribe un resumen objetivo de 2 líneas', 'Dice a qué puesto aspiras y qué aportas; ayuda al ATS a asociarte con el título de la oferta.', it ? 'Desarrollador backend junior (Node.js/PostgreSQL) con 3 proyectos desplegados y bootcamp Full Stack; busco mi primera posición en un equipo de producto.' : des ? 'Diseñador UX/UI junior con portafolio de 4 casos en Behance y dominio de Figma; busco sumarme a un equipo de producto digital.' : 'Profesional junior orientado a [área]; busco mi primera experiencia aportando organización, atención al detalle y herramientas de ofimática.'],
    ['Cursos, bootcamps y certificaciones cuentan', 'Con año y emisor, el ATS los lee como formación relevante.', 'Bootcamp Full Stack — Digital House, 2022 · Certificación Node.js — OpenJS Foundation, 2024'],
    ['Suma voluntariado, hackathons, comunidades y trabajos informales', 'Todo trabajo real (freelance, familiar, ayudantía) se redacta con verbo + resultado, aunque no tenga contrato.', 'Mentoricé a 12 estudiantes en fundamentos de JavaScript como voluntario en una comunidad de programación (2022 – Presente).'],
    ['Respalda cada habilidad con evidencia', 'No listes tecnologías sueltas: cada una debe aparecer en un proyecto, curso o práctica.', 'Habilidades: Docker → viñeta: “Desplegué la API en contenedores Docker en Render”.'],
    [it ? 'Enlaza GitHub con proyectos limpios' : des ? 'Enlaza tu portafolio con 3–4 casos de estudio' : 'Enlaza tu LinkedIn completo', 'Para perfiles junior, el enlace es la prueba de lo que dices.', it ? 'GitHub · README claro, capturas y demo en vivo' : des ? 'Behance · Problema → proceso → resultado' : 'LinkedIn · foto, titular y recomendaciones'],
    ['Usa las palabras de la oferta en tus proyectos', 'Lee la oferta y refleja con honestidad lo que sí hiciste con esas herramientas (curso, proyecto, práctica).', 'Oferta: “Node.js, Express, SQL” → Proyecto: “API con Node.js, Express y PostgreSQL”.'],
    ['Evita huecos sin explicar y mentir en el nivel', 'Si estudias, indica “2023 – Presente (finalización prevista 2026)”. No exageres: en la entrevista te piden demostrarlo.', 'Ingeniería en Sistemas (en curso) — UTN, 2022 – 2027 (3.º año aprobado)']
  ];
}
const juniorHtml = cv => `<div class="tip audit jr"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h4>🌱 Perfil con poca o nula experiencia</h4><span class="badge b-info">${Math.round(totalYears(cv) * 10) / 10} años detectados</span></div><p>Tu CV puede puntuar bien en un ATS sin experiencia laboral: se trata de mostrar evidencia (proyectos, estudios, práctica) con las mismas reglas de palabras clave y métricas.</p>${juniorTips(cv).map(([h, w, ex]) => `<div class="chk no" style="margin-top:8px"><i>★</i><div><b>${esc(h)}</b> <span class="muted">${esc(w)}</span><div class="chk-ex"><div class="ex-good"><b>Ejemplo</b><code>${esc(ex)}</code></div></div></div></div>`).join('')}</div>`;

/* ───────────── simulación del proceso del ATS ───────────── */
const PHI = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
const LANG_RE = [[/ingl[eé]s|english/i, 'Inglés'], [/portugu[eé]s|portuguese/i, 'Portugués'], [/franc[eé]s|french/i, 'Francés'], [/alem[aá]n|german/i, 'Alemán']];
function atsSimulate(cv, offer) {
  const an = analyzeCv(cv), b = cv.basics || {}, m0 = cv.meta || {}, S_ = [];
  const D = (ok, msg, fix, sev) => ({ ok: !!ok, msg, fix: fix || '', sev: sev || (ok ? 'ok' : 'fail') });
  const stat = d => d.some(x => !x.ok && x.sev === 'fail') ? 'fail' : d.some(x => !x.ok) ? 'warn' : 'pass';
  const step = (id, title, what, d, extra = {}) => S_.push({ id, title, what, d, st: stat(d), ...extra });
  const ext = (m0.ext || 'manual').toLowerCase();
  // 1 recepción
  step(1, 'Recepción del archivo', 'El ATS recibe el archivo y comprueba que sea un formato que puede abrir.', [
    D(['pdf', 'docx', 'txt', 'manual', 'json', 'md'].includes(ext), `Formato «.${ext === 'manual' ? 'pdf/docx (generado)' : ext}»`, 'Usa PDF con texto o .docx; evita .pages, .odt, imágenes y archivos protegidos.'),
    D(!m0.noText, 'El archivo contiene texto seleccionable', 'Exporta el CV como PDF desde Word/Docs; un escaneo se lee como imagen vacía.'),
    D(!cv.fileName || !/\s{2,}|[^\w.\- ()áéíóúñÁÉÍÓÚÑ]/.test(cv.fileName), 'Nombre de archivo limpio', 'Usa «Nombre-Apellido-CV.pdf», sin símbolos raros.', 'warn')
  ]);
  // 2 extracción
  const plain = cvPlain(cv);
  step(2, 'Extracción del texto', 'El ATS convierte el archivo en texto plano, de arriba abajo y de izquierda a derecha. Aquí ves ese texto.', [
    D(!m0.hasTables, 'Sin tablas ni separadores “|”', 'Las tablas se leen mezclando celdas: usa texto lineal.'),
    D(!m0.multiColumn, 'Una sola columna', 'Dos columnas intercalan líneas de cada una: usa orden Harvard.'),
    D(!m0.emoji, 'Sin emojis ni íconos', 'Quítalos: aparecen como caracteres basura.', 'warn'),
    D(plain.split(/\s+/).length >= 120, `Texto extraído suficiente (${plain.split(/\s+/).length} palabras)`, 'Si el texto extraído es muy corto, el parser perdió contenido.')
  ], { view: `<pre class="ats-pre">${esc(plain.slice(0, 1600))}${plain.length > 1600 ? '\n…' : ''}</pre>` });
  // 3 secciones
  const has = { edu: (cv.education || []).length, exp: (cv.experience || []).length, sk: /\S/.test(Object.values(cv.skills || {}).join('')), pr: (cv.projects || []).length };
  const jr = isJunior(cv);
  step(3, 'Reconocimiento de secciones', 'Busca encabezados estándar para clasificar cada bloque (Educación, Experiencia, Habilidades…).', [
    D(has.exp || jr, 'Sección «Experiencia»', 'Usa exactamente «Experiencia» / «Experience». Si no tienes, agrega «Proyectos» o «Prácticas».', has.exp ? 'ok' : 'fail'),
    D(has.edu, 'Sección «Educación»', 'Agrega tu formación principal, aunque sea un curso.'),
    D(has.sk, 'Sección «Habilidades»', 'Añade «Habilidades» con las herramientas en texto plano.'),
    D(!jr || has.pr, jr ? 'Proyectos (clave si tienes poca experiencia)' : 'Proyectos (opcional)', 'Con poca experiencia los proyectos reemplazan al empleo: agrega 2–3 con enlace y resultado.', jr && !has.pr ? 'fail' : 'warn'),
    D(!cv.parsedPoorly, 'Encabezados reconocidos sin ambigüedad', 'Revisa el orden de secciones en el editor.', 'warn')
  ]);
  // 4 campos
  const exps = (cv.experience || []).concat(cv.leadership || []), yrs = an.stats.years;
  const PA = parseAudit(cv), toD = c => D(c.ok, c.msg, c.fix, c.ok ? 'ok' : c.sev);
  step(4, 'Extracción de campos (parsing)', 'Separa nombre, contacto, puestos, empresas, fechas y estudios; con las fechas calcula cuántos años de experiencia tienes.', [
    ...PA.contact.map(toD), ...PA.experience.map(toD), ...PA.leadership.map(toD), ...PA.education.map(toD),
    D(exps.length || jr, exps.length ? 'Hay puestos para extraer' : 'Sin puestos registrados', 'Agrega al menos un puesto, práctica o proyecto con fechas.', jr ? 'warn' : 'fail'),
    D(true, `El ATS calcularía ≈ ${Math.round(yrs * 10) / 10} años de experiencia`, '')
  ], { view: `${parsedRowsHtml(cv)}<div class="ats-fields">${[['Nombre', b.name], ['Email', b.email], ['Teléfono', b.phone], ['Ubicación', b.location], ['Enlaces', cvLinks(cv).map(l => l.label).join(' · ')], ['Experiencia calculada', `≈ ${Math.round(yrs * 10) / 10} años`], ['Último puesto', exps[0] ? `${exps[0].role || '—'} @ ${exps[0].org || '—'}` : '—'], ['Formación', (cv.education || [])[0] ? `${cv.education[0].degree || '—'} · ${cv.education[0].school || ''}` : '—']].map(([k, v]) => `<div><small>${k}</small><b class="${v ? '' : 'miss'}">${esc(v || 'No detectado')}</b></div>`).join('')}</div>` });
  // 5-7 requieren oferta
  let m = null, score = null;
  if (offer) {
    m = matchOffer(offer, cv); score = m.score;
    const txt = offer.text || '', K = [];
    const minY = offer.years || 0; K.push(D(!minY || yrs >= minY, minY ? `Años de experiencia: piden ${minY}+, tu CV refleja ≈ ${Math.round(yrs * 10) / 10}` : 'Años de experiencia: la oferta no fija mínimo', jr ? 'Con menos años, destaca proyectos y prácticas, y postula igual a roles junior/trainee.' : 'Si tienes más experiencia, detállala con fechas completas.', minY && yrs < minY * 0.6 ? 'fail' : 'warn'));
    LANG_RE.forEach(([re, nm]) => { if (re.test(txt)) { const ok = re.test(String(cv.skills && cv.skills.languages || '')); K.push(D(ok, `Idioma requerido: ${nm}${ok ? ' (presente en tu CV)' : ' (no aparece en tu CV)'}`, `Añade «${nm} B2» en Idiomas si realmente lo tienes.`)); } });
    if (/(t[ií]tulo|licenciatura|ingenier[ií]a|universitari[oa]|bachelor|degree|terciari[oa]|tecnicatura|grado)/i.test(txt)) K.push(D((cv.education || []).some(e => /(licenciatura|ingenier|tecnicatura|universit|grado|bachelor|degree|tecnolog|master|m[aá]ster|diplomatura|bootcamp)/i.test(e.degree + ' ' + e.school)), 'Formación: la oferta pide estudios formales', 'Indica título, institución y estado (“en curso”, año previsto).', 'warn'));
    if (/(certificaci[oó]n|certificado|certified)/i.test(txt)) K.push(D(!!(cv.skills && cv.skills.certs), 'Certificaciones mencionadas en la oferta', 'Agrega certificaciones con emisor y año.', 'warn'));
    if (offer.modality && offer.modality !== 'Remoto' && offer.location && b.location) { const t = s => norm(s).split(/[^a-z]+/).filter(x => x.length > 3); const ok = t(offer.location).some(x => t(b.location).includes(x)); K.push(D(ok, `Ubicación: oferta ${offer.modality.toLowerCase()} en ${offer.location}`, 'Si estás dispuesto a mudarte o viajar, indícalo en el resumen.', 'warn')); }
    const tt = norm(offer.title).split(/[^a-z0-9+#.]+/).filter(t => t.length > 3 && !STOP.has(t)), cvN = norm(cvText(cv));
    K.push(D(!tt.length || tt.some(t => cvN.includes(t)), 'Coincidencia con el título del puesto', `Incluye «${offer.title}» o un título equivalente en tu puesto objetivo/resumen.`, 'warn'));
    const sen = /(senior|\bsr\b|lead|l[ií]der|principal)/i.test(offer.title); K.push(D(!sen || yrs >= 4, sen ? 'Seniority: la oferta es senior' : 'Seniority compatible con la oferta', 'Postula a roles semi-senior/junior o muestra liderazgo con resultados medibles.', 'warn'));
    step(5, 'Filtros eliminatorios (knockout)', 'Antes de puntuar, el ATS descarta a quien no cumple requisitos duros: años, idioma, ubicación, formación.', K, { offerNeeded: true });
    const must = m.missing.filter(i => i.must), cov = m.coverage;
    step(6, 'Coincidencia de palabras clave', 'Compara los términos de la oferta con los de tu CV (con sinónimos). Las obligatorias pesan más.', [
      D(cov >= 70, `Cobertura de la oferta: ${cov} %`, 'Sube la cobertura incorporando (con honestidad) las palabras clave que faltan.', cov >= 45 ? 'warn' : 'fail'),
      D(!must.length, must.length ? `Faltan ${must.length} requisito(s) obligatorio(s): ${must.slice(0, 5).map(i => i.k).join(', ')}` : 'No faltan requisitos obligatorios', 'Estos suelen ser filtros duros: añádelos solo si los has usado.', must.length >= 3 ? 'fail' : 'warn'),
      D(!m.stuffing, m.stuffing ? 'Posible saturación de palabras clave' : 'Sin saturación de palabras clave', 'Repetir una keyword 9+ veces se detecta y se penaliza.', 'warn'),
      D(m.cosine >= 35, `Similitud semántica con la oferta: ${m.cosine} %`, 'Usa el vocabulario de la oferta al describir tus funciones.', 'warn')
    ], { view: `<div class="tg-box"><div class="tg-row">${m.matched.slice(0, 14).map(i => `<span class="tag-chip tg-ok">${esc(i.k)}</span>`).join('')}${m.partial.slice(0, 6).map(i => `<span class="tag-chip tg-mid">${esc(i.k)}</span>`).join('')}${m.missing.filter(i => i.cat !== 'term').slice(0, 12).map(i => `<span class="tag-chip tg-no">${esc(i.k)}${i.must ? ' <small>obligatoria</small>' : ''}</span>`).join('')}</div><small class="muted">Verde: presentes · Amarillo: parcial · Rojo: faltan</small></div>`, offerNeeded: true });
    const pct = Math.round(PHI((score - 52) / 16) * 100), band = bandOf(score);
    step(7, 'Puntaje y ranking', 'El ATS ordena a los candidatos por puntaje y muestra primero a los mejores. 80–100: listo para entrevista · 60–79: riesgo moderado · < 60: no pasa el filtro.', [
      D(score >= 80, `Tu puntaje simulado: ${score}/100 (${band.label || ''})`, 'Corrige primero los pasos en rojo; cada requisito obligatorio añadido sube bastante el puntaje.', score >= 60 ? 'warn' : 'fail'),
      D(pct >= 70, `Posición estimada: mejor que ≈ ${pct} % de los candidatos típicos`, 'Estimación orientativa; depende de quién más postule.', 'warn')
    ], { view: `<div style="display:flex;gap:16px;align-items:center">${ringSvg({ pct: score / 100, color: bandColor(score), center: score, sub: 'puntaje', size: 110, stroke: 11 })}<div class="ats-bar"><i style="width:${pct}%"></i><span>≈ percentil ${pct}</span></div></div>`, offerNeeded: true });
  }
  // 8 reclutador
  const fails = S_.filter(s => s.st === 'fail'), blocked = fails[0];
  const reach = !blocked && (score == null || score >= 60) ? (score != null && score < 80 ? 'maybe' : 'yes') : 'no';
  const top = (m ? m.matched.map(i => i.k) : (extractKeywords(cvText(cv), '').keywords || []).filter(k => k.cat !== 'term').map(k => k.k)).slice(0, 6);
  const lastJob = exps[0], lb = lastJob ? (lastJob.bullets || []).filter(Boolean).slice(0, 3) : [];
  const flags = []; if (an.stats.metR < 0.4) flags.push('Pocas métricas en las viñetas'); if (an.stats.weakN) flags.push('Frases débiles (“responsable de…”)'); if (!b.email) flags.push('Sin email'); if (an.stats.words < 180) flags.push('CV muy corto'); if (jr && !has.pr) flags.push('Sin proyectos que respalden la poca experiencia');
  step(8, 'Revisión del reclutador (6–10 segundos)', 'Si el ATS lo deja pasar, una persona lo mira muy rápido: nombre, último puesto, años, estudios y logros.', [
    D(reach !== 'no', reach === 'yes' ? 'Tu CV llega a la pila del reclutador' : reach === 'maybe' ? 'Llegaría solo si hay pocos candidatos mejor puntuados' : `Se detiene antes: ${blocked ? 'paso ' + blocked.id + ' · ' + blocked.title : 'ranking bajo'}`, reach === 'no' ? 'Corrige el primer paso en rojo y vuelve a simular.' : 'Mejora logros y palabras clave para pasar de “quizá” a “seguro”.', reach === 'maybe' ? 'warn' : 'fail'),
    D(!flags.length, flags.length ? 'Señales de alerta: ' + flags.join(' · ') : 'Sin señales de alerta rápidas', 'Cada alerta resta credibilidad en la lectura rápida.', 'warn')
  ], { view: `<div class="rec-card"><div class="rc-h"><b>${esc(b.name || 'Candidato')}</b><span>${esc(lastJob ? `${lastJob.role || ''} · ${lastJob.org || ''}` : (cv.education || [])[0] ? ((cv.education[0].degree || '') + ' · ' + (cv.education[0].school || '')) : '—')}</span></div><div class="rc-g"><div><small>Experiencia</small><b>≈ ${Math.round(yrs * 10) / 10} años</b></div><div><small>Ubicación</small><b>${esc(b.location || '—')}</b></div><div><small>Match</small><b>${score != null ? score + ' %' : '—'}</b></div></div><div class="tg-row">${top.map(k => `<span class="tag-chip tg-ok">${esc(k)}</span>`).join('') || '<small class="muted">Sin habilidades detectadas</small>'}</div>${lb.length ? `<ul>${lb.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>`, final: true });
  return { steps: S_, reach, blocked, score, an, jr };
}

/* ───────────── pantalla del simulador ───────────── */
const ATS_UI = { running: false };
function renderAts() {
  const cs = $('#atsCv'), os = $('#atsOffer'), pc = cs.value, po = os.value;
  cs.innerHTML = S.cvs.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('') || '<option value="">Sin CVs</option>';
  os.innerHTML = '<option value="">Sin oferta (solo lectura y formato del CV)</option>' + [...S.offers].sort((a, b) => b.createdAt - a.createdAt).map(o => `<option value="${o.id}">${esc(o.title)} — ${esc(o.company)}</option>`).join('');
  if (pc && getCv(pc)) cs.value = pc; if (po && getOffer(po)) os.value = po;
}
const ST_ICON = { pass: ['b-ok', '✓ Pasa'], warn: ['b-warn', '! Riesgo'], fail: ['b-bad', '✗ Falla'] };
async function runAtsSim(e) {
  if (e) e.preventDefault(); if (ATS_UI.running) return;
  const cv = getCv($('#atsCv').value); if (!cv) return toast('Selecciona un CV', 'Sube o crea un CV primero.', 'warn');
  const offer = getOffer($('#atsOffer').value) || null; ATS_UI.running = true;
  const box = $('#atsFlow'), res = atsSimulate(cv, offer); box.innerHTML = ''; $('#atsVerdict').hidden = true;
  $('#atsStatus').textContent = `Simulando el proceso para «${cv.name}»${offer ? ' → ' + offer.title + ' · ' + offer.company : ''}…`;
  if (!offer) box.insertAdjacentHTML('beforeend', '<div class="note warn" style="margin-bottom:12px"><i data-ic="info"></i><span>Elige una <b>oferta</b> para simular también los filtros eliminatorios, las palabras clave y el ranking (pasos 5 a 7).</span></div>');
  for (const s of res.steps) {
    const row = document.createElement('div'); row.className = 'ats-step run'; row.innerHTML = `<div class="ats-n">${s.id}</div><div class="ats-b"><h4>${esc(s.title)} <span class="typing"><i></i><i></i><i></i></span></h4><p>${esc(s.what)}</p></div>`;
    box.appendChild(row); row.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); await sleep(420);
    const [cls, lab] = ST_ICON[s.st];
    row.className = 'ats-step ' + s.st; row.innerHTML = `<div class="ats-n">${s.id}</div><div class="ats-b"><h4>${esc(s.title)} <span class="badge ${cls}">${lab}</span></h4><p>${esc(s.what)}</p>${s.view || ''}<div class="ats-checks">${s.d.map(c => `<div class="chk ${c.ok ? 'ok' : 'no'}"><i>${c.ok ? '✓' : c.sev === 'warn' ? '!' : '✗'}</i><div><b>${esc(c.msg)}</b>${c.ok ? '' : `<span class="muted"> ${esc(c.fix)}</span>${exHtml(exFor(c.msg))}`}</div></div>`).join('')}</div></div>`;
    if (s.id === 4 && s.st !== 'pass') row.querySelector('.ats-b').insertAdjacentHTML('beforeend', `<div class="ats-fixbar"><span>Puedo corregir automáticamente nombre, email, teléfono, fechas, enlaces y orden. Lo que dependa de tus datos queda listado.</span><button class="btn btn-sm btn-primary" data-act="ats-fix" data-cv="${cv.id}" data-offer="${offer ? offer.id : ''}">⚡ Corregir automáticamente</button></div>`);
    if (s.st === 'fail' && res.blocked && s === res.blocked) row.insertAdjacentHTML('beforeend', '<div class="ats-stop">⛔ Aquí se detendría el proceso real</div>');
  }
  // veredicto
  const V = { yes: ['b-ok', '✅ Tu CV llegaría al reclutador', 'Supera los filtros automáticos con buen puntaje.'], maybe: ['b-warn', '⚠️ Llegaría con riesgo', 'Pasa los filtros duros pero queda en zona media: depende de cuántos candidatos haya.'], no: ['b-bad', '⛔ Se quedaría en el filtro del ATS', res.blocked ? `El primer punto de falla es el paso ${res.blocked.id}: ${res.blocked.title}.` : 'El puntaje queda por debajo del umbral habitual (60).'] }[res.reach];
  const fixes = res.steps.flatMap(s => s.d.filter(c => !c.ok).map(c => ({ s, c }))).sort((a, b) => (a.c.sev === 'fail' ? 0 : 1) - (b.c.sev === 'fail' ? 0 : 1) || a.s.id - b.s.id).slice(0, 8);
  const vb = $('#atsVerdict'); vb.hidden = false;
  vb.innerHTML = `<header class="card-h"><div><h3>${V[1]}</h3><p>${esc(V[2])}</p></div><span class="badge ${V[0]}">${res.reach === 'yes' ? 'Pasa' : res.reach === 'maybe' ? 'Riesgo' : 'No pasa'}</span></header>
  <div class="an-h">Dónde estás fallando y cómo corregirlo (por prioridad)</div>
  ${fixes.length ? fixes.map((f, i) => `<div class="cons-list"><div class="it"><div class="n">${i + 1}</div><div><b>Paso ${f.s.id} · ${esc(f.c.msg)}</b><div class="muted" style="font-size:12.5px">${esc(f.c.fix)}</div>${exHtml(exFor(f.c.msg))}</div></div></div>`).join('') : '<div class="note"><i data-ic="check"></i><span>No hay correcciones pendientes en esta simulación.</span></div>'}
  <div class="btn-group" style="margin-top:14px"><button class="btn btn-primary" data-act="ats-fix" data-cv="${cv.id}" data-offer="${offer ? offer.id : ''}">⚡ Corregir automáticamente</button><button class="btn" data-act="cv-edit" data-id="${cv.id}">Abrir el editor del CV</button>${offer ? `<button class="btn" data-act="ats-opt" data-cv="${cv.id}" data-offer="${offer.id}">Optimizar para esta oferta</button><button class="btn" data-act="pack-open" data-cv="${cv.id}" data-offer="${offer.id}">Carta y email para esta oferta</button>` : ''}</div>
  ${res.jr ? `<div style="margin-top:16px">${juniorHtml(cv)}</div>` : ''}`;
  hydrateIcons(vb); vb.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); $('#atsStatus').textContent = 'Simulación completada.'; ATS_UI.running = false;
}
/* ==========================================================================
   p10 · Paquete de postulación: carta de presentación + email por oferta
   ========================================================================== */
function letterLayout(L) {
  const { W, H, ML, MR, MT, MB } = PG, CW = W - ML - MR, pages = [[]]; let y = MT + 8, pi = 0; const SZ = 11, LH = 1.42;
  const room = h => { if (y + h > H - MB) { pages.push([]); pi++; y = MT; } };
  const put = (text, size = SZ, f = 'R', x = ML, extra = {}) => { room(size * LH); pages[pi].push({ t: 'text', x, y: y + size * 0.92, text, size, f, ...extra }); y += size * LH; };
  put(L.name || '', 18, 'B'); y += 2;
  if (L.contact) put(L.contact, 10);
  if (L.links && L.links.length) { room(14); let x = ML; L.links.forEach((l, i) => { if (i) { pages[pi].push({ t: 'text', x, y: y + 9.2, text: ' · ', size: 10, f: 'R' }); x += textW(' · ', 10); } pages[pi].push({ t: 'text', x, y: y + 9.2, text: l.label, size: 10, f: 'R', link: l.url }); x += textW(l.label, 10); }); y += 14; }
  pages[pi].push({ t: 'rule', x1: ML, x2: W - MR, y: y + 3 }); y += 16;
  if (L.date) { put(L.date, SZ); y += 6; }
  String(L.body || '').split(/\n/).forEach(par => { if (!par.trim()) { y += 6; return; } wrapText(par, SZ, 'R', CW).forEach(l => put(l)); });
  return pages;
}
const letterPdf = L => pdfFromPages(letterLayout(L), `Carta de presentación - ${L.name}`, L.name || '');

function buildPackage(cv, offer, opt = {}) {
  const b = cv.basics || {}, m = matchOffer(offer, cv), es = isEs(offer.text || offer.title), yrs = Math.round(totalYears(cv) * 10) / 10, jr = yrs < 2;
  const top = m.matched.slice(0, 4).map(i => i.k), list = a => a.length > 1 ? a.slice(0, -1).join(', ') + (es ? ' y ' : ' and ') + a[a.length - 1] : (a[0] || (es ? 'las tecnologías y herramientas del puesto' : 'the tools and skills of the role'));
  const bl = allBullets(cv), good = bl.filter(x => bulletCheck(x).xyz), best = good[0] || bl.find(x => bulletCheck(x).metric) || bl[0], second = good[1] || bl.filter(x => bulletCheck(x).metric)[1];
  const lc = s => s ? s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, '') : '';
  const proj = (cv.projects || [])[0], link = cvLinks(cv)[0];
  const hello = opt.contactName ? (es ? `Estimado/a ${opt.contactName}:` : `Dear ${opt.contactName},`) : (es ? `Estimado equipo de selección de ${offer.company}:` : `Dear ${offer.company} hiring team,`);
  const why = opt.motive && opt.motive.trim() ? opt.motive.trim() : (es ? `[Escribe aquí 1 frase real sobre ${offer.company}: su producto, misión, tecnología o cultura que te atrae]` : `[Add one real sentence about ${offer.company}: product, mission, stack or culture that attracts you]`);
  const exp1 = jr
    ? (es ? `Si bien estoy comenzando mi carrera, he desarrollado ${proj ? `el proyecto «${proj.name}»` : 'proyectos propios'} y formación en ${list(top)}, áreas centrales para este puesto.` : `Although I am starting my career, I have built ${proj ? `the project “${proj.name}”` : 'personal projects'} and trained in ${list(top)}, which are central to this role.`)
    : (es ? `Cuento con ${yrs} años de experiencia y trabajo habitualmente con ${list(top)}, que son centrales para esta posición.` : `I bring ${yrs} years of experience working with ${list(top)}, which are central to this role.`);
  const par2 = best ? (es ? `Entre mis logros: ${lc(best)}.${second ? ` Además, ${lc(second)}.` : ''}` : `Among my achievements: ${lc(best)}.${second ? ` I also ${lc(second)}.` : ''}`) : '';
  const missing = m.missing.filter(i => i.must).slice(0, 2).map(i => i.k);
  const par3 = missing.length ? (es ? `Aunque aún estoy profundizando en ${list(missing)}, aprendo rápido y ya trabajo en ello.` : `Although I am still deepening my knowledge of ${list(missing)}, I learn quickly and I am working on it.`) : '';
  const today = new Date().toLocaleDateString(es ? 'es-AR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const sign = es ? 'Saludos cordiales,' : 'Kind regards,', contact = [b.location, b.email, b.phone].filter(Boolean).join(' · ');
  const body = [hello, '', es ? `Me dirijo a ustedes para postularme al puesto de ${offer.title} en ${offer.company}. ${exp1}` : `I am writing to apply for the ${offer.title} position at ${offer.company}. ${exp1}`, '', par2, par2 ? '' : null, par3, par3 ? '' : null, why, '', es ? 'Adjunto mi CV y quedo a disposición para una entrevista cuando lo consideren oportuno.' : 'I attach my CV and remain available for an interview at your convenience.', '', sign, b.name || ''].filter(x => x !== null).join('\n').replace(/\n{3,}/g, '\n\n');
  const subject = es ? `Postulación: ${offer.title} — ${b.name || ''}` : `Application: ${offer.title} — ${b.name || ''}`;
  const sum1 = best ? (es ? ` Un logro reciente: ${lc(best)}.` : ` A recent achievement: ${lc(best)}.`) : '';
  const emailBody = [hello, '', es ? `Me postulo al puesto de ${offer.title}. ${jr ? `Soy un perfil junior con proyectos y formación en ${list(top)}.` : `Tengo ${yrs} años de experiencia con ${list(top)}.`}${sum1}` : `I am applying for the ${offer.title} role. ${jr ? `I am a junior profile with projects and training in ${list(top)}.` : `I have ${yrs} years of experience with ${list(top)}.`}${sum1}`, '', es ? 'Adjunto mi CV (PDF) y carta de presentación.' : 'Please find my CV (PDF) and cover letter attached.', link ? (es ? `Puedes ver mi trabajo en: ${link.url}` : `You can see my work at: ${link.url}`) : null, '', sign, b.name || '', [b.phone, b.email].filter(Boolean).join(' · ')].filter(x => x !== null).join('\n').replace(/\n{3,}/g, '\n\n');
  return { letter: body, subject, email: emailBody, header: { name: b.name || '', contact, links: cvLinks(cv), date: today }, es };
}
function openPackage(cvId, offerId) {
  const cv = getCv(cvId), o = getOffer(offerId); if (!cv || !o) return toast('Falta el CV o la oferta', 'Carga primero la oferta en Postulaciones.', 'warn');
  const st = { contactName: o.contactName || '', motive: o.motive || '', to: o.contactEmail || '' }; let pk = buildPackage(cv, o, st);
  const box = openModal(`${modalHead('Paquete de postulación', `${esc(cv.name)} → ${esc(o.title)} · ${esc(o.company)}`)}
  <div class="m-b"><div class="grid" style="grid-template-columns:300px 1fr;gap:20px"><div class="form" style="gap:12px">
    <label>Email de la empresa / reclutador<input id="pkTo" type="email" value="${esc(st.to)}" placeholder="talento@empresa.com"></label>
    <label>Nombre del reclutador (opcional)<input id="pkName" value="${esc(st.contactName)}" placeholder="Laura Gómez"></label>
    <label>¿Por qué esta empresa? (1–2 frases reales)<textarea id="pkMotive" rows="4" placeholder="Me atrae vuestro enfoque en…">${esc(st.motive)}</textarea></label>
    <div class="note"><i data-ic="info"></i><span>Personaliza el motivo: es lo que más diferencia una carta. El resto se genera con tu CV y las palabras clave de la oferta.</span></div></div>
    <div><div class="ed-tabs" id="pkTabs"><button data-pk="letter" class="on">Carta de presentación</button><button data-pk="email">Email</button></div>
      <div id="pkLetter"><textarea id="pkLetterTx" rows="17" spellcheck="true" lang="es"></textarea><div class="btn-group" style="margin-top:10px"><button class="btn" id="pkCopyL">${ico('copy')}Copiar</button><button class="btn" id="pkPdfL">${ico('download')}Carta PDF</button><button class="btn" id="pkTxtL">.txt</button></div></div>
      <div id="pkEmail" hidden><label>Asunto<input id="pkSubj" spellcheck="true" lang="es"></label><textarea id="pkEmailTx" rows="13" spellcheck="true" lang="es" style="margin-top:8px"></textarea><div class="btn-group" style="margin-top:10px"><button class="btn" id="pkCopyE">${ico('copy')}Copiar</button><button class="btn btn-primary" id="pkMail">Abrir en mi correo</button><button class="btn" id="pkGmail">Abrir en Gmail</button></div><small class="muted" style="display:block;margin-top:6px">Los navegadores no permiten adjuntar archivos automáticamente: descarga primero el CV y la carta (botón de abajo) y arrástralos al correo.</small></div>
    </div></div></div>
  <div class="m-f"><button class="btn" data-act="close-modal">Cerrar</button><div class="spacer"></div><button class="btn" id="pkSave">Guardar en la oferta</button><button class="btn btn-primary" id="pkAll">${ico('download')}Descargar CV + carta (PDF)</button></div>`, 'md');
  hydrateIcons(box);
  const fill = () => { pk = buildPackage(cv, o, st); $('#pkLetterTx', box).value = pk.letter; $('#pkSubj', box).value = pk.subject; $('#pkEmailTx', box).value = pk.email; };
  fill();
  const upd = () => { st.to = $('#pkTo', box).value.trim(); st.contactName = $('#pkName', box).value.trim(); st.motive = $('#pkMotive', box).value; fill(); };
  ['pkName', 'pkMotive'].forEach(id => $('#' + id, box).addEventListener('input', debounce(upd, 250)));
  $('#pkTo', box).addEventListener('input', () => { st.to = $('#pkTo', box).value.trim(); });
  $('#pkTabs', box).addEventListener('click', e => { const t = e.target.closest('[data-pk]'); if (!t) return; $$('#pkTabs button', box).forEach(x => x.classList.toggle('on', x === t)); $('#pkLetter', box).hidden = t.dataset.pk !== 'letter'; $('#pkEmail', box).hidden = t.dataset.pk !== 'email'; });
  const copy = (t, msg) => { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Copiado', msg, 'success')).catch(() => { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Copiado', msg, 'success'); } catch { toast('No se pudo copiar', 'Selecciona el texto y copia manualmente.', 'warn'); } ta.remove(); }); };
  const L = () => ({ ...pk.header, body: $('#pkLetterTx', box).value });
  $('#pkCopyL', box).onclick = () => copy($('#pkLetterTx', box).value, 'Carta copiada.');
  $('#pkCopyE', box).onclick = () => copy(`Asunto: ${$('#pkSubj', box).value}\n\n${$('#pkEmailTx', box).value}`, 'Email copiado.');
  $('#pkPdfL', box).onclick = () => download(`carta-${slug(o.company)}.pdf`, letterPdf(L()), 'application/pdf');
  $('#pkTxtL', box).onclick = () => download(`carta-${slug(o.company)}.txt`, $('#pkLetterTx', box).value);
  const mailParams = () => `subject=${encodeURIComponent($('#pkSubj', box).value)}&body=${encodeURIComponent($('#pkEmailTx', box).value)}`;
  $('#pkMail', box).onclick = () => { location.href = `mailto:${encodeURIComponent($('#pkTo', box).value.trim())}?${mailParams()}`; };
  $('#pkGmail', box).onclick = () => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent($('#pkTo', box).value.trim())}&${mailParams()}`, '_blank', 'noopener');
  $('#pkAll', box).onclick = () => { exportCv(cv, 'pdf'); setTimeout(() => download(`carta-${slug(o.company)}.pdf`, letterPdf(L()), 'application/pdf'), 600); };
  $('#pkSave', box).onclick = () => { o.cover = $('#pkLetterTx', box).value; o.email = { subject: $('#pkSubj', box).value, body: $('#pkEmailTx', box).value }; o.contactEmail = $('#pkTo', box).value.trim(); o.contactName = st.contactName; o.motive = st.motive; o.cvId = cv.id; touch(); toast('Guardado', 'La carta y el email quedaron en la oferta.', 'success'); };
}
/* ==========================================================================
   p11 · Sistema de diseño (referencia viva dentro de la app)
   ========================================================================== */
const DS_COLORS = [
  ['Marca', [['--ultra-50', 'Ultramar 50'], ['--ultra-100', 'Ultramar 100'], ['--ultra-400', 'Ultramar 400'], ['--ultra-500', 'Ultramar 500 · primario'], ['--ultra-600', 'Ultramar 600 · hover'], ['--ultra-700', 'Ultramar 700']]],
  ['Tinta (neutros)', [['--ink-950', 'Tinta 950 · barra lateral'], ['--ink-900', 'Tinta 900'], ['--ink-700', 'Tinta 700'], ['--ink-500', 'Tinta 500 · texto secundario'], ['--ink-400', 'Tinta 400 · texto terciario'], ['--ink-200', 'Tinta 200 · líneas'], ['--ink-50', 'Tinta 50 · fondo']]],
  ['Escala de puntaje ATS', [['--band-ok', '80–100 · listo para entrevista'], ['--band-hi', '76–79 · zona alta'], ['--band-mid', '60–75 · riesgo moderado'], ['--band-low', '< 60 · no pasa el filtro']]],
  ['Apoyo', [['--mint-500', 'Menta'], ['--sky-500', 'Cielo'], ['--violet-500', 'Violeta'], ['--amber-500', 'Ámbar'], ['--coral-500', 'Coral']]]
];
const DS_TYPE = [['--fs-3xl', 'Cifra grande', '40 px · Bricolage 600', 'h'], ['--fs-2xl', 'Cifra de tarjeta', '30 px · Bricolage 600', 'h'], ['--fs-xl', 'Título de pantalla', '24 px · Bricolage 600', 'h'], ['--fs-lg', 'Título de bloque', '19 px · Bricolage 600', 'h'], ['--fs-md', 'Subtítulo', '16 px · Instrument Sans 600', 'b'], ['--fs-base', 'Texto base: leer, comparar y decidir con calma', '14 px · Instrument Sans 400', 'b'], ['--fs-sm', 'Texto de apoyo, ayudas y etiquetas', '12.5 px · Instrument Sans 500', 'b'], ['--fs-xs', 'Notas mínimas', '11.5 px', 'b']];
function renderDS() {
  const box = $('#dsBody'); if (!box) return; const cs = getComputedStyle(document.documentElement);
  const val = v => cs.getPropertyValue(v).trim() || '';
  const hex = v => { const d = document.createElement('i'); d.style.color = `var(${v})`; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); const m = c.match(/\d+(\.\d+)?/g); return m ? '#' + m.slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join('').toUpperCase() : c; };
  box.innerHTML = `
  <article class="card ds-sec"><header class="card-h"><div><h3>Principios</h3><p>Cuatro reglas que explican las decisiones visuales de JobTrack</p></div></header>
    <div class="ds-pr">
      <div><b>El color significa algo</b><p>El color de marca guía las acciones. Los colores de puntaje (verde, azul, ámbar, coral) solo aparecen para decir qué tan cerca estás de pasar un filtro ATS: en anillos, barras, insignias y pasos del simulador.</p></div>
      <div><b>Una jerarquía de formas</b><p>Cuanto más grande el contenedor, más redondo: tarjetas 20 px, grupos 14 px, controles 10 px, etiquetas en píldora. Así se lee qué contiene a qué.</p></div>
      <div><b>Datos primero, decoración después</b><p>Sin degradados ni círculos de relleno. Las cifras usan números tabulares para que se alineen al compararlas.</p></div>
      <div><b>El CV es el protagonista</b><p>La vista previa del documento es una hoja blanca idéntica al PDF. Todo lo demás es una interfaz neutra que no compite con ella.</p></div>
    </div></article>
  <article class="card ds-sec"><header class="card-h"><div><h3>Color</h3><p>Se usan los tokens semánticos (--primary, --ok, --bad…); las primitivas solo para definir escalas</p></div></header>
    ${DS_COLORS.map(([g, list]) => `<div class="an-h" style="margin-top:14px">${g}</div><div class="ds-sw">${list.map(([v, n]) => `<div><i style="background:var(${v})"></i><b>${n}</b><small>${v} · ${hex(v)}</small></div>`).join('')}</div>`).join('')}
    <div class="an-h" style="margin-top:18px">Estados</div><div class="ds-states">${[['Correcto', 'ok'], ['Información', 'info'], ['Atención', 'warn'], ['Error', 'bad']].map(([n, k]) => `<div style="background:var(--${k}-bg);color:var(--${k})"><b>${n}</b><small>--${k} sobre --${k}-bg</small></div>`).join('')}</div>
  </article>
  <article class="card ds-sec"><header class="card-h"><div><h3>Tipografía</h3><p>Bricolage Grotesque para títulos y cifras; Instrument Sans para leer. Escala de razón ≈ 1,2</p></div></header>
    <div class="ds-type">${DS_TYPE.map(([t, s, m, f]) => `<div><span style="font:${f === 'h' ? '600' : '500'} var(${t})/1.2 var(${f === 'h' ? '--font-h' : '--font'})">${s}</span><small>${t} · ${m}</small></div>`).join('')}</div></article>
  <div class="grid" style="grid-template-columns:1fr 1fr;gap:20px">
  <article class="card ds-sec"><header class="card-h"><div><h3>Espaciado y forma</h3><p>Base de 4 px · radios por tamaño de contenedor</p></div></header>
    <div class="ds-sp">${[1, 2, 3, 4, 5, 6, 8, 10].map(n => `<div><i style="width:var(--s-${n});height:var(--s-${n})"></i><small>--s-${n} · ${n * 4}px</small></div>`).join('')}</div>
    <div class="ds-rad">${[['--r-xs', 'Etiqueta interna'], ['--r-sm', 'Control'], ['--r', 'Grupo'], ['--r-lg', 'Tarjeta'], ['--r-pill', 'Píldora']].map(([r, n]) => `<div><i style="border-radius:var(${r})"></i><b>${n}</b><small>${r}</small></div>`).join('')}</div>
    <div class="ds-el"><div style="box-shadow:var(--shadow-1)">Elevación 1</div><div style="box-shadow:var(--shadow)">Elevación 2</div><div style="box-shadow:var(--shadow-lg)">Elevación 3</div></div></article>
  <article class="card ds-sec"><header class="card-h"><div><h3>Escala de puntaje</h3><p>El componente más importante del producto: dice si tu CV pasa</p></div></header>
    <div class="ds-score">${[[92, 'Listo para entrevista'], [77, 'Zona alta · afina detalles'], [66, 'Riesgo moderado'], [41, 'No pasa el filtro']].map(([s, l]) => `<div>${ringSvg({ pct: s / 100, color: bandColor(s), center: s, size: 74, stroke: 8, fs: 18 })}<div><span class="badge ${bandOf(s).cls}">${l}</span><small>${s}/100</small></div></div>`).join('')}</div>
    <div class="note" style="margin-top:12px"><i data-ic="info"></i><span>Nunca se usa verde para algo que no sea “pasa” ni coral para algo que no sea “falla o error”.</span></div></article></div>
  <article class="card ds-sec"><header class="card-h"><div><h3>Componentes</h3><p>Los mismos que usa toda la aplicación</p></div></header>
    <div class="an-h">Botones</div><div class="btn-group ds-row"><button class="btn btn-primary">Guardar cambios</button><button class="btn">Cancelar</button><button class="btn btn-ghost">Ver detalle</button><button class="btn btn-danger">Eliminar CV</button><button class="btn" disabled>Deshabilitado</button><button class="btn btn-sm">Pequeño</button></div>
    <div class="an-h" style="margin-top:16px">Campos</div><div class="grid" style="grid-template-columns:repeat(3,1fr);gap:14px"><label>Puesto<input placeholder="Desarrollador backend"></label><label>Modalidad<select><option>Remoto</option><option>Híbrido</option></select></label><label>Resumen<textarea rows="2" placeholder="Dos líneas sobre ti"></textarea></label></div>
    <div class="an-h" style="margin-top:16px">Insignias, chips y etiquetas</div><div class="chips ds-row"><span class="badge b-ok">Procesada</span><span class="badge b-info">En espera</span><span class="badge b-warn">Riesgo</span><span class="badge b-bad">No pasa</span><span class="badge b-mute">N/D</span><span class="chip">IT</span><span class="chip toggle on">LinkedIn</span><span class="chip toggle">Indeed</span><span class="tag-chip tg-ok">Node.js</span><span class="tag-chip tg-mid">Docker</span><span class="tag-chip tg-no">Kubernetes</span></div>
    <div class="an-h" style="margin-top:16px">Avisos y estados vacíos</div><div class="grid" style="grid-template-columns:1fr 1fr;gap:14px"><div class="note warn"><i data-ic="info"></i><span><b>El servidor no responde.</b> Ejecuta <code>npm start</code> dentro de <code>server/</code> y vuelve a intentarlo.</span></div><div class="empty" style="padding:14px"><i data-ic="file"></i><p>Aún no tienes CVs. Sube un PDF o DOCX para empezar el análisis.</p></div></div>
    <div class="an-h" style="margin-top:16px">Pasos del simulador</div><div class="ats-flow"><div class="ats-step pass"><div class="ats-n">1</div><div class="ats-b"><h4>Recepción del archivo <span class="badge b-ok">✓ Pasa</span></h4><p>Estado correcto: borde verde.</p></div></div><div class="ats-step warn"><div class="ats-n">2</div><div class="ats-b"><h4>Extracción del texto <span class="badge b-warn">! Riesgo</span></h4><p>Estado de riesgo: borde ámbar.</p></div></div><div class="ats-step fail"><div class="ats-n">3</div><div class="ats-b"><h4>Filtros eliminatorios <span class="badge b-bad">✗ Falla</span></h4><p>Estado de falla: borde coral.</p></div></div></div>
  </article>
  <article class="card ds-sec"><header class="card-h"><div><h3>Voz y tono</h3><p>Texto de interfaz escrito para quien busca trabajo, no para quien programó el sistema</p></div></header>
    <div class="ds-voice"><div><b>Una acción, un nombre</b><p>Si el botón dice «Guardar cambios», el aviso dice «Cambios guardados». El mismo verbo en todo el flujo.</p></div><div><b>Los errores explican y orientan</b><p>«El servidor no responde. Ejecuta npm start…» en vez de «Error de conexión».</p></div><div><b>Lo vacío invita a actuar</b><p>«Aún no tienes CVs. Sube un PDF o DOCX para empezar.»</p></div><div><b>Sin promesas que no se cumplen</b><p>La auto-postulación «registra», no «envía». Se dice exactamente lo que ocurre.</p></div></div></article>`;
  hydrateIcons(box);
}
/* ==========================================================================
   p12 · Autocorrección ATS: aplica solo arreglos seguros y lista lo que requiere tus datos
   ========================================================================== */
const EMOJI_G = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{FE0F}★☆●▪►◆■]/gu;
const COUNTRY_CODE = { argentina: '54', mexico: '52', chile: '56', colombia: '57', peru: '51', uruguay: '598', paraguay: '595', bolivia: '591', ecuador: '593', venezuela: '58', espana: '34', spain: '34', brasil: '55', brazil: '55', 'estados unidos': '1', usa: '1', eeuu: '1', 'costa rica': '506', panama: '507' };
const titleCase = s => s.toLowerCase().replace(/(^|\s)([a-záéíóúñü])/g, (m, a, b) => a + b.toUpperCase()).replace(/\s(De|Del|La|Las|Los|Y)\s/g, x => x.toLowerCase());
const cleanTxt = v => String(v ?? '').replace(EMOJI_G, '').replace(/[ \t]{2,}/g, ' ').replace(/^[\s•·\-*►▪]+(?=\S)/, '').trim();
function fixName(v) {
  let t = String(v || '').replace(EMOJI_G, '').trim(); if (!t) return v;
  const parts = t.split(/\s*[|·•\/–—]\s*|\s+-\s+/).filter(Boolean); if (parts.length > 1 && parts[0].trim().split(/\s+/).length >= 2) t = parts[0];
  t = t.replace(/\d+/g, '').replace(/[|@]/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (t === t.toUpperCase() || t === t.toLowerCase()) t = titleCase(t);
  return t;
}
const fixEmail = v => String(v || '').replace(/\s+/g, '').toLowerCase().replace(/^mailto:/, '');
function fixPhone(v, loc) {
  const raw = String(v || '').trim(); if (!raw || /^\+\d/.test(raw)) return raw;
  const country = norm(String(loc || '').split(',').pop() || '').trim(), cc = COUNTRY_CODE[country]; if (!cc) return raw;
  let d = raw.replace(/[^\d]/g, ''); if (!d) return raw;
  if (d.startsWith('00')) return '+' + d.slice(2);
  if (d.startsWith(cc) && d.length >= cc.length + 8) return '+' + d;
  return `+${cc} ${raw.replace(/^[\s(]*0+/, '').replace(/[^\d\s().-]/g, '').trim()}`;
}
const fixLink = v => String(v || '').trim().replace(/\s+/g, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
function weak2past(t) {
  for (const [re, rep] of WEAK_MAP) if (re.test(t)) {
    let verb = rep.trim(), rest = t.replace(re, '').trim(); const w1 = rest.split(/\s+/)[0] || '';
    if (/ing$/i.test(w1) && /^[A-Z]/.test(rep)) return t;
    const pv = /(ar|er|ir)$/i.test(w1) && w1.length > 4 ? inf2past(w1) : ''; if (pv) { verb = pv; rest = rest.slice(w1.length).trim(); }
    rest = rest.replace(/\sy\s([a-záéíóúñ]{5,}(?:ar|er|ir))\b/i, (m, w) => { const q = inf2past(w); return q ? ' y ' + q.toLowerCase() : m; });
    return cap1(verb) + (rest ? ' ' + rest : '');
  }
  return t;
}
function fixBullet(t) { let x = cleanTxt(t); x = weak2past(x); return x ? cap1(x) : x; }
function fixSkills(str) {
  const lines = String(str || '').split('\n').map(l => l.trim()).filter(Boolean), keep = [], loose = [];
  lines.forEach(l => {
    const m = l.match(/^([^:]{2,32}):\s*(.*)$/), cat = m ? cleanTxt(m[1]) : '', body = m ? m[2] : l;
    const items = body.split(/[,;·•|]/).map(x => cleanTxt(x).replace(/\(?\s*\d{1,3}\s*%\s*\)?/g, '').replace(/\(\s*(b[aá]sico|intermedio|avanzado|alto|medio|bajo|experto)\s*\)/gi, '').replace(/\s*[-–]\s*(b[aá]sico|intermedio|avanzado|alto|medio|bajo|experto)\s*$/i, '').replace(/\s{2,}/g, ' ').trim()).filter(Boolean);
    const seen = new Set(), uniq = items.filter(x => { const k = x.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    if (!uniq.length) return;
    if (cat) keep.push(`${cat}: ${uniq.join(', ')}`); else loose.push(...uniq);
  });
  if (loose.length) { const ix = keep.findIndex(l => /^otras?:/i.test(l)); if (ix >= 0) keep[ix] += ', ' + loose.join(', '); else keep.push('Otras: ' + loose.join(', ')); }
  return keep.join('\n');
}
const sortDesc = arr => { if (!arr.length || arr.some(e => !yearsOf(e.dates || ''))) return arr; return arr.map((e, i) => [e, i]).sort((a, b) => { const x = yearsOf(a[0].dates), y = yearsOf(b[0].dates); return (y.b - x.b) || (y.a - x.a) || (a[1] - b[1]); }).map(p => p[0]); };

/* Devuelve { items, remaining, before, after } sin tocar el CV original */
function atsFixPlan(cv, offer) {
  const items = [], b = cv.basics || {};
  const addF = (group, path, label, after, why) => { const before = getP(cv, path); if (before == null || String(before) === String(after) || (!String(before).trim() && !String(after).trim())) return; items.push({ id: items.length, phase: 1, group, path, label, before: String(before), after: String(after), why: why || '', fn: c => setP(c, path, after) }); };
  // contacto
  addF('Contacto', 'basics.name', 'Nombre', fixName(b.name), 'Solo nombre y apellido, sin símbolos ni cargos.');
  addF('Contacto', 'basics.email', 'Email', fixEmail(b.email), 'Sin espacios y en minúsculas.');
  addF('Contacto', 'basics.phone', 'Teléfono', fixPhone(b.phone, b.location), 'Prefijo internacional deducido de tu país: revísalo.');
  ['linkedin', 'github', 'web'].forEach(k => addF('Contacto', 'basics.' + k, { linkedin: 'LinkedIn', github: 'GitHub', web: 'Portafolio' }[k], fixLink(b[k]), 'Dirección limpia, sin parámetros de seguimiento.'));
  // fechas
  [['experience', 'Experiencia'], ['leadership', 'Actividad'], ['education', 'Educación'], ['projects', 'Proyecto']].forEach(([l, lab]) => (cv[l] || []).forEach((e, i) => { const v = normDate(e.dates); if (v && v !== (e.dates || '').trim() && yearsOf(e.dates || '')) addF('Fechas', `${l}.${i}.dates`, `${lab} ${i + 1}${e.org || e.school || e.name ? ' · ' + (e.org || e.school || e.name) : ''}`, v, 'Formato Mmm AAAA – Mmm AAAA o Presente.'); }));
  // redacción
  if (cv.summary) addF('Redacción', 'summary', 'Resumen', cleanTxt(cv.summary), 'Sin íconos ni símbolos decorativos.');
  [['experience', 'Experiencia'], ['leadership', 'Actividad'], ['projects', 'Proyecto']].forEach(([l, lab]) => (cv[l] || []).forEach((e, i) => (e.bullets || []).forEach((t, j) => { if (t && t.trim()) addF('Redacción', `${l}.${i}.bullets.${j}`, `${lab} ${i + 1} · viñeta ${j + 1}`, fixBullet(t), 'Verbo de acción en pasado, sin viñetas ni íconos duplicados.'); })));
  // habilidades
  if (cv.skills && cv.skills.technical) addF('Habilidades', 'skills.technical', 'Habilidades técnicas', fixSkills(cv.skills.technical), 'Sin porcentajes ni niveles, sin duplicados, una categoría por línea.');
  ['certs', 'languages', 'interests'].forEach(k => { const v = cv.skills && cv.skills[k]; if (v && EMOJI_G.test(v)) { EMOJI_G.lastIndex = 0; addF('Habilidades', 'skills.' + k, { certs: 'Certificaciones', languages: 'Idiomas', interests: 'Intereses' }[k], cleanTxt(v)); } EMOJI_G.lastIndex = 0; });
  // orden y formato (estructural)
  [['experience', 'Experiencia'], ['education', 'Educación'], ['leadership', 'Actividades']].forEach(([l, lab]) => { const cur = cv[l] || [], s = sortDesc(cur); if (cur.length > 1 && s.some((e, i) => e !== cur[i])) items.push({ id: items.length, phase: 2, group: 'Orden y formato', label: `${lab}: orden cronológico inverso`, before: 'Orden actual', after: 'Lo más reciente primero', why: 'El ATS espera lo más reciente arriba.', fn: c => { c[l] = sortDesc(c[l]); } }); });
  const so = cv.sectionOrder; if (so && so.indexOf('education') > so.indexOf('experience') && so.indexOf('experience') >= 0) items.push({ id: items.length, phase: 2, group: 'Orden y formato', label: 'Educación antes que Experiencia', before: 'Experiencia → Educación', after: 'Educación → Experiencia', why: 'Modelo Harvard.', fn: c => { const o = c.sectionOrder.filter(x => x !== 'education'); o.splice(Math.max(0, o.indexOf('experience')), 0, 'education'); c.sectionOrder = o; } });
  const m = cv.meta || {}; if (m.hasTables || m.multiColumn || m.noText || m.emoji) items.push({ id: items.length, phase: 2, group: 'Orden y formato', label: 'Formato de archivo: una columna, sin tablas, texto seleccionable', before: [m.hasTables && 'tablas', m.multiColumn && 'varias columnas', m.noText && 'sin texto', m.emoji && 'íconos'].filter(Boolean).join(', '), after: 'Se exporta desde JobTrack en formato Harvard', why: 'Al descargar el PDF desde JobTrack el archivo se genera de una columna, sin tablas y con texto real.', fn: c => { c.meta = { ...(c.meta || {}), hasTables: false, multiColumn: false, noText: false, emoji: false, ext: 'pdf' }; c.parsedPoorly = false; } });
  const apply = (c, ids) => { const sel = items.filter(x => !ids || ids.includes(x.id)); [1, 2].forEach(ph => sel.filter(x => x.phase === ph).forEach(x => x.fn(c))); return c; };
  const copy = apply(deep(cv));
  const rem = [], seen = new Set(), push = (sec, c, st) => { if (c.ok || seen.has(c.msg)) return; seen.add(c.msg); rem.push({ sec, msg: c.msg, fix: c.fix, go: c.go, act: c.act, sev: c.sev || 'fail', step: st }); };
  Object.values(sectionAudit(copy)).forEach(a => a.checks.forEach(c => push(a.label, c)));
  try { const sim = atsSimulate(copy, offer || null); sim.steps.forEach(s => s.d.forEach(c => push('Paso ' + s.id + ' · ' + s.title, c, s.id))); } catch (e) { }
  rem.sort((x, y) => (x.sev === 'fail' ? 0 : 1) - (y.sev === 'fail' ? 0 : 1));
  const secPass = c => Object.values(sectionAudit(c)).filter(a => a.checks.every(k => k.ok)).length, nSec = Object.keys(sectionAudit(cv)).length;
  return { items, remaining: rem, copy, scoreBefore: analyzeCv(cv).overall, scoreAfter: analyzeCv(copy).overall, secBefore: secPass(cv), secAfter: secPass(copy), nSec, apply };
}
const fxShort = (t, n = 150) => { const s = String(t ?? ''); return s.length > n ? s.slice(0, n) + '…' : s; };
function fixItemsHtml(plan, withBox) {
  const groups = {}; plan.items.forEach(x => (groups[x.group] = groups[x.group] || []).push(x));
  return Object.entries(groups).map(([g, arr]) => `<div class="fx-g"><div class="an-h" style="margin:0">${esc(g)} <span class="muted">· ${arr.length}</span></div>${arr.map(x => `<label class="fx-it">${withBox ? `<input type="checkbox" data-fx="${x.id}" checked>` : ''}<div><b>${esc(x.label)}</b><div class="fx-d"><del>${esc(fxShort(x.before))}</del><span>→</span><ins>${esc(fxShort(x.after))}</ins></div><small class="muted">${esc(x.why)}</small></div></label>`).join('')}</div>`).join('');
}
const remHtml = (plan, withGo) => plan.remaining.length ? plan.remaining.slice(0, 12).map((r, i) => `<div class="fx-rem"><span class="n">${i + 1}</span><div><b>${esc(r.msg)}</b> <span class="badge ${r.sev === 'fail' ? 'b-bad' : 'b-warn'}">${r.sev === 'fail' ? 'Bloquea' : 'Mejora'}</span><div class="muted" style="font-size:12.5px">${esc(r.fix)}</div><small class="muted">${esc(r.sec)}</small></div></div>`).join('') + (plan.remaining.length > 12 ? `<small class="muted">+ ${plan.remaining.length - 12} más</small>` : '') : '<div class="note"><i data-ic="check"></i><span>Con estas correcciones el CV pasa todos los controles de la simulación.</span></div>';

function openAutoFix(cvId, offerId) {
  const cv = getCv(cvId); if (!cv) return toast('Selecciona un CV', 'Elige un CV para corregir.', 'warn');
  const offer = offerId ? getOffer(offerId) : null, plan = atsFixPlan(cv, offer);
  const box = openModal(`${modalHead('Corregir automáticamente', `«${cv.name}»${offer ? ' · ' + offer.title : ''}`)}<div class="m-b">
    <div class="fx-sum"><div><small>Puntaje ATS global</small><b>${plan.scoreBefore} → ${plan.scoreAfter}</b></div><div><small>Secciones sin pendientes</small><b>${plan.secBefore} → ${plan.secAfter} de ${plan.nSec}</b></div><div><small>Correcciones seguras</small><b>${plan.items.length}</b></div><div><small>Requieren tus datos</small><b>${plan.remaining.length}</b></div></div>
    ${plan.items.length ? `<div class="an-h">Se aplicarán estas correcciones (desmarca las que no quieras)</div>${fixItemsHtml(plan, true)}` : '<div class="note"><i data-ic="info"></i><span>No hay correcciones automáticas seguras: lo que falta depende de tus datos.</span></div>'}
    <div class="an-h" style="margin-top:22px">Quedan por completar con tus datos reales</div><div class="muted" style="font-size:12.5px;margin-bottom:8px">JobTrack no inventa cifras, cargos ni idiomas: estos puntos los completas tú en el editor.</div>${remHtml(plan)}</div>
    <div class="m-f"><button class="btn" data-act="close-modal">Cancelar</button><div class="spacer"></div><button class="btn" id="fxApply">Aplicar a este CV</button><button class="btn btn-primary" id="fxNew">Guardar como nueva versión y simular</button></div>`, 'md');
  hydrateIcons(box);
  const ids = () => [...box.querySelectorAll('[data-fx]')].filter(i => i.checked).map(i => +i.dataset.fx);
  const done = (target, msg) => { touch(); closeModal(); renderCurrent(); if ($('#atsCv')) { renderAts(); $('#atsCv').value = target.id; runAtsSim(); } toast('Correcciones aplicadas', msg, 'success'); };
  $('#fxApply', box).onclick = () => { if (!plan.items.length) return closeModal(); plan.apply(cv, ids()); cv.updatedAt = Date.now(); done(cv, `${ids().length} cambio(s) en «${cv.name}». Revisa los pendientes en el editor.`); };
  $('#fxNew', box).onclick = () => { const n = plan.apply(deep(cv), ids()); n.id = uid(); n.name = cv.name.replace(/ \(ATS\)$/, '') + ' (ATS)'; n.createdAt = n.updatedAt = Date.now(); S.cvs.push(n); done(n, `Se creó «${n.name}» y se simuló de nuevo.`); };
}

/* ───────────── tecnologías respaldadas: qué habilidades no aparecen en logros y dónde encajan ───────────── */
const SKILL_THEMES = [
  [/redis|memcached|cach/i, /(rendimiento|latencia|tiempo de respuesta|velocidad|carga|cach|consulta)/i],
  [/docker|kubernetes|aws|azure|gcp|render|ci\/cd|github actions|jenkins|terraform|nginx|devops|vercel|heroku/i, /(desplieg|deploy|servidor|hosting|infraestructura|pipeline|release|entrega|contenedor|cloud|nube|publicaci)/i],
  [/jest|mocha|cypress|selenium|pytest|playwright|vitest|testing|qa\b/i, /(prueba|test|calidad|bug|error|cobertura|regresi|validaci)/i],
  [/postgres|mysql|sql|mongo|sequelize|prisma|orm|oracle|base de datos/i, /(base de datos|consulta|query|datos|reporte|esquema|modelo|tabla|migraci|persisten|registro)/i],
  [/node|express|nest|django|flask|spring|fastapi|laravel|rest|graphql|jwt|api|backend/i, /(api|endpoint|servicio|backend|servidor|autentic|integraci|rest|m[oó]dulo|sistema|pagos)/i],
  [/react|vue|angular|next|svelte|html|css|tailwind|frontend|javascript|typescript/i, /(interfaz|frontend|pantalla|p[aá]gina|web|componente|\bui\b|sitio|usuario|formulario|vista)/i],
  [/figma|sketch|xd\b|photoshop|illustrator|adobe|canva|wireframe|prototip|ux|ui\b/i, /(dise[ñn]|prototip|interfaz|wireframe|usabilidad|marca|pieza|\bux\b|\bui\b|flujo|gr[aá]fic)/i],
  [/git|github|gitlab|jira|scrum|agile|trello|kanban|slack/i, /(equipo|colabor|versiona|c[oó]digo|revisi[oó]n|sprint|tarea|proyecto|coordin|planific)/i],
  [/python|power ?bi|excel|tableau|pandas|looker|analytics/i, /(dato|reporte|dashboard|an[aá]lisis|indicador|automatiz|planilla|m[eé]trica)/i],
  [/postman|swagger|insomnia|openapi/i, /(api|endpoint|documentaci|prueba|integraci)/i]
];
function skillList(technical) {
  const out = [], seen = new Set();
  String(technical || '').split('\n').forEach(l => { const m = l.match(/^([^:]{2,32}):\s*(.*)$/), body = m ? m[2] : l; body.split(/[,;·|]/).map(x => x.trim()).filter(x => x.length >= 2).forEach(x => { const k = norm(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }); });
  return out;
}
function skillBacking(cv) {
  const skills = skillList(cv.skills && cv.skills.technical), bl = [];
  [['experience', 'Experiencia'], ['leadership', 'Actividad'], ['projects', 'Proyecto']].forEach(([l, lab]) => (cv[l] || []).forEach((e, i) => (e.bullets || []).forEach((t, j) => { if (t && t.trim()) bl.push({ list: l, i, j, t, nt: norm(t), label: `${lab} ${i + 1}${e.org || e.name ? ' (' + (e.org || e.name) + ')' : ''} · viñeta ${j + 1}`, kws: new Set((extractKeywords(t, '').keywords || []).map(k => k.k)), grps: new Set((extractKeywords(t, '').keywords || []).map(k => k.grp)) }); })));
  const rx = s => new RegExp('(^|[^a-z0-9+#.])' + escRe(norm(s)) + '($|[^a-z0-9+#])');
  const unbacked = [], backed = [], load = new Map();
  skills.forEach(s => {
    const r = rx(s), kk = (extractKeywords(s, '').keywords || [])[0];
    const hit = bl.some(b => r.test(b.nt) || (kk && b.kws.has(kk.k)));
    if (hit) { backed.push(s); return; }
    let best = null, bs = 0;
    bl.forEach((b, ix) => { let sc = 0; SKILL_THEMES.forEach(([sr, br]) => { if (sr.test(s) && br.test(b.nt)) sc += 3; }); if (kk && b.grps.has(kk.grp)) sc += 2; if (sc) { sc += b.t.split(/\s+/).length >= 8 ? 1 : 0; sc -= (load.get(ix) || 0) * 2; sc -= b.list === 'experience' ? 0 : 0.5; sc -= b.i * 0.2; } if (sc > bs) { bs = sc; best = ix; } });
    if (best !== null) { load.set(best, (load.get(best) || 0) + 1); const b = bl[best]; unbacked.push({ s, best: { list: b.list, i: b.i, j: b.j, label: b.label, path: `${b.list}.${b.i}.bullets.${b.j}` } }); } else unbacked.push({ s, best: null });
  });
  return { total: skills.length, backed, unbacked, ratio: skills.length ? backed.length / skills.length : 1 };
}
const sugText = SB => { const w = SB.unbacked.filter(u => u.best).slice(0, 3).map(u => `${u.s} → ${u.best.label}`), n = SB.unbacked.filter(u => !u.best).map(u => u.s).slice(0, 4); return (w.length ? `Sin respaldo: ${w.join('; ')}. Añade la herramienta solo si la usaste en ese logro (botón 💡 bajo la viñeta).` : '') + (n.length ? ` Sin dónde encajar: ${n.join(', ')} → respáldalas en un proyecto o curso, o quítalas si no puedes defenderlas.` : '') || 'Menciona en las viñetas las herramientas que listas en Habilidades.'; };

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
  ds: ['Sistema de diseño', 'Tokens, componentes y reglas visuales de JobTrack', renderDS],
  ats: ['Simulador ATS', 'Recorre paso a paso cómo un ATS procesa tu CV', renderAts],
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
  'ats-fix': t => openAutoFix(t.dataset.cv, t.dataset.offer),
  'ats-opt': t => openOptimize(t.dataset.cv, t.dataset.offer),
  'pack-open': t => openPackage(t.dataset.cv, t.dataset.offer),
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
  rf('rfHours', 'hours', 'rfHoursTxt', radarHoursTxt); rf('rfApp', 'app', 'rfAppTxt', radarAppTxt); rf('rfRel', 'rel', 'rfRelTxt', v => v + ' %');
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
  $('#atsForm').addEventListener('submit', runAtsSim);
  $('#agCv').addEventListener('change', renderAgents);
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
