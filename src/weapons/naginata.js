import { pz, HILT, lin, keyed } from '../rig/pose.js';
import { RY } from '../rig/rig.js';
import { grip, twoHanded, breathe, slungDraw, slungStow } from './grip.js';
import { YARI_3D } from './art3d.js';

// ---- The naginata: a long haft with a curved blade, slung across his back. It cuts in wide sweeps, low at the legs and
//   down from overhead, the haft sliding through both hands ----
const along = a => [Math.cos(a), Math.sin(a)];
const SHAFT = 29, BLADE = 9;
const SLUNG = -1.8;
// the haft along d from `at`, then a tsuba, then the blade curving up off the line (away from its edge). The butt stops at the floor
function naginata(k, at, d, back, fwd) {
  let b = back; while (b > 2 && at[1] - d[1] * b > RY + 1) b--;
  const n = [d[1], -d[0]], butt = k.add(at, d, -b), col = k.add(at, d, fwd);
  k.seg(butt, col, 1, 'T'); k.put(...butt, 'S'); k.put(...col, 'S'); k.put(...k.add(col, n, 1), 'S'); k.put(...k.add(col, n, -1), 'S');
  for (let i = 1; i <= BLADE; i++) { const c = (i / BLADE) ** 2 * 2.6, q = k.add(k.add(col, d, i), n, c);
    k.put(...q, 'W'); if (i < BLADE - 1) k.put(...k.add(q, n, 1), 'S'); } }
const stowed = p => p.sword === null && !p.sheathing && p.bsword == null;
const ART = {
  d3: YARI_3D,   // the other facings draw it as the yari's haft (art3d.js)
  far(k, p) { if (stowed(p)) naginata(k, k.L(9, -4.3), along(SLUNG), 16, SHAFT - 16); },
  stowed() {},
  held(k, hand, a) { const t = twoHanded(k, hand, a); if (t) naginata(k, k.bh, t, 5, SHAFT - 5); else naginata(k, hand, along(a), 12, SHAFT - 12); },
  backHeld(k, bh, a) { k.blob(bh[0], bh[1], 2, 'D'); naginata(k, bh, along(a), 14, SHAFT - 14); },
  sheathing(k, hand) { naginata(k, hand, along(SLUNG), 16, SHAFT - 16); },
  front: [...Array.from({ length: 29 }, (_, i) => [7, 23 - i, 'T']), [7, 23, 'S'], [6, -6, 'S'], [8, -6, 'S'],
    ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => [7 + Math.round((i / 8) ** 2 * 2.6), -7 - i, 'W'])],
  sit: [[3, 17, 'S'], ...Array.from({ length: 28 }, (_, i) => [4 + i, 17, 'T']), [32, 17, 'S'], [32, 16, 'S'],
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => [32 + i, 17 - Math.round((i / 9) ** 2 * 2.6), 'W'])],
};
// the blade up at the enemy's face, the butt low by the back hip
const GUARD = grip({ hy: 3, lean: .12, fl: [.6, 1.0], bl: [-.7, .4] }, [6, -6], [-2, -1]);
// the wind-up for the low sweep: the blade high behind the back shoulder
const WIND = grip({ hx: -2, hy: 4, lean: -.12, chest: -.35, fl: [.55, 1.05], bl: [-.8, .45] }, [-3, -10], [3, -4]);
// sune-giri: the blade whips down and across at shin height, the haft sliding out through the hands
const SWEEP = grip({ hx: 3, hy: 5, lean: .5, chest: .35, fl: [1.1, 1.3], bl: [-1.1, .15], hat: 1, flutter: 1 }, [10, 3], [3, -2]);
const CARRY = grip({ hx: 3, hy: 4, lean: .4, chest: .3, fl: [1.1, 1.2], bl: [-1.05, .15], hat: 1 }, [9, -7], [2, -3]);
const TAIL = [[.16, SWEEP, lin], [.22, pz({ ...SWEEP, flutter: 0 })], [.36, CARRY], [.5, GUARD]];
// the answer: the haft spun, the blade raised overhead and brought straight down
const HIGH = grip({ hx: 2, hy: 1, lean: -.12, chest: -.3, fl: [.9, .5], bl: [-.8, .2], hat: 1, flutter: 1 }, [2, -13], [-2, -7]);
const CHOP = grip({ hx: 4, hy: 5, lean: .6, chest: .4, fl: [1.15, 1.3], bl: [-1.1, .15], hat: 1 }, [10, 0], [4, -5]);
const STANCES = [
  // grounded upright in the back hand, the blade over his hat
  pz({ hx: -1, hy: 2, lean: -.04, chest: .06, fl: [.4, .5], bl: [-.35, .45], fa: [.5, .4], ba: [-.1, 1.4], bsword: -1.6 }),
  // waki: the blade trailing low behind him, both hands on the haft
  grip({ hy: 3, lean: .06, chest: .1, fl: [.5, .75], bl: [-.5, .5] }, [-5, 2], [2, -3]),
  // jodan: the haft level overhead
  grip({ hy: 3, lean: .02, chest: .04, fl: [.55, .8], bl: [-.55, .5] }, [4, -12], [-4, -11]),
  // gedan: the blade low ahead, at the knees
  grip({ hx: -1, hy: 3, lean: .1, fl: [.55, .75], bl: [-.5, .5] }, [7, 1], [-2, -3]),
];
const RUN = Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
  return grip({ lean: .36, hy: Math.round(.5 - .5 * Math.cos(2 * a)), fl: [.95 * s, .3 + 1.1 * Math.max(0, c)], bl: [-.95 * s, .3 + 1.1 * Math.max(0, -c)], flutter: (i % 4) / 2 },
    [-4, 1], [3, -3]); });
export const NAGINATA = { id: 'naginata', name: 'Naginata', about: 'A long haft with a curved blade, slung across his back: wide sweeping cuts, low at the legs and straight down from overhead, with nearly the reach of the yari.', art: ART,
  reach: 1.4, weight: { stop: 1.1, shake: 1.2 },
  poses: {
    ...Object.fromEntries(STANCES.map((q, k) => ['ready' + k, breathe(q)])),
    ready: breathe(GUARD),
    runArmed: RUN,
    slash1: keyed([...slungDraw(SLUNG, WIND), ...TAIL], 30),
    slash1r: keyed([[0, GUARD], [.09, WIND], ...TAIL], 30),
    slash2: keyed([[0, CARRY],
      [.08, grip({ hx: 1, hy: 5, lean: .3, chest: .1, fl: [.8, 1.3], bl: [-.8, .4] }, [-4, 2], [3, -3])],
      [.14, HIGH, lin], [.2, CHOP], [.34, grip({ ...CHOP, lean: .56 }, [10, 0], [4, -5])], [.5, GUARD]], 30),
    sheathe: slungStow(GUARD, SLUNG),
  },
  adapt(p) { return p.fa === HILT ? pz({ ...p, fa: [.3, .5] }) : p; },
};
