// prototypes/46-combo-prompts.html, built from this folder by scripts/proto46/build.mjs: the game's own engine (update, render, the ronin,
// the samurai, every effect) on a cleared arena with two training samurai, driven by this page's input layer instead of src/input.js:
// keys, a floating stick and swipe gestures, and the combo prompts (combo.js). Nothing in src/ is changed; it is only imported.
import './hd.js';
import { W, H, PX } from '../../src/config.js';
import { game } from '../../src/screen.js';
import { P, S, INV } from '../../src/state.js';
import { held } from '../../src/input.js';
import { update } from '../../src/player/update.js';
import { render } from '../../src/world/render.js';
import { setState, pickStance, blink, ghost } from '../../src/player/actions.js';
import { CUTS, LADDER } from '../../src/player/combo.js';
import { ENEMIES, living } from '../../src/world/enemies.js';
import { GUARD, newBody } from '../../src/world/enemy-body.js';
import { trail } from '../../src/fx/numbers.js';
import { residue, spark } from '../../src/fx/util.js';
import { PILLARS } from '../../src/world/room.js';
import { BIG } from '../../src/items/big.js';
import { PICKUPS } from '../../src/items/pickups.js';
import { spots } from '../../src/party/recruit.js';
import { party } from '../../src/party/kit.js';
import { syncParty } from '../../src/party/companions.js';
import { WEAPONS, setWeapon } from '../../src/weapons/weapons.js';
import { K } from '../../src/assassin/markers.js';
import { gestures, G, ARROW, VEC } from './gestures.js';
import { T, C, tick, answer, kindsOf, steering, chainOn, onSay, LETTERS, MOVE_NAME, screenDir } from './combo.js';
import { drawPrompt, drawGrade, drawCounter, drawGesture, drawTrail, drawStick, drawZones, drawLock } from './draw.js';

const $ = id => document.getElementById(id);
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
// ---- the arena: the game's room, cleared of pillars, items and recruits; two samurai who take hits and never die (by default) ----
PILLARS.length = 0; BIG.length = 0; PICKUPS.length = 0; spots.length = 0; party.members = []; syncParty();   // him alone: no companions cutting for him
S.skillTest = 'mastered'; INV.hp = 1; INV.basic = LADDER[5];
const HOME = [[286, 168], [318, 214]], O = { dummies: 'live', layout: 'two', hold: 'charge', two: 'sweep', touch: false };
const fresh = (x, y) => ({ x, y, face: -1, view: 'E', hp: 40, maxHp: 40, alive: true, state: 'guard', t: 0, flash: 0, zap: 0, shk: 0, lastHit: -9, turnT: 0,
  vx: 0, vy: 0, fd: -1, held: false, P0: GUARD, body: newBody(GUARD), pose: GUARD, alpha: 1, chip: trail(1), deadT: 0 });
function arena() { ENEMIES.forEach((e, i) => { if (i < HOME.length) Object.assign(e, fresh(...HOME[i])); else Object.assign(e, { alive: false, state: 'gone', hp: 0 }); }); }
arena(); P.x = 214; P.y = 190;
function keepDummies(dt) {
  if (ENEMIES.slice(HOME.length).some(e => e.state !== 'gone')) arena();   // the game respawned the full squad: back to two
  ENEMIES.slice(0, HOME.length).forEach((e, i) => {
    if (e.alive) { if (O.dummies === 'live' && e.hp < 12) { e.hp = e.maxHp; e.chip = trail(1); } e.maxHp = O.dummies === 'live' ? 40 : 4; if (e.hp > e.maxHp) e.hp = e.maxHp; return; }
    if ((e.deadT = (e.deadT || 0) + dt) > 2.4) { Object.assign(e, fresh(...HOME[i]), O.dummies === 'live' ? {} : { hp: 4, maxHp: 4 }); residue(e.x, e.y, 6); }
  });
}

// ---- the log and the spoken line (aria-live) ----
const t0 = performance.now(), logRows = [];
export function log(kind, msg) {
  const row = { t: ((performance.now() - t0) / 1000).toFixed(2), kind, msg }; logRows.unshift(row); if (logRows.length > 60) logRows.pop();
  const li = document.createElement('li'); li.className = 'k-' + kind; li.innerHTML = `<span class="lt">${row.t}</span><span class="lk">${kind}</span><span>${msg}</span>`;
  const ul = $('log'); ul.prepend(li); while (ul.children.length > 40) ul.lastChild.remove();
}
let label = null;
const show = (text, ok = true) => { label = { text: text.toUpperCase(), ok, t: 0 }; $('said').textContent = text; };
onSay((k, d) => {
  if (k === 'prompt') log('prompt', d.kind === 'K' ? 'K: a lone enemy in reach (K / a tap or double tap)' : `${d.kind === 'T' ? 'J / tap' : ARROW[d.dir]} for the ${MOVE_NAME[d.kind]}`);
  else if (k === 'hit') log('link', `${d.grade} via ${d.via} (${Math.round(d.age * 1000)} ms after it showed) → ${MOVE_NAME[d.kind]}`);
  else if (k === 'wrong') log('miss', `wrong answer via ${d.via}: ${d.kinds.join('/') || 'nothing'}`);
  else if (k === 'early') log('miss', `early via ${d.via}`);
  else if (k === 'timeout') log('miss', 'the window closed');
  else if (k === 'whiff') log('chain', 'the cut missed: no prompt');
  else if (k === 'start') log('chain', 'chain starts');
  else if (k === 'step') log('chain', `${d.kind}: ${d.gap > 2 ? `steps in ${Math.round(Math.min(d.gap, d.max))} px to reach him` : 'in reach'} (${Math.round(d.dx)}, ${Math.round(d.dy)})`);
  else if (k === 'end') log('chain', `ends (${d.why}): ${d.links} links, ${d.hits} hits`);
});

// ---- inputs: one set of presses per fixed step, held keys, the stick ----
const want = new Set();
const KEYS = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down',
  j: 'slash', ' ': 'jump', shift: 'slide', l: 'slide', k: 'tele', i: 'double', u: 'sweep', c: 'sit', o: 'moon', p: 'rift', n: 'mirror', v: 'walk', e: 'act' };
const DIRK = { left: 'L', right: 'R', up: 'U', down: 'D' };
const keyDir = () => { const x = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0), y = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
  return !x && !y ? null : (y < 0 ? 'U' : y > 0 ? 'D' : '') + (x > 0 ? 'R' : x < 0 ? 'L' : '') || null; };
// direction + J: J with a direction held, or a direction pressed within CHORD of the J (so the two need not land in one frame)
const CHORD = 70; let pendJ = null;
function resolveJ(dir, via) { pendJ = null; answer(dir ? kindsOf(dir, C.prompt ? C.prompt.face : P.face, T.assist) : ['T'], via); }
const play = $('play');
play.addEventListener('keydown', e => {
  const key = e.key.toLowerCase(), name = KEYS[key], letters = LETTERS[T.scheme];
  if (e.key === 'Tab' || e.metaKey || e.ctrlKey) return;
  O.touch = false;
  // the letter schemes take their four letters while a prompt is open (Q W E R override W's move and E's use)
  if (letters && letters[key] && C.prompt && !e.repeat) { e.preventDefault(); log('key', key.toUpperCase()); answer([letters[key]], 'key ' + key.toUpperCase()); return; }
  if (!name) return; e.preventDefault();
  if (e.repeat) return;
  held.add(name);
  if (T.mode === 'prompt' && (C.prompt || chainOn() || CUTS[P.state])) {
    if (name === 'slash') { log('key', 'J' + (keyDir() ? ' + ' + ARROW[keyDir()] : ''));
      if (!C.prompt) { log('chain', CUTS[P.state] ? 'J during a cut with no prompt: ignored (no mashing through)' : 'J ignored'); return; }
      if (T.scheme === 'dirJ' && !keyDir() && C.prompt.kind !== 'T') { pendJ = setTimeout(() => resolveJ(keyDir(), 'J + key'), CHORD); return; }
      return resolveJ(T.scheme === 'dirJ' ? keyDir() : null, T.scheme === 'dirJ' ? (keyDir() ? 'J + ' + ARROW[keyDir()] : 'J') : 'J'); }
    if (DIRK[name] && C.prompt) {
      if (pendJ) { clearTimeout(pendJ); return resolveJ(keyDir(), 'J then ' + ARROW[keyDir()]); }
      if (T.scheme === 'arrow') { log('key', ARROW[keyDir()]); return answer(kindsOf(DIRK[name], C.prompt.face, T.assist), 'key ' + ARROW[DIRK[name]]); }
      return; }
    if (name === 'tele' && C.prompt && C.prompt.kind === 'K') { log('key', 'K'); return answer(['K'], 'K'); }
    if (name === 'slash') return;
  }
  if (C.lock > 0 && name === 'slash') return;
  if (!DIRK[name] && name !== 'walk') { want.add(name); log('key', key === ' ' ? 'Space' : key.toUpperCase()); }
});
play.addEventListener('keyup', e => { const name = KEYS[e.key.toLowerCase()]; if (name) held.delete(name); });
play.addEventListener('blur', () => held.clear());

// ---- gestures: what each one does outside a prompt, and how it answers one ----
const GW = { R: 'right', DR: 'down-right', D: 'down', DL: 'down-left', L: 'left', UL: 'up-left', U: 'up', UR: 'up-right' };
let holdOn = false; const fades = [];
const canAct = s => ['idle', 'run', 'walk', 'idleGlitch', 'land', 'sheathe', 'runArmed'].includes(s) || s.startsWith('ready');
function lungeTarget(dir) {
  const [vx, vy] = VEC[dir]; let best = null, bd = 96;
  for (const e of living()) { const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy * 1.3); if (d > bd || d < 4) continue;
    if ((dx * vx + dy * vy) / Math.hypot(dx, dy) > Math.cos(40 * Math.PI / 180)) { best = e; bd = d; } }
  return best;
}
const pg = gestures(play, () => O.layout, gst => {
  O.touch = true; play.focus({ preventScroll: true });
  if (gst.pts) fades.push({ pts: gst.pts, r: gst.r, age: 0 });
  const d = gst.dir, where = `${gst.why ? ' · ' + gst.why : ''}`;
  const say = (txt, ok = true) => { show(txt, ok); log('gesture', `${txt}${where}`); };
  if (gst.kind === 'none') return say('not a gesture', false);
  if (gst.kind === 'drag') return say('drag: moving');
  if (gst.kind === 'hold-end') { holdOn = false; if (O.hold === 'charge') held.delete('double'); return log('gesture', 'hold ends'); }
  if (C.lock > 0) return say(gst.kind + ': recovering', false);
  // a prompt is open: the gesture is the answer
  if (T.mode === 'prompt' && C.prompt) {
    if (gst.kind === 'hold-start') { holdOn = true; return say('hold'); }
    const kinds = gst.kind === 'tap' ? ['T'] : gst.kind === 'double' ? (C.prompt.kind === 'K' ? ['K'] : ['T']) : gst.kind === 'swipe' ? kindsOf(d, C.prompt.face, T.assist) : [];
    say(gst.kind === 'swipe' ? `swipe ${GW[d]} ${ARROW[d]}` : gst.kind); return answer(kinds, gst.kind === 'swipe' ? 'swipe ' + ARROW[d] : gst.kind);
  }
  if (gst.kind === 'double') {   // K: the first tap's cut is still winding up, so it gives way to the execution or the blink
    say('double tap: K');
    if ((P.state === 'slash1' || P.state === 'slash1r') && P.t < CUTS.slash1.sk) { setState('idle'); C.chain = null; C.prompt = null; }
    if (canAct(P.state)) want.add('tele'); else C.pendingK = true; return; }
  if (T.mode === 'prompt' && chainOn()) return say(gst.kind + ': no prompt open yet', false);
  if (gst.kind === 'tap') { say('tap: slash'); return want.add('slash'); }
  if (gst.kind === 'hold-start') { holdOn = true;
    if (O.hold === 'charge') { say('hold: charge (Thousand Cuts)'); held.add('double'); want.add('double'); }
    else { say('hold: guard'); if (canAct(P.state)) { setState(pickStance()); P.armed = true; } }
    return; }
  if (gst.kind === 'flick') { say('flick: parry');
    if (canAct(P.state)) { setState(pickStance()); P.armed = true; for (let i = 0; i < 6; i++) spark(P.x + P.face * 10, P.y - 16, P.face * (40 + i * 12), -20 + i * 8, .12, '#ffffff', true); }
    return; }
  if (gst.kind === 'two') { say(`two fingers: ${{ sweep: 'Sky Drop', rift: 'Cross Rift', mirror: 'Mirror', double: 'double slash' }[O.two]}`); return want.add(O.two); }
  if (gst.kind === 'swipe') {
    const e = d !== 'U' && lungeTarget(d);
    if (e) { say(`swipe ${GW[d]} ${ARROW[d]}: lunge cut`);
      if (!canAct(P.state)) return;
      const dx = e.x - P.x, dy = e.y - P.y, m = Math.hypot(dx, dy), go = Math.max(0, m - 18);
      P.face = Math.sign(dx) || P.face; ghost(); residue(P.x, P.y, 5); blink(go, [dx / m, dy / m]); P.face = Math.sign(e.x - P.x) || P.face; want.add('slash'); return; }
    if (d === 'U') { say('swipe up ↑: jump'); return want.add('jump'); }
    say(`swipe ${GW[d]} ${ARROW[d]}: dash`); swipeDir = VEC[d]; return want.add('slide');
  }
}, () => { if (document.activeElement === play) return true; play.focus({ preventScroll: true }); return false; });
let swipeDir = null;
$('playhint').addEventListener('click', () => play.focus());

// ---- the loop: fixed 60 Hz steps, slowed while a prompt is open (if set), then the game's render and this page's layer on top ----
function step() {
  const dir = keyDir(), st = pg.stick, block = steering() || C.lock > 0;
  const mx = block ? 0 : dir ? VEC[dir][0] : st.mx, my = block ? 0 : dir ? VEC[dir][1] : st.my;
  if (st.on && !dir) { if (st.walk) held.add('walk'); else held.delete('walk'); }
  const inp = { mx, my, slash: want.has('slash'), jump: want.has('jump'), slide: want.has('slide'), tele: want.has('tele'), double: want.has('double'),
    sweep: want.has('sweep'), sit: want.has('sit'), die: false, moon: want.has('moon'), rift: want.has('rift'), mirror: want.has('mirror'),
    act: want.has('act'), order: false, hurt: false, quick: [false, false, false, false] };
  if (inp.slide && swipeDir) { inp.mx = swipeDir[0]; inp.my = swipeDir[1]; swipeDir = null; }   // a swipe's dash goes the swipe's way
  if (C.pendingK && canAct(P.state)) { inp.tele = true; C.pendingK = false; }
  if (holdOn && O.hold === 'guard') P.still = 0;
  // a press in a hit pause is held to the first step after it (the game today drops it; Dead Cells would not)
  const paused = S.hitstop > 0;
  update(1 / 60, inp);
  if (!paused) want.clear();
  tick(1 / 60, holdOn || (held.has('slash') && T.scheme !== 'arrow'));
  keepDummies(1 / 60);
}
// ---- the camera: on a narrow column (a phone held upright) the arena is shown closer, up to 2x, panned to keep him in view,
// so the figures and the prompt stay at least one screen pixel per game pixel. The page's own pan; the game's render is untouched
const view = { z: 1, ox: 0, oy: 0 }, canvas = $('game');
function camera(dt) {
  const w = play.clientWidth, h = play.clientHeight, z = w < 720 ? Math.min(2, 720 / w) : 1, cw = w * z, ch = cw * H / W;
  const tx = Math.max(w - cw, Math.min(0, w / 2 - P.x / W * cw)), ty = Math.max(h - ch, Math.min(0, h * .62 - P.y / H * ch));
  const k = view.z !== z || reduce.matches ? 1 : Math.min(1, dt * 6); view.z = z;
  view.ox += (tx - view.ox) * k; view.oy += (ty - view.oy) * k;
  canvas.style.width = z * 100 + '%'; canvas.style.transform = `translate(${view.ox.toFixed(1)}px, ${view.oy.toFixed(1)}px)`;
}
const toW = ([x, y]) => { const cw = play.clientWidth * view.z; return [(x - view.ox) / cw * W, (y - view.oy) / (cw * H / W) * H]; };
let last = performance.now(), acc = 0;
function frame(now) {
  const real = Math.min(.1, (now - last) / 1000); last = now; pg.poll();
  const scale = C.prompt && T.slow < 1 ? T.slow : 1;
  acc = Math.min(acc + real * scale, .1);
  while (acc >= 1 / 60) { acc -= 1 / 60; step(); }
  if (reduce.matches) { S.shake = 0; S.scr.t = 0; S.impact = 0; }
  render();
  camera(real);
  if (O.touch) drawZones(O.layout);
  for (const f of fades) { f.age += real; drawTrail(f.pts, toW, f.age); }
  for (let i = fades.length - 1; i >= 0; i--) if (fades[i].age > .35) fades.splice(i, 1);
  for (const t of pg.trails()) drawTrail(t.pts, toW, 0);
  drawStick(pg.stick, toW);
  drawPrompt(C, T, O.touch); drawGrade(C, T); drawCounter(C, T); drawLock(C);
  if (label) { label.t += real; drawGesture(label); }
  $('count').textContent = C.chain ? `${C.chain.hits} hits · link ${C.chain.links} of ${T.mode === 'free' ? 'the ladder' : T.len}` : C.last ? `last chain: ${C.last.links} links, ${C.last.hits} hits (${C.last.why})` : 'no chain yet';
  const s = C.stats; $('stats').textContent = `${s.chains} chains · longest ${s.longest} · perfect ${s.perfect} · good ${s.good} · late ${s.late} · missed ${s.miss}`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---- the tunables panel ----
function seg(id, items, get, set) {
  const el = $(id); el.innerHTML = '';
  for (const [v, lab] of items) { const b = document.createElement('button'); b.type = 'button'; b.textContent = lab; b.setAttribute('aria-pressed', String(get() === v));
    b.onclick = () => { set(v); seg(id, items, get, set); legend(); }; el.append(b); }
}
function range(id, get, set, fmt) {
  const el = $(id), out = $(id + '-v'); el.value = get(); out.textContent = fmt(get());
  el.oninput = () => { set(+el.value); out.textContent = fmt(+el.value); };
}
seg('s-mode', [['prompt', 'Prompts'], ['free', 'Free (J as today)']], () => T.mode, v => { T.mode = v; C.prompt = null; C.queued = null; C.chain = null; });
seg('s-scheme', [['dirJ', 'Direction + J'], ['arrow', 'Arrow alone'], ['tybm', 'Letters T Y B M'], ['qwer', 'Letters Q W E R']], () => T.scheme, v => { T.scheme = v; });
seg('s-assist', [['strict', 'Strict'], ['normal', 'Normal'], ['generous', 'Generous'], ['hold', 'Hold to continue'], ['auto', 'Auto']], () => T.assist, v => { T.assist = v; });
seg('s-miss', [['recover', 'Ends + recovery'], ['soft', 'Ends, no lockout'], ['forgive', 'One slip forgiven']], () => T.miss, v => { T.miss = v; });
seg('s-slow', [[1, 'Off'], [.7, 'Light ×0.7'], [.4, 'Heavy ×0.4']], () => T.slow, v => { T.slow = v; });
seg('s-where', [['enemy', 'Over the enemy'], ['ronin', 'Over him'], ['strip', 'Low strip']], () => T.where, v => { T.where = v; });
seg('s-kfin', [[true, 'On'], [false, 'Off']], () => T.kfin, v => { T.kfin = v; });
seg('s-layout', [['two', 'Two thumbs'], ['one', 'One thumb']], () => O.layout, v => { O.layout = v; });
seg('s-hold', [['charge', 'Charge (I held)'], ['guard', 'Guard stance']], () => O.hold, v => { O.hold = v; });
seg('s-two', [['sweep', 'Sky Drop'], ['rift', 'Cross Rift'], ['mirror', 'Mirror'], ['double', 'Double slash']], () => O.two, v => { O.two = v; });
seg('s-dummies', [['live', 'Never die'], ['die', 'Die at 4 hits']], () => O.dummies, v => { O.dummies = v; ENEMIES.slice(0, 2).forEach(e => { if (e.alive) { e.maxHp = e.hp = v === 'live' ? 40 : 4; } }); });
seg('s-weapon', WEAPONS.slice(0, 6).map(w => [w.id, w.name]), () => P.weapon, v => { setWeapon(v); });
let hd = PX === 2;
seg('s-hd', [[false, '1×'], [true, '2× (reloads)']], () => hd, v => { if (v === hd) return; try { localStorage.setItem('p46-hd', v ? '1' : '0'); } catch (e) { /* no storage */ }
  try { location.search = v ? '?hd' : ''; } catch (e) { $('hdnote').hidden = false; } });
range('r-win', () => T.win, v => { T.win = v; }, v => v.toFixed(2) + ' s');
range('r-lead', () => T.lead, v => { T.lead = v; }, v => v.toFixed(2) + ' s');
range('r-len', () => T.len, v => { T.len = v; INV.basic = LADDER[Math.min(5, v - 1)]; }, v => v + ' links');
range('r-swipe', () => G.SWIPE_PX, v => { G.SWIPE_PX = v; }, v => v + ' px');
range('r-speed', () => G.SWIPE_SPEED, v => { G.SWIPE_SPEED = v; }, v => v.toFixed(2) + ' px/ms');
range('r-holdms', () => G.HOLD_MS, v => { G.HOLD_MS = v; }, v => v + ' ms');
range('r-dbl', () => G.DBL_MS, v => { G.DBL_MS = v; }, v => v + ' ms');
// the key legend follows the scheme
function legend() {
  const L = LETTERS[T.scheme], k = kind => L ? Object.keys(L).find(c => L[c] === kind).toUpperCase() : T.scheme === 'dirJ' ? `${ARROW[screenDir(kind, 1)]} + J` : ARROW[screenDir(kind, 1)];
  $('legend').innerHTML = T.mode === 'free' ? 'Free mode: <kbd>J</kbd> again in each follow-through chains the ladder, as in the game today.' :
    ['F', 'U', 'B', 'D'].map(x => `<span><kbd>${k(x)}</kbd> ${MOVE_NAME[x]}</span>`).join('') + `<span><kbd>J</kbd> answer cut</span><span><kbd>${k('F')}</kbd> on the last link: flash step</span><span><kbd>K</kbd> execution, after a finisher on a lone enemy</span>`;
}
legend();
window.__p46 = { T, C, G, O, P, ENEMIES, held, log: logRows, arena, get label() { return label; }, stick: pg.stick, K };
