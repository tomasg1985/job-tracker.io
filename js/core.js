/* JobTrack · núcleo: estado, persistencia, utilidades, gráficos, modal y avisos */
(function (g) {
  'use strict';
  const N = g.NLP, JT = g.JT = { ui: { view: 'dashboard', ptab: 'nueva', draft: null, radar: null, hist: { q: '', status: '', portal: '' }, kw: { q: '', area: '', band: '' }, agentRun: null, gapCv: null } };
  const KEY = 'jobtrack.v1';

  /* ---------- helpers ---------- */
  JT.$ = (s, r = document) => r.querySelector(s); JT.$$ = (s, r = document) => [...r.querySelectorAll(s)];
  JT.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  JT.uid = p => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  JT.ymd = SEED.ymd;
  JT.today = () => JT.ymd(new Date());
  JT.days = n => Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (n - 1 - i)); return JT.ymd(d); });
  JT.dm = s => { const d = new Date(s + 'T12:00:00'); return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }); };
  JT.fdate = iso => iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  JT.ago = iso => { const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };
  JT.cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  JT.sleep = ms => new Promise(r => setTimeout(r, ms));
  JT.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  JT.avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

  const ICONS = {
    grid: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>', send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
    chart: '<path d="M3 3v18h18M7 15l4-4 3 3 5-6"/>', target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    tags: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01"/>', history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h8"/>', bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 13h.01M15 13h.01M9 17h6"/><circle cx="12" cy="3.5" r="1"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M5 12l5 5L20 7"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12l6-6"/>', bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
    download: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/>', copy: '<path d="M8 8h12v12H8zM4 16V4h12"/>', edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>', play: '<path d="M6 4l14 8-14 8z"/>', sparkle: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>', upload: '<path d="M12 16V4m0 0-4 4m4-4 4 4M4 20h16"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
  };
  JT.ico = (n, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${ICONS[n] || ''}</svg>`;

  /* ---------- estado ---------- */
  JT.load = () => {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    if (!s || !s.cvs) s = SEED.buildSeed();
    s.settings = Object.assign({ dailyMin: 200, dailyMax: 300, workdays: 5, apiUrl: '', webhook: '', threshold: 60, theme: 'auto', cover: true, autoMode: 'assigned' }, s.settings || {});
    s.cvs.forEach(c => { c.ver = c.ver || 1; if (c.active === undefined) c.active = true; });
    JT.state = s;
  };
  JT.save = () => { try { localStorage.setItem(KEY, JSON.stringify(JT.state)); } catch (e) { /* almacenamiento no disponible */ } };
  JT.S = () => JT.state;

  /* ---------- estados de postulación ---------- */
  JT.STATUS = { espera: ['En espera', 'info'], aplicada: ['Aplicada', 'nodot'], sin_respuesta: ['Sin respuesta', 'nodot'], entrevista: ['Entrevista', 'good'], oferta: ['Oferta', 'good'], rechazada: ['Rechazada', 'bad'] };
  JT.statusPill = s => { const [l, c] = JT.STATUS[s] || [s, '']; return `<span class="pill ${c}">${l}</span>`; };
  JT.cvOf = id => JT.state.cvs.find(c => c.id === id);
  JT.scoreBadge = n => `<span class="score ${N.bandOf(n).id} num">${n}%</span>`;
  JT.bandPill = n => { const b = N.bandOf(n); return `<span class="pill ${b.id}">${b.label}</span>`; };

  const memo = new Map();
  JT.offerMatch = o => { const cv = JT.cvOf(o.cvId); if (!cv) return null; const k = o.id + '|' + cv.id + '|' + cv.ver + '|' + o.keywords.length; if (!memo.has(k)) memo.set(k, N.scoreOffer(o.keywords, cv, o.text)); return memo.get(k); };
  JT.refreshScores = () => { memo.clear(); JT.state.offers.forEach(o => { const m = JT.offerMatch(o); if (m) { o.score = m.final; o.coverage = m.coverage; } }); };
  JT.rankCVs = (kws, text) => JT.state.cvs.map(cv => ({ cv, sc: N.scoreOffer(kws, cv, text) })).sort((a, b) => b.sc.final - a.sc.final);
  JT.analysis = cv => { const k = 'a|' + cv.id + '|' + cv.ver; if (!memo.has(k)) memo.set(k, N.analyzeCV(cv)); return memo.get(k); };

  /* ---------- métricas de envío ---------- */
  JT.sentOn = d => (JT.state.manualSent[d] || 0) + JT.state.offers.filter(o => o.appliedAt && JT.ymd(o.appliedAt) === d && !(o._counted)).length;
  JT.weekDays = () => { const now = new Date(), wd = (now.getDay() + 6) % 7, out = []; for (let i = 0; i < 7; i++) { const d = new Date(now); d.setDate(now.getDate() - wd + i); out.push(JT.ymd(d)); } return out; };
  JT.sentWeek = () => JT.weekDays().reduce((a, d) => a + JT.sentOn(d), 0);
  JT.goalWeek = () => ({ min: JT.state.settings.dailyMin * JT.state.settings.workdays, max: JT.state.settings.dailyMax * JT.state.settings.workdays });
  JT.sentAll = () => Object.values(JT.state.manualSent).reduce((a, b) => a + b, 0) + JT.state.offers.filter(o => o.appliedAt).length;

  /* ---------- estadística ---------- */
  JT.pearson = (x, y) => { const n = x.length; if (n < 3) return 0; const mx = JT.avg(x), my = JT.avg(y); let a = 0, b = 0, c = 0; for (let i = 0; i < n; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; c += (y[i] - my) ** 2; } return b && c ? a / Math.sqrt(b * c) : 0; };
  JT.linreg = y => { const n = y.length, x = y.map((_, i) => i), mx = JT.avg(x), my = JT.avg(y); let a = 0, b = 0; for (let i = 0; i < n; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; } const m = b ? a / b : 0; return { slope: m, intercept: my - m * mx }; };
  JT.movavg = (y, w = 3) => y.map((_, i) => JT.avg(y.slice(Math.max(0, i - w + 1), i + 1)));

  /* ---------- gráficos (Chart.js) ---------- */
  const charts = {};
  JT.destroyCharts = () => { Object.values(charts).forEach(c => c.destroy()); Object.keys(charts).forEach(k => delete charts[k]); };
  JT.chart = (id, cfg) => {
    const el = document.getElementById(id); if (!el || !g.Chart) return;
    if (charts[id]) charts[id].destroy();
    const ink = JT.cssv('--ink2'), line = JT.cssv('--line'), muted = JT.cssv('--muted');
    Chart.defaults.font.family = "'DM Sans', system-ui, sans-serif"; Chart.defaults.font.size = 12; Chart.defaults.color = ink;
    cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false, animation: { duration: 500 } }, cfg.options || {});
    const o = cfg.options; o.plugins = Object.assign({ legend: { display: false }, tooltip: { backgroundColor: JT.cssv('--ink'), titleColor: JT.cssv('--bg'), bodyColor: JT.cssv('--bg'), padding: 10, cornerRadius: 8, displayColors: true, boxPadding: 4 } }, o.plugins || {});
    if (cfg.type !== 'doughnut') { o.scales = o.scales || {}; ['x', 'y'].forEach(a => { const s = o.scales[a] = Object.assign({}, o.scales[a] || {}); s.grid = Object.assign({ color: a === 'y' || o.indexAxis === 'y' && a === 'x' ? line : 'transparent', drawTicks: false }, s.grid || {}); s.border = { display: false }; s.ticks = Object.assign({ color: muted, padding: 6 }, s.ticks || {}); }); }
    charts[id] = new Chart(el.getContext('2d'), cfg);
  };
  JT.series = n => JT.cssv('--s' + (((n - 1) % 8) + 1));

  /* ---------- gauge SVG ---------- */
  JT.ring = (v, size = 120, sw = 11, color, label = '', sub = '') => {
    const r = (size - sw) / 2, c = 2 * Math.PI * r, p = JT.clamp(v, 0, 100) / 100, col = color || JT.cssv(v >= 80 ? '--s3' : v >= 60 ? '--s4' : '--s8');
    return `<span class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle class="bg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}" stroke="${col}" stroke-dasharray="${c * p} ${c}"/></svg><span class="c"><b class="num" style="font-size:${size / 4.6}px">${label || Math.round(v) + '%'}</b>${sub ? `<small>${sub}</small>` : ''}</span></span>`;
  };

  /* ---------- modal y toasts ---------- */
  JT.modal = ({ title, body, footer = '', size = '', onOpen }) => {
    JT.closeModal(); const bg = document.createElement('div'); bg.className = 'modal-bg'; bg.id = 'modalBg';
    bg.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${JT.esc(title)}"><div class="modal-h"><h3>${title}</h3><button class="btn ghost sm" data-act="close-modal" aria-label="Cerrar">${JT.ico('x')}</button></div><div class="modal-b" id="modalBody">${body}</div>${footer ? `<div class="modal-f" id="modalFoot">${footer}</div>` : ''}</div>`;
    bg.addEventListener('mousedown', e => { if (e.target === bg) JT.closeModal(); });
    document.body.appendChild(bg); if (onOpen) onOpen(bg);
  };
  JT.closeModal = () => { const m = document.getElementById('modalBg'); if (m) m.remove(); JT.onModalClose && JT.onModalClose(); JT.onModalClose = null; };
  JT.toast = (msg, kind = 'ok', title = '') => {
    let box = document.getElementById('toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = `${kind === 'ok' ? JT.ico('check', 'width="18" height="18"') : ''}<div>${title ? `<b>${JT.esc(title)}</b><br>` : ''}${msg}</div>`;
    box.appendChild(t); setTimeout(() => t.remove(), kind === 'ok' ? 5200 : 7000);
  };
  JT.copy = async (text, okMsg = 'Copiado al portapapeles') => {
    try { await navigator.clipboard.writeText(text); JT.toast(okMsg); }
    catch (e) { JT.modal({ title: 'Copia el texto', size: 'sm', body: `<textarea id="copyArea" style="min-height:240px" readonly>${JT.esc(text)}</textarea>`, onOpen: () => { const t = JT.$('#copyArea'); t.focus(); t.select(); } }); }
  };
  JT.download = (name, text, mime = 'text/plain') => {
    try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime + ';charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); JT.toast(`Descarga iniciada: ${JT.esc(name)}. Si el navegador la bloquea, usa “Copiar”.`, 'ok'); }
    catch (e) { JT.copy(text, 'No se pudo descargar; texto copiado'); }
  };

  /* ---------- CV como HTML (modelo Harvard) ---------- */
  JT.harvardHTML = (cv, forDoc = false) => {
    const f = cv.fields, p = f.personal, e = JT.esc;
    const sec = (t, arr) => arr.length ? `<h2>${t}</h2>` + arr.map(x => `<div class="ln"><span><b>${e(x.org)}</b></span><span>${e(x.loc)}</span></div><div class="ln ro"><span>${e(x.role)}</span><span>${e(x.dates)}</span></div>${(x.bullets || []).filter(b => b.trim()).length ? '<ul>' + x.bullets.filter(b => b.trim()).map(b => `<li>${e(b)}</li>`).join('') + '</ul>' : ''}`).join('') : '';
    const s = f.skills, sk = [s.technical && `<b>Técnicas:</b> ${e(s.technical)}`, s.languages && `<b>Idiomas:</b> ${e(s.languages)}`, s.interests && `<b>Intereses:</b> ${e(s.interests)}`, f.certs && `<b>Certificaciones:</b> ${e(f.certs)}`].filter(Boolean);
    return `<h1>${e(p.name)}</h1><div class="ct">${[p.title, p.location, p.phone, p.email, p.linkedin, p.links].filter(Boolean).map(e).join(' &nbsp;|&nbsp; ')}</div>${f.summary ? `<h2>Resumen profesional</h2><p>${e(f.summary)}</p>` : ''}${sec('Educación', f.education)}${sec('Experiencia', f.experience)}${sec('Proyectos', f.projects)}${sec('Liderazgo y actividades', f.leadership)}${sk.length ? '<h2>Habilidades e intereses</h2>' + sk.map(x => `<p>${x}</p>`).join('') : ''}`;
  };
  JT.wordDoc = cv => `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${JT.esc(cv.name)}</title><style>body{font-family:'Times New Roman',serif;font-size:11pt;line-height:1.25}h1{font-size:18pt;text-align:center;margin:0}.ct{text-align:center;font-size:10pt;margin-bottom:8pt}h2{font-size:11pt;text-transform:uppercase;border-bottom:1px solid #000;margin:10pt 0 4pt}.ln{width:100%}.ln span:last-child{float:right}.ro{font-style:italic}ul{margin:2pt 0 6pt}@page{margin:0.7in}</style></head><body>${JT.harvardHTML(cv, true)}</body></html>`;
  JT.fileSlug = s => N.norm(s).trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'cv';
  JT.cvText = cv => N.toText(cv);

  /* ---------- carta de presentación breve ---------- */
  JT.cover = (offer, cv, sc) => {
    const top = sc.matched.slice(0, 4).map(k => k.term).join(', '), p = cv.fields.personal;
    return `Hola equipo de ${offer.company || 'reclutamiento'},\n\nMe postulo a ${offer.title}. ${top ? `Mi experiencia incluye ${top}, ` : ''}y los resultados que muestro en mi CV están medidos con métricas concretas.\n\nAdjunto el CV “${cv.name}” (compatibilidad estimada ${sc.final}%). Quedo a disposición para una entrevista.\n\nSaludos,\n${p.name}`;
  };

  /* ---------- tema ---------- */
  JT.applyTheme = () => { const t = JT.state.settings.theme, r = document.documentElement; if (t === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', t); };
  JT.isDark = () => { const t = JT.state.settings.theme; return t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches); };
})(window);
