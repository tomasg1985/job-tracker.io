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
    radar: { hours: 24, app: 5, rel: 50, portals: [], bk: { url: 'http://127.0.0.1:3001', query: '', loc: '' } }
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
const PORTALS = ['LinkedIn', 'Indeed', 'Computrabajo', 'Bumeran', 'Glassdoor', 'GetOnBoard', 'Workana', 'Remotive', 'RemoteOK', 'Arbeitnow', 'Torre', 'Otro'];
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
const METHOD_RE = /(\b(al|mediante|usando|utilizando|implementando|con|tras|migrando|automatizando|introduciendo|aplicando|a trav[eé]s de|gracias a)\b|\b(by|using|through|via|with|after|leveraging|implementing|introducing)\b)/i;
function bulletCheck(b) {
  const t = String(b || '').trim(); if (!t) return { empty: true };
  const first = t.split(/\s+/)[0].toLowerCase().replace(/[^a-záéíóúñ]/gi, '');
  const verb = ACTION.has(first) || ACTION.has(norm(first)) || /[éíó]$/.test(first) && first.length > 4 || /^[a-z]{4,}ed$/.test(first);
  const weak = WEAK_RE.test(t);
  const metric = METRIC_RE.test(t);
  const xyz = !weak && verb && metric && RESULT_RE.test(t) && METHOD_RE.test(t);
  const words = t.split(/\s+/).length;
  return { verb: verb && !weak, weak, metric, xyz, words, long: words > 32, short: words < 6, pronoun: /^(yo|i)\s/i.test(t) };
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
