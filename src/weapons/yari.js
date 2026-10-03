import { pz, HILT, lin, keyed } from 'ronin-engine/rig/pose.js';
import { RY } from '../rig/rig.js';
import { grip, twoHanded, breathe, slungDraw, slungStow } from './grip.js';
import { YARI_3D } from './art3d.js';
import { comboPoses } from '../anims/combo-poses.js';

// ---- The yari: a straight-headed spear half again his height, slung across his back. Both hands on the haft, far apart;
//   the back hand drives it through the front one, so every attack is led by the point ----
const along = a => [Math.cos(a), Math.sin(a)];
const SHAFT = 32, HEAD = 5;   // haft and the straight su-yari head: 37 px against his 26
// the angle it hangs at on his back (head up, a little behind), so a hand on the haft there lines up with the slung spear
const SLUNG = -1.76;
// the spear along direction d from `at`: `back` px of haft behind, `fwd` px ahead to the collar, then the head. The butt stops at the floor
function spear(k, at, d, back, fwd) {
  let b = back; while (b > 2 && at[1] - d[1] * b > RY + 1) b--;
  const butt = k.add(at, d, -b), col = k.add(at, d, fwd);
  k.seg(butt, col, 1, 'T'); k.put(...butt, 'S'); k.put(...col, 'D');
  k.put(...k.add(at, d, fwd + 1), 'S'); k.seg(k.add(at, d, fwd + 2), k.add(at, d, fwd + HEAD), 1, 'W'); }
// held in both hands: when the back hand is on the haft (a gripping pose), the shaft runs through both fists and is anchored
//   at the back one, so a thrust slides it forward through the front hand. Any other pose holds it at the front fist
function held(k, hand, a) { const t = twoHanded(k, hand, a);
  if (t) spear(k, k.bh, t, 5, SHAFT - 5); else spear(k, hand, along(a), 13, SHAFT - 13); }
const stowed = p => p.sword === null && !p.sheathing && p.bsword == null;
const ART = {
  d3: YARI_3D,   // the same weapon from any other facing (art3d.js)
  // slung diagonally across the back, butt at his calves and the head well above the hat; the body and mantle cover its middle
  far(k, p) { if (!stowed(p)) return; const g = k.L(9, -4.3); spear(k, g, along(SLUNG), 17, SHAFT - 17); },
  stowed() {},
  held,
  // one-handed in the back hand: the butt grounded, the rest of the haft up through the fist
  backHeld(k, bh, a) { k.blob(bh[0], bh[1], 2, 'D'); spear(k, bh, along(a), 14, SHAFT - 14); },
  // on its way to the back: at the slung angle, gripped where it will hang
  sheathing(k, hand) { spear(k, hand, along(SLUNG), 17, SHAFT - 17); },
  // opened to the camera: grounded upright beside him, towering over his hat
  front: [...Array.from({ length: 32 }, (_, i) => [7, 23 - i, 'T']), [7, 23, 'S'], [7, -9, 'D'], [7, -10, 'S'], [7, -11, 'W'], [7, -12, 'W'], [7, -13, 'W'], [7, -14, 'W']],
  // sitting: laid on the floor beside him, the full length
  sit: [[4, 17, 'S'], ...Array.from({ length: 31 }, (_, i) => [5 + i, 17, 'T']), [36, 17, 'D'], [37, 17, 'S'], [38, 17, 'W'], [39, 17, 'W'], [40, 17, 'W'], [41, 17, 'W']],
};
// chudan: the point level at the enemy's chest, fists a forearm apart, the butt by the back hip
const GUARD = grip({ hy: 3, lean: .16, fl: [.65, 1.0], bl: [-.7, .4], hat: 0 }, [7, -4], [-2, -2]);
// the draw-back: both fists pulled to the back hip, the point still on line
const WIND = grip({ hx: -2, hy: 4, lean: -.08, chest: -.15, fl: [.55, 1.0], bl: [-.8, .45] }, [3, -3], [-6, -1]);
// the thrust: the back fist drives up to the front one, arms long, the whole body behind the point
const THRUST = grip({ hx: 4, hy: 4, lean: .6, chest: .3, fl: [1.15, 1.2], bl: [-1.15, .1], hat: 1, flutter: 1 }, [12, -4], [8, -3]);
const TAIL = [[.16, THRUST, lin], [.22, grip({ ...THRUST, lean: .62 }, [12.5, -4], [8.5, -3])], [.36, grip({ ...THRUST, lean: .56 }, [11.5, -4], [7.5, -3])], [.5, GUARD]];
// the answer: tataki, the spear whipped up overhead and beaten down onto the enemy
const HIGH = grip({ hx: 2, hy: 1, lean: -.1, chest: -.25, fl: [.9, .5], bl: [-.8, .2], hat: 1, flutter: 1 }, [4, -13], [-3, -11]);
const BEAT = grip({ hx: 4, hy: 5, lean: .55, chest: .35, fl: [1.15, 1.3], bl: [-1.1, .15], hat: 1 }, [10, -2], [4, -6]);
// J3 to J6 (anims/combo-poses.js): the haft carried over the back, swept level at waist height, held low behind for the kick,
//   the head rising straight up for the launch, and the flash step ends with the spear laid out behind him
const ARMS = {
  wind: { fa: [1.4, 1.3], ba: [.6, 1.3], sword: 3.1 }, sweep: { fa: [1.5, .2], ba: [1.1, .5], sword: .05 },
  kick: { fa: [.4, .6], ba: [-.2, .8], sword: 2.9 }, crouch: { fa: [.5, .4], ba: [.1, .6], sword: 2.5 },
  top: { fa: [2.8, 0], ba: [2.4, .3], sword: -1.35 }, set: { fa: [.6, 1.3], ba: [.2, 1.1], sword: 3.0 },
  fin: { fa: [1.3, .1], ba: [.9, .6], sword: 2.95 },
};
const STANCES = [
  // grounded upright in the back hand, the head high over the hat
  pz({ hx: -1, hy: 2, lean: -.04, chest: .06, fl: [.4, .5], bl: [-.35, .45], fa: [.5, .4], ba: [-.1, 1.4], bsword: -1.62 }),
  // gedan: the point low at the knees, weight back
  grip({ hx: -1, hy: 3, lean: .08, fl: [.55, .75], bl: [-.5, .5] }, [6, 0], [-3, -3]),
  // raised: the head up at the enemy's face, the butt low behind
  grip({ hy: 3, lean: .04, chest: .06, fl: [.5, .7], bl: [-.5, .5] }, [3, -8], [-3, -4]),
  // trailing: one hand, the head low behind him
  pz({ hx: -1, hy: 3, lean: .04, chest: .12, fl: [.45, .7], bl: [-.45, .55], fa: [.8, .8], ba: [-.35, .3], bsword: 2.7 }),
];
// running with it level in both hands, the point leading
const RUN = Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
  return grip({ lean: .36, hy: Math.round(.5 - .5 * Math.cos(2 * a)), fl: [.95 * s, .3 + 1.1 * Math.max(0, c)], bl: [-.95 * s, .3 + 1.1 * Math.max(0, -c)], flutter: (i % 4) / 2 },
    [8, -4 + Math.round(s * .6)], [-1, -2 + Math.round(s * .6)]); });
export const YARI = { id: 'yari', name: 'Yari', about: 'A straight-headed spear half again his height, slung across his back. Both hands on the haft: every attack is led by the point, the back hand driving it through the front one.', art: ART,
  reach: 1.5, weight: { stop: 1, shake: 1 },
  poses: {
    ...Object.fromEntries(STANCES.map((q, k) => ['ready' + k, breathe(q)])),
    ready: breathe(GUARD),
    runArmed: RUN,
    // J from the back: the reach over the shoulder for the haft, the draw-back, the thrust
    slash1: keyed([...slungDraw(SLUNG, WIND), ...TAIL], 30),
    slash1r: keyed([[0, GUARD], [.09, WIND], ...TAIL], 30),
    slash2: keyed([[0, THRUST],
      [.08, grip({ hx: 1, hy: 5, lean: .3, chest: .1, fl: [.8, 1.3], bl: [-.8, .4] }, [3, -1], [-5, 1])],
      [.14, HIGH, lin], [.2, BEAT], [.34, grip({ ...BEAT, lean: .52 }, [10, -2], [4, -6])], [.5, GUARD]], 30),
    sheathe: slungStow(GUARD, SLUNG),
    ...comboPoses(ARMS, grip({ ...BEAT, lean: .52 }, [10, -2], [4, -6]), GUARD),
  },
  // every other move keeps the katana's pose; the hand that would rest on the hilt hangs free (the spear is on his back)
  adapt(p) { return p.fa === HILT ? pz({ ...p, fa: [.3, .5] }) : p; },
};
