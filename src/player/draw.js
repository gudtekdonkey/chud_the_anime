import { COL, FW, FH, OX, OY, PX } from '../config.js';
import { g } from '../screen.js';
import { P, S, wear, INV } from '../state.js';
import { GLITCHY } from '../anims/anims.js';
import { SHEETS, sliceGlitch, glitchSeed } from '../anims/sheets.js';
import { Raster } from '../wardrobe/raster.js';
import { dress, turnCloth } from '../wardrobe/dress.js';
import { DIRS } from '../rig/port.js';
import { frameOf } from './actions.js';
import { glowK } from './body.js';
import { spriteTo, solid } from '../world/sprite.js';
import { EL } from '../fx/element.js';
import { dur } from '../anims/sheets.js';

// ---- Drawing him: shadow, reflection, afterimages, the charge rim, the strike flash, the glitch slice; and his mirror images ----
const buf = document.createElement('canvas'), bg2 = buf.getContext('2d');
// his silhouette dilated by a pixel, in cyan at low alpha, flickering behind him; a second, paler pixel once the charge is high
function rim(sheet, f, x, y, face, k) {
  const fl = .7 + Math.random() * .3, sh = solid(sheet, f, COL.fx);
  for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) spriteTo(g, sh, 0, x + ox, y + oy, face, (.14 + .5 * k) * fl);
  if (k > .6) { const s2 = solid(sheet, f, COL.fx2); for (const [ox, oy] of [[2, 0], [-2, 0], [0, -2], [1, -1], [-1, -1]]) spriteTo(g, s2, 0, x + ox, y + oy, face, (k - .6) * .4 * fl); }
}
// his frame drawn live in what he wears, the cloth stepped by the time since the last draw (held still in the hit pause).
// A dropped-in strip or a hand-drawn frame (the views the side rig cannot pose) is used as it is.
const R = new Raster(FW, FH, OX, OY), last = { t: 0, x: 0, y: 0, face: 1 };
// the moves that turn with him (P.view, from the way he last moved); every attack and skill is still drawn side on.
// Harvest faces north: he stands with his back to the camera and lets it come to him (owner).
const YAW = Object.fromEntries(DIRS.map(d => [d.id, d.yaw])), TURNS = new Set(['idle', 'idleGlitch', 'walk', 'run', 'runArmed']);
export const viewYaw = () => P.state === 'harvest' ? YAW.N : TURNS.has(P.state) ? YAW[P.view] || 0 : 0;
function dressed(sheet, f) {
  const now = performance.now() / 1000, dt = S.hitstop > 0 ? 0 : Math.min(.05, Math.max(0, now - last.t));
  if (P.face !== last.face) turnCloth(wear);
  // his own motion is wind on the cloth, in his facing; a teleport is not a gale
  const cl = v => Math.max(-300, Math.min(300, v));
  if (dt > 0) wear.vel = [cl((P.x - last.x) / dt * P.face), cl((P.y - last.y) / dt)];
  Object.assign(last, { t: now, x: P.x, y: P.y, face: P.face }); wear.t += dt;
  const p = !sheet.custom && sheet.poses && sheet.poses[f];
  if (!p) return [sheet, f];
  const cv = dress(R, wear, p, dt, viewYaw());
  if (sheet.glf[f]) sliceGlitch(R.g, 0, sheet.glf[f], glitchSeed(sheet.name, f));
  return [{ img: cv, fw: FW, fh: FH, ox: OX, oy: OY, s: PX }, 0];
}
// the whetstone's cyan edge: the frame with the blade's white swapped for cyan; a baked sheet's frames are cached,
// a live dressed frame is recoloured as it is drawn
const EDGE = new WeakMap(), BLADE_RGB = [233, 238, 238], EDGE_RGB = [111, 243, 228], EDGE_C = document.createElement('canvas');
function edged(sheet, f, cache) {
  let m = cache && EDGE.get(sheet); if (cache && !m) EDGE.set(sheet, m = new Map());
  let c = m && m.get(f);
  if (!c) { c = cache ? document.createElement('canvas') : EDGE_C; c.width = sheet.fw; c.height = sheet.fh; const cg = c.getContext('2d', { willReadFrequently: true });
    cg.drawImage(sheet.img, f * sheet.fw, 0, sheet.fw, sheet.fh, 0, 0, sheet.fw, sheet.fh);
    const d = cg.getImageData(0, 0, sheet.fw, sheet.fh);
    for (let i = 0; i < d.data.length; i += 4) if (d.data[i] === BLADE_RGB[0] && d.data[i + 1] === BLADE_RGB[1] && d.data[i + 2] === BLADE_RGB[2]) [d.data[i], d.data[i + 1], d.data[i + 2]] = EDGE_RGB;
    cg.putImageData(d, 0, 0); if (m) m.set(f, c); }
  return { img: c, fw: sheet.fw, fh: sheet.fh, ox: sheet.ox, oy: sheet.oy, s: sheet.s };
}
export function drawPlayer() {
  if (P.hidden) return;   // inside the static bomb's burst
  if (P.hide > 0) return;   // he is goo right now; the stretch draws him
  let [sheet, f] = dressed(SHEETS[P.state], frameOf());
  if (INV.edge > 0 && !SHEETS[P.state].custom) { sheet = edged(sheet, f, sheet === SHEETS[P.state]); f = 0; }
  const glitchy = EL.cur.glitch && ((GLITCHY.has(P.state) && SHEETS[P.state].custom) || P.glitchNow > 0);
  // shadow and reflection
  g.fillStyle = 'rgba(20,24,24,.35)';
  const sw = Math.max(4, 12 - P.z / 4);
  g.fillRect(Math.round(P.x - sw / 2), Math.round(P.y), Math.round(sw), 2);
  g.save(); g.globalAlpha = .17; g.translate(0, 2 * P.y + 1); g.scale(1, -1);
  spriteTo(g, sheet, f, P.x, P.y + P.z, P.face); g.restore();
  // afterimages
  for (const gh of P.ghosts)
    spriteTo(g, solid(SHEETS[gh.state], gh.f, gh.white > 0 ? '#ffffff' : COL.fx), 0, gh.x, gh.y, gh.face, (gh.white > 0 ? 1 : .45) * Math.min(1, 1 - (gh.age - gh.hold) / .25));
  // the charge glow (and the meditation aura): a flickering cyan rim behind him
  const px = P.x + P.trem, gk = glowK();
  if (gk > 0) rim(sheet, f, px, P.y - P.z, P.face, gk);
  // strike frames: the whole body as a white silhouette for ~2 frames
  if (P.flash > 0) { spriteTo(g, solid(sheet, f, '#ffffff'), 0, px, P.y - P.z, P.face); return; }
  // slime: before the teleport he sags into a puddle, going green from the feet; after it he is still slick for a moment
  if (EL.cur.kit && EL.cur.kit.melt && P.state === 'tele' && !P.moved) { const k = Math.min(1, P.t / (dur('tele') * .45));
    g.save(); g.translate(px, P.y - P.z); g.scale(1 + k * .5, 1 - k * .8); g.translate(-px, -(P.y - P.z)); // squash about his feet, not the screen corner
    spriteTo(g, sheet, f, px, P.y - P.z, P.face, 1 - k * .6); spriteTo(g, solid(sheet, f, COL.fx), 0, px, P.y - P.z, P.face, k); g.restore(); return; }
  if (P.goo > 0) { spriteTo(g, sheet, f, px, P.y - P.z, P.face); spriteTo(g, solid(sheet, f, COL.fx), 0, px, P.y - P.z, P.face, Math.min(1, P.goo * 2)); return; }
  // the sprite; dropped-in glitch animations get the engine's slice effect on top
  if (!glitchy) { spriteTo(g, sheet, f, px, P.y - P.z, P.face); return; }
  buf.width = sheet.fw; buf.height = sheet.fh;
  bg2.drawImage(sheet.img, f * sheet.fw, 0, sheet.fw, sheet.fh, 0, 0, sheet.fw, sheet.fh);
  const sl = document.createElement('canvas'); sl.width = sheet.fw; sl.height = sheet.fh;
  const sg = sl.getContext('2d'); let y = 0;
  while (y < sheet.fh) { const h = 1 + (Math.random() * 3 | 0), off = Math.random() < .35 ? Math.round((Math.random() - .5) * 8) : 0; sg.drawImage(buf, 0, y, sheet.fw, h, off, y, sheet.fw, h); y += h; }
  spriteTo(g, { img: sl, fw: sheet.fw, fh: sheet.fh, ox: sheet.ox, oy: sheet.oy, s: sheet.s }, 0, P.x, P.y - P.z, P.face);
}
// a mirror image: a pale 1px rim, then his frame tinted cyan and sliced into rows that jump sideways (glitchy edges)
const mcv = document.createElement('canvas'), mg = mcv.getContext('2d');
export function drawMirror(m) {
  const sh = SHEETS[m.st], f = Math.min(sh.n - 1, m.f), a = m.a * .8; if (a <= 0) return;
  g.fillStyle = 'rgba(20,24,24,.2)'; g.fillRect(Math.round(m.x - 5), Math.round(m.y), 10, 1);
  if (m.white > 0) { spriteTo(g, solid(sh, f, '#ffffff'), 0, m.x, m.y, m.face, .9); return; }
  const rimg = solid(sh, f, COL.fx2);
  for (const [ox, oy] of [[1, 0], [-1, 0], [0, -1]]) spriteTo(g, rimg, 0, m.x + ox, m.y + oy, m.face, a * .3);
  buf.width = sh.fw; buf.height = sh.fh; bg2.drawImage(sh.img, f * sh.fw, 0, sh.fw, sh.fh, 0, 0, sh.fw, sh.fh);
  bg2.globalCompositeOperation = 'source-atop'; bg2.globalAlpha = .42; bg2.fillStyle = COL.fx; bg2.fillRect(0, 0, sh.fw, sh.fh);
  bg2.globalAlpha = 1; bg2.globalCompositeOperation = 'source-over';
  mcv.width = sh.fw; mcv.height = sh.fh; let y = 0;
  while (y < sh.fh) { const h = 1 + (Math.random() * 3 | 0), off = EL.cur.glitch && Math.random() < .25 * m.glitch ? Math.round((Math.random() - .5) * 4 * m.glitch) : 0; mg.drawImage(buf, 0, y, sh.fw, h, off, y, sh.fw, h); y += h; }
  spriteTo(g, { img: mcv, fw: sh.fw, fh: sh.fh, ox: sh.ox, oy: sh.oy, s: sh.s }, 0, m.x, m.y, m.face, a);
}
