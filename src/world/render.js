import { W, H } from '../config.js';
import { g, hud } from '../screen.js';
import { P, parts, S, mirrors, debris } from '../state.js';
import { SHEETS } from '../anims/sheets.js';
import { drawDebris } from '../fx/debris.js';
import { drawFloorFx, drawFx } from '../fx/fx.js';
import { sgn } from '../fx/util.js';
import { frameOf } from '../player/actions.js';
import { drawPlayer, drawMirror } from '../player/draw.js';
import { drawQi } from '../ui/qi-meter.js';
import { drawSkillBar } from '../ui/skill-bar.js';
import { drawBloodFloor, drawDrops } from '../fx/blood.js';
import { ENEMIES, blades } from './enemies.js';
import { drawEnemy, drawBlade } from './enemy-draw.js';
import { stageItems, drawStagesFloor, drawStagesTop } from '../assassin/assassinate.js';
import { drawMarkers, drawPrompt } from '../assassin/markers.js';
import { PILLARS, bg, drawPillar } from './room.js';

export function render() {
  g.save();
  if (S.shake > 0) { const a = Math.max(1, Math.round((P.shakeAmp || 2) * Math.min(1, S.shake / .15))); g.translate(sgn() * a, sgn() * Math.ceil(a / 2)); } // never a zero offset
  if (S.shake <= 0) P.shakeAmp = 2;
  g.drawImage(bg, 0, 0);
  const fade = ENEMIES[0].alpha;   // the fallen, their swords and their blood fade together before a new squad
  drawBloodFloor(fade); drawFloorFx(); drawStagesFloor();
  const t = performance.now() / 1000; drawMarkers(t);
  // depth-sort the pillars, the enemies, their dropped swords, the player and any execution by their feet
  const items = [...PILLARS.map(p => ({ y: p.y + p.h, d: () => drawPillar(g, p) })), ...ENEMIES.map(e => ({ y: e.y - (e.alive ? 0 : .5), d: () => drawEnemy(e) })),
    ...blades.map(b => ({ y: b.y - .2, d: () => drawBlade(b, fade) })), ...(P.state === 'exec' ? [] : [{ y: P.y, d: drawPlayer }]), ...stageItems(),
    ...mirrors.map(m => ({ y: m.y, d: () => drawMirror(m) })),
    ...debris.map(d => ({ y: d.state === 'in' ? d.cy + Math.sin(d.a) * d.r * .45 : d.py, d: () => drawDebris(d) }))];
  items.sort((a, b) => a.y - b.y).forEach(i => i.d());
  drawFx(); drawDrops(); drawStagesTop(); drawPrompt(t);
  for (const q of parts) {
    g.globalAlpha = Math.min(1, q.life / q.max * 1.6); g.fillStyle = q.col;
    g.fillRect(Math.round(q.x), Math.round(q.y), 1, 1);
    if (q.streak) g.fillRect(Math.round(q.x - q.vx * .012), Math.round(q.y - q.vy * .012), 1, 1);
  }
  g.globalAlpha = 1;
  g.restore();
  if (S.scr.t > 0) { g.globalAlpha = S.scr.a * S.scr.t / S.scr.max; g.fillStyle = '#e4fffb'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  drawQi(); drawSkillBar();
  const chg = P.charge != null && !P.cv ? ` · charge <b>${Math.round(P.charge * 100)}%</b>` : P.cv ? ` · ${P.cv.name} at <b>${Math.round(P.pow * 100)}%</b>` : '';
  const qi = P.storm > 0 ? ` · <b>STORM CHAIN ${P.storm.toFixed(1)} s</b>` : ` · qi <b>${Math.round(P.qi * 100)}%</b>`;
  hud.innerHTML = `animation <b>${P.state}</b> · frame ${frameOf() + 1}/${SHEETS[P.state].n} · ${SHEETS[P.state].custom ? 'your sprite' : 'placeholder'}${chg}${qi}`;
}
