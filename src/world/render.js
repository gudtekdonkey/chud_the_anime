import { W, H } from '../config.js';
import { g, hud } from '../screen.js';
import { P, INV, parts, S, mirrors, debris } from '../state.js';
import { SHEETS } from '../anims/sheets.js';
import { drawDebris } from '../fx/debris.js';
import { drawFloorFx, drawFx } from '../fx/fx.js';
import { sgn } from '../fx/util.js';
import { frameOf } from '../player/actions.js';
import { drawPlayer, drawMirror } from '../player/draw.js';
import { drawHud } from '../ui/hud.js';
import { itemDrawables, drawItemsOver } from '../items/items.js';
import { DUMMIES, drawDummy } from './dummies.js';
import { PILLARS, bg, drawPillar } from './room.js';

export function render() {
  g.save();
  if (S.shake > 0) { const a = Math.max(1, Math.round((P.shakeAmp || 2) * Math.min(1, S.shake / .15))); g.translate(sgn() * a, sgn() * Math.ceil(a / 2)); } // never a zero offset
  if (S.shake <= 0) P.shakeAmp = 2;
  g.drawImage(bg, 0, 0);
  drawFloorFx();
  // depth-sort the pillars, the dummy and the player by their feet
  const items = [...PILLARS.map(p => ({ y: p.y + p.h, d: () => drawPillar(g, p) })), ...DUMMIES.map(d => ({ y: d.y, d: () => drawDummy(g, d) })), { y: P.y, d: drawPlayer }, ...itemDrawables(),
    ...mirrors.map(m => ({ y: m.y, d: () => drawMirror(m) })),
    ...debris.map(d => ({ y: d.state === 'in' ? d.cy + Math.sin(d.a) * d.r * .45 : d.py, d: () => drawDebris(d) }))];
  items.sort((a, b) => a.y - b.y).forEach(i => i.d());
  drawFx();
  for (const q of parts) {
    g.globalAlpha = Math.min(1, q.life / q.max * 1.6); g.fillStyle = q.col;
    g.fillRect(Math.round(q.x), Math.round(q.y), 1, 1);
    if (q.streak) g.fillRect(Math.round(q.x - q.vx * .012), Math.round(q.y - q.vy * .012), 1, 1);
  }
  g.globalAlpha = 1;
  g.restore();
  drawItemsOver();   // unshaken, like the HUD: the lock-on and prompt stay put while the world shakes
  if (S.scr.t > 0) { g.globalAlpha = S.scr.a * S.scr.t / S.scr.max; g.fillStyle = '#e4fffb'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  drawHud();
  const chg = P.charge != null && !P.cv ? ` · charge <b>${Math.round(P.charge * 100)}%</b>` : P.cv ? ` · ${P.cv.name} at <b>${Math.round(P.pow * 100)}%</b>` : '';
  const qi = P.storm > 0 ? ` · <b>STORM CHAIN ${P.storm.toFixed(1)} s</b>` : ` · qi <b>${Math.round(P.qi * 100)}%</b>`;
  const inv = ` · hp <b>${Math.round(INV.hp * 100)}%</b> · ${INV.weapon} · mon ${INV.mon} · shards ${INV.shards} · LV ${INV.lv} (${Math.round(INV.exp)} exp)`;
  hud.innerHTML = `animation <b>${P.state}</b> · frame ${frameOf() + 1}/${SHEETS[P.state].n} · ${SHEETS[P.state].custom ? 'your sprite' : 'placeholder'}${chg}${qi}${inv}`;
}
