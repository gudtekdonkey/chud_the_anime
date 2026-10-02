// node scripts/iso-reel.mjs [reel] [style] [look]: a contact sheet of one of the Animation Flow page's scenarios as
// the slice plays it (?iso&reel=<name>, src/iso/reel.js), laid out the way the page's own sheets are (af/sheetfn.js:
// a frame every 1/30 s, 120×80 crops round his feet, ×2, the game time under each); with AF_DIR set to the page's
// source (scratchpad/af) the page's own sheet is drawn above it, for the side-by-side. Needs a build (npm run build).
// Output: test-output/iso/reel-<name>[-vs].png
import { chromium } from 'playwright';
import { preview } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const [name = 'chain', style = '3', look = '3d'] = process.argv.slice(2);
const O = { idle: { n: 16, every: 8 }, chain: { n: 32, every: 4, skip: 36 }, roll: { n: 24, every: 4, skip: 40 }, start: { n: 16, every: 4, skip: 64 },
  stop: { n: 24, every: 4, skip: 80 }, turn: { n: 32, every: 6, skip: 40 }, lunge: { n: 24, every: 4, skip: 90 }, sheathe: { n: 32, every: 8, skip: 40 } }[name] || { n: 24, every: 4 };
const opt = { cw: 120, ch: 80, cols: 8, scale: 2, ...O };
const OUT = 'test-output/iso'; fs.mkdirSync(OUT, { recursive: true });
const server = await preview({ logLevel: 'silent', preview: { port: 4175, strictPort: false, open: false } });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

// the slice's frames: the reel stepped 1/120 s at a time, exactly as the page's World.step, cropped round his feet
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('pageerror', e => console.error('pageerror', e.message));
await page.goto(new URL(`?iso&test&reel=${name}&style=${style}&look=${look}&zoom=1&k=1${process.env.CLASH ? "&clash&cine" : ""}`, server.resolvedUrls.local[0]).href);
await page.waitForFunction(() => window.__reel, undefined, { timeout: 60000 });
await page.evaluate(() => { const P = window.__iso && window.__iso.PIPE; if (P) { P.lowres = 1; if (P.onChange) P.onChange(); } });
const frames = []; await page.evaluate(n => window.__reel.steps(n), opt.skip || 0);
for (let f = 0; f < opt.n; f++) {
  const at = await page.evaluate(() => window.__reel.steps(0));
  const r = await page.locator('canvas').boundingBox(), px = await page.evaluate(() => window.__iso.px.hero);
  const s = r.width / 960, cx = r.x + (px[0] * 960 - opt.cw / 2) * s, cy = r.y + (px[1] * 540 - opt.ch + 10) * s;
  frames.push({ png: (await page.screenshot({ clip: { x: cx, y: cy, width: opt.cw * s, height: opt.ch * s } })).toString('base64'), label: at.toFixed(3) + (await page.evaluate(() => window.__reel.stop > 0) ? ' stop' : '') });
  await page.evaluate(n => window.__reel.steps(n), opt.every);
}
// the page's own sheet, if its source is at hand
let afPng = null;
if (process.env.AF_DIR && fs.existsSync(path.join(process.env.AF_DIR, 'sheet.html'))) {
  const ap = await browser.newPage({ viewport: { width: 2000, height: 1400 } }); await ap.goto('file://' + path.resolve(process.env.AF_DIR, 'sheet.html'));
  await ap.evaluate(([n, o]) => window.SHEET(n, 'flow', o), [name, opt]); afPng = (await ap.locator('#c').screenshot()).toString('base64'); await ap.close();
}
// lay the slice's frames out as the page does, under its sheet
const W = opt.cols * opt.cw * opt.scale, rows = Math.ceil(opt.n / opt.cols), H = rows * (opt.ch + 10) * opt.scale;
const comp = await browser.newPage({ viewport: { width: W, height: 200 } });
await comp.setContent(`<body style="margin:0;background:#111;color:#9aa;font:16px monospace"><div id=w></div></body>`);
await comp.evaluate(async ({ frames, opt, W, H, afPng, name, style, look }) => {
  const w = document.getElementById('w'), load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = 'data:image/png;base64,' + src; });
  const head = t => { const d = document.createElement('div'); d.textContent = t; d.style.padding = '6px 4px'; w.appendChild(d); };
  if (afPng) { head(`The Animation Flow page: ${name}`); const im = await load(afPng); im.style.display = 'block'; im.style.width = W + 'px'; w.appendChild(im); }
  head(`The iso slice, ${look === "pixel" ? "pixel" : "3D"} look, style ${style}: ${name} (the same script, the same clock)`);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; w.appendChild(cv); const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  for (let f = 0; f < frames.length; f++) { const im = await load(frames[f].png), x = (f % opt.cols) * opt.cw * opt.scale, y = Math.floor(f / opt.cols) * (opt.ch + 10) * opt.scale;
    g.drawImage(im, x, y, opt.cw * opt.scale, opt.ch * opt.scale); g.fillStyle = '#9aa'; g.font = '16px monospace'; g.fillText(frames[f].label, x + 3, y + opt.ch * opt.scale + 16); }
}, { frames, opt, W, H, afPng, name, style, look });
const file = `${OUT}/reel-${name}${afPng ? '-vs' : ''}${look === 'pixel' ? '-pixel' : ''}.png`;
await comp.locator('#w').screenshot({ path: file }); console.log('wrote', file);
await browser.close(); await server.close();
