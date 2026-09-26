import { W, COL } from '../config.js';
import { g } from '../screen.js';
import { P, S, INV } from '../state.js';
import { dur } from '../anims/sheets.js';
import { WS } from '../items/item-sprites.js';
import { USE_STATE, EDGE_T } from '../items/quick.js';
import { ICON } from './icons.js';
import { panel, meter, slot, banner } from './hud-kit.js';
import { text } from './pixfont.js';
import { drawSkills } from './skill-bar.js';
import { EL } from '../fx/element.js';
import { trail, chip } from '../fx/numbers.js';

// ---- The HUD (prototypes/20-items.html heroHud), in screen space after the world. It reads only INV, P.qi and the cooldowns ----
const WH = '#ffffff', CY = '#6ff3e4', CY2 = '#b8fff6', LOW = '#ff5a4a', CHIP = '#ff8f80';
const WEAPON_ICON = { katana: ICON.katana, nodachi: ICON.nodachi };
// the health bar's chip: a blow's worth lingers pale red, then drains after a beat
const hpChip = trail(INV.hp); let last = 0;
function healthAndQi(now) {
  chip(hpChip, INV.hp, last ? Math.min(.1, (now - last) / 1000) : 0); last = now;
  const blink = Math.floor(now / 90) % 2, full = P.storm > 0;
  panel(5, 5, 80, 18);
  // below 35% the health blinks red
  meter(10, 9, 70, 4, INV.hp, INV.hp < .35 && Math.floor(now / 250) % 2 ? LOW : WH, 0, INV.fx.hp > 0, hpChip.v, CHIP);
  // Qi, notched in thirds; while Storm Chain runs it glows and crackles and says so
  if (full) { g.globalAlpha = .35 + .35 * Math.random(); g.fillStyle = COL.fx; g.fillRect(8, 14, 74, 7); g.globalAlpha = 1; }
  meter(10, 16, 70, 3, P.qi, full ? (blink ? WH : COL.fx2) : COL.eye, 3, INV.fx.qi > 0);   // Qi takes the element's colours
  if (P.qiPop > 0) { g.globalAlpha = P.qiPop * 2; g.fillStyle = WH; g.fillRect(9, 15, 72, 5); g.globalAlpha = 1; }
  if (full) { const fill = Math.round(70 * P.qi); g.fillStyle = WH;
    for (let i = 0; i < 3; i++) if (Math.random() < .5) { let px = 10 + (Math.random() * fill | 0), py = 15 - (Math.random() * 2 | 0);
      for (let k = 0; k < 4; k++) { g.fillRect(px, py, 1, 1); px += 1; py += Math.random() < .5 ? -1 : 1; } }
    panel(87, 13, 25, 9); text(EL.cur.chain, 90, 15, blink ? COL.fx2 : WH); }
}
function currency() {
  panel(W - 69, 5, 64, 13);
  g.drawImage(WS.coin.c, W - 64, 9); text(String(INV.mon).padStart(4, '0'), W - 57, 9, INV.fx.mon > 0 ? CY2 : WH);
  g.drawImage(WS.shard.c, W - 30, 8); text(String(INV.shards).padStart(2, '0'), W - 24, 9, INV.fx.shards > 0 ? CY2 : WH);
}
function bottomBar() {
  const y = 240, x0 = 138; panel(x0 - 5, y - 5, 214, 33);
  slot(x0, y, 22, 'weapon', WEAPON_ICON[P.weapon] || ICON.katana, { flash: INV.fx.weapon > 0 ? 1 : 0 });
  const using = Object.values(USE_STATE).includes(P.state) ? P.useSlot : -1;
  INV.quick.forEach((q, i) => { const x = x0 + 28 + i * 22;
    // a use shades its slot, draining upward as it plays; the others dim until it is done
    slot(x, y + 1, 20, 'quick', q && ICON[q.id], { key: String(i + 1), count: q ? q.n : null, flash: INV.fx.quick[i] > 0 ? 1 : 0,
      cd: i === using ? 1 - P.t / dur(P.state) : 0, dim: using >= 0 && i !== using });
    if (INV.edge > 0 && i === INV.edgeSlot) { g.fillStyle = '#0c0d11'; g.fillRect(x, y + 22, 20, 2); g.fillStyle = CY; g.fillRect(x, y + 22, Math.round(20 * INV.edge / EDGE_T), 2); } });
  INV.charms.forEach((id, i) => slot(x0 + 122 + i * 22, y + 1, 20, 'charm', ICON[id], { flash: INV.fx.charms[i] > 0 ? 1 : 0 }));
}
export function drawHud() {
  const now = performance.now();
  healthAndQi(now); drawSkills(); currency(); bottomBar();
  if (S.banner) banner(W / 2, 34, S.banner.small, S.banner.big, S.banner.t, S.banner.dur, 2);
}
