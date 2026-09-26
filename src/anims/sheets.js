import { COL, FW, FH, OX, OY } from '../config.js';
import { ANIMS } from './anims.js';
import { OPEN_FRONT, INVITE_FRONT, frontFrame, sitFrame } from './hand-drawn.js';
import { POSES, GLF } from './poses.js';
import { rig } from '../rig/rig.js';
import { EL } from '../fx/element.js';
import { Raster } from '../wardrobe/raster.js';
import { dress, makeFigure } from '../wardrobe/dress.js';

// ---- Sheets: every animation is baked to a strip at load, so a dropped-in PNG strip can replace any one of them ----
// works on the rig's original 48x48 box round his feet, so the slices fall where they always did in the bigger frame;
//   also run live on his dressed frame (player/draw.js), with the same seed, so it slices exactly as the baked frame does
export function sliceGlitch(g, fx, s, seed) {
  let r = seed * 9301 + 49297;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const bx = fx + OX - 24, by = OY - 40, BW = 48, BH = 48;
  const d = g.getImageData(bx, by, BW, BH);
  const out = g.createImageData(BW, BH);
  for (let y = 0; y < BH;) {
    const h = 1 + (rnd() * 3 | 0), off = rnd() < s ? Math.round((rnd() - .5) * 10 * s) : 0;
    for (let yy = y; yy < Math.min(BH, y + h); yy++) for (let x = 0; x < BW; x++) {
      const sx = x - off; if (sx < 0 || sx >= BW) continue;
      const i = (yy * BW + x) * 4, j = (yy * BW + sx) * 4;
      for (let k = 0; k < 4; k++) out.data[i + k] = d.data[j + k];
    }
    y += h;
  }
  g.putImageData(out, bx, by);
  g.fillStyle = COL.fx;
  for (let k = 0; k < 3 * s; k++) g.fillRect(bx + 14 + (rnd() * 20 | 0), by + 14 + (rnd() * 24 | 0), 3 + (rnd() * 8 | 0), 1);
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
    if (gl && EL.cur.glitch) sliceGlitch(g, i * FW, gl, glitchSeed(name, i));
    poses.push(p); glf.push(EL.cur.glitch ? gl || 0 : 0);
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
// an element swap recolours his eyes and the baked glitch slices, so every placeholder is baked again
export function rebakeAll() { for (const k in ANIMS) if (!SHEETS[k].custom) SHEETS[k] = POSES[k] ? placeholderSheet(k, BAKE.frames(k), BAKE.art) : placeholderSheet(k); for (const k in ANIMS) onRebake.forEach(f => f(k)); }
