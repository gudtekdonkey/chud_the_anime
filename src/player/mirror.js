import { COL } from '../config.js';
import { P, frags, mirrors } from '../state.js';
import { SHEETS } from '../anims/sheets.js';
import { SLASH_BREAK, crescent } from '../fx/slash.js';
import { rr, residue, spark } from '../fx/util.js';
import { tear } from '../fx/void.js';
import { setState } from './actions.js';
import { hitOne, burst } from './hits.js';
import { tv } from './mastery.js';
import { ease } from 'ronin-engine/rig/pose.js';
import { ENEMIES, viewTo } from '../world/enemies.js';
import { T, powerCast } from './power.js';
import { turner } from '../rig/turn.js';
import { PF } from './facing.js';

// ---- Mirror Meditation (N): he meditates while glitching mirror images step out of him and cut the nearest enemies ----
const MS = .18, MD = .12, MC = .42, MF = .32; // step out, dash, cut, dissolve
export function meditate() {
  setState('meditate'); P.aura = 0;
  const near = ENEMIES.map((d, i) => ({ d, i, r: Math.hypot(d.x - P.x, (d.y - P.y) * 1.3) })).filter(q => q.d.alive).sort((a, b) => a.r - b.r);
  // nobody left standing: the images still step out and cut the air around him
  if (!near.length) for (let j = 0; j < 3; j++) near.push({ d: { x: P.x + (j % 2 ? -1 : 1) * 34, y: P.y + (j - 1) * 14 }, i: -1, r: 0 });
  const more = T('mirror', 'more') + tv('mirror', 'more'), n = Math.max(3 + more, Math.min(5 + more, near.filter(q => q.r < 200 + tv('mirror', 'range')).length));   // more images with power and the tree
  powerCast();
  P.mq = Array.from({ length: n }, (_, j) => near[j % near.length]);   // spread across different enemies, nearest first
}
export function spawnMirror(j, q) {
  const side = j % 2 ? -1 : 1;
  const ox = P.x + side * rr(13, 18), oy = P.y + (j % 3 - 1) * 5;
  // it steps out facing the way it runs, turning from the facing he had when it left him (player/draw.js)
  mirrors.push({ j, d: q.d, di: q.i, t: 0, x: P.x, y: P.y, x0: P.x, y0: P.y, ox, oy, face: side, view: viewTo(ox - P.x, oy - P.y), T: turner(PF.id),
    st: 'run', f: 0, a: 0, white: 0, glitch: .4, done: {} });
  residue(P.x, P.y, 3); spark(P.x, P.y - 14, 0, -8, .15, '#ffffff', false, 0);
}
export function updateMirrors(dt) {
  for (const m of mirrors) { const t = (m.t += dt); m.white -= dt;
    if (t < MS) { const k = ease(t / MS); m.x = m.x0 + (m.ox - m.x0) * k; m.y = m.y0 + (m.oy - m.y0) * k; m.a = Math.min(1, t / MS * 1.4); m.st = 'run'; m.f = (t * 16 | 0) % 8; }
    else if (t < MS + MD) {
      if (!m.done.dash) { m.done.dash = 1; m.face = Math.sign(m.d.x - m.x) || 1; m.dx0 = m.x; m.dy0 = m.y; m.tx = m.d.x - m.face * 15; m.ty = m.d.y + 1; residue(m.x, m.y, 3); }
      const k = (t - MS) / MD, px = m.x, py = m.y; m.x = m.dx0 + (m.tx - m.dx0) * k * k; m.y = m.dy0 + (m.ty - m.dy0) * k * k; m.st = 'tele'; m.f = 3; m.glitch = 1.5;
      const n = Math.hypot(m.x - px, m.y - py) | 0; for (let i = 0; i < n; i += 3) spark(px + (m.x - px) * i / n, py - rr(4, 22), 0, 0, rr(.08, .16), i % 2 ? COL.fx : COL.fx2, false, 0);
      if (Math.random() < .5) P.ghosts.push({ state: 'tele', f: 3, x: m.x, y: m.y, face: m.face, age: 0, hold: 0, white: 0 }); }
    else if (t < MS + MD + MC) { const tc = t - MS - MD; m.st = 'slash1'; m.f = Math.min(SHEETS.slash1.n - 1, tc * 30 | 0); m.glitch = .4; m.y = m.ty;
      if (!m.done.cut && tc >= .16) { m.done.cut = 1; m.white = .05;
        crescent(m.x + m.face * 5, m.y - 12, m.face, .15, 1, 16, 5, .05, SLASH_BREAK, .9); tear(m.x + m.face * 6, m.y - 18, m.x + m.face * 24, m.y - 8, 2, .22); hitOne(m.d, m.di, 'mi' + m.j, m.x, m.y);
        for (let k = 0; k < 4; k++) { const life = rr(.06, .12); frags.push({ x: m.x - m.face * rr(4, 18), y: m.y - rr(4, 24), w: 3 + (Math.random() * 6 | 0), col: k % 2 ? '#ffffff' : COL.fx2, vx: m.face * rr(10, 30), vy: 0, life, max: life, jx: 0, on: true }); } }
      // TWIN CUTS: a second, rising cut on the way back; at its deepest the target bursts on it
      const tw = tv('mirror', 'twice'); if (tw && !m.done.cut2 && tc >= .28) { m.done.cut2 = 1; m.white = .04; crescent(m.x + m.face * 5, m.y - 12, m.face, -.5, -1, 15, 4, .05, SLASH_BREAK, .9);
        hitOne(m.d, m.di, 'mi' + m.j + 'b', m.x, m.y); if (tw > 1 && m.d.alive != null) burst(m.d, .6); } }
    else { const k = (t - MS - MD - MC) / MF; m.a = 1 - k; m.glitch = .6 + 3 * k;
      if (!m.done.fade) { m.done.fade = 1; for (let i = 0; i < 12; i++) { const life = rr(.4, .8); frags.push({ x: m.x + rr(-8, 8), y: m.y - rr(2, 28), w: 1 + (Math.random() * 4 | 0), col: [COL.fx, COL.fx2, '#ffffff'][i % 3], vx: rr(-6, 6), vy: rr(-10, -2), life, max: life, jx: 0, on: true }); } } } }
  for (let i = mirrors.length - 1; i >= 0; i--) if (mirrors[i].t > MS + MD + MC + MF) mirrors.splice(i, 1);
}
