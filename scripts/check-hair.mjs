// npm run check:hair: the head slot (docs/hair.md). Serves the built dist/ and, in Chromium on SwiftShader:
// 1. renders every hairstyle under every hat (?iso&hairgrid, its four pages) in all eight facings, one screenshot
//    each, with no page errors (and the 240 at once, small);
// 2. runs the audit (src/iso/hair/audit.js) on his body and the samurai's through the flow's moves: no hair outside a
//    hat's shells and no chain through a body, in any pair; the hats' own contact with the body is reported;
// 3. plays the courtyard: H, T and Y change what he wears and the look draws it, a hat that refuses his hair is
//    refused, and he still runs and cuts in it.
// Screenshots go to test-output/hair/.
import { chromium } from 'playwright';
import { preview } from 'vite';
import fs from 'node:fs';

const OUT = 'test-output/hair'; fs.mkdirSync(OUT, { recursive: true });
let step = '';
function fail(msg) { console.error(`\nFAIL${step ? ` at "${step}"` : ''}: ${msg}`); process.exitCode = 1; throw new Error(msg); }
const ok = msg => console.log(`  ok  ${step}${msg ? ': ' + msg : ''}`);

const server = await preview({ logLevel: 'silent', preview: { port: 4175, strictPort: false, open: false } });
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 760 } });
const errors = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());   // hermetic
const errorsCheck = () => { if (errors.length) fail(errors.join('\n')); };
const FACINGS = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];

try {
  // ---- 1. every pair in every facing
  let seen = 0;
  for (const pg of [0, 1, 2, 3]) {
    step = `grid page ${pg}`;
    await page.goto(new URL(`?iso&test&hairgrid&page=${pg}`, base).href);
    await page.waitForFunction(() => window.__iso && window.__iso.ready && window.__iso.hairgrid.framesSince >= 1, undefined, { timeout: 180000 });
    const g0 = await page.evaluate(() => window.__iso.hairgrid);
    for (let k = 0; k < 8; k++) {
      if (k) await page.keyboard.press('BracketRight');
      await page.waitForFunction(k => window.__iso.hairgrid.facing === k && window.__iso.hairgrid.framesSince >= 1, k, { timeout: 120000 });
      await page.screenshot({ path: `${OUT}/grid-p${pg}-${FACINGS[k]}.png` });
    }
    errorsCheck(); seen += g0.cells;
    ok(`${g0.hairs.length} hairs × ${g0.hats.length} hats (${g0.refused} refused) in 8 facings`);
  }
  if (seen !== 240) fail(`the pages showed ${seen} pairs, not 240`);
  step = 'grid, all 240'; await page.goto(new URL('?iso&test&hairgrid&page=4', base).href);
  await page.waitForFunction(() => window.__iso && window.__iso.ready && window.__iso.hairgrid.framesSince >= 1, undefined, { timeout: 240000 });
  await page.screenshot({ path: `${OUT}/grid-all.png` }); errorsCheck(); ok(`${(await page.evaluate(() => window.__iso.hairgrid)).cells} figures`);

  // ---- 2. the audit: no hair through a hat, no tail through a body, in any pose
  for (const foe of [false, true]) {
    step = `audit (${foe ? 'the samurai' : 'him'})`;
    const r = await page.evaluate(foe => window.__iso.hairAudit({ foe, every: 6 }), foe);
    if (r.shell || r.body) fail(`${r.shell} hair vertices outside a hat, ${r.body} chain samples in his body: ${JSON.stringify(r.bad.slice(0, 6))}`);
    const hb = {}; for (const b of r.bad) if (b.hatBody) hb[b.hat] = b.worst;
    ok(`${r.pairs - r.refused} pairs × ${r.poses} poses, ${(r.verts / 1e6).toFixed(1)}M hair vertices checked: none outside a hat, no chain in the body` +
      (Object.keys(hb).length ? `; hats touching the body (reported, not hair): ${Object.entries(hb).map(([h, w]) => `${h} in ${w}`).join(', ')}` : ''));
  }

  // ---- 3. the courtyard: the pickers and keys, a refusal, and he still plays
  step = 'courtyard';
  await page.goto(new URL('?iso&test&calm&tick=8', base).href);
  await page.waitForFunction(() => window.__iso && window.__iso.ready && window.__iso.t > .3, undefined, { timeout: 60000 });
  await page.locator('canvas').click();
  const heads = () => page.evaluate(() => window.__iso.heads);
  let h = await heads(); if (h.hero.drawn !== 'ronin|jingasa' || h.foe.drawn !== 'chonmage|none') fail(`defaults drawn ${h.hero.drawn}, ${h.foe.drawn}`);
  ok(`he wears ${h.hero.drawn}, the samurai ${h.foe.drawn}`);
  step = 'H, T, Y';
  await page.keyboard.press('KeyH'); await page.keyboard.press('KeyT');
  await page.waitForFunction(() => { const h = window.__iso.heads.hero; return h.drawn === h.hair + '|' + h.hat && h.hair !== 'ronin' && h.hat !== 'jingasa'; }, undefined, { timeout: 30000 });
  h = await heads(); const after = h.hero.drawn;
  await page.keyboard.press('KeyY');
  await page.waitForFunction(a => { const h = window.__iso.heads; return h.hero.drawn === h.hero.hair + '|' + h.hero.hat && h.foe.drawn === h.foe.hair + '|' + h.foe.hat; }, after, { timeout: 30000 });
  ok(`H and T: ${after}; Y: ${(await heads()).hero.drawn} / ${(await heads()).foe.drawn}`);
  step = 'a refused pair';
  await page.selectOption('#o-hair-hero', 'chonmage'); await page.selectOption('#o-hat-hero', 'none'); await page.selectOption('#o-hat-hero', 'bandana');
  h = await heads(); const note = await page.locator('#o-hairnote').textContent();
  if (h.hero.hat === 'bandana' || !/crown/.test(note)) fail(`the bandana went over a topknot (${h.hero.hair}|${h.hero.hat}; "${note}")`);
  ok(note);
  step = 'he plays in it';
  await page.selectOption('#o-hair-hero', 'long-loose'); await page.selectOption('#o-hat-hero', 'kasa'); await page.locator('canvas').focus();
  const x0 = await page.evaluate(() => window.__iso.hero.x);
  await page.keyboard.down('ArrowLeft'); await page.waitForFunction(x => Math.abs(window.__iso.hero.x - x) > 12, x0, { timeout: 60000 }); await page.keyboard.up('ArrowLeft');
  await page.screenshot({ path: `${OUT}/courtyard-run.png` });
  await page.keyboard.press('KeyJ'); await page.waitForFunction(() => window.__iso.hero.state === 'J1', undefined, { timeout: 30000 });
  await page.screenshot({ path: `${OUT}/courtyard-cut.png` });
  h = await heads(); if (h.hero.drawn !== 'long-loose|kasa') fail(`drawn ${h.hero.drawn}`);
  errorsCheck(); ok(h.hero.drawn);
  console.log('\ncheck:hair passed');
} catch (e) { if (!process.exitCode) { console.error(e); process.exitCode = 1; } }
finally { await browser.close(); await server.close(); }
