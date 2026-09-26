import { RY } from '../rig/rig.js';
import { BO } from './bo.js';
import { staff3d } from './art3d.js';

// ---- The tetsubo: a long iron-banded staff, heavier at the striking end, slung across his back. It moves as the bo does, but
//   gripped near the butt, so every blow lands with the iron end and the whole weight behind it ----
const along = a => [Math.cos(a), Math.sin(a)];
const SLUNG = -1.76;
// the butt `back` px behind `at`, the bar `fwd` px ahead: a wrapped grip, then iron, 2 px wide at the striking end with bright bands and a cap.
//   Either end stops at the floor
function bar(k, at, d, back, fwd) { const n = [-d[1], d[0]]; let b = back, f = fwd;
  while (b > 1 && at[1] - d[1] * b > RY + 1) b--;
  while (f > 6 && at[1] + d[1] * f > RY + 1) f--;
  k.seg(k.add(at, d, -b), k.add(at, d, 3), 1, 'K'); k.put(...k.add(at, d, -b), 'S');
  for (let i = 4; i <= f; i++) { const c = k.add(at, d, i), band = i > 8 && i % 5 === 0; k.put(...c, band ? 'W' : 'S'); if (i > 8) k.put(...k.add(c, n, 1), band ? 'W' : 'G'); }
  k.put(...k.add(at, d, f + 1), 'W'); }
const stowed = p => p.sword === null && !p.sheathing && p.bsword == null;
const ART = {
  d3: staff3d('S', 6, 22),
  // across the back, the heavy end up behind his head
  far(k, p) { if (stowed(p)) bar(k, k.L(9, -4.3), along(SLUNG), 14, 16); },
  stowed() {},
  // in both hands, held from the back fist near the butt; one-handed, from the fist
  held(k, hand, a) { if (k.bh && Math.hypot(hand[0] - k.bh[0], hand[1] - k.bh[1]) < 16) bar(k, k.bh, along(a), 4, 24); else bar(k, hand, along(a), 6, 22); },
  backHeld(k, bh, a) { k.blob(bh[0], bh[1], 2, 'D'); bar(k, bh, along(a), 12, 16); },
  sheathing(k, hand) { bar(k, hand, along(SLUNG), 14, 16); },
  front: [...Array.from({ length: 30 }, (_, i) => [7, 23 - i, i > 12 ? (i % 4 ? 'S' : 'W') : 'K']), ...Array.from({ length: 17 }, (_, i) => [8, 10 - i, (i + 1) % 4 ? 'G' : 'W']), [7, -7, 'W']],
  sit: [[4, 17, 'S'], ...Array.from({ length: 29 }, (_, i) => [5 + i, 17, i > 10 ? (i % 4 ? 'S' : 'W') : 'K']), ...Array.from({ length: 16 }, (_, i) => [18 + i, 16, i % 4 ? 'G' : 'W']), [34, 17, 'W']],
};
export const TETSUBO = { id: 'tetsubo', name: 'Tetsubo', about: 'A long iron-banded staff slung across his back, gripped near the butt: the bo\'s crack from overhead and the rising answer, but every blow lands with the iron end. Slow and crushing.', art: ART,
  reach: 1.3, weight: { stop: 1.8, shake: 2.2 },
  poses: BO.poses, adapt: BO.adapt };
