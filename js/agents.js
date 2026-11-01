/* JobTrack · Agentes IA (motor local de reglas: cada agente aplica su criterio sobre el CV y la oferta) */
(function (g) {
  'use strict';
  const N = g.NLP;
  const clamp = x => Math.max(0, Math.min(100, Math.round(x)));
  const verdict = s => s == null ? 'No aplica' : s >= 80 ? 'Avanza a entrevista' : s >= 60 ? 'Avanza con reservas' : 'No avanza';
  const note = (k, t) => ({ k, t });
  const ratio = (kws, set) => { const w = kws.reduce((a, k) => a + k.w, 0); return w ? set.reduce((a, k) => a + k.w, 0) / w : 0; };
  const has = (cv, re) => re.test(N.norm(N.toText(cv)));

  function ctxOf(cv, offer) {
    const kws = offer.keywords, sc = N.scoreOffer(kws, cv, offer.text), A = sc.cvAnalysis;
    const mset = new Set(sc.matched.map(k => k.term));
    return { cv, offer, kws, sc, A, mset, text: N.norm(N.toText(cv)), years: N.yearsOfExperience(cv) };
  }
  const domain = (c, d) => { const ks = c.kws.filter(k => k.domain === d); return { ks, got: ks.filter(k => c.mset.has(k.term)), miss: ks.filter(k => !c.mset.has(k.term)) }; };

  const AGENTS = [
    { id: 'rrhh', name: 'Agente de Recursos Humanos', short: 'RRHH', role: 'Perfil humano, cultura y claridad', skills: ['Habilidades blandas', 'Coherencia del perfil', 'Tono y legibilidad'], color: 5,
      run(c) {
        const d = domain(c, 'SOFT'), notes = [], recs = [];
        const softR = d.ks.length ? d.got.length / d.ks.length : 0.7;
        const comp = (c.A.checks.filter(x => /Nombre|Email|Tel|Ubicaci|LinkedIn|Resumen/.test(x.label)).reduce((a, x) => a + x.earned, 0)) / 23;
        const tone = c.A.checks.find(x => /pronombres/i.test(x.label)).ok ? 1 : 0.4;
        const s = clamp(softR * 35 + comp * 30 + tone * 10 + c.A.score * 0.25);
        notes.push(note(comp > 0.85 ? 'ok' : 'warn', comp > 0.85 ? 'Datos de contacto y resumen completos.' : 'Faltan datos de contacto o el resumen profesional.'));
        if (d.ks.length) notes.push(note(softR >= 0.6 ? 'ok' : 'warn', `Habilidades blandas pedidas: ${d.got.length}/${d.ks.length} reflejadas.`));
        else notes.push(note('ok', 'La oferta no destaca habilidades blandas específicas.'));
        notes.push(note(tone === 1 ? 'ok' : 'bad', tone === 1 ? 'Redacción impersonal y profesional.' : 'Usa pronombres personales; el CV pierde formalidad.'));
        d.miss.slice(0, 3).forEach(k => recs.push(`Si es cierto, demuestra “${k.term}” con un logro concreto (no solo listarlo).`));
        if (comp <= 0.85) recs.push('Completa contacto, ciudad y LinkedIn: RRHH descarta perfiles difíciles de contactar.');
        if (!tone) recs.push('Elimina “yo / mi / soy”.');
        return { score: s, notes, recs };
      } },
    { id: 'rec', name: 'Agente de Reclutamiento', short: 'Reclutador', role: 'Filtro ATS y lectura de 6 segundos', skills: ['Palabras clave', 'Formato ATS', 'Alineación de título'], color: 1,
      run(c) {
        const notes = [], recs = [], top = c.kws.slice(0, 5), third = c.text.slice(0, Math.ceil(c.text.length / 3));
        const scan = top.length ? top.filter(k => N.matchCV([k], third).coverage > 0).length / top.length : 0;
        const tt = N.tokens(c.offer.title).filter(w => w.length > 3);
        const align = tt.length ? tt.filter(w => N.norm(c.cv.fields.personal.title + ' ' + c.cv.fields.summary).includes(w.slice(0, 5))).length / tt.length : 0.5;
        const s = clamp(c.sc.coverage * 0.6 + scan * 15 + align * 10 + (c.A.checks.find(x => /Formato/.test(x.label)).ok ? 8 : 0) + (c.sc.stuffing ? -8 : 7));
        notes.push(note(c.sc.coverage >= 75 ? 'ok' : c.sc.coverage >= 55 ? 'warn' : 'bad', `Cobertura de palabras clave: ${c.sc.coverage}% (${c.sc.matched.length} de ${c.kws.length}).`));
        notes.push(note(scan >= 0.6 ? 'ok' : 'warn', `Lectura de 6 s: ${Math.round(scan * 100)}% de las 5 claves principales aparecen en el primer tercio del CV.`));
        notes.push(note(align >= 0.5 ? 'ok' : 'warn', align >= 0.5 ? 'Tu título/resumen refleja el nombre del puesto.' : `Tu título no refleja “${c.offer.title}”.`));
        if (c.sc.stuffing) notes.push(note('bad', 'Posible keyword stuffing: ' + (c.sc.stuff.map(x => x.term + '×' + x.count).join(', ') || 'puntaje sospechosamente alto') + '.'));
        c.sc.missing.slice(0, 4).forEach(k => recs.push(`Incorpora “${k.term}” de forma natural en Habilidades o en una viñeta, solo si lo dominas.`));
        if (align < 0.5) recs.push(`Ajusta el título del CV al puesto (“${c.offer.title}”).`);
        if (scan < 0.6) recs.push('Sube al resumen y a las primeras viñetas las 5 tecnologías principales de la oferta.');
        return { score: s, notes, recs };
      } },
    { id: 'it', name: 'Especialista Área IT', short: 'Esp. IT', role: 'Stack técnico y evidencia de ingeniería', skills: ['Stack y herramientas', 'Rendimiento y arquitectura', 'GitHub'], color: 0, area: 'IT',
      run(c) {
        const d = domain(c, 'IT'); if (!d.ks.length) return { score: null, notes: [note('warn', 'La oferta no pide stack técnico.')], recs: [] };
        const notes = [], recs = [], r = d.got.length / d.ks.length, gh = /github|gitlab|bitbucket/.test(c.text), perf = /latencia|rendimiento|performance|escalab|usuarios|solicitudes|requests|ms\b|%/.test(c.text);
        const s = clamp(r * 70 + (gh ? 10 : 0) + (perf ? 10 : 0) + c.A.impact * 0.1);
        notes.push(note(r >= 0.7 ? 'ok' : r >= 0.45 ? 'warn' : 'bad', `Stack requerido cubierto: ${d.got.length}/${d.ks.length}.`));
        if (d.miss.length) notes.push(note('warn', 'Brechas técnicas: ' + d.miss.slice(0, 5).map(k => k.term).join(', ') + '.'));
        notes.push(note(gh ? 'ok' : 'warn', gh ? 'Incluye repositorio de código.' : 'Sin enlace a GitHub/GitLab.'));
        notes.push(note(perf ? 'ok' : 'warn', perf ? 'Muestra impacto técnico medible.' : 'Falta evidencia de escala o rendimiento.'));
        d.miss.slice(0, 3).forEach(k => recs.push(`Agrega un mini-proyecto o experiencia con “${k.term}” (si no lo tienes, menciona que lo estás aprendiendo).`));
        if (!gh) recs.push('Enlaza GitHub con 2–3 repos fijados y README claro.');
        if (!perf) recs.push('Añade métricas técnicas: latencia, usuarios, solicitudes por día, cobertura de tests.');
        return { score: s, notes, recs };
      } },
    { id: 'dis', name: 'Especialista Área Diseño', short: 'Esp. Diseño', role: 'Herramientas, proceso y portfolio', skills: ['Figma y prototipado', 'Investigación', 'Portfolio'], color: 4, area: 'Diseño',
      run(c) {
        const d = domain(c, 'DIS'); if (!d.ks.length) return { score: null, notes: [note('warn', 'La oferta no pide competencias de diseño.')], recs: [] };
        const notes = [], recs = [], r = d.got.length / d.ks.length, pf = /behance|dribbble|portfolio|portafolio|figma\.com/.test(c.text), cs = /caso de estudio|case study|journey|usabilidad|investigacion/.test(c.text);
        const s = clamp(r * 70 + (pf ? 15 : 0) + (cs ? 10 : 0) + c.A.impact * 0.05);
        notes.push(note(r >= 0.7 ? 'ok' : r >= 0.45 ? 'warn' : 'bad', `Competencias de diseño cubiertas: ${d.got.length}/${d.ks.length}.`));
        notes.push(note(pf ? 'ok' : 'bad', pf ? 'Portfolio enlazado.' : 'No hay portfolio: es excluyente en diseño.'));
        notes.push(note(cs ? 'ok' : 'warn', cs ? 'Menciona proceso e investigación.' : 'No se ve el proceso (research, usabilidad, casos).'));
        d.miss.slice(0, 3).forEach(k => recs.push(`Muestra “${k.term}” en un caso de estudio y en una viñeta con resultado.`));
        if (!pf) recs.push('Agrega enlace a Behance, Dribbble o sitio personal en el encabezado.');
        return { score: s, notes, recs };
      } },
    { id: 'dirit', name: 'Director de Área IT', short: 'Dir. IT', role: 'Seniority, impacto y decisión final', skills: ['Nivel de seniority', 'Arquitectura y liderazgo', 'Impacto en negocio'], color: 6, area: 'IT',
      run(c) {
        const need = N.minYears(c.offer.text), d = domain(c, 'IT'); if (!d.ks.length) return { score: null, notes: [note('warn', 'Oferta fuera del área IT.')], recs: [] };
        const notes = [], recs = [], fit = need ? Math.min(1, c.years / need) : 0.8, lead = /liderazgo|lidere|mentor|arquitectura|disene|diseno de sistemas|coordine|dirigi/.test(c.text), biz = /ahorr|ingreso|conversion|costos|clientes|usuarios/.test(c.text);
        const s = clamp(fit * 35 + (d.got.length / d.ks.length) * 30 + c.A.impact * 0.2 + (lead ? 8 : 0) + (biz ? 7 : 0));
        notes.push(note(fit >= 0.9 ? 'ok' : fit >= 0.6 ? 'warn' : 'bad', need ? `Seniority: pide ${need}+ años, tu CV suma ~${c.years}.` : `Años de experiencia estimados en el CV: ~${c.years}.`));
        notes.push(note(lead ? 'ok' : 'warn', lead ? 'Hay señales de arquitectura/liderazgo técnico.' : 'Sin evidencia de decisiones técnicas ni mentoring.'));
        notes.push(note(biz ? 'ok' : 'warn', biz ? 'Conecta lo técnico con resultados de negocio.' : 'No relaciona el trabajo con impacto de negocio.'));
        if (fit < 0.9) recs.push('Refuerza proyectos y responsabilidad real para compensar los años que pide la oferta.');
        if (!lead) recs.push('Incluye una viñeta sobre una decisión de arquitectura o mentoría.');
        if (!biz) recs.push('Traduce una mejora técnica a impacto: costos, usuarios, ingresos o tiempo ahorrado.');
        return { score: s, notes, recs };
      } },
    { id: 'dirdis', name: 'Director de Área Diseño', short: 'Dir. Diseño', role: 'Criterio de producto y madurez de diseño', skills: ['Design systems', 'Métricas de diseño', 'Liderazgo creativo'], color: 7, area: 'Diseño',
      run(c) {
        const need = N.minYears(c.offer.text), d = domain(c, 'DIS'); if (!d.ks.length) return { score: null, notes: [note('warn', 'Oferta fuera del área de diseño.')], recs: [] };
        const notes = [], recs = [], fit = need ? Math.min(1, c.years / need) : 0.8, sys = /design system|sistema de diseno|componentes/.test(c.text), met = /conversion|retencion|nps|tiempo|usuarios|%/.test(c.text), lead = /lidere|mentor|coordine|dirigi|liderazgo/.test(c.text);
        const s = clamp(fit * 30 + (d.got.length / d.ks.length) * 30 + (sys ? 12 : 0) + (met ? 14 : 0) + (lead ? 8 : 0) + c.A.impact * 0.06);
        notes.push(note(fit >= 0.9 ? 'ok' : fit >= 0.6 ? 'warn' : 'bad', need ? `Seniority: pide ${need}+ años, tu CV suma ~${c.years}.` : `Experiencia estimada: ~${c.years} años.`));
        notes.push(note(sys ? 'ok' : 'warn', sys ? 'Experiencia con sistemas de diseño.' : 'No se ve trabajo con design systems.'));
        notes.push(note(met ? 'ok' : 'warn', met ? 'Los resultados de diseño están medidos.' : 'El diseño no está atado a métricas de producto.'));
        if (!met) recs.push('Mide el efecto de tus diseños: conversión, tiempo de tarea, errores o NPS.');
        if (!sys) recs.push('Documenta un design system o librería de componentes en tu portfolio.');
        if (!lead) recs.push('Muestra liderazgo: mentoría, workshops o coordinación con producto/desarrollo.');
        return { score: s, notes, recs };
      } }
  ];

  const WEIGHTS = {
    IT: { rrhh: .15, rec: .25, it: .25, dirit: .35 },
    'Diseño': { rrhh: .15, rec: .25, dis: .25, dirdis: .35 },
    other: { rrhh: .4, rec: .4, it: .1, dis: .1 }
  };

  function evaluate(cv, offer) {
    const c = ctxOf(cv, offer), area = offer.area, W = WEIGHTS[area] || WEIGHTS.other;
    const res = AGENTS.map(a => { const inScope = !a.area || a.area === area || !WEIGHTS[area]; const r = a.run(c); const w = W[a.id] || 0; return { agent: a, ...r, weight: w, used: r.score != null && w > 0, scope: inScope }; });
    let tw = 0, ts = 0; res.forEach(r => { if (r.used) { tw += r.weight; ts += r.score * r.weight; } });
    const consensus = tw ? Math.round(ts / tw) : c.sc.final;
    const recs = []; const seen = new Set();
    res.filter(r => r.used || !r.agent.area).sort((a, b) => (a.score ?? 100) - (b.score ?? 100)).forEach(r => r.recs.forEach(t => { if (!seen.has(t)) { seen.add(t); recs.push({ by: r.agent.short, t }); } }));
    return { results: res, consensus, band: N.bandOf(consensus), match: c.sc, recs: recs.slice(0, 10) };
  }

  /* Brecha de palabras clave: todas las ofertas cargadas vs un CV */
  function gapForCV(cv, offers) {
    const text = N.toText(cv), map = new Map();
    offers.forEach(o => { const m = N.matchCV(o.keywords.filter(k => k.dict), text); m.missing.forEach(k => { const e = map.get(k.term) || { term: k.term, domain: k.domain, offers: 0, w: 0 }; e.offers++; e.w += k.w; map.set(k.term, e); }); });
    return [...map.values()].sort((a, b) => b.w - a.w).slice(0, 12);
  }

  g.AGENTS = { AGENTS, evaluate, gapForCV, verdict };
  if (typeof module !== 'undefined') module.exports = g.AGENTS;
})(typeof window !== 'undefined' ? window : globalThis);
