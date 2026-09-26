import { g } from '../screen.js';

// ---- Item sprites (from prototypes/20-items.html): strings of palette letters, drawn once to small canvases ----
export const PAL = { K: '#0c0d11', k: '#1b1e25', D: '#2c323b', G: '#3b424c', g: '#565e66', L: '#7d868e', l: '#a9b1b6', W: '#e9eeee', w: '#ffffff',
  C: '#6ff3e4', c: '#52e8d6', B: '#b8fff6', P: '#d6dad6', p: '#9aa09c', R: '#3a2e31', r: '#5a4a4e' };
// an 'x' is a mark (the tablet's glyphs): drawn as G and remembered in marks
export function sprite(name, rows) {
  const w = Math.max(...rows.map(r => r.length)), c = document.createElement('canvas'); c.width = w; c.height = rows.length;
  const cg = c.getContext('2d'), marks = [];
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'x') { marks.push([x, y]); ch = 'G'; } if (PAL[ch]) { cg.fillStyle = PAL[ch]; cg.fillRect(x, y, 1, 1); } }));
  return { c, w, h: rows.length, marks, rows, name };
}
export function psprite(name, w, h, fn) { const rows = Array.from({ length: h }, () => Array(w).fill('.'));
  fn((x, y, ch) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) rows[y][x] = ch; }, rows);
  return sprite(name, rows.map(r => r.join(''))); }
export function disc(put, cx, cy, r, shade) { for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) { const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d <= r) put(x, y, shade(d, x + .5 - cx, y + .5 - cy)); } }
const TINT = new Map();
export function tinted(s, col) { const k = s.name + col; let c = TINT.get(k); if (c) return c;
  c = document.createElement('canvas'); c.width = s.w; c.height = s.h; const cg = c.getContext('2d'); cg.drawImage(s.c, 0, 0);
  cg.globalCompositeOperation = 'source-in'; cg.fillStyle = col; cg.fillRect(0, 0, s.w, s.h); TINT.set(k, c); return c; }
// a world sprite standing on the floor at (x, y): its reflection in the polished floor, a contact shadow, then the sprite (z lifts it)
export function drawS(s, x, y, o = {}) {
  const z = o.z || 0, x0 = Math.round(x - Math.floor(s.w / 2)), yb = Math.round(y), img = o.tint ? tinted(s, o.tint) : s.c;
  if (o.refl !== false) { g.save(); g.globalAlpha = .17 * (o.alpha ?? 1) * Math.max(0, 1 - z / 14); g.translate(0, 2 * yb); g.scale(1, -1); g.drawImage(s.c, x0, yb - s.h - Math.round(z)); g.restore(); }
  if (o.shadow !== false) { const sw = Math.max(2, s.w - 2 - Math.round(z / 2)); g.fillStyle = 'rgba(18,22,22,.4)'; g.fillRect(Math.round(x - sw / 2), yb, sw, 1); }
  g.save(); g.globalAlpha *= o.alpha ?? 1; g.drawImage(img, x0, yb - s.h - Math.round(z)); g.restore();
  return { x0, y0: yb - s.h - Math.round(z) };
}
// the box the lock-on brackets hug
export const boxOf = (s, x, y, pad = 2) => ({ x0: Math.round(x - Math.floor(s.w / 2)) - pad, x1: Math.round(x - Math.floor(s.w / 2)) + s.w - 1 + pad, y0: Math.round(y) - s.h - pad, y1: Math.round(y) + pad - 1 });
