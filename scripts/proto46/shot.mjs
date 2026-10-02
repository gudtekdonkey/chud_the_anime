// looks at the built prototype: node scripts/proto46/shot.mjs <out.png> [width] [query]
import { chromium } from 'playwright';
const [out, w = 400, q = ''] = process.argv.slice(2);
const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: +w, height: 860 }, hasTouch: true, isMobile: +w < 600 });
pg.on('pageerror', e => console.log('ERR', e.stack));
await pg.route(/^https?:/, r => r.abort());
await pg.goto('file://' + process.cwd() + '/' + (process.env.FILE || 'prototypes/46-combo-prompts.html') + q); await pg.waitForTimeout(900);
await pg.locator('#play').click(); await pg.evaluate(() => { const g = window.__p46; g.P.x = 262; g.P.y = 168; g.P.face = 1; g.O.touch = +innerWidth < 600; }); await pg.waitForTimeout(300);
await pg.keyboard.press('j'); for (let i = 0; i < 40 && !(await pg.evaluate(() => !!window.__p46.C.prompt)); i++) await pg.waitForTimeout(15);
await pg.waitForTimeout(90);
console.log('scrollWidth', await pg.evaluate(() => [document.documentElement.scrollWidth, innerWidth, document.getElementById('game').width]));
await pg.screenshot({ path: out, fullPage: !!process.env.FULL });
await b.close();
