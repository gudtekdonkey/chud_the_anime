import { TAU, UP, V } from './skeleton.js';

// ---- Cloth: verlet grids and chains in 3D, pinned to the bones, kept out of his body and legs (from prototypes/19) ----
export class Cloth { constructor(n) { this.p = new Float32Array(n * 3); this.o = new Float32Array(n * 3); this.r = new Float32Array(n * 3); this.ok = false; } }
export const bone = (J, f) => f === 'h' ? { L: J.Lh, fr: J.Hh, yf: J.Hy } : { L: J.Lc, fr: J.Hc, yf: J.Cy };
export const dims = part => part.kind === 'chain' ? [1, part.n] : [part.cols, part.rows];
export const isCloth = part => part.kind === 'chain' || part.kind === 'sheet' || part.kind === 'skirt';
// the shape the cloth wants to hang in, measured from the bones
function restFill(out, part, J) {
  const { L, fr, yf } = bone(J, part.f), [cols, rows] = dims(part);
  const put = (k, q) => { out[k * 3] = q[0]; out[k * 3 + 1] = q[1]; out[k * 3 + 2] = q[2]; };
  if (part.kind === 'chain') { const d = V.norm(V.add(V.add(V.mul(yf.F, part.dir[0]), V.mul(UP, part.dir[1])), V.mul(yf.R, part.dir[2]))), a = L(part.u, part.v, part.b);
    for (let j = 0; j < rows; j++) put(j, V.add(a, V.mul(d, part.seg * j))); return; }
  if (part.kind === 'sheet') { const d = V.norm(V.add([0, -1, 0], V.mul(yf.F, -part.back)));
    for (let i = 0; i < cols; i++) { const a = L(part.u, part.v, part.b0 + (part.b1 - part.b0) * i / (cols - 1));
      for (let j = 0; j < rows; j++) put(j * cols + i, V.add(a, V.mul(d, part.seg * j))); } return; }
  // skirt: a ring around the body, hanging down (the frame's down for stiff pieces, world down for loose ones)
  const R = part.ring, down = part.down === 'frame' ? V.mul(fr.U, -1) : [0, -1, 0];
  for (let i = 0; i < cols; i++) {
    const a = part.arc ? part.arc[0] + (part.arc[1] - part.arc[0]) * i / (cols - 1) : i / cols * TAU, c = Math.cos(a), s = Math.sin(a);
    const top = L(R.u, c * (c >= 0 ? R.vf : -R.vb), s * R.b), out = V.norm(V.add(V.mul(yf.F, c), V.mul(yf.R, s)));
    const drop = part.drop[0] * (1 + c) / 2 + part.drop[1] * (1 - c) / 2;
    for (let j = 0; j < rows; j++) { let k = j / (rows - 1); if (j === rows - 1 && part.jag) k *= 1 - part.jag * (i % 2);
      put(j * cols + i, V.add(V.add(top, V.mul(down, drop * k)), V.mul(out, (part.flare || 0) * k))); }
  }
}
function collide(q, J) {
  // torso: an elliptic capsule from pelvis to neck
  const a = J.pelvis, b = J.neck, ab = V.sub(b, a), t = Math.max(0, Math.min(1, V.dot(V.sub(q, a), ab) / V.dot(ab, ab)));
  if (t > 0 && t < 1) { const c = V.add(a, V.mul(ab, t)), r = V.sub(q, c), F = t > .45 ? J.Cy.F : J.Hy.F, Rr = t > .45 ? J.Cy.R : J.Hy.R;
    const x = V.dot(r, F), y = V.dot(r, Rr), ra = x > 0 ? 2.9 : 3.0, rb = 3.3, e = (x / ra) ** 2 + (y / rb) ** 2;
    if (e < 1) { const k = 1 / Math.sqrt(Math.max(e, 1e-4)) - 1, push = V.add(V.mul(F, x * k), V.mul(Rr, y * k)); q[0] += push[0]; q[2] += push[2]; q[1] += push[1]; } }
  for (const [A, B] of J.cols) { const ab2 = V.sub(B, A), t2 = Math.max(0, Math.min(1, V.dot(V.sub(q, A), ab2) / V.dot(ab2, ab2))), c = V.add(A, V.mul(ab2, t2)), r = V.sub(q, c), d = V.len(r);
    if (d < 1.6 && d > 1e-4) { const k = (1.6 - d) / d; q[0] += r[0] * k; q[1] += r[1] * k; q[2] += r[2] * k; } }
  if (q[1] < .3) q[1] = .3;   // never through the floor
}
// one step: gravity, the breeze and his own motion (env.wind), then the links, the pull back to the cut (stiff), the body
export function clothStep(C, part, J, env, dt) {
  const [cols, rows] = dims(part), n = cols * rows, P = C.p, O = C.o, R = C.r;
  restFill(R, part, J);
  if (!C.ok) { P.set(R); O.set(R); C.ok = true; }
  const damp = .965, dt2 = dt * dt, loop = part.kind === 'skirt' && !part.arc;
  for (let k = cols; k < n; k++) { const j = (k / cols) | 0, ex = j / (rows - 1), i3 = k * 3;
    const fl = Math.sin(env.t * 7.3 + k * 1.7) * 8 * ex;
    for (let d = 0; d < 3; d++) { const v = (P[i3 + d] - O[i3 + d]) * damp; O[i3 + d] = P[i3 + d];
      const acc = d === 1 ? -150 : env.wind[d] * (.35 + .65 * ex) * (part.catch ?? 1) + (d === 0 ? fl : fl * .5);
      P[i3 + d] += v + acc * dt2; } }
  const link = (i, j, pin) => { const a = i * 3, b = j * 3;
    const rx = R[b] - R[a], ry = R[b + 1] - R[a + 1], rz = R[b + 2] - R[a + 2], rest = Math.hypot(rx, ry, rz);
    const dx = P[b] - P[a], dy = P[b + 1] - P[a + 1], dz = P[b + 2] - P[a + 2], d = Math.hypot(dx, dy, dz) || 1e-6, k = (d - rest) / d;
    if (pin) { P[b] -= dx * k; P[b + 1] -= dy * k; P[b + 2] -= dz * k; }
    else { P[a] += dx * k / 2; P[a + 1] += dy * k / 2; P[a + 2] += dz * k / 2; P[b] -= dx * k / 2; P[b + 1] -= dy * k / 2; P[b + 2] -= dz * k / 2; } };
  for (let it = 0; it < 6; it++) {
    for (let i = 0; i < cols * 3; i++) P[i] = R[i];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const k = j * cols + i;
      if (j + 1 < rows) link(k, k + cols, j === 0);
      if (i + 1 < cols) link(k, k + 1, j === 0); else if (loop) link(k, j * cols, j === 0); }
  }
  const st = part.stiff || 0, q = [0, 0, 0];
  for (let k = cols; k < n; k++) { const i3 = k * 3;
    for (let d = 0; d < 3; d++) P[i3 + d] += (R[i3 + d] - P[i3 + d]) * st;
    q[0] = P[i3]; q[1] = P[i3 + 1]; q[2] = P[i3 + 2]; if (part.collide !== false) collide(q, J); P[i3] = q[0]; P[i3 + 1] = q[1]; P[i3 + 2] = q[2]; }
  for (let i = 0; i < cols * 3; i++) P[i] = R[i];
}
export function drawCloth(S, C, part, J) {
  const [cols, rows] = dims(part), P = C.p, pt = k => [P[k * 3], P[k * 3 + 1], P[k * 3 + 2]], col = part.col, bias = part.bias || 0;
  if (part.kind === 'chain') {
    for (let j = 0; j + 1 < rows; j++) { const far = j >= rows * (part.split ?? .5); S.seg(pt(j), pt(j + 1), far ? part.w[1] : part.w[0], far ? col[1] : col[0], bias); }
    if (part.tassel) { const e = S.P(pt(rows - 1)); S.dot(e[0], e[1] + 1, e[2] + bias, 1, part.tassel); }
    return; }
  const cam = V.norm([0, S.kz, 1]), loop = part.kind === 'skirt' && !part.arc, { yf } = bone(J, part.f), axis = part.kind === 'skirt' ? J.pelvis : null;
  for (let j = 0; j + 1 < rows; j++) for (let i = 0; i < (loop ? cols : cols - 1); i++) {
    const i2 = (i + 1) % cols;
    if (part.lens && (j + 1 >= part.lens[i] || j + 1 >= part.lens[i2])) continue;
    if (part.holes && part.holes.some(([hi, hj]) => hi === i && hj === j)) continue;
    const a = pt(j * cols + i), b = pt(j * cols + i2), c = pt((j + 1) * cols + i2), d = pt((j + 1) * cols + i);
    const n = V.cross(V.sub(b, a), V.sub(d, a)), mid = V.mul(V.add(V.add(a, b), V.add(c, d)), .25);
    const o = axis ? [mid[0] - axis[0], 0, mid[2] - axis[2]] : V.mul(yf.F, -1);
    const outer = (V.dot(n, cam) > 0) === (V.dot(n, o) > 0);
    const last = j + 2 >= (part.lens ? Math.min(part.lens[i], part.lens[i2]) : rows);
    const key = last && col.hem ? col.hem : outer ? (col.edge && (i === 0 || i2 === cols - 1) && !loop ? col.edge : col.out) : col.in;
    const z = mid[2] + bias, sp = [a, b, c, d].map(q => S.P(q));
    S.poly(sp, z, key); S.seg(a, d, 1, key, bias); S.seg(b, c, 1, key, bias);
  }
}
