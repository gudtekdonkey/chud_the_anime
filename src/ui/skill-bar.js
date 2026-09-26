import { COL } from '../config.js';
import { g } from '../screen.js';
import { P } from '../state.js';
import { STORM_T } from '../player/qi.js';
import { pixText, textW } from './pixfont.js';

// ---- The skill bar, bottom centre, laid out like League of Legends: the passive, the five skills, then two summoner-style slots ----
// each slot is a 16px frame round a 12px icon; a cooldown darkens it with a clockwise sweep and counts the seconds down
const ICON_COL = { '#': COL.fx, '+': COL.fx2, w: '#ffffff', k: '#0d1012' };
const ICONS = {
  storm:  ['.......##...', '......##....', '.....##.....', '....##......', '...##.......', '..########..', '.......##...', '......##....', '.....##.....', '....##......', '...##.......', '..#.........'],
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
// k: the cooldown's key in P.cd; key: the label under the slot; on: true while he is casting it
const SLOTS = [
  { k: 'storm', gap: 0 },
  { k: 'double', key: 'I', gap: 4, on: () => P.state === 'double' && P.hk !== 'rift' },
  { k: 'moon', key: 'O', gap: 2, on: () => P.state === 'moonHold' || P.state === 'moon' },
  { k: 'rift', key: 'P', gap: 2, on: () => P.state === 'double' && P.hk === 'rift' },
  { k: 'mirror', key: 'N', gap: 2, on: () => P.state === 'meditate' },
  { k: 'sweep', key: 'U', gap: 2, on: () => P.state === 'sweep' },
  { k: 'tele', key: 'K', gap: 4, on: () => P.state === 'tele' },
  { k: 'slide', key: 'SH', gap: 2, on: () => P.state === 'slide' },
].map(s => ({ ...s, img: icon(ICONS[s.k]) }));
const SZ = 16, Y = 247, BAR_W = SLOTS.reduce((w, s) => w + s.gap + SZ, 0);
{ let x = (480 - BAR_W) / 2 | 0; for (const s of SLOTS) { x += s.gap; s.x = x; x += SZ; } }
// every inner pixel's angle, clockwise from 12 o'clock as 0..1, so the sweep is whole pixels
const ANG = Array.from({ length: 14 * 14 }, (_, i) => { const dx = i % 14 - 6.5, dy = (i / 14 | 0) - 6.5; return (Math.atan2(dx, -dy) / (2 * Math.PI) + 1) % 1; });
// dim the whole icon, then darken the part not yet recovered: `left` is the fraction still to go
function sweep(x, y, left) {
  g.fillStyle = '#0d1012'; g.globalAlpha = .35; g.fillRect(x + 1, y + 1, 14, 14); g.globalAlpha = .6;
  for (let i = 0; i < ANG.length; i++) if (ANG[i] >= 1 - left) g.fillRect(x + 1 + i % 14, y + 1 + (i / 14 | 0), 1, 1);
  g.globalAlpha = 1;
}
// seconds in the middle like League: whole seconds, then tenths under one
function count(x, y, t) {
  const s = t >= 1 ? String(Math.ceil(t)) : t.toFixed(1), tx = x + 8 - (textW(s) + 1) / 2 | 0, ty = y + 6;
  for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) pixText(s, tx + ox, ty + oy, '#0d1012');
  pixText(s, tx, ty, '#ffffff');
}
export function drawSkillBar() {
  const x0 = SLOTS[0].x, now = performance.now(), blink = Math.floor(now / 60) % 2;
  g.globalAlpha = .7; g.fillStyle = '#0d1012'; g.fillRect(x0 - 3, Y - 3, BAR_W + 6, 270 - Y + 3); g.globalAlpha = 1;
  for (const s of SLOTS) {
    const { x } = s, storm = s.k === 'storm', left = storm ? 0 : P.cd[s.k] || 0, deny = P.cdDeny[s.k] > 0, on = s.on && s.on();
    g.fillStyle = '#0d1012'; g.fillRect(x + 1, Y + 1, 14, 14);
    if (storm) {
      // the passive: the Qi fills the icon from the bottom; during the storm it is lit and the 8 s drain as a sweep
      if (P.storm > 0) { g.drawImage(s.img, x + 2, Y + 2); sweep(x, Y, 1 - P.storm / STORM_T); count(x, Y, P.storm); }
      else { const h = Math.round(12 * P.qi); g.globalAlpha = .3; g.drawImage(s.img, x + 2, Y + 2); g.globalAlpha = 1;
        if (h) g.drawImage(s.img, 0, 12 - h, 12, h, x + 2, Y + 14 - h, 12, h); }
    } else {
      g.drawImage(s.img, x + 2, Y + 2);
      if (left > 0) { sweep(x, Y, left / (P.cdMax[s.k] || left)); count(x, Y, left); }
      if (P.cdPop[s.k] > 0) { g.globalAlpha = P.cdPop[s.k] * 2.4; g.fillStyle = '#ffffff'; g.fillRect(x + 1, Y + 1, 14, 14); g.globalAlpha = 1; } // ready: a glint
    }
    // the frame: grey at rest, cyan while casting or storming, white blinking when a press is refused
    const hot = storm ? P.storm > 0 : on, col = deny ? (blink ? '#ffffff' : '#23292a') : hot ? (storm && blink ? '#ffffff' : COL.fx2) : left > 0 ? '#23292a' : '#3a4244';
    g.fillStyle = col; g.fillRect(x, Y, SZ, 1); g.fillRect(x, Y + SZ - 1, SZ, 1); g.fillRect(x, Y, 1, SZ); g.fillRect(x + SZ - 1, Y, 1, SZ);
    if (s.key) pixText(s.key, x + 8 - (textW(s.key) + 1) / 2 | 0, Y + SZ + 1, left > 0 ? '#5a6264' : '#9aa3a1');
  }
}
