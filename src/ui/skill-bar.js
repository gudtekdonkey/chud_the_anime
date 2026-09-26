import { COL } from '../config.js';
import { P } from '../state.js';
import { slot, panel } from './hud-kit.js';
import { text, textW } from './pixfont.js';
import { g } from '../screen.js';
import { comboMax, FLOW_KEYS, FLOW_N, FLOW_KEEP } from '../player/combo.js';
import { blinkMax } from '../player/cooldowns.js';

// ---- The skills' cooldowns (PR #1's logic), drawn in the items HUD's style: a row of small slots under health and Qi ----
// a cooldown is the slot's shade draining upward, with the seconds left; a refused press blinks the frame white; ready again, it glints
const ICON_COL = { '#': COL.fx, '+': COL.fx2, w: '#ffffff', k: '#0d1012' };
const ICONS = {
  double: ['w..........w', '.+........+.', '..#......#..', '...#....#...', '....#..#....', '.....##.....', '.....##.....', '....#..#....', '...#....#...', '..#......#..', '.+........+.', 'w..........w'],
  moon:   ['....####....', '..##+++.....', '.#++........', '.#+.........', '#+..........', '#+......w...', '#+..........', '#+..........', '.#+.........', '.#++........', '..##+++.....', '....####....'],
  rift:   ['#..........#', '.#k......k#.', '..#k....k#..', '...#k..k#...', '....#kk#....', '.....ww.....', '.....ww.....', '....#kk#....', '...#k..k#...', '..#k....k#..', '.#k......k#.', '#..........#'],
  mirror: ['..##....++..', '..##....++..', '.####..++++.', '#.##.#+.++.+', '..##....++..', '..##....++..', '.#..#..+..+.', '.#..#..+..+.', '.#..#..+..+.', '............', '.####..++++.', '............'],
  sweep:  ['.....ww.....', '.....##.....', '.....##.....', '.....##.....', '....####....', '.....##.....', '..+..##..+..', '.+...ww...+.', '+...wwww...+', '.+........+.', '..++....++..', '....++++....'],
  tele:   ['............', '.+......ww..', '.......wwww.', '..++..wwwwww', '......wwwwww', '+++..#wwwwww', '......wwwwww', '..++..wwwwww', '.......wwww.', '.+......ww..', '............', '............'],
  slide:  ['............', '............', '.........##.', '........###.', '..+++..####.', '.......###..', '.++++.#####.', '.....######.', '..+++.....##', '............', '.##########.', '............'],
};
const icon = rows => { const c = document.createElement('canvas'); c.width = c.height = 12; const cg = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ICON_COL[ch]) { cg.fillStyle = ICON_COL[ch]; cg.fillRect(x, y, 1, 1); } })); return c; };
// k: the cooldown's key in P.cd; key: its key, top left; on: true while he is casting it
const SLOTS = [
  { k: 'double', key: 'I', on: () => P.state === 'double' && P.hk !== 'rift' },
  { k: 'moon', key: 'O', on: () => P.state === 'moonHold' || P.state === 'moon' },
  { k: 'rift', key: 'P', on: () => P.state === 'double' && P.hk === 'rift' },
  { k: 'mirror', key: 'N', on: () => P.state === 'meditate' },
  { k: 'sweep', key: 'U', on: () => P.state === 'sweep' },
  { k: 'tele', key: 'K', on: () => P.state === 'tele' },
  { k: 'slide', key: 'SH', on: () => P.state === 'slide' },
].map(s => ({ ...s, img: icon(ICONS[s.k]) }));
const X0 = 5, Y0 = 25, SZ = 14, STEP = 15;
// seconds in the middle: whole seconds, then tenths under one, outlined so they read over the icon
function count(x, y, t) {
  const s = t >= 1 ? String(Math.ceil(t)) : t.toFixed(1), tx = x + Math.round((SZ - textW(s)) / 2), ty = y + 5;
  for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) text(s, tx + ox, ty + oy, '#0c0d11');
  text(s, tx, ty, '#ffffff');
}
export function drawSkills() {
  drawFlow();
  const blink = Math.floor(performance.now() / 60) % 2;
  const flow = P.flow > 0;
  panel(X0, Y0, 3 + SLOTS.length * STEP + 2, SZ + 6);
  SLOTS.forEach((s, i) => {
    const x = X0 + 3 + i * STEP, y = Y0 + 3, left = P.cd[s.k] || 0, deny = P.cdDeny[s.k] > 0;
    slot(x, y, SZ, 'skill', s.img, { cd: left > 0 ? left / (P.cdMax[s.k] || left) : 0, flash: deny ? blink : (P.cdPop[s.k] || 0) * 4,
      frame: s.on() ? COL.fx2 : left > 0 ? (flow && FLOW_KEYS.has(s.k) ? (blink ? COL.fx : COL.eye) : '#2c323b') : undefined });
    if (left > 0) count(x, y, left); else text(s.key, x + 1, y + 1, '#7d868e');
    if (s.k === 'tele') blinkPips(x, y);
  });
}
// K's blink charges: a pip each along the slot's foot, lit while it is there to spend
function blinkPips(x, y) {
  const n = blinkMax(), x0 = x + Math.round((SZ - (n * 3 - 1)) / 2);
  for (let i = 0; i < n; i++) { g.fillStyle = '#0c0d11'; g.fillRect(x0 + i * 3 - 1, y + SZ - 3, 4, 3);
    g.fillStyle = i < P.blinks ? COL.fx : '#2c323b'; g.fillRect(x0 + i * 3, y + SZ - 2, 2, 1); }
}
// under the slots: how long his J combo runs now (J2..J6, it glints when it grows), and Flow: six pips for the chain of basic cuts;
// all six lit means the next skill still cooling down casts anyway (its slot's frame blinks cyan), draining as Flow runs out
function drawFlow() {
  const y = Y0 + SZ + 7, w = 48, flow = P.flow > 0;
  panel(X0, y, w, 9);
  text('J' + comboMax(), X0 + 3, y + 2, P.comboUp > 0 && Math.floor(P.comboUp * 12) % 2 ? '#ffffff' : '#9aa3a1');
  for (let i = 0; i < FLOW_N; i++) {
    const x = X0 + 13 + i * 5, lit = flow ? i < Math.ceil(P.flow / FLOW_KEEP * FLOW_N) : i < P.flowN;
    g.fillStyle = lit ? (flow ? (P.flowPop > 0 ? '#ffffff' : COL.fx) : i === P.flowN - 1 && P.flowPip > 0 ? '#ffffff' : COL.fx2) : '#2c323b';
    g.fillRect(x, y + 3, 3, 3);
  }
}
