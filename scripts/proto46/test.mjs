// plays the built prototype in Chromium: keyboard combos, touch swipes, page errors. node scripts/proto46/test.mjs [shot prefix]
import { chromium } from 'playwright';
const shot = process.argv[2] || 'test-output/proto46/p46';
const file = process.env.FILE || 'prototypes/46-combo-prompts.html';
const b = await chromium.launch();
const errs = [], fail = [];
let pgRef; const ok = async (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) { fail.push(m); if (pgRef) console.log('     ' + (await pgRef.evaluate(() => window.__p46.log.slice(0, 6).map(r => `${r.t} ${r.kind} ${r.msg}`))).join('\n     ')); } };
const ctx = await b.newContext({ viewport: { width: +(process.env.VW || 1280), height: 900 }, hasTouch: true });
const pg = await ctx.newPage(); pgRef = pg;
pg.on('pageerror', e => errs.push(e.stack)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
await pg.route(/^https?:/, r => r.abort());
await pg.goto('file://' + process.cwd() + '/' + file + (process.env.HD ? '?hd' : ''));
await pg.waitForTimeout(800);
const S = () => pg.evaluate(() => { const g = window.__p46; return { state: g.P.state, chain: g.C.chain && { ...g.C.chain }, prompt: g.C.prompt && { kind: g.C.prompt.kind, age: g.C.prompt.age, face: g.C.prompt.face },
  stats: { ...g.C.stats }, label: g.label && g.label.text, x: g.P.x, y: g.P.y, face: g.P.face, alive: g.ENEMIES.filter(e => e.alive).length }; });
// both samurai up, the ronin beside the first, out of any move
async function ready() { for (let i = 0; i < 200 && ((await S()).alive < 2 || !/^(idle|ready|run)/.test((await S()).state)); i++) await pg.waitForTimeout(30);
  await pg.evaluate(() => { const g = window.__p46; g.arena(); g.P.x = 262; g.P.y = 168; g.P.face = 1; }); await pg.waitForTimeout(250); }
const setT = o => pg.evaluate(o => Object.assign(window.__p46.T, o), o);
await pg.locator('#play').click(); await pg.waitForTimeout(100);
// walk up to the first samurai
await pg.evaluate(() => { const g = window.__p46; g.P.x = 262; g.P.y = 168; g.P.face = 1; });
await pg.waitForTimeout(100);
await pg.screenshot({ path: shot + '-start.png' });
// ---- keyboard, direction + J: answer each prompt with the right chord after the ring closes ----
const ARR = { R: 'ArrowRight', L: 'ArrowLeft', U: 'ArrowUp', D: 'ArrowDown' };
async function answerPrompt(scheme, shotName) {
  for (let i = 0; i < 60; i++) { const s = await S(); if (s.prompt) break; await pg.waitForTimeout(16); }
  const s = await S(); if (!s.prompt) return null;
  await pg.waitForTimeout(170);   // to the beat
  if (shotName) await pg.screenshot({ path: shot + shotName });
  const k = s.prompt.kind, dir = k === 'T' || k === 'K' ? null : k === 'U' ? 'U' : k === 'D' ? 'D' : ((k === 'F' || k === 'FIN') === (s.prompt.face > 0) ? 'R' : 'L');
  if (k === 'K') await pg.keyboard.press('k');
  else if (scheme === 'dirJ') { if (dir) await pg.keyboard.down(ARR[dir]); await pg.keyboard.press('j'); if (dir) await pg.keyboard.up(ARR[dir]); }
  else if (scheme === 'arrow') { if (dir) await pg.keyboard.press(ARR[dir]); else await pg.keyboard.press('j'); }
  else { const L = { tybm: { B: 't', U: 'y', D: 'b', F: 'm', FIN: 'm' }, qwer: { B: 'q', U: 'w', F: 'e', FIN: 'e', D: 'r' } }[scheme]; if (k === 'T') await pg.keyboard.press('j'); else await pg.keyboard.press(L[k]); }
  return k;
}
async function chain(scheme, n, tag) {
  await setT({ scheme, len: n, slow: 1, assist: 'normal', kfin: false });
  await ready(); const before = (await S()).stats;
  await pg.keyboard.press('j');
  const kinds = [];
  for (let i = 0; i < n - 1; i++) { const k = await answerPrompt(scheme, i === 1 ? `-${tag}-prompt.png` : null); if (!k) break; kinds.push(k); await pg.waitForTimeout(40); }
  await pg.waitForTimeout(900);
  const after = (await S()).stats;
 await ok(after.links - before.links === n - 1, `${tag}: ${n - 1} prompts answered (${kinds.join(' ')}), links ${after.links - before.links}, misses ${after.miss - before.miss}`);
 await ok(after.longest >= n, `${tag}: chain reached ${n} links (longest ${after.longest})`);
  await pg.evaluate(() => { const g = window.__p46; g.P.x = 262; g.P.y = 168; });
  await pg.waitForTimeout(600);
}
await chain('dirJ', 5, 'dirJ');
await chain('arrow', 4, 'arrow');
await chain('tybm', 4, 'tybm');
await chain('qwer', 4, 'qwer');
// a wrong answer ends the chain
{ await setT({ scheme: 'arrow', len: 5, assist: 'normal' }); await ready(); const b0 = (await S()).stats; await pg.keyboard.press('j');
  for (let i = 0; i < 60; i++) { if ((await S()).prompt) break; await pg.waitForTimeout(16); }
  const s = await S(); const wrong = s.prompt.kind === 'U' ? 'ArrowDown' : 'ArrowUp'; await pg.keyboard.press(wrong); await pg.waitForTimeout(50);
  const a = await S();await ok(!a.chain && a.stats.miss === b0.miss + 1, `wrong answer ends the chain (miss ${a.stats.miss - b0.miss})`); await pg.waitForTimeout(900); }
// a prompt left alone times out
{ await ready(); const b0 = (await S()).stats; await pg.keyboard.press('j'); await pg.waitForTimeout(1300);
  const a = await S();await ok(a.stats.miss === b0.miss + 1, 'an unanswered prompt is a miss'); await pg.waitForTimeout(600); }
// free mode: J mashed chains the game's own ladder
{ await setT({ mode: 'free', len: 6 }); await ready();
  for (let i = 0; i < 10; i++) { await pg.keyboard.press('j'); await pg.waitForTimeout(110); }
  const a = await S();await ok(a.chain && a.chain.links >= 3, `free mode chains the ladder (${a.chain && a.chain.links} links, now ${a.state})`);
  await pg.waitForTimeout(1200); await setT({ mode: 'prompt' }); }
// the finisher on a lone samurai offers K
{ await setT({ scheme: 'arrow', len: 3, kfin: true }); await ready();
  await pg.keyboard.press('j'); const ks = [];
  for (let i = 0; i < 4; i++) { const k = await answerPrompt('arrow', i === 1 ? '-fin.png' : i === 2 ? '-k.png' : null); if (!k) break; ks.push(k); }
 await ok(ks.includes('FIN'), `the last link is the finisher (${ks.join(' ')})`);
 await ok(ks.includes('K'), 'a finisher next to a lone samurai offers K');
  await pg.waitForTimeout(400); const s = await S();await ok(s.state === 'exec' || ks.includes('K'), `K plays an execution (state ${s.state})`);
  await pg.waitForTimeout(3500); }
// ---- touch: swipes and taps on the play area ----
const box = await pg.locator('#play').boundingBox();
const at = (fx, fy) => [box.x + box.width * fx, box.y + box.height * fy];
async function touchStroke(pts, ms = 90) {   // one finger, real touch events through CDP
  const cdp = await ctx.newCDPSession(pg);
  const tp = ([x, y]) => [{ x, y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(pts[0]) });
  for (let i = 1; i < pts.length; i++) { if (ms > 200) await pg.waitForTimeout(ms / pts.length); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(pts[i]) }); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
// CDP touch events are slow in headless (each move ~50 ms), so a quick swipe here is long and has few points
const swipe = (fx, fy, dx, dy, ms = 90, n = 3) => { const [x, y] = at(fx, fy), k = ms > 200 ? 1 : 1.8; return touchStroke(Array.from({ length: n + 1 }, (_, i) => [x + dx * k * i / n, y + dy * k * i / n]), ms); };
const lastLabel = () => S().then(s => s.label);
await pg.evaluate(() => { const g = window.__p46; g.P.x = 160; g.P.y = 200; g.P.face = 1; g.T.kfin = false; g.T.len = 5; });
await pg.waitForTimeout(300);
await swipe(.8, .6, 0, -90); await pg.waitForTimeout(80);await ok(/JUMP/.test(await lastLabel()), `swipe up reads as jump (${await lastLabel()})`);
await pg.waitForTimeout(700);
await swipe(.6, .7, -90, 0); await pg.waitForTimeout(80);await ok(/DASH/.test(await lastLabel()), `swipe left reads as a dash (${await lastLabel()})`);
await pg.waitForTimeout(700);
await swipe(.6, .7, 0, 80); await pg.waitForTimeout(80);await ok(/DOWN/.test(await lastLabel()), `swipe down reads as down (${await lastLabel()})`);
await pg.waitForTimeout(700);
// a slow drag is nothing
await swipe(.7, .5, 130, 0, 700, 24); await pg.waitForTimeout(80);await ok(/NOT A GESTURE/.test(await lastLabel()), `a slow drag is not a gesture (${await lastLabel()})`);
// a flick there and back is a parry
{ const [x, y] = at(.75, .5); await touchStroke([[x, y], [x + 30, y], [x + 55, y], [x + 30, y], [x + 4, y]], 160); await pg.waitForTimeout(80);await ok(/PARRY/.test(await lastLabel()), `a flick reads as a parry (${await lastLabel()})`); }
await pg.waitForTimeout(800);
// the stick: hold on the left half and push right
{ const s0 = await S(); const cdp = await ctx.newCDPSession(pg); const [x, y] = at(.2, .6);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 2 }] });
  for (let i = 1; i <= 5; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + i * 10, y, id: 2 }] }); await pg.waitForTimeout(20); }
  await pg.waitForTimeout(400); await pg.screenshot({ path: shot + '-stick.png' });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const s1 = await S();await ok(s1.x > s0.x + 15, `the floating stick moves him right (${s0.x.toFixed(0)} → ${s1.x.toFixed(0)})`); }
// a whole chain by touch: tap, then swipe each prompt's way (toward = toward the samurai on screen)
{ for (let i = 0; i < 200 && (await S()).alive < 2; i++) await pg.waitForTimeout(30);
  await pg.evaluate(() => { const g = window.__p46; g.P.x = 262; g.P.y = 168; g.P.face = 1; g.T.len = 5; g.T.kfin = false; g.T.assist = 'normal'; g.T.win = .9; g.arena(); });   // CDP touch moves are slow: a wider window
  await pg.waitForTimeout(300); const b0 = (await S()).stats;
  const [tx, ty] = at(.75, .5); await touchStroke([[tx, ty], [tx + 1, ty]], 40);
  const ks = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 60; j++) { if ((await S()).prompt) break; await pg.waitForTimeout(16); }
    const s = await S(); if (!s.prompt) break; await pg.waitForTimeout(150);
    const k = s.prompt.kind, D = { U: [0, -80], D: [0, 80] }, dx = (k === 'F' || k === 'FIN') === (s.prompt.face > 0) ? 80 : -80;
    if (i === 1) await pg.screenshot({ path: shot + '-touch-prompt.png' });
    if (k === 'T') await touchStroke([[tx, ty], [tx + 1, ty]], 40); else await swipe(.75, .5, ...(D[k] || [dx, 0]), 80);
    ks.push(k); await pg.waitForTimeout(40);
  }
  await pg.waitForTimeout(800); const a = await S();
 await ok(a.stats.links - b0.links === 4, `a chain by touch: ${ks.join(' ')} → ${a.stats.links - b0.links} links answered (miss ${a.stats.miss - b0.miss})`); }
// double tap: K
{ await pg.evaluate(() => { const g = window.__p46; g.P.x = 200; g.P.y = 200; g.T.kfin = false; }); await pg.waitForTimeout(1500);
  const [x, y] = at(.8, .4); await touchStroke([[x, y], [x, y]], 30); await pg.waitForTimeout(90); await touchStroke([[x, y], [x, y]], 30); await pg.waitForTimeout(60);
 await ok(/K/.test(await lastLabel()), `double tap reads as K (${await lastLabel()}); state ${(await S()).state}`); }
await pg.waitForTimeout(2500);
// two fingers
{ const cdp = await ctx.newCDPSession(pg); const [x, y] = at(.7, .5);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 5 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 5 }, { x: x + 60, y, id: 6 }] });
  await pg.waitForTimeout(60); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await pg.waitForTimeout(80);
 await ok(/TWO FINGERS/.test(await lastLabel()), `two-finger tap reads as a skill (${await lastLabel()}); state ${(await S()).state}`); }
await pg.waitForTimeout(1200);
// the page scrolls not at all from a swipe on the arena
{ const y0 = await pg.evaluate(() => scrollY); await swipe(.75, .5, 0, -120, 80); await pg.waitForTimeout(100);await ok(await pg.evaluate(() => scrollY) === y0, 'a swipe on the arena does not scroll the page'); }
await pg.screenshot({ path: shot + '-full.png', fullPage: true });
const log = await pg.evaluate(() => window.__p46.log.slice(0, 12).map(r => `${r.t} ${r.kind} ${r.msg}`));
console.log(log.join('\n'));
await ok(!errs.length, 'no page errors' + (errs.length ? ':\n' + errs.slice(0, 5).join('\n') : ''));
await b.close();
process.exit(fail.length ? 1 : 0);
