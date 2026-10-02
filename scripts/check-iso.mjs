// npm run check:iso: serves the built dist/ with `vite preview`, opens the slice (?iso&test), and plays the core loop in
// Chromium: no page errors; the run in all 8 directions (the stick maps straight to the screen, he faces where he
// runs); the roll (its i-frames, its distance); J1 → J2 → J3 on the samurai with every hit landing and the samurai
// reacting; a cut cancelled into the roll; a kill and the respawn; the same loop with the pixel look; one shot per
// pipeline toggle; the 15 weapons (drawn, J1 → J3, stowed in all 8 facings, then in play with their reach and hit-stops).
// Screenshots land in test-output/iso/. Chromium comes from PLAYWRIGHT_BROWSERS_PATH (never downloaded),
// with WebGL on SwiftShader, which draws a few frames a second: the page runs with &tick=N (N game steps a frame), and
// every wait here is on the game's own clock or state, never the wall clock.
import { chromium } from 'playwright';
import { preview } from 'vite';
import fs from 'node:fs';

const OUT = 'test-output/iso'; fs.mkdirSync(OUT, { recursive: true });
let step = '';
function fail(msg) { console.error(`\nFAIL${step ? ` at "${step}"` : ''}: ${msg}`); process.exitCode = 1; throw new Error(msg); }
const ok = msg => console.log(`  ok  ${step}${msg ? ': ' + msg : ''}`);

const server = await preview({ logLevel: 'silent', preview: { port: 4174, strictPort: false, open: false } });
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
const errors = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());   // hermetic

const G = () => page.evaluate(() => ({ hero: window.__iso.hero, foe: window.__iso.foe, t: window.__iso.t, look: window.__iso.look, log: window.__iso.STATS.log.slice() }));
const until = async (what, fn, arg, timeout = 60000) => {
  try { await page.waitForFunction(fn, arg, { timeout, polling: 50 }); }
  catch { const g = await G(); fail(`never reached ${what} (hero ${g.hero.state} at ${g.hero.x.toFixed(1)},${g.hero.z.toFixed(1)}; foe ${g.foe.state} hp ${g.foe.hp})`); } };
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
  await page.goto(new URL('?iso&test&calm&tick=8', base).href);
  await page.waitForFunction(() => window.__iso && window.__iso.ready && window.__iso.t > .2, undefined, { timeout: 60000 });
  await page.locator('canvas').click();
  // what he has been through, recorded every frame in the page (a poll from here can miss a state that lasts 2 frames)
  await page.evaluate(() => { window.__seen = new Set(); window.__seq = []; const f = () => { const h = window.__iso.hero; window.__seen.add(h.state); if (h.iframes) window.__seen.add('iframes'); if (window.__iso.cine) window.__seen.add('cine'); if (window.__iso.impact) window.__seen.add('impact');
    if (window.__seq.at(-1) !== h.state) window.__seq.push(h.state); requestAnimationFrame(f); }; f(); });
  const seen = (what, timeout) => until(what, w => window.__seen.has(w), what, timeout), forget = () => page.evaluate(() => { window.__seen.clear(); window.__seq = []; });
  errorsCheck(); ok(`look ${(await G()).look}`); await shot('00-start', ['hero', 'foe']);

  // ---- the run in 8 directions: hold the keys until he has covered ground, check where he went and which way he faces
  const DIRS = [['N', ['ArrowUp'], Math.PI], ['NE', ['ArrowUp', 'ArrowRight'], 3 * Math.PI / 4], ['E', ['ArrowRight'], Math.PI / 2], ['SE', ['ArrowDown', 'ArrowRight'], Math.PI / 4],
    ['S', ['ArrowDown'], 0], ['SW', ['ArrowDown', 'ArrowLeft'], -Math.PI / 4], ['W', ['ArrowLeft'], -Math.PI / 2], ['NW', ['ArrowUp', 'ArrowLeft'], -3 * Math.PI / 4]];
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
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
  const walkTo = async (tx, tz, r) => { for (let i = 0; i < 40; i++) { const g = (await G()).hero; const dx = tx - g.x, dz = tz - g.z; if (Math.hypot(dx, dz) < r) break;
    const keys = [Math.abs(dx) > 4 ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : null, Math.abs(dz) > 4 ? (dz > 0 ? 'ArrowDown' : 'ArrowUp') : null].filter(Boolean);
    for (const k of keys) await page.keyboard.down(k); await gameWait(.08); for (const k of keys) await page.keyboard.up(k); } };
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

  // ---- a cut cancelled into the roll: J, then Shift as soon as it has struck
  step = 'cancel into the roll'; await settle(); await forget(); { await page.keyboard.press('KeyJ'); await seen('J1');
    await page.keyboard.press('Shift'); await seen('roll'); await shot('cancel-roll');
    const seq = await page.evaluate(() => window.__seq.join(' > ')); if (!/J1 > roll/.test(seq)) fail(`the roll did not cut the cut short: ${seq}`); ok(seq); }

  // ---- the kill and the respawn
  step = 'kill'; await settle(); { for (let i = 0; i < 12 && !(await G()).foe.dead; i++) { const f = (await G()).foe, h = (await G()).hero;
      if (Math.hypot(f.x - h.x, f.z - h.z) > 26) { await walkTo(f.x - 22, f.z, 6); await settle(); }
      await page.keyboard.press('KeyJ'); await gameWait(.32); }
    await until('the samurai dying', () => window.__iso.foe.dead); await gameWait(.6); await shot('death', ['hero', 'foe']);
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

  // ---- one shot per pipeline step, toggled off and on again
  step = 'pipeline toggles';
  for (const [key, name] of [['Digit1', 'lowres'], ['Digit2', 'toon'], ['Digit3', 'dither'], ['Digit4', 'palette'], ['Digit5', 'outline'], ['Digit7', 'rim'], ['Digit8', 'glint']]) {
    await page.keyboard.press(key); await gameWait(.1); await shot(`pipe-${name}-flipped`); await page.keyboard.press(key); }
  ok();
  errorsCheck();

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

  // ---- the 15 weapons in play: picked with T, each walks up to the samurai from one of the eight sides (so the cuts come
  //   in every facing), J1 → J2 → J3 all land at the weapon's reach with its hit-stops, and he stows it after the calm
  step = 'weapons: in play';
  await page.goto(new URL('?iso&test&calm&tick=8&hp=999', base).href);
  await page.waitForFunction(() => window.__iso && window.__iso.ready && window.__iso.t > .2, undefined, { timeout: 60000 });
  await page.locator('canvas').click();
  await page.evaluate(() => { window.__yaw = []; let n = 0; const f = () => { const L = window.__iso.STATS.log.length; if (L > n) { n = L; window.__yaw.push(window.__iso.hero.yaw); } requestAnimationFrame(f); }; f(); });
  const W8 = await page.evaluate(() => window.__iso.weapons), facings = new Set(), FA = [0, 1, 2, 3, 4, 5, 6, 7].map(k => wrap(k * Math.PI / 4));
  for (let i = 0; i < W8.length; i++) { const w = W8[i];
    if (i) await page.keyboard.press('KeyT');
    step = `weapon ${w.id}`; await until(`the ${w.id} in hand`, id => window.__iso.hero.weapon === id, w.id); await settle();
    const k = i % 8, a = k * Math.PI / 4; { const f = (await G()).foe; await walkTo(f.x + Math.sin(a) * 22, f.z + Math.cos(a) * 22, 5); } await settle();
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
  console.log('\ncheck:iso passed');
} catch (e) { if (!process.exitCode) { console.error(e); process.exitCode = 1; } }
finally { await browser.close(); await server.close(); }
