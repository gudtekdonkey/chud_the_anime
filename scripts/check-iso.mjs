// npm run check:iso: serves the built dist/ with `vite preview`, opens the slice (?iso&test), and plays the core loop in
// Chromium: no page errors; the run in all 8 directions (the stick maps straight to the screen, he faces where he
// runs); the roll (its i-frames, its distance); J1 → J2 → J3 on the samurai with every hit landing and the samurai
// reacting; a cut cancelled into the roll; a kill and the respawn; the same loop with the pixel look; one shot per
// pipeline toggle; the outfit picker (a preset, a random outfit, dressed in both looks); the blood (sprays, stains, splashes, the blade's coat flicked off), the killing blow's sever (the
// piece and the dropped sword coming to rest on the floor, the pool) and every execution on K (gore.js, exec/); the 15 weapons (drawn, J1 → J3, stowed in all 8 facings, then in play with their reach and hit-stops);
// the personalities (each idle plays, no traits = the plain ronin, two personalities differ, [ / ]
// give the ronin and the samurai one, the townsfolk idle and wander) and the idle gallery (?iso&idles). Screenshots land in test-output/iso/. Chromium comes from PLAYWRIGHT_BROWSERS_PATH (never downloaded),
// with WebGL on SwiftShader, which draws a few frames a second: the page runs with &tick=N (N game steps a frame), and
// every wait here is on the game's own clock or state, never the wall clock.
import { chromium } from 'playwright';
import { preview } from 'vite';
import fs from 'node:fs';
import { enemySteps } from './check-iso-enemies.mjs';
import { skillSteps } from './check-iso-skills.mjs';
import { squadSteps } from './check-iso-squad.mjs';
import { portSteps } from './check-iso-port.mjs';

const OUT = 'test-output/iso'; fs.mkdirSync(OUT, { recursive: true });
let step = '';
function fail(msg) { console.error(`\nFAIL${step ? ` at "${step}"` : ''}: ${msg}`); process.exitCode = 1; throw new Error(msg); }
let lastOk = Date.now();
const ok = msg => { console.log(`  ok  ${step}${msg ? ': ' + msg : ''} [${((Date.now() - lastOk) / 1000).toFixed(0)} s]`); lastOk = Date.now(); };   // the wall time since the last ok: where the check spends it

const server = await preview({ logLevel: 'silent', preview: { port: 4174, strictPort: false, open: false } });
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
const errors = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());   // hermetic

const G = () => page.evaluate(() => ({ hero: window.__iso.hero, foe: window.__iso.foe, t: window.__iso.t, look: window.__iso.look, log: window.__iso.STATS.log.slice(), gore: window.__iso.gore }));
const until = async (what, fn, arg, timeout = 60000) => {
  try { await page.waitForFunction(fn, arg, { timeout, polling: 50 }); }
  catch { const g = await G(); fail(`never reached ${what} (hero ${g.hero.state} at ${g.hero.x.toFixed(1)},${g.hero.z.toFixed(1)}${g.foe ? `; foe ${g.foe.state} hp ${g.foe.hp}` : ''})`); } };
const gameWait = sec => page.evaluate(s => new Promise(r => { const t0 = window.__iso.t; const f = () => window.__iso.t - t0 >= s ? r() : requestAnimationFrame(f); f(); }), sec);
const settle = () => until('a standstill', () => ['idle', 'guard'].includes(window.__iso.hero.state) && Math.abs(window.__iso.hero.v) < 1);
const errorsCheck = () => { if (errors.length) fail(errors.join('\n')); };
// a close-up of the hero (and the samurai) at 4×, from the canvas's own pixels
async function shot(name, who = ['hero'], then) {
  const buf = await page.locator('canvas').screenshot({ path: `${OUT}/${name}.png` }), px = await page.evaluate(() => window.__iso.px);
  if (then) await then();   // e.g. let go of the keys: the game runs on while the close-up is composed
  const z = await browser.newPage({ viewport: { width: 500 * who.length, height: 400 } });
  await z.setContent(`<body style="margin:0;background:#111"><canvas id=c width=${500 * who.length} height=400></canvas></body>`);
  await z.evaluate(async ({ src, px, who }) => { const im = new Image(); im.src = src; await im.decode(); const g = document.getElementById('c').getContext('2d'); g.imageSmoothingEnabled = false;
    who.forEach((w, i) => { const [u, v] = px[w]; g.drawImage(im, u * im.width - 60, v * im.height - 85, 120, 100, i * 500 + 10, 0, 480, 400); }); },
  { src: 'data:image/png;base64,' + buf.toString('base64'), px, who });
  await z.screenshot({ path: `${OUT}/${name}-zoom.png` }); await z.close();
}

try {
  step = 'boot';
  await page.goto(new URL('?iso&test&solo&combo=free&calm&tick=8&foes=1', base).href);
  await page.waitForFunction(() => window.__iso && window.__iso.ready && window.__iso.t > .2, undefined, { timeout: 60000 });
  await page.evaluate(() => document.querySelector('canvas').focus());   // a click would be a click to move (port.js)
  // what he has been through, recorded every frame in the page (a poll from here can miss a state that lasts 2 frames)
  await page.evaluate(() => { window.__seen = new Set(); window.__seq = []; const f = () => { const h = window.__iso.hero; window.__seen.add(h.state); if (h.iframes) window.__seen.add('iframes'); if (window.__iso.cine) window.__seen.add('cine'); if (window.__iso.impact) window.__seen.add('impact');
    const s = window.__iso.skills; if (s && s.images >= 3) window.__seen.add('images');
    if (window.__seq.at(-1) !== h.state) window.__seq.push(h.state); requestAnimationFrame(f); }; f(); });
  const seen = (what, timeout) => until(what, w => window.__seen.has(w), what, timeout), forget = () => page.evaluate(() => { window.__seen.clear(); window.__seq = []; });
  errorsCheck(); ok(`look ${(await G()).look}`); await shot('00-start', ['hero', 'foe']);
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const walkTo = async (tx, tz, r) => { for (let i = 0; i < 40; i++) { const g = (await G()).hero; const dx = tx - g.x, dz = tz - g.z; if (Math.hypot(dx, dz) < r) break;
    const keys = [Math.abs(dx) > 4 ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : null, Math.abs(dz) > 4 ? (dz > 0 ? 'ArrowDown' : 'ArrowUp') : null].filter(Boolean);
    for (const k of keys) await page.keyboard.down(k); await gameWait(.08); for (const k of keys) await page.keyboard.up(k); } };
  if (process.env.ISO_ONLY !== 'enemies') {

    // ---- the run in 8 directions: hold the keys until he has covered ground, check where he went and which way he faces
    const DIRS = [['N', ['ArrowUp'], Math.PI], ['NE', ['ArrowUp', 'ArrowRight'], 3 * Math.PI / 4], ['E', ['ArrowRight'], Math.PI / 2], ['SE', ['ArrowDown', 'ArrowRight'], Math.PI / 4],
      ['S', ['ArrowDown'], 0], ['SW', ['ArrowDown', 'ArrowLeft'], -Math.PI / 4], ['W', ['ArrowLeft'], -Math.PI / 2], ['NW', ['ArrowUp', 'ArrowLeft'], -3 * Math.PI / 4]];
    for (const [name, keys, h] of DIRS) {
      step = `run ${name}`; await settle(); const a0 = (await G()).hero;
      for (const k of keys) await page.keyboard.down(k);
      await until('the run', ([x, z]) => Math.hypot(window.__iso.hero.x - x, window.__iso.hero.z - z) > 6 && window.__iso.hero.state === 'run', [a0.x, a0.z]);
      const a = (await G()).hero;   // measured once he is running, so the start's first steps do not count
      await until('14 units of running', ([x, z]) => Math.hypot(window.__iso.hero.x - x, window.__iso.hero.z - z) > 14, [a.x, a.z]);
      const b = (await G()).hero; for (const k of keys) await page.keyboard.up(k);
      await shot(`run-${name}`);   // the frame he lets go: the run's last pose as the stop takes over (a screenshot outlasts a whole stride here)
      const moved = Math.atan2(b.x - a.x, b.z - a.z);
      if (Math.abs(wrap(moved - h)) > .3) fail(`ran toward ${moved.toFixed(2)} rad (from ${a.x.toFixed(1)},${a.z.toFixed(1)} to ${b.x.toFixed(1)},${b.z.toFixed(1)}), wanted ${h.toFixed(2)}`);
      if (Math.abs(wrap(b.yaw - h)) > .05) fail(`drawn facing ${b.yaw.toFixed(2)}, wanted the ${name} facing ${h.toFixed(2)}`);
      ok(`moved ${Math.hypot(b.x - a.x, b.z - a.z).toFixed(0)} units at ${moved.toFixed(2)} rad, facing ${b.yaw.toFixed(2)}`);
    }
    step = 'stop'; await until('the stop', () => ['stop', 'idle'].includes(window.__iso.hero.state)); ok();

    // ---- the roll: i-frames in the middle, about 25 units covered, back to rest
    step = 'roll'; await settle(); await forget(); { const a = (await G()).hero; await page.keyboard.down('ArrowLeft'); await page.keyboard.press('Shift');
      await seen('roll'); await page.keyboard.up('ArrowLeft'); await shot('roll');
      await seen('iframes');
      await until('the roll ending', () => window.__iso.hero.state !== 'roll'); const b = (await G()).hero;
      const d = Math.hypot(b.x - a.x, b.z - a.z); if (d < 18) fail(`the roll covered only ${d.toFixed(1)} units`); ok(`${d.toFixed(1)} units`); }

    // ---- J1 → J2 → J3 on the samurai: walk up to him, three presses, three hits, three reactions
    step = 'approach'; await settle();
    { const f = (await G()).foe; await walkTo(f.x - 22, f.z, 6); } await settle(); ok();
    // the presses come as a player's would, each as the last cut lands (a screenshot here outlasts the chain's window)
    step = 'J1 → J2 → J3'; { const f0 = (await G()).foe, n0 = (await G()).log.length;
      const landed = (cut, n) => until(`${cut} landing`, ([c, n]) => window.__iso.STATS.log.length > n && window.__iso.STATS.log.at(-1).startsWith(c), [cut, n]);
      await forget(); await page.keyboard.press('KeyJ'); await landed('J1', n0);
      await page.keyboard.press('KeyJ'); await landed('J2', n0 + 1);
      await page.keyboard.press('KeyJ'); await landed('J3', n0 + 2);
      await shot('cut-J3', ['hero', 'foe']);
      const g = await G(), log = g.log.slice(n0);
      if (log.join() !== 'J1:hit,J2:hit,J3:hit') fail(`the chain landed ${log.join(' ') || 'nothing'}`);
      if (g.foe.hits - f0.hits !== 3) fail(`the samurai took ${g.foe.hits - f0.hits} hits`);
      if (!g.foe.reacts.slice(-3).every(r => /recoil|knock|die/.test(r))) fail(`the samurai's reactions: ${g.foe.reacts.slice(-3).join(' ')}`);
      if (!(await page.evaluate(() => window.__seen.has('impact')))) fail('no impact frame during the hit-stops');
      await seen('cine');   // J3 on him: the finisher's close-up
      ok(`${log.join(' ')}; he reacted ${g.foe.reacts.slice(-3).join(', ')}; impact frames and the close-up played`); }

    // ---- blood: each of the three hits sprayed, the drops land as stains, the samurai and the blade carry it
    step = 'blood'; { const b = (await G()).gore;
      if (b.sprays < 3) fail(`${b.sprays} sprays for three hits`);
      if (b.splashFoe < 1) fail('no splash on the samurai'); if (b.coats < 3) fail(`the blade took blood from ${b.coats} of three hits`);
      await until('the drops landing as stains', () => window.__iso.gore.landed > 10 && window.__iso.gore.decals > 0);
      const c = (await G()).gore; ok(`${c.sprays} sprays, ${c.landed} drops landed in ${c.decals} stains, ${c.splashFoe} splashes on him, ${c.splashHero} on the ronin, the blade coated by ${c.coats} hits`); }

    // ---- a cut cancelled into the roll: J, then Shift as soon as it has struck
    step = 'cancel into the roll'; await settle(); await forget(); { await page.keyboard.press('KeyJ'); await seen('J1');
      await page.keyboard.press('Shift'); await seen('roll'); await shot('cancel-roll');
      const seq = await page.evaluate(() => window.__seq.join(' > ')); if (!/J1 > roll/.test(seq)) fail(`the roll did not cut the cut short: ${seq}`); ok(seq); }

    // ---- the kill and the respawn
    step = 'kill'; await settle(); { for (let i = 0; i < 12 && !(await G()).foe.dead; i++) { const f = (await G()).foe, h = (await G()).hero;
        if (Math.hypot(f.x - h.x, f.z - h.z) > 26) { await walkTo(f.x - 22, f.z, 6); await settle(); }
        await page.keyboard.press('KeyJ'); await gameWait(.32); }
      await until('the samurai dying', () => window.__iso.foe.dead);
      // the pieces are watched every frame while he lies there: they settle on the game's clock, and he stands up whole
      // (taking them away) 2.9 s after he dies, which a poll from here can straddle on a slow software GPU
      await page.evaluate(() => { const R = window.__rest = { pieces: 0, resting: 0, lowest: 99 }; const f = () => { const g = window.__iso.gore;
        if (g.foePieces >= 2 && g.resting >= 2) { R.pieces = Math.max(R.pieces, g.foePieces); R.resting = Math.max(R.resting, g.resting); R.lowest = Math.min(R.lowest, g.lowest); }
        if (!(R.resting >= 2 && R.lowest < 4)) requestAnimationFrame(f); }; f(); });
      // the killing blow took the part nearest the blade: a piece and his sword fall and come to rest on the floor (read
      // before any screenshot: the game runs on through one, and he stands up whole 2.9 s after he dies), a pool spreads
      { const b = (await G()).gore; if (b.severs < 1 || !b.cut.some(p => p !== 'sword')) fail(`no sever on the killing blow (cut: ${b.cut.join(' ')})`);
        if (b.swords < 1) fail('his sword did not drop'); if (b.pools < 1) fail('no pool under him');
        await until('the pieces at rest on the floor', () => window.__rest.pieces >= 2 && window.__rest.resting >= 2 && window.__rest.lowest < 4, undefined, 300000).catch(async e => { console.error('  the pieces:', JSON.stringify(await page.evaluate(() => ({ rest: window.__rest, gore: window.__iso.gore, t: window.__iso.t })))); throw e; });   // on a miss, what they did   // they settle in ~2 game s; a long session draws a frame in seconds
        const c = { ...(await G()).gore, ...(await page.evaluate(() => window.__rest)) }; await shot('sever', ['hero', 'foe']); ok(`cut ${c.cut.join(' + ')}; ${c.resting} pieces at rest, the lowest at ${c.lowest.toFixed(1)}; ${c.clatters} clatters; flicks ${c.flicks}`);
        if (c.flicks < 1) fail('the sheathe never flicked the blade clean'); }

      await until('the respawn', () => !window.__iso.foe.dead && window.__iso.foe.hp === 5, undefined, 90000); ok(`deaths ${(await G()).foe.deaths}`); }
    step = 'close-ups of J1 and J2'; await settle(); { const f = (await G()).foe; await walkTo(f.x - 22, f.z, 6); await settle();
      let n = (await G()).log.length; await page.keyboard.press('KeyJ'); await until('J1 landing', n => window.__iso.STATS.log.length > n, n); await shot('cut-J1', ['hero', 'foe']);
      await settle(); n = (await G()).log.length; await page.keyboard.press('KeyJ'); await until('J1 landing', n => window.__iso.STATS.log.length > n, n);
      await page.keyboard.press('KeyJ'); await until('J2 landing', n => window.__iso.STATS.log.length > n + 1, n); await shot('cut-J2', ['hero', 'foe']); ok(); }

    // ---- the style switch, live: Pixel-render, Anime limited, Toon + dither, Painterly; a cut still plays and is judged in each
    step = 'style switch';
    for (let i = 0; i < 4; i++) { await settle(); const f = (await G()).foe; if (!f.dead) { await walkTo(f.x - 22, f.z, 6); await settle(); }
      await page.keyboard.press('KeyV'); const st = await page.evaluate(() => window.__iso.style); const n = (await G()).log.length;
      await page.keyboard.press('KeyJ'); await until(`a cut in ${st}`, n => window.__iso.STATS.log.length > n, n); await shot(`style-${st.replace(/\W+/g, '-').toLowerCase()}`, ['hero', 'foe']);
      const last = (await G()).log.at(-1); if (!/hit|miss/.test(last)) fail(`the cut in ${st}: ${last}`); }
    ok(`back to ${await page.evaluate(() => window.__iso.style)}`);

    // ---- the pixel look: the same controller, the same loop
    step = 'pixel look'; await page.keyboard.press('KeyM'); await until('the pixel look', () => window.__iso.look === 'pixel'); await settle();
    { await walkTo((await G()).foe.x - 22, (await G()).foe.z, 6); await settle(); const n0 = (await G()).log.length; await shot('pixel', ['hero', 'foe']);
      await page.keyboard.press('KeyJ'); await until('J1', () => window.__iso.hero.state === 'J1'); await until('a hit', n => window.__iso.STATS.log.length > n, n0); await shot('pixel-J1', ['hero', 'foe']);
      ok((await G()).log.slice(n0).join(' ')); }
    await page.keyboard.press('KeyM'); await until('the 3D look', () => window.__iso.look === '3d');

    // ---- the outfit picker (src/iso/gear/, docs/gear.md): a preset, then a random outfit on him, a cut landing in each,
    // the pixel look dressed, then back to Iron Ash as built. Picked through the overlay, as the owner would
    const cutOnHim = async name => { await settle(); await until('the samurai standing', () => !window.__iso.foe.dead, undefined, 90000);
      const f = (await G()).foe; await walkTo(f.x - 22, f.z, 6); await settle(); const n = (await G()).log.length;
      await page.keyboard.press('KeyJ'); await until(`a cut in ${name}`, n => window.__iso.STATS.log.length > n, n); await shot(`outfit-${name}`, ['hero', 'foe']);
      const last = (await G()).log.at(-1); if (!/hit|miss/.test(last)) fail(`the cut in ${name}: ${last}`); return last; };
    const worn = () => page.evaluate(() => ({ outfit: window.__iso.outfit, dressed: window.__iso.dressed }));
    step = 'outfit: a preset'; await page.selectOption('#g-preset', 'general'); await page.evaluate(() => document.querySelector('canvas').focus());
    await until('the general', () => (window.__iso.outfit || '').includes('o-yoroi'));
    { const w = await worn(), n = Object.keys(w.dressed).length, built = Object.values(w.dressed).reduce((a, r) => a + r.built, 0);
      if (n !== 16) fail(`${n} pieces worn, wanted 16`); ok(`16 pieces, ${built} parts built; ${await cutOnHim('general')}`); }
    step = 'outfit: randomise'; { const before = (await worn()).outfit; await page.keyboard.press('Backquote');
      await until('a new outfit', b => window.__iso.outfit && window.__iso.outfit !== b, before);
      const w = await worn(); if (w.outfit.split(',').some(id => !id)) fail(`a random outfit left a slot empty: ${w.outfit}`); ok(`${await cutOnHim('random')}`); }
    step = 'outfit: the pixel look'; await page.keyboard.press('KeyM'); await until('the pixel look', () => window.__iso.look === 'pixel');
    ok(await cutOnHim('random-pixel')); await page.keyboard.press('KeyM'); await until('the 3D look', () => window.__iso.look === '3d');
    step = 'outfit: as built'; await page.selectOption('#g-preset', 'built'); await page.evaluate(() => document.querySelector('canvas').focus());
    await until('Iron Ash as built', () => window.__iso.outfit === null); errorsCheck(); ok();


    // ---- one shot per pipeline step, toggled off and on again
    step = 'pipeline toggles';
    for (const [key, name] of [['Digit1', 'lowres'], ['Digit2', 'toon'], ['Digit3', 'dither'], ['Digit4', 'palette'], ['Digit5', 'outline'], ['Digit7', 'rim'], ['Digit8', 'glint']]) {
      await page.keyboard.press('Alt+' + key); await gameWait(.1); await shot(`pipe-${name}-flipped`); await page.keyboard.press('Alt+' + key); }   // Alt + the number (1–9 are the squad's groups)
    ok();

    // ---- the executions: K on the lone samurai in reach, each of the five in turn (exec/executions.js); each plays its
    // close-up, cuts him into real pieces, and hands the ronin back
    const NAMES = ['Behind the back', 'Through and past', 'Whirlwind', 'Far behind', 'Peek-a-boo'];
    for (const name of NAMES) {
      step = `execution: ${name}`;
      await until('him standing again', () => !window.__iso.foe.dead && window.__iso.foe.state === 'guard', undefined, 90000);
      { const f = (await G()).foe; await walkTo(f.x - 40, f.z, 8); } await settle();
      await until('the K prompt (alone, in reach)', () => window.__iso.gore.kpick);
      await shot(`exec-${NAMES.indexOf(name)}-prompt`, ['hero', 'foe']);
      const g0 = await G(); await forget();
      await page.keyboard.press('KeyK');
      await until('the execution', () => window.__iso.gore.execOn);
      if ((await G()).gore.exec !== name) fail(`played ${(await G()).gore.exec}`);
      await until('the killing cut', () => window.__iso.gore.cut.some(p => p !== 'sword'));
      const cut = (await G()).gore.cut; await shot(`exec-${NAMES.indexOf(name)}`, ['hero', 'foe']);
      await until('the ronin handed back', () => !window.__iso.gore.execOn && window.__iso.hero.state !== 'xR');
      await until('the stage ending', n => window.__iso.gore.execs > n, g0.gore.execs);
      const g = await G(); if (g.foe.deaths <= g0.foe.deaths) fail('the samurai survived his execution');
      if (!(await page.evaluate(() => window.__seen.has('cine')))) fail('no close-up');
      if (g.gore.severs <= g0.gore.severs) fail('no pieces cut'); ok(`cut ${cut.join(' + ')}; ${g.gore.severs - g0.gore.severs} pieces; the close-up played; flicks ${g.gore.flicks}`);
    }
    errorsCheck();
    // ---- the skills (I O P N U C, Storm Chain): scripts/check-iso-skills.mjs
    await skillSteps({ page, G, until, gameWait, settle, walkTo, shot, seen, forget, ok, fail, errorsCheck, base, setStep: v => { step = v; } });

    // ---- the 15 weapons (src/iso/weapons/): off screen through the 3D look, every weapon draws, cuts J1 → J2 → J3 and
    //   stows in all 8 facings with no errors, its events on the katana's beats; then their contact sheets (?iso&arsenal)
    step = 'weapons: the sweep, 15 × 8 facings';
    await page.goto(new URL('?iso&arsenal&sweep&k=1&w=0-4', base).href);
    await page.waitForFunction(() => window.__arsenal, undefined, { timeout: 600000, polling: 500 });
    { const r = await page.evaluate(() => window.__arsenal), ids = await page.evaluate(() => [...new Set(window.__arsenal.results.map(x => x.id))]);
      if (ids.length !== 15 || r.results.length !== 120) fail(`swept ${ids.length} weapons, ${r.results.length} runs`);
      const ref = Object.fromEntries(r.results.filter(x => x.id === 'katana').map(x => [x.facing, x.events]));
      const home = m => m === 'stow' || m === 'katana';
      for (const x of r.results) { const at = `${x.id} facing ${x.facing}`;
        if (x.errors.length) fail(`${at}: ${x.errors[0]}`);
        if (x.drawFrom.out || !home(x.drawFrom.main)) fail(`${at}: not drawn from home (${JSON.stringify(x.drawFrom)})`);
        if (!x.atHit.out || !(x.atHit.main === 'hand' || x.atHit.main === 'katana')) fail(`${at}: not in his hand at J1's hit (${JSON.stringify(x.atHit)})`);
        if (!x.atImpact.out) fail(`${at}: not out at J3's impact`);
        if (x.end.out || !home(x.end.main)) fail(`${at}: not stowed after the sheathe (${JSON.stringify(x.end)})`);
        if (x.events !== ref[x.facing]) fail(`${at}: events ${x.events}, the katana's ${ref[x.facing]}`); }
      for (const [n, list] of Object.entries(r.beats)) { const k = list[0]; for (const b of list) if (b.dur !== k.dur || b.ev !== k.ev || b.loop !== k.loop) fail(`${b.id} ${n}: ${b.dur}s ${b.ev}, the katana's ${k.dur}s ${k.ev}`); }
      ok(`${ids.length} weapons × 8 facings: drawn from home, in hand at the hits, home after the stow; every move on the katana's length and beats (${ref[0]})`); }
    step = 'weapons: contact sheets';
    for (const [q, name] of [['w=0-4', 'moments-0'], ['w=5-9', 'moments-1'], ['w=10-14', 'moments-2'], ['w=0-7&m=J1', 'facings-J1-0'], ['w=8-14&m=J1', 'facings-J1-1'], ['w=0-7&m=stowed', 'facings-stowed-0'], ['w=8-14&m=stowed', 'facings-stowed-1']]) {
      await page.goto(new URL(`?iso&arsenal&k=1&${q}`, base).href); await page.waitForFunction(() => window.__iso && window.__iso.ready, undefined, { timeout: 60000 });
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); await page.locator('canvas').screenshot({ path: `${OUT}/arsenal-${name}.png` }); }
    errorsCheck(); ok();

    // ---- the 15 weapons in play: picked with =, each walks up to the samurai from one of the eight sides (so the cuts come
    //   in every facing), J1 → J2 → J3 all land at the weapon's reach with its hit-stops, and he stows it after the calm
    step = 'weapons: in play';
    await page.goto(new URL('?iso&test&solo&combo=free&calm&tick=8&foehp=999&foes=1', base).href);
    await page.waitForFunction(() => window.__iso && window.__iso.ready && window.__iso.t > .2, undefined, { timeout: 60000 });
    await page.evaluate(() => document.querySelector('canvas').focus());   // a click would be a click to move (port.js)
    await page.evaluate(() => { window.__yaw = []; let n = 0; const f = () => { const L = window.__iso.STATS.log.length; if (L > n) { n = L; window.__yaw.push(window.__iso.hero.yaw); } requestAnimationFrame(f); }; f(); });
    const W8 = await page.evaluate(() => window.__iso.weapons), facings = new Set(), FA = [0, 1, 2, 3, 4, 5, 6, 7].map(k => wrap(k * Math.PI / 4));
    for (let i = 0; i < W8.length; i++) { const w = W8[i];
      if (i) await page.keyboard.press('Equal');
      step = `weapon ${w.id}`; await until(`the ${w.id} in hand`, id => window.__iso.hero.weapon === id, w.id); await settle();
      // the setup, waited for: he stands on that side of the samurai once the samurai has come back to his guard (a J3's
      // knock slides him on), walking again until the bearing is within 12° of the side, so the cuts face the wanted way
      const k = i % 8, a = k * Math.PI / 4;
      for (let j = 0; j < 6; j++) { await until('the samurai in his guard', () => window.__iso.foe.state === 'guard', undefined, 90000); const f = (await G()).foe;
        await walkTo(f.x + Math.sin(a) * 22, f.z + Math.cos(a) * 22, 3); await settle(); const g = await G();
        if (g.foe.state === 'guard' && Math.abs(wrap(Math.atan2(g.hero.x - g.foe.x, g.hero.z - g.foe.z) - a)) < .21) break; }
      const n0 = (await G()).log.length, s0 = await page.evaluate(() => window.__iso.STATS.stops.length), y0 = await page.evaluate(() => window.__yaw.length);
      const landed = (cut, n) => until(`${cut} landing`, ([c, n]) => window.__iso.STATS.log.length > n && window.__iso.STATS.log.at(-1).startsWith(c), [cut, n]);
      await page.keyboard.press('KeyJ'); await landed('J1', n0); await page.keyboard.press('KeyJ'); await landed('J2', n0 + 1); await page.keyboard.press('KeyJ'); await landed('J3', n0 + 2);
      await shot(`weapon-${String(i).padStart(2, '0')}-${w.id}`, ['hero', 'foe']);
      const g = await G(), log = g.log.slice(n0).join(), stops = await page.evaluate(s => window.__iso.STATS.stops.slice(s), s0), yaw = await page.evaluate(y => window.__yaw[y], y0);
      if (log !== 'J1:hit,J2:hit,J3:hit') fail(`the chain landed ${log}`);
      const want = [3, 3, 5].map(f => +(f / 60 * w.stop).toFixed(4)); if (stops.join() !== want.join()) fail(`hit-stops ${stops.join()} s, wanted ${want.join()} (weight ×${w.stop})`);
      const fk = FA.findIndex(v => Math.abs(wrap(v - yaw)) < .05), want8 = (k + 4) % 8; if (fk !== want8) fail(`cut facing ${yaw.toFixed(2)} rad (facing ${fk}), wanted facing ${want8}`); facings.add(fk);
      await until(`the ${w.id} stowed`, () => { const h = window.__iso.hero; return h.state === 'idle' && !h.out && h.held && (h.held.main === 'stow' || h.held.main === 'katana'); }, undefined, 120000);
      ok(`${log} from the ${['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'][k]} side, cut facing ${fk}, hit-stops ${stops.join(' ')} s, stowed`); }
    step = 'weapons: facings'; if (facings.size !== 8) fail(`cuts in ${facings.size} facings`); ok('cuts landed in all 8 facings');
    errorsCheck();
  }

  // ---- the enemy types: each telegraphs, strikes and dies; a group takes turns
  await enemySteps({ page, browser, base, OUT, fail, ok, setStep: s => { step = s; } });
  errorsCheck();

  // ---- the squad battle (?iso&squad): its own steps (scripts/check-iso-squad.mjs)
  await squadSteps({ page, base, until, gameWait, ok, fail, errorsCheck, setStep: s => { step = s; }, shotPage: name => page.locator('canvas').screenshot({ path: `${OUT}/${name}.png` }) });
  errorsCheck();

  // ---- the rest of today's game in 3D (scripts/check-iso-port.mjs)
  await portSteps({ page, base, fail, ok, setStep: s => { step = s; }, shot, OUT });
  errorsCheck();

  // ==== the new skills (src/iso/skills/): F counter, R Blade Recall, Q Lightning Chain, X Time Slice ====
  const boot = async q => { await page.goto(new URL(q, base).href); await page.waitForFunction(() => window.__iso && window.__iso.ready && window.__iso.t > .2, undefined, { timeout: 60000 });
    await page.evaluate(() => document.querySelector('canvas').focus());   // a click would be a click to move (port.js)
    await page.evaluate(() => { window.__seen = new Set(); window.__seq = []; const f = () => { const h = window.__iso.hero; window.__seen.add(h.state); if (window.__iso.cine) window.__seen.add('cine'); if (window.__iso.gray > .9) window.__seen.add('gray');
      if (window.__seq.at(-1) !== h.state) window.__seq.push(h.state); requestAnimationFrame(f); }; f(); }); };
  const logHas = (what, from, timeout = 60000) => until(what, ([w, n]) => window.__iso.STATS.log.slice(n).some(l => l.startsWith(w)), [what, from], timeout);
  const logLen = async () => (await G()).log.length;
  // a press timed in the page, on the frame the samurai's blow reaches [lo, hi) of its clip (a round trip from here outlasts the window)
  const pressAt = (lo, hi) => page.evaluate(([lo, hi]) => new Promise(r => { const f = () => { const s = window.__iso.foe;
    if (['fcut', 'thrust'].includes(s.state) && s.ct >= lo && s.ct < hi) { dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', key: 'f' })); dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyF', key: 'f' })); r(s.state); } else requestAnimationFrame(f); }; f(); }), [lo, hi]);

  // ---- F: the samurai attacks (no &calm); a press within 0.2 s of the blow counters, an earlier one only blocks
  step = 'F counter'; await boot('?iso&test&solo&combo=free&tick=8&foes=1'); await settle();
  { const f = (await G()).foe; await walkTo(f.x - 16, f.z, 4); }
  { const n = await logLen(), atk = await pressAt(.33, .46); await logHas('F:counter', n); await shot('counter-clash', ['hero', 'foe']);
    await logHas('F:cut', n); const g = await G(); if (!g.foe.reacts.slice(-1)[0].match(/knock|die/)) fail(`the answer's cut: ${g.foe.reacts.slice(-2).join(' ')}`);
    ok(`${atk} countered: ${g.log.slice(n).join(' ')}`); }
  step = 'F too early: a block'; await settle(); { const f = (await G()).foe; await walkTo(f.x - 16, f.z, 4); }
  { const n = await logLen(), atk = await pressAt(.02, .2); await logHas('F:block', n); await shot('counter-block', ['hero', 'foe']);
    const log = (await G()).log.slice(n); if (log.some(l => l.startsWith('F:counter'))) fail(`an early press countered: ${log.join(' ')}`); ok(`${atk} blocked: ${log.join(' ')}`); }
  step = 'F counter that kills: the close-up'; { await page.evaluate(() => window.__seen.clear());
    for (let i = 0; i < 40 && !(await G()).log.some(l => l === 'F:cut:kill'); i++) { await settle(); const f = (await G()).foe; if (f.dead) { await until('the respawn', () => !window.__iso.foe.dead, undefined, 90000); continue; }
      await walkTo(f.x - 16, f.z, 4); const n = await logLen(); await pressAt(.33, .46); await logHas('F:cut', n); }
    await seen('cine'); ok('a killing counter, the close-up played'); }

  // ---- the rest on a calm squad of three
  step = 'Q Lightning Chain'; await boot('?iso&test&solo&combo=free&calm&tick=8&foes=3'); await settle();
  await until('the squad gathering', () => window.__iso.foes.filter(f => Math.hypot(f.x - window.__iso.hero.x, f.z - window.__iso.hero.z) < 60).length === 3, undefined, 60000);
  { const n = await logLen(); await page.keyboard.press('KeyQ'); await logHas('Q:link', n); const cd = await page.evaluate(() => window.__iso.reserved.cd.chain); await shot('chain-links', ['hero', 'near']);
    await logHas('Q:yank', n); await logHas('Q:cut', n); await shot('chain-cut', ['hero', 'near']); const log = (await G()).log.slice(n), links = log.filter(l => l.startsWith('Q:link')).length;
    if (links < 2) fail(`the chain leapt to ${links}: ${log.join(' ')}`); if (log.includes('Q:cut:miss')) fail(`the draw-cut missed the dragged man: ${log.join(' ')}`);
    if (!(cd > 5)) fail(`Q cooldown ${cd}`);
    ok(`${links} links; ${log.join(' ')}; cooldown ${cd.toFixed(1)} s`); }
  step = 'Q on cooldown: refused'; { const n = await logLen(); await page.keyboard.press('KeyQ'); await gameWait(.3); if ((await G()).log.slice(n).some(l => l.startsWith('Q:'))) fail('Q cast on cooldown'); ok(); }

  step = 'R Blade Recall'; await settle();
  const recallOnce = async (how, name) => { await until('R ready', () => window.__iso.reserved.cd.recall <= 0, undefined, 90000); await settle(); const n = await logLen();
    await page.keyboard.press('KeyR'); await logHas('R:throw', n); await until('the blade hanging', () => window.__iso.reserved.recall && window.__iso.reserved.recall.phase === 'hang');
    if (!(await page.evaluate(() => window.__iso.away))) fail('the blade hangs but he still holds it');
    if (name === 'home') { await shot('recall-hang', ['hero', 'near']); await page.keyboard.press('KeyJ'); await gameWait(.25); if (/J1/.test((await G()).hero.state)) fail('J cut with the blade away'); }
    if (how === 'hold') { await page.keyboard.down('KeyR'); await logHas('R:anchor', n); await page.keyboard.up('KeyR'); } else await page.keyboard.press('KeyR');
    await logHas('R:' + name, n); await until('the blade back', () => !window.__iso.away && !window.__iso.reserved.recall); await shot(`recall-${name}`, ['hero', 'near']);
    await until('the click', () => !['rCall', 'rReach', 'rCaught', 'rAnchor', 'rHome'].includes(window.__iso.hero.state) && window.__iso.hero.state !== 'sheathe');
    return (await G()).log.slice(n).join(' '); };
  { const a = await recallOnce('tap', 'home'), b = await recallOnce('tap', 'catch'), c = await recallOnce('hold', 'anchor'); ok(`home: ${a} | catch: ${b} | anchor: ${c}`); }

  step = 'X Time Slice'; await settle();
  await until('the squad standing near', () => window.__iso.foes.filter(f => !f.dead && Math.hypot(f.x - window.__iso.hero.x, f.z - window.__iso.hero.z) < 70).length >= 2, undefined, 90000);
  { await until('a full meter', () => window.__iso.reserved.qi >= .999); const n = await logLen(); await page.evaluate(() => window.__seen.clear());
    await page.keyboard.press('KeyX'); await logHas('X:stop', n); await seen('gray');
    if (!(await page.evaluate(() => window.__iso.foes.every(f => f.dead || f.frozen)))) fail('time did not stop for the squad');
    await shot('timeslice-stopped', ['hero', 'near']);
    await logHas('X:click', n); const log = (await G()).log.slice(n), took = +log.find(l => l.startsWith('X:stop')).split(':')[2], fell = +log.find(l => l.startsWith('X:click')).split(':')[2];
    await shot('timeslice-click', ['hero', 'near']); if (took < 2 || fell !== took) fail(`Time Slice took ${took}, ${fell} fell: ${log.join(' ')}`);
    if ((await page.evaluate(() => window.__iso.gray)) > 0) fail('the colour never came back'); await seen('cine');
    const q = await page.evaluate(() => window.__iso.reserved.qi); if (q > .01) fail(`the meter after Time Slice: ${q}`);
    ok(`${took} taken, ${fell} fell, the close-up played; ${log.join(' ')}`); }
  step = 'X on an empty meter: refused'; await settle(); { const n = await logLen(); await page.keyboard.press('KeyX'); await gameWait(.3); if ((await G()).log.slice(n).some(l => l.startsWith('X:'))) fail('X cast with no Qi'); ok(); }

  step = 'the skills in each style'; for (let i = 0; i < 3; i++) { await page.keyboard.press('KeyV'); const st = await page.evaluate(() => window.__iso.style); await settle();
    await until('Q ready', () => window.__iso.reserved.cd.chain <= 0 && window.__iso.foes.some(f => !f.dead), undefined, 90000); const n = await logLen(); await page.keyboard.press('KeyQ'); await logHas('Q:link', n);
    await shot(`style-chain-${st.replace(/\W+/g, '-').toLowerCase()}`, ['hero', 'near']); }
  ok();
  step = 'growth'; { const s = await page.evaluate(() => window.__iso.reserved); if (!(s.pts.chain >= 1 && s.pts.slice >= 1)) fail(`landed casts not counted: ${JSON.stringify(s.pts)}`); ok(JSON.stringify(s.pts)); }
  // ---- personalities and the twenty idles (persona/, anim/idles.js): measured on actors of their own (never steering the game)
  // on a fresh page (after the skills: the ronin's pick is remembered in localStorage, and the old master runs slower)
  step = 'personalities: boot'; await boot('?iso&test&solo&combo=free&calm&tick=8&foes=1'); await settle(); ok();
  const PS = fn => page.evaluate(fn);
  step = 'each idle plays'; { const r = await PS(() => window.__iso.persona.idleReport()), ids = Object.keys(r);
    if (ids.length !== 20) fail(`${ids.length} idles`);
    for (const id of ids) { const v = r[id], p = await page.evaluate(i => window.__iso.persona.playOne(i), id);
      if (!p.seen || !p.finite) fail(`${id} never played on an actor (${JSON.stringify(p)})`);
      if (v.dev < .3) fail(`${id} barely moves him (${v.dev.toFixed(2)})`); if (v.jump > 2) fail(`${id} jumps ${v.jump.toFixed(2)} rig px in one step`);
      if (v.end > 1e-6) fail(`${id} ends ${v.end} away from the breath`); }
    ok(ids.map(id => `${id} ${r[id].dev.toFixed(1)}`).join(', ')); }
  step = 'no traits = the plain ronin'; { const s = await PS(() => window.__iso.persona.plainSame()), c = await PS(() => window.__iso.persona.idleChoices([], 120));
    for (const [k, v] of Object.entries(s)) if (v !== 0) fail(`${k} differs from the page's by ${v}`);
    if (c.n) fail(`the plain ronin drifted into ${c.n} idles`);
    const h = await PS(() => window.__iso.persona); if (h.hero.length || h.heroIdles.length) fail(`he starts with ${JSON.stringify(h.hero)}, idles ${h.heroIdles}`);
    ok(`idle, guard, run, runArmed identical (${Object.values(s).join(', ')}); no idles`); }
  step = 'two personalities differ'; { const c = await PS(() => { const P = window.__iso.persona; return P.compare([['elder', 1], ['serene', .6], ['hatTipper', 1]], [['eager', 1], ['cocky', .6], ['footTapper', 1]], 240); });
    const { a, b } = c, d = (x, y) => Math.abs(x - y) / Math.max(x, y);
    if (d(a.run.cadence, b.run.cadence) < .15) fail(`cadence ${a.run.cadence} vs ${b.run.cadence}`);
    if (d(a.run.speed, b.run.speed) < .15) fail(`run speed ${a.run.speed} vs ${b.run.speed}`);
    if (d(a.breath, b.breath) < .15) fail(`breath ${a.breath} vs ${b.breath}`);
    if (b.choices.n < a.choices.n * 1.5) fail(`idles in 240 s: ${a.choices.n} vs ${b.choices.n}`);
    const top = o => Object.entries(o.choices.count).sort((x, y) => y[1] - x[1])[0][0]; if (top(a) === top(b)) fail(`both favour ${top(a)}`);
    if (d(a.behave.patience, b.behave.patience) < .3) fail(`patience ${a.behave.patience} vs ${b.behave.patience}`);
    ok(`old master: run ${a.run.speed.toFixed(0)} px/s at ${a.run.cadence.toFixed(2)}/s, breath ${a.breath.toFixed(1)} s, ${a.choices.n} idles (mostly ${top(a)}), waits ${a.behave.patience.toFixed(1)} s; ` +
      `hothead: ${b.run.speed.toFixed(0)} at ${b.run.cadence.toFixed(2)}/s, ${b.breath.toFixed(1)} s, ${b.choices.n} idles (mostly ${top(b)}), waits ${b.behave.patience.toFixed(1)} s`); }
  step = 'the ronin takes a personality ([)'; await settle(); { await page.keyboard.press('BracketLeft');
    const h = await PS(() => window.__iso.persona.hero); if (!h.length) fail('[ gave him no traits');
    await until('an idle of his', () => window.__iso.persona.heroIdles.length > 0, undefined, 120000); await shot('persona-hero');
    const a0 = (await G()).hero; await page.keyboard.down('ArrowLeft'); await until('the run', () => window.__iso.hero.state === 'run' && window.__iso.hero.v > 80);
    await gameWait(.4); const v = (await G()).hero.v; await page.keyboard.up('ArrowLeft');
    if (Math.abs(v - 88) > 2) fail(`the old master runs at ${v.toFixed(1)} (wanted 88)`);
    ok(`${h.map(x => x.join(' ')).join(', ')}: idles ${(await PS(() => window.__iso.persona.heroIdles)).join(', ')}; runs ${v.toFixed(0)} px/s (plain 110); from ${a0.state}`); }
  step = 'the samurai takes a personality (])'; { const b0 = await PS(() => window.__iso.persona.behave); await page.keyboard.press('BracketRight');
    const b1 = await PS(() => window.__iso.persona.behave); if (b0.patience !== 1.6 || b1.patience <= 1.6) fail(`patience ${b0.patience} → ${b1.patience}`);
    ok(`patience ${b0.patience} → ${b1.patience.toFixed(2)} s, reach ${b0.reach} → ${b1.reach.toFixed(0)}, recoil ×${b1.recoil.toFixed(2)}`); }
  step = 'the townsfolk'; { await PS(() => { window.__walked = new Set(); const f = () => { for (const n of window.__iso.folk) if (n.state === 'walk') window.__walked.add(n.culture + n.kind); requestAnimationFrame(f); }; f(); });
    await gameWait(20); const f = await PS(() => window.__iso.folk), walked = await PS(() => window.__walked.size);
    if (f.length < 6) fail(`${f.length} townsfolk`); const lists = new Set(f.map(n => JSON.stringify(n.list))); if (lists.size !== f.length) fail('two of them are the same person');
    const idled = f.filter(n => n.idles > 0); if (idled.length < 4) fail(`only ${idled.length} drifted into an idle`); if (walked < 3) fail(`only ${walked} wandered`);
    await shot('townsfolk', ['hero', 'foe']);
    ok(f.map(n => `${n.culture} ${n.kind} (${n.list.slice(-1)[0].join(' ')}): ${n.played.join('/') || '-'}`).join('; ') + `; ${walked} wandered`); }
  errorsCheck();

  // ---- the gallery: all twenty side by side, each looping
  step = 'the idle gallery'; await page.goto(new URL('?iso&idles&test&tick=4', base).href);
  await page.waitForFunction(() => window.__iso && window.__iso.gallery && window.__iso.t > 8, undefined, { timeout: 120000 });
  { const g = await page.evaluate(() => window.__iso.idles); const none = g.filter(i => !i.n); if (g.length !== 20 || none.length) fail(`not played: ${none.map(i => i.id)}`);
    await page.locator('canvas').screenshot({ path: `${OUT}/idles-gallery.png` }); ok(`${g.length} looping`); }
  errorsCheck();
  console.log('\ncheck:iso passed');
} catch (e) { if (!process.exitCode) { console.error(e); process.exitCode = 1; } }
finally { await browser.close(); await server.close(); }
