import { RC } from '../config.js';
import { TAU } from './skeleton.js';

// ---- The figure's raster: every pixel carries a depth and nearer wins, so clothing layers between his limbs whatever the pose ----
const pack = hex => { const n = parseInt(hex.slice(1), 16); return ((255 << 24) | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0; };
export const packPal = pal => Object.fromEntries(Object.entries(pal).map(([k, v]) => [k, pack(v)]));
const PK = packPal(RC);
export class Raster {
  // kz: the camera looks down at an angle, so a point nearer the camera sits kz px lower per px of depth (rig v2's camera)
  // pk: a packed palette (packPal), so a figure can be recoloured, the red-grey samurai say
  constructor(w, h, ox, oy, kz = .3, pk = PK) { Object.assign(this, { w, h, ox, oy, kz, pk }); this.c = new Uint32Array(w * h); this.z = new Float64Array(w * h);   // 64-bit, so a later part at the same depth still wins
    this.cv = document.createElement('canvas'); this.cv.width = w; this.cv.height = h; this.g = this.cv.getContext('2d');
    this.img = this.g.createImageData(w, h); this.u32 = new Uint32Array(this.img.data.buffer); }
  clear() { this.c.fill(0); this.z.fill(-1e9); }
  px(x, y, z, key) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = y * this.w + x; if (z >= this.z[i]) { this.z[i] = z; this.c[i] = this.pk[key]; } }
  P(q) { return [this.ox + q[0], this.oy - q[1] + q[2] * this.kz, q[2]]; }
  dot(sx, sy, z, w, key) { const x0 = Math.round(sx - (w - 1) / 2), y0 = Math.round(sy - (w - 1) / 2);
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) this.px(x0 + x, y0 + y, z, key); }
  seg(A, B, w, key, bias = 0) { const a = this.P(A), b = this.P(B), n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2));
    for (let i = 0; i <= n; i++) { const k = i / n; this.dot(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k + bias, w, key); } }
  poly(pts, z, key) {   // pixel-centre scanline fill, the same rule as the rig's poly()
    let y0 = 1e9, y1 = -1e9; for (const q of pts) { y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) { const xs = [], yc = y + .5;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > yc) !== (yj > yc)) xs.push((xj - xi) * (yc - yi) / (yj - yi) + xi); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - .5); x + .5 < xs[k + 1]; x++) this.px(x, y, z, key); } }
  // mirror: flipped about the feet the way a sprite drawn facing left is (column x to 2 ox - 1 - x), for his left side from the side rig
  flush(mirror = false) {
    if (!mirror) this.u32.set(this.c);
    else { const { w, h, ox } = this; this.u32.fill(0); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const x2 = 2 * ox - 1 - x; if (x2 >= 0 && x2 < w) this.u32[y * w + x2] = this.c[y * w + x]; } }
    this.g.putImageData(this.img, 0, 0); return this.cv; }
}
// a cross-section ring of the body in a frame: forward reach vf, back reach vb (negative), half-width b
export function ring(L, u, vf, vb, b, n = 16) {
  const out = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, c = Math.cos(a), s = Math.sin(a);
    out.push(L(u, c * (c >= 0 ? vf : -vb), s * b)); } return out;
}
// the visible half of a ring on the body, as a 1px line (belt lines, lacing, cords)
export function bandLine(R, J, f, u, vf, vb, b, key, bias, w = 1) {
  const L = f === 'h' ? J.Lh : J.Lc, fr = f === 'h' ? J.Hh : J.Hc, n = 20, pts = ring(L, u, vf, vb, b, n);
  for (let i = 0; i < n; i++) { const a = i / n * TAU, a2 = (i + 1) / n * TAU;
    const vis = th => fr.F[2] * Math.cos(th) + fr.R[2] * Math.sin(th) > -.05;
    if (vis(a) && vis(a2)) R.seg(pts[i], pts[(i + 1) % n], w, key, bias); }
}
