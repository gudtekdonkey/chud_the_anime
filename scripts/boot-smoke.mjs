// node scripts/boot-smoke.mjs (after a build): opens every page of the built game in Chromium and fails on any page error
// or a page that never gets ready. A minute instead of check:iso's twenty, for the engine split (docs/engine-extract.md):
// moving a module changes the order things load in, which only a real page shows.
import { chromium } from 'playwright';
import { preview } from 'vite';

const PAGES = ['', '?hd', '?iso&test', '?iso&test&squad', '?iso&test&sheet', '?iso&test&idles', '?iso&test&arsenal', '?iso&test&hairgrid', '?iso&test&gear',
  '?iso&test&reel=chain', '?iso&test&weapon=yari', '?iso&test&group=archers'];
const server = await preview({ logLevel: 'silent', preview: { port: 4175, strictPort: false, open: false } }), base = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let bad = 0;
for (const q of PAGES) { const page = await browser.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(new URL(q, base).href); await page.waitForTimeout(q.startsWith('?iso') ? 5000 : 3000);
  const ready = await page.evaluate(() => window.__iso ? !!window.__iso.ready || !!window.__iso.hairgrid || 'up' : !!document.querySelector('canvas'));
  const ok = !errors.length && ready; if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${q || '/'}${errors.length ? '  ' + errors.slice(0, 2).join(' | ') : ''}${ready ? '' : '  (never ready)'}`);
  await page.close(); }
await browser.close(); await server.close(); process.exit(bad ? 1 : 0);
