import { pz, HILT, lin, keyed } from '../rig/pose.js';
import { RY } from '../rig/rig.js';
import { grip, twoHanded, breathe, slungDraw, slungStow } from './grip.js';
import { staff3d } from './art3d.js';

// ---- The bo: a plain hardwood staff a head taller than him, slung across his back. Held in the middle, so both ends strike:
//   one end cracks down from overhead, then the staff spins and the other end rises from below ----
const along = a => [Math.cos(a), Math.sin(a)];
const HALF = 15;   // 31 px end to end against his 26
const SLUNG = -1.76;
// the staff along d from `at`: `back` px behind, `fwd` px ahead, iron-shod at both ends. Either end stops at the floor
function staff(k, at, d, back, fwd) {
  let b = back, f = fwd;
  while (b > 2 && at[1] - d[1] * b > RY + 1) b--;
  while (f > 2 && at[1] + d[1] * f > RY + 1) f--;
  const e0 = k.add(at, d, -b), e1 = k.add(at, d, f);
  k.seg(e0, e1, 1, 'T'); k.put(...e0, 'S'); k.put(...e1, 'S'); }
// in both hands it is held at its middle, so it runs evenly past both fists; one-handed, a third of the way along
function held(k, hand, a) { const t = twoHanded(k, hand, a);
  if (t) staff(k, [(hand[0] + k.bh[0]) / 2, (hand[1] + k.bh[1]) / 2], t, HALF, HALF); else staff(k, hand, along(a), 10, 2 * HALF - 10); }
const stowed = p => p.sword === null && !p.sheathing && p.bsword == null;
const ART = {
  d3: staff3d('T', 15, 15),   // the same weapon from any other facing (art3d.js)
  // slung across the back like the yari, one end at his calves and the other over the hat
  far(k, p) { if (stowed(p)) staff(k, k.L(9, -4.3), along(SLUNG), HALF + 2, HALF - 2); },
  stowed() {},
  held,
  // one-handed in the back hand: the lower end grounded, the rest up through the fist
  backHeld(k, bh, a) { k.blob(bh[0], bh[1], 2, 'D'); staff(k, bh, along(a), 14, 2 * HALF - 14); },
  sheathing(k, hand) { staff(k, hand, along(SLUNG), HALF + 2, HALF - 2); },
  // opened to the camera: grounded upright beside him
  front: [...Array.from({ length: 31 }, (_, i) => [7, 23 - i, 'T']), [7, 23, 'S'], [7, -7, 'S']],
  // sitting: laid on the floor beside him
  sit: [[4, 17, 'S'], ...Array.from({ length: 29 }, (_, i) => [5 + i, 17, 'T']), [34, 17, 'S']],
};
// chudan: the staff level-ish across his body, the front end at the enemy's chest, the fists a forearm apart
const GUARD = grip({ hy: 3, lean: .14, fl: [.65, 1.0], bl: [-.7, .4] }, [6, -5], [0, -3]);
// the wind-up: both fists up by the back shoulder, the front end raised high behind the hat
const WIND = grip({ hx: -2, hy: 3, lean: -.1, chest: -.3, fl: [.55, 1.0], bl: [-.8, .45] }, [-4, -12], [0, -7]);
// uchi: the front end cracked down onto the enemy's head, arms long, the back end rising behind
const STRIKE = grip({ hx: 4, hy: 5, lean: .55, chest: .35, fl: [1.15, 1.3], bl: [-1.1, .15], hat: 1, flutter: 1 }, [10, -1], [5, -5]);
const TAIL = [[.16, STRIKE, lin], [.22, grip({ ...STRIKE, lean: .58 }, [10.5, 0], [5.5, -4])], [.36, grip({ ...STRIKE, lean: .48, flutter: 0 }, [9, -3], [4, -5])], [.5, GUARD]];
// the answer: the staff spun through his hands so the back end leads, swept down and back, then driven up under the chin
const LOW = grip({ hx: 1, hy: 5, lean: .25, chest: .1, fl: [.8, 1.3], bl: [-.8, .4] }, [2, -2], [7, -1]);
const RISE = grip({ hx: 4, hy: 3, lean: .45, chest: .3, fl: [1.1, 1.1], bl: [-1.1, .2], hat: 1, flutter: 1 }, [4, -3], [10, -8]);
const STANCES = [
  // grounded upright in the back hand, the top end over his hat
  pz({ hx: -1, hy: 2, lean: -.04, chest: .06, fl: [.4, .5], bl: [-.35, .45], fa: [.5, .4], ba: [-.1, 1.4], bsword: -1.62 }),
  // tucked: under the back arm along his forearm, one end low ahead, the other up behind the shoulder
  pz({ hx: -1, hy: 3, lean: .06, chest: .12, fl: [.45, .7], bl: [-.45, .55], fa: [.8, .8], ba: [-.4, .9], bsword: 2.6 }),
  // jodan: the staff level overhead in both hands
  grip({ hy: 3, lean: .02, chest: .04, fl: [.55, .8], bl: [-.55, .5] }, [3, -15], [-3, -15]),
  // gedan: the front end low at his knees, the back end up behind
  grip({ hx: -1, hy: 3, lean: .1, fl: [.55, .75], bl: [-.5, .5] }, [5, -1], [-1, -4]),
];
// running with it in both hands, slanted across his body, the front end low
const RUN = Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2, s = Math.sin(a), c = Math.cos(a), b = Math.round(s * .6);
  return grip({ lean: .36, hy: Math.round(.5 - .5 * Math.cos(2 * a)), fl: [.95 * s, .3 + 1.1 * Math.max(0, c)], bl: [-.95 * s, .3 + 1.1 * Math.max(0, -c)], flutter: (i % 4) / 2 },
    [6, -2 + b], [0, -5 + b]); });
export const BO = { id: 'bo', name: 'Bo staff', about: 'A plain hardwood staff a head taller than him, slung across his back and held at its middle, so both ends strike: one cracks down from overhead, then it spins and the other rises from below.', art: ART,
  reach: 1.35, weight: { stop: .9, shake: 1.2 },
  poses: {
    ...Object.fromEntries(STANCES.map((q, k) => ['ready' + k, breathe(q)])),
    ready: breathe(GUARD),
    runArmed: RUN,
    slash1: keyed([...slungDraw(SLUNG, WIND), ...TAIL], 30),
    slash1r: keyed([[0, GUARD], [.09, WIND], ...TAIL], 30),
    slash2: keyed([[0, STRIKE], [.08, LOW], [.14, grip({ ...LOW, lean: .35 }, [3, -3], [8, -2]), lin], [.2, RISE],
      [.34, grip({ ...RISE, lean: .42, flutter: 0 }, [4, -4], [9, -9])], [.5, GUARD]], 30),
    sheathe: slungStow(GUARD, SLUNG),
  },
  // every other move keeps the katana's pose; the hand that would rest on the hilt hangs free (the staff is on his back)
  adapt(p) { return p.fa === HILT ? pz({ ...p, fa: [.3, .5] }) : p; },
};
