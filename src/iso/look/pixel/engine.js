// ---- The pixel look's drawing engine: the Iron Ash 2D figure renderer exactly as the earlier pages draw it (the
// Top-Down Views / Ronin Direction engine, scratchpad tdv/engine.js, with the Animation Flow page's patches: hat lag,
// the roll lean, kusazuri and sode lag, the knee direction, the blade drawn half out of the saya). Vendored verbatim so
// the pixel model stays the drawing the owner approved; only the exports at the end are new. It draws a side pose (the
// flow's joint angles and targets) in one of any facing into a pixel buffer with depth per part, lit by the style's rule.
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = t => t * t * (3 - 2 * t);

// ramps: index 2 is RC c0, the darkest cloth; 1 is RC K
export const RAMP = {
  k: ['#060709', '#0c0d11', '#0f1115', '#14171c', '#1b1e25', '#22262e', '#2b2f38', '#30353e', '#3d424d', '#4b525e', '#5f6a77', '#7a8794', '#97a3ae'],
  r: ['#1c1416', '#261c1f', '#2e2427', '#3a2e31', '#43363a', '#4a3b3f', '#4e3f43', '#5a4a4e', '#6a585c', '#7b676b', '#917b7e', '#a48e90', '#bba5a7'],
  a: ['#0b0d10', '#111419', '#171b21', '#1d232b', '#242b35', '#2c3440', '#36404d', '#414c5a', '#4f5b6a', '#62707f', '#7b8a99', '#97a6b3', '#b5c2cc'],
  b: ['#1a1012', '#24171a', '#2e1d20', '#3a2427', '#462b2f', '#523338', '#5e3b40', '#6b454a', '#7a5156', '#8c6065', '#a07378', '#b4898d', '#c9a1a4'],
};
const ENEMY_MAT = { k: 'r', a: 'b' };

class Buf {
  constructor(w, h) { this.w = w; this.h = h; const n = w * h;
    this.lv = new Int16Array(n).fill(-1); this.mat = new Array(n).fill(null); this.grp = new Int16Array(n).fill(-1);
    this.tag = new Uint8Array(n); this.pat = new Uint8Array(n); this.ink = new Array(n).fill(null); this.al = new Float32Array(n).fill(1); this.out = null; }
  idx(x, y) { x = Math.floor(x); y = Math.floor(y); return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? -1 : y * this.w + x; }
  put(x, y, lv, mat, g, tag = 0, pat = 0) { const i = this.idx(x, y); if (i < 0) return; this.lv[i] = lv; this.mat[i] = mat; this.grp[i] = g; this.tag[i] = tag; this.pat[i] = pat; this.ink[i] = null; }
  inkAt(x, y, c, a = 1) { const i = this.idx(x, y); if (i < 0) return; this.ink[i] = c; this.al[i] = a; }
}

// ---- raster primitives (pixel centres, no anti-aliasing) ----
function capsule(ax, ay, bx, by, ra, rb, paint) {
  const r = Math.max(ra, rb), x0 = Math.floor(Math.min(ax, bx) - r - 1), x1 = Math.ceil(Math.max(ax, bx) + r + 1),
    y0 = Math.floor(Math.min(ay, by) - r - 1), y1 = Math.ceil(Math.max(ay, by) + r + 1);
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-6;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + .5, py = y + .5, t = clamp(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1);
    const qx = ax + dx * t - px, qy = ay + dy * t - py, rr = lerp(ra, rb, t);
    if (qx * qx + qy * qy <= rr * rr) paint(x, y, t);
  }
}
function poly(pts, paint) {
  let y0 = 1e9, y1 = -1e9; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const cy = y + .5, xs = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= cy) !== (b[1] <= cy)) xs.push(a[0] + (cy - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - .5); x <= Math.floor(xs[k + 1] - .5); x++) paint(x, y);
  }
}
function ellipse(cx, cy, rx, ry, paint) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const u = (x + .5 - cx) / rx, v = (y + .5 - cy) / ry; if (u * u + v * v <= 1) paint(x, y, u, v); }
}
function line(ax, ay, bx, by, paint) {
  ax = Math.floor(ax); ay = Math.floor(ay); bx = Math.floor(bx); by = Math.floor(by);
  const dx = Math.abs(bx - ax), dy = -Math.abs(by - ay), sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1; let e = dx + dy, n = 0;
  for (;;) { paint(ax, ay, n++); if (ax === bx && ay === by) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; ax += sx; } if (e2 <= dx) { e += dx; ay += sy; } }
}

// two-bone IK in the (f,u) plane; pick 'fwd' (knees) or 'back' (elbows) or 'down'
function ik(a, t, l1, l2, pick) {
  let dx = t[0] - a[0], dy = t[1] - a[1]; let d = Math.hypot(dx, dy) || 1e-6;
  const dd = clamp(d, Math.abs(l1 - l2) + .01, l1 + l2 - .01);
  const ang = Math.atan2(dy, dx), b = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
  const c1 = [a[0] + l1 * Math.cos(ang + b), a[1] + l1 * Math.sin(ang + b)], c2 = [a[0] + l1 * Math.cos(ang - b), a[1] + l1 * Math.sin(ang - b)];
  const mid = Array.isArray(pick) ? (((c1[0] - a[0]) * pick[0] + (c1[1] - a[1]) * pick[1]) > ((c2[0] - a[0]) * pick[0] + (c2[1] - a[1]) * pick[1]) ? c1 : c2) : pick === 'fwd' ? (c1[0] > c2[0] ? c1 : c2) : pick === 'down' ? (c1[1] < c2[1] ? c1 : c2) : (c1[0] < c2[0] ? c1 : c2);
  const ex = a[0] + dx / d * dd, ey = a[1] + dy / d * dd;
  const m2 = Math.hypot(ex - mid[0], ey - mid[1]) || 1; // keep the end on the reach
  return [mid, [mid[0] + (ex - mid[0]) / m2 * l2, mid[1] + (ey - mid[1]) / m2 * l2]];
}

// ---- skeleton from a pose ----
function skeleton(S, P) {
  const T = S.body, sp = [Math.sin(P.lean), Math.cos(P.lean)], bk = [-Math.cos(P.lean), Math.sin(P.lean)];
  const pel = P.pel, tl = T.torso + (P.breath || 0) * .6;
  const chest = [pel[0] + sp[0] * tl, pel[1] + sp[1] * tl];
  const hd = P.lean + (P.head || 0), hs = [Math.sin(hd), Math.cos(hd)];
  const neck = [chest[0] + sp[0] * T.neck, chest[1] + sp[1] * T.neck];
  const head = [neck[0] + hs[0] * T.headR, neck[1] + hs[1] * T.headR];
  const sh = [chest[0] - sp[0] * 1.6, chest[1] - sp[1] * 1.6];
  const hip = [pel[0], pel[1] - 1];
  const legs = {}, arms = {};
  for (const [k, foot] of [['N', P.fN], ['F', P.fF]]) { const [knee, ank] = ik(hip, foot, T.thigh, T.shin, P.kneeDir || 'fwd'); legs[k] = { hip, knee, ank }; }
  let hN = P.hN, hF = P.hF, blade = null;
  if (P.blade && P.blade.out) {
    const a = P.blade.ang, d = [Math.cos(a), Math.sin(a)]; blade = { g: P.blade.g, d, vis: P.blade.vis };
    hN = P.blade.g; if (P.blade.two) hF = [P.blade.g[0] - d[0] * 3.4, P.blade.g[1] - d[1] * 3.4];
  }
  for (const [k, hand] of [['N', hN], ['F', hF]]) { const [el, wr] = ik(sh, hand, T.uarm, T.farm, P.elb || 'back'); arms[k] = { sh, el, wr }; }
  return { pel, chest, neck, head, sh, hip, legs, arms, sp, bk, blade, hs, P };
}

// sheathed katana at his left hip: the grip forward and up, the saya back and down
function sayaPts(S, K) {
  const T = S.body, a = [K.pel[0] + 2.2, K.pel[1] + 1.2], up = .5 + (K.P.sayaTilt || 0), dn = -.32 + (K.P.sayaTilt || 0);
  return { s: T.hipW + 1.4, a, grip: [a[0] + Math.cos(up) * 7.5, a[1] + Math.sin(up) * 7.5], tip: [a[0] - Math.cos(dn) * 21, a[1] + Math.sin(dn) * 21] };
}

// ---- cloth (verlet chains in the body's own frame) ----
function makeCloth(S, K) {
  const C = { chains: [] };
  if (S.mantle) { const M = S.mantle, n = M.cols;
    for (let i = 0; i < n; i++) { const fr = n === 1 ? .5 : i / (n - 1), len = M.len * (M.tatter ? M.tatter[i % M.tatter.length] : 1);
      C.chains.push({ kind: 'mantle', i, n: M.rows, seg: len / M.rows, s: lerp(-M.w, M.w, fr), pin: M.pin, pts: [] }); } }
  (S.tails || []).forEach((sc, i) => C.chains.push({ kind: 'tail', i, at: sc.at, n: sc.rows, seg: sc.len / sc.rows, s: sc.s, lift: sc.lift ?? 1, pts: [] }));
  if (S.sleeves) for (const arm of ['N', 'F']) for (const at of [0, 1]) C.chains.push({ kind: 'sleeve', arm, at, n: 3, seg: S.sleeves.len * (at ? 1 : .8) / 3, s: 0, pts: [] });
  for (const ch of C.chains) { const a = anchor(S, K, ch); for (let j = 0; j <= ch.n; j++) { const p = [a[0] - (ch.kind === 'tail' ? j * ch.seg * .7 : 0), ch.s, a[1] - j * ch.seg * (ch.kind === 'tail' ? .7 : 1)]; ch.pts.push({ p, o: p.slice() }); } }
  return C;
}
function anchor(S, K, ch, j = 0) {
  if (ch.kind === 'mantle') { const r = S.body.chestR + (S.mantle.off ?? .3), top = [K.sh[0] + K.bk[0] * r + K.sp[0] * 1.6, K.sh[1] + K.bk[1] * r + K.sp[1] * 1.6];
    const d = j * ch.seg; return [top[0] - K.sp[0] * d, top[1] - K.sp[1] * d]; }
  if (ch.kind === 'tail') { if (ch.at === 'head') { const T = S.body; return [K.head[0] + K.bk[0] * (T.headR - .5) + K.hs[0] * 1.5, K.head[1] + K.bk[1] * (T.headR - .5) + K.hs[1] * 1.5]; }
    return [K.neck[0] + K.bk[0] * 2.4, K.neck[1] + K.bk[1] * 2.4 - .8]; }
  const A = K.arms[ch.arm], p = ch.at ? [lerp(A.el[0], A.wr[0], .75), lerp(A.el[1], A.wr[1], .75)] : [lerp(A.sh[0], A.el[0], .75), lerp(A.sh[1], A.el[1], .75)];
  return [p[0], p[1] - 1.3];
}
function stepCloth(S, K, C, dt, wind, time) {
  const G = 520, damp = .965;
  for (const ch of C.chains) {
    const pinRows = ch.kind === 'mantle' ? Math.floor((S.mantle.pin || 0) / ch.seg) : 0;
    for (let j = 0; j <= ch.n; j++) { const q = ch.pts[j];
      if (j <= pinRows) { const a = anchor(S, K, ch, j); q.o = q.p.slice(); q.p = [a[0], ch.s, a[1]]; continue; }
      const v = [(q.p[0] - q.o[0]) * damp, (q.p[1] - q.o[1]) * damp, (q.p[2] - q.o[2]) * damp]; q.o = q.p.slice();
      const flut = (S.flutter || 1) * (j / ch.n), gust = Math.sin(time * 9 + j * .9 + (ch.i || 0) * 1.7 + (ch.at || 0) * 2) * (60 + wind * 260) * flut;
      const lift = ch.kind === 'tail' ? wind * 380 * ch.lift + 60 * ch.lift : wind * 40;
      q.p = [q.p[0] + v[0] + (-wind * (ch.kind === 'tail' ? 700 : 420) * (.4 + .6 * j / ch.n) + gust - (ch.kind === 'tail' ? 40 : 0)) * dt * dt, q.p[1] + v[1] + Math.sin(time * 7 + j + ch.s) * 30 * flut * dt * dt,
        q.p[2] + v[2] + (-G + lift + Math.abs(gust) * .2) * dt * dt];
    }
    for (let it = 0; it < 4; it++) for (let j = pinRows + 1; j <= ch.n; j++) { const a = ch.pts[j - 1].p, b = ch.pts[j].p;
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], d = Math.hypot(dx, dy, dz) || 1e-6, k = (d - ch.seg) / d;
      if (j - 1 <= pinRows) { b[0] -= dx * k; b[1] -= dy * k; b[2] -= dz * k; } else { b[0] -= dx * k * .5; b[1] -= dy * k * .5; b[2] -= dz * k * .5; a[0] += dx * k * .5; a[1] += dy * k * .5; a[2] += dz * k * .5; } }
    for (let j = 1; j <= ch.n; j++) { const p = ch.pts[j].p; p[2] = Math.max(p[2], .5);
      if (ch.kind !== 'sleeve') { const lim = backLimit(S, K, p[2]) - (ch.kind === 'mantle' ? (S.mantle.off ?? .3) : 0); if (p[0] > lim) p[0] = lim; } }
  }
  const ms = C.chains.filter(c => c.kind === 'mantle');
  for (let i = 0; i + 1 < ms.length; i++) { const A = ms[i], B = ms[i + 1], rest = Math.abs(B.s - A.s);
    for (let j = 1; j <= Math.min(A.n, B.n); j++) { const a = A.pts[j].p, b = B.pts[j].p; const dx = b[0] - a[0], dz = b[2] - a[2], d = Math.hypot(dx, b[1] - a[1], dz);
      if (d > rest * 1.05) { const k = (d - rest * 1.05) / d * .25; a[0] += dx * k; a[2] += dz * k; b[0] -= dx * k; b[2] -= dz * k; } } }
}
function backLimit(S, K, u) {
  const T = S.body, pel = K.pel, tan = Math.tan(K.P.lean);
  if (u >= pel[1]) return pel[0] + (u - pel[1]) * tan - T.chestR - .2;
  return Math.min(pel[0] - T.waistR - .6, Math.min(K.legs.N.knee[0], K.legs.F.knee[0], K.legs.N.ank[0], K.legs.F.ank[0]) - T.hemR * .4);
}

// ---- drawing a figure ----
// view: 90 deg = side, facing right; 0 = facing the camera. o.enemy draws the samurai.
function drawFigure(S0, P, C, view, o = {}) {
  const E = !!o.enemy, S = E && S0.enemy ? { ...S0, ...S0.enemy } : S0;
  const W = o.W || 96, H = o.H || 72, X0 = o.X0 ?? 40, Y0 = o.Y0 ?? 64, B = new Buf(W, H); B.ramps = { ...RAMP, ...(S0.ramps || {}) };
  const va = typeof view === 'object' ? view.a : view, pit = typeof view === 'object' ? (view.p || 0) : 0, cp = typeof view === 'object' && view.cp != null ? view.cp : Math.cos(pit), sp2 = typeof view === 'object' && view.sp != null ? view.sp : Math.sin(pit); // cp/sp: an oblique camera keeps the body full height
  const K = skeleton(S, P), cv = Math.cos(va), sv = Math.sin(va), T = S.body;
  const RL = P.roll || 0; const pr = (f, s, u) => { s += u * RL; const d = f * cv - s * sv; return [X0 + s * cv + f * sv, Y0 - u * cp + d * sp2, d]; };
  const groups = [];
  const group = (name, f, s, bias) => { const g = { name, d: pr(f, s, 0)[2] + bias, prims: [] }; groups.push(g); return g; };
  const L = S.lv, MT = S.mats || {}, EM = S0.enemyMat || ENEMY_MAT;
  const M = part => { const m = MT[part] || 'k'; return E ? (EM[m] || m) : m; };
  const cap = (g, A, sa, Bp, sb, ra, rb, lv, part, tag = 0, pat = 0) => g.prims.push(gi => { const a = pr(A[0], sa, A[1]), b = pr(Bp[0], sb, Bp[1]); capsule(a[0], a[1], b[0], b[1], ra, rb, (x, y) => B.put(x, y, lv, M(part), gi, tag, pat)); });
  const pol = (g, pts3, lv, part, tag = 0, pat = 0) => g.prims.push(gi => poly(pts3.map(p => pr(p[0], p[1], p[2])), (x, y) => B.put(x, y, lv, M(part), gi, tag, pat)));
  const fwd = (p, d) => [p[0] + d, p[1]];
  const at = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

  // legs
  for (const k of ['F', 'N']) { const Lg = K.legs[k], s = (k === 'N' ? -1 : 1) * T.hipW, g = group('leg' + k, K.pel[0], s, -.05), lv = k === 'N' ? L.legN : L.legF;
    cap(g, Lg.hip, s, Lg.knee, s, T.legR, T.kneeR, lv, 'legs', 0, S.legPat || 0);
    cap(g, Lg.knee, s, Lg.ank, s, T.kneeR, T.hemR, lv, 'legs', 0, S.legPat || 0);
    const legOn = o2 => o2 && (!o2.legs || o2.legs.includes(k));
    if (legOn(S.kyahan)) cap(g, at(Lg.knee, Lg.ank, .12), s, at(Lg.knee, Lg.ank, .97), s, S.kyahan.r, S.kyahan.r2 ?? S.kyahan.r - .5, S.kyahan.lv + (k === 'N' ? 1 : 0), 'wrap', 0, 1);
    if (legOn(S.haidate)) { const hd = S.haidate; cap(g, fwd(at(Lg.hip, Lg.knee, .15), .7), s, fwd(at(Lg.hip, Lg.knee, hd.to ?? .9), .9), s, T.legR + .3, T.kneeR + .8, hd.lv + (k === 'N' ? 1 : 0), 'armour', 2, hd.pat ?? 2); }
    if (legOn(S.shins)) { const sn = S.shins; cap(g, fwd(at(Lg.knee, Lg.ank, .18), .5), s, fwd(at(Lg.knee, Lg.ank, .88), .4), s, sn.r, sn.r - .4, (sn.lv0 ?? lv) + (sn.lv || 1) + (k === 'N' ? 1 : 0), 'shins', 2, sn.pat ?? 4);
      if (sn.knee) cap(g, fwd(Lg.knee, .8), s, fwd(Lg.knee, .8), s, 1.8, 1.8, (sn.lv0 ?? lv) + (sn.lv || 1) + 2, 'shins', 2); }
    const lifted = Lg.ank[1] > 2.4, toe = lifted ? [Lg.ank[0] + 2.4 * (T.footL || 1), Lg.ank[1] - 2] : [Lg.ank[0] + 3.4 * (T.footL || 1), Lg.ank[1] - .9];
    cap(g, [Lg.ank[0] + .3, Lg.ank[1] - .4], s, toe, s, T.footR, T.footR * .8, L.foot ?? lv - 1, 'feet', 1);
    if (S.waraji) { const heel = [Lg.ank[0] - .8, Lg.ank[1] - 1.4], tt = [toe[0] + .4, toe[1] - .7]; cap(g, heel, s, tt, s, .6, .6, S.waraji.lv, 'straw', 1);
      cap(g, [Lg.ank[0] + .2, Lg.ank[1] + .4], s, [Lg.ank[0] + .2, Lg.ank[1] + .4], s, .6, .6, S.waraji.lv - 1, 'straw', 1); }
  }
  if (S.skirt) { const g = group('skirt', K.pel[0], 0, -.02), a = K.legs.N, b = K.legs.F, sk = S.skirt;
    for (const s of [-T.hipW, 0, T.hipW]) pol(g, [[K.pel[0] + T.waistR - .5, s, K.pel[1] + 1], [at(a.knee, a.ank, sk)[0], s - T.hipW, at(a.knee, a.ank, sk)[1]], [at(b.knee, b.ank, sk)[0], s + T.hipW, at(b.knee, b.ank, sk)[1]], [K.pel[0] - T.waistR + .5, s, K.pel[1] + 1]], L.skirt, 'legs', 0, S.legPat || 0); }
  // kusazuri: plates hung from the waist all round, swinging with the thigh under them
  for (const kz of [S.kusazuri, S.koshimino].filter(Boolean)) { const n = kz.n, rT = T.waistR + (kz.rT ?? .9), rB = rT + (kz.flare ?? 1.4), top = K.pel[1] + (kz.top ?? 1.4);
    const angs = kz.angles || [...Array(n)].map((_, i) => i / n * TAU);
    angs.forEach((th, i) => { const c = Math.cos(th), sn = Math.sin(th), side = sn < -.35 ? 'N' : sn > .35 ? 'F' : null;
      const kf = side ? K.legs[side].knee[0] : (K.legs.N.knee[0] + K.legs.F.knee[0]) / 2, shift = (kf - K.pel[0]) * (kz.follow ?? .45) * (c > -.2 ? 1 : .4) + (P.kzLag || 0) * (c > -.2 ? 1 : .7);
      const len = kz.len * (kz.vary ? kz.vary[i % kz.vary.length] : 1) - (P.kzLift || 0), w = kz.w, tf = -sn, ts = c, w2 = w * (kz.spread ?? 1.15);
      const g = group((kz === S.koshimino ? 'km' : 'kz') + i, K.pel[0] + c * rT, sn * rT, kz.bias ?? .05);
      const pts = [[K.pel[0] + c * rT + tf * w, sn * rT + ts * w, top], [K.pel[0] + c * rT - tf * w, sn * rT - ts * w, top],
        [K.pel[0] + c * rB - tf * w2 + shift, sn * rB - ts * w2, top - len], [K.pel[0] + c * rB + tf * w2 + shift, sn * rB + ts * w2, top - len]];
      if (kz.tatter) { const m1 = [(pts[2][0] + pts[3][0]) / 2, (pts[2][1] + pts[3][1]) / 2, top - len * .8]; pts.splice(3, 0, m1); }
      pol(g, pts, kz.lv + (sn < -.35 ? 1 : 0) + (c > .5 ? 1 : 0), kz.part || 'armour', kz.part ? 8 : 2, kz.pat ?? 3); }); }
  // the saya at his left hip
  { const sy = sayaPts(S, K), g = group('saya', K.pel[0] + 1, sy.s, -.1), sl = L.saya, grip = S.gripInk || ['#2c3037', '#4a5059'];
    g.prims.push(gi => { const a = pr(sy.a[0], sy.s, sy.a[1]), t = pr(sy.tip[0], sy.s + .6, sy.tip[1]), gp = pr(sy.grip[0], sy.s - .4, sy.grip[1]);
      capsule(a[0], a[1], t[0], t[1], S.sayaR, S.sayaR * .85, (x, y, tt) => B.put(x, y, tt > .93 ? sl + 2 : sl, M('saya'), gi, 4));
      if (S.sageo) line(a[0] - 1, a[1] + 1, lerp(a[0], t[0], .3), lerp(a[1], t[1], .3) + 2, (x, y) => B.inkAt(x, y, S.sageo));
      if (!(P.blade && P.blade.out)) { capsule(a[0], a[1], gp[0], gp[1], 1.15, 1.1, (x, y) => B.inkAt(x, y, grip[0]));
        line(a[0], a[1], gp[0], gp[1], (x, y, n) => { if (n % 2 && n > 1) B.inkAt(x, y, grip[1]); });
        B.inkAt(a[0], a[1] - 1, S.tsuba || '#7d868e'); B.inkAt(a[0] + 1, a[1], S.tsuba || '#7d868e'); B.inkAt(a[0], a[1], '#5b6168'); } }); }
  // mantle
  if (S.mantle && !E) { const g = group('mantle', K.pel[0] - 3, 0, -.6), ms = C.chains.filter(c => c.kind === 'mantle'), ML = L.mantle;
    g.prims.push(gi => { for (let i = 0; i + 1 < ms.length; i++) { const A = ms[i], Bc = ms[i + 1], n = Math.min(A.n, Bc.n);
      for (let j = 0; j < n; j++) { const q = [A.pts[j].p, Bc.pts[j].p, Bc.pts[j + 1].p, A.pts[j + 1].p].map(p => pr(p[0], p[1], p[2]));
        poly(q, (x, y) => B.put(x, y, ML, M('mantle'), gi, 8)); } }
      { // the cape seen edge-on: fill from his back out to its furthest-back edge, so it has a body when it lifts
        const rows = Math.max(...ms.map(c => c.n)), edge = [], back = [];
        for (let j = 0; j <= rows; j++) { let best = null; for (const Cc of ms) if (j <= Cc.n && (!best || Cc.pts[j].p[0] * sv - Cc.pts[j].p[1] * cv < best[0] * sv - best[1] * cv)) best = Cc.pts[j].p; edge.push(best);
          const u = best[2]; back.push([Math.min(backLimit(S, K, u), best[0] + 6), 0, u]); }
        poly([...edge, ...back.reverse()].map(p => pr(p[0], p[1], p[2])), (x, y) => B.put(x, y, ML, M('mantle'), gi, 8)); }
      for (const Cc of ms) for (let j = 0; j < Cc.n; j++) { const a = pr(...Cc.pts[j].p.map((v, i) => v)), b = pr(...Cc.pts[j + 1].p);
        capsule(a[0], a[1], b[0], b[1], j === Cc.n - 1 ? .9 : 1.4, j === Cc.n - 1 ? .5 : 1.2, (x, y) => B.put(x, y, ML, M('mantle'), gi, 8)); }
      if (S.folds) for (const i of S.folds) { const Cc = ms[i]; if (!Cc) continue; for (let j = 2; j < Cc.n; j++) { const a = Cc.pts[j].p, b = Cc.pts[j + 1].p, pa = pr(a[0], a[1], a[2]), pb = pr(b[0], b[1], b[2]);
        line(pa[0] + .5, pa[1], pb[0] + .5, pb[1], (x, y) => { const i2 = B.idx(x, y); if (i2 >= 0 && B.grp[i2] === gi) B.lv[i2] = ML - 1; }); } } }); }
  // tails: scarf ends, a ponytail
  for (const [ti, tl] of (S.tails || []).entries()) { if (E && !tl.enemy) continue; const g = group('tail' + ti, K.pel[0] - 3, tl.s, tl.at === 'head' ? -.4 : -.7), ch = C.chains.filter(c => c.kind === 'tail')[ti];
    g.prims.push(gi => { for (let j = 0; j < ch.n; j++) { const a = ch.pts[j].p, b = ch.pts[j + 1].p, pa = pr(a[0], a[1], a[2]), pb = pr(b[0], b[1], b[2]), r = tl.r * (1 - j / ch.n * (tl.taper ?? .5));
      capsule(pa[0], pa[1], pb[0], pb[1], r, r * .9, (x, y) => B.put(x, y, tl.lv, M(tl.part || 'scarf'), gi, 8)); } }); }
  // arms
  const arm = (k) => { const A = K.arms[k], s = (k === 'N' ? -1 : 1) * T.shW, g = group('arm' + k, A.sh[0], s, k === 'N' ? .2 : -.2), lv = k === 'N' ? L.armN : L.armF;
    if (S.sleeves) { const ch = C.chains.filter(c => c.kind === 'sleeve' && c.arm === k), e0 = ch.find(c => !c.at), e1 = ch.find(c => c.at);
      g.prims.push(gi => { const pts = [e0.pts[0].p, e1.pts[0].p, ...e1.pts.slice(1).map(q => q.p), ...e0.pts.slice(1).reverse().map(q => q.p)].map(p => pr(p[0], s, p[2]));
        poly(pts, (x, y) => B.put(x, y, lv + (S.sleeves.lv || 0), M('sleeves'), gi, 8)); }); }
    cap(g, A.sh, s, A.el, s, T.uarmR, T.elR, lv, 'arms'); cap(g, A.el, s, A.wr, s, T.elR, T.wrR, lv, 'arms');
    if (S.kote && S.kote.arms.includes(k)) { const kt = S.kote; cap(g, A.sh, s, A.el, s, T.uarmR - .2, T.elR - .2, kt.chain ?? lv, 'armour', 2, 2);
      cap(g, at(A.el, A.wr, .12), s, at(A.el, A.wr, .92), s, T.elR + .2, T.wrR + .25, kt.lv + (k === 'N' ? 1 : 0), 'armour', 2, 4); }
    const d = [A.wr[0] - A.el[0], A.wr[1] - A.el[1]], dl = Math.hypot(...d) || 1; cap(g, A.wr, s, [A.wr[0] + d[0] / dl * 1.2, A.wr[1] + d[1] / dl * 1.2], s, T.handR, T.handR, L.hand ?? lv + 1, 'hands', 1);
    if (S.pauldron && S.pauldron.arm.includes(k)) { const pd = S.pauldron, g2 = group('pauldron' + k, A.sh[0], s, k === 'N' ? .3 : -.15), dn = [A.el[0] - A.sh[0], A.el[1] - A.sh[1]], dl2 = Math.hypot(...dn) || 1, ux = dn[0] / dl2, uy = dn[1] / dl2;
      const c = [A.sh[0] + ux * .5 + (P.sodeLag ? P.sodeLag[0] : 0), A.sh[1] + uy * .5 + .8 + (P.sodeLag ? P.sodeLag[1] : 0)], px2 = -uy, py2 = ux, ss = s - (k === 'N' ? 1 : -1);
      const Q = (w, h) => [c[0] + px2 * w + ux * h, ss, c[1] + py2 * w + uy * h];
      pol(g2, [Q(pd.w, -1.8), Q(-pd.w, -1.8), Q(-pd.w - .9, pd.h), Q(pd.w + .9, pd.h)], pd.lv, 'armour', 2);
      g2.prims.push(gi => { for (let r = 1; r < pd.lames; r++) { const h = -1.8 + (pd.h + 1.8) * r / pd.lames, a = pr(...Q(pd.w + .5, h)), b = pr(...Q(-pd.w - .5, h));
        line(a[0], a[1], b[0], b[1], (x, y) => { const i2 = B.idx(x, y); if (i2 >= 0 && B.grp[i2] === gi) B.lv[i2] = pd.lv - 2; }); } }); }
  };
  arm('F');
  { const g = group('torso', K.pel[0], 0, 0), w = T.shW - 2;
    for (const s of [-w, 0, w]) cap(g, K.pel, s * .55, K.chest, s, T.waistR, T.chestR, L.body, 'body');
    cap(g, [K.pel[0], K.pel[1] - .5], 0, [K.pel[0], K.pel[1] + 1], 0, T.waistR + .6, T.waistR + .4, L.body, 'body');
    if (S.dou) { const du = S.dou, a = [K.pel[0] + K.sp[0] * du.from + (du.front || 0), K.pel[1] + K.sp[1] * du.from], b = [K.chest[0] - K.sp[0] * du.to + (du.front || 0), K.chest[1] - K.sp[1] * du.to];
      for (const s of du.front ? [0] : [-w, 0, w]) cap(g, a, s * .6, b, s, T.waistR + .6 - (du.front ? 1.2 : 0), T.chestR + .45 - (du.front ? 1.3 : 0), du.lv, 'armour', 2, du.pat ?? 3); }
    if (S.coat) { const cl = S.coat, lg = K.legs, front = at(lg.N.hip, lg.N.knee, cl.len), back = [K.pel[0] - T.waistR - 1 - (P.speed || 0) * cl.flare, K.pel[1] - cl.len * T.thigh - (P.speed || 0) * -1.2];
      for (const s of [-w, 0, w]) pol(g, [[K.chest[0] + K.bk[0] * -T.chestR * .7, s, K.chest[1] - 1], [K.chest[0] + K.bk[0] * T.chestR, s, K.chest[1] - 1], back.concat(), [front[0] + T.legR, s, front[1]]].map(p => p.length === 2 ? [p[0], s, p[1]] : p), L.coat, 'coat'); }
    if (S.obi) { const ob = S.obi, u0 = 2.2, u1 = u0 + (ob.h || 2.6), wr = T.waistR + .5;
      const Pp = (u, f) => [K.pel[0] + K.sp[0] * u + K.bk[0] * -f, K.pel[1] + K.sp[1] * u + K.bk[1] * -f];
      for (const s of [-w * .6, 0, w * .6]) pol(g, [[...Pp(u0, wr)], [...Pp(u1, wr)], [...Pp(u1, -wr)], [...Pp(u0, -wr)]].map(p => [p[0], s, p[1]]), ob.lv, 'obi', 16); }
    if (S.tasuki && !E) g.prims.push(gi => { const ts = S.tasuki, w2 = w + 1, onG = (x, y) => { const i = B.idx(x, y); if (i >= 0 && B.grp[i] === gi) B.inkAt(x, y, ts.ink); };
      for (const sd of [-1, 1]) { const ss = sd * w2; const p = [[K.chest[0] + T.chestR * .7, ss, K.chest[1] - 4.5], [K.sh[0], ss, K.sh[1] + 2.4], [K.chest[0] - T.chestR, ss, K.chest[1] - 3], [K.pel[0] - T.waistR, -ss, K.pel[1] + 4]].map(q => pr(q[0], q[1], q[2]));
        for (let i = 0; i + 1 < p.length; i++) line(p[i][0], p[i][1], p[i + 1][0], p[i + 1][1], onG); } });
    if (S.collar2) g.prims.push(gi => { const c2 = S.collar2, fr = T.chestR * .9;
      const draw = (sA, sB, du, lv, part) => { const a = pr(K.neck[0] + fr * .5, sA, K.neck[1] - .5 - du), b = pr(K.chest[0] + fr, sB, K.chest[1] - c2.depth - du);
        line(a[0], a[1], b[0], b[1], (x, y) => { const i = B.idx(x, y); if (i >= 0 && B.grp[i] === gi) { B.lv[i] = lv; B.mat[i] = M(part); B.pat[i] = 0; } }); };
      for (const sd of [-1, 1]) { draw(sd * 1.9, -sd * .4, 0, c2.outer, 'body'); if (c2.inner != null) draw(sd * 1.1, -sd * .1, .9, c2.inner, 'accent'); } });
    if (S.collar) g.prims.push(gi => { const top = pr(K.chest[0] + K.sp[0] * -.5 + T.chestR * .55, -1, K.chest[1] + .5);
      for (let i = 0; i < S.collar.n; i++) { B.put(top[0] - Math.floor(i / 2) * (sv > .5 ? 1 : 0), top[1] + i, S.collar.lv, M(S.collar.part || 'body'), gi, 0);
        if (sv < .9) B.put(top[0] - i * .5 + 0 + (1 - sv) * i * .5 * 2, top[1] + i, S.collar.lv, M(S.collar.part || 'body'), gi, 0); } });
    cap(g, K.chest, 0, K.neck, 0, 1.8, 1.8, L.body, 'body');
  }
  // the shoulder cape: over both shoulders, short
  if (S.cape && !E) { const cp = S.cape, g = group('cape', K.sh[0], 0, .1), r = T.chestR + .8;
    for (const s of [-T.shW + 1, 0, T.shW - 1]) pol(g, [[K.sh[0] + K.sp[0] * 2.2 + K.bk[0] * -r * .9, s * 1.2, K.sh[1] + K.sp[1] * 2.2], [K.sh[0] + K.sp[0] * 2.2 + K.bk[0] * r, s * 1.2, K.sh[1] + K.sp[1] * 2.2],
      [K.sh[0] - K.sp[0] * cp.len + K.bk[0] * (r + 1.2) - (P.speed || 0) * 2.5, s * 1.3, K.sh[1] - K.sp[1] * cp.len + (P.speed || 0) * 1.2], [K.sh[0] - K.sp[0] * cp.len * .7 + K.bk[0] * -r * 1.1, s * 1.3, K.sh[1] - K.sp[1] * cp.len * .75]], L.cape, 'cape', 8); }
  { const g = group('head', K.head[0], 0, .5), hr = T.headR;
    cap(g, K.head, 0, K.head, 0, hr, hr, L.head, 'head');
    const FC = S.face || (E ? { lv: L.head + 5, brow: -1.4, back: -.2, part: 'head' } : null);
    if (FC) g.prims.push(gi => { const hc = pr(K.head[0], 0, K.head[1]), F = FC;
      ellipse(hc[0], hc[1], hr + 1, hr + 1, (x, y) => { const dx = x + .5 - hc[0], dy = y + .5 - hc[1]; const i = B.idx(x, y); if (i < 0 || B.grp[i] !== gi) return;
        if (dx * sv + hr * cv * .95 > (F.back ?? -.3) && dy > (F.brow ?? -1.2) && (!F.low || dy < F.low)) { B.lv[i] = F.lv; B.mat[i] = M(F.part || 'skin'); } }); });
    if (S.faceFx && !E) g.prims.push(gi => S.faceFx(faceApi(B, gi, K, T, P, pr, sv, cv, M)));
    if (E) g.prims.push(gi => { const hc = pr(K.head[0], 0, K.head[1]); // his hair: a dark cap over the crown and the back of the head
      ellipse(hc[0], hc[1], hr + 1, hr + 1, (x, y) => { const dx = x + .5 - hc[0], dy = y + .5 - hc[1], i = B.idx(x, y); if (i < 0 || B.grp[i] !== gi) return;
        if (dy < -1.4 || dx * sv + hr * cv * .95 < -.6) { B.lv[i] = (S.enemyHair && S.enemyHair.lv) ?? 1; B.mat[i] = M(MT.hair || 'k'); } }); });
    if (S.hair || E) { const hs = E ? (S.enemyHair || { knot: 1 }) : S.hair; const hl = hs.lv ?? L.head + 2;
      if (hs.knot) { const tk = [K.head[0] - 1.2, K.head[1] + hr + .3], tip = [K.head[0] + .8, K.head[1] + hr + 1.1];
        cap(g, tk, 0, tip, 0, 1.3, .9, E ? 2 : hl, 'hair'); g.prims.push(gi => { const p = pr(tk[0], 0, tk[1]); B.put(p[0], p[1], (E ? 2 : hl) + 3, M('hair'), gi); }); }
      if (hs.spikes) g.prims.push(gi => { const hc = pr(K.head[0], 0, K.head[1]);
        hs.spikes.forEach(([ang, len, wd], si) => { const a = ang + (P.lean + (P.head || 0)) * sv * .6, side = si % 2 ? 1 : -1;
          const X = (aa, r) => hc[0] + Math.sin(aa) * r * sv + side * Math.abs(Math.sin(aa)) * r * cv * .8 + (cv > .5 ? side * .6 : 0);
          const tip = [X(a, hr + len), hc[1] - Math.cos(a) * (hr + len)];
          const bL = [X(a - wd, hr * .7), hc[1] - Math.cos(a - wd) * hr * .7], bR = [X(a + wd, hr * .7), hc[1] - Math.cos(a + wd) * hr * .7];
          poly([bL, tip, bR], (x, y) => B.put(x, y, hl, M('hair'), gi)); }); }); }
  }
  if (!E && S.hat) { const hat = S.hat, g = group('hat', K.head[0], 0, 3.5);
    g.prims.push(gi => { const hc = pr(K.head[0] + (P.hatLag ? P.hatLag[0] : 0), 0, K.head[1] + (P.hatLag ? P.hatLag[1] : 0)), tilt = (P.hatTilt || 0) * sv * (hat.tiltMul ?? 1);
      const cx = hc[0] + (hat.dx || 0) * sv, cy = hc[1] - hat.y * cp, R = hat.R, ry = Math.max(hat.ry, R * sp2 * .95), h = hat.h * cp;
      const rot = (x, y) => { const dx = x - hc[0], dy = y - hc[1], c = Math.cos(tilt), s = Math.sin(tilt); return [hc[0] + dx * c - dy * s, hc[1] + dx * s + dy * c]; };
      const P2 = (x, y, lv, tag) => B.put(x, y, lv, M('hat'), gi, tag);
      const under = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI; under.push(rot(cx + Math.cos(a) * R, cy + Math.sin(a) * ry)); }
      const crown = []; const N = 12, prof = hat.prof || 1.5;
      for (let i = 0; i <= N; i++) { const t = i / N; crown.push(rot(cx + R - (R - hat.top) * t, cy - h * (1 - Math.pow(1 - t, prof)))); }
      for (let i = 0; i <= N; i++) { const t = 1 - i / N; crown.push(rot(cx - R + (R - hat.top) * t, cy - h * (1 - Math.pow(1 - t, prof)))); }
      if (pit > .05) { // from above: the whole top of the brim, the crown rising to its point inside it
        const top = []; for (let i = 0; i <= 32; i++) { const a = i / 32 * TAU; top.push(rot(cx + Math.cos(a) * R, cy + Math.sin(a) * ry)); }
        poly(top, (x, y) => P2(x, y, L.hat, 0));
        ellipse(cx, cy, R, ry, (x, y, u, v) => { const j = B.idx(x, y); if (j < 0 || B.grp[j] !== gi) return; // the far half catches the light, dithered into the near half
          if (v < -.45) B.lv[j] = L.hat + 1; else if (v < .05 && ((x + y) & 1)) B.lv[j] = L.hat + 1; else if (v > .6 && ((x + y) & 1)) B.lv[j] = L.hat - 1; });
        const ax = cx, ay = cy - h; const cone = []; for (let i = 0; i <= 16; i++) { const a = Math.PI + i / 16 * Math.PI; cone.push(rot(cx + Math.cos(a) * R * .55, cy + Math.sin(a) * ry * .55)); }
        for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI; cone.push(rot(cx + Math.cos(a) * R * .55, cy + Math.sin(a) * ry * .55)); }
        poly([...cone.slice(0, 17), rot(ax, ay)], (x, y) => P2(x, y, L.hat + 1, 0));
        for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI, p = rot(cx + Math.cos(a) * R, cy + Math.sin(a) * ry + .2); P2(p[0], p[1], L.hatEdge ?? L.hat - 1, 64); }
        for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI, p = rot(cx + Math.cos(a) * R * .55, cy + Math.sin(a) * ry * .55); const j = B.idx(p[0], p[1]); if (j >= 0 && B.grp[j] === gi) { B.lv[j] = L.hat - 1; B.tag[j] |= 64; } }
        return; }
      if (hat.clean) { // column by column: whole-pixel steps, the slope's runs even (1-2-3, never ragged)
        const X0c = Math.round(cx), Yc = Math.floor(cy);
        for (let dx = -R; dx <= R; dx++) { const ax = Math.abs(dx + .5 * Math.sign(dx || 1)), t = clamp((R - ax) / (R - hat.top), 0, 1), top = Math.round(h * (1 - Math.pow(1 - t, prof)));
          const under = Math.floor(ry * Math.sqrt(Math.max(0, 1 - (ax / R) ** 2)));
          for (let y = Yc - top; y <= Yc; y++) P2(X0c + dx, y, L.hat, 0);
          for (let y = Yc + 1; y <= Yc + under; y++) P2(X0c + dx, y, L.hatUnder, 32);
          P2(X0c + dx, Yc, L.hatEdge ?? L.hat - 1, 64); }
        return; }
      poly(under, (x, y) => P2(x, y, L.hatUnder, 32));
      poly(crown, (x, y) => P2(x, y, L.hat, 0));
      if (hat.rim !== false) for (let x = Math.floor(cx - R); x <= cx + R; x++) { const p = rot(x + .5, cy + .2); P2(p[0], p[1], L.hatEdge ?? L.hat - 1, 64); }
      if (hat.glare) { const gl = hat.glare; for (let i = 0; i < gl.n; i++) { const t = gl.t0 + i * gl.dt, p = rot(cx - (R - hat.top) * t * gl.side + gl.dx, cy - h * (1 - Math.pow(1 - (1 - t), prof)) + gl.dy); const j = B.idx(p[0], p[1]); if (j >= 0 && B.grp[j] === gi) { B.lv[j] = gl.lv; B.tag[j] |= 128; } } }
      if (hat.cord) { const a = rot(cx + 2 * sv, cy + ry), b = pr(K.head[0] + T.headR * .4, 0, K.head[1] - T.headR - .2); line(a[0], a[1], b[0], b[1], (x, y) => { const i2 = B.idx(x, y); if (i2 >= 0 && B.grp[i2] !== gi) B.inkAt(x, y, hat.cord); }); }
    }); }
  if (S.throat && !E) { const th = S.throat, g = group('throat', K.head[0], 0, .45), hd = P.lean + (P.head || 0), T2 = T;
    const chin = [K.head[0] + Math.cos(hd) * 1.6 - Math.sin(hd) * -(T2.headR - .6), K.head[1] - Math.sin(hd) * 1.6 + Math.cos(hd) * -(T2.headR - .6)], base = [K.neck[0] + K.sp[0] * -2.6 + 1.6, K.neck[1] + K.sp[1] * -2.6];
    for (const s of [-1.6, 0, 1.6]) cap(g, chin, s * .7, base, s, th.r, th.r + .9, th.lv, 'armour', 2, 3); }
  if (S.surcoat) { const sc = S.surcoat, g = group('surcoat', K.pel[0] - 1, 0, .08), w = T.shW - 2, sp = P.speed || 0;
    const tf = [K.chest[0] + K.sp[0] * 1.2 + 1.4, K.chest[1] + K.sp[1] * 1.2], tb = [K.chest[0] + K.bk[0] * (T.chestR + .5) + K.sp[0] * 1.2, K.chest[1] + K.bk[1] * (T.chestR + .5) + K.sp[1] * 1.2];
    const hb = [K.pel[0] - T.waistR - sc.flare - sp * 2.4 - (P.swing || 0) * (sc.sway || 0), K.pel[1] - sc.len + sp * 2 + Math.abs(P.swing || 0) * (sc.sway || 0) * .5], hf = [K.pel[0] + 1.2 - sp * .5, K.pel[1] - sc.len + .5 + sp * .8], mid = [K.pel[0] - T.waistR - .6, K.pel[1] + 1];
    for (const s of [-(w + 1.4), w + 1.4]) pol(g, [[tf[0], s, tf[1]], [tb[0], s, tb[1]], [mid[0], s, mid[1]], [hb[0], s, hb[1]], [lerp(hb[0], hf[0], .5), s, lerp(hb[1], hf[1], .5) + (sc.slit || 0)], [hf[0], s, hf[1]]], sc.lv, 'coat', 8);
    pol(g, [[tb[0], 0, tb[1]], [tb[0], -(w + 1.4), tb[1]], [hb[0], -(w + 1.6), hb[1]], [hb[0], w + 1.6, hb[1]], [tb[0], w + 1.4, tb[1]]], sc.lv, 'coat', 8);
    if (sc.mon) g.prims.push(gi => { if (cv > -.3) return; const c = pr(tb[0] - .5, 0, tb[1] - 5); ellipse(c[0], c[1], 2.6, 2.6, (x, y, u, v) => { const i = B.idx(x, y); if (i >= 0 && B.grp[i] === gi && u * u + v * v > .3) { B.lv[i] = sc.mon; B.tag[i] |= 1; } }); }); }
  if (S.hood && !E) { const hd = S.hood, g = group('hood', K.head[0], 0, .55), hr = T.headR;
    cap(g, [K.head[0] + K.bk[0] * .6, K.head[1] + .4], 0, [K.neck[0] + K.bk[0] * 2.8 - K.sp[0] * 5, K.neck[1] + K.bk[1] * 2.8 - K.sp[1] * 5], 0, hr - .2, hd.r, hd.lv, 'hood');
    for (const sd of [-1, 1]) cap(g, [K.neck[0], K.neck[1]], sd * 2.5, [K.sh[0] + K.bk[0], K.sh[1] + .5], sd * (T.shW - .5), 2.2, 1.8, hd.lv - 1, 'hood');
    cap(g, K.head, 0, K.head, 0, hr + .4, hr + .4, hd.lv, 'hood');
    g.prims.push(gi => { const hc = pr(K.head[0], 0, K.head[1]); ellipse(hc[0], hc[1], hr + 1, hr + 1, (x, y) => { const dx = x + .5 - hc[0], dy = y + .5 - hc[1], i = B.idx(x, y);
      if (i >= 0 && B.grp[i] === gi && dx * sv + hr * cv * .95 > .4 && dy > -.2 && dy < 2) { B.lv[i] = 0; B.mat[i] = M('hood'); B.tag[i] |= 1; } }); }); }
  if (S.sashimono && !E) { const sm = S.sashimono, g = group('sashi', K.pel[0] - 6, 0, -.9), base = [K.chest[0] + K.bk[0] * (T.chestR + 1) - K.sp[0] * 7, K.chest[1] + K.bk[1] * (T.chestR + 1) - K.sp[1] * 7];
    const topP = [base[0] + K.sp[0] * sm.h, base[1] + K.sp[1] * sm.h], sw = (P.speed || 0), fl = sm.w, fh = sm.fh;
    const bkx = -1; // the flag flies back from the pole
    const p0 = [topP[0] - .5, topP[1] - 1], p1 = [topP[0] - fl - sw * 1.5, topP[1] - 1 - sw * .5], p2 = [topP[0] - fl - sw * 3 + 0, topP[1] - 1 - fh + sw * 2], p3 = [topP[0] - .5, topP[1] - 1 - fh];
    const notch = [lerp(p2[0], p3[0], .5), lerp(p2[1], p3[1], .5) + 2.5];
    pol(g, [p0, p1, p2, notch, p3].map(p => [p[0], .5, p[1]]), sm.lv, 'flag', 8);
    g.prims.push(gi => { const a = pr(base[0], .5, base[1]), b = pr(topP[0], .5, topP[1] + 1); line(a[0], a[1], b[0], b[1], (x, y) => B.put(x, y, 3, M('pole'), gi, 1));
      const c = pr(lerp(p0[0], p2[0], .5), .5, lerp(p0[1], p2[1], .45)); ellipse(c[0], c[1], 1.7, 1.7, (x, y) => { const i = B.idx(x, y); if (i >= 0 && B.grp[i] === gi) { B.lv[i] = sm.mon; B.tag[i] |= 1; } }); }); }
  arm('N');

  groups.sort((a, b) => a.d - b.d);
  groups.forEach((g, i) => { for (const f of g.prims) f(i); g.order = i; }); B.gnames = groups.map(g => g.name);
  const headG = groups.find(g => g.name === 'head').order, hoodG = (groups.find(g => g.name === 'hood') || { order: -9 }).order;
  light(B, S.shade, E);
  if (S.refine) tidy(B);
  // eyes
  const ink = E ? (S0.enemyEye || '#ff5a4a') : (S.eye || '#6ff3e4');
  const EY = E ? {} : (S.eyes || {});
  for (const side of [-1, 1]) { if (EY.n === 0 || (EY.n === 1 && side === 1)) continue; const ef = .78, es = side * (S.eyeSep || 1.7), vis = ef * cv - (side * .5) * sv; if (vis <= .05) continue;
    const p = pr(K.head[0] + T.headR * ef * Math.cos(K.P.lean + (K.P.head || 0)), es, K.head[1] - (S.eyeDrop ?? .9));
    const w = S.eyeW || 2, eh = S.eyeH || 1;
    for (let dy = 0; dy < eh; dy++) for (let dx = 0; dx < w; dx++) { const x = Math.floor(p[0]) + dx - (sv > .9 ? 0 : 1) - (S.eyeIn || 0), y = Math.floor(p[1]) + dy, i = B.idx(x, y); if (i >= 0 && (B.grp[i] === headG || B.grp[i] === hoodG) && B.lv[i] >= 0) { B.ink[i] = (dy === 0 && S.eyeHi && !E) ? S.eyeHi : (EY.ink && (dx > 0 || w === 1) ? EY.ink : (EY.ink2 || EY.ink || ink)); B.al[i] = 1; } }
  }
  if (S.outline) outline(B, S.outline);
  if (K.blade) drawBlade(B, pr, K, S); if (K.blade && P.smear) drawSmear(B, pr, K, P.smear);
  return B;
}
// refine: no orphan values inside a part, no single-pixel spurs or notches on its edge
// tidy, the same rule without the per-pixel arrays (the original allocated four arrays a pixel)
function tidy(B) {
  const w = B.w, h = B.h, lv = B.lv.slice(), grp = B.grp, ink = B.ink, pat = B.pat, cnt = new Int16Array(64);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (lv[i] < 0 || ink[i] || pat[i]) continue; const g = grp[i];
    const a = i + 1, b = i - 1, c = i + w, d = i - w;
    if (!(lv[a] >= 0 && grp[a] === g && !ink[a] && lv[b] >= 0 && grp[b] === g && !ink[b] && lv[c] >= 0 && grp[c] === g && !ink[c] && lv[d] >= 0 && grp[d] === g && !ink[d])) continue;
    const v = lv[i]; if (lv[a] === v || lv[b] === v || lv[c] === v || lv[d] === v) continue;
    cnt[lv[a]]++; cnt[lv[b]]++; cnt[lv[c]]++; cnt[lv[d]]++;
    let best = -1, bc = 0; for (const q of [lv[a], lv[b], lv[c], lv[d]]) if (cnt[q] > bc || (cnt[q] === bc && q < best)) { bc = cnt[q]; best = q; }
    if (bc >= 2) B.lv[i] = best; cnt[lv[a]] = 0; cnt[lv[b]] = 0; cnt[lv[c]] = 0; cnt[lv[d]] = 0; }
  const filled = i => i >= 0 && (B.lv[i] >= 0 || B.ink[i]);
  const kill = [], add = [], N = [0, 0, 0, 0];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x;
    N[0] = x + 1 < w ? i + 1 : -1; N[1] = x > 0 ? i - 1 : -1; N[2] = y + 1 < h ? i + w : -1; N[3] = y > 0 ? i - w : -1;
    let nf = 0, first = -1; for (let k = 0; k < 4; k++) if (filled(N[k])) { nf++; if (first < 0 && B.lv[N[k]] >= 0 && !B.ink[N[k]]) first = N[k]; }
    if (B.lv[i] >= 0 && !B.ink[i] && !(B.tag[i] & 5) && nf <= 1 && B.mat[i] !== 'm') kill.push(i);
    else if (!filled(i) && nf >= 3 && first >= 0) add.push(i, first); }
  for (const i of kill) B.lv[i] = -1;
  for (let k = 0; k < add.length; k += 2) { const i = add[k], j = add[k + 1]; B.lv[i] = B.lv[j]; B.mat[i] = B.mat[j]; B.grp[i] = B.grp[j]; B.tag[i] = B.tag[j]; }
}
function faceApi(B, gi, K, T, P, pr, sv, cv, M) {
  const hd = P.lean + (P.head || 0), hr = T.headR, hc = pr(K.head[0], 0, K.head[1]);
  const W3 = (df, du) => [K.head[0] + Math.cos(hd) * df + Math.sin(hd) * du, K.head[1] - Math.sin(hd) * df + Math.cos(hd) * du];
  const P3 = (df, ds, du) => { const w = W3(df, du); return pr(w[0], ds, w[1]); };
  const front = (df, ds, du) => P3(df, ds, du)[2] - hc[2] > -.25;
  const ok = (x, y, o) => { const i = B.idx(x, y); return i >= 0 && (o.out || B.grp[i] === gi); };
  const set = (x, y, lv, part, o) => { if (!ok(x, y, o)) return; if (o.ink) { B.inkAt(x, y, o.ink); return; } const i = B.idx(x, y); B.put(x, y, lv, M(part), gi, o.tag || 0, o.pat || 0); if (o.ord == null) B.grp[i] = gi; };
  return { hr, hc, sv, cv,
    cap(a, b, r, lv, part, o = {}) { if (!front(...a) && !front(...b)) return; const p = P3(...a), q = P3(...b); capsule(p[0], p[1], q[0], q[1], r, r, (x, y) => set(x, y, lv, part, o)); },
    px(a, lv, part, o = {}) { if (!front(...a)) return; const p = P3(...a); set(p[0], p[1], lv, part, o); },
    line(a, b, lv, part, o = {}) { if (!front(...a) && !front(...b)) return; const p = P3(...a), q = P3(...b); line(p[0], p[1], q[0], q[1], (x, y) => set(x, y, lv, part, o)); },
    region(fn) { ellipse(hc[0], hc[1], hr + 1, hr + 1, (x, y) => { const i = B.idx(x, y); if (i < 0 || B.grp[i] !== gi) return; const dx = x + .5 - hc[0], dy = y + .5 - hc[1];
      const r = fn(dx, dy, dx * sv + hr * cv * .95, x, y); if (r) B.put(x, y, r.lv, M(r.part), gi, r.tag || 0, r.pat || 0); }); } };
}
// a 1px line round the silhouette, and (inner) where a nearer part crosses a farther one
function outline(B, O) {
  const w = B.w, h = B.h, filled = i => B.lv[i] >= 0 || (B.ink[i] && B.al[i] >= 1);
  const add = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x;
    if (!filled(i)) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; if (filled(yy * w + xx)) { add.push([i, O.outer]); break; } } continue; }
    if (O.inner && B.lv[i] >= 0 && !(B.tag[i] & 1)) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const j = yy * w + xx;
      if (B.lv[j] >= 0 && B.grp[j] > B.grp[i] + (O.gap || 0) && !(B.tag[j] & 1)) { add.push([i, O.inner]); break; } }
  }
  for (const [i, c] of add) { B.ink[i] = c; B.al[i] = 1; if (B.lv[i] < 0) B.lv[i] = -1; }
}

// the blade in 3D (Ronin Direction's), clipped to vis while it is half in the saya
function drawBlade(B, pr, K, St) {
  const gf = K.blade.g[0], gu = K.blade.g[1], d = K.blade.d, L = Math.min(St.bladeLen || 23, K.blade.vis ?? 99);
  const P = t => pr(gf + d[0] * t, -6, gu + d[1] * t);
  const p0 = P(0), p1 = P(1); const dx = p1[0] - p0[0], dy = p1[1] - p0[1], m = Math.hypot(dx, dy) || 1e-6, n = [dy / m, -dx / m];
  let a = P(-6), b = P(0); capsule(a[0], a[1], b[0], b[1], 1, 1, (x, y) => B.inkAt(x, y, '#2c3037'));
  line(a[0], a[1], b[0], b[1], (x, y, k) => { if (k % 2) B.inkAt(x, y, '#4a5059'); });
  const ts = P(.8); for (let k = -1.5; k <= 1.5; k += .5) B.inkAt(ts[0] + n[0] * k, ts[1] + n[1] * k, '#7d868e');
  if (L < 2) return;
  a = P(1.6); b = P(L);
  line(a[0], a[1], b[0], b[1], (x, y) => B.inkAt(x, y, '#e9eeee'));
  if (m > .35) line(a[0] - n[0], a[1] - n[1], b[0] - n[0] * .5, b[1] - n[1] * .5, (x, y) => { const i = B.idx(x, y); if (i >= 0 && B.ink[i] !== '#e9eeee') B.inkAt(x, y, '#9aa3aa'); });
  if (L >= 22) B.inkAt(b[0], b[1], '#b8fff6');
}
// the keyed smear (today's cuts carry one): an arc in his (f, u) plane round the near shoulder, projected
function drawSmear(B, pr, K, sm) {
  const r1 = sm.r || 27, a0 = sm.a0, a1 = sm.a1, fade = sm.fade ?? 1, N = Math.ceil(Math.abs(a1 - a0) * r1 * 3);
  for (let i = 0; i <= N; i++) { const p = i / N, ang = a0 + (a1 - a0) * p, th = 1.5 + 4.5 * Math.sin(Math.PI * Math.min(1, p * 1.15)) * (sm.thick || 1), r0 = r1 - th;
    for (let r = r0; r <= r1 + .01; r += .35) { const q = (r - r0) / th, pt = pr(K.sh[0] + r * Math.cos(ang), -6, K.sh[1] + r * Math.sin(ang));
      const col = q > .86 ? '#ffffff' : q > .6 ? '#b8fff6' : q > .3 ? '#6ff3e4' : '#52e8d6';
      const a = (q > .86 ? 1 : (.2 + .8 * p) * (.35 + .65 * q)) * fade, j = B.idx(pt[0], pt[1]); if (j < 0) continue;
      if (B.ink[j] && B.al[j] >= a) continue; if (B.ink[j] === '#e9eeee') continue; B.ink[j] = col; B.al[j] = Math.round(a * 4) / 4; } }
}

// ---- light: a pass over the raster by the style's rule ----
function light(B, shade, enemy) {
  const w = B.w, h = B.h, lv = B.lv.slice();
  const grp = B.grp;
  const empty = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return true; return lv[y * w + x] < 0; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (lv[i] < 0) continue; const g = grp[i];
    const E = (dx, dy) => empty(x + dx, y + dy);
    const Bh = (dx, dy) => { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) return false; const j = yy * w + xx; return lv[j] >= 0 && grp[j] < g; };
    const Nr = (dx, dy) => { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) return false; const j = yy * w + xx; return lv[j] >= 0 && grp[j] > g; };
    const O = (dx, dy) => E(dx, dy) || Bh(dx, dy);
    const NrX = (dx, dy) => { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) return false; const j = yy * w + xx; return lv[j] >= 0 && grp[j] > g && !(B.gnames && B.gnames[grp[j]] === 'hat'); };
    const same = (dx, dy) => { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) return false; const j = yy * w + xx; return lv[j] >= 0 && grp[j] === g; };
    const inner = same(-2, 0) && same(2, 0) && same(0, -2) && same(0, 2) && same(-1, 0) && same(1, 0);
    const r = shade({ v: lv[i], x, y, E, Bh, Nr, NrX, O, inner, hat: !!(B.gnames && B.gnames[g] === 'hat'), tag: B.tag[i], mat: B.mat[i], enemy });
    if (typeof r === 'string') { B.ink[i] = r; B.al[i] = 1; } else B.lv[i] = r + patShade(B.pat[i], x, y);
  }
}

function patShade(p, x, y) {
  if (!p) return 0;
  if (p === 1) return (x + y) % 3 === 0 ? -1 : 0;                           // kyahan: wrapped cloth, a diagonal
  if (p === 2) return y % 2 === 1 ? -1 : ((x + (y >> 1)) % 2 === 0 ? 1 : 0); // small scales / mail
  if (p === 3) return y % 3 === 0 ? -2 : (y % 3 === 1 && x % 2 === 0 ? 1 : 0); // laced lames
  if (p === 4) return x % 2 === 0 ? -1 : 0;                                  // splints
  if (p === 6) return x % 3 === 0 ? -1 : (x % 3 === 1 ? 1 : 0);              // hakama pleats
  return 0;
}
// ---- to pixels ----
const RGB = {}; const rgb = hex => RGB[hex] || (RGB[hex] = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);
function toPix(B) { // straight to RGBA bytes plus a mask, for the scene's own rasteriser
  const RT = B.ramps || RAMP, d = new Uint8ClampedArray(B.w * B.h * 4);
  for (let i = 0; i < B.w * B.h; i++) { let c = null, a = 1; if (B.ink[i]) { c = B.ink[i]; a = B.al[i]; } else if (B.lv[i] >= 0) { const R = RT[B.mat[i]] || RAMP[B.mat[i]]; c = R[clamp(B.lv[i], 0, R.length - 1)]; }
    if (!c) continue; const [r, gg, b] = rgb(c); d[i * 4] = r; d[i * 4 + 1] = gg; d[i * 4 + 2] = b; d[i * 4 + 3] = Math.round(a * 255); }
  return { w: B.w, h: B.h, d }; }
function toCanvas(B, flip = false) {
  const RT = B.ramps || RAMP;
  const cv = document.createElement('canvas'); cv.width = B.w; cv.height = B.h; const g = cv.getContext('2d'), im = g.createImageData(B.w, B.h), d = im.data;
  for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) { const i = y * B.w + x, o = (y * B.w + (flip ? B.w - 1 - x : x)) * 4;
    let c = null, a = 1; if (B.ink[i]) { c = B.ink[i]; a = B.al[i]; } else if (B.lv[i] >= 0) { const R = RT[B.mat[i]] || RAMP[B.mat[i]]; c = R[clamp(B.lv[i], 0, R.length - 1)]; }
    if (!c) continue; const [r, gg, b] = rgb(c); d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = Math.round(a * 255); }
  g.putImageData(im, 0, 0); return cv;
}

export { drawFigure, toPix, toCanvas, skeleton };
