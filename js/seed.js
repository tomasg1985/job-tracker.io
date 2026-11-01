/* JobTrack · Datos de ejemplo (marcados como demo en la interfaz) */
(function (g) {
  'use strict';
  const N = g.NLP;
  const rng = (seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; })(20261030);
  const pick = a => a[Math.floor(rng() * a.length)];
  const ymd = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };

  const E = (org, role, loc, dates, bullets) => ({ org, role, loc, dates, bullets });
  const P = (name, title, links) => ({ name, title, email: 'nombre.apellido@correo.com', phone: '+54 11 5555 0123', location: 'Buenos Aires, Argentina', linkedin: 'linkedin.com/in/nombre-apellido', links });

  const CVS = [
    { id: 'cv1', name: 'CV Backend Node.js', area: 'IT', format: 'pdf', optimized: false, fields: {
      personal: P('Nombre Apellido', 'Desarrollador Backend', 'github.com/nombre-apellido'),
      summary: 'Desarrollador backend con 3 años de experiencia construyendo APIs REST con Node.js, Express y PostgreSQL en equipos ágiles. Reduje tiempos de respuesta un 35% y desplegué servicios en Render con CI/CD.',
      education: [E('Universidad Tecnológica Nacional', 'Tecnicatura en Programación', 'Buenos Aires, Argentina', '2019 - 2022', ['Promedio 8,4/10; proyecto final de e-commerce con Node.js y PostgreSQL.'])],
      experience: [
        E('Estudio Digital Norte', 'Desarrollador Backend', 'Remoto', '2022 - Presente', [
          'Desarrollé una API REST con Node.js, Express y Sequelize que atiende 40.000 solicitudes diarias, reduciendo la latencia un 35% mediante índices en PostgreSQL y caché.',
          'Implementé autenticación con JWT y control de roles, eliminando accesos no autorizados en 3 módulos.',
          'Responsable de la base de datos y del despliegue en Render.',
          'Colaboré en equipo con diseño y frontend usando metodologías ágiles (Scrum) y revisión de código en GitHub.']),
        E('Proyectos freelance', 'Desarrollador Full Stack', 'Remoto', '2021 - 2022', [
          'Construí 4 sitios con Node.js y PostgreSQL para pymes, entregando cada uno en menos de 6 semanas.',
          'Ayudé con tareas de mantenimiento y soporte.'])],
      projects: [E('PhysaFlow', 'Calculadora de capacidad', 'GitHub', '2026', ['Diseñé un backend con Express 5, Sequelize y PostgreSQL con módulos ES y despliegue en Render.'])],
      leadership: [E('Comunidad Dev Buenos Aires', 'Voluntario', '', '2023 - Presente', ['Organicé 6 talleres de Node.js para 120 personas.'])],
      skills: { technical: 'JavaScript, Node.js, Express, PostgreSQL, Sequelize, REST API, Docker, Git, JWT, Render', languages: 'Español (nativo), Inglés (B2)', interests: 'Open source, ajedrez' },
      certs: 'Node.js Application Developer (curso), SQL avanzado' } },
    { id: 'cv2', name: 'CV Full Stack', area: 'IT', format: 'docx', optimized: false, fields: {
      personal: P('Nombre Apellido', 'Desarrollador Full Stack', 'github.com/nombre-apellido | behance.net/nombre'),
      summary: 'Desarrollador full stack con experiencia en React, Node.js y bases de datos SQL. Me encargo de interfaces y servicios, trabajo con equipos de producto y aprendo rápido.',
      education: [E('Universidad Tecnológica Nacional', 'Tecnicatura en Programación', 'Buenos Aires, Argentina', '2019 - 2022', [''])],
      experience: [E('Estudio Digital Norte', 'Desarrollador Full Stack', 'Remoto', '2022 - Presente', [
        'Participé en el desarrollo de interfaces con React y consumo de APIs REST.',
        'Desarrollé componentes reutilizables en React y CSS que redujeron el tiempo de maquetación un 25%.',
        'Trabajé con Node.js y PostgreSQL en servicios internos.',
        'Responsable de pruebas unitarias con Jest.'])],
      projects: [], leadership: [],
      skills: { technical: 'JavaScript, React, HTML, CSS, Node.js, SQL, Git', languages: 'Español, Inglés', interests: '' }, certs: '' } },
    { id: 'cv3', name: 'CV Diseño UX/UI', area: 'Diseño', format: 'pdf', optimized: false, fields: {
      personal: P('Nombre Apellido', 'Diseñador UX/UI', 'behance.net/nombre-apellido | dribbble.com/nombre'),
      summary: 'Diseñador UX/UI con 3 años creando productos digitales con Figma, investigación de usuarios y sistemas de diseño. Mejoré la conversión de un e-commerce un 18% mediante pruebas de usabilidad y rediseño del checkout.',
      education: [E('Universidad de Buenos Aires', 'Licenciatura en Diseño de Imagen y Sonido', 'Buenos Aires, Argentina', '2017 - 2022', ['Tesis sobre accesibilidad en interfaces móviles.'])],
      experience: [E('Agencia Pixel Sur', 'Diseñador UX/UI', 'Buenos Aires, Argentina', '2022 - Presente', [
        'Rediseñé el checkout de un e-commerce con 25.000 usuarios mensuales, aumentando la conversión un 18% mediante pruebas de usabilidad y prototipos en Figma.',
        'Creé un design system con 60 componentes que redujo un 40% el tiempo de entrega entre diseño y desarrollo.',
        'Lideré 12 entrevistas de investigación de usuarios y sinteticé hallazgos en journey maps para 3 equipos.',
        'Colaboré con desarrolladores en la implementación de interfaces responsive y accesibles (WCAG).'])],
      projects: [E('App de movilidad', 'Caso de estudio', 'Behance', '2025', ['Diseñé flujos de usuario y prototipos de alta fidelidad validados con 15 usuarios.'])],
      leadership: [], skills: { technical: 'Figma, Adobe XD, Photoshop, Illustrator, UX, UI, Design System, Prototipado, Accesibilidad', languages: 'Español (nativo), Inglés (B2)', interests: 'Fotografía' }, certs: 'Google UX Design Certificate' } }
  ];

  const T = {
    backend: `Backend Developer Node.js\nSumate a nuestro equipo de producto.\nRequisitos:\n- 2+ años de experiencia con Node.js y Express\n- Sólidos conocimientos de PostgreSQL y SQL\n- Experiencia diseñando APIs REST y autenticación JWT\n- Manejo de Git y metodologías ágiles (Scrum)\nDeseable:\n- Docker y CI/CD\n- Experiencia con AWS\nOfrecemos: modalidad remota, horario flexible.`,
    fullstack: `Full Stack Developer (React + Node.js)\nBuscamos un desarrollador full stack para construir nuestro panel de clientes.\nRequisitos:\n- Experiencia con React, JavaScript y TypeScript\n- Node.js y Express para APIs REST\n- Bases de datos SQL (PostgreSQL)\n- Testing con Jest\n- Trabajo en equipo y comunicación efectiva\nDeseable: Docker, Next.js, GraphQL.`,
    fintech: `Desarrollador Backend Semi Senior\nFintech en crecimiento.\nRequisitos:\n- 3+ años con Node.js, TypeScript y PostgreSQL\n- Arquitectura de microservicios y mensajería (Kafka o RabbitMQ)\n- Docker y Kubernetes\n- Seguridad, OAuth y buenas prácticas de rendimiento\n- Inglés intermedio\nDeseable: AWS, Terraform.`,
    ux: `UX/UI Designer\nTienda online líder busca diseñador para optimizar la experiencia de compra.\nRequisitos:\n- Dominio de Figma y prototipado\n- Experiencia en investigación de usuarios y pruebas de usabilidad\n- Conocimiento de design systems y accesibilidad (WCAG)\n- Diseño responsive y mobile first\n- Portfolio con casos de estudio\nDeseable: A/B testing, motion design.`,
    product: `Product Designer Senior\nLideras el diseño de producto de nuestra plataforma B2B.\nRequisitos:\n- 5+ años en diseño de producto y UX/UI\n- Liderazgo y mentoring de diseñadores\n- Design systems, Figma, arquitectura de información\n- Investigación de usuarios y métricas de producto\n- Inglés avanzado\nDeseable: Design thinking, A/B testing.`,
    devops: `DevOps Engineer\nRequisitos:\n- Docker, Kubernetes y Linux\n- CI/CD con GitHub Actions o Jenkins\n- AWS o Azure; Terraform\n- Monitoreo, seguridad y escalabilidad\n- Scripting en Bash o Python\nDeseable: Node.js.`,
    front: `Frontend Developer React\nRequisitos:\n- React, JavaScript y TypeScript\n- HTML5, CSS3 y Tailwind\n- Consumo de APIs REST y GraphQL\n- Testing (Jest, Cypress)\n- Accesibilidad y diseño responsive\n- Trabajo en equipo con diseño y producto.`,
    hr: `Analista de Reclutamiento IT\nRequisitos:\n- Experiencia en reclutamiento y selección de personal técnico\n- Entrevistas, screening y onboarding\n- Comunicación y negociación\n- Manejo de Excel y herramientas ATS\nDeseable: inglés avanzado.`,
    python: `Backend Engineer Python/Django\nRequisitos:\n- Python, Django y Flask\n- PostgreSQL y Redis\n- APIs REST y microservicios\n- Docker y CI/CD\n- Testing y code review\nDeseable: machine learning.`,
    research: `UX Researcher\nRequisitos:\n- Investigación de usuarios, entrevistas y pruebas de usabilidad\n- Journey maps y arquitectura de información\n- Figma y prototipado\n- Comunicación y trabajo en equipo\n- Análisis de datos\nDeseable: A/B testing.`
  };

  const SAMPLES = [
    ['Backend Developer Node.js', 'Nubeka', 'LinkedIn', 'backend', 'cv1'], ['Full Stack Developer', 'Orbital Labs', 'Indeed', 'fullstack', 'cv2'],
    ['Backend Semi Senior', 'Cobalto Pay', 'LinkedIn', 'fintech', 'cv1'], ['UX/UI Designer', 'Tiendaviva', 'Computrabajo', 'ux', 'cv3'],
    ['Product Designer Senior', 'Pixelforge', 'LinkedIn', 'product', 'cv3'], ['DevOps Engineer', 'Cloudnest', 'Bumeran', 'devops', 'cv1'],
    ['Frontend Developer React', 'Brisa Digital', 'Indeed', 'front', 'cv2'], ['Analista de Reclutamiento IT', 'Talentia', 'Computrabajo', 'hr', 'cv2'],
    ['Backend Engineer Python', 'Datanova', 'Glassdoor', 'python', 'cv1'], ['UX Researcher', 'Estudio Aurora', 'Workana', 'research', 'cv3'],
    ['Backend Developer', 'Kiwi Systems', 'Bumeran', 'backend', 'cv1'], ['Desarrollador Full Stack', 'Marea Tech', 'LinkedIn', 'fullstack', 'cv2'],
    ['Diseñador UX/UI', 'Lumen Studio', 'Indeed', 'ux', 'cv3'], ['Node.js Developer', 'Andes Cloud', 'Computrabajo', 'backend', 'cv1'],
    ['Frontend React', 'Faro Apps', 'LinkedIn', 'front', 'cv2'], ['Backend Fintech', 'Pampa Wallet', 'Glassdoor', 'fintech', 'cv1'],
    ['UX/UI Designer', 'Cielo Retail', 'Bumeran', 'ux', 'cv3'], ['Full Stack React Node', 'Vértice IT', 'Workana', 'fullstack', 'cv2']
  ];

  function buildOffer(i, title, company, portal, key, cvId, status, daysAgo) {
    const text = T[key], kws = N.extractKeywords(text), cv = CVS.find(c => c.id === cvId);
    const sc = N.scoreOffer(kws, cv, text), at = new Date(); at.setDate(at.getDate() - daysAgo); at.setHours(9 + Math.floor(rng() * 9), Math.floor(rng() * 60));
    return { id: 'o' + (i + 1), title, company, portal, url: '', area: N.detectArea(kws), text, createdAt: at.toISOString(), appliedAt: status === 'espera' ? null : at.toISOString(), status, cvId, keywords: kws, score: sc.final, coverage: sc.coverage, source: 'manual' };
  }

  function buildSeed() {
    const statuses = ['espera', 'espera', 'espera', 'aplicada', 'aplicada', 'aplicada', 'sin_respuesta', 'sin_respuesta', 'sin_respuesta', 'sin_respuesta', 'rechazada', 'rechazada', 'rechazada', 'entrevista', 'entrevista', 'sin_respuesta', 'aplicada', 'oferta'];
    const offers = SAMPLES.map((s, i) => buildOffer(i, s[0], s[1], s[2], s[3], s[4], statuses[i], statuses[i] === 'espera' ? Math.floor(rng() * 2) : 1 + Math.floor(rng() * 12)));
    const manual = {}; const d = new Date();
    for (let i = 13; i >= 0; i--) { const x = new Date(d); x.setDate(d.getDate() - i); const wd = x.getDay(); manual[ymd(x)] = (wd === 0 || wd === 6) ? Math.floor(40 + rng() * 60) : (i === 0 ? 118 : Math.floor(150 + rng() * 140)); }
    return { demo: true, cvs: JSON.parse(JSON.stringify(CVS)), offers, manualSent: manual, settings: { dailyMin: 200, dailyMax: 300, workdays: 5, apiUrl: '', webhook: '', threshold: 60, theme: 'auto' } };
  }

  /* Plantillas del radar (se re-generan con horas y postulantes aleatorios en cada escaneo) */
  const RADAR = [
    ['Backend Developer Node.js', 'Kiwi Systems', 'LinkedIn', 'backend'], ['Desarrollador Full Stack React/Node', 'Marea Tech', 'Indeed', 'fullstack'],
    ['UX/UI Designer', 'Lumen Studio', 'Behance Jobs', 'ux'], ['Backend Semi Senior TypeScript', 'Pampa Wallet', 'LinkedIn', 'fintech'],
    ['Frontend React Developer', 'Faro Apps', 'Computrabajo', 'front'], ['Product Designer', 'Cielo Retail', 'Glassdoor', 'product'],
    ['Node.js Developer', 'Andes Cloud', 'Bumeran', 'backend'], ['UX Researcher', 'Estudio Brújula', 'Workana', 'research'],
    ['DevOps Engineer', 'Nimbo', 'Remotive', 'devops'], ['Backend Engineer Python', 'Datalab', 'Arnow', 'python'],
    ['Diseñador UX/UI Mid', 'Trama Digital', 'GetOnBoard', 'ux'], ['Full Stack Developer', 'Orilla Software', 'Computrabajo', 'fullstack']
  ];
  const PORTALS = ['LinkedIn', 'Indeed', 'Computrabajo', 'Bumeran', 'Glassdoor', 'Workana', 'GetOnBoard', 'Remotive'];

  g.SEED = { buildSeed, T, RADAR, PORTALS, ymd };
  if (typeof module !== 'undefined') module.exports = g.SEED;
})(typeof window !== 'undefined' ? window : globalThis);
