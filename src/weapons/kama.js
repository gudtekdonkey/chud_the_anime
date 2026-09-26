import { TANTO } from './tanto.js';
import { TANTO_3D } from './art3d.js';

// ---- The kama pair: two hand sickles through the obi. They hook and pull: every cut is drawn back toward him, one in each fist ----
const along = a => [Math.cos(a), Math.sin(a)];
const drawn = p => p.sword !== null && !p.sheathing;
// a wooden handle up from the fist, then the blade off its top at a right angle, curving back toward the hand
function sickle(k, at, d, side = 1) { const n = [d[1] * side, -d[0] * side], top = k.add(at, d, 5);
  k.put(...k.add(at, d, -1), 'T'); k.seg(at, top, 1, 'T'); k.put(...top, 'S');
  for (let i = 1; i <= 4; i++) k.put(...k.add(k.add(top, n, i), d, -Math.round((i / 4) ** 2 * 2)), 'W'); }
const ART = {
  d3: TANTO_3D,
  // the second kama a pixel behind the first, its handle up out of the sash and the blade over the obi
  far(k, p, mouth, sd) { if (drawn(p) || p.sheathing) return; const m = k.add(mouth, [0, -1], 1); sickle(k, k.add(m, sd, 3), [-sd[0], -sd[1]], -1); },
  stowed(k, p, mouth, sd) { sickle(k, k.add(mouth, sd, 3), [-sd[0], -sd[1]], -1); },
  // the back fist's kama in a forward grip, the blade hooking forward
  offHand(k, p, bh) { if (!drawn(p)) return; const a = p.ba[0] + p.ba[1] + Math.PI - .4; sickle(k, bh, [Math.sin(a), Math.cos(a)]); },
  held(k, hand, a) { sickle(k, hand, along(a)); },
  backHeld(k, bh, a) { k.blob(bh[0], bh[1], 2, 'D'); sickle(k, bh, along(a)); },
  sheathing(k, hand, mouth) { const dx = hand[0] - mouth[0], dy = hand[1] - mouth[1], l = Math.hypot(dx, dy) || 1; sickle(k, hand, [dx / l, dy / l], -1); },
  // opened to the camera: a kama in each fist, blades hooked outward
  front: [[7, 16, 'T'], [7, 15, 'T'], [7, 14, 'T'], [7, 13, 'T'], [7, 12, 'S'], [6, 12, 'W'], [5, 12, 'W'], [4, 13, 'W'], [3, 13, 'W'],
    [21, 16, 'T'], [21, 15, 'T'], [21, 14, 'T'], [21, 13, 'T'], [21, 12, 'S'], [22, 12, 'W'], [23, 12, 'W'], [24, 13, 'W'], [25, 13, 'W']],
  sit: [[15, 17, 'T'], [16, 17, 'T'], [17, 17, 'T'], [18, 17, 'T'], [19, 17, 'S'], [19, 16, 'W'], [19, 15, 'W'], [18, 14, 'W'],
    [22, 17, 'T'], [23, 17, 'T'], [24, 17, 'T'], [25, 17, 'T'], [26, 17, 'S'], [26, 16, 'W'], [26, 15, 'W'], [25, 14, 'W']],
};
export const KAMA = { id: 'kama', name: 'Kama pair', about: 'Two hand sickles through the obi: they hook and pull, one in each fist, fast and close like the twin tanto but every cut drags back toward him.', art: ART,
  reach: .85, weight: { stop: .8, shake: 1.1 },
  // the tanto's quick, low footwork; the back fist holds its kama forward instead of in a reverse grip
  poses: TANTO.poses };
