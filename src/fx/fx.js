import { COL } from '../config.js';
import { g } from '../screen.js';
import { P, frags, slashes, cuts, zaps, rings, moons, voids, smoke, cracks } from '../state.js';
import { zap, boltPts } from './bolts.js';
import { updateDebris } from './debris.js';
import { drawMoon, moonLight } from './moon.js';
import { drawSlash } from './slash.js';
import { rr, sgn, FRAG_COLS, residue } from './util.js';
import { drawVoid } from './void.js';
import { updateQi } from '../player/qi.js';
import { DUMMIES } from '../world/dummies.js';

// ---- Engine effects: drawn in world space, never in the sheets, so they survive real art replacing the placeholder ----
export function storm(x, y) {
  P.flurry = .55; P.after = 3;   // the flurry of bolts, then a few seconds of random glitching as the jump settles
}
export function updateFx(dt) {
  updateDebris(dt);
  P.glitchNow = Math.max(0, (P.glitchNow || 0) - dt);
  if (P.after > 0) { P.after -= dt;
    if (Math.random() < dt * 2.2 * Math.min(1, P.after / 1.5 + .3)) { P.glitchNow = rr(.05, .12);
      const x = P.x + rr(-6, 6), y = P.y - rr(6, 24); zap(x, y, x + rr(-6, 6), y + rr(-5, 5), rr(.04, .08), 1.5, Math.random() < .5 ? COL.fx : '#ffffff');
      if (Math.random() < .5) residue(P.x, P.y, 2); } }
  for (const c of cracks) c.life -= dt;
  for (let i = cracks.length - 1; i >= 0; i--) if (cracks[i].life <= 0) cracks.splice(i, 1);
  for (const m of smoke) { m.x += m.vx * dt; m.y += m.vy * dt; m.r += m.vr * dt; m.vx *= .96; m.life -= dt; }
  for (let i = smoke.length - 1; i >= 0; i--) if (smoke[i].life <= 0) smoke.splice(i, 1);
  if (P.flurry > 0) { P.flurry -= dt;
    const k = P.flurry / .5; // dense at first, thinning out
    if (Math.random() < .3 + .6 * k) { const a = rr(0, 6.28), R = rr(4, 11), cx = P.x, cy = P.y - 12;
      const x0 = cx + Math.cos(a) * R, y0 = cy + Math.sin(a) * R * 1.2, a2 = a + sgn() * rr(.6, 1.2);
      zap(x0, y0, cx + Math.cos(a2) * (R + rr(-2, 4)), cy + Math.sin(a2) * (R + 2) * 1.2, rr(.05, .1), 1.6, [COL.fx, COL.fx2, '#ffffff'][Math.random() * 3 | 0]); }
    if (Math.random() < .5 * k) { const a = rr(0, 6.28); frags.push({ x: P.x + Math.cos(a) * rr(3, 9), y: P.y - rr(3, 24), w: 1 + (Math.random() * 2 | 0), col: FRAG_COLS[Math.random() * 4 | 0],
      vx: Math.cos(a) * rr(8, 20), vy: -rr(3, 12), life: rr(.3, .6), max: .6, jx: 0, on: true }); } }
  for (const f of frags) { f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt;
    if (Math.random() < .05) f.jx = f.jx ? 0 : sgn();
    f.on = Math.random() < .3 + .65 * f.life / f.max; } // flickers more as it dies
  for (const z of zaps) { z.life -= dt;
    if (--z.tick <= 0) { z.pts = boltPts(z); z.tick = z.every || 2 + (Math.random() * 2 | 0); } // re-jag every 2-3 frames
    z.on = Math.random() < (z.every === 1 ? .9 : .7); }
  for (const r of rings) r.life -= dt;
  // a shocked dummy keeps 2-3 short bolts crawling over it
  for (const dummy of DUMMIES) if (dummy.zap > 0) { dummy.zap -= dt;
    if (zaps.filter(z => z.dz === dummy).length < 3) { const x = dummy.x + rr(-7, 7), y = dummy.y - rr(3, 27);
      zap(x, y, x + rr(-10, 10), y + rr(-8, 8), rr(.05, .09), 2.5, Math.random() < .5 ? '#ffffff' : COL.fx2, { every: 1, dz: dummy }); } }
  updateQi(dt);
  for (const L of [frags, zaps, rings]) for (let i = L.length - 1; i >= 0; i--) if (L[i].life <= 0) L.splice(i, 1);
}
export function drawFloorFx() {
  for (const m of moons) moonLight(m);
  for (const c of cracks) { const k = c.life / c.max; g.globalAlpha = Math.min(1, k * 2);
    for (let i = 0; i < c.pts.length; i += 2) { g.fillStyle = i > c.pts.length * .8 && k > .6 ? COL.fx : '#24282a'; g.fillRect(c.pts[i], c.pts[i + 1], 1, 1); } }
  g.globalAlpha = 1;
}
export function drawFx() {
  for (const m of smoke) { g.globalAlpha = Math.min(.85, m.life / m.max * 1.2); g.fillStyle = m.col; const r = Math.round(m.r);
    for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); g.fillRect(Math.round(m.x) - w, Math.round(m.y) + dy, 2 * w + 1, 1); } }
  g.globalAlpha = 1;
  for (const s of slashes) drawSlash(s);
  for (const c of cuts) { const k = c.life / c.max, x0 = Math.min(c.x0, c.x1), w = Math.abs(c.x1 - c.x0);
    g.globalAlpha = Math.min(1, k * 1.5); g.fillStyle = '#ffffff'; g.fillRect(x0, c.y, w, 1);
    if (k > .6) { g.fillRect(x0 + 6, c.y - 1, w - 12, 3); g.fillStyle = COL.eye; g.fillRect(x0 - 3, c.y, 3, 1); g.fillRect(x0 + w, c.y, 3, 1); } } // fat for its first frames, then a hairline
  for (const r of rings) { const t = r.max ? 1 - r.life / r.max : 0, sc = 1 + (r.grow || 0) * t, rx = r.rx * sc, ry = r.ry * sc;
    g.globalAlpha = r.grow ? Math.min(1, 1.6 * (1 - t)) : 1; g.fillStyle = r.col || '#ffffff'; // growing ripples fade as they spread
    for (let a = 0; a < Math.PI * 2; a += .5 / rx) g.fillRect(Math.round(r.x + Math.cos(a) * rx), Math.round(r.y + Math.sin(a) * ry), 1, 1); }
  for (const v of voids) drawVoid(v);
  for (const m of moons) drawMoon(m);
  for (const z of zaps) { if (!z.on) continue;
    g.globalAlpha = Math.min(1, z.life / z.max * 1.8); g.fillStyle = z.col;
    for (let i = 0; i < z.pts.length; i += 2) g.fillRect(z.pts[i], z.pts[i + 1], 1, 1); }
  for (const f of frags) { if (!f.on) continue;
    g.globalAlpha = Math.min(1, f.life / f.max * 1.5); g.fillStyle = f.col; g.fillRect(Math.round(f.x + f.jx), Math.round(f.y), f.w, 1); }
  g.globalAlpha = 1;
}
