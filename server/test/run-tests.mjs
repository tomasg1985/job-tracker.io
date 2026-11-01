import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseAgoHours, hoursFromDatetime, parseApplicants, slugify } from '../lib/time.js';
import * as li from '../scrapers/linkedin.js';
import * as ind from '../scrapers/indeed.js';
import * as ct from '../scrapers/computrabajo.js';
import { scan } from '../lib/scan.js';
import * as gob from '../scrapers/getonboard.js';
import * as rok from '../scrapers/remoteok.js';
import * as wwr from '../scrapers/weworkremotely.js';
import * as rem from '../scrapers/remotive.js';
import * as arb from '../scrapers/arbeitnow.js';
import { matchesQuery, toEnglish } from '../lib/query.js';
const fx = n => readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fixtures', n), 'utf8');
let ok = 0; const t = (n, f) => Promise.resolve().then(f).then(() => { ok++; console.log('✓', n); }).catch(e => { console.error('✗', n, '\n', e.message); process.exitCode = 1; });

await t('parseAgoHours', () => {
  assert.equal(parseAgoHours('hace 3 horas'), 3); assert.equal(parseAgoHours('2 days ago'), 48);
  assert.equal(parseAgoHours('Publicado hace 5 horas'), 5); assert.equal(parseAgoHours('Just posted'), 1);
  assert.equal(parseAgoHours('hace 30 minutos'), 0.5); assert.equal(parseAgoHours('xyz'), null);
});
await t('hoursFromDatetime', () => {
  const now = Date.parse('2026-10-31T15:00:00'); assert.ok(hoursFromDatetime('2026-10-31', now) <= 24);
  assert.ok(hoursFromDatetime('2026-10-29', now) > 24); assert.equal(hoursFromDatetime('', now), null);
});
await t('parseApplicants', () => {
  assert.deepEqual(parseApplicants('Be among the first 25 applicants'), { applicants: null, applicantsMax: 25, over: false });
  assert.equal(parseApplicants('Over 200 applicants').applicants, 200); assert.equal(parseApplicants('Over 200 applicants').over, true);
  assert.equal(parseApplicants('12 solicitantes').applicants, 12); assert.equal(parseApplicants('Más de 50 postulantes').applicants, 50);
  assert.equal(parseApplicants('nada').applicants, null);
});
await t('slugify', () => assert.equal(slugify('Desarrollador Node.js / Backend'), 'desarrollador-node-js-backend'));
await t('linkedin.parseList', () => {
  const r = li.parseList(fx('linkedin-list.html')); assert.equal(r.length, 2);
  assert.equal(r[0].id, '3901234567'); assert.equal(r[0].title, 'Backend Developer Node.js'); assert.equal(r[0].company, 'Acme SA');
  assert.equal(r[0].url, 'https://www.linkedin.com/jobs/view/3901234567'); assert.ok(r[1].hoursAgo > 24);
});
await t('linkedin.parseDetail', () => {
  const d = li.parseDetail(fx('linkedin-detail.html')); assert.match(d.text, /- Node\.js/); assert.equal(d.applicantsMax, 25);
});
await t('indeed.parseList/Detail/blocked', () => {
  const r = ind.parseList(fx('indeed-list.html')); assert.equal(r.length, 1); assert.equal(r[0].id, 'abc123def456'); assert.equal(r[0].company, 'Gamma SRL'); assert.equal(r[0].hoursAgo, 5);
  assert.match(ind.parseDetail(fx('indeed-detail.html')).text, /Django/);
  assert.equal(ind.isBlocked(fx('indeed-blocked.html')), true); assert.equal(ind.isBlocked(fx('indeed-list.html')), false);
});
await t('computrabajo.parseList/Detail', () => {
  const r = ct.parseList(fx('computrabajo-list.html')); assert.equal(r.length, 1); assert.equal(r[0].title, 'Dev Backend'); assert.equal(r[0].hoursAgo, 4);
  assert.ok(r[0].url.startsWith('https://ar.computrabajo.com/')); assert.equal(r[0].company, 'Delta SA');
  const d = ct.parseDetail(fx('computrabajo-detail.html')); assert.match(d.text, /Node/); assert.equal(d.applicants, 50);
});
await t('query ES/EN', () => {
  assert.equal(matchesQuery('desarrollador backend node', 'Backend Engineer node'), true); assert.equal(matchesQuery('desarrollador backend', 'Chef de cocina'), false);
  assert.equal(toEnglish('desarrollador backend'), 'developer backend');
});
await t('getonboard.parseItems', () => {
  const r = gob.parseItems(JSON.parse(fx('getonboard.json')), 1793375302000 + 3 * 36e5)[0];
  assert.equal(r.company, '23people'); assert.equal(r.applicants, 38); assert.equal(r.modality, 'Híbrido'); assert.equal(Math.round(r.hoursAgo), 3); assert.match(r.text, /Node\.js/); assert.ok(r.url.startsWith('https://www.getonbrd.com/'));
});
await t('remoteok.parseItems', () => {
  const r = rok.parseItems(JSON.parse(fx('remoteok.json'))); assert.equal(r.length, 2); assert.equal(r[0].title, 'Backend Engineer & APIs'); assert.equal(r[0].company, 'Acme');
});
await t('weworkremotely.parseRss', () => {
  const r = wwr.parseRss(fx('wwr.xml')); assert.equal(r.length, 1); assert.equal(r[0].company, 'Bitovi'); assert.equal(r[0].title, 'Backend / Platform Developer'); assert.match(r[0].text, /Kubernetes/);
});
await t('remotive/arbeitnow.parseItems', () => {
  const a = rem.parseItems(JSON.parse(fx('remotive.json')))[0]; assert.equal(a.company, 'Foo'); assert.ok(a.hoursAgo >= 0);
  const b = arb.parseItems(JSON.parse(fx('arbeitnow.json')))[0]; assert.equal(b.modality, 'Remoto'); assert.equal(b.id, 'dev-1');
});
await t('scan() con contexto simulado', async () => {
  const calls = [];
  const ctx = { getHtml: async (url) => { calls.push(url);
    if (url.includes('seeMoreJobPostings')) return url.includes('start=0') ? fx('linkedin-list.html') : '<ul></ul>';
    if (url.includes('jobPosting/')) return fx('linkedin-detail.html');
    if (url.includes('indeed')) return fx('indeed-blocked.html');
    if (url.includes('computrabajo.com/trabajo-de')) return fx('computrabajo-list.html');
    return fx('computrabajo-detail.html'); } };
  const r = await scan({ query: 'backend', hours: 24, limit: 10, detail: true, portals: ['linkedin', 'indeed', 'computrabajo'] }, ctx);
  assert.equal(r.offers.length, 2); assert.equal(r.errors.length, 1); assert.equal(r.errors[0].portal, 'indeed');
  const l = r.offers.find(o => o.portal === 'LinkedIn'); assert.equal(l.applicantsMax, 25); assert.match(l.text, /PostgreSQL/);
  assert.ok(calls.some(c => c.includes('f_TPR=r86400')));
});
console.log(`\n${ok} pruebas OK`);
