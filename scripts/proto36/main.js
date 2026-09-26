// prototypes/36-port-true-left.html, built from this file by scripts/proto36/build.mjs: the game's own modules, bundled into one page.
import { FW, FH, OX, OY, RC } from '../../src/config.js';
import { Raster, packPal } from '../../src/wardrobe/raster.js';
import { dress, makeFigure, WEST } from '../../src/wardrobe/dress.js';
import { OUTFITS } from '../../src/wardrobe/items.js';
import { DIRS, port } from '../../src/rig/port.js';
import { turner, turnTo, trueView } from '../../src/rig/turn.js';
import { rig, rigR } from '../../src/rig/rig.js';
import { drawBody3d } from '../../src/rig/body3d.js';
import { solve } from '../../src/wardrobe/skeleton.js';
import { WEAPONS, framesFor } from '../../src/weapons/weapons.js';
import { ANIMS } from '../../src/anims/anims.js';
import { GUARD } from '../../src/world/enemy-body.js';
import { viewTo } from '../../src/world/enemies.js';
import { ROSTER } from '../../src/party/kit.js';
import { frames } from '../../src/party/figures.js';

const $ = id => document.getElementById(id);
const YAW = Object.fromEntries(DIRS.map(d => [d.id, d.yaw]));
const EAST = { SW: 'SE', W: 'E', NW: 'NE' };   // the old way: the west side is the east one mirrored
const MODES = { before: 'Before: the west mirrored', side: 'True left: the side rig from his left (in the game)', '3d': 'True left: rig v2 at 180°' };
const st = { move: 'idle', weapon: 'katana', outfit: 0, play: true, t: 0, frame: 0, west: 'side' };

// one frame of anyone: returns [canvas, flip]. mode picks how the west side is drawn
const RH = new Raster(FW, FH, OX, OY), RA = new Raster(FW, FH, OX, OY, .3, packPal({ ...RC, E: '#e9eeee', e: '#8a9294' }));
function facingOf(id, mode) {
  if (mode === 'before' && EAST[id]) return [YAW[EAST[id]], -1];
  return [YAW[id], 1];
}
function hero(F, p, dt, id, mode, R = RH) {
  const [yaw, fl] = facingOf(id, mode), was = WEST.mode; WEST.mode = mode === '3d' ? '3d' : 'side';
  const cv = dress(R, F, p, dt, yaw, fl); WEST.mode = was; return [cv, fl];
}
// the samurai, as world/enemy-draw.js draws him
const PAL = { K: '#3a2e31', D: '#5a4a4e', E: '#ff5a4a', e: '#7a2d27', W: '#cfd4d6', S: '#7d868e', s: '#3a3033' };
const R3 = new Raster(FW, FH, OX, OY, .3, packPal({ ...RC, ...PAL })), scv = document.createElement('canvas'); scv.width = FW; scv.height = FH;
function samurai(p, id, mode) {
  const [yaw, fl] = facingOf(id, mode);
  if (!yaw) { const c = scv.getContext('2d'); c.clearRect(0, 0, FW, FH); rig(c, 0, p, PAL); return [scv, fl]; }
  R3.clear();
  if (yaw === Math.PI && mode === 'side') { rigR(R3, p, true); return [R3.flush(true), 1]; }
  drawBody3d(R3, solve(port(p), yaw), { bare: true, blink: false }); return [R3.flush(), 1];
}
// a frame on a canvas: feet at (x, y) in canvas pixels, scale s, drawn as the game's spriteTo does (a mirror flips about the feet)
function put(g, cv, x, y, s, fl, a = 1) {
  g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(fl * s, s); g.drawImage(cv, -OX, -OY); g.restore();
}
const floor = (g, w, h) => { g.fillStyle = '#474c4a'; g.fillRect(0, 0, w, h); };
const shadow = (g, x, y, s) => { g.fillStyle = 'rgba(20,24,24,.35)'; g.fillRect(Math.round(x - 5 * s), Math.round(y), 10 * s, 2 * s); };
const canvasFor = (el, w, h) => { el.width = w; el.height = h; const g = el.getContext('2d'); g.imageSmoothingEnabled = false; return g; };

// ---- 1. every facing, before and after ----
const CW = 64, CH = 60, S1 = 2;
const figs = new Map(), figOf = (k, items) => { let F = figs.get(k); if (!F) figs.set(k, F = makeFigure(items)); return F; };
const outfit = () => OUTFITS[st.outfit].items;
const weapon = () => WEAPONS.find(w => w.id === st.weapon);
const poses = (name, w = weapon()) => framesFor(w, name).map(p => p && { ...p, wp: w.art });
function gridRows(el, rows) {
  el.innerHTML = '';
  for (const r of rows) {
    const lab = document.createElement('div'); lab.className = 'rowlab'; lab.textContent = r.label; el.append(lab);
    const cv = document.createElement('canvas'); cv.className = 'strip'; cv.width = DIRS.length * CW * S1; cv.height = CH * S1; el.append(cv); r.cv = cv;
    const g = r.cv.getContext('2d'); g.imageSmoothingEnabled = false; r.g = g;
  }
}
const heads = el => { el.innerHTML = '<div></div>' + `<div class="dirs">${DIRS.map(d => `<span>${d.id}</span>`).join('')}</div>`; };
const everyRows = Object.keys(MODES).map(m => ({ mode: m, label: MODES[m] }));
function drawEvery(dt) {
  const ps = poses(st.move), f = st.frame % ps.length, p = ps[f];
  for (const r of everyRows) { const g = r.g; floor(g, r.cv.width, r.cv.height);
    DIRS.forEach((d, i) => {
      const x = (i * CW + CW / 2) * S1, y = (CH - 6) * S1;
      const F = figOf(`every|${r.mode}|${d.id}|${st.outfit}`, outfit());
      g.save(); g.beginPath(); g.rect(i * CW * S1, 0, CW * S1, CH * S1); g.clip();
      shadow(g, x, y, S1); const [cv, fl] = hero(F, p, dt, d.id, r.mode); put(g, cv, x, y, S1, fl); g.restore();
      if (r.mode !== 'before' && EAST[d.id]) { g.strokeStyle = 'rgba(111,243,228,.55)'; g.lineWidth = 2; g.strokeRect(i * CW * S1 + 1, 1, CW * S1 - 2, CH * S1 - 2); }
    }); }
}
// ---- 2. up close: E, and the west facings before and after ----
const ZW = 42, ZH = 46, ZS = 5, zoomCols = [['E', 'before'], ['SW', 'before'], ['SW', '3d'], ['W', 'before'], ['W', 'side'], ['W', '3d'], ['NW', 'before'], ['NW', '3d']];
function drawZoom(dt) {
  const g = canvasFor($('zoom'), zoomCols.length * ZW * ZS, ZH * ZS); floor(g, g.canvas.width, g.canvas.height);
  const ps = poses(st.move), p = ps[st.frame % ps.length];
  zoomCols.forEach(([id, mode], i) => {
    const F = figOf(`zoom|${mode}|${id}|${st.outfit}`, outfit()), [cv, fl] = hero(F, p, dt, id, mode);
    g.save(); g.beginPath(); g.rect(i * ZW * ZS, 0, ZW * ZS, ZH * ZS); g.clip(); put(g, cv, (i * ZW + ZW / 2) * ZS, (ZH - 4) * ZS, ZS, fl); g.restore();
    if (i) { g.fillStyle = '#2a2f2e'; g.fillRect(i * ZW * ZS - 1, 0, 2, ZH * ZS); } });
}
// ---- 3. the turn: a lap round the floor, facing the way he runs ----
const LAP = [[40, 80], [180, 80], [180, 46], [40, 46]], TW = 220, TH = 92, TS = 3;
const laps = Object.keys(MODES).map(m => ({ mode: m, F: null, T: turner('E'), ghosts: [], gt: 0, x: 40, y: 80, face: 1, view: 'E', seg: 0 }));
function lapStep(L, dt) {
  const [tx, ty] = LAP[(L.seg + 1) % LAP.length], dx = tx - L.x, dy = ty - L.y, d = Math.hypot(dx, dy), v = 70 * dt;
  if (d <= v) { L.x = tx; L.y = ty; L.seg = (L.seg + 1) % LAP.length; return; }
  L.x += dx / d * v; L.y += dy / d * v * .8;
  if (Math.abs(dx) > .5) L.face = Math.sign(dx);
  L.view = viewTo(dx, dy);
}
function drawTurn(dt) {
  const ps = poses(st.move === 'idle' || st.move === 'walk' ? 'run' : st.move);
  laps.forEach((L, li) => {
    const g = canvasFor($('turn' + li), TW * TS, TH * TS); floor(g, g.canvas.width, g.canvas.height);
    if (dt > 0) lapStep(L, dt);
    L.F = L.F || makeFigure(outfit());
    const p = ps[Math.floor(st.t * ANIMS.run.fps) % ps.length];
    // before: the five east facings and a mirror; after: the true facing, turned through the facings between
    let id, yaw, fl;
    if (L.mode === 'before') { id = L.view; [yaw, fl] = [YAW[L.view], L.face]; }
    else { id = turnTo(L.T, trueView(L.view, L.face), L.face, dt).id; [yaw, fl] = [YAW[id], 1]; }
    L.F.vel = [L.face * 70, 0];
    const was = WEST.mode; WEST.mode = L.mode === '3d' ? '3d' : 'side';
    const cv = dress(RH, L.F, p, dt, yaw, fl); WEST.mode = was;
    if ((L.gt += dt) > .12 && $('ghosts').checked) { L.gt = 0; const c = document.createElement('canvas'); c.width = FW; c.height = FH;
      const cg = c.getContext('2d'); cg.drawImage(cv, 0, 0); cg.globalCompositeOperation = 'source-in'; cg.fillStyle = '#6ff3e4'; cg.fillRect(0, 0, FW, FH);
      L.ghosts.push({ c, x: L.x, y: L.y, fl, age: 0 }); }
    for (const gh of L.ghosts) { gh.age += dt; put(g, gh.c, Math.round(gh.x) * TS, Math.round(gh.y) * TS, TS, gh.fl, .45 * Math.max(0, 1 - gh.age / .5)); }
    L.ghosts = L.ghosts.filter(gh => gh.age < .5);
    shadow(g, Math.round(L.x) * TS, Math.round(L.y) * TS, TS); put(g, cv, Math.round(L.x) * TS, Math.round(L.y) * TS, TS, fl);
    $('turnlab' + li).textContent = `${MODES[L.mode]} · facing ${L.mode === 'before' ? (L.face < 0 ? L.view + ' mirrored' : L.view) : id}`;
  });
}
// ---- 4. attacks stay side on: idle facing W, a cut, back to idle ----
const atk = Object.keys(MODES).map(m => ({ mode: m, F: null }));
function drawAttack(dt) {
  const idle = poses('idle'), cut = poses('slash1'), sheathe = poses('sheathe'), I = 1.2, C = cut.length / ANIMS.slash1.fps, H = sheathe.length / ANIMS.sheathe.fps;
  const t = st.t % (I + C + H + .6);
  let p, side = true, phase;
  if (t < I) { p = idle[Math.floor(t * ANIMS.idle.fps) % idle.length]; side = false; phase = 'idle, facing W'; }
  else if (t < I + C) { p = cut[Math.min(cut.length - 1, Math.floor((t - I) * ANIMS.slash1.fps))]; phase = 'slash 1, side on (mirrored)'; }
  else if (t < I + C + H) { p = sheathe[Math.min(sheathe.length - 1, Math.floor((t - I - C) * ANIMS.sheathe.fps))]; phase = 'sheathe, side on (mirrored)'; }
  else { p = idle[0]; side = false; phase = 'idle, facing W'; }
  atk.forEach((A, i) => {
    const g = canvasFor($('atk' + i), 70 * 4, 58 * 4); floor(g, g.canvas.width, g.canvas.height);
    A.F = A.F || makeFigure(outfit());
    const [cv, fl] = side ? [dress(RH, A.F, p, dt, 0, -1), -1] : hero(A.F, p, dt, 'W', A.mode);
    shadow(g, 35 * 4, 52 * 4, 4); put(g, cv, 35 * 4, 52 * 4, 4, fl);
  });
  $('atkphase').textContent = phase;
}
// ---- 5. everyone: the samurai in guard, the companions walking ----
const people = [{ id: 'samurai', label: 'Samurai, guard' }, ...['kuro', 'suzume', 'tetsu'].map(id => ({ id, c: ROSTER.find(c => c.id === id) }))];
people.forEach(pp => { if (pp.c) pp.label = `${pp.c.name}, walk (${WEAPONS.find(w => w.id === pp.c.kit.weapon).name})`; });
function drawPeople(dt) {
  const el = $('people'); if (!el.dataset.built) { el.dataset.built = 1;
    for (const pp of people) for (const m of ['before', 'after']) { const lab = document.createElement('div'); lab.className = 'rowlab';
      lab.textContent = `${pp.label}: ${m === 'before' ? 'before' : 'true facings'}`; const cv = document.createElement('canvas'); cv.className = 'strip';
      cv.width = DIRS.length * CW * S1; cv.height = CH * S1; cv.id = `pp-${pp.id}-${m}`; el.append(lab, cv); } }
  for (const pp of people) for (const m of ['before', 'after']) {
    const g = canvasFor($(`pp-${pp.id}-${m}`), DIRS.length * CW * S1, CH * S1); floor(g, g.canvas.width, g.canvas.height);
    const mode = m === 'before' ? 'before' : st.west;
    DIRS.forEach((d, i) => { const x = (i * CW + CW / 2) * S1, y = (CH - 6) * S1;
      g.save(); g.beginPath(); g.rect(i * CW * S1, 0, CW * S1, CH * S1); g.clip(); shadow(g, x, y, S1);
      if (!pp.c) { const [cv, fl] = samurai({ ...GUARD, breath: Math.sin(st.t * 2) * .5 + .5 }, d.id, mode); put(g, cv, x, y, S1, fl); }
      else { const fr = frames(pp.c, 'walk'), p = fr.poses[Math.floor(st.t * fr.fps) % fr.poses.length];
        const F = figOf(`pp|${pp.id}|${m}|${d.id}`, [...pp.c.kit.wear]); const [cv, fl] = hero(F, p, dt, d.id, mode, RA); put(g, cv, x, y, S1, fl); }
      g.restore(); }); }
}

// ---- controls and the clock ----
function buttons(el, items, get, set) {
  el.innerHTML = ''; for (const [v, label] of items) { const b = document.createElement('button'); b.textContent = label; b.type = 'button';
    b.setAttribute('aria-pressed', get() === v); b.onclick = () => { set(v); buttons(el, items, get, set); }; el.append(b); }
}
function ui() {
  buttons($('moves'), [['idle', 'Idle'], ['walk', 'Walk'], ['run', 'Run'], ['runArmed', 'Run, blade out']], () => st.move, v => { st.move = v; st.frame = 0; });
  buttons($('weapons'), WEAPONS.map(w => [w.id, w.name]), () => st.weapon, v => { st.weapon = v; });
  buttons($('outfits'), OUTFITS.map((o, i) => [i, o.name]), () => st.outfit, v => { st.outfit = v; figs.clear(); for (const L of laps) L.F = null; for (const A of atk) A.F = null; });
  buttons($('westmode'), [['side', 'Side rig from his left (in the game)'], ['3d', 'Rig v2 at 180°']], () => st.west, v => { st.west = v; });
  $('play').onclick = () => { st.play = !st.play; $('play').textContent = st.play ? 'Pause' : 'Play'; };
  $('step').onclick = () => { st.play = false; $('play').textContent = 'Play'; st.frame++; tick(1 / 60, true); };
  heads($('everyhead')); heads($('peoplehead')); gridRows($('every'), everyRows);
}
let last = performance.now();
function tick(dt, stepped) {
  if (st.play) { st.t += dt; st.frame = Math.floor(st.t * ANIMS[st.move].fps); }
  const d = st.play || stepped ? dt : 0;
  drawEvery(d); drawZoom(d); drawTurn(st.play ? dt : 0); drawAttack(d); drawPeople(d);
  $('frameno').textContent = `frame ${st.frame % poses(st.move).length + 1} / ${poses(st.move).length}`;
}
function loop(now) { const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now; tick(dt); requestAnimationFrame(loop); }
ui(); requestAnimationFrame(loop);
window.__proto = st;
