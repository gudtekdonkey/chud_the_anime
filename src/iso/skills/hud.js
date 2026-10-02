// ---- The HUD for the skills, as today's (ui/hud.js and ui/skill-bar.js, prototypes/20-items.html): health and Qi top
// left (Qi notched in thirds, STORM while Storm Chain runs), and under them the skills' slots, League-style: the
// Storm Chain passive first (the Qi fills its icon, the storm drains it), then I, O, P, N, U and C, each with its key,
// its cooldown as a dark shade with the seconds left (whole seconds, tenths under one), a white blink when a press is
// refused, a glint when it is ready again. Drawn on the effects layer at the world's pixel scale (2 render px each).
export const ICON_COL = { '#': '#6ff3e4', '+': '#52e8d6', w: '#ffffff', k: '#0d1012' };
export const ICONS = {   // today's 12×12 icons (ui/skill-bar.js)
  storm:  ['......ww....', '.....ww.....', '....ww......', '...www......', '..wwwwwww...', '......ww....', '.....ww.....', '....ww......', '...w#.......', '..#.........', '.+..........', '............'],
  double: ['w..........w', '.+........+.', '..#......#..', '...#....#...', '....#..#....', '.....##.....', '.....##.....', '....#..#....', '...#....#...', '..#......#..', '.+........+.', 'w..........w'],
  moon:   ['....####....', '..##+++.....', '.#++........', '.#+.........', '#+..........', '#+......w...', '#+..........', '#+..........', '.#+.........', '.#++........', '..##+++.....', '....####....'],
  rift:   ['#..........#', '.#k......k#.', '..#k....k#..', '...#k..k#...', '....#kk#....', '.....ww.....', '.....ww.....', '....#kk#....', '...#k..k#...', '..#k....k#..', '.#k......k#.', '#..........#'],
  mirror: ['..##....++..', '..##....++..', '.####..++++.', '#.##.#+.++.+', '..##....++..', '..##....++..', '.#..#..+..+.', '.#..#..+..+.', '.#..#..+..+.', '............', '.####..++++.', '............'],
  sweep:  ['.....ww.....', '.....##.....', '.....##.....', '.....##.....', '....####....', '.....##.....', '..+..##..+..', '.+...ww...+.', '+...wwww...+', '.+........+.', '..++....++..', '....++++....'],
  breath: ['.....++.....', '....+ww+....', '.....++.....', '............', '..#..##..#..', '.#+#.##.#+#.', '#+..####..+#', '.#..####..#.', '..#.####.#..', '...######...', '............', '..########..'],
};
const FONT = { C: '.##|#..|#..|#..|.##', I: '###|.#.|.#.|.#.|###', M: '#.#|###|###|#.#|#.#', N: '##.|#.#|#.#|#.#|#.#', O: '.#.|#.#|#.#|#.#|.#.', P: '##.|#.#|##.|#..|#..',
  R: '##.|#.#|##.|#.#|#.#', S: '.##|#..|.#.|..#|##.', T: '###|.#.|.#.|.#.|.#.', U: '#.#|#.#|#.#|#.#|###', 0: '###|#.#|#.#|#.#|###', 1: '.#.|##.|.#.|.#.|###',
  2: '##.|..#|.#.|#..|###', 3: '##.|..#|.#.|..#|##.', 4: '#.#|#.#|###|..#|..#', 5: '###|#..|##.|..#|##.', 6: '.##|#..|###|#.#|###', 7: '###|..#|.#.|.#.|.#.',
  8: '###|#.#|###|#.#|###', 9: '###|#.#|###|..#|##.', '.': '...|...|...|...|.#.' };
const Z = 2;   // render px per HUD pixel: the world's own pixel
const SLOTS = [{ k: 'storm', key: '' }, { k: 'double', key: 'I' }, { k: 'moon', key: 'O' }, { k: 'rift', key: 'P' }, { k: 'mirror', key: 'N' }, { k: 'sweep', key: 'U' }, { k: 'breath', key: 'C' }];
const ON = { double: c => c && c.id === 'double', moon: c => c && c.id === 'moon', rift: c => c && c.id === 'rift', mirror: c => c && c.id === 'mirror', sweep: c => c && c.id === 'sweep', breath: c => c && c.id === 'breath' };
let imgs = null;
const icon = rows => { const c = document.createElement('canvas'); c.width = c.height = 12; const g = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ICON_COL[ch]) { g.fillStyle = ICON_COL[ch]; g.fillRect(x, y, 1, 1); } })); return c; };

export function drawHud(g, C) {
  const SK = C.SK, R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x * Z, y * Z, w * Z, h * Z); };
  const text = (s, x, y, col) => { g.fillStyle = col; let cx = x; for (const ch of s) { const f = FONT[ch]; if (f) f.split('|').forEach((r, ry) => { for (let rx = 0; rx < 3; rx++) if (r[rx] === '#') g.fillRect((cx + rx) * Z, (y + ry) * Z, Z, Z); }); cx += 4; } return cx - x - 1; };
  const outlined = (s, x, y) => { for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) text(s, x + ox, y + oy, '#0c0d11'); text(s, x, y, '#ffffff'); };
  if (!imgs) imgs = Object.fromEntries(Object.entries(ICONS).map(([k, v]) => [k, icon(v)]));
  g.globalAlpha = 1; const now = performance.now(), blink = Math.floor(now / 60) % 2;
  // health and Qi
  const X = 5, Y = 5, BW = 64; R(X - 2, Y - 2, BW + 4, 14, 'rgba(10,12,15,.72)'); R(X - 2, Y - 2, BW + 4, 1, '#2c323b');
  R(X, Y, BW, 4, '#1a1d22'); R(X, Y, Math.round(BW * SK.hp), 4, SK.hp < .35 && blink ? '#e0484e' : '#e8ece9'); R(X, Y, Math.round(BW * SK.hp), 1, '#ffffff');
  const storm = SK.storm > 0; R(X, Y + 6, BW, 3, '#10161a'); R(X, Y + 6, Math.round(BW * SK.qi), 3, storm ? (Math.floor(now / 90) % 2 ? '#ffffff' : '#6ff3e4') : '#52e8d6');
  for (const q of [1, 2]) R(X + Math.round(BW * q / 3), Y + 6, 1, 3, '#0c0d11');
  if (storm) outlined('STORM', X + BW + 4, Y + 5);
  // the skills' slots
  const SZ = 14, STEP = 15, SY = Y + 13; R(X - 2, SY - 2, SLOTS.length * STEP + 3, SZ + 4, 'rgba(10,12,15,.72)');
  SLOTS.forEach((s, i) => { const x = X + i * STEP, y = SY, left = SK.cd[s.k] || 0, deny = SK.deny[s.k] > 0, pop = SK.pop[s.k] > 0, on = s.k === 'storm' ? storm : ON[s.k](SK.cur);
    R(x, y, SZ, SZ, '#0d1012'); g.drawImage(imgs[s.k], 0, 0, 12, 12, (x + 1) * Z, (y + 1) * Z, 12 * Z, 12 * Z);
    if (s.k === 'storm') { const f = storm ? 1 - SK.storm / SK.stormMax : 1 - SK.qi; R(x + 1, y + 1, 12, Math.round(12 * f), 'rgba(8,10,12,.78)'); }   // the Qi fills it; the storm drains it
    else if (left > 0) { R(x + 1, y + 1, 12, Math.max(1, Math.round(12 * left / (SK.cdMax[s.k] || left))), 'rgba(8,10,12,.8)'); const t = left >= 1 ? String(Math.ceil(left)) : left.toFixed(1).slice(1);
      outlined(t, x + Math.round((SZ - (t.length * 4 - 1)) / 2), y + 5); }
    else text(s.key, x + 1, y + 1, '#7d868e');
    const fr = deny && blink ? '#ffffff' : pop ? '#b8fff6' : on ? '#52e8d6' : '#2c323b';
    R(x, y, SZ, 1, fr); R(x, y + SZ - 1, SZ, 1, fr); R(x, y, 1, SZ, fr); R(x + SZ - 1, y, 1, SZ, fr); });
}
