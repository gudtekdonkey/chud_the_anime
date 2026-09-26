import { COL, SQ } from '../config.js';
import { g } from '../screen.js';
import { P, S, frags, moons } from '../state.js';
import { crescent } from './slash.js';
import { rr, FRAG_COLS, ring, spark, dust, scrFlash } from './util.js';
import { hit, burst } from '../player/hits.js';

// ---- Crescent Moon (O): charge in place, release one giant crescent that sweeps into being along its arc ----
const arcA = sw => -1.75 + 3.5 * sw;                                     // the arc's reach: it sweeps from overhead down through the front
const moonPt = (m, a, r) => [m.x + m.face * Math.cos(a) * r, m.y + Math.sin(a) * r * SQ];
export function unleashMoon(pow) {
  const k = .35 + .65 * pow, R = Math.round(23 * (1 + 2 * k)), cx = P.x + P.face * R * .25, cy = P.y - 13;
  moons.push({ x: cx, y: cy, fy: P.y, face: P.face, R, d: 6 + 9 * k, k, age: 0, SW: .15, HOLD: .3 + .14 * k, GLOW: .55, seed: Math.random(), echo: 0, shat: false, hit: false, struck: [] });
  P.flash = .05; scrFlash(.08, .12 + .16 * pow); S.shake = .1; P.shakeAmp = 1 + Math.round(2 * pow);
  ring(P.x + P.face * R * .3, P.y + 1, R * .35, R * .12, .5, 2.2, COL.fx2); ring(P.x, P.y + 1, 12, 5, 2 / 60);
  dust(10 + 10 * pow | 0);
}
export function updateMoons(dt) {
  for (const m of moons) { m.age += dt; const sw = Math.min(1, m.age / m.SW), A = arcA(sw);
    if (m.age < m.SW) {
      // echoes: smaller see-through arcs peel off behind the sweep; motes stream off its white-hot front
      if ((m.echo -= dt) <= 0) { m.echo = .035; crescent(m.x - m.face * rr(5, 12), m.y + rr(-4, 4), m.face, rr(-.35, .35), 1, m.R * rr(.4, .65), 4, .03, .22, .5); }
      for (let i = 0; i < 3; i++) { const [x, y] = moonPt(m, A, m.R - rr(0, m.d)), life = rr(.25, .5);
        frags.push({ x, y, w: 1 + (Math.random() * 2 | 0), col: i % 2 ? '#ffffff' : COL.fx2, vx: -m.face * rr(10, 40), vy: rr(-20, 4), life, max: life, jx: 0, on: true }); } }
    if (!m.hit && sw >= .5) { m.hit = true; const before = new Set(P.struck); hit('cm', m.x + m.face * m.R * .45, m.y, m.R * 1.05); m.struck = [...P.struck].filter(d => !before.has(d)); }
    if (m.age >= m.SW && m.age < m.SW + m.HOLD && Math.random() < .7) { const [x, y] = moonPt(m, rr(-1.6, 1.6), m.R - rr(0, 3)), life = rr(.3, .6);
      frags.push({ x, y, w: 1, col: Math.random() < .5 ? COL.fx2 : '#ffffff', vx: m.face * rr(2, 10), vy: -rr(6, 16), life, max: life, jx: 0, on: true }); }
    if (!m.shat && m.age >= m.SW + m.HOLD) { m.shat = true; shatter(m); } }
  for (let i = moons.length - 1; i >= 0; i--) if (moons[i].age > moons[i].SW + moons[i].HOLD + moons[i].GLOW) moons.splice(i, 1);
}
// it breaks: long slivers drift back off the arc, heavier shards tumble to the floor, whatever it cut bursts
function shatter(m) {
  for (let i = 0; i < 26 + 20 * m.k; i++) { const a = rr(-1.6, 1.6), [x, y] = moonPt(m, a, m.R - rr(0, m.d)), life = rr(.35, .8);
    frags.push({ x, y, w: 2 + (Math.random() * 4 | 0), col: FRAG_COLS[i % 3], vx: m.face * Math.cos(a) * rr(8, 40), vy: Math.sin(a) * rr(8, 26) - rr(0, 8), life, max: life, jx: 0, on: true }); }
  for (let i = 0; i < 16 + 12 * m.k; i++) { const a = rr(-1.6, 1.6), [x, y] = moonPt(m, a, m.R - rr(0, m.d));
    spark(x, y, m.face * Math.cos(a) * rr(20, 70), Math.sin(a) * rr(10, 40) - rr(10, 30), rr(.4, .8), ['#ffffff', COL.fx2, COL.fx][i % 3], true, 90); }
  ring(m.x + m.face * m.R * .4, m.fy + 1, m.R * .5, m.R * .16, .3, 1.2, '#ffffff');
  if (m.struck.length) { S.hitstop = .06; S.shake = 2 / 60; for (const d of m.struck) burst(d, 1 + .5 * m.k); }
}
export function drawMoon(m) {
  const sw = Math.min(1, m.age / m.SW), A = arcA(sw), gk = Math.max(0, (m.age - m.SW - m.HOLD) / m.GLOW); // gk: 0 until it shatters, then 0→1 as the afterglow dies
  const R = m.R + gk * 3, d = Math.max(1, m.d * (1 - gk * .7)), ox = Math.round(m.x), oy = Math.round(m.y), f = m.face, RR = Math.ceil(R) + 3;
  const shim = [], edge = [], core = [], body = [], trail = [], tip = [], flow = [], on = Array.from({ length: 48 }, () => Math.random() < .6);
  for (let py = -RR; py <= RR; py++) for (let px = -RR; px <= RR; px++) {
    const lx = px * f, ly = py / SQ, ro = Math.hypot(lx, ly); if (ro > R + 2.5) continue;
    const a = Math.atan2(ly, lx); if (a > A) continue;
    if (ro > R) { // the pale outer shimmer, flickering in chunks, only along the arc's own span
      if (gk < .5 && on[(a * R / 4 | 0) + 24 & 47] && Math.hypot(R * Math.cos(a) + d, R * Math.sin(a) - d * .35) > R + .5) shim.push(ox + px, oy + py); continue; }
    const ri = Math.hypot(lx + d, ly - d * .35); if (ri <= R) continue;
    if (gk > 0 && ((a * R / 5 + m.seed) % 1 + 1) % 1 < gk * .9) continue;  // the shatter: gaps widen until only slivers are left
    const dep = R - ro;
    // inside the body, thin pale filaments of energy stream along the arc, crawling inward as it hangs
    const fil = ((dep - m.age * 30) % 5 + 5) % 5 < 1 && on[(a * R / 6 | 0) + 24 & 47];
    (sw < 1 && A - a < .14 ? tip : dep < 1.2 ? edge : dep < 3.5 + m.k * 1.5 ? core : ri - R < 1 ? trail : fil ? flow : body).push(ox + px, oy + py);
  }
  const put = (q, col, al) => { g.globalAlpha = al; g.fillStyle = col; for (let i = 0; i < q.length; i += 2) g.fillRect(q[i], q[i + 1], 1, 1); };
  const fade = 1 - gk;
  put(shim, COL.fx2, .35 * fade); put(body, COL.fx, .45 * fade); put(flow, COL.fx2, .6 * fade); put(trail, COL.fx2, .9 * fade);
  put(edge, gk ? COL.fx : COL.eye, fade); put(core, gk ? COL.fx2 : '#ffffff', 1 - gk * .75); put(tip, '#ffffff', 1);
  g.globalAlpha = 1;
}
// its light on the floor: a dithered pool under the arc and a flattened reflection of its rim, fading with the afterglow
export function moonLight(m) {
  const sw = Math.min(1, m.age / m.SW), gk = Math.max(0, (m.age - m.SW - m.HOLD) / m.GLOW), I = sw * (1 - gk); if (I <= 0) return;
  const cx = Math.round(m.x + m.face * m.R * .35), cy = Math.round(m.fy + 3), rx = Math.round(m.R * .85), ry = Math.max(4, Math.round(m.R * .2));
  const lv = [[], [], []];
  for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) { const q = (dx / rx) ** 2 + (dy / ry) ** 2; if (q > 1) continue;
    const l = q < .25 ? 2 : q < .6 ? 1 : 0; if (l === 0 && (dx + dy) & 1) continue; lv[l].push(cx + dx, cy + dy); }
  g.fillStyle = COL.fx; [.1, .14, .2].forEach((al, l) => { g.globalAlpha = al * I; for (let i = 0; i < lv[l].length; i += 2) g.fillRect(lv[l][i], lv[l][i + 1], 1, 1); });
  g.globalAlpha = .35 * I; g.fillStyle = COL.fx2;
  for (let a = -1.55; a <= Math.min(arcA(sw), 1.55); a += .5 / m.R) g.fillRect(Math.round(m.x + m.face * Math.cos(a) * m.R * .95), Math.round(cy + 2 - Math.sin(a) * m.R * .12), 1, 1);
  g.globalAlpha = 1;
}
