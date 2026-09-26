import { COL, FW, FH, OX, OY } from '../config.js';
import { ANIMS } from './anims.js';
import { OPEN_FRONT, INVITE_FRONT, frontFrame, sitFrame } from './hand-drawn.js';
import { POSES, GLF } from './poses.js';
import { Raster } from '../wardrobe/raster.js';
import { dress, makeFigure } from '../wardrobe/dress.js';

// ---- Sheets: every animation is baked to a strip at load, so a dropped-in PNG strip can replace any one of them ----
// also run live on his dressed frame (player/draw.js), with the same seed, so it slices exactly as the baked frame does
export function sliceGlitch(g, fx, s, seed) {
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

// frames: the poses to bake (a weapon's, src/weapons/); art: the weapon's art for the hand-drawn rows, null for the katana.
// Each rig frame keeps its pose and glitch, so the player can be redrawn live in whatever he wears;
// the sheet itself is baked in his default outfit (mirror images and afterimages use it)
const R = new Raster(FW, FH, OX, OY);
export function placeholderSheet(name, frames = POSES[name], art = null) {
  const { n } = ANIMS[name];
  const c = document.createElement('canvas'); c.width = FW * n; c.height = FH;
  const g = c.getContext('2d'), poses = [], glf = [];
  for (let i = 0; i < n; i++) {
    let p = null;
    if (name === 'sit' || name === 'sitDown' || name === 'standUp') p = sitFrame(g, i * FW, name, i, art) || null;
    else if (name === 'ready4' || name === 'ready5') frontFrame(g, i * FW, name === 'ready4' ? OPEN_FRONT : INVITE_FRONT, i, art);
    else p = (frames && frames[i % frames.length]) || null;   // exec has no sheet: its stage draws him live
    if (p) g.drawImage(dress(R, makeFigure(), p), i * FW, 0);
    const gl = GLF[name] && GLF[name][i];
    if (gl) sliceGlitch(g, i * FW, gl, glitchSeed(name, i));
    poses.push(p); glf.push(gl || 0);
  }
  return { img: c, fw: FW, fh: FH, n, ox: OX, oy: OY, custom: false, poses, glf, name };
}
export const glitchSeed = (name, i) => i + name.length * 7;

for (const k in POSES) if (ANIMS[k]) ANIMS[k].n = POSES[k].length;   // keyframed moves decide their own length
export const SHEETS = {};
for (const k in ANIMS) SHEETS[k] = placeholderSheet(k);
export const dur = k => ANIMS[k].n / ANIMS[k].fps;
// after a move's poses change (a new personality): bake its sheet again, unless a dropped-in strip has replaced it
// BAKE: what a rebake bakes with, the equipped weapon's frames and art (weapons/weapons.js sets it on equip);
// onRebake: told which move was re-baked, so the other weapons' cached sheets of it are dropped and baked again on equip
export const BAKE = { frames: k => POSES[k], art: null }, onRebake = [];
export function rebake(k) { ANIMS[k].n = POSES[k].length; if (!SHEETS[k].custom) SHEETS[k] = placeholderSheet(k, BAKE.frames(k), BAKE.art); onRebake.forEach(f => f(k)); }
