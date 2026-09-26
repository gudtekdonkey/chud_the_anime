// the idle-to-cut loop facing west, captured at a few moments: node scripts/proto36/shot-atk.mjs <out prefix>
import { chromium } from 'playwright';
const [out] = process.argv.slice(2);
const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1180, height: 900 } });
pg.on('pageerror', e => console.log('ERR', e.stack));
await pg.route(/^https?:/, r => r.abort());
await pg.goto('file://' + process.cwd() + '/prototypes/36-port-true-left.html');
for (const t of [1.0, 1.3, 1.45, 1.6, 2.2]) {
  await pg.evaluate(t => { const s = window.__proto; s.play = false; s.t = t; }, t); await pg.waitForTimeout(150);
  await pg.locator('.atk').screenshot({ path: `${out}-${t}.png` }); }
await b.close();
