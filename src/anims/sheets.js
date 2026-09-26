import { COL, FW, FH, OX, OY } from '../config.js';
import { ANIMS } from './anims.js';
import { OPEN_FRONT, INVITE_FRONT, frontFrame, sitFrame } from './hand-drawn.js';
import { POSES, GLF } from './poses.js';
import { rig } from '../rig/rig.js';

// ---- Sheets: every animation is baked to a strip at load, so a dropped-in PNG strip can replace any one of them ----
function sliceGlitch(g, fx, s, seed) {
  let r = seed * 9301 + 49297;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const d = g.getImageData(fx, 0, FW, FH);
  const out = g.createImageData(FW, FH);
  for (let y = 0; y < FH;) {
    const h = 1 + (rnd() * 3 | 0), off = rnd() < s ? Math.round((rnd() - .5) * 10 * s) : 0;
    for (let yy = y; yy < Math.min(FH, y + h); yy++) for (let x = 0; x < FW; x++) {
      const sx = x - off; if (sx < 0 || sx >= FW) continue;
      const i = (yy * FW + x) * 4, j = (yy * FW + sx) * 4;
      for (let k = 0; k < 4; k++) out.data[i + k] = d.data[j + k];
    }
    y += h;
  }
  g.putImageData(out, fx, 0);
  g.fillStyle = COL.fx;
  for (let k = 0; k < 3 * s; k++) g.fillRect(fx + 14 + (rnd() * 20 | 0), 14 + (rnd() * 24 | 0), 3 + (rnd() * 8 | 0), 1);
}

function placeholderSheet(name) {
  const { n } = ANIMS[name];
  const c = document.createElement('canvas'); c.width = FW * n; c.height = FH;
  const g = c.getContext('2d');
  for (let i = 0; i < n; i++) {
    if (name === 'sit' || name === 'sitDown' || name === 'standUp') { sitFrame(g, i * FW, name, i); continue; }
    if (name === 'ready4' || name === 'ready5') { frontFrame(g, i * FW, name === 'ready4' ? OPEN_FRONT : INVITE_FRONT, i); continue; }
    const ps = POSES[name], p = ps && ps[i % ps.length];   // exec has no sheet: its stage draws him live
    if (p) rig(g, i * FW, p);
    const gl = GLF[name] && GLF[name][i];
    if (gl) sliceGlitch(g, i * FW, gl, i + name.length * 7);
  }
  return { img: c, fw: FW, fh: FH, n, ox: OX, oy: OY, custom: false };
}

for (const k in POSES) if (ANIMS[k]) ANIMS[k].n = POSES[k].length;   // keyframed moves decide their own length
export const SHEETS = {};
for (const k in ANIMS) SHEETS[k] = placeholderSheet(k);
export const dur = k => ANIMS[k].n / ANIMS[k].fps;
