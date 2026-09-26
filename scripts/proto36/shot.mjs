// looks at the built prototype: node scripts/proto36/shot.mjs <out prefix> [move:weapon:outfit:frame ...]
import { chromium } from 'playwright';
const [out, ...cases] = process.argv.slice(2);
const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: +(process.env.VW || 1180), height: 900 } });
pg.on('pageerror', e => console.log('ERR', e.stack));
await pg.route(/^https?:/, r => r.abort());
await pg.goto('file://' + process.cwd() + '/prototypes/36-port-true-left.html'); await pg.waitForTimeout(1500); await pg.addStyleTag({ content: '.wrap{max-width:none!important}.scroll{overflow:visible!important}' });
if (!cases.length) await pg.screenshot({ path: out + '-full.png', fullPage: true });
for (const c of cases) { const [move, weapon, outfit = 0, frame = 0] = c.split(':');
  await pg.evaluate(([m, w, o, f]) => { const s = window.__proto; s.move = m; s.weapon = w; s.outfit = +o; s.play = false; s.frame = +f; }, [move, weapon, outfit, frame]);
  await pg.waitForTimeout(300);
  await pg.locator(process.env.SEL || '#zoom').screenshot({ path: `${out}-${c.replace(/:/g, '_')}.png` }); }
await b.close();
