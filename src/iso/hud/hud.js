// ---- The HUD from prototype 20 (today's ui/hud.js, built as displayed) over the 3D view, at the game's pixel scale:
// health and Qi top left (Qi notched in thirds, STORM while Storm Chain runs), the skill bar under them, the party under
// that, mon and lantern ash (`INV.shards`) top right, the bottom bar (weapon, quick slots 1-4, four charm slots), the banners. Over
// the world: the lock-on brackets and E prompt on big items, the lift and Harvest prompts, K with a partner, the combo
// prompts, the numbers. Drawn with today's HUD pieces (ui/hud-kit.js, ui/pixfont.js, ui/icons.js) onto today's
// 480×270 canvas (hud/canvas.js), which the pipeline lays over the frame (gfx/post.js setHud).
import './canvas.js';
import { game, g } from '../../screen.js';
import { COL } from '../../config.js';
import { ICON } from '../../ui/icons.js';
import { WS } from '../../items/item-sprites.js';
import { panel, meter, slot, banner, brackets, prompt } from '../../ui/hud-kit.js';
import { text, textW } from '../../ui/pixfont.js';
import { trail, chip } from '../../fx/numbers.js';
import { P, S, INV } from '../items/inv.js';
import { USE, EDGE_T } from '../items/quick.js';
import { IT, eTarget, heroFree } from '../items/items.js';
import { verbOf } from '../items/big.js';
import { PARTY } from '../party/party.js';
import { BLEED } from '../party/ally.js';
import { pairCandidate, PAIR, PAIR_CD } from '../party/paired.js';
import { CP, BEAT } from '../combo/combo-game.js';
import { CTX } from 'ronin-engine/iso/ctx.js';
import { W } from 'ronin-engine/clock/world.js';
import { drawSkillBar, addSkill, ICONS } from './skill-bar.js';
import { drawWorldUi, toHud } from './world-ui.js';

export { game as hudCanvas };
const WH = '#ffffff', CY = '#6ff3e4', CY2 = '#b8fff6', LOW = '#ff5a4a', CHIP = '#ff8f80', INK = '#e9eeee', HW = 480;
const WEAPON_ICON = { katana: ICON.katana, nodachi: ICON.nodachi };
const hpChip = trail(INV.hp); let last = 0;

// the slice's own two slots: K (paired executions: the party's 5 s, a pip for each companion who could partner now) and the roll
addSkill({ k: 'tele', key: 'K', icon: ICONS.tele, cd: () => PAIR.cd, max: () => PAIR_CD, on: () => !!PAIR.run, pips: () => [Math.max(1, Math.min(4, PARTY.standing().length)), pairCandidate() ? 1 : 0] });
addSkill({ k: 'slide', key: 'SH', icon: ICONS.slide, on: () => CTX.hero && CTX.hero.state === 'roll' });

function healthAndQi(now) {
  chip(hpChip, INV.hp, last ? Math.min(.1, (now - last) / 1000) : 0); last = now;
  const blink = Math.floor(now / 90) % 2, full = P.storm > 0;
  panel(5, 5, 80, 18);
  meter(10, 9, 70, 4, INV.hp, INV.hp < .35 && Math.floor(now / 250) % 2 ? LOW : WH, 0, INV.fx.hp > 0, hpChip.v, CHIP);
  if (full) { g.globalAlpha = .35 + .35 * Math.random(); g.fillStyle = COL.fx; g.fillRect(8, 14, 74, 7); g.globalAlpha = 1; }
  meter(10, 16, 70, 3, P.qi, full ? (blink ? WH : COL.fx2) : COL.eye, 3, INV.fx.qi > 0);
  if (full) { panel(87, 13, 33, 9); text('STORM', 90, 15, blink ? COL.fx2 : WH); }
}
function currency() {
  panel(HW - 69, 5, 64, 13);
  g.drawImage(WS.coin.c, HW - 64, 9); text(String(INV.mon).padStart(4, '0'), HW - 57, 9, INV.fx.mon > 0 ? CY2 : WH);
  g.drawImage(WS.shard.c, HW - 30, 8); text(String(INV.shards).padStart(2, '0'), HW - 24, 9, INV.fx.shards > 0 ? CY2 : WH);
}
function bottomBar() {
  const y = 240, x0 = 138; panel(x0 - 5, y - 5, 214, 33);
  slot(x0, y, 22, 'weapon', WEAPON_ICON[P.weapon] || ICON.katana, { flash: INV.fx.weapon > 0 ? 1 : 0 });
  const using = USE.id ? USE.slot : -1;
  INV.quick.forEach((q, i) => { const x = x0 + 28 + i * 22;
    slot(x, y + 1, 20, 'quick', q && ICON[q.id], { key: String(i + 1), count: q ? q.n : null, flash: INV.fx.quick[i] > 0 ? 1 : 0, cd: i === using ? 1 - USE.t / USE.dur : 0, dim: using >= 0 && i !== using });
    if (INV.edge > 0 && i === INV.edgeSlot) { g.fillStyle = '#0c0d11'; g.fillRect(x, y + 22, 20, 2); g.fillStyle = CY; g.fillRect(x, y + 22, Math.round(20 * INV.edge / EDGE_T), 2); } });
  INV.charms.forEach((id, i) => slot(x0 + 122 + i * 22, y + 1, 20, 'charm', ICON[id], { flash: INV.fx.charms[i] > 0 ? 1 : 0 }));
}
// one small bar each, ten to a row (today's party HUD), a blink while one is down
function partyPanel() {
  const all = PARTY.allies; if (!all.length) return; const rows = Math.ceil(all.length / 10), y0 = 46;
  panel(5, y0, 80, 12 + rows * 4); text('PARTY ' + PARTY.standing().length, 9, y0 + 3, '#a9b1b6');
  all.forEach((a, i) => { const x = 9 + (i % 10) * 7, y = y0 + 10 + Math.floor(i / 10) * 4; g.fillStyle = '#23272d'; g.fillRect(x, y, 6, 2);
    g.fillStyle = a.downed ? (W.t % .4 < .2 ? LOW : WH) : a.dead ? '#3b424c' : INK; g.fillRect(x, y, a.downed ? Math.max(1, Math.round(6 * a.downT / BLEED)) : Math.max(1, Math.round(6 * a.hp)), 2); });
}
// a key cap and its word over the world (today's party prompts)
function keyCap(x, y, k, word, col) { const w = 10 + textW(word) + 3, x0 = Math.round(x - w / 2); y = Math.round(y);
  panel(x0, y, w, 9); g.fillStyle = INK; g.fillRect(x0 + 1, y + 1, 7, 7); text(k, x0 + 3, y + 2, '#0c0d11'); text(word, x0 + 10, y + 2, col); }
// the locked-on item's brackets (its box on the screen) and its E prompt
function itemPrompts() {
  const it = IT.locked, e = eTarget();
  if (it && !CTX.busy) { const pts = []; for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (const y of [0, it.h]) pts.push(toHud(it.x + dx * it.w / 2, y, it.z + dz * it.d / 2));
    const b = { x0: Math.min(...pts.map(p => p[0])), x1: Math.max(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), y1: Math.max(...pts.map(p => p[1])) };
    brackets(b, IT.lockT, -1); if (!e || e.item) prompt((b.x0 + b.x1) / 2, b.y0 - 13, verbOf(it), IT.lockT, false); }
  if (e && e.lift) { const [x, y] = toHud(e.lift.x, 22, e.lift.z); keyCap(x, y - 10, 'E', IT.lifting ? 'LIFTING' : 'HOLD: LIFT ' + e.lift.c.name, CY); }
  else if (e && e.harvest && !IT.harvesting && heroFree()) { const [x, y] = toHud(e.harvest.x, 8, e.harvest.z); keyCap(x, y - 10, 'E', 'HOLD: HARVEST', CY); }
  const c = !CP.prompt && !CP.chain && pairCandidate(); if (c) { const [x, y] = toHud(c.f.x, 34, c.f.z); keyCap(x, y - 10, 'K', 'WITH ' + c.al.c.name, CY); }
  // a companion bleeding out: their clock over them
  for (const al of PARTY.downed()) { const [x, y] = toHud(al.x, 20, al.z); g.fillStyle = '#0c0d11'; g.fillRect(Math.round(x) - 9, Math.round(y), 18, 3); g.fillStyle = W.t % .4 < .2 ? LOW : WH; g.fillRect(Math.round(x) - 8, Math.round(y) + 1, Math.round(16 * al.downT / BLEED), 1); }
}
// an arrow of whole pixels pointing along screen heading a (radians, 0 = right, y down), centred on (x, y)
function arrow(x, y, a, col) { const c = Math.cos(a), s = Math.sin(a); g.fillStyle = col;
  for (let t = -3; t <= 3; t++) g.fillRect(Math.round(x + c * t), Math.round(y + s * t), 1, 1);
  for (const side of [-1, 1]) for (let t = 1; t <= 2; t++) g.fillRect(Math.round(x + c * (3 - t) - s * t * side), Math.round(y + s * (3 - t) + c * t * side), 1, 1); }
// the combo prompt over the samurai: its key cap (an arrow, J or K) and the white ring closing on the beat
function comboPrompt() {
  const p = CP.prompt; if (!p) return; const f = p.foe, [x, y0] = toHud(f.x, 34, f.z), y = y0 - 12, hero = CTX.hero;
  const t = W.t, k = Math.max(0, (p.beat - t) / BEAT), r = Math.round(5 + 11 * k), after = t > p.beat;
  g.fillStyle = '#0c0d11'; g.fillRect(Math.round(x) - 6, Math.round(y) - 6, 13, 13); g.fillStyle = p.ans === 'K' ? CY : INK; g.fillRect(Math.round(x) - 5, Math.round(y) - 5, 11, 11);
  if (p.ans === 'J' || p.ans === 'K') text(p.ans, Math.round(x) - 1, Math.round(y) - 2, '#0c0d11');
  else { const [hx, hy] = toHud(hero.x, 0, hero.z), [fx, fy] = toHud(f.x, 0, f.z), at = Math.atan2(fy - hy, fx - hx), a = p.ans === 'R' ? at : p.ans === 'L' ? at + Math.PI : p.ans === 'U' ? -Math.PI / 2 : Math.PI / 2; arrow(x, y, a, '#0c0d11'); }
  g.fillStyle = after ? (Math.floor(t * 20) % 2 ? CY : WH) : WH;
  for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283; g.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1); }
  if (p.kind === 'finish' || p.kind === 'last') text(p.kind === 'finish' ? 'FINISH' : 'LAST', Math.round(x - textW(p.kind === 'finish' ? 'FINISH' : 'LAST') / 2), Math.round(y) + 9, CY);
}
export function drawHud() {
  const now = performance.now(); g.clearRect(0, 0, game.width, game.height);
  if (!CTX.hero) return;
  itemPrompts(); comboPrompt(); drawWorldUi();
  healthAndQi(now); drawSkillBar(); partyPanel(); currency(); bottomBar();
  if (S.banner) banner(HW / 2, 34, S.banner.small, S.banner.big, S.banner.t, S.banner.dur, 2);
}
