import { W, H, PX } from '../config.js';
import { g, hud } from '../screen.js';
import { P, INV, parts, S, mirrors, debris } from '../state.js';
import { SHEETS } from '../anims/sheets.js';
import { drawDebris } from '../fx/debris.js';
import { drawFloorFx, drawFx } from '../fx/fx.js';
import { drawNums } from '../fx/numbers.js';
import { sgn } from '../fx/util.js';
import { cc } from '../fx/element.js';
import { COL } from '../config.js';
import { frameOf } from '../player/actions.js';
import { drawPlayer, drawMirror } from '../player/draw.js';
import { drawBloodFloor, drawDrops } from '../fx/blood.js';
import { ENEMIES, blades } from './enemies.js';
import { drawEnemy, drawBlade } from './enemy-draw.js';
import { stageItems, drawStagesFloor, drawStagesTop } from '../assassin/assassinate.js';
import { drawMarkers, drawPrompt } from '../assassin/markers.js';
import { weapon } from '../weapons/weapons.js';
import { drawHud } from '../ui/hud.js';
import { itemDrawables, drawItemsOver, drawSmoke } from '../items/items.js';
import { PILLARS, bgX, MARGIN, drawPillar } from './room.js';
import { CAM } from './camera.js';
import { partyDrawables } from '../party/companions.js';
import { recruitDrawables } from '../party/recruit.js';
import { X as PAIR, pairedDrawables, drawPairLines } from '../party/paired.js';
import { drawPartyHud, drawPartyPrompts } from '../ui/party-hud.js';
import { KIT, drawKit } from '../ui/kit-screen.js';
import { drawBreathBack, drawBreathFront } from '../player/breath.js';
import { drawLine } from '../player/wild.js';

export function render() {
  g.setTransform(PX, 0, 0, PX, 0, 0); g.imageSmoothingEnabled = false;   // everything draws in world units; figures carry PX pixels
  g.save(); g.translate(-CAM.ox, -CAM.oy);   // the camera's look-ahead (world/camera.js), whole pixels, inside the room's margin
  if (S.shake > 0) { const a = Math.max(1, Math.round((P.shakeAmp || 2) * Math.min(1, S.shake / .15))); g.translate(sgn() * a, sgn() * Math.ceil(a / 2)); } // never a zero offset
  if (S.shake <= 0) P.shakeAmp = 2;
  g.drawImage(bgX, -MARGIN, -MARGIN);
  const fade = ENEMIES[0].alpha;   // the fallen, their swords and their blood fade together before a new squad
  drawBloodFloor(fade); drawFloorFx(); drawStagesFloor(); drawSmoke(false); drawBreathBack();
  const t = performance.now() / 1000; drawMarkers(t);
  // depth-sort the pillars, the enemies, their dropped swords, the player and any execution by their feet
  const items = [...PILLARS.map(p => ({ y: p.y + p.h, d: () => drawPillar(g, p) })), ...ENEMIES.map(e => ({ y: e.y - (e.alive ? 0 : .5), d: () => drawEnemy(e) })),
    ...blades.map(b => ({ y: b.y - .2, d: () => drawBlade(b, fade) })), ...(P.state === 'exec' ? [] : [{ y: P.y, d: drawPlayer }]), ...stageItems(), ...itemDrawables(),
    ...mirrors.map(m => ({ y: m.y, d: () => drawMirror(m) })), ...partyDrawables(PAIR && PAIR.a), ...recruitDrawables(), ...pairedDrawables(),
    ...debris.map(d => ({ y: d.state === 'in' ? d.cy + Math.sin(d.a) * d.r * .45 : d.py, d: () => drawDebris(d) }))];
  items.sort((a, b) => a.y - b.y).forEach(i => i.d());
  drawSmoke(true);   // a thinner haze in front of everyone
  drawBreathFront(); drawFx(); drawDrops(); drawStagesTop(); drawPairLines(); drawPrompt(t); drawPartyPrompts(); drawLine();
  for (const q of parts) {
    g.globalAlpha = Math.min(1, q.life / q.max * 1.6); g.fillStyle = cc(q.col);
    g.fillRect(Math.round(q.x), Math.round(q.y), 1, 1);
    if (q.streak) g.fillRect(Math.round(q.x - q.vx * .012), Math.round(q.y - q.vy * .012), 1, 1);
  }
  g.globalAlpha = 1;
  drawNums();   // over the effects, so a number is never lost in the flash of the hit it counts
  g.restore();
  g.save(); g.translate(-CAM.ox, -CAM.oy); drawItemsOver(); g.restore();   // unshaken: the lock-on and prompt stay put while the world shakes, but go with the camera
  if (S.scr.t > 0) { g.globalAlpha = S.scr.a * S.scr.t / S.scr.max; g.fillStyle = COL.flash; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  if (S.impact > 0) impactFrame(S.impact === 1);
  drawHud(); drawPartyHud();
  if (KIT.open) drawKit();
  const chg = P.charge != null && !P.cv ? ` · charge <b>${Math.round(P.charge * 100)}%</b>` : P.cv ? ` · ${P.cv.name} at <b>${Math.round(P.pow * 100)}%</b>` : '';
  const qi = P.storm > 0 ? ` · <b>STORM CHAIN ${P.storm.toFixed(1)} s</b>` : ` · qi <b>${Math.round(P.qi * 100)}%</b>`;
  const inv = ` · hp <b>${Math.round(INV.hp * 100)}%</b> · mon ${INV.mon} · shards ${INV.shards} · LV ${INV.lv} (${Math.round(INV.exp)} exp) · power ${INV.power}`;
  hud.innerHTML = `${weapon().name} · animation <b>${P.state}</b> · frame ${frameOf() + 1}/${SHEETS[P.state].n} · ${SHEETS[P.state].custom ? 'your sprite' : 'placeholder'}${chg}${qi}${inv}`;
}

// an execution's killing blow: two frames of the scene in two tones, black then white (the deaths pass)
function impactFrame(second) {
  const im = g.getImageData(0, 0, W * PX, H * PX), d = im.data, bg = second ? 235 : 10, fg = second ? 12 : 245;
  for (let i = 0; i < d.length; i += 4) { const l = .3 * d[i] + .59 * d[i + 1] + .11 * d[i + 2]; d[i] = d[i + 1] = d[i + 2] = l < 58 || l > 165 ? fg : bg; }
  g.putImageData(im, 0, 0);
}
