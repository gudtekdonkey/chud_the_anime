import { blade3d } from './art3d.js';

// ---- The jitte: an iron truncheon with a single hook beside the shaft, tucked through the obi. No edge: it strikes, and the
//   hook catches a blade for the counter ----
const along = a => [Math.cos(a), Math.sin(a)];
// the wrapped handle behind the fist, the iron shaft with a bright tip, the hook's prong beside it near the fist
function jitte(k, at, d) { const n = [d[1], -d[0]];
  k.seg(k.add(at, d, -1), k.add(at, d, -3), 1, 'K'); k.put(...at, 'S');
  k.seg(k.add(at, d, 1), k.add(at, d, 8), 1, 'S'); k.put(...k.add(at, d, 9), 'W');
  k.put(...k.add(k.add(at, d, 1), n, 1), 'S'); k.seg(k.add(k.add(at, d, 2), n, 2), k.add(k.add(at, d, 4), n, 2), 1, 'W'); }
const ART = {
  d3: blade3d(9, 0, 'S'),
  far() {},
  // through the obi: the handle up and forward out of the sash, the shaft down behind it
  stowed(k, p, mouth, sd) { k.seg(k.add(mouth, sd, -1), k.add(mouth, sd, -3), 1, 'K'); k.seg(mouth, k.add(mouth, sd, 5), 1, 'S');
    k.put(...k.add(k.add(mouth, sd, 1), [sd[1], -sd[0]], 1), 'W'); },
  held(k, hand, a) { jitte(k, hand, along(a)); },
  backHeld(k, bh, a) { k.blob(bh[0], bh[1], 2, 'D'); jitte(k, bh, along(a)); },
  sheathing(k, hand, mouth) { const dx = mouth[0] - hand[0], dy = mouth[1] - hand[1], l = Math.hypot(dx, dy) || 1; jitte(k, hand, [dx / l, dy / l]); },
  front: [[21, 14, 'K'], [21, 13, 'S'], [21, 12, 'S'], [21, 11, 'S'], [21, 10, 'S'], [21, 9, 'S'], [21, 8, 'W'], [22, 12, 'W'], [22, 11, 'W']],
  sit: [[16, 17, 'K'], [17, 17, 'K'], [18, 17, 'S'], ...[19, 20, 21, 22, 23, 24].map(x => [x, 17, 'S']), [25, 17, 'W'], [19, 16, 'W'], [20, 16, 'W']],
};
export const JITTE = { id: 'jitte', name: 'Jitte', about: 'An iron truncheon with a hook beside the shaft, tucked through the obi: short, blunt strikes, and the hook that catches a blade. Made for the counter.', art: ART,
  reach: .75, weight: { stop: .8, shake: 1 }, poses: {} };
