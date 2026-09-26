import { COL } from '../config.js';
import { g } from '../screen.js';
import { P, S, INV } from '../state.js';
import { crack } from '../fx/debris.js';
import { crescent } from '../fx/slash.js';
import { rr, ring, spark } from '../fx/util.js';
import { once, ghost } from '../player/actions.js';
import { qiFill } from '../player/qi.js';
import { setWeapon } from '../player/weapon.js';
import { drawS, boxOf } from '../ui/sprites.js';
import { WS, chestBody, chestLid } from './item-sprites.js';
import { heal, showBanner } from './inventory.js';
import { arc, cutLine, bit, chest } from './item-fx.js';
import { loot } from './pickups.js';

// ---- Big items: the only things that get lock-on brackets. E plays the interaction; each runs on his state's clock ----
const WH = '#ffffff', CY = '#6ff3e4', CY2 = '#b8fff6';
const clamp01 = k => Math.min(1, Math.max(0, k));
const burst = (x, y, n, sp = 140) => { for (let i = 0; i < n; i++) { const a = rr(0, 6.28), v = rr(sp * .5, sp); spark(x, y, Math.cos(a) * v, Math.sin(a) * v * .7, rr(.1, .22), [WH, CY2, CY][i % 3], true); } };
const dustAt = (x, y, n) => { for (let i = 0; i < n; i++) spark(x + rr(-5, 5), y, rr(-60, 60), -rr(4, 16), rr(.3, .5), '#8f9692'); };
// gap: where he stands from it; state: his animation; T: the state's clock
export const BIG = [
  { id: 'shrine', s: WS.shrine, x: 56, y: 98, gap: 20, verb: 'PRAY', state: 'pray' },
  { id: 'nodachi', s: WS.blade, x: 190, y: 100, gap: 11, verb: 'TAKE', state: 'take' },
  { id: 'chest', s: WS.chest, x: 436, y: 100, gap: 19, verb: 'CUT', state: 'cutSeal' },
  { id: 'tablet', s: WS.tablet, x: 262, y: 84, gap: 14, verb: 'READ', state: 'read' },
].map(it => ({ ...it, box: boxOf(it.s, it.x, it.y), used: false }));

// ---- the acts, one step each; return true when done ----
const ACT = {
  pray(it, T, dt) {   // kneel; the flame's light pours into him, health and Qi fill to full
    if (once('start', true)) { it.hp0 = INV.hp; it.qi0 = P.qi; }
    if (T > .25 && T < 1.1 && (it.acc = (it.acc || 0) + dt) > .05) { it.acc -= .05; arc(it.x + rr(-2, 2), it.y - 8, { h: rr(8, 16) }); }
    const k = clamp01((T - .3) / .85); INV.hp = Math.max(INV.hp, it.hp0 + (1 - it.hp0) * k); qiFill(it.qi0 + (1 - it.qi0) * k - P.qi, false);
    if (once('amen', T >= 1.15)) { const [x, y] = chest(); ring(P.x + P.face, P.y - 1, 4, 2, .3, 4, CY); burst(x, y, 8, 90); heal(1); qiFill(1); }
    if (once('out', T >= 1.25)) { it.used = true; it.outT = 0; }
  },
  take(it, T) {   // grip, one jerk and it is out of the grave; flick, sheathe
    if (once('pull', T >= .1)) { it.used = true; cutLine(it.x + 1, it.y - 2, it.x, it.y - 27, .12); dustAt(it.x, it.y, 10); crack(it.x, it.y);
      burst(it.x, it.y - 4, 8, 90); S.hitstop = Math.max(S.hitstop, .06); S.shake = Math.max(S.shake, 1 / 60); ghost();
      setWeapon('nodachi'); }   // the re-bake hides inside the hit pause
    if (once('banner', T >= .15)) showBanner('NEW WEAPON', 'GRAVE NODACHI');
  },
  cutSeal(it, T) {   // one draw splits the seal; it opens on the sheath click and spills
    if (once('cut', T >= .08)) { crescent(it.x - 2 * P.face, it.y - 7, P.face, .4, 1, 10, 5, .1); cutLine(it.x - 9, it.y - 11, it.x + 9, it.y - 2, .5);
      S.hitstop = Math.max(S.hitstop, .08); S.shake = 1 / 60; burst(it.x, it.y - 6, 8, 110); ghost(); it.cutT = 0; }
    if (once('open', T >= .79)) { it.used = true; it.openT = 0;
      for (const s of [-1, 1]) bit(it.x - 1 + (s > 0 ? 1 : 0), it.y - 8 + (s > 0 ? 3 : 0), 1, 4, '#d6dad6', s * 14 + 8, -30, .6);   // the seal, in two
      burst(it.x, it.y - 8, 10, 100); ring(it.x, it.y - 1, 6, 3, .25, 1.6, CY);
      for (let i = 0; i < 7; i++) loot.push({ kind: i < 4 ? 'coin' : 'qi', x: it.x, y: it.y + 4 + (i * .3 % 1) * 6, z: 8, vx: rr(-38, 30) + (i % 2 ? 10 : -10), vz: rr(55, 85), ph: i * .3 }); }
  },
  read(it, T) {   // a palm on the stone: the glyphs light in order, then leave it for him
    if (once('lift', T >= .75)) { const o = { x0: Math.round(it.x - Math.floor(it.s.w / 2)), y0: Math.round(it.y) - it.s.h };
      it.s.marks.forEach(([mx, my], i) => arc(o.x0 + mx, o.y0 + my, { d: i * .012, dur: .35, h: 10, col: CY, col2: WH, trail: false })); burst(it.x, it.y - 9, 6, 80); }
    if (once('learn', T >= 1.18)) { it.used = true; const [x, y] = chest(); ring(P.x + P.face, P.y - 1, 4, 2, .3, 4, CY); burst(x, y, 10, 100); showBanner('SKILL LEARNED', 'CROSS RIFT', 1.6); }
  },
};
export const actBig = (it, T, dt) => ACT[it.state](it, T, dt);
export function tickBig(dt) { for (const it of BIG) for (const k of ['outT', 'cutT', 'openT']) if (it[k] != null) it[k] += dt; }

// ---- drawing each one on the floor ----
export function drawBig(it, t) {
  const T = P.item === it ? P.t : -1;
  if (it.id === 'shrine') { drawS(it.s, it.x, it.y);
    const fx = Math.round(it.x), fy = Math.round(it.y) - 6, fl = Math.floor(t * 10) % 3;   // the flame: a flicker, a flare while he prays, then out
    if (!it.used) { const flare = T > .15 && T < 1.2;
      if (flare) { g.fillStyle = CY; g.fillRect(fx - 1, fy - 3, 3, 3); g.fillStyle = CY2; g.fillRect(fx, fy - 4 - (fl === 1 ? 1 : 0), 1, 3); g.fillStyle = WH; g.fillRect(fx, fy - 2, 1, 2); }
      else { g.fillStyle = CY; g.fillRect(fx, fy - 2, 1, 2); g.fillStyle = fl ? CY2 : WH; g.fillRect(fx, fy - 3 - (fl === 2 ? 1 : 0), 1, 1); }
      g.save(); g.globalAlpha = .25; g.fillStyle = CY; g.fillRect(fx - 2, Math.round(it.y) - 4, 5, 1); g.restore(); }
    else if (it.outT < .25) { g.fillStyle = '#7d868e'; g.fillRect(fx, fy - 3 - Math.round(it.outT * 16), 1, 1); }
    return; }
  if (it.id === 'nodachi') {
    if (it.used) { drawS(WS.mound, it.x, it.y); return; }
    const o = drawS(it.s, it.x, it.y), f = Math.floor(t * 4) % 2;   // the cord still tied to the hilt, lifting in the wind
    g.fillStyle = '#7d868e'; g.fillRect(o.x0 + 7, o.y0 + 2, 1, 1); g.fillRect(o.x0 + 8, o.y0 + 2 + f, 1, 1); g.fillRect(o.x0 + 9, o.y0 + 3, 1, 1); if (f) g.fillRect(o.x0 + 10, o.y0 + 3, 1, 1);
    const k = (t % 2.2) / .35; if (k < 1) { const r = 5 + Math.floor(k * 11); g.fillStyle = WH; g.fillRect(o.x0 + (r < 8 ? 6 : r < 12 ? 5 : 4), o.y0 + r, 1, 1); }
    return; }
  if (it.id === 'chest') {
    if (!it.used) { const c = it.cutT, jig = c != null && c < .42 && c < .22 && Math.floor(c * 30) % 2 ? 1 : 0;
      drawS(it.s, it.x + jig, it.y, { tint: c != null && c < .05 ? WH : null }); return; }
    const k = it.openT, lift = k < .08 ? -Math.round(k / .08 * 6) : k < .16 ? -4 : -2;
    drawS(chestBody, it.x, it.y);
    g.fillStyle = '#0c0d11'; g.fillRect(Math.round(it.x) - 6, Math.round(it.y) - 8, 12, 1);
    if (k < .5) { g.save(); g.globalAlpha = 1 - k / .5; g.fillStyle = CY; for (let i = 0; i < 5; i++) g.fillRect(Math.round(it.x) - 4 + i * 2, Math.round(it.y) - 9 - Math.round(rr(0, 8 * (1 - k))), 1, 2); g.restore(); }
    drawS(chestLid, it.x + 2, it.y - 8 + lift, { refl: false, shadow: false }); return; }
  // the tablet: glyphs idle dim, pulse when he is close, light in order under his palm, then go dark
  const o = drawS(it.s, it.x, it.y), near = it === lockedItem();
  const marks = it.sorted || (it.sorted = [...it.s.marks].sort((a, b) => a[1] - b[1] || a[0] - b[0]));
  marks.forEach(([mx, my], i) => { const lit = T - .1 - i * .03; let col;
    if (it.used) col = '#1b1e25';
    else if (T >= .75) col = T < .8 ? CY2 : '#1b1e25';
    else if (T >= 0 && lit >= 0) col = lit < .05 ? WH : CY;
    else col = near ? (Math.sin(t * 4) > .2 ? COL.fx : '#2c6f68') : (Math.sin(t * 1.5 + i * .5) > .7 ? '#3f7d77' : '#2c323b');
    g.fillStyle = col; g.fillRect(o.x0 + mx, o.y0 + my, 1, 1); });
}
// set by the lock-on each frame
let locked = null;
export const lockedItem = () => locked;
export const setLocked = it => { locked = it; };
