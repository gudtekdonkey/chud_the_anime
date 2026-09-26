import { TAU, V } from './skeleton.js';
import { bone } from './cloth.js';
import { bandLine, ring, DARK, LIGHT, lit } from './raster.js';
import { drawHat3d } from '../rig/body3d.js';
import { HD, strawHD, mantleHD } from '../rig/rig.js';

// ---- The wardrobe: every item is data, measured from the bones, so it fits every pose (and, with rig v2, every facing) ----
// Items and numbers from prototypes/19-rig-v2-and-clothing.html. Frames: 'h' hips, 'c' chest; u up the spine, v forward, b to his right.
// bias: depth nudge for layering. Colours are shades of black (c0..c6 in RC), never bright.
const TATTER = [11, 9, 11, 8, 10, 7];
const MANTLE_RING = { f: 'c', u: 7.5, vf: 2.7, vb: -2.9, b: 3.6 }, NECK = [{ f: 'c', u: 8.1, vf: 1.9, vb: -2.1, b: 2.4 }, { f: 'c', u: 9.2, vf: 1.6, vb: -1.8, b: 2.0 }];
// the straw hat, side on: wide enough to keep the rain, and his eyes, out of sight (keep its height-to-width ratio)
const STRAW = ['........GGGG........', '.....GGHHHHHHGG.....', '..GGHHHHHHHHHHHHGG..', '.GBBBBBBBBBBBBBBBBG.', '..KBBBBBBBBBBBBBBK..'];
// and from every other facing: rig v2's stacked ellipses (prototypes/19)
const STRAW_3D = { sit: 3, levels: [{ h: -1, r: 8, fill: 'B', edge: 'K' }, { h: 0, r: 9, fill: 'B', edge: 'G' }, { h: 1, r: 8, fill: 'H', edge: 'G', ew: 2 }, { h: 2, r: 5, fill: 'H', edge: 'G', ew: 2 }, { h: 3, r: 2, fill: 'G', edge: 'G' }] };
export const ITEMS = [
  // ---- head ----
  { id: 'straw', slot: 'head', name: 'Wide straw hat', about: 'The one he walked in with. Its brim tips forward on a cut.',
    parts: [{ kind: 'sidehat', rows: STRAW, hd: (...a) => strawHD(...a), hat3d: STRAW_3D, bias: 2.6 }] },   // over his head and eye, under the mantle and the near arm
  // ---- shoulders ----
  { id: 'mantle', slot: 'shoulders', name: 'Flat mantle', about: 'His mantle from the start. Draped flat down the back, never a hump; its tip lifts a hair when he moves.',
    parts: [{ kind: 'drape', col: 'M', edge: 'm', bias: 2.65 }] },   // over the head and hat, under the near arm, as it always was
  { id: 'ragged', slot: 'shoulders', name: 'Ragged mantle', about: 'Short and heavy, frayed at the hem. It settles back onto his shoulders after every cut.',
    parts: [{ kind: 'shell', rings: [{ f: 'c', u: 8.8, vf: 1.5, vb: -1.8, b: 2.2 }, MANTLE_RING], col: ['c5'], bias: .5 },
      { kind: 'skirt', f: 'c', ring: MANTLE_RING, cols: 16, rows: 2, drop: [1.9, 4.3], flare: .5, jag: .35, down: 'frame', stiff: .35, catch: .6, col: { out: 'c2', in: 'c0' }, bias: .5 }] },
  { id: 'crow', slot: 'shoulders', name: 'Crow mantle', about: 'Long feathered layers to the elbow. They lift like wings when he turns.',
    parts: [{ kind: 'shell', rings: [{ f: 'c', u: 8.8, vf: 1.5, vb: -1.8, b: 2.2 }, MANTLE_RING], col: ['c4'], bias: .5 },
      { kind: 'skirt', f: 'c', ring: MANTLE_RING, cols: 16, rows: 3, drop: [3.4, 5.6], flare: 1.1, jag: .45, down: 'frame', stiff: .12, catch: .8, col: { out: 'c1', in: 'c0', hem: 'c0' }, bias: .5 }] },
  // ---- neck ----
  { id: 'scarf', slot: 'neck', name: 'Short scarf', about: 'A wrap and a stub of a tail. Just enough to flick when he stops.',
    parts: [{ kind: 'shell', rings: NECK, col: ['c4'], bias: .9 },
      { kind: 'chain', f: 'c', u: 8.7, v: -2.1, b: 1, n: 5, seg: 1.4, dir: [-.6, -1, .2], w: [2, 1], col: ['c4', 'c3'], stiff: .02, bias: .9 }] },
  { id: 'longscarf', slot: 'neck', name: 'Long scarf', about: 'Two long tails that stream a body-length behind him when he runs.',
    parts: [{ kind: 'shell', rings: NECK, col: ['c3'], bias: .9 },
      { kind: 'chain', f: 'c', u: 8.7, v: -2.1, b: .9, n: 14, seg: 1.5, dir: [-.6, -1, .2], w: [2, 1], split: .6, col: ['c3', 'c2'], catch: 1.4, bias: .9 },
      { kind: 'chain', f: 'c', u: 8.5, v: -2.1, b: -.3, n: 9, seg: 1.4, dir: [-.6, -1, -.2], w: [1, 1], col: ['c2', 'c2'], catch: 1.2, bias: .85 }] },
  // ---- back ----
  { id: 'cape', slot: 'back', name: 'Short cape', about: 'Shoulder to hip. It swings wide on a turn and snaps back.',
    parts: [{ kind: 'sheet', f: 'c', u: 8.1, v: -2.3, b0: -2.5, b1: 2.5, cols: 5, rows: 7, seg: 1.5, back: .3, stiff: .01, col: { out: 'c4', in: 'c1', hem: 'c2', edge: 'c5' }, bias: 0 }] },
  { id: 'tattered', slot: 'back', name: 'Tattered long cape', about: 'Torn to the knee, with holes you can see the floor through.',
    parts: [{ kind: 'sheet', f: 'c', u: 8.1, v: -2.3, b0: -2.7, b1: 2.7, cols: 6, rows: 11, seg: 1.6, back: .3, stiff: .005, lens: TATTER, holes: [[1, 5], [3, 7], [4, 3]], col: { out: 'c2', in: 'c0', hem: 'c1', edge: 'c4' }, bias: 0 }] },
  // ---- waist ----
  { id: 'obi', slot: 'waist', name: 'Obi sash', about: 'A wide sash, knotted at the back, its two tails following him.',
    parts: [{ kind: 'shell', rings: [{ f: 'h', u: 1.4, vf: 2.3, vb: -2.3, b: 2.6 }, { f: 'h', u: 3.1, vf: 2.3, vb: -2.4, b: 2.6 }], col: ['c3'], bias: .3 },
      { kind: 'line', f: 'h', u: 3.1, vf: 2.3, vb: -2.4, b: 2.6, col: 'c5', bias: .35 },
      { kind: 'knot', f: 'h', u: 2.3, v: -2.7, b: -.6, size: 2, col: 'c4', bias: .4 },
      { kind: 'chain', f: 'h', u: 2, v: -2.8, b: -.9, n: 5, seg: 1.3, dir: [-.3, -1, 0], w: [2, 1], col: ['c3', 'c2'], bias: .35 },
      { kind: 'chain', f: 'h', u: 2, v: -2.8, b: -.2, n: 4, seg: 1.3, dir: [-.3, -1, .2], w: [1, 1], col: ['c2', 'c2'], bias: .3 }] },
  { id: 'cord', slot: 'waist', name: "Wanderer's cord", about: 'A thin rope belt. One tasselled end swings at his left hip.',
    parts: [{ kind: 'line', f: 'h', u: 2.3, vf: 2.25, vb: -2.3, b: 2.55, col: 'c5', bias: .3 },
      { kind: 'knot', f: 'h', u: 2.2, v: 1.3, b: -2.2, size: 2, col: 'c5', bias: .35 },
      { kind: 'chain', f: 'h', u: 2, v: 1.3, b: -2.4, n: 5, seg: 1.2, dir: [.1, -1, -.1], w: [1, 1], col: ['c5', 'c4'], tassel: 'c4', bias: .35 }] },
  // ---- body ----
  { id: 'plates', slot: 'body', name: 'Lamellar plates', about: 'Light lacquered plates on the chest, shoulders and hips. Enough to turn a glancing cut.',
    parts: [{ kind: 'shell', rings: [{ f: 'c', u: 4.2, vf: 2.4, vb: -2.6, b: 2.6 }, { f: 'c', u: 7.4, vf: 2.7, vb: -2.8, b: 3.1 }], col: ['c3'], bias: .2 },
      { kind: 'line', f: 'c', u: 5.3, vf: 2.5, vb: -2.7, b: 2.8, col: 'c5', bias: .25 }, { kind: 'line', f: 'c', u: 6.4, vf: 2.6, vb: -2.75, b: 3.0, col: 'c5', bias: .25 },
      { kind: 'skirt', f: 'h', ring: { u: 1, vf: 2.5, vb: -2.6, b: 2.9 }, cols: 8, rows: 2, drop: [3.6, 3.6], flare: 1, down: 'frame', stiff: .45, catch: .3, col: { out: 'c2', in: 'c0', hem: 'c4' }, bias: .2 },
      { kind: 'sode', col: 'c3', edge: 'c5', bias: .8 }] },
  { id: 'coat', slot: 'body', name: 'Long coat', about: 'Knee-length and open at the front, so the skirts part around his legs.',
    parts: [{ kind: 'shell', rings: [{ f: 'h', u: .3, vf: 2.3, vb: -2.3, b: 2.6 }, { f: 'c', u: 4, vf: 2.3, vb: -2.4, b: 2.5 }, { f: 'c', u: 7.3, vf: 2.6, vb: -2.7, b: 3.1 }, { f: 'c', u: 8.7, vf: 1.8, vb: -2, b: 2.1 }], col: ['c1', 'c1', 'c3'], bias: .15 },
      { kind: 'lapel', col: 'c4', bias: .3 },
      { kind: 'skirt', f: 'h', ring: { u: .5, vf: 2.6, vb: -2.7, b: 3 }, arc: [.5, TAU - .5], cols: 12, rows: 4, drop: [5.4, 6], flare: 1.3, stiff: .05, col: { out: 'c1', in: 'c0', hem: 'c0', edge: 'c3' }, bias: .15 }] },
  // ---- hands ----
  { id: 'wraps', slot: 'hands', name: 'Hand wraps', about: 'Cloth bound from knuckle to elbow, for the grip.', parts: [{ kind: 'arm', style: 'wrap', col: ['c5', 'c3'], bias: .3 }] },
  { id: 'kote', slot: 'hands', name: 'Iron kote', about: 'Armoured sleeves, plated from the wrist to the elbow.', parts: [{ kind: 'arm', style: 'kote', col: ['c3', 'c4'], edge: 'c6', bias: .3 }] },
];
export const BY_ID = Object.fromEntries(ITEMS.map(i => [i.id, i]));
export const SLOTS = [['head', 'Head'], ['shoulders', 'Shoulders'], ['neck', 'Neck'], ['back', 'Back'], ['waist', 'Waist'], ['body', 'Body'], ['hands', 'Hands']];
// the straw hat and the flat mantle are his look today, so they are what he starts in
export const OUTFITS = [
  { name: 'Default', items: ['straw', 'mantle'] },
  { name: 'Wanderer', items: ['straw', 'ragged', 'obi', 'wraps'] },
  { name: 'Ghost', items: ['straw', 'longscarf', 'tattered', 'cord'] },
  { name: 'Retainer', items: ['straw', 'plates', 'cape', 'obi', 'kote'] },
  { name: 'Night coat', items: ['straw', 'crow', 'coat', 'scarf'] },
  { name: 'Bare', items: [] },
];

// ---- Rigid parts: shells round the body, lines, knots, plates, arm overlays, and the flat mantle ----
const DRAPE_3D = [{ f: 'c', u: 8.8, vf: 1.5, vb: -1.8, b: 2.2 }, { f: 'c', u: 6.8, vf: 2.5, vb: -3.0, b: 3.3 }];
function drawShell(S, part, J) {
  const n = 16, rings = part.rings.map(r => ring(bone(J, r.f).L, r.u, r.vf, r.vb, r.b, n)), bias = part.bias || 0, ax = J.pelvis, cam = V.norm([0, S.kz, 1]);
  for (let k = 0; k + 1 < rings.length; k++) for (let i = 0; i < n; i++) {
    const i2 = (i + 1) % n, a = rings[k][i], b = rings[k][i2], c = rings[k + 1][i2], d = rings[k + 1][i];
    const nn = V.cross(V.sub(b, a), V.sub(d, a)), mid = V.mul(V.add(V.add(a, b), V.add(c, d)), .25);
    const rad = [mid[0] - ax[0], 0, mid[2] - ax[2]], outer = (V.dot(nn, cam) > 0) === (V.dot(nn, rad) > 0);
    let key = outer ? part.col[k] : (part.inner || 'c0');
    // HD: faces turned from the light a shade down, and a seam where one band of the shell meets the next
    if (HD && outer && lit(V.dot(nn, rad) > 0 ? nn : V.mul(nn, -1)) < -.05) key = DARK[key] || key;
    S.poly([a, b, c, d].map(q => S.P(q)), mid[2] + bias, key);
    S.seg(a, d, HD ? .5 : 1, key, bias);
  }
}
export function drawPart(S, part, J) {
  const bias = part.bias || 0;
  if (part.kind === 'shell') return drawShell(S, part, J);
  if (part.kind === 'line') { if (HD) bandLine(S, J, part.f, part.u - .45, part.vf, part.vb, part.b, DARK[part.col] || part.col, bias - .01, .5);
    return bandLine(S, J, part.f, part.u, part.vf, part.vb, part.b, part.col, bias, HD ? .5 : part.w || 1); }
  if (part.kind === 'lapel') { if (J.Hc.F[2] > .25) for (const s of [1, -1]) { S.seg(J.Lc(8.6, 2.3, s * 1.4), J.Lc(4.4, 2.5, s * .6), HD ? .5 : 1, part.col, bias);
      if (HD) S.seg(J.Lc(8.5, 2.35, s * 1.75), J.Lc(4.6, 2.55, s * .95), .5, DARK[part.col] || part.col, bias - .01); } return; }
  if (part.kind === 'knot') { const L = bone(J, part.f).L, q = S.P(L(part.u, part.v, part.b)); S.dot(q[0], q[1], q[2] + bias, part.size, part.col);
    if (HD) { const l = S.P(L(part.u + .4, part.v, part.b - .5)); S.dot(l[0], l[1], l[2] + bias + .01, .5, LIGHT[part.col] || part.col);   // the knot's lit bulge
      for (const s of [-1, 1]) { const e = S.P(L(part.u + .2, part.v - .2, part.b + s * 1.2)); S.dot(e[0], e[1], e[2] + bias - .01, .5, DARK[part.col] || part.col); } }   // its two loops
    return; }
  if (part.kind === 'sidehat') {  // a hat drawn side on, its brim resting on the head, nudged forward by the pose (p.hat)
    if (!J.flat) return drawHat3d(S, J, part.hat3d, 0);   // any other facing: the same hat in the round
    if (HD && part.hd) return part.hd((x, y, c) => S.px(x, y, bias, c), J.hcR, J.p.hat);   // 2x: the hat's own detailed drawing
    const [hx, hy] = J.hc, w = part.rows[0].length, x0 = Math.round(hx) - (w >> 1) + 1 + J.p.hat, y0 = Math.round(hy) - 1 - part.rows.length;
    part.rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') S.px(Math.round(x0 + x), y0 + y, bias, ch); }));
    return; }
  if (part.kind === 'drape') {   // the game's first mantle, flat down the back: the side rig's polygon, its back tip lifting with the flutter
    if (!J.flat) return drawShell(S, { rings: DRAPE_3D, col: [part.col], inner: part.edge, bias: .5 }, J);   // any other facing: a close shell over the shoulders
    const L = (u, v) => S.P(J.L(u, v, 0)), f = J.p.flutter || 0, z = bias;
    S.poly([L(8.4, 2.3), L(8.9, -1.6), L(6.8, -2.9), L(3.0, -3.0 - f * .7), L(3.6, -1.2), L(5.4, 2.7)], z, part.col);
    S.seg(J.L(8.4, 2.1, 0), J.L(8.8, -1.4, 0), HD ? .5 : 1, part.edge, bias);
    if (HD) mantleHD((u, v) => J.L(u, v, 0), f, (a, b, w, c) => S.seg(a, b, w, c, bias), part.col, 'B');
    if (f > .5) { const q = L(2.6, -3.4); S.dot(q[0], q[1], z, 1, part.col); }
    return; }
  if (part.kind === 'sode') {   // a plate hung from each shoulder over the upper arm
    for (const k of ['r', 'l']) { const A = J.arm[k], al = V.norm(V.sub(A.el, A.sh)), ac = J.Cy.F, out = V.mul(J.Cy.R, A.s);
      const q = [V.add(V.add(A.sh, V.mul(out, 1.2)), V.add(V.mul(ac, 1.7), [0, .8, 0])), V.add(V.add(A.sh, V.mul(out, 1.2)), V.add(V.mul(ac, -1.7), [0, .8, 0])),
        V.add(V.add(A.sh, V.mul(al, 3.4)), V.add(V.mul(out, 1.3), V.mul(ac, -1.9))), V.add(V.add(A.sh, V.mul(al, 3.4)), V.add(V.mul(out, 1.3), V.mul(ac, 1.9)))];
      const z = (q[0][2] + q[2][2]) / 2 + bias + A.dz; S.poly(q.map(p => S.P(p)), z, part.col); S.seg(q[2], q[3], HD ? .5 : 1, part.edge, bias + A.dz + .05);
      if (HD) for (const t of [.33, .66]) { const a = V.lerp(q[1], q[2], t), b = V.lerp(q[0], q[3], t);   // lamellar rows
        S.seg(a, b, .5, DARK[part.col] || part.col, bias + A.dz + .04); } }
    return; }
  if (part.kind === 'arm') {
    for (const k of ['r', 'l']) { const A = J.arm[k], near = A.col === 'K', b = bias + A.dz;
      if (part.style === 'wrap' && HD) {   // bands wound on the bias from the knuckles to the elbow, the loose end hanging at the wrist
        for (let i = 0; i <= 16; i++) { const t = .3 + .7 * i / 16, q = S.P(V.lerp(A.el, A.hand, t)); S.dot(q[0], q[1], q[2] + b, 1, part.col[1]);
          if (i % 3 === 0) S.seg(V.add(V.lerp(A.el, A.hand, t), [0, .45, 0]), V.add(V.lerp(A.el, A.hand, t + .06), [0, -.45, 0]), .5, part.col[0], b + .02); }
        const h = S.P(A.hand); S.dot(h[0], h[1], h[2] + b, 2, near ? part.col[1] : part.col[0]);
        const w = V.lerp(A.el, A.hand, .9); S.seg(w, V.add(w, [-.4, -1.4, 0]), .5, part.col[0], b + .03); }
      else if (part.style === 'wrap') { for (let i = 0; i <= 10; i++) { const t = .35 + .65 * i / 10, q = S.P(V.lerp(A.el, A.hand, t)); S.dot(q[0], q[1], q[2] + b, 1, i % 2 ? part.col[0] : part.col[1]); }
        const h = S.P(A.hand); S.dot(h[0], h[1], h[2] + b, 2, near ? part.col[1] : part.col[0]); }
      else { S.seg(V.lerp(A.el, A.hand, .1), V.lerp(A.el, A.hand, .85), 2, near ? part.col[0] : part.col[1], b);
        const w = S.P(V.lerp(A.el, A.hand, .85)); S.dot(w[0], w[1], w[2] + b + .05, 1, part.edge);
        const e = S.P(V.lerp(A.el, A.hand, .1)); S.dot(e[0], e[1], e[2] + b + .05, 2, part.edge);
        if (HD) for (const t of [.3, .5, .7]) { const a = V.lerp(A.el, A.hand, t); S.seg(V.add(a, [0, .5, 0]), V.add(a, [0, -.5, 0]), .5, part.edge, b + .06); } }   // the splints' edges
    }
  }
}
