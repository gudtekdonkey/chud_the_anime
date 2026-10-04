// node scripts/proto48/shoot.mjs [name ...]: the world-walk page's pictures, through the slice's real pipeline in Chromium
// (vite dev server, SwiftShader). Each shot is a query string for scripts/proto48/index.html; PNGs go to test-output/proto48/.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs';

export const SHOTS = {
  // the scale question: Ratomura (the start village) at three tile sizes, the same camera framing round him
  'scale-16': 'T=16&z=54,50', 'scale-32': 'T=32&z=54,50', 'scale-64': 'T=64&z=54,50',
  'scale-16-over': 'T=16&z=54,50&at=32,32&zoom=.26', 'scale-32-over': 'T=32&z=54,50&at=32,32&zoom=.13', 'scale-64-over': 'T=64&z=54,50&at=32,32&zoom=.065',
  // how a zone becomes 3D: blocks vs the kit, on a village and on wild forest with a road
  'blocks-village': 'mode=blocks&z=54,50', 'kit-village': 'z=54,50',
  'blocks-forest': 'mode=blocks&z=17,2&hero=32.5,33.5', 'kit-forest': 'z=17,2&hero=32.5,33.5',
  'kit-town': 'z=55,45', 'kit-camp': 'z=29,9&hero=32,42', 'kit-fort': 'z=25,2&hero=32,46', 'kit-shrine': 'z=9,1&hero=32,38', 'kit-bamboo': 'z=89,18&hero=32.5,33', 'kit-paddy': 'z=14,0&hero=32.5,33',
  // the four looks on the recommended build
  'style-0': 'z=54,50&style=0', 'style-1': 'z=54,50&style=1', 'style-2': 'z=54,50&style=2', 'style-3': 'z=54,50&style=3',
  // crossing the edge: 3 × 3 zones round him, the edges marked
  'stream-3x3': 'z=54,50&grid=3&at=32,32&zoom=.044&edge=1', 'edge-near': 'z=54,50&grid=3&hero=32.5,62.5&at=32.5,63&edge=1',
  // who holds it: banners in the holder's colour, the boundary stones, the name card
  'hold-flags': 'z=54,50&flags=1&hero=33.5,59&at=33,59.5', 'hold-card': 'z=54,50&card=1&hero=32.5,57&at=32.5,56', 'hold-both': 'z=55,45&flags=1&card=1',
  // the courtyard set into the start village
  'court-in-village': 'z=54,50&court=13,12&hero=20,14&at=22,17&zoom=.6', 'court-over': 'z=54,50&court=13,12&at=32,32&zoom=.13',
};
// the world map (map.html) and the slice itself as it is today
export const MAPS = { 'map-world': 'view=plain', 'map-window': 'view=window&c=54,50&span=16', 'map-hold': 'view=hold&c=54,50&span=30', 'map-route': 'view=route&c=58,54&span=24&to=64,61' };

const want = process.argv.slice(2), out = 'test-output/proto48'; fs.mkdirSync(out, { recursive: true });
const server = await createServer({ logLevel: 'silent', server: { port: 5199, strictPort: false } }); await server.listen();
const base = `http://localhost:${server.config.server.port}/scripts/proto48/index.html?`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', e => console.log('PAGE ERROR', e.message)); page.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); });
const info = {};
for (const [name, q] of Object.entries(SHOTS)) { if (want.length && !want.includes(name)) continue;
  await page.goto(base + q); await page.waitForFunction(() => window.__ready, null, { timeout: 240000 });
  info[name] = await page.evaluate(() => ({ buildMs: Math.round(window.__ready.buildMs), verts: window.__ready.verts }));
  await page.locator('canvas').screenshot({ path: `${out}/${name}.png` }); console.log(name, JSON.stringify(info[name])); }
for (const [name, q] of Object.entries(MAPS)) { if (want.length && !want.includes(name)) continue;
  await page.setViewportSize({ width: 800, height: 800 }); await page.goto(base.replace('index.html', 'map.html') + q); await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  info[name] = await page.evaluate(() => window.__route || null); await page.locator('canvas').screenshot({ path: `${out}/${name}.png` }); console.log(name, JSON.stringify(info[name])); }
if (!want.length || want.includes('now-slice')) { await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(base.replace('scripts/proto48/index.html?', '?iso&test&foes=1')); await page.waitForFunction(() => window.__iso && window.__iso.ready, null, { timeout: 240000 }); await page.waitForTimeout(4000);
  await page.locator('canvas').first().screenshot({ path: `${out}/now-slice.png` }); console.log('now-slice'); }
fs.writeFileSync(`${out}/info.json`, JSON.stringify(info, null, 1));
await browser.close(); await server.close();
