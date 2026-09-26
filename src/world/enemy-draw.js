import { FW, FH, OX, OY } from '../config.js';
import { g } from '../screen.js';
import { rig } from '../rig/rig.js';
import { eyeDark } from './enemy-body.js';
import { spriteTo, solid } from './sprite.js';

// ---- Drawing the samurai: built like him, bare-headed with a topknot, in a darker red-grey, with a red eye ----
const PAL = { K: '#3a2e31', D: '#5a4a4e', E: '#ff5a4a', e: '#7a2d27', W: '#cfd4d6', S: '#7d868e', s: '#3a3033' };
const PAL_OUT = { ...PAL, E: '#2b2023' };   // the eye gone out
const cv = document.createElement('canvas'); cv.width = FW; cv.height = FH;
const cg = cv.getContext('2d'), sheet = { img: cv, fw: FW, fh: FH, n: 1, ox: OX, oy: OY };

export function drawEnemy(e) {
  if (e.alpha <= 0 || e.held) return;   // held: a K execution is drawing him (assassin/)
  cg.clearRect(0, 0, FW, FH); rig(cg, 0, e.body.out, eyeDark(e.body) ? PAL_OUT : PAL);
  const x = e.x + (e.shk > 0 ? ((e.shk * 60 | 0) % 2 ? 1 : -1) : 0);   // he shakes in the hit pause
  const down = e.body.out.hy >= 8;
  g.globalAlpha = e.alpha;
  g.fillStyle = 'rgba(20,24,24,.35)'; g.fillRect(Math.round(x - (down ? 9 : 6)), Math.round(e.y), down ? 18 : 12, 2);
  // the floor reflection, as his
  g.save(); g.globalAlpha = .17 * e.alpha; g.translate(0, 2 * e.y + 1); g.scale(1, -1); spriteTo(g, sheet, 0, x, e.y, e.face); g.restore();
  spriteTo(g, e.flash > 0 ? solid(sheet, 0, '#ffffff') : sheet, 0, x, e.y, e.face, e.alpha);
  // health: a thin bar over his head, only once he is hurt
  if (e.alive && e.hp < e.maxHp) { const w = 12, bx = Math.round(e.x - w / 2), by = Math.round(e.y - 33);
    g.fillStyle = '#1a1416'; g.fillRect(bx - 1, by - 1, w + 2, 3);
    g.fillStyle = '#ff5a4a'; g.fillRect(bx, by, Math.max(1, Math.round(w * e.hp / e.maxHp)), 1); }
  g.globalAlpha = 1;
}
// a dropped sword: blade and hilt, turning as it falls, flat once it lands
export function drawBlade(b, alpha = 1) {
  const x = b.x, y = b.y - b.z, c = Math.cos(b.a) * b.face, s = Math.sin(b.a);
  g.globalAlpha = alpha;
  if (b.z <= 0) { g.fillStyle = 'rgba(20,24,24,.3)'; for (let i = -3; i <= 12; i++) g.fillRect(Math.round(x + c * i), Math.round(b.y + 1), 1, 1); }
  for (let i = -3; i <= 12; i++) { g.fillStyle = i < 0 ? PAL.K : i === 0 ? PAL.S : PAL.W; g.fillRect(Math.round(x + c * i), Math.round(y + s * i * (b.z <= 0 ? .3 : 1)), 1, 1); }
  g.globalAlpha = 1;
}
