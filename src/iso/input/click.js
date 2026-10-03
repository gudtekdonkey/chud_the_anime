// ---- Click to move on PC (owner 2026-10-02: "Pc should also be able to move by clicking"). Left click: on the floor he
// runs there, round the walls and posts (path.js); on a samurai he runs in and cuts (a click while a prompt is up over
// him answers it: J, or K on the finisher); on a marker (a big item's brackets, a companion who is down, the fallen,
// a pickup) he goes to it and does its verb. The keys always win: a direction pressed drops the click's path.
// The mouse's selection rules are the squad AI's (claude/3d-squad-ai): left click moves him only while nothing is
// selected, so it sets CLICK.blocked; right click is theirs, never read here.
import { CTX, living } from '../ctx.js';
import { CAM, VW, VH, U, OBL, toScreen } from 'ronin-engine/render/gfx/view.js';
import { findPath } from './path.js';
import { BIG, usable } from '../items/big.js';
import { PICKUPS } from '../items/pickups.js';
import { IT, FALLEN, LOCK } from '../items/items.js';
import { PARTY } from '../party/party.js';
import { CP, answer } from '../combo/prompts.js';
import { hOf } from 'ronin-engine/flow/flow.js';
import { W } from 'ronin-engine/clock/world.js';
import { COL } from '../../config.js';

const CUTS = new Set(['J1', 'J2', 'J3', 'lunge', 'roll']);
export const CLICK = { goal: null, path: null, blocked: () => false, mark: null, log: [], swipeMouse: false };
const press = code => { dispatchEvent(new KeyboardEvent('keydown', { code })); dispatchEvent(new KeyboardEvent('keyup', { code })); };
// a pointer on the canvas → render pixels → the floor (y = 0) under it
export function floorAt(canvas, cx, cy) { const r = canvas.getBoundingClientRect(), sx = (cx - r.left) / r.width * VW, sy = (cy - r.top) / r.height * VH;
  return { sx, sy, x: CAM.px + (sx - VW / 2) / (U * CAM.zoom), z: CAM.py + (sy - VH / 2) / (U * CAM.zoom * OBL.a) }; }
// what is under a screen point: the samurai's body, a big item, a companion down, the fallen, a pickup, else the floor
function pick(p) {
  // every body or marker whose box holds the point; the one whose middle is nearest the click wins
  let best = null, d0 = 1e9;
  CLICK.dbg = { sx: Math.round(p.sx), sy: Math.round(p.sy), x: Math.round(p.x), z: Math.round(p.z), boxes: [] };
  const over = (x, z, w, h, g) => { const [fx, fy] = toScreen(x, 0, z), [, hy] = toScreen(x, h, z); CLICK.dbg.boxes.push([g.kind, Math.round(fx), Math.round(hy), Math.round(fy)]); if (Math.abs(p.sx - fx) < w && p.sy < fy + 6 && p.sy > hy - 4) {
    const d = Math.hypot(p.sx - fx, p.sy - (fy + hy) / 2); if (d < d0) { d0 = d; best = g; } } };
  for (const f of living()) over(f.x, f.z, 14, 26, { kind: 'foe', foe: f });
  for (const it of BIG) if (usable(it)) over(it.x, it.z, it.w + 4, it.h, { kind: 'item', it, x: it.x, z: it.z });
  for (const al of PARTY.downed()) over(al.x, al.z, 14, 16, { kind: 'lift', al, x: al.x, z: al.z });
  if (best) return best;
  for (const f of FALLEN) if (Math.hypot(f.x - p.x, f.z - p.z) < 8) return { kind: 'harvest', x: f.x, z: f.z };
  for (const it of PICKUPS) if (!it.relic && Math.hypot(it.x - p.x, it.z - p.z) < 8) return { kind: 'floor', x: it.x, z: it.z };
  return { kind: 'floor', x: p.x, z: p.z };
}
export function initClick(canvas) {
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.pointerType === 'touch' || CLICK.swipeMouse || CLICK.blocked(e)) return;
    clickAt(floorAt(canvas, e.clientX, e.clientY));
  });
}
export function clickAt(p) {
  const g = pick(p); CLICK.log.push(g.kind);
  if (g.kind === 'foe' && CP.prompt && CP.prompt.foe === g.foe) { answer(CP.prompt.ans === 'K' ? 'K' : 'J'); return g.kind; }
  CLICK.goal = g; CLICK.path = null; CLICK.mark = { x: g.kind === 'foe' ? g.foe.x : g.x, z: g.kind === 'foe' ? g.foe.z : g.z, t: W.t, kind: g.kind };
  return g.kind;
}
// once a game step: the direction the click's path asks for (or null), handed to his controller in place of the keys
export function clickDir(keysDir) {
  const g = CLICK.goal, hero = CTX.hero; if (!g) return null;
  if (keysDir != null || CTX.busy) { if (keysDir != null) CLICK.goal = null; return null; }
  if (CUTS.has(hero.state) && g.kind !== 'foe') { CLICK.goal = null; return null; }   // he cut: the click is spent
  if (g.kind === 'foe' && g.foe.dead) { CLICK.goal = null; return null; }
  const tx = g.kind === 'foe' ? g.foe.x : g.x, tz = g.kind === 'foe' ? g.foe.z : g.z, d = Math.hypot(tx - hero.x, tz - hero.z);
  const near = g.kind === 'foe' ? 22 : g.kind === 'item' ? LOCK - 6 : g.kind === 'floor' ? 3 : 14;
  if (d < near) { CLICK.goal = null; CLICK.path = null; arrive(g); return null; }
  if (!CLICK.path || W.t - CLICK.path.t > .5) CLICK.path = { t: W.t, pts: findPath(hero.x, hero.z, tx, tz, hero.r) || [[tx, tz]] };
  let [px, pz] = CLICK.path.pts[0]; if (Math.hypot(px - hero.x, pz - hero.z) < 4 && CLICK.path.pts.length > 1) { CLICK.path.pts.shift(); [px, pz] = CLICK.path.pts[0]; }
  return hOf(px - hero.x, pz - hero.z);
}
function arrive(g) {
  if (g.kind === 'foe') press('KeyJ');
  else if (g.kind === 'item') { IT.locked = g.it; IT.taps.push({ k: 'e', age: 0 }); }
  else if (g.kind === 'lift' || g.kind === 'harvest') { IT.eDown = true; IT.eHeld = 0; CLICK.holdE = g.kind; }
}
// a held E from a click lets go when its lift or Harvest is over
export function tickClick() { if (CLICK.holdE && IT.eHeld > .3 && !IT.lifting && !IT.harvesting) { IT.eDown = false; CLICK.holdE = null; } }
// the destination: a small ring on the floor that closes and fades
export function drawClick(g) { const m = CLICK.mark; if (!m) return; const k = (W.t - m.t) / .5; if (k > 1) { CLICK.mark = null; return; }
  const [x, y] = toScreen(m.x, 0, m.z), r = 10 - 6 * k; g.globalAlpha = 1 - k; g.fillStyle = m.kind === 'foe' ? '#ff5a4a' : COL.fx;
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; g.fillRect(Math.round(x + Math.cos(a) * r * 2) & ~1, Math.round(y + Math.sin(a) * r * OBL.a * 2) & ~1, 2, 2); } g.globalAlpha = 1; }
