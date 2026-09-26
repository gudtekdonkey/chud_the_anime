import { COL } from '../config.js';
import { P, S, INV } from '../state.js';
import { zap } from '../fx/bolts.js';
import { rr, spark } from '../fx/util.js';
import { setState } from '../player/actions.js';
import { qiAdd, chainHit } from '../player/qi.js';
import { drawS } from '../ui/sprites.js';
import { REMAINS } from './item-sprites.js';
import { addExp, has } from './inventory.js';
import { arc } from './item-fx.js';
import { putOut } from './quick.js';
import { DUMMIES } from '../world/dummies.js';

// ---- Harvest (hold E near the fallen): their remains stream into him as EXP ----
// until real kills exist, two placeholder remains lie in the room; onKill() adds a real body (draw: false, it draws itself)
export const FALLEN = [];
export function addFallen(x, y, exp = 60, draw = true) { FALLEN.push({ x, y, exp, left: exp, draw }); }
addFallen(178, 152); addFallen(84, 128);
const RANGE = 40, RATE = 50;   // px (y counts 1.6x); EXP per second
const inRange = f => f.left > 0 && Math.hypot(f.x - P.x, (f.y - P.y) * 1.6) < RANGE;
export const harvestable = () => FALLEN.find(inRange);
export function startHarvest() { const f = harvestable(); if (!f) return false; setState('harvest'); P.face = Math.sign(f.x - P.x) || P.face; return true; }
export function harvest(dt, holding) {
  const f = harvestable();
  if (!holding || !f) { setState('idle'); return; }
  const n = Math.min(f.left, RATE * dt); f.left -= n; addExp(n);
  if ((P.hv = (P.hv || 0) + dt) > .03) { P.hv = 0; arc(f.x + rr(-8, 8), f.y - rr(0, 4), { dur: .45, h: rr(4, 10), col: '#a08288', col2: COL.fx, trail: false }); }
}
export function fallenDrawables() { return FALLEN.filter(f => f.draw && f.left > 0).map(f => ({ y: f.y, d: () => drawS(REMAINS, f.x, f.y, { alpha: .35 + .65 * f.left / f.exp }) })); }

// ---- Hooks for the enemies and assassination work, and the relics that ride on them ----
// a kill: its body becomes harvestable, and the next sheath click can carry the Sageo Knot's shock
export function onKill(e) { addFallen(e.x, e.y, 60, false); P.killClick = 1.5; }
// an execution: the Temple Bell rings for +25% Qi
export function onExecution() { if (has('bell')) qiAdd(.25); }
// the sheath click: Sageo Knot shocks enemies close by if he just killed
export function sheathClick() {
  if (!(P.killClick > 0) || !has('knot')) return; P.killClick = 0;
  for (const d of DUMMIES) if (Math.hypot(d.x - P.x, (d.y - P.y) * 1.4) < 56) { zap(P.x + P.face * 3, P.y - 10, d.x, d.y - 14, .18, 2.5, COL.fx2, { every: 1 }); chainHit(d); }
}
// damage to him (n in 0..1): a hit puts the incense out; the Paper Crane saves one killing blow per area, glitching him out at 1 health
export function hurt(n) {
  putOut(); if (P.state === 'incense') setState('idle');
  if (INV.hp - n <= 0 && has('crane') && !P.craneUsed) { P.craneUsed = true; INV.hp = .02; P.glitchNow = .3; P.after = 1.5; return; }
  INV.hp = Math.max(0, INV.hp - n); S.shake = Math.max(S.shake, 1 / 60); P.flash = .034;
  if (INV.hp <= 0) setState('death');
}
export function tickHarvest(dt) { P.killClick = Math.max(0, (P.killClick || 0) - dt); for (let i = FALLEN.length - 1; i >= 0; i--) if (FALLEN[i].left <= 0) FALLEN.splice(i, 1); }
