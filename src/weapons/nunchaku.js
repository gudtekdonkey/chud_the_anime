import { blade3d } from './art3d.js';

// ---- The nunchaku: two short sticks joined by a cord, tucked in the obi. One stick in the fist, the other whipping along a beat
//   behind it, so every swing trails its second half ----
const along = a => [Math.cos(a), Math.sin(a)];
const rot = (d, t) => [d[0] * Math.cos(t) - d[1] * Math.sin(t), d[0] * Math.sin(t) + d[1] * Math.cos(t)];
// the held stick, two links of cord, then the free stick swung round by `lag`
function chucks(k, at, d, lag = .9) { const e = k.add(at, d, 4); k.put(...k.add(at, d, -1), 'T'); k.seg(at, e, 1, 'T');
  const c = rot(d, lag / 2), j = k.add(e, c, 2); k.put(...k.add(e, c, 1), 'S'); k.put(...j, 'S');
  const f = rot(d, lag); k.seg(k.add(j, f, 1), k.add(j, f, 5), 1, 'T'); }
const ART = {
  d3: blade3d(6, 0, 'T'),
  far() {},
  // folded in the sash: one stick up out of it, the other hanging beside
  stowed(k, p, mouth, sd) { k.seg(k.add(mouth, sd, -1), k.add(mouth, sd, -4), 1, 'T'); k.put(...k.add(mouth, [0, 1], 1), 'S');
    k.seg(k.add(mouth, [1, 2], 1), k.add(mouth, [1, 6], 1), 1, 'T'); },
  held(k, hand, a) { chucks(k, hand, along(a)); },
  backHeld(k, bh, a) { k.blob(bh[0], bh[1], 2, 'D'); chucks(k, bh, along(a), .25); },
  // folded in the fist on the way back to the sash
  sheathing(k, hand, mouth) { const dx = mouth[0] - hand[0], dy = mouth[1] - hand[1], l = Math.hypot(dx, dy) || 1, d = [dx / l, dy / l];
    k.seg(hand, k.add(hand, d, 4), 1, 'T'); k.seg(k.add(hand, [-d[1], d[0]], 1), k.add(k.add(hand, [-d[1], d[0]], 1), d, 4), 1, 'T'); },
  front: [[21, 15, 'T'], [21, 14, 'T'], [21, 13, 'T'], [21, 12, 'T'], [21, 16, 'S'], [22, 17, 'S'], [22, 18, 'T'], [22, 19, 'T'], [22, 20, 'T'], [22, 21, 'T']],
  sit: [[16, 17, 'T'], [17, 17, 'T'], [18, 17, 'T'], [19, 17, 'T'], [20, 17, 'S'], [21, 16, 'S'], [22, 16, 'T'], [23, 16, 'T'], [24, 16, 'T'], [25, 16, 'T']],
};
export const NUNCHAKU = { id: 'nunchaku', name: 'Nunchaku', about: 'Two short sticks on a cord, tucked in the obi: fast whipping swings, the free stick a beat behind the one in his fist.', art: ART,
  reach: .95, weight: { stop: .7, shake: 1 }, poses: {} };
