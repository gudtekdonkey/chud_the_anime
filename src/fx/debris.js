import { COL } from '../config.js';
import { g } from '../screen.js';
import { P, cracks, debris } from '../state.js';
import { line } from './bolts.js';
import { rr, sgn } from './util.js';

// matter he pulls in: each chip orbits him on a flat ellipse, tightening and speeding up, and lifts with him
export const STONE = ['#5f6562', '#3a3f3d', '#6d7370', '#4f5552', '#2e3231'];
export function gather(x, y) {
  if (debris.length > 46) return;
  const a = rr(0, 6.28);
  debris.push({ cx: x, cy: y, a, r: rr(40, 66), r1: rr(9, 20), h: 0, h1: rr(2, 12), w: rr(1.2, 2.6) * sgn(), size: Math.random() < .3 ? 2 : 1,
    col: Math.random() < .12 ? COL.fx : STONE[Math.random() * STONE.length | 0], state: 'in', vx: 0, vy: 0, vh: 0, life: 9 });
}
export const debrisXY = d => [Math.round(d.cx + Math.cos(d.a) * d.r), Math.round(d.cy + Math.sin(d.a) * d.r * .45 - d.h)];
export function fling(x, y) {
  for (const d of debris) { const [dx, dy] = [Math.cos(d.a), Math.sin(d.a)];
    d.state = 'out'; d.px = d.cx + dx * d.r; d.py = d.cy + dy * d.r * .45; d.vx = dx * rr(90, 170); d.vy = dy * rr(40, 80); d.vh = rr(30, 70); d.life = rr(.5, .9); }
}
export function updateDebris(dt) {
  const sweeping = P.state === 'sweep';
  for (const d of debris) {
    if (d.state === 'in') {
      if (!sweeping) { d.state = 'out'; d.px = d.cx + Math.cos(d.a) * d.r; d.py = d.cy + Math.sin(d.a) * d.r * .45; d.vx = d.vy = 0; d.vh = 0; d.life = .6; continue; }
      d.cx = P.x; d.cy = P.y;
      d.r += (d.r1 - d.r) * Math.min(1, dt * 2.2);                       // drift in
      const spin = 1 + Math.min(4, P.t * 1.6);                           // and spin faster as the power builds
      d.a += d.w * spin * dt;
      d.h += ((d.h1 + P.z * 2.2) - d.h) * Math.min(1, dt * 3);           // lift, and rise with him in the cyclone
    } else {
      d.px += d.vx * dt; d.py += d.vy * dt; d.vx *= .97; d.vy *= .97;
      d.vh -= 260 * dt; d.h = Math.max(0, d.h + d.vh * dt); if (d.h === 0) { d.vx *= .6; d.vy *= .6; }
      d.life -= dt;
    }
  }
  for (let i = debris.length - 1; i >= 0; i--) if (debris[i].life <= 0) debris.splice(i, 1);
}
export function drawDebris(d) {
  const [x, y] = d.state === 'in' ? debrisXY(d) : [Math.round(d.px), Math.round(d.py - d.h)];
  g.globalAlpha = d.state === 'out' ? Math.min(1, d.life * 2) : 1;
  if (d.h > 1) { g.fillStyle = 'rgba(20,24,24,.3)'; g.fillRect(x, y + Math.round(d.h), d.size, 1); }
  g.fillStyle = d.col; g.fillRect(x, y, d.size, d.size);
  g.globalAlpha = 1;
}
// jagged dark cracks from the slam point, cyan at the tip, lingering a second
export function crack(x, y) {
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + rr(-.3, .3), out = []; let px = x, py = y;
    for (let k = 0; k < 4; k++) { const nx = px + Math.cos(a + rr(-.5, .5)) * rr(4, 8), ny = py + Math.sin(a + rr(-.5, .5)) * rr(2, 4); line(out, px, py, nx, ny); px = nx; py = ny; }
    cracks.push({ pts: out, life: 1.1, max: 1.1 }); }
}
