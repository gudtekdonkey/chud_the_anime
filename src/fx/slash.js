import { COL, SQ } from '../config.js';
import { g } from '../screen.js';
import { P, frags, slashes, cuts } from '../state.js';
import { updateMoons } from './moon.js';
import { rr } from './util.js';
import { updateVoids } from './void.js';
import { EL } from './element.js';

// ---- Crescents and cut lines ----
export const SLASH_HOLD = .05, SLASH_BREAK = .15;
// a crescent smear in front of him; big = the double slash's larger, tilted cuts
// rot tilts its bulge up (-) or down (+); a big one sits back from the target so two tilted ones cross over it like an X
function smear(face, rot = 0, flip = 1, big = false) {
  const R = big ? 23 : 16, tx = P.x + face * (big ? 22 : 5), ty = P.y - 12 - P.z, back = big ? R * .45 : 0;
  crescent(tx - face * Math.cos(rot) * back, ty - Math.sin(rot) * back * SQ, face, rot, flip, R, big ? 6 : 5, big ? .09 : SLASH_HOLD);
}
// any crescent: the skills want other sizes, spots, slower breaks and see-through echoes (a)
export function crescent(x, y, face, rot, flip, R, d, hold, brk = SLASH_BREAK, a = 1) {
  slashes.push({ x, y, face, rot, flip, R, d, hold, brk, a, age: 0, broke: false, seed: Math.random() });
}
// the strike beat shared by every cut: crescent, whole-body flash
export function strike(rot, flip, big) { smear(P.face, rot, flip, big); P.flash = .034; }
// slashes and cut lines age only outside hit pause, so the cut hangs frozen on impact
export function updateCuts(dt) {
  for (const s of slashes) { s.age += dt;
    if (EL.cur.kit && s.age < s.hold + .06 && Math.random() < .5 + s.R / 60) { const a = rr(-1.2, 1.2), v = rr(30, 80) * s.a; // the element comes off the blade's edge
      EL.cur.kit.spark(s.x + s.face * Math.cos(a) * s.R, s.y + Math.sin(a) * s.R * .8, s.face * Math.cos(a) * v, Math.sin(a) * v * .8, .2); }
    if (s.age > s.hold && !s.broke) { s.broke = true; // shed a few slivers that trail back off the arc (more off a bigger arc, slower off a slow break)
      const sl = s.brk / SLASH_BREAK;
      for (let i = 0; i < 5 * Math.max(1, s.R / 20) * s.a; i++) { const a = rr(-1.3, 1.3), life = rr(.1, .16) * sl;
        frags.push({ x: s.x + s.face * Math.cos(a) * s.R, y: s.y + Math.sin(a) * s.R * .8, w: 2 + (Math.random() * 3 | 0), col: i % 2 ? COL.core : COL.fx2,
          vx: -s.face * rr(20, 50) / Math.sqrt(sl), vy: rr(-10, 10), life, max: life, jx: 0, on: true }); } } }
  for (const c of cuts) c.life -= dt;
  updateMoons(dt); updateVoids(dt);
  for (const L of [slashes, cuts]) for (let i = L.length - 1; i >= 0; i--) if (L[i].age > L[i].hold + L[i].brk || L[i].life <= 0) L.splice(i, 1);
}
export function drawSlash(s) {
  const k = Math.max(0, (s.age - s.hold) / s.brk); // 0 while it holds full size, then 0→1 as it thins and breaks
  const d = Math.max(1, s.d * (1 - k)), R = s.R + k * 2, c = Math.cos(s.rot), sn = Math.sin(s.rot), ox = Math.round(s.x), oy = Math.round(s.y);
  const core = [], edge = [], trail = [], body = [];
  for (let py = -Math.ceil(R) - 1; py <= Math.ceil(R) + 1; py++) for (let px = -Math.ceil(R) - 1; px <= Math.ceil(R) + 1; px++) {
    const lx0 = px * s.face, dy = py / SQ, lx = lx0 * c + dy * sn, ly = (-lx0 * sn + dy * c) * s.flip;
    const ro = Math.hypot(lx, ly); if (ro > R) continue;
    const ri = Math.hypot(lx + d, ly - d * .35); if (ri <= R) continue; // the inner circle, nudged so one tip is fatter
    if (s.R > 30 && R - ro > 4 && ri - R >= 1) { body.push(ox + px, oy + py); continue; } // a giant arc keeps a see-through body behind its white band
    if (k > 0 && ((Math.atan2(ly, lx) * R / 5 + s.seed) % 1 + 1) % 1 < k * .85) continue; // gaps widen until only slivers are left
    (R - ro < 1.2 ? edge : ri - R < 1 ? trail : core).push(ox + px, oy + py); // cyan leading edge, pale trailing edge
  }
  g.globalAlpha = .4 * (1 - k * .5) * s.a; g.fillStyle = COL.fx; for (let i = 0; i < body.length; i += 2) g.fillRect(body[i], body[i + 1], 1, 1);
  g.globalAlpha = (1 - k * .5) * s.a;
  g.fillStyle = COL.eye; for (let i = 0; i < edge.length; i += 2) g.fillRect(edge[i], edge[i + 1], 1, 1);
  g.fillStyle = COL.fx2; for (let i = 0; i < trail.length; i += 2) g.fillRect(trail[i], trail[i + 1], 1, 1);
  g.fillStyle = COL.core; for (let i = 0; i < core.length; i += 2) g.fillRect(core[i], core[i + 1], 1, 1);
  g.globalAlpha = 1;
}
