// the turn-speed section while it plays: node scripts/proto36/shot-speeds.mjs <out prefix>
import { chromium } from 'playwright';
const [out] = process.argv.slice(2);
const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1180, height: 900 } });
pg.on('pageerror', e => console.log('ERR', e.stack));
await pg.route(/^https?:/, r => r.abort());
await pg.goto('file://' + process.cwd() + '/prototypes/36-port-true-left.html');
for (const ms of [1150, 1230, 1300, 2500]) { await pg.waitForTimeout(ms === 2500 ? 1100 : ms === 1150 ? 1150 : 60); await pg.locator('.speeds').screenshot({ path: `${out}-${ms}.png` }); }
await b.close();
