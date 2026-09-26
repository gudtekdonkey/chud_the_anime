import { COL } from '../config.js';
import { P } from '../state.js';
import { slot, panel } from './hud-kit.js';
import { text, textW } from './pixfont.js';

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
  const blink = Math.floor(performance.now() / 60) % 2;
  panel(X0, Y0, 3 + SLOTS.length * STEP + 2, SZ + 6);
  SLOTS.forEach((s, i) => {
    const x = X0 + 3 + i * STEP, y = Y0 + 3, left = P.cd[s.k] || 0, deny = P.cdDeny[s.k] > 0;
    slot(x, y, SZ, 'skill', s.img, { cd: left > 0 ? left / (P.cdMax[s.k] || left) : 0, flash: deny ? blink : (P.cdPop[s.k] || 0) * 4,
      frame: s.on() ? COL.fx2 : left > 0 ? '#2c323b' : undefined });
    if (left > 0) count(x, y, left); else text(s.key, x + 1, y + 1, '#7d868e');
  });
}
