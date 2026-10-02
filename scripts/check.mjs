// npm run check: serves the built dist/ with `vite preview`, plays a key sequence in Chromium and asserts the player
// walks through the expected states with no page errors. Screenshots land in test-output/ (gitignored).
// Chromium comes from PLAYWRIGHT_BROWSERS_PATH (preinstalled); this never downloads a browser.
import { chromium } from 'playwright';
import { preview } from 'vite';
import fs from 'node:fs';

let step = '';
function fail(msg) { console.error(`\nFAIL${step ? ` at "${step}"` : ''}: ${msg}`); process.exitCode = 1; throw new Error(msg); }
// `npm run check:hd` plays the same sequence at 2x (?hd), its screenshots in test-output/hd/
const HDRUN = !!process.env.CHECK_HD, OUT = HDRUN ? 'test-output/hd' : 'test-output';
fs.mkdirSync(OUT, { recursive: true });

// the build must be ONE self-contained page (plus the prototypes copied beside it)
const html = fs.readFileSync('dist/index.html', 'utf8');
const external = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)].map(m => m[1]).filter(u => !u.startsWith('https://fonts.googleapis.com/'));
if (external.length) fail(`dist/index.html loads files it should inline: ${external.join(', ')}`);

const server = await preview({ logLevel: 'silent', preview: { port: 4173, strictPort: false, open: false } });
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());   // hermetic: no web fonts

try {
  const proto = await page.request.get(new URL('prototypes/15-counter-stance.html', base).href);
  if (proto.status() !== 200) fail(`prototypes are not served (status ${proto.status()})`);

  await page.goto(new URL(HDRUN ? '?test&hd' : '?test', base).href);
  await page.waitForFunction(() => window.__game && window.__game.P);
  // record every state he passes through (and the charged skill's name), once per animation frame
  await page.evaluate(() => { window.__log = [];
    const tick = () => { const { P } = window.__game, s = P.cv ? `${P.state}:${P.cv.name}` : P.state;
      if (window.__log[window.__log.length - 1] !== s) window.__log.push(s); requestAnimationFrame(tick); };
    tick(); });
  await page.locator('#game').click();

  const kb = page.keyboard, sleep = ms => page.waitForTimeout(ms);
  const state = () => page.evaluate(() => window.__game.P.state);
  const until = async (what, fn, arg, timeout = 6000) => {
    try { await page.waitForFunction(fn, arg, { timeout }); }
    catch { fail(`never reached ${what} (state now: ${await state()}, log tail: ${(await page.evaluate(() => window.__log.slice(-8))).join(' > ')})`); } };
  // a combo chain (player/prompts.js) holds J and the arrows while a prompt is open: reaching a free state waits for it to end too
  const calm = () => { const c = window.__game.CP; return !c.prompt && !c.queued && !c.chain && !(c.lock > 0) && !c.pendingK; };
  const reach = async (re, timeout) => { await until(re.toString(), r => new RegExp(r).test(window.__game.P.state), re.source, timeout);
    if (re === FREE) await until('the combo chain to end', calm, undefined, timeout || 6000); };
  const cv = name => until(`charged skill ${name}`, n => window.__game.P.cv && window.__game.P.cv.name === n, name);
  const FREE = /^(idle|run|walk|idleGlitch|ready\d|runArmed|sheathe)$/;   // states that take a new command
  const shot = name => page.locator('#game').screenshot({ path: `${OUT}/${name}.png` });
  // walk him somewhere with the arrow keys: the vertical leg first, then the horizontal, so the route is predictable round the pillars
  const walkTo = async (x, y, timeout = 10000, soft = false) => {
    // soft: a walk that may fall short (chasing a moving samurai) gives up quietly instead of failing the check
    const fail_ = soft ? m => { throw new Error(m); } : fail;
    await until('the combo chain to end', calm, undefined, 8000);
    const t0 = Date.now(), Y = ['y', y, 'ArrowUp', 'ArrowDown'], X = ['x', x, 'ArrowLeft', 'ArrowRight'];
    // he slows to a stop rather than stopping dead (player/locomotion.js): once he has, check both axes again,
    // since the second leg starts while the first one's speed is still dying away
    const settle = () => page.waitForFunction(() => Math.hypot(window.__game.P.vx, window.__game.P.vy) < 1, undefined, { timeout: 600 }).catch(() => {});
    const at = async a => { await settle(); return page.evaluate(a => window.__game.P[a], a); };
    for (let pass = 0; pass < 4; pass++) {
    if (pass && Math.abs(await at('x') - x) <= 2 && Math.abs(await at('y') - y) <= 2) break;
    // y first, then x; a pillar in the way (a step that gets him nowhere) and he tries the other axis first
    for (let order = [Y, X], turns = 0; ; order = order.slice().reverse(), turns++) {
      let blocked = false;
      for (const [axis, goal, neg, pos] of order) {
        for (let stuck = 0; ;) { const v = await page.evaluate(a => window.__game.P[a], axis), d = goal - v;
          if (Math.abs(d) <= 2) break;
          if (Date.now() - t0 > timeout) fail_(`could not walk to ${x},${y} (${axis} ${v.toFixed(1)})`);
          const k = d < 0 ? neg : pos; await kb.down(k); await sleep(Math.min(400, Math.abs(d) / 78 * 1000)); await kb.up(k);
          const v2 = await page.evaluate(a => window.__game.P[a], axis);
          if (Math.abs(v2 - v) >= .5) stuck = 0; else if (++stuck > 3) { blocked = true; break; } }
        if (blocked) break; }
      if (!blocked) break; if (turns > 6) fail_(`could not walk to ${x},${y}: blocked both ways`); } }
    await reach(FREE); };
  const inv = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__game.INV)));
  const run = async (name, fn) => { step = name; await fn(); console.log(`  ok  ${name}`); };
  // the nearest samurai with at least hp left (the healthiest first when none has)
  const fitSamurai = (hp, lone) => page.evaluate(([hp, lone]) => { const { P, E, K } = window.__game, L = E.map((e, i) => ({ e, i })).filter(q => q.e.alive && q.e.hp >= hp && !q.e.held && q.e.state === 'guard' && (!lone || K.alone.has(q.e)));   // standing his ground, not reeling from a cut
    L.sort((a, b) => Math.hypot(a.e.x - P.x, a.e.y - P.y) - Math.hypot(b.e.x - P.x, b.e.y - P.y)); return L[0] && { i: L[0].i, x: L[0].e.x, y: L[0].e.y }; }, [hp, lone]);
  const besides = async (dx = 16, hp = 2, lone = false) => { // level with a samurai with hp left (lone: K could take him), facing him from the left
    for (let k = 0; k < 30; k++) { const e = await fitSamurai(hp, lone);
      // nobody fit: a new squad comes only once the whole room is down, so cut down whoever is left (the weakest first is fine)
      // (under Auto, so each J is a whole chain; the setting is put back after)
      if (!e) { if (hp > .01 && k % 2 === 1 && await fitSamurai(.01)) { const m = await page.evaluate(() => window.__game.PT.assist);
          await page.selectOption('#combo', 'auto'); await besides(16, .01); await kb.press('j'); await reach(FREE, 8000); await page.selectOption('#combo', m); }
        else await sleep(500); continue; }
      await walkTo(Math.max(30, Math.round(e.x - dx)), Math.round(e.y), 10000, true).catch(() => {});
      // face him: a tap can fall between two steps and never turn him (only a held key does), so hold it a beat until he faces right
      for (let t = 0; t < 5 && await page.evaluate(() => window.__game.P.face < 0); t++) { await kb.down('d'); await sleep(40); await kb.up('d'); }
      await reach(FREE, 6000); const ok = await page.evaluate(([i, d, hp]) => { const { P, E } = window.__game, e = E[i];
        return P.face > 0 && e.alive && e.hp >= hp && e.state === 'guard' && Math.abs(e.y - P.y) < 4 && e.x - P.x > 0 && e.x - P.x < d + 12; }, [e.i, dx, hp]);
      if (ok) return e.i; }
    fail(`could not stand beside a samurai with ${hp} hp left (${JSON.stringify(await page.evaluate(() => ({ P: [window.__game.P.x, window.__game.P.y, window.__game.P.face, window.__game.P.state], E: window.__game.E.map(e => [Math.round(e.x), Math.round(e.y), e.hp, e.state]) })))})`); };

  // every key works from the start for the steps below (the skills picker); growth's own steps switch it back to 'as played'
  await page.selectOption('#skills', 'mastered'); await page.locator('#game').click();
  // the combo prompts (player/prompts.js) are always on; the steps that are about something else let each link play by itself
  // (the Auto setting), and the combo steps below switch to answering them
  await page.selectOption('#combo', 'auto'); await page.locator('#game').click();
  // the party would cut the test samurai down before he can: they wait at camp (sent there on the kit screen) until the party steps
  const party = () => page.evaluate(() => ({ members: [...window.__game.party.members], order: window.__game.party.order,
    allies: window.__game.allies.map(a => ({ id: a.c.id, state: a.state, x: a.x, y: a.y, lv: a.c.lv, exp: a.c.exp })) }));
  await run('Tab: the kit screen opens, pauses, and sends the three companions to camp', async () => {
    await kb.press('Tab'); await until('the kit screen', () => window.__game.KIT.open); await shot('00-kit-hero');
    for (let i = 0; i < 3; i++) { await kb.press('e'); await kb.press(' '); }
    await shot('00a-kit-camp'); await kb.press('Tab');
    const p = await party(); if (p.members.length || p.allies.length) fail(`the party is not at camp: ${JSON.stringify(p.members)}`); });
  await run('move', async () => { await kb.down('d'); await reach(/^run$/); await sleep(300); await shot('01-run'); await kb.up('d'); await reach(/^idle$/); });
  await run('eight facings: he turns toward and away from the camera as he moves (the port system)', async () => {
    for (const [keys, view] of [[['s'], 'S'], [['d', 's'], 'SE'], [['w'], 'N'], [['a', 'w'], 'NE'], [['d'], 'E']]) {
      for (const k of keys) await kb.down(k); await reach(/^run$/);
      await until(`facing ${view}`, v => window.__game.P.view === v, view); await sleep(150);
      for (const k of keys) await kb.up(k); await reach(/^idle$/); await shot(`01a-facing-${view}`); } });
  await run('true left: W, SW and NW drawn as themselves (never the east mirrored), turned through the facings between', async () => {
    // log every facing he is drawn in, once per animation frame, to see the turn pass through the facings between
    await page.evaluate(() => { window.__faces = []; const tick = () => { if (!window.__faces) return; const f = window.__game.PF, s = `${f.id}${f.flip < 0 ? '~' : ''}`;
      if (window.__faces[window.__faces.length - 1] !== s) window.__faces.push(s); requestAnimationFrame(tick); }; tick(); });
    for (const [keys, id] of [[['a'], 'W'], [['a', 's'], 'SW'], [['a', 'w'], 'NW'], [['s'], 'S'], [['a'], 'W']]) {
      for (const k of keys) await kb.down(k); await reach(/^run$/);
      await until(`drawn facing ${id}`, v => window.__game.PF.id === v && window.__game.PF.flip === 1, id); await sleep(150);
      for (const k of keys) await kb.up(k); await reach(/^idle$/);
      const f = await page.evaluate(() => ({ ...window.__game.PF, face: window.__game.P.face }));
      if (f.id !== id || f.flip !== 1) fail(`idle facing ${id} is drawn ${f.id}, flip ${f.flip}`);
      await shot(`01a-true-${id}`); }
    // back east: never a flip, one facing at a time through the camera side
    await kb.down('d'); await until('drawn facing E', () => window.__game.PF.id === 'E'); await kb.up('d'); await reach(/^idle$/);
    const seq = await page.evaluate(() => { const s = window.__faces; window.__faces = null; return s; });
    const ORDER = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
    for (let i = 1; i < seq.length; i++) { const a = ORDER.indexOf(seq[i - 1]), b = ORDER.indexOf(seq[i]), d = (b - a + 8) % 8;
      if (a < 0 || b < 0 || (d !== 1 && d !== 7)) fail(`the turn jumped from ${seq[i - 1]} to ${seq[i]} (${seq.join(' ')})`); }
    if (!seq.includes('S')) fail(`W to E did not turn by the camera: ${seq.join(' ')}`);
    // a cut facing west stays side on, but from his true left, never mirrored (owner: "don't mirror", the scabbard at his left hip)
    await kb.down('a'); await reach(/^run$/); await kb.up('a'); await reach(/^idle$/);
    await kb.press('j'); await reach(/^slash1$/);
    const c = await page.evaluate(() => ({ ...window.__game.PF }));
    if (c.id !== 'W' || c.flip !== 1 || Math.abs(c.yaw - Math.PI) > 1e-6) fail(`a cut facing west is drawn ${c.id}, yaw ${c.yaw}, flip ${c.flip}: mirrored, not his true left`);
    await shot('01a-true-W-cut'); await reach(/^idle$/, 10000);   // calm: he resheathes and stands
    // the samurai in guard come round to their true facing too: facing left, a west facing (a beat later, turning through the ones between)
    await sleep(700);
    const en = await page.evaluate(() => { const IX = { E: 0, SE: 1, S: 2, SW: 3, W: 4, NW: 5, N: 6, NE: 7 }, WEST = { E: 'W', SE: 'SW', NE: 'NW' };
      return window.__game.E.filter(e => e.alive && e.turn && e.state === 'guard').map(e => ({ at: e.turn.i, want: IX[e.face < 0 ? WEST[e.view] || e.view : e.view], face: e.face })); });
    if (!en.length) fail('no samurai in guard to look at');
    const off = en.filter(e => e.at !== e.want);
    if (off.length > en.length / 2) fail(`samurai are not drawn in their true facing: ${JSON.stringify(off)}`); });
  await run('hold V: walk', async () => { await kb.down('v'); await kb.down('d'); await reach(/^walk$/); await sleep(300); await shot('01b-walk');
    await kb.up('d'); await kb.up('v'); await reach(/^idle$/); });
  await run('the walk (owner N2A): a longer stride, so at 40 px/s his legs cycle at about 8 frames a second again; every personality still bakes', async () => {
    await walkTo(110, 240); await reach(/^idle$/); await sleep(200);
    await page.evaluate(() => { window.__wk = []; window.__wkOn = true; const tick = () => { if (!window.__wkOn) return; const { P } = window.__game;
      window.__wk.push({ s: P.state, v: Math.hypot(P.vx, P.vy), t: P.t, x: P.x }); requestAnimationFrame(tick); }; tick(); });
    await kb.down('v'); await kb.down('d'); await sleep(900); await kb.up('d'); await kb.up('v'); await reach(/^idle$/);
    const { wk, top, stride } = await page.evaluate(() => { window.__wkOn = false; const g = window.__game; return { wk: window.__wk, top: g.P.gait.walk * g.ST.speed, stride: g.stride('walk') }; });
    const st = wk.filter(r => r.s === 'walk' && Math.abs(r.v - top) < .01), a = st[0], b = st[st.length - 1];
    if (!a || b.x - a.x < 15) fail(`no steady walk to measure (${st.length} frames)`);
    // frames of the gait (8 a second of its clock) over the seconds it took to cover that ground at top speed
    const cadence = (b.t - a.t) * 8 / ((b.x - a.x) / top);
    if (!(cadence > 6.5 && cadence < 9.5)) fail(`the walk's legs cycle at ${cadence.toFixed(1)} frames a second at ${top} px/s (stride ${stride && stride.toFixed(2)} px a frame), not about 8`);
    console.log(`  (the walk: ${cadence.toFixed(1)} frames a second, ${stride.toFixed(2)} px a frame)`);
    // every character and culture still bakes a walk whose stride can be measured (the gait's clock needs it)
    const opts = await page.evaluate(() => [...document.querySelectorAll('#pz-preset option')].map(o => o.value).filter(Boolean));
    for (const o of opts) { await page.selectOption('#pz-preset', o);
      const w = await page.evaluate(() => ({ s: window.__game.stride('walk'), v: window.__game.P.gait.walk }));
      if (!(w.s > 1) || !(w.v / w.s > 3 && w.v / w.s < 16)) fail(`"${o}" bakes a walk of stride ${w.s} at ${w.v} px/s`); }
    await page.selectOption('#pz-preset', 'The ronin (as he is)'); await until('his own walk again', () => window.__game.P.gait.walk === 40);
    await page.locator('#game').click(); });
  // ---- the animation flow (owner picks 2026-10-02, "Flow: Q1C Q2B Q3A Q4C Q5C Q6C Q7C Q8C"; player/feel.js) ----
  await run('flow: the run ramps up and slows down (never on/off), its legs keep pace (clock = distance / stride), the camera looks ahead', async () => {
    await walkTo(110, 180); await reach(/^idle$/); await sleep(300);
    await page.evaluate(() => { window.__mv = []; window.__mvOn = true; const tick = () => { if (!window.__mvOn) return; const { P, CAM } = window.__game;
      window.__mv.push({ s: P.state, v: Math.hypot(P.vx, P.vy), t: P.t, x: P.x, y: P.y, cx: CAM.ox }); requestAnimationFrame(tick); }; tick(); });
    await kb.down('d'); await sleep(700); await kb.up('d'); await reach(/^idle$/); await sleep(150);
    const { mv, top, stride, fps } = await page.evaluate(() => { window.__mvOn = false; const g = window.__game;
      return { mv: window.__mv, top: g.P.gait.run * g.ST.speed, stride: g.stride('run'), fps: 14 }; });
    const run = mv.filter(r => r.s === 'run'), max = Math.max(...run.map(r => r.v));
    if (!(Math.abs(max - top) < .02 * top)) fail(`top speed ${max.toFixed(1)}, not his run's ${top.toFixed(1)}`);
    if (!run.some(r => r.v > 0 && r.v < .7 * top)) fail(`no ramp up: the run started at ${run[0] && run[0].v.toFixed(1)} px/s`);
    const end = mv.findIndex((r, i) => i > 0 && mv[i - 1].v >= top * .98 && r.v < top * .98);
    if (end < 0 || !mv.slice(end).some(r => r.v > 0 && r.v < .9 * top)) fail('no slow-down: the run stopped dead');
    // steady running: the gait's clock moved by the distance over the stride (player/locomotion.js)
    const st = run.filter(r => Math.abs(r.v - top) < .01), a = st[0], b = st[st.length - 1];
    const want = Math.hypot(b.x - a.x, b.y - a.y), got = (b.t - a.t) * fps * stride;
    if (!(want > 20 && Math.abs(got - want) < .08 * want)) fail(`the run's legs covered ${got.toFixed(1)} px of stride for ${want.toFixed(1)} px run`);
    if (!run.some(r => r.cx > 0) || run.some(r => Math.abs(r.cx * (HDRUN ? 2 : 1) % 1) > 1e-9)) fail(`the camera did not look ahead in whole pixels: ${[...new Set(run.map(r => r.cx))].join(' ')}`); });
  await run('flow: a new move blends in from the last drawn pose and settles within 4 frames; J1 to the next link never passes a sheathed blade', async () => {
    // the next link comes from a landed cut's combo prompt (Auto plays it); a samurai can step out of reach before the cut lands:
    // stand beside one again, at most three times
    for (let k = 0; ; k++) {
      await besides(16, 2); await sleep(300);
      await page.evaluate(() => { window.__pb = []; window.__pbOn = true; const tick = () => { if (!window.__pbOn) return; const B = window.__game.PB;
        window.__pb.push({ s: B.s, n: B.n, d: B.d, blade: B.blade }); requestAnimationFrame(tick); }; tick(); });
      await kb.press('j'); await reach(/^slash1r?$/);
      if (await page.waitForFunction(() => /^slash[2-6]$/.test(window.__game.P.state), undefined, { timeout: 3000 }).then(() => true, () => false)) break;
      const why = await page.evaluate(() => { window.__pbOn = false; const { CP, P } = window.__game; return { last: CP.last, stats: CP.stats, log: CP.log.slice(-3), assist: window.__game.PT.assist, s: P.state }; });
      console.log(`  (no next link: ${JSON.stringify(why)})`);
      if (k >= 2) fail('three cuts beside a samurai never led into a next link'); await reach(FREE, 6000); }
    const nx = await state(); await reach(/^(ready\d|sheathe)$/); await sleep(100);
    const pb = await page.evaluate(() => { window.__pbOn = false; return window.__pb; });
    const j1 = pb.filter(r => /^slash1r?$/.test(r.s)), first = j1[0], late = j1.filter(r => r.n >= 4);
    if (!first || !(first.d > .05)) fail(`the first drawn frame of slash 1 is its own pose: no blend (${JSON.stringify(first)})`);
    if (!late.length || late.some(r => r.d > 1e-3)) fail(`slash 1 still blending after 4 frames (${JSON.stringify(late.slice(0, 3))})`);
    const from = pb.findIndex(r => /^slash1r?$/.test(r.s) && r.blade === 'out'), to = pb.map(r => r.s).lastIndexOf(nx);
    const bad = pb.slice(from, to + 1).filter(r => r.blade !== 'out');
    if (from < 0 || to < from || bad.length) fail(`the chain's blade went ${bad.map(r => `${r.s}:${r.blade}`).join(' ') || 'nowhere'}`);
    if (!pb.some(r => r.s === nx && r.n === 0)) fail(`the next link (${nx}) was never drawn`);
    await reach(/^idle$/, 8000); });   // calm: he resheathes, so the walk after is the walk, not a run with the blade out
  await run('personality: a trait mix re-bakes how he stands and walks', async () => {
    await page.selectOption('#pz-preset', 'Old master');
    await until('the Old master\'s slower walk', () => window.__game.P.gait.walk < 40);
    await page.locator('#game').click(); await kb.down('v'); await kb.down('a'); await reach(/^walk$/); await sleep(300); await shot('01c-old-master');
    await kb.up('a'); await kb.up('v'); await reach(/^idle$/);
    await page.selectOption('#pz-preset', 'culture:shinobi');
    await until('a shadow villager\'s traits', () => (window.__game.P.personality || []).some(([id]) => id === 'shadow'));
    await page.selectOption('#pz-preset', 'The ronin (as he is)'); await until('his own walk again', () => window.__game.P.gait.walk === 40);
    await page.locator('#game').click(); });
  await run('J on a samurai: flinch, stagger, death', async () => {
    // walk up to a samurai, then cut until he falls; every state he passes through is logged
    // (and whether the killing-blow number and the chip trail showed: a number lives 0.75 s, and a cut that lands sooner kills sooner)
    // the healthiest one (the blend step before may have cut one): a first cut that kills would skip the flinch
    await page.evaluate(() => { const { E, P } = window.__game; window.__T = E.map((e, i) => i).filter(i => E[i].alive && !E[i].held)
      .sort((a, b) => E[b].hp - E[a].hp || Math.hypot(E[a].x - P.x, E[a].y - P.y) - Math.hypot(E[b].x - P.x, E[b].y - P.y))[0]; });
    await page.evaluate(() => { window.__eLog = []; window.__big = false; window.__chip = 0; const e = window.__game.E[window.__T];
      const tick = () => { if (window.__eLog[window.__eLog.length - 1] !== e.state) window.__eLog.push(e.state);
        if (window.__game.N.some(q => q.kind === 'big')) window.__big = true; if (!e.alive) window.__chip = Math.max(window.__chip, e.chip.v); requestAnimationFrame(tick); }; tick(); });
    // level with him first: from wherever the steps before left the ronin, a straight walk right could pass above or below him
    const [ex, ey] = await page.evaluate(() => [window.__game.E[window.__T].x, window.__game.E[window.__T].y]); await walkTo(Math.round(ex - 14), Math.round(ey));
    // a four-link chain, so its links land on him about 0.3 s apart and he staggers before he falls
    await page.selectOption('#basic', '120'); await until('a four-link chain', () => window.__game.INV.basic >= 120); await page.locator('#game').click();
    // J each round: the chain's next link (played by Auto) lands inside 0.5 s of the first, so he staggers; the finisher's flash
    // step leaves him behind, so turn to him first
    for (let i = 0; i < 10 && await page.evaluate(() => window.__game.E[window.__T].alive); i++) {
      const side = await page.evaluate(() => Math.sign(window.__game.E[window.__T].x - window.__game.P.x) || 1);
      if (await page.evaluate(sd => window.__game.P.face !== sd, side)) { await kb.down(side > 0 ? 'd' : 'a'); await sleep(40); await kb.up(side > 0 ? 'd' : 'a'); await reach(FREE); }
      await kb.press('j'); await reach(/^slash1/); await reach(FREE); }
    const e = await page.evaluate(() => ({ alive: window.__game.E[window.__T].alive, hp: window.__game.E[window.__T].hp, log: window.__eLog, chip: window.__chip }));
    // the killing blow's number went up, and his bar's chip was still draining after it
    if (!await page.evaluate(() => window.__big)) fail('no killing-blow number over the samurai');
    if (!(e.chip > 0)) fail('the samurai\'s health bar has no chip trail after the killing blow');
    if (e.alive) fail(`the samurai is still standing after 10 cuts (hp ${e.hp}, states ${e.log.join(' > ')})`);
    for (const st of ['flinch', 'stagger', 'dead']) if (!e.log.includes(st)) fail(`the samurai never went through ${st} (states ${e.log.join(' > ')})`);
    await until('him hitting the floor', () => window.__game.E[window.__T].body.thudT != null); await sleep(600); await shot('08-samurai-down'); });
  await run('K on a lone samurai in reach: the kill line and K prompt, an execution, blade kept out with others near, K ready 0.2 s after', async () => {
    await sleep(200); await shot('09-k-prompt');
    await kb.press('k'); await reach(/^exec$/); await page.evaluate(() => { window.__st = window.__game.P.exec; });
    await sleep(700); await shot('10-execution');
    // chaining K: the pick lands him in reach of another lone samurai whenever one of the executions can, and lands where it said
    const ch = await page.evaluate(() => ({ name: window.__st.ex.name, k: window.__st.k, open: window.__st.open }));
    if (ch.open.length && !ch.open.includes(ch.k)) fail(`"${ch.name}" was picked though ${JSON.stringify(ch.open)} keep K open`);
    // other samurai are near, so he keeps the blade out in a stance for the next K (unless that execution never drew it)
    await reach(/^(idle|ready\d)$/, 4000);
    const ld = await page.evaluate(() => ({ name: window.__st.ex.name, land: window.__st.land, at: window.__st.landed }));
    if (!(Math.hypot(ld.land[0] - ld.at[0], ld.land[1] - ld.at[1]) < 2)) fail(`"${ld.name}" landed away from where K foresaw it (${JSON.stringify(ld)})`);
    const end = await page.evaluate(() => ({ s: window.__game.P.state, armed: window.__game.P.armed, bare: !!window.__st.ex.bare }));
    if (!end.bare && !(/^ready\d$/.test(end.s) && end.armed)) fail(`he sheathed after "${await page.evaluate(() => window.__st.ex.name)}" with samurai still near (${JSON.stringify(end)})`);
    // with the blade kept out he is free before the execution has played out: let it finish first
    await until('the execution to play out', () => window.__st.clock >= window.__st.ex.dur, undefined, 3000);
    // the deaths pass: the blade landed on him (knockback, blood) and his body moved on its springs
    const d = await page.evaluate(() => { const E = window.__st.E; return { name: window.__st.ex.name, hit: E.hitAt != null, t: E.body.t, bare: !!window.__st.ex.bare || !!window.__st.ex.unseen }; });
    // (the peek-a-boos never land a blow we see: only the body's springs are asked of them)
    if ((!d.hit && !d.bare) || !(d.t > .5)) fail(`"${d.name}": the deaths pass never ran on the executed body (${JSON.stringify(d)})`);
    const cd = await page.evaluate(() => ({ t: window.__game.P.cd.tele, max: window.__game.P.cdMax.tele }));
    if (!(cd.max <= .2 + 1e-9)) fail(`K was not reset to 0.2 s after the kill (${JSON.stringify(cd)})`);
    await until('K ready again', () => !(window.__game.P.cd.tele > 0), undefined, 1000); await sleep(500); await shot('11-after'); });
  await run('K during an execution lines up the next: the last cut chains straight into it', async () => {
    await until('a lone samurai in reach', () => !!window.__game.K.pick && !(window.__game.P.cd.tele > 0), undefined, 6000);
    await kb.press('k'); await reach(/^exec$/); await page.evaluate(() => { window.__st = window.__game.P.exec; });
    await sleep(250); await kb.press('k');
    await until('K lined up during the execution', () => window.__st.queued, undefined, 1000);
    await until('the first execution to let him go', () => window.__st.freed, undefined, 4000);
    const c = await page.evaluate(() => { const X = window.__game.P.exec; return { next: !!window.__st.next, s: window.__game.P.state, same: X === window.__st, name: window.__st.ex.name,
      from: !!(X && X.from), blade: X && X.set && X.set.sword != null, bare: !!window.__st.ex.bare }; });
    if (c.next && (c.s !== 'exec' || c.same)) fail(`a lone samurai was in reach after "${c.name}" but K did not chain into him (${JSON.stringify(c)})`);
    // no snap between them: the next set eases in from the last cut, blade still out (a bare-handed execution never drew it)
    if (c.next && !(c.from && (c.blade || c.bare))) fail(`the chained execution snapped in from "${c.name}" (${JSON.stringify(c)})`);
    console.log(`  (after "${c.name}": ${c.next ? 'chained into the next execution' : 'nobody lone in reach, so no chain'})`);
    await reach(/^(idle|ready\d)$/, 8000); });
  await run('Shift: ground slide', async () => { await kb.press('Shift'); await reach(/^slide$/); await reach(FREE); });
  await run('Space: jump, fall, land', async () => { await kb.press(' '); await reach(/^jump$/); await reach(/^fall$/); await reach(/^land$/); await reach(FREE); });
  // ---- the animation flow against the samurai: cancels, the input buffer, the cut's step in, hit-stop by weight ----
  await run('flow: after its strike a cut cancels at once into a slide (a Dead Cells cancel window)', async () => {
    await reach(FREE); await until('the slide ready', () => !(window.__game.P.cd.slide > 0));
    await page.evaluate(() => { window.__log0 = window.__log.length; });
    await kb.press('j'); await reach(/^slash1r?$/); await until('the strike past', () => window.__game.P.t > .2 && /^slash1r?$/.test(window.__game.P.state));
    await kb.press('Shift'); await reach(/^slide$/);
    const lg = await page.evaluate(() => window.__log.slice(window.__log0)); const i = lg.lastIndexOf('slide');
    if (!/^slash1r?$/.test(lg[i - 1])) fail(`the slide did not cut the cut short: ${lg.slice(-5).join(' > ')}`);
    await reach(FREE); });
  await run('flow: a press made in a hit pause is buffered and fires as the pause ends (it was dropped before)', async () => {
    for (let k = 0; ; k++) {   // a samurai can step out of reach before the cut lands: stand beside one again, at most three times
      const i = await besides(); await until('the slide ready', () => !(window.__game.P.cd.slide > 0));
      const at = await page.evaluate(i => { const { P, E } = window.__game; return { p: [P.x, P.y, P.face, P.state], e: [E[i].x, E[i].y, E[i].state, E[i].hp] }; }, i);
      // Shift, sent the moment the cut's hit pause is seen (a 3-frame pause is shorter than a test's key press can aim for)
      await page.evaluate(() => { window.__hp = null; window.__log0 = window.__log.length; const g = window.__game, el = document.getElementById('game');
        const tick = () => { if (window.__hp) return; if (/^slash1r?$/.test(g.P.state) && g.S.hitstop > 0) { window.__hp = { hs: g.S.hitstop, t: g.P.t };
            el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', bubbles: true })); requestAnimationFrame(() => el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', bubbles: true }))); return; }
          requestAnimationFrame(tick); }; tick(); });
      await kb.press('j');
      if (await page.waitForFunction(() => !!window.__hp, undefined, { timeout: 2000 }).then(() => true, () => false)) break;
      console.log(`  (the cut whiffed: ${JSON.stringify(at)}, after: ${JSON.stringify(await page.evaluate(i => { const { P, E } = window.__game; return [P.x, P.y, E[i].x, E[i].y, E[i].state]; }, i))})`);
      if (k >= 2) fail('three cuts beside a samurai never landed a hit pause');
      await reach(FREE, 6000); }
    await reach(/^slide$/, 2000);
    const lg = await page.evaluate(() => window.__log.slice(window.__log0)); if (!/^slash1r?$/.test(lg[lg.lastIndexOf('slide') - 1])) fail(`the buffered slide came late: ${lg.join(' > ')}`);
    await reach(FREE); });
  await run('flow: the cuts track their target: a three-link chain (Auto) lands every cut on the same samurai', async () => {
    if ((await inv()).basic < 40) { await page.selectOption('#basic', '40'); await page.locator('#game').click(); }
    // a hit's knockback can carry him past even a tracked spin now and then: three chains, and one must land every cut
    for (let k = 0; ; k++) {
    const i = await besides(30, 4);   // full health, a step back: the first cut has to step in too
    await page.evaluate(i => { window.__hits = {}; window.__alive = {}; window.__tr = []; window.__hitOn = true; const g = window.__game; const tick = () => { if (!window.__hitOn) return;
      const s = g.P.state; if (/^slash/.test(s) && !(s in window.__alive)) window.__alive[s] = g.E[i].alive;   // a link that began after he fell is not held to him
      if (/^slash/.test(s)) { const h = window.__hits[s] || (window.__hits[s] = []); for (const e of g.P.struck) { const k = g.E.indexOf(e); if (!h.includes(k)) h.push(k); } }
      (window.__tr = window.__tr || []).push(`${s}@${g.P.t.toFixed(2)} x${g.P.x.toFixed(0)},${g.P.y.toFixed(0)} f${g.P.face} e${g.E[i].x.toFixed(0)},${g.E[i].y.toFixed(0)},${g.E[i].state} st${g.P.struck.size}`);
      requestAnimationFrame(tick); }; tick(); }, i);
    const at = await page.evaluate(i => { const { P, E } = window.__game; return { p: [P.x, P.y, P.face, P.state, P.z], e: [E[i].x, E[i].y, E[i].state, E[i].hp] }; }, i);
    await page.evaluate(() => { window.__log0 = window.__log.length; });
    await kb.press('j'); await reach(/^slash1/);
    at.go = await page.evaluate(i => { const { P, E } = window.__game; return [P.x, P.y, P.face, P.state, P.t, E[i].x, E[i].y, E[i].state, JSON.stringify(P.track && { x: P.track.x, y: P.track.y })]; }, i);
    await reach(FREE, 6000);
    const hits = await page.evaluate(() => { window.__hitOn = false; return window.__hits; }), alive = await page.evaluate(() => window.__alive);
    // (a skill link, I's double slash, may stand in for the middle one: it is cast in reach, but only the cuts are tracked)
    const all = await page.evaluate(() => window.__log.slice(window.__log0).filter(s => /^(slash|double)/.test(s))), links = [...new Set(all.filter(s => /^slash/.test(s)))];
    const miss = all.length < 3 ? `the chain played ${all.join(' > ')}, not three links` : links.filter(s => alive[s] && !(hits[s] || []).includes(i)).map(s => `${s} missed samurai ${i} (${JSON.stringify(hits)}; ${JSON.stringify(at)})`)[0];
    if (!miss) break; console.log((await page.evaluate(() => window.__tr.filter(r => /^slash/.test(r)).join('\n')))); if (k >= 2) fail(miss); console.log(`  (${miss}: again)`); } });
  await run('K: glitch teleport spends his one blink charge (power I), so a second press is refused', async () => {
    // out of every samurai's reach first (the top-left corner), so K is the plain teleport, not an assassination
    // walked to by position, not for a fixed time: on a slow machine the game runs slower and a timed walk falls short
    await walkTo(24, 60, 15000); await reach(FREE);
    await kb.press('k'); await reach(/^tele$/); await reach(FREE);
    await until('no charge left, the refill counting down', () => window.__game.P.blinks === 0 && window.__game.P.cd.tele > 55);
    await kb.press('k'); await until('the refused press', () => window.__game.P.cdDeny.tele > 0);
    if (await state() === 'tele') fail('K teleported again with no charge left'); });
  await run('tap I: glitch double slash', async () => { await kb.press('i'); await reach(/^double$/); await reach(FREE); });
  await run('hold I: Thousand Cuts', async () => {
    await until('the I cooldown to end', () => !(window.__game.P.cd.double > 0), undefined, 4000);
    await kb.down('i'); await until('the I charge', () => window.__game.P.charge > .5); await shot('03-charge');
    await sleep(300); await kb.up('i'); await cv('Thousand Cuts'); await reach(FREE); });
  await run('hold O: Crescent Moon', async () => {
    await until('O ready', () => !(window.__game.P.cd.moon > 0), null, 12000); await kb.down('o'); await reach(/^moonHold$/); await until('the O charge', () => window.__game.P.charge > .9);
    await kb.up('o'); await reach(/^moon$/); await sleep(120); await shot('04-moon'); await reach(FREE); });
  await run('P: Cross Rift', async () => { await kb.press('p'); await cv('Cross Rift'); await sleep(200); await shot('05-rift'); await reach(FREE); });
  await run('N: Mirror Meditation', async () => { await kb.press('n'); await reach(/^meditate$/); await sleep(500); await shot('06-mirrors'); await reach(FREE); });
  await run('U: Sky Drop, up and forward, then down blade first into the crater', async () => {
    // from open floor, facing into the room (the step before leaves him against the west wall)
    await walkTo(180, 100); await kb.press('d'); await reach(FREE); await until('U ready', () => !(window.__game.P.cd.sweep > 0), null, 10000);
    const x0 = await page.evaluate(() => window.__game.P.x); await kb.press('u'); await reach(/^sweep$/);
    await until('in the air', () => window.__game.P.z > 30, undefined, 1000);
    await until('landed in the crater', () => window.__game.P.t > .45 && window.__game.P.z === 0, undefined, 1500); await shot('07a-sky-drop');
    const d = await page.evaluate(x => Math.abs(window.__game.P.x - x), x0); if (!(d > 10)) fail(`Sky Drop landed where it started (${d.toFixed(1)} px)`);
    await reach(FREE, 8000); });
  await run('skill bar: the skills just used are cooling down, K still waits out its minute', async () => {
    const cd = await page.evaluate(() => ({ ...window.__game.P.cd, blinks: window.__game.P.blinks }));
    for (const k of ['moon', 'rift', 'mirror', 'sweep']) if (!(cd[k] > 0)) fail(`${k} is not cooling down (${JSON.stringify(cd)})`);
    if (!(cd.blinks === 0 && cd.tele > 0)) fail(`K's charge came back before a minute without blinking (${JSON.stringify(cd)})`);
    await shot('08-skill-bar'); });
  await run('flow: hit-stop by weight: a J cut freezes 3 frames, the Crescent Moon 5, Sky Drop 8', async () => {
    const stop = () => page.evaluate(() => window.__game.stops.at(-1));
    for (let k = 0; ; k++) {   // a samurai can step out of reach before the cut lands: stand beside one again, at most three times
      const i = await besides(16, 1); await page.evaluate(() => { window.__game.stops.length = 0; });
      const at = await page.evaluate(i => { const { P, E } = window.__game; return { p: [P.x, P.y, P.face, P.state], e: [E[i].x, E[i].y, E[i].state, E[i].hp] }; }, i);
      await kb.press('j'); if (await page.waitForFunction(() => window.__game.stops.length > 0, undefined, { timeout: 2000 }).then(() => true, () => false)) break;
      console.log(`  (the cut whiffed: ${JSON.stringify(at)}, after: ${JSON.stringify(await page.evaluate(i => { const { P, E } = window.__game; return [P.x, P.y, E[i].x, E[i].y, E[i].state]; }, i))})`);
      if (k >= 2) fail('three cuts beside a samurai never landed'); await reach(FREE, 6000); }
    let st = await stop(); if (st.w !== 'light' || st.f !== 3) fail(`a J cut paused ${JSON.stringify(st)}, not light 3`);
    await reach(FREE, 6000); await until('O ready', () => !(window.__game.P.cd.moon > 0), null, 12000);
    await besides(20, 1); await page.evaluate(() => { window.__game.stops.length = 0; });
    await kb.down('o'); await until('the O charge', () => window.__game.P.charge > .9); await kb.up('o');
    await until('a heavy hit pause', () => window.__game.stops.some(q => q.w === 'heavy'), undefined, 3000);
    st = await page.evaluate(() => window.__game.stops.find(q => q.w === 'heavy')); if (st.f !== 5) fail(`the Crescent Moon paused ${st.f} frames, not 5`);
    await reach(FREE, 6000); await until('U ready', () => !(window.__game.P.cd.sweep > 0), null, 10000);
    await page.evaluate(() => { window.__game.stops.length = 0; });
    await kb.press('u'); await until('the slam\'s hit pause', () => window.__game.stops.some(q => q.w === 'exec'), undefined, 3000);
    st = await page.evaluate(() => window.__game.stops.find(q => q.w === 'exec')); if (st.f !== 8) fail(`Sky Drop paused ${st.f} frames, not 8`);
    await reach(FREE, 8000); });
  await run('walk into coins: they fly to him and mon goes up', async () => {
    // the three coins, wherever he picked them up (a dash through them on the way counts too)
    await walkTo(388, 150); await until('the coins collected', () => window.__game.INV.mon >= 3); await shot('09-coins'); });
  await run('E at the shrine: brackets, pray, health full', async () => {
    await walkTo(78, 98); await sleep(250); await shot('10-lock-on'); await kb.press('e'); await reach(/^pray$/); await sleep(700); await shot('11-pray'); await reach(FREE);
    const v = await inv(); if (v.hp !== 1) fail(`health is ${v.hp} after praying`); });
  await run('E at the prayed shrine: offer 3 shards for an upgrade, power II', async () => {
    if ((await inv()).shards < 3) fail('not enough shards picked up on the way');
    await kb.press('e'); await reach(/^pray$/); await reach(FREE);
    const v = await inv(); if (v.upgrades !== 1 || v.power !== 2) fail(`upgrades ${v.upgrades}, power ${v.power}`); await shot('11b-power'); });
  await run('E at the grave: take the Grave Nodachi, then cut with it', async () => {
    await walkTo(203, 100); await kb.press('e'); await reach(/^take$/); await sleep(300); await shot('12-new-weapon'); await reach(FREE);
    if ((await inv()).weapon !== 'nodachi') fail('the weapon slot did not swap');
    await kb.press('j'); await reach(/^slash1$/); await reach(FREE); });
  await run('1: throw a static bomb from the quick slot', async () => {
    const n0 = (await inv()).quick[0].n; await kb.press('1'); await reach(/^bomb$/); await sleep(250); await shot('13-bomb'); await reach(FREE);
    if ((await inv()).quick[0].n !== n0 - 1) fail('the bomb count did not drop');
    if (!(await page.evaluate(() => window.__game.S.smoke > 0))) fail('the smoke is not up'); });
  await run('hold E by the fallen: Harvest turns them to EXP', async () => {
    // the fallen fade when the whole squad is down and a new one comes in: if nobody lies there now, cut one down first
    // (Harvest's own list: where each fell, with EXP left; a body can slide a little from there)
    for (let k = 0; k < 12 && !(await page.evaluate(() => window.__game.FALLEN.some(f => f.left > 0))); k++) { await besides(16, 1); await kb.press('j'); await reach(FREE, 8000); }
    const bodies = await page.evaluate(() => window.__game.FALLEN.filter(f => f.left > 0).map(f => [Math.round(f.x), Math.round(f.y)]));
    if (!bodies.length) fail('no fallen samurai to harvest');
    // (E beside a recruit or a downed companion is theirs: if one is beside this body, the next body)
    for (let k = 0; ; k++) { const body = bodies[k % bodies.length], side = k % 2 ? -1 : 1;
      await walkTo(Math.max(26, Math.min(454, body[0] + (body[0] > 240 ? -24 : 24) * side)), body[1], 10000, true).catch(() => {}); await kb.down('e');
      if (await page.waitForFunction(() => window.__game.P.state === 'harvest', undefined, { timeout: 2000 }).then(() => true, () => false)) break;
      await kb.up('e'); if (k >= 3) fail(`hold E never harvested (bodies ${JSON.stringify(bodies)}, he is at ${JSON.stringify(await page.evaluate(() => [window.__game.P.x, window.__game.P.y, window.__game.P.state]))})`); await reach(FREE, 4000); }
    await until('EXP', () => window.__game.INV.exp > 10 || window.__game.INV.lv > 1);
    await shot('14-harvest'); await kb.up('e'); await reach(FREE); });
  await run('power III (the test picker): the Crescent Moon comes with its twin and the slam with its pillars', async () => {
    await page.selectOption('#power', '3'); await until('power III', () => window.__game.INV.power === 3);
    // K holds three blink charges at III; a tier gained brings its charge at once, even mid-refill
    await until('three blink charges', () => window.__game.P.blinkCap === 3 && window.__game.P.blinks >= 2);
    await until('O ready', () => !(window.__game.P.cd.moon > 0), null, 12000);
    await kb.down('o'); await reach(/^moonHold$/); await until('the O charge', () => window.__game.P.charge > .9);
    await kb.up('o'); await reach(/^moon$/); await sleep(200); await shot('15-power-III-moon'); await reach(FREE);
    await until('U ready', () => !(window.__game.P.cd.sweep > 0), null, 10000);
    await kb.press('u'); await reach(/^sweep$/); await until('the slam', () => window.__game.P.t > .5); await shot('16-power-III-slam'); await reach(FREE, 8000);
    await page.selectOption('#power', '0'); });
  await run('C: sit, then a key to stand', async () => {
    await until('the storm over (C in the storm is Storm breath)', () => !(window.__game.P.storm > 0), null, 15000);
    await kb.press('c'); await reach(/^sitDown$/); await reach(/^sit$/); await shot('07-sit');
    await kb.down('w'); await reach(/^standUp$/); await kb.up('w'); await reach(/^(idle|run)$/); });
  await run('every weapon (the picker) slashes, stands in a stance and sheathes', async () => {
    for (const id of ['yari', 'nodachi', 'tanto', 'naginata', 'kanabo', 'kusarigama', 'tessen', 'bo', 'tetsubo', 'kama', 'jitte', 'daisho', 'nunchaku', 'wakizashi', 'katana']) {
      await page.selectOption('#weapon', id); await until(`weapon ${id}`, w => window.__game.P.weapon === w, id);
      await kb.press('j'); await reach(/^slash1$/); await sleep(200); await shot(`08-${id}-slash`);
      await reach(/^ready\d$/); await reach(/^idle$/, 5000); } });
  await run('wardrobe: dress him, run with the cloth, dress him back', async () => {
    const has = id => page.evaluate(i => window.__game.wear.outfit.has(i), id);
    if (!await has('mantle')) fail('he should start in the flat mantle');
    await page.locator('[data-outfit="Ghost"]').click();
    if (!await has('longscarf') || await has('mantle')) fail('the Ghost outfit did not go on');
    await page.locator('[data-item="coat"]').click();
    if (!await has('coat')) fail('the long coat did not go on');
    await kb.down('d'); await reach(/^run$/); await sleep(400); await kb.up('d'); await kb.down('a'); await sleep(300); await shot('08-wardrobe');
    await kb.up('a'); await reach(/^idle$/);
    await page.locator('[data-outfit="Default"]').click();
    if (!await has('mantle') || await has('coat')) fail('the default outfit did not come back'); });
  await run('basic skill 6: a chain runs to six links (Auto); six landed cuts earn Flow, and a skill on cooldown casts anyway', async () => {
    // at power I: power's damage would kill a samurai before six cuts can land on him
    await page.selectOption('#power', '1'); await until('power I', () => window.__game.INV.power === 1);
    await page.selectOption('#basic', '450'); await until('a six-cut combo', () => window.__game.INV.basic >= 450); await page.locator('#game').click();
    await page.evaluate(() => { window.__log = []; });
    // Flow wants six landed cuts each within 1.6 s of the last: a chain's links, then the next chain on whoever is nearest, from
    // whichever side he is on (the finisher's flash step leaves him past the last one), so no long walk breaks the count
    for (let i = 0; i < 60 && !await page.evaluate(() => window.__game.P.flow > 0); i++) {
      const e = await page.evaluate(() => { const P = window.__game.P, L = window.__game.E.filter(e => e.alive);
        L.sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y)); return L[0] && { x: L[0].x, y: L[0].y }; });
      if (!e) { await sleep(500); continue; }
      const side = await page.evaluate(q => Math.sign(window.__game.P.x - q.x) || -1, e);
      if (await page.evaluate(q => Math.abs(window.__game.P.y - q.y) > 4 || Math.abs(window.__game.P.x - q.x) > 40, e)) await walkTo(Math.round(e.x + side * 16), e.y, 10000, true).catch(() => {});   // a pillar in the way: the next round tries again
      const k = side < 0 ? 'd' : 'a'; await kb.down(k); await sleep(30); await kb.up(k); await reach(FREE);
      // one J: each landed cut opens the next link's prompt, which Auto plays, until the chain ends
      await kb.press('j'); await reach(/^slash/); await reach(FREE, 8000); }
    const log = await page.evaluate(() => window.__log);
    if (!log.includes('slash6')) fail(`the chain never reached slash 6 (${log.filter(s => s.startsWith('slash')).join(' > ')})`);
    if (!await page.evaluate(() => window.__game.P.flow > 0)) fail('six landed cuts did not earn Flow');
    await shot('15-flow');
    // a skill link in the chain may have cast I already: from a ready I, so the second press is the one through the cooldown
    await until('I ready', () => !(window.__game.P.cd.double > 0), undefined, 4000);
    await kb.press('i'); await reach(/^double$/); await reach(FREE);
    if (!(await page.evaluate(() => window.__game.P.cd.double > 0))) fail('I is not cooling down');
    await kb.press('i'); await reach(/^double$/);
    if (await page.evaluate(() => window.__game.P.flow > 0)) fail('casting through the cooldown did not spend Flow');
    await reach(FREE); });
  // ---- combo prompts (prototype 46, approved 2026-10-02 "C1A … C12A"; player/prompts.js), answered by hand ----
  const promptNow = () => page.evaluate(() => { const p = window.__game.CP.prompt; return p && { k: p.kind, f: p.face, age: p.age }; });
  const waitPrompt = (t = 1500) => page.waitForFunction(() => !!window.__game.CP.prompt, undefined, { timeout: t }).then(() => promptNow(), () => null);
  // the right answer on the keys: the direction (→ toward him) with J, J alone, K or I
  const answerKeys = async p => { const dir = { F: p.f > 0 ? 'd' : 'a', FIN: p.f > 0 ? 'd' : 'a', B: p.f > 0 ? 'a' : 'd', U: 'w', D: 's' }[p.k];
    if (p.k === 'K') await kb.press('k'); else if (p.k === 'S') await kb.press('i'); else if (dir) { await kb.down(dir); await kb.press('j'); await kb.up(dir); } else await kb.press('j'); };
  const answers = () => page.evaluate(() => window.__game.CP.answers);
  await run('combo prompt: a landed cut opens a prompt over the samurai; → + J (D + J) in its window plays the lunge cut, graded', async () => {
    await page.selectOption('#combo', 'prompts'); await page.selectOption('#basic', '450'); await until('a six-link chain', () => window.__game.INV.basic >= 450); await page.locator('#game').click();
    let done = false, shown = false;
    for (let k = 0; k < 14 && !done; k++) {
      const i = await besides(16, 3); await kb.press('j');
      let p = await waitPrompt();
      if (!p) { await reach(FREE, 6000); continue; }   // the cut whiffed: no prompt
      if (!shown) { shown = true; const o = await page.evaluate(i => { const { CP, E } = window.__game, p = CP.prompt; return p && { struck: p.e === E[i], hits: CP.chain.hits }; }, i);
        if (!o || !(o.hits > 0)) fail(`a prompt opened with no landed hit (${JSON.stringify(o)})`);
        await shot('20-combo-prompt'); }
      while (p && !done) {
        if (p.k === 'F') {   // the lunge: the direction toward him held, J pressed with it
          const n0 = await answers(), s0 = await state();
          await kb.down(p.f > 0 ? 'd' : 'a'); await kb.press('j'); await kb.up(p.f > 0 ? 'd' : 'a');
          await until('the answer graded', n => window.__game.CP.answers > n, n0, 1000);
          const a = await page.evaluate(() => window.__game.CP.log.at(-1));
          if (a.kind !== 'F' || !/^(PERFECT|GOOD|LATE)$/.test(a.grade) || !/J/.test(a.via)) fail(`→ + J was taken as ${JSON.stringify(a)}`);
          await until('the lunge cut', s0 => window.__game.P.state === 'slash1r' && s0 !== 'slash1r' || window.__game.CP.chain && window.__game.CP.chain.prev === 'F', s0, 1500);
          console.log(`  (→ + J graded ${a.grade}, ${Math.round(a.age * 1000)} ms after the prompt showed)`);
          done = true; break; }
        await answerKeys(p); p = await waitPrompt(); }
      await reach(FREE, 8000); }
    if (!done) fail('no → prompt came up in 14 chains'); });
  await run('combo prompt: a wrong answer ends the chain with a 0.45 s recovery, in which J does nothing', async () => {
    for (let k = 0; ; k++) {
      await besides(16, 2); await kb.press('j'); const p = await waitPrompt();
      if (!p) { if (k > 8) fail('no prompt in 9 tries'); await reach(FREE, 6000); continue; }
      const wrong = p.k === 'U' ? 's' : 'w'; await kb.down(wrong); await kb.press('j'); await kb.up(wrong);
      await until('the recovery', () => window.__game.CP.lock > 0 && !window.__game.CP.chain, undefined, 1000);
      const c = await page.evaluate(() => ({ why: window.__game.CP.last.why, lock: window.__game.CP.lock, B: window.__game.B.slash }));
      if (c.why === 'MISS' && k < 8) { console.log('  (the window closed before the wrong answer came: again)'); await reach(FREE, 6000); continue; }
      if (c.why !== 'WRONG' || c.B > 0) fail(`a wrong answer: ${JSON.stringify(c)}`);
      await page.evaluate(() => { window.__ev0 = window.__game.P.ev; window.__st0 = window.__game.P.state; });
      // J while the recovery has a good part of its 0.45 s left (a slow run can be past it by now: then this part is skipped)
      if (await page.evaluate(() => window.__game.CP.lock > .2)) { await kb.press('j'); const left = await page.evaluate(() => window.__game.CP.lock); await sleep(120);
        if (left > 0 && await page.evaluate(() => window.__game.P.ev !== window.__ev0 && /^slash/.test(window.__game.P.state))) fail('J started a cut in the recovery'); }
      else console.log('  (the recovery was nearly over before J could be pressed: not tried)');
      await shot('21-combo-recover');
      await until('the recovery over', () => !(window.__game.CP.lock > 0), undefined, 1000); await sleep(80);
      if (await page.evaluate(() => /^slash1/.test(window.__game.P.state) && window.__game.P.ev !== window.__ev0)) fail('the J pressed in the recovery fired after it');
      break; }
    await reach(FREE, 6000); });
  await run('combo prompt: a finisher landing next to a lone samurai offers K, and K executes him', async () => {
    await page.selectOption('#basic', '0'); await until('a two-link chain', () => window.__game.INV.basic < 40); await page.locator('#game').click();
    for (let k = 0; ; k++) {
      if (k > 10) fail('no K offered after a finisher in 11 chains');
      await besides(16, 3, true); await kb.press('j');
      let p = await waitPrompt(); if (!p) { await reach(FREE, 6000); continue; }
      if (p.k !== 'FIN') fail(`a two-link chain asked for ${p.k}, not the finisher`);
      await answerKeys(p); p = await waitPrompt(1500);
      if (!p || p.k !== 'K') { console.log(`  (no K offered: ${JSON.stringify(await page.evaluate(() => ({ p: window.__game.CP.prompt && window.__game.CP.prompt.kind, last: window.__game.CP.last, log: window.__game.CP.log.at(-1), pick: !!window.__game.K.pick, alone: window.__game.K.alone.size })))})`); await reach(FREE, 6000); continue; }
      await sleep(60); await shot('22-combo-k'); await kb.press('k'); await reach(/^exec$/, 3000);
      // (on a slow run the offer can run out just before K lands: K on the lone samurai is then the plain execution, as wanted)
      const a = await page.evaluate(() => window.__game.CP.log.at(-1)); if (a.kind !== 'K') console.log(`  (K came after the offer closed: ${JSON.stringify(a)})`);
      break; }
    await reach(/^(idle|ready\d)$/, 8000); await reach(FREE, 6000); });
  // ---- swipe moves (approved: C7A two thumbs, C8A double tap K, C9A hold charge; player/touch.js), real touches through CDP ----
  const cdp = await page.context().newCDPSession(page);
  const tp = async (pts) => { const b = await page.locator('#game').boundingBox(); return pts.map(([x, y], id) => ({ x: b.x + x * b.width, y: b.y + y * b.height, id })); };
  const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.length ? await tp(pts) : [] });
  const tap = async (x = .8, y = .72) => { await touch('touchStart', [[x, y]]); await touch('touchEnd', []); };
  const swipe = async (dx, dy, x = .75, y = .6, end = true) => { await touch('touchStart', [[x, y]]);
    for (let i = 1; i <= 3; i++) await touch('touchMove', [[x + dx * i / 3, y + dy * i / 3]]); if (end) await touch('touchEnd', []); };
  // long strokes in few events: each CDP touch takes a few tens of ms, and a swipe has to be quick (gestures.js G.SWIPE_SPEED)
  const SW = { R: [.2, 0], L: [-.2, 0], U: [0, -.3], D: [0, .3] };
  // the same stroke as finger pointer events sent in one go (a slow run's CDP touches can outlast a prompt's 0.53 s window)
  const quickSwipe = (dx, dy, x = .75, y = .5) => page.evaluate(([dx, dy, x, y]) => { const el = document.getElementById('game'), r = el.getBoundingClientRect();
    const ev = (type, k) => el.dispatchEvent(new PointerEvent(type, { pointerId: 21, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true,
      clientX: r.left + r.width * (x + dx * k), clientY: r.top + r.height * (y + dy * k) }));
    ev('pointerdown', 0); for (const k of [.25, .5, .75, 1]) ev('pointermove', k); ev('pointerup', 1); }, [dx, dy, x, y]);
  await run('touch: a tap slashes, a swipe dashes (the slide) that way, leaving a pixel trail', async () => {
    await walkTo(150, 100); await page.selectOption('#combo', 'auto'); await page.locator('#game').click(); await reach(FREE);
    await tap(); await reach(/^slash1r?$/, 2000); await reach(FREE, 6000);
    await until('the slide ready', () => !(window.__game.P.cd.slide > 0));
    // a way with no samurai within the lunge's 96 px and 40° (a swipe at one is a lunge cut)
    const d = await page.evaluate(() => { const { P, E } = window.__game, V = { L: [-1, 0], R: [1, 0], D: [0, 1] };
      return Object.keys(V).find(k => !E.some(e => e.alive && Math.hypot(e.x - P.x, e.y - P.y) < 130 && ((e.x - P.x) * V[k][0] + (e.y - P.y) * V[k][1]) / Math.hypot(e.x - P.x, e.y - P.y) > .6)); });
    if (!d) fail('no open way to swipe');
    await swipe(...SW[d], .75, .6, false); await touch('touchEnd', []); await shot('23-swipe-trail');
    await reach(/^slide$/, 1500);
    const dir = await page.evaluate(() => window.__game.P.slideDir);
    if (Math.sign(Math.round(dir[0])) !== Math.sign(SW[d][0]) || Math.sign(Math.round(dir[1])) !== Math.sign(SW[d][1])) fail(`a swipe ${d} slid ${JSON.stringify(dir)}`);
    await reach(FREE, 4000); });
  await run('touch: a double tap is K, read on the second touch (here the blink, nobody alone in reach)', async () => {
    await walkTo(24, 60, 15000); await page.locator('#clear').check(); await page.locator('#game').focus();   // room clear: the blink is free
    await reach(FREE); if (await page.evaluate(() => !!window.__game.K.pick)) fail('a lone samurai is in reach of the corner');
    await page.evaluate(() => { window.__log0 = window.__log.length; });
    // the two taps as finger pointer events sent in one go: through CDP, four touches can take longer than the double tap's 230 ms
    await page.evaluate(() => { const el = document.getElementById('game'), r = el.getBoundingClientRect(), x = r.left + r.width * .8, y = r.top + r.height * .72;
      const ev = (type, id) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: true }));
      ev('pointerdown', 11); ev('pointerup', 11); setTimeout(() => { ev('pointerdown', 12); ev('pointerup', 12); }, 60); });
    await reach(/^tele$/, 1500); await reach(FREE, 4000);
    const lg = await page.evaluate(() => window.__log.slice(window.__log0));
    if (lg.filter(s => s === 'tele').length !== 1) fail(`a double tap played ${lg.join(' > ')}`);
    await page.locator('#clear').uncheck(); await page.locator('#game').focus(); });
  await run('touch: a swipe answers a combo prompt (toward him for →, up for ↑ ...)', async () => {
    await page.selectOption('#combo', 'prompts'); await page.selectOption('#basic', '450'); await page.locator('#game').click();
    let done = false;
    for (let k = 0; k < 12 && !done; k++) {
      await besides(16, 2); await tap(); let p = await waitPrompt();
      while (p && !done) {
        const sd = { F: p.f > 0 ? 'R' : 'L', B: p.f > 0 ? 'L' : 'R', U: 'U', D: 'D' }[p.k];
        if (sd) { const n0 = await answers(); await quickSwipe(...SW[sd]); await shot('24-swipe-prompt');
          // a slow machine can let the window close before the stroke ends: then try another chain
          if (!await page.waitForFunction(n => window.__game.CP.answers > n, n0, { timeout: 1000 }).then(() => true, () => false)) break;
          const a = await page.evaluate(() => window.__game.CP.log.at(-1));
          if (a.grade === 'WRONG' && a.kinds.length === 0) break;
          if (a.kind !== p.k || a.grade === 'WRONG' || !/^swipe/.test(a.via)) fail(`a swipe ${sd} on a ${p.k} prompt was taken as ${JSON.stringify(a)}`);
          done = true; break; }
        if (p.k === 'T') await tap(); else if (p.k === 'K') await kb.press('k'); else break;   // a skill link: let it pass
        p = await waitPrompt(); }
      await reach(FREE, 8000); }
    if (!done) fail('no direction prompt came up to swipe at');
    await page.selectOption('#combo', 'auto'); await page.locator('#game').click(); await reach(FREE, 6000); });
  // ---- click to move on PC (owner 2026-10-02; player/click.js) ----
  const clickWorld = async (x, y) => { const b = await page.locator('#game').boundingBox(), c = await page.evaluate(() => [window.__game.CAM.ox, window.__game.CAM.oy]);
    await page.mouse.click(b.x + (x - c[0]) / 480 * b.width, b.y + (y - c[1]) / 270 * b.height); };
  await run('click: a click on the floor runs him there, round the pillar in the way', async () => {
    await walkTo(98, 110); await walkTo(98, 138); await reach(/^idle$/, 6000);   // from above: the pillar's own row is in the way
    await page.evaluate(() => { window.__log0 = window.__log.length; });
    await clickWorld(168, 138); await sleep(120); await shot('25-click-marker');
    await until('there', () => !window.__game.CLICK.goal, undefined, 6000);
    const at = await page.evaluate(() => [window.__game.P.x, window.__game.P.y]);
    if (Math.hypot(at[0] - 168, at[1] - 138) > 5) fail(`the click took him to ${at.map(v => v.toFixed(1))}, not 168,138`);
    if (!(await page.evaluate(() => window.__log.slice(window.__log0).includes('run')))) fail('he did not run there');
    await reach(/^idle$/, 3000); });
  await run('click: WASD drops the click goal at once', async () => {
    await clickWorld(400, 240); await until('on his way', () => window.__game.P.state === 'run', undefined, 2000); await sleep(150);
    await kb.down('w'); await sleep(50); await kb.up('w');
    await until('the goal dropped', () => !window.__game.CLICK.goal, undefined, 1000); await reach(/^idle$/, 3000);
    const d = await page.evaluate(() => Math.hypot(window.__game.P.x - 400, window.__game.P.y - 240));
    if (!(d > 40)) fail(`he still reached the click goal (${d.toFixed(1)} px from it)`); });
  await run('click: a click on a samurai runs him into reach and cuts him', async () => {
    await reach(FREE); const e = await fitSamurai(1); if (!e) fail('no samurai standing');
    const hp0 = await page.evaluate(i => window.__game.E[i].hp, e.i);
    await page.evaluate(() => { window.__log0 = window.__log.length; });
    await clickWorld(e.x, e.y - 14);
    await until('the cut', () => window.__log.slice(window.__log0).some(s => /^slash1/.test(s)), undefined, 8000);
    await until('the cut landed', ([i, h]) => window.__game.E[i].hp < h || !window.__game.E[i].alive, [e.i, hp0], 2000);
    await reach(FREE, 8000); });
  await run('] and [: switch elements; slime slides and charges the moon, then back to storm', async () => {
    const el = () => page.evaluate(() => document.querySelector('#elements [aria-pressed=true]')?.dataset.el);
    await kb.press(']'); if (await el() !== 'fire') fail(`] picked ${await el()}, not fire`);
    await kb.press(']'); if (await el() !== 'slime') fail(`] picked ${await el()}, not slime`);
    await kb.press('Shift'); await reach(/^slide$/); await reach(FREE);
    await until('the O cooldown to end', () => !(window.__game.P.cd.moon > 0), undefined, 12000);
    await kb.down('o'); await reach(/^moonHold$/); await until('the O charge', () => window.__game.P.charge > .7); await shot('09-slime-charge');
    await kb.up('o'); await reach(/^moon$/); await reach(FREE);
    await kb.press('['); await kb.press('['); if (await el() !== 'storm') fail(`[ [ left ${await el()}, not storm`); });
  await run('H with nobody in the party: he takes the cut, a red number pops and his health bar chips', async () => {
    if ((await party()).allies.length) fail('the party is not at camp');
    const hp = (await inv()).hp; await kb.press('h');
    await until('a red number', () => window.__game.N.some(q => q.kind === 'take')); await shot('15-hurt-number');
    const h2 = (await inv()).hp; if (!(h2 < hp)) fail(`H left his health at ${h2} (was ${hp})`); });
  // ---- Breath of Qi on C: Qi earned by cutting the nearest samurai, as a player would ----
  const qiUp = async (goal, storm = false) => {
    for (let i = 0; i < 60; i++) {
      if (await page.evaluate(([g, st]) => st ? window.__game.P.storm > 0 : window.__game.P.qi >= g && !(window.__game.P.storm > 0), [goal, storm])) return;
      const e = await page.evaluate(() => { const P = window.__game.P, L = window.__game.E.filter(e => e.alive);
        L.sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y)); return L[0] && { x: L[0].x, y: L[0].y }; });
      if (!e) { await sleep(500); continue; }
      if (await page.evaluate(q => Math.abs(window.__game.P.y - q.y) > 4 || Math.abs(window.__game.P.x - q.x) > 30, e)) await walkTo(e.x - 16, e.y);
      await kb.press('d'); await reach(FREE); await kb.press('j'); await reach(/^slash/); await reach(FREE, 4000);
      // a full meter wakes the storm: when it is not wanted, wait it out and cut on
      if (!storm && await page.evaluate(() => window.__game.P.storm > 0)) await until('the storm over', () => !(window.__game.P.storm > 0), null, 15000); }
    fail(storm ? 'never woke the storm by cutting' : `never earned ${goal} Qi by cutting`); };
  await run('hold C with less than a notch of Qi: the breath fizzles and he does not sit or breathe', async () => {
    await until('the storm over', () => !(window.__game.P.storm > 0), null, 15000);
    await until('Qi ebbed under a notch', () => window.__game.P.qi < 1 / 3, null, 20000);
    await kb.down('c'); await sleep(700);
    if (/^(kata|seiza|lotus)$/.test(await state())) fail('a breath started with less than a notch of Qi');
    await kb.up('c'); await reach(FREE, 5000); });
  await run('hold C: the Standing kata spends a notch of Qi and heals', async () => {
    await qiUp(.4); await reach(FREE);
    const h = await page.evaluate(() => ({ q: window.__game.P.qi, hp: window.__game.INV.hp }));
    if (!(h.hp < 1)) { await kb.press('h'); await until('a cut', hp => window.__game.INV.hp < hp, h.hp); }
    const hp0 = (await inv()).hp;
    await kb.down('c'); await reach(/^kata$/);
    await until('an out-breath', q => window.__game.P.qi < q - .2, h.q, 6000); await shot('07b-kata'); await kb.up('c');
    await reach(FREE, 6000); const hp1 = (await inv()).hp;
    if (!(hp1 > hp0)) fail(`the kata did not heal (${hp0} → ${hp1})`); });
  await run('hold C and down: Seiza raises the shield and spends Qi', async () => {
    await qiUp(.4); await reach(FREE); const q0 = await page.evaluate(() => window.__game.P.qi);
    await kb.down('s'); await kb.down('c'); await reach(/^seiza$/);
    await until('the shield up', () => window.__game.P.shield === true, null, 3000); await shot('07c-seiza');
    await until('an out-breath', q => window.__game.P.qi < q - .2, q0, 6000); await kb.up('c'); await kb.up('s');
    await reach(FREE, 6000); if (await page.evaluate(() => window.__game.P.shield)) fail('the shield stayed up after Seiza'); });
  await run('hold C at the shrine: Lotus pours the meter into health', async () => {
    // .6: the walk to the shrine can take long enough for the meter to ebb under a notch
    await qiUp(.6); await walkTo(78, 98); const q0 = await page.evaluate(() => window.__game.P.qi);
    await kb.down('c');
    if (!await page.waitForFunction(() => window.__game.P.state === 'lotus', undefined, { timeout: 6000 }).then(() => true, () => false))
      fail(`no lotus: ${JSON.stringify(await page.evaluate(() => { const { P, CP } = window.__game; return { s: P.state, x: P.x, y: P.y, qi: P.qi, storm: P.storm, chain: !!CP.chain, prompt: !!CP.prompt, lock: CP.lock }; }))}`);
    await sleep(400); await shot('07d-lotus');
    await until('the meter draining', q => window.__game.P.qi < q - .1, q0, 6000); await kb.up('c'); await reach(FREE, 8000); });
  await run('C in the storm: Storm breath spends the storm at once, heals and throws the samurai', async () => {
    await qiUp(1, true); const hp0 = (await inv()).hp;
    await kb.press('c'); await reach(/^sbreath$/); await sleep(300); await shot('07e-storm-breath');
    await until('the storm spent', () => !(window.__game.P.storm > 0) && window.__game.P.qi === 0, null, 6000); await reach(FREE, 8000);
    const hp1 = (await inv()).hp; if (!(hp1 >= hp0)) fail(`Storm breath lowered his health (${hp0} → ${hp1})`); });
  // ---- growth (owner picks 2026-10-01, "Ronin Growth Ideas": 1B trees, 2B wild until mastered, 3A stats on gear) ----
  // cut the nearest samurai, as a player would, until fn (read-only) is true
  const cutUntil = async (what, fn, arg, tries = 140) => {
    for (let i = 0; i < tries; i++) {
      if (await page.evaluate(fn, arg)) return;
      const e = await page.evaluate(() => { const P = window.__game.P, L = window.__game.E.filter(e => e.alive);
        L.sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y)); return L[0] && { x: L[0].x, y: L[0].y }; });
      if (!e) { await sleep(500); continue; }
      if (await page.evaluate(q => Math.abs(window.__game.P.y - q.y) > 4 || Math.abs(window.__game.P.x - q.x) > 30, e)) await walkTo(e.x - 16, e.y, 10000, true).catch(() => {});
      await kb.press('d'); await reach(FREE, 8000); await kb.press('j');
      await page.waitForFunction(() => /^slash/.test(window.__game.P.state), undefined, { timeout: 3000 }).catch(() => {}); await reach(FREE, 8000); }   // a wild cast may take the turn
    fail(`never got ${what} by cutting`); };
  const wilds = () => page.evaluate(() => Object.fromEntries(Object.entries(window.__game.INV.sk).map(([k, v]) => [k, v.wild])));
  await run('stats on gear: the mantle and hat add VIG and FOC; the Retainer outfit adds more, and it takes less', async () => {
    const s0 = await page.evaluate(() => ({ v: window.__game.stat('vigor'), f: window.__game.stat('focus'), t: window.__game.ST.taken }));
    if (s0.v !== 2 || s0.f < 2) fail(`the default outfit gives VIG ${s0.v} FOC ${s0.f}: the mantle adds VIG +1 and the hat FOC +1`);   // a relic picked up on the way may add FOC
    await page.locator('[data-outfit="Retainer"]').click();
    const s1 = await page.evaluate(() => ({ v: window.__game.stat('vigor'), t: window.__game.ST.taken }));
    if (!(s1.v === 4 && s1.t < s0.t)) fail(`the Retainer outfit: VIG ${s1.v}, takes x${s1.t} (was x${s0.t})`);
    await page.locator('[data-outfit="Default"]').click(); await page.locator('#game').click(); });
  await run('as played: a full meter casts a skill he has not mastered by itself, says a line, and its key stays locked', async () => {
    await page.selectOption('#skills', 'played'); await page.locator('#game').click();
    // every line he says, as it appears (one lasts about 2 s, shorter than a step can take to look)
    await page.evaluate(() => { window.__lines = []; const tick = () => { const l = window.__game.P.line;
      if (l && window.__lines[window.__lines.length - 1] !== l) window.__lines.push(l); requestAnimationFrame(tick); }; tick(); });
    await until('the storm over', () => !(window.__game.P.storm > 0), null, 15000);
    const w0 = await wilds();
    await cutUntil('a wild cast', w => Object.entries(window.__game.INV.sk).some(([k, v]) => v.wild > w[k]), w0);
    const w1 = await wilds(), k = Object.keys(w1).find(q => w1[q] > w0[q]);
    await until('the line over his head', () => window.__lines.length > 0, undefined, 3000);
    if (await page.waitForFunction(() => window.__game.P.line && window.__game.P.line.t > .25, undefined, { timeout: 1500 }).then(() => true, () => false)) await shot('17-wild-cast');
    const line = await page.evaluate(() => window.__lines.at(-1).s);
    if (!["What's happening to me?", 'That again.', 'I think I can hold it.'].includes(line)) fail(`the line was "${line}"`);
    if (w1[k] < 3 && await page.evaluate(q => window.__game.known(q), k)) fail(`${k} unlocked after ${w1[k]} wild cast(s)`);
    if (w1[k] < 3) { await reach(FREE, 8000);
      const key = { double: 'i', moon: 'o', rift: 'p', mirror: 'n', sweep: 'u', breath: 'c' }[k];
      if (key === 'c') { await kb.down('c'); await sleep(400); await kb.up('c'); await sleep(200); if (/^(kata|seiza|lotus)$/.test(await state())) fail('a locked Breath of Qi started'); await reach(FREE, 5000); }
      else { await kb.press(key);
        // refused, or (the bug) the move started: he may already stand in a stance, so "not idle" proves nothing
        const MOVE = { double: /^double/, moon: /^moon/, rift: /^double/, mirror: /^meditate/, sweep: /^sweep/ }[k];
        await until('the refused press', ([q, m]) => window.__game.P.cdDeny[q] > 0 || new RegExp(m).test(window.__game.P.state), [k, MOVE.source], 1000);
        if (await page.evaluate(q => !(window.__game.P.cdDeny[q] > 0), k)) fail(`${key.toUpperCase()} was not refused while ${k} is locked (state ${await state()})`); } }
    console.log(`  (the wild cast was ${k}: "${line}")`); });
  await run('three wild casts of one skill (the picker forces Crescent Moon) unlock its key: O works', async () => {
    await page.selectOption('#skills', 'wild:moon'); await page.locator('#game').click();
    await cutUntil('three wild moons', () => window.__game.INV.sk.moon.wild >= 3);
    await until('the third line', () => window.__lines.some(l => l.s === 'I think I can hold it.'), undefined, 3000);
    if (await page.waitForFunction(() => window.__game.P.line && window.__game.P.line.t > .25, undefined, { timeout: 1500 }).then(() => true, () => false)) await shot('18-wild-third');
    if (!(await page.evaluate(() => window.__game.known('moon')))) fail('three wild moons did not unlock O');
    await reach(FREE, 8000); await until('O ready', () => !(window.__game.P.cd.moon > 0), null, 12000);
    await kb.down('o'); await reach(/^moonHold$/); await kb.up('o'); await reach(/^moon$/); await reach(FREE, 8000); });
  await run('a landed cast earns a point in its tree; at II a fork picked on the kit screen (THOUSAND MORE) adds two cuts', async () => {
    await page.selectOption('#skills', 'mastered'); await page.locator('#game').click();
    const p0 = await page.evaluate(() => window.__game.INV.sk.double.pts);
    for (let i = 0; i < 12 && await page.evaluate(p => window.__game.INV.sk.double.pts <= p, p0); i++) {
      const e = await page.evaluate(() => { const P = window.__game.P, L = window.__game.E.filter(e => e.alive);
        L.sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y)); return L[0] && { x: L[0].x, y: L[0].y }; });
      if (!e) { await sleep(500); continue; }
      // I blinks 44 px before it cuts: start that far short of him, so the cut lands on him, not past him
      await walkTo(Math.max(26, e.x - 54), e.y, 10000, true).catch(() => {}); await kb.press('d'); await reach(FREE, 8000);
      await until('I ready', () => !(window.__game.P.cd.double > 0), null, 4000); await kb.press('i'); await reach(FREE, 6000); }
    if (await page.evaluate(p => window.__game.INV.sk.double.pts <= p, p0)) fail('no tree point from landed double slashes');
    await page.selectOption('#skills', 'trees'); await page.selectOption('#power', '2'); await until('power II', () => window.__game.INV.power === 2);
    if (await page.evaluate(() => window.__game.tv('double', 'cuts')) !== 0) fail('THOUSAND MORE works before it is picked');
    await page.locator('#game').click(); await kb.press('Tab'); await until('the kit screen', () => window.__game.KIT.open);
    for (let i = 0; i < 12 && await page.evaluate(() => window.__game.KIT.row !== 9); i++) await kb.press('s');
    await kb.press('j'); await shot('19-kit-tree'); await kb.press('j');
    if (await page.evaluate(() => window.__game.INV.sk.double.pick) !== 'a') fail('the fork pick did not take');
    await shot('19a-kit-picked');
    for (let i = 0; i < 12 && await page.evaluate(() => window.__game.KIT.row !== 0); i++) await kb.press('s');   // back to the top row for the steps after
    await kb.press('Tab'); await until('the kit screen shut', () => !window.__game.KIT.open);
    const n = await page.evaluate(() => window.__game.tv('double', 'cuts')); if (n !== 2) fail(`THOUSAND MORE adds ${n} cuts, not 2`);
    await until('I ready', () => !(window.__game.P.cd.double > 0), null, 4000);
    await kb.down('i'); await until('the I charge', () => window.__game.P.charge > .5); await kb.up('i'); await cv('Thousand Cuts');
    await until('the vanish', () => window.__game.P.ct > .05, undefined, 2000);   // the cuts are counted as he vanishes
    const cuts = await page.evaluate(() => window.__game.P.tcN); if (cuts !== 11) fail(`Thousand Cuts at II with THOUSAND MORE cut ${cuts} times, not 9 + 2`);
    await reach(FREE, 6000);
    await page.selectOption('#skills', 'mastered'); await page.selectOption('#power', '1'); await page.locator('#game').click(); });
  // ---- the party (prototypes/34-companions.html) ----
  await run('Tab: bring the three back, dress one and hand Kuro the katana from the bag', async () => {
    await kb.press('Tab'); await until('the kit screen', () => window.__game.KIT.open);
    for (let i = 0; i < 3; i++) { await kb.press('e'); await kb.press(' '); }
    await kb.press('q'); await kb.press('q');   // back to Kuro
    await kb.press('j'); await kb.press('s'); await kb.press('j');   // weapon: the first thing in the bag
    const w = await page.evaluate(() => window.__game.ROSTER.find(c => c.id === 'kuro').kit.weapon);
    if (w !== 'katana') fail(`Kuro holds the ${w}, not the katana from the bag`);
    await kb.press('s'); await kb.press('s'); await kb.press('j'); await kb.press('s'); await kb.press('j');   // shoulders: the first on offer
    await shot('10-kit-kuro'); await kb.press('Tab');
    const p = await party(); if (p.allies.length !== 3) fail(`${p.allies.length} companions in the room, not 3`); });
  await run('the companions fight: someone in the party earns EXP from the samurai', async () => {
    await walkTo(300, 180);
    if (!await page.waitForFunction(() => window.__game.allies.some(a => a.c.exp > 0 || a.c.lv > 1), undefined, { timeout: 20000 }).then(() => true, () => false))
      fail(`no companion EXP: ${JSON.stringify(await page.evaluate(() => { const { P, E, allies, party } = window.__game; return { P: [P.x, P.y, P.state], order: party.order,
        A: allies.map(a => [a.c.id, a.state, Math.round(a.x), Math.round(a.y)]), E: E.map(e => [Math.round(e.x), Math.round(e.y), e.hp, e.state, e.held]) }; }))}`);
    await shot('11-party-fights'); });
  await run('G: hold here, then with me', async () => {
    await kb.press('g'); await until('the hold order', () => window.__game.party.order === 'hold');
    await kb.press('g'); await until('the follow order', () => window.__game.party.order === 'follow'); });
  await run('K beside a companion set up for it: a paired execution', async () => {
    const t0 = Date.now();
    while (!(await page.evaluate(() => window.__game.PAIRS.done))) {
      if (Date.now() - t0 > 25000) fail('no paired execution');
      if (await page.evaluate(() => window.__game.pairReady())) { await kb.press('k'); await sleep(300); await shot('12-paired'); await sleep(1400); continue; }
      const e = await page.evaluate(() => { const { P, E } = window.__game, l = E.filter(e => e.alive).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; return l && [l.x, l.y]; });
      if (e) await walkTo(Math.max(30, e[0] - 24), e[1], 4000, true).catch(() => {}); else await sleep(300); }
    await reach(FREE); });
  await run('the paired K waits 5 s for the whole party, then any of them plays (the test picker forces Batter Up)', async () => {
    if (!(await page.evaluate(() => window.__game.PAIRS.cd > 3 && !window.__game.pairReady()))) fail('a paired execution is ready again at once');
    await until('the 5 s to pass', () => !(window.__game.PAIRS.cd > 0), undefined, 8000);
    await page.selectOption('#pair', 'batter'); await page.locator('#game').click();
    const n = await page.evaluate(() => window.__game.PAIRS.done), t0 = Date.now();
    while ((await page.evaluate(() => window.__game.PAIRS.done)) === n) {
      if (Date.now() - t0 > 25000) fail('no second paired execution');
      if (await page.evaluate(() => window.__game.pairReady())) { await kb.press('k'); await sleep(500); await shot('12b-paired-batter'); await sleep(1500); continue; }
      const e = await page.evaluate(() => { const { P, E } = window.__game, l = E.filter(e => e.alive).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; return l && [l.x, l.y]; });
      if (e) await walkTo(Math.max(30, e[0] - 24), e[1], 4000, true).catch(() => {}); else await sleep(300); }
    const last = await page.evaluate(() => window.__game.PAIRS.ran.at(-1)); if (last !== 'batter') fail(`the picker asked for Batter Up, ${last} played`);
    await page.selectOption('#pair', ''); await page.locator('#game').click(); await reach(FREE); });
  await run('H: a companion is cut down, then held E lifts them', async () => {
    for (let i = 0; i < 6 && !(await party()).allies.some(a => a.state === 'down'); i++) { await kb.press('h'); await sleep(120); }
    await until('someone down', () => window.__game.allies.some(a => a.state === 'down'));
    const d = (await party()).allies.find(a => a.state === 'down'); await walkTo(Math.round(d.x), Math.round(d.y));
    await shot('13-down'); await kb.down('e'); await sleep(900); await kb.up('e');
    await until('them standing again', id => window.__game.allies.find(a => a.c.id === id).state !== 'down', d.id); });
  await run('E at the road: the wanderer joins', async () => {
    // the party can lose a companion in the fight meanwhile (buried: gone from the roster), so a count of members proves
    // nothing: the wanderer is a new roster entry from the road
    const had = await page.evaluate(() => window.__game.ROSTER.map(c => c.id)); await walkTo(44, 210); await kb.press('e');
    await until('the wanderer in the party', ids => window.__game.ROSTER.some(c => c.from === 'road' && !ids.includes(c.id) && window.__game.party.members.includes(c.id)), had);
    await shot('14-recruited'); });
  // owner: the black slash (Cross Rift's tear) is in every offensive skill. Each key, once ready, must open one
  await run('the black slash: J, I, hold I, O, P, U and N each open one', async () => {
    for (const [k, cd, hold] of [['j'], ['i', 'double'], ['i', 'double', 900], ['o', 'moon', 400], ['p', 'rift'], ['u', 'sweep'], ['n', 'mirror']]) {
      await reach(FREE, 8000); if (cd) await until(`${k} to be ready`, c => !(window.__game.P.cd[c] > 0), cd, 16000);
      await until('the old slashes to close', () => !window.__game.V.length, undefined, 4000);
      // a tap can land on a frame that is not free yet (a turn, the end of a glitch): press again, at most twice, before calling it lost
      for (let tries = 0; ; tries++) {
        if (hold) { await kb.down(k); await sleep(hold); await kb.up(k); } else await kb.press(k);
        // the key took if he left the free states (U's slam opens its slash only after a 1.8 s wind-up)
        const took = await page.waitForFunction(f => window.__game.V.length > 0 || !new RegExp(f).test(window.__game.P.state), FREE.source, { timeout: 600 }).then(() => true, () => false);
        if (took) { await until(`a black slash from ${k}${hold ? ' (held)' : ''}`, () => window.__game.V.length > 0, undefined, 4000); break; }
        if (tries >= 2) fail(`${k}${hold ? ' (held)' : ''} was never taken (state now: ${await state()})`);
        await reach(FREE, 8000); } }
    await reach(FREE, 8000); });
  await run('X: die and come back', async () => { await kb.press('x'); await reach(/^death$/); await reach(/^idleGlitch$/, 5000); });
  step = '';

  const log = await page.evaluate(() => window.__log);
  fs.writeFileSync(`${OUT}/states.txt`, log.join('\n') + '\n');
  if (errors.length) fail(`page errors:\n  ${errors.join('\n  ')}`);
  console.log(`\ncheck passed: ${log.length} state changes, no page errors. Screenshots and the state log are in ${OUT}/.`);
} catch (e) {
  if (!process.exitCode) { console.error(e); process.exitCode = 1; }
  if (errors.length) console.error(`page errors:\n  ${errors.join('\n  ')}`);
  await page.screenshot({ path: `${OUT}/failure.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await new Promise(r => server.httpServer.close(r));
}
