import { COL, SQ } from '../config.js';
import { g } from '../screen.js';
import { P, mats, stains, rings } from '../state.js';

// ---- Matter: what an element is made of when it is not lightning. Flames, goo, water, wind, psychic motes, and the stains they leave ----
// Every kit takes the same few calls the storm makes (bolt, spark, trail, frag, residue, travel, step), so each move keeps its
// timing and aim and only the stuff it throws changes.
const R = (a, b) => a + Math.random() * (b - a), S1 = () => Math.random() < .5 ? -1 : 1, pick = a => a[Math.random() * a.length | 0];
const SMOKE = '#3b3634', SCORCH = '#2c2927';
// Qi skills leave nothing on the floor (owner's rule): matter thrown while QI.on or during meditation never stains or ripples when it lands
export const QI = { on: 0 }, qiNow = () => QI.on > 0 || P.state === 'meditate';
export function qiFx(fn) { QI.on++; try { fn(); } finally { QI.on--; } }
export function mat(kind, x, y, vx, vy, life, o = {}) { mats.push({ kind, x, y, vx, vy, life, max: life, gy: y + R(6, 14), ph: R(0, 6.28), nf: qiNow(), ...o }); }
export function stain(kind, x, y, r, life, o = {}) { if (qiNow()) return; stains.push({ kind, x, y, r, life, max: life, ...o }); }
const along = (x0, y0, x1, y1, step, fn) => { const L = Math.hypot(x1 - x0, y1 - y0) || 1, n = Math.max(1, L / step | 0); for (let i = 0; i <= n; i++) fn(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, (x1 - x0) / L, (y1 - y0) / L, i / n); };

const STILL = new Set(['strand', 'whip', 'stretch', 'psi', 'cling', 'bead', 'seek']);   // these place themselves
export function updateMatter(dt) {
  for (const m of mats) { m.life -= dt; const age = m.max - m.life;
    switch (m.kind) {
      case 'flame': m.vy -= 60 * dt; m.vx *= .94; m.x += Math.sin(age * 22 + m.ph) * .25; break;      // buoyant, wavering
      case 'ember': m.vy -= 14 * dt; m.vx *= .97; break;
      case 'smoke': m.vy -= 8 * dt; m.vx *= .95; m.r = (m.r || 1) + dt * 3; break;
      case 'cinder': case 'goo': case 'drop': m.vy += (m.kind === 'goo' ? 280 : 320) * dt;         // they fall, and land on the floor under where they started
        if (m.y >= m.gy && m.vy > 0) { m.life = 0; if (m.nf) break;
          if (m.kind === 'goo') { stain('goo', m.x, m.gy, R(1.5, 3.2) * (m.r || 1), R(2, 3.5)); if (Math.random() < .3) mat('goo', m.x, m.gy - 1, R(-20, 20), -R(20, 40), 1, { gy: m.gy, r: .6 }); }
          if (m.kind === 'drop') { rings.push({ x: m.x, y: m.gy, rx: 2, ry: 1, life: .3, max: .3, grow: 2, col: COL.fx2 }); if (Math.random() < .35) stain('water', m.x, m.gy, R(2, 4), R(1, 2)); }
          if (m.kind === 'cinder') stain('burn', m.x, m.gy, R(1.5, 3), R(.8, 1.6)); } break;
      case 'gust': { const a = m.curl * dt, c = Math.cos(a), s = Math.sin(a); [m.vx, m.vy] = [m.vx * c - m.vy * s, m.vx * s + m.vy * c]; m.vx *= .985; m.vy *= .985; break; }
      case 'leaf': m.vy += 18 * dt; m.vx += Math.sin(age * 7 + m.ph) * 60 * dt; m.vx *= .98; break;
      case 'cling': case 'bead': m.x = P.x + P.face * m.ox; m.y = P.y - P.z + m.oy; m.r = Math.min(m.rm, (m.r || .5) + dt * 5);
        if (m.kind === 'bead') { m.oy += dt * R(4, 14); if (m.oy > -1) m.life = 0; }
        else if (Math.random() < dt * .8) mat('goo', m.x, m.y + m.r, R(-4, 4), R(0, 10), 1, { gy: P.y + R(-2, 3), r: .6, nf: m.nf });   // a drip lets go
        if (m.life <= 0) mat(m.kind === 'bead' ? 'drop' : 'goo', m.x, m.y, P.face * R(-10, 10), R(-10, 10), 1, { gy: P.y + R(-2, 3), nf: m.nf }); break;
      case 'seek': { const u = 1 - Math.max(0, m.life) / m.max, e = u * u, tx = P.x + P.face * m.ox, ty = P.y - P.z + m.oy;
        m.x = m.sx + (tx - m.sx) * e; m.y = m.sy + (ty - m.sy) * e;
        if (m.life <= 0 && m.then && mats.filter(q => q.kind === m.then).length < 60) mats.push({ kind: m.then, ox: m.ox, oy: m.oy, x: tx, y: ty, vx: 0, vy: 0, r: .5, rm: m.rm || 1.6, life: m.hold || .8, max: m.hold || .8, nf: m.nf }); break; }
      case 'mote': m.vx *= .9; m.vy *= .9; m.y += Math.sin(age * 6 + m.ph) * .15; break;
      case 'strand': m.sag += dt * 40; if (Math.random() < dt * 14) { const u = R(.2, .8); const [x, y] = strandAt(m, u); mat('goo', x, y + 1, 0, R(0, 20), 1, { gy: y + R(6, 14), nf: m.nf }); }
        if (m.life <= 0) along(m.x0, m.y0, m.x1, m.y1, 5, (x, y, dx, dy, u) => mat('goo', x, y + Math.sin(u * Math.PI) * m.sag, R(-10, 10), R(0, 20), 1, { gy: y + R(8, 16), nf: m.nf })); break;
      case 'whip': if (m.life <= 0) along(m.x0, m.y0, m.x1, m.y1, 5, (x, y, dx, dy, u) => { const [px, py] = whipAt(m, u); mat('drop', px, py, dx * R(10, 40), -R(10, 50), 1, { gy: py + R(6, 16), nf: m.nf }); }); break;
      case 'stretch': if (!(P.hide > 0)) { m.life = 0; break; } if (Math.random() < dt * 30) { const [x, y] = stretchAt(m, R(.2, .8)); mat('goo', x, y + 2, R(-8, 8), R(0, 15), 1, { gy: y + R(3, 8) }); } break;
    }
    if (!STILL.has(m.kind)) { m.x += m.vx * dt; m.y += m.vy * dt; }
  }
  for (let i = mats.length - 1; i >= 0; i--) if (mats[i].life <= 0) mats.splice(i, 1);
  for (const s of stains) { s.life -= dt;
    if (s.kind === 'burn' && s.life > s.max * .35 && Math.random() < dt * 5) mat('flame', s.x + R(-s.r, s.r), s.y, 0, -R(5, 15), R(.2, .4), { sz: 1 }); } // it keeps burning a while
  for (let i = stains.length - 1; i >= 0; i--) if (stains[i].life <= 0) stains.splice(i, 1);
}
// the floor layer: puddles, scorch marks, water
export function drawStains() {
  for (const s of stains) { const k = s.life / s.max, r = Math.max(.5, s.r * (s.kind === 'goo' ? Math.min(1, k * 2.5) : 1)), ry = Math.max(1, r * SQ * .6);
    g.globalAlpha = s.kind === 'water' ? .45 * Math.min(1, k * 2) : s.kind === 'goo' ? .9 * Math.min(1, k * 3) : .6 * Math.min(1, k * 2);
    g.fillStyle = s.kind === 'goo' ? COL.fx : s.kind === 'water' ? COL.fx : SCORCH;
    for (let dy = -Math.floor(ry); dy <= Math.floor(ry); dy++) { const w = Math.round(r * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2))); g.fillRect(Math.round(s.x) - w, Math.round(s.y) + dy, 2 * w + 1, 1); }
    if (s.kind !== 'burn') { g.fillStyle = COL.fx2; g.fillRect(Math.round(s.x - r * .4), Math.round(s.y - ry * .4), s.kind === 'water' ? 2 : 1, 1); }  // a wet glint
    else if (k > .35) { g.globalAlpha = .8; g.fillStyle = Math.random() < .5 ? COL.fx : COL.fx2; g.fillRect(Math.round(s.x + R(-r, r) * .6), Math.round(s.y), 1, 1); } }
  g.globalAlpha = 1;
}
const strandAt = (m, u) => [m.x0 + (m.x1 - m.x0) * u, m.y0 + (m.y1 - m.y0) * u + Math.sin(u * Math.PI) * m.sag];
const whipAt = (m, u) => { const dx = m.x1 - m.x0, dy = m.y1 - m.y0, L = Math.hypot(dx, dy) || 1, b = Math.sin(u * Math.PI) * m.bulge;
  return [m.x0 + dx * u - dy / L * b, m.y0 + dy * u + dx / L * b]; };
// the goo body mid-teleport: the head rushes to where he is now, the tail lets go of where he was and slurps after it
const eo = t => 1 - (1 - t) ** 3, ei = t => t * t * t;
function ends(m) { const t = 1 - m.life / m.max, h = eo(Math.min(1, t / .45)), tl = ei(Math.max(0, (t - .35) / .65)), x1 = P.x, y1 = P.y;
  return [m.x0 + (x1 - m.x0) * tl, m.y0 + (y1 - m.y0) * tl, m.x0 + (x1 - m.x0) * h, m.y0 + (y1 - m.y0) * h, t]; }
function stretchAt(m, u) { const [tx, ty, hx, hy] = ends(m), L = Math.hypot(hx - tx, hy - ty); return [tx + (hx - tx) * u, ty + (hy - ty) * u - 3 + Math.sin(u * Math.PI) * Math.min(6, L * .06)]; }

function blob(x, y, rx, ry) { x = Math.round(x); y = Math.round(y);
  for (let dy = -Math.floor(ry); dy <= Math.floor(ry); dy++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + .01)) ** 2))); g.fillRect(x - w, y + dy, 2 * w + 1, 1); } }
export function drawMatter() {
  for (const m of mats) { const k = Math.max(0, m.life / m.max), x = Math.round(m.x), y = Math.round(m.y);
    g.globalAlpha = 1;
    switch (m.kind) {
      case 'flame': { const h = 1 + Math.round((m.sz || 2) * k * 2); g.fillStyle = k > .75 ? COL.core : k > .5 ? COL.fx2 : k > .22 ? COL.fx : SMOKE; g.globalAlpha = k > .22 ? 1 : .6;
        g.fillRect(x, y - h + 1, (m.sz || 2) > 1.6 && k > .4 ? 2 : 1, h); break; }
      case 'ember': if (Math.random() < .3 + .7 * k) { g.fillStyle = k > .5 ? COL.fx2 : COL.fx; g.fillRect(x, y, 1, 1); } break;
      case 'cinder': g.fillStyle = COL.fx2; g.fillRect(x, y, 1, 1); g.fillStyle = COL.fx; g.fillRect(x, y - 1, 1, 1); break;
      case 'smoke': g.globalAlpha = .35 * k; g.fillStyle = SMOKE; blob(m.x, m.y, m.r, m.r * .8); break;
      case 'goo': { const r = m.r || 1; g.fillStyle = COL.fx; if (r > .8) g.fillRect(x, y, 2, 2 + (m.vy > 60 ? 1 : 0)); else g.fillRect(x, y, 1, 1 + (m.vy > 60 ? 1 : 0));
        if (r > .8) { g.fillStyle = COL.fx2; g.fillRect(x, y, 1, 1); } break; }
      case 'drop': g.fillStyle = COL.fx2; g.fillRect(x, y, 1, 1); if (Math.abs(m.vy) > 40) { g.fillStyle = COL.fx; g.fillRect(x, y - Math.sign(m.vy), 1, 1); } break;
      case 'mist': g.globalAlpha = .3 * k; g.fillStyle = COL.fx2; blob(m.x, m.y, 2 + (1 - k) * 3, 1 + (1 - k) * 2); break;
      case 'gust': { const sp = Math.hypot(m.vx, m.vy) || 1, L = Math.min(9, 2 + sp * .05); g.globalAlpha = Math.min(1, k * 1.6); g.fillStyle = k > .6 ? COL.core : COL.fx2;
        for (let i = 0; i < L; i++) if (i % 4 !== 3) g.fillRect(Math.round(m.x - m.vx / sp * i), Math.round(m.y - m.vy / sp * i), 1, 1); break; }
      case 'leaf': g.fillStyle = COL.fx; if (Math.sin((m.max - m.life) * 12 + m.ph) > 0) g.fillRect(x, y, 2, 1); else g.fillRect(x, y, 1, 2); break;
      case 'cling': { const r = m.r || .5; g.fillStyle = COL.fx; blob(m.x, m.y, r, r * .85); g.fillStyle = COL.fx2; g.fillRect(Math.round(m.x - r * .4), Math.round(m.y - r * .5), 1, 1); break; }
      case 'bead': g.fillStyle = COL.fx2; g.fillRect(x, y, 1, 1); g.fillStyle = COL.fx; g.fillRect(x, y + 1, 1, 1); break;
      case 'seek': g.fillStyle = m.then === 'cling' ? COL.fx : COL.fx2; g.fillRect(x, y, m.then === 'cling' ? 2 : 1, m.then === 'cling' ? 2 : 1); break;
      case 'mote': g.globalAlpha = Math.min(1, k * 2); g.fillStyle = COL.core; g.fillRect(x, y, 1, 1); g.globalAlpha *= .4; g.fillStyle = COL.fx;
        g.fillRect(x - 1, y, 1, 1); g.fillRect(x + 1, y, 1, 1); g.fillRect(x, y - 1, 1, 1); g.fillRect(x, y + 1, 1, 1); break;
      case 'strand': { g.fillStyle = COL.fx; let px, py; for (let i = 0; i <= 24; i++) { const [sx, sy] = strandAt(m, i / 24), th = 1 + (i % 6 < 3 ? 1 : 0);
        g.fillRect(Math.round(sx), Math.round(sy), 1, th); if (i % 5 === 0) { g.fillStyle = COL.fx2; g.fillRect(Math.round(sx), Math.round(sy), 1, 1); g.fillStyle = COL.fx; } } break; }
      case 'whip': { g.globalAlpha = Math.min(1, k * 2); for (let i = 0; i <= 30; i++) { const u = i / 30, [sx, sy] = whipAt(m, u);
        g.fillStyle = COL.fx; g.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, 3, 3); g.fillStyle = (i + Math.round((1 - k) * 20)) % 6 < 2 ? COL.core : COL.fx2; g.fillRect(Math.round(sx), Math.round(sy) - 1, 1, 1); } break; }
      case 'psi': { g.globalAlpha = Math.min(1, k * 2); const age = m.max - m.life, dx = m.x1 - m.x0, dy = m.y1 - m.y0, L = Math.hypot(dx, dy) || 1, n = Math.max(6, L | 0);
        for (let i = 0; i <= n; i++) { const u = i / n, o = Math.sin(u * L * .45 - age * 30) * 2 * Math.sin(u * Math.PI);
          g.fillStyle = i % 3 ? COL.fx2 : COL.core; g.fillRect(Math.round(m.x0 + dx * u - dy / L * o), Math.round(m.y0 + dy * u + dx / L * o), 1, 1); } break; }
      case 'stretch': { const [tx, ty, hx, hy, t] = ends(m), L = Math.hypot(hx - tx, hy - ty), n = Math.max(2, L / 2 | 0), neck = Math.max(1.2, 4 - L / 18);
        g.fillStyle = COL.fx;
        for (let i = 0; i <= n; i++) { const u = i / n, [sx, sy] = stretchAt(m, u), r = neck + (4.5 - neck) * Math.abs(2 * u - 1) ** 4; blob(sx, sy, r, r * .75); }
        const rise = t > .7 ? (t - .7) / .3 : 0; if (rise) blob(hx, hy - 4 - rise * 8, 3.5, 4 + rise * 8);    // the head stands back up into a man-sized column
        g.fillStyle = COL.fx2; for (let i = 0; i <= n; i += 3) { const [sx, sy] = stretchAt(m, i / n); g.fillRect(Math.round(sx), Math.round(sy - neck * .6), 1, 1); }
        g.fillStyle = COL.eye; if (!rise) g.fillRect(Math.round(hx + (hx >= tx ? 1 : -2)), Math.round(hy - 5), 2, 1);   // his eyes ride the head of the goo
        break; }
    }
  }
  g.globalAlpha = 1;
}

// ---- The kits ----
const up = () => -R(10, 30);
const rel = (x, y) => [(x - P.x) * P.face, y - (P.y - P.z)];                  // a body point in his own space, so it turns with him
const seek = (sx, sy, tx, ty, T, then, o = {}) => { const [ox, oy] = rel(tx, ty); mats.push({ kind: 'seek', sx, sy, x: sx, y: sy, ox, oy, vx: 0, vy: 0, life: T, max: T, then, nf: qiNow(), ...o }); };
const cling = (x, y, rm, life, kind = 'cling') => { if (mats.filter(q => q.kind === kind).length >= 60) return; const [ox, oy] = rel(x, y); mats.push({ kind, ox, oy, x, y, vx: 0, vy: 0, r: .4, rm, life, max: life, nf: qiNow() }); };
export const FIRE = {
  gather(tx, ty, sx, sy, T) { mat('ember', sx, sy, (tx - sx) / T, (ty - sy) / T, T); },     // embers sucked into him
  aura(x, y) { mat('flame', x, y, R(-4, 4), up(), R(.15, .35), { sz: R(1, 2.2) }); },          // he burns: flames lick up off his outline
  bolt(x0, y0, x1, y1) { along(x0, y0, x1, y1, 3, (x, y, dx, dy) => { mat('flame', x + R(-1, 1), y + R(-1, 1), dx * R(5, 25), dy * R(5, 25) + up(), R(.2, .45), { sz: R(1, 3) });
    if (Math.random() < .25) mat('ember', x, y, dx * R(20, 50), up() * 2, R(.4, .8)); }); },
  spark(x, y, vx, vy, life) { if (Math.random() < .3) mat('cinder', x, y, vx * .4, vy * .4 - 30, 2, { gy: y + R(6, 16) });
    else mat(Math.random() < .6 ? 'flame' : 'ember', x, y, vx * .45, vy * .45 - 25, Math.min(.7, life * 3 + .15), { sz: R(1, 2.6) }); },
  trail(x, y) { mat('flame', x, y, R(-5, 5), up(), R(.25, .5), { sz: R(1.5, 3) }); if (Math.random() < .25) stain('burn', x, y + 12, R(2, 3.5), R(1, 1.8)); },
  frag(f) { mat('flame', f.x, f.y, f.vx * .5, up(), R(.2, .4), { sz: R(1, 2.5) }); if (Math.random() < .3) mat('smoke', f.x, f.y, f.vx * .2, -R(5, 12), R(.6, 1), { r: 1 }); },
  residue(x, y, n) { for (let i = 0; i < n; i++) { mat('flame', x + R(-8, 8), y - R(0, 26), R(-10, 10), up() * 1.4, R(.3, .6), { sz: R(1.5, 3) });
    if (i % 3 === 0) mat('smoke', x + R(-6, 6), y - R(10, 26), R(-6, 6), -R(8, 16), R(.8, 1.3), { r: 1.5 }); } },
  travel(fx, fy) { this.residue(fx, fy, 16); along(fx, fy, P.x, P.y, 5, (x, y) => { stain('burn', x + R(-2, 2), y + R(-1, 1), R(2, 3.5), R(1.2, 2.2)); mat('flame', x, y - R(0, 6), 0, up(), R(.2, .5), { sz: R(1.5, 3) }); });
    for (let i = 0; i < 22; i++) { const a = R(0, 6.28); mat('flame', P.x + Math.cos(a) * R(2, 10), P.y - R(0, 14), Math.cos(a) * R(20, 60), Math.sin(a) * R(10, 30) + up(), R(.25, .55), { sz: R(1.5, 3) }); }
    rings.push({ x: P.x, y: P.y, rx: 10, ry: 4, life: .3, max: .3, grow: 2, col: COL.fx }); },
  step(x, y) { if (Math.random() < .5) mat('ember', x + R(-3, 3), y - 1, R(-8, 8), -R(10, 25), R(.3, .6)); },
};
export const SLIME = { melt: true,   // he sags into a puddle before the teleport
  gather(tx, ty, sx, sy, T) { seek(sx, sy, tx, ty, T * 1.3, 'cling', { rm: R(1, 2.2), hold: R(.5, 1) }); },   // globs fly in and stick to him
  aura(x, y) { cling(x, y, R(1, 2.4), R(.5, 1.1)); },                                          // goo builds up ON him and drips off
  idle() { for (let i = 0; i < 6; i++) this.aura(P.x + R(-5, 5), P.y - R(4, 24)); },
  bolt(x0, y0, x1, y1, life) { mats.push({ nf: qiNow(), kind: 'strand', x0, y0, x1, y1, life: Math.max(.3, life * 3), max: Math.max(.3, life * 3), sag: 1, vx: 0, vy: 0 }); },
  spark(x, y, vx, vy) { for (let i = 0; i < 2; i++) mat('goo', x, y, vx * R(.3, .55), vy * R(.3, .55) - R(20, 50), 2, { gy: y + R(4, 16), r: Math.random() < .5 ? 1 : .6 }); },
  trail(x, y) { mat('goo', x, y, R(-6, 6), R(0, 10), 1, { gy: y + R(8, 14) }); if (Math.random() < .4) stain('goo', x, y + 12, R(1.5, 3), R(1.5, 3)); },
  frag(f) { mat('goo', f.x, f.y, f.vx * .3, -R(0, 20), 1, { gy: f.y + R(6, 18), r: Math.random() < .5 ? 1 : .6 }); },
  residue(x, y, n) { for (let i = 0; i < n; i++) { const a = R(0, 6.28); mat('goo', x + R(-7, 7), y - R(4, 24), Math.cos(a) * R(20, 60), -R(30, 80), 2, { gy: y + R(-4, 6), r: Math.random() < .6 ? 1 : .6 }); }
    stain('goo', x, y, R(4, 7), R(2.5, 4)); },
  travel(fx, fy) { mats.push({ kind: 'stretch', x0: fx, y0: fy, life: .5, max: .5, vx: 0, vy: 0 }); P.hide = .5; P.goo = .75;
    stain('goo', fx, fy, R(5, 7), 3.5); along(fx, fy, P.x, P.y, 6, (x, y) => stain('goo', x + R(-1, 1), y, R(1.5, 2.5), R(2, 3.5)));
    for (let i = 0; i < 8; i++) mat('goo', fx + R(-5, 5), fy - R(1, 6), R(-40, 40), -R(20, 60), 2, { gy: fy + R(-3, 4) }); },
  step(x, y) { if (Math.random() < .35) stain('goo', x + R(-2, 2), y, R(1, 2), R(1.2, 2.2)); if (Math.random() < .2) mat('goo', x, y - R(4, 14), 0, 0, 1, { gy: y, r: .6 }); },
};
export const WATER = {
  gather(tx, ty, sx, sy, T) { seek(sx, sy, tx, ty, T, 'bead', { hold: R(.6, 1.2) }); },       // droplets fly in and bead on him
  aura(x, y) { cling(x, y, 1, R(.8, 1.6), 'bead'); },                                          // beads that run down him and drip off his hem
  idle() { for (let i = 0; i < 10; i++) mat('drop', P.x + R(-5, 5), P.y - R(6, 24), R(-50, 50), -R(20, 60), 2, { gy: P.y + R(-2, 4) }); }, // he shakes off
  bolt(x0, y0, x1, y1, life) { const L = Math.hypot(x1 - x0, y1 - y0); if (L < 14 || Math.random() < .4) { along(x0, y0, x1, y1, 4, (x, y, dx, dy) => mat('drop', x, y, dx * R(20, 60), -R(20, 60), 2, { gy: y + R(6, 14) })); return; } // short ones just spray
    mats.push({ nf: qiNow(), kind: 'whip', x0, y0, x1, y1, bulge: S1() * L * R(.1, .2), life: Math.max(.14, life * 2), max: Math.max(.14, life * 2), vx: 0, vy: 0 }); },
  spark(x, y, vx, vy) { mat('drop', x, y, vx * .6, vy * .6 - R(20, 50), 2, { gy: y + R(6, 16) }); if (Math.random() < .25) mat('mist', x, y, vx * .1, -R(4, 10), R(.4, .7)); },
  trail(x, y) { mat('mist', x, y, R(-4, 4), -R(2, 6), R(.4, .8)); if (Math.random() < .5) mat('drop', x, y, R(-15, 15), -R(10, 30), 2, { gy: y + R(8, 14) }); },
  frag(f) { mat('drop', f.x, f.y, f.vx * .6, -R(10, 40), 2, { gy: f.y + R(6, 18) }); },
  residue(x, y, n) { for (let i = 0; i < n; i++) mat('drop', x + R(-5, 5), y - R(0, 12), R(-40, 40), -R(60, 130), 2, { gy: y + R(-3, 5) });
    if (!qiNow()) rings.push({ x, y, rx: 5, ry: 2, life: .45, max: .45, grow: 3, col: COL.fx2 }); stain('water', x, y, R(5, 8), R(2, 3)); },
  travel(fx, fy) { this.residue(fx, fy, 12); const L = Math.hypot(P.x - fx, P.y - fy);
    mats.push({ kind: 'whip', x0: fx, y0: fy - 2, x1: P.x, y1: P.y - 2, bulge: S1() * L * .12, life: .22, max: .22, vx: 0, vy: 0 });
    for (let i = 0; i < 18; i++) mat('drop', P.x + R(-3, 3), P.y - R(0, 4), R(-30, 30), -R(90, 180), 2, { gy: P.y + R(-3, 5) });   // he erupts out of a geyser
    rings.push({ x: P.x, y: P.y, rx: 6, ry: 2.5, life: .5, max: .5, grow: 3, col: COL.fx2 }); rings.push({ x: P.x, y: P.y, rx: 3, ry: 1.2, life: .35, max: .35, grow: 4, col: COL.core }); stain('water', P.x, P.y, 7, 2.5); },
  step(x, y) { if (Math.random() < .3) rings.push({ x: x + R(-2, 2), y, rx: 2, ry: 1, life: .3, max: .3, grow: 2, col: COL.fx2 }); if (Math.random() < .3) mat('drop', x, y - 1, R(-15, 15), -R(15, 35), 2, { gy: y + 1 }); },
};
export const WIND = {
  gather(tx, ty, sx, sy, T) { const dx = tx - sx, dy = ty - sy; mat('gust', sx, sy, dx / T - dy / T * .6, dy / T + dx / T * .6, T, { curl: R(-3, 3) }); },  // spiralling in
  aura(x, y) { const s = x < P.x ? -1 : 1; mat('gust', x, y, 0, -s * R(40, 80), R(.12, .25), { curl: s * R(10, 16) }); },   // air wrapping round him
  bolt(x0, y0, x1, y1) { const s = S1(); along(x0, y0, x1, y1, 5, (x, y, dx, dy) => mat('gust', x, y, dx * R(60, 130), dy * R(60, 130), R(.2, .35), { curl: s * R(2, 6) }));
    if (Math.random() < .4) mat('leaf', x1, y1, R(-30, 30), -R(10, 30), R(.6, 1.1)); },
  spark(x, y, vx, vy, life) { mat('gust', x, y, vx * .8, vy * .5, Math.min(.5, life * 2.2 + .1), { curl: S1() * R(3, 8) }); if (Math.random() < .15) mat('leaf', x, y, vx * .3, vy * .3, R(.6, 1.1)); },
  trail(x, y) { mat('gust', x, y, R(-40, 40), R(-10, 10), R(.2, .35), { curl: S1() * R(4, 8) }); if (Math.random() < .2) mat('leaf', x, y, R(-20, 20), -R(10, 20), R(.6, 1)); },
  frag(f) { mat('gust', f.x, f.y, (f.vx || S1() * 20) * 3 + Math.sign(f.vx || 1) * 40, -R(0, 20), R(.18, .32), { curl: S1() * R(2, 5) }); },
  residue(x, y, n) { for (let i = 0; i < n; i++) { const a = R(0, 6.28), r = R(4, 12), s = S1(); // a little whirlwind where he was
    mat('gust', x + Math.cos(a) * r, y - R(2, 26), -Math.sin(a) * s * R(60, 110), Math.cos(a) * s * R(20, 40), R(.25, .45), { curl: s * R(8, 14) }); }
    for (let i = 0; i < 3; i++) mat('leaf', x + R(-6, 6), y - R(4, 20), R(-30, 30), -R(20, 40), R(.8, 1.3)); },
  travel(fx, fy) { this.residue(fx, fy, 14); along(fx, fy, P.x, P.y, 4, (x, y, dx, dy) => mat('gust', x, y - R(2, 24), dx * R(120, 220), dy * R(120, 220), R(.15, .3), { curl: S1() * R(1, 3) }));
    this.residue(P.x, P.y, 10); rings.push({ x: P.x, y: P.y, rx: 8, ry: 3, life: .35, max: .35, grow: 3, col: COL.fx2 }); },
  step(x, y) { if (Math.random() < .25) mat('gust', x, y - R(0, 3), -P.face * R(30, 60), -R(0, 10), R(.15, .3), { curl: S1() * R(3, 8) }); if (Math.random() < .06) mat('leaf', x, y - 2, R(-20, 20), -R(10, 25), R(.6, 1)); },
};
export const PSYCHIC = {
  gather(tx, ty, sx, sy, T) { seek(sx, sy, tx, ty, T * 1.4, null); },
  aura(x, y) { const a = R(0, 6.28); mat('mote', x + Math.cos(a) * 4, y + Math.sin(a) * 3, Math.cos(a) * 12, Math.sin(a) * 8 - 6, R(.4, .8)); },  // motes lifting off him and hanging
  bolt(x0, y0, x1, y1, life) { // no line at all: a ripple where it lands, a softer one where it left, and motes drifting the way it went
    const L = Math.hypot(x1 - x0, y1 - y0) || 1, r = Math.min(8, 2 + L / 8);
    if (qiNow()) return along(x0, y0, x1, y1, 10, (x, y, dx, dy) => mat('mote', x, y, dx * R(20, 50), dy * R(20, 50), R(.3, .6)));
    rings.push({ x: x1, y: y1, rx: r, ry: r * .7, life: Math.max(.16, life * 2), max: Math.max(.16, life * 2), grow: 1.4, col: COL.fx2 });
    if (L > 20) rings.push({ x: x0, y: y0, rx: r * .5, ry: r * .35, life: .14, max: .14, grow: 1, col: COL.fx });
    along(x0, y0, x1, y1, 10, (x, y, dx, dy) => mat('mote', x, y, dx * R(20, 50), dy * R(20, 50), R(.3, .6))); },
  spark(x, y, vx, vy, life) { mat('mote', x, y, vx * .9, vy * .9, Math.min(1, life * 4 + .2)); },
  trail(x, y) { mat('mote', x, y, R(-6, 6), R(-6, 6), R(.5, .9)); },
  frag(f) { mat('mote', f.x, f.y, f.vx, R(-10, 10), R(.4, .8)); },
  residue(x, y, n) { for (let i = 0; i < n; i++) mat('mote', x + R(-8, 8), y - R(2, 26), R(-30, 30), R(-30, 30), R(.5, 1));
    if (!qiNow()) for (let i = 0; i < 3; i++) rings.push({ x, y: y - 12, rx: 4 + i * 4, ry: 3 + i * 3, life: .25 + i * .08, max: .25 + i * .08, grow: 1.5, col: i ? COL.fx : COL.core }); },
  travel(fx, fy) { this.residue(fx, fy, 10); // he phases: a string of his own silhouettes, each held a moment longer, folding into the new spot
    along(fx, fy, P.x, P.y, 14, (x, y, dx, dy, u) => P.ghosts.push({ state: 'tele', f: 3, x, y, face: P.face, age: 0, hold: .04 + u * .12, white: 0 }));
    for (let i = 0; i < 3; i++) rings.push({ x: P.x, y: P.y - 12, rx: 22 - i * 6, ry: 16 - i * 4, life: .2 + i * .05, max: .2 + i * .05, grow: -.8, col: COL.fx2 }); },
  step(x, y) { if (Math.random() < .08) mat('mote', x + R(-4, 4), y - R(0, 4), 0, -R(4, 10), R(.6, 1)); },
};
