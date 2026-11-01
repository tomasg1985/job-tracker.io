// Navegador Playwright compartido. Un solo contexto, páginas serializadas y pausas aleatorias.
import { sleep, jitter } from './time.js';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export async function createContext({ headless = true, delay = [700, 1600] } = {}) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ userAgent: UA, locale: 'es-AR', viewport: { width: 1366, height: 900 } });
  await context.route('**/*', r => (['image', 'media', 'font'].includes(r.request().resourceType()) ? r.abort() : r.continue()));
  let chain = Promise.resolve();
  const getHtml = (url, { waitFor } = {}) => (chain = chain.then(async () => {
    await sleep(jitter(...delay));
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      if (waitFor) await page.waitForSelector(waitFor, { timeout: 8000 }).catch(() => { });
      return await page.content();
    } finally { await page.close(); }
  }));
  chain.catch(() => { });
  return { getHtml, close: () => browser.close() };
}
