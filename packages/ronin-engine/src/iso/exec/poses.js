// ---- The executions' poses, re-staged for the 3D test level: today's executions (src/assassin/executions.js, the
// approved batch 1) key their bodies in the old rig's joint angles (pz); here every key is the Animation Flow page's
// side pose (anim/moves.js: pel, lean, head, the feet fN / fF and hands hN / hF in rig px [forward, up], the blade's grip
// and angle), so the 3D model and the pixel look stand them up like any move. Names follow the old ones (RX.windup,
// RX.legsKneel ...); each leans into its motion as the batch's keys do.
import { H, mixP, EZ, clamp } from '../../flow/flow.js';
import { SH, blade } from '../../flow/moves.js';

// a pose from the standing guard's defaults
export const pose = o => ({ pel: [0, H - 2.3], lean: .14, head: .03, fN: [5.5, 1.5], fF: [-4.6, 1.5], elb: 'back', speed: 0, blade: SH, ...o });
const bare = o => pose({ blade: SH, ...o });             // no sword in his hands (dropped, or never drawn): the hands go where they are put
export const sheathedAt = g => ({ out: 0, g, ang: .5, two: 0 });
// raised off the floor by h world units (a leap, a body flung): the whole pose goes up
export function lift(p, h) { if (!h) return p; const u = h * 2, q = { ...p }; for (const k of ['pel', 'fN', 'fF', 'hN', 'hF']) if (p[k]) q[k] = [p[k][0], p[k][1] + u];
  if (p.blade && p.blade.g) q.blade = { ...p.blade, g: [p.blade.g[0], p.blade.g[1] + u] }; return q; }
// eased keys [t, pose, ease] (ease on the way INTO that key: 'lin', 'hold' (a cut), or the flow's EZ names; 'io' if none)
export function at(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  let j = 0; while (j < keys.length - 2 && keys[j + 1][0] <= t) j++;
  const [t0, a] = keys[j], [t1, b, e] = keys[j + 1], u = clamp((t - t0) / Math.max(1e-6, t1 - t0), 0, 1);
  const k = e === 'hold' ? (u >= 1 ? 1 : 0) : e === 'lin' ? u : EZ[e || 'io'](u);
  return mixP(a, b, k, k < .5 ? 'a' : 'b');
}

// ---- the ronin ----
export const GUARD = pose({ pel: [0, H - 2.5], blade: blade([8.8, H + 4], .55, 1) });   // where the sheathe (anim/moves.js) starts
export const HR = {
  // the set before he flashes in: low, the hand on the hilt
  set: pose({ pel: [0, H - 4], lean: .4, head: -.15, fN: [7, 1.5], fF: [-6, 1.5], hN: [4.8, H - .8], hF: [3.5, H - 2.5], blade: sheathedAt([4.8, H - .8]), sayaTilt: .2 }),
  // Behind the back: back to back, then the blade driven backward past his own hip, up into the neck
  wait: pose({ pel: [0, H - 3], lean: .25, head: .05, fN: [6, 1.5], fF: [-5, 1.5], hN: [4.6, H - .2], hF: [3.5, H - 1.5], blade: sheathedAt([4.6, H - .2]), sayaTilt: .15 }),
  stab: pose({ pel: [2, H - 3.5], lean: .38, head: -.12, fN: [9, 1.5], fF: [-3, 1.5], hF: [7.5, H + 2.5], blade: blade([-3, H + 6], Math.PI - .4, 0, { vis: 30 }) }),
  // Through and past: the iai crouch, then the follow-through on the far side of him, the back arm flung behind
  crouch: pose({ pel: [-1, H - 5], lean: .6, head: -.25, fN: [9, 1.5], fF: [-7, 1.5], hN: [5, H - 2], hF: [2, H - 4], blade: sheathedAt([5, H - 2]), sayaTilt: .25 }),
  past: pose({ pel: [3, H - 7], lean: .85, head: -.3, fN: [14, 1.5], fF: [-11, 2.5], hF: [-9, H + 1], blade: blade([13, H + 1], .2, 0, { vis: 30 }) }),
  settle: pose({ pel: [2, H - 6], lean: .7, head: -.22, fN: [14, 1.5], fF: [-11, 1.5], hF: [-8, H], blade: blade([12, H], .3, 0) }),
  // Far behind: already through him, low, the blade out ahead
  after: pose({ pel: [2, H - 6], lean: .8, head: -.25, fN: [14, 1.5], fF: [-11, 2], hF: [-9, H + 1], blade: blade([13, H + 1], .3, 0) }),
  // Peek-a-boo: standing at his elbow, easy; then home with the blade low
  beside: pose({ pel: [0, H - 2.2], lean: .06, head: .1, fN: [4.5, 1.5], fF: [-4, 1.5], hN: [2.5, H - 1], hF: [5, H + 1], blade: SH }),
  home: pose({ pel: [0, H - 3], lean: .2, head: .02, fN: [6, 1.5], fF: [-5, 1.5], hF: [4, H - 1], blade: blade([10, H - 1], -.6, 0) }),
};
// Whirlwind: six cuts from six sides, a glitch between each (dx along the stage, dy across it, f his facing, z off the floor)
export const WHIRL = [
  { t: 0, dx: -11, dy: 2, f: 1, rot: .5, p: pose({ pel: [0, H - 6], lean: .55, head: -.2, fN: [10, 1.5], fF: [-6, 3], hF: [-6, H + 1], blade: blade([12, H - 2], .4, 0) }) },
  { t: .08, dx: 11, dy: -3, f: -1, rot: -.9, p: pose({ pel: [1, H - 4], lean: .75, head: -.25, fN: [9, 1.5], fF: [-8, 1.5], hF: [-8, H + 2], blade: blade([12, H + 3], 1.15, 0) }) },
  { t: .16, dx: -9, dy: -4, f: 1, rot: -1.3, p: pose({ pel: [0, H - 1], lean: -.25, head: .2, fN: [6, 1.5], fF: [-6, 1.5], blade: blade([4, H + 16], 1.9, 1) }) },
  { t: .24, dx: 2, dy: 1, f: -1, z: 12, rot: 1.4, p: pose({ pel: [0, H - 3], lean: .6, head: -.2, fN: [6, 6], fF: [-2, 7], kneeDir: [1, -.3], hF: [-5, H + 3], blade: blade([10, H - 2], -1.2, 0) }) },
  { t: .32, dx: 12, dy: 3, f: -1, rot: 0, p: pose({ pel: [2, H - 5], lean: .6, head: -.2, fN: [12, 1.5], fF: [-10, 1.5], hF: [-8, H + 1], blade: blade([14, H + 1], 0, 0) }) },
  { t: .42, dx: -14, dy: 0, f: 1, rot: .2, big: true, p: pose({ pel: [2, H - 6], lean: .72, head: -.25, fN: [13, 1.5], fF: [-11, 1.5], hF: [-9, H + 2], blade: blade([13, H + 3], .95, 0) }) },
];

// ---- the samurai: his guard and how a man moves when things go wrong ----
export const EG = pose({ pel: [0, H - 2.5], blade: blade([8.8, H + 4], .55, 1) });
export const RX = {
  flinch: pose({ pel: [-1.5, H - 2.8], lean: -.22, head: .38, fN: [4.5, 1.5], fF: [-5.5, 1.5], blade: blade([6, H + 7], 1, 1) }),
  windup: pose({ pel: [-1.5, H - 2.4], lean: -.1, head: .12, fN: [5, 3.5], blade: blade([-.5, H + 15], 2.6, 1) }),
  swung: pose({ pel: [6, H - 5], lean: .68, head: -.2, fN: [14, 1.5], elb: 'down', blade: blade([11, H - 3], -1.4, 1) }),
  doubled: pose({ pel: [3, H - 5.5], lean: 1, head: .45, fN: [13, 1.5], fF: [-4, 1.5], elb: 'down', hF: [6, H + 1], blade: blade([7, H - 6], -1.35, 0) }),
  turning: pose({ pel: [0, H - 4], lean: .35, head: -.2, fN: [6, 1.5], fF: [-5, 1.5], hF: [4, H + 2], blade: blade([6, H - 3], -1.2, 0) }),
  reach: pose({ pel: [2, H - 3.5], lean: .5, head: -.25, fN: [9, 1.5], fF: [-5, 1.5], hF: [17, H + 9], blade: blade([3, H - 3], -1.4, 0) }),
  clutch: pose({ pel: [0, H - 4.5], lean: .6, head: .4, fN: [6, 1.5], fF: [-5, 1.5], elb: 'down', hF: [5, H + 3], blade: blade([4, H - 5], -1.45, 0) }),
  sag: pose({ pel: [0, H - 7], lean: .55, head: .6, fN: [5, 1.5], fF: [-5, 1.5], elb: 'down', hF: [5, H - 2], blade: blade([5, H - 6], -1.5, 0) }),
  // the legs alone, once the top is gone
  legsSag: bare({ pel: [0, H - 6], lean: .4, fN: [5, 1.5], fF: [-5, 1.5] }),
  legsKneel: bare({ pel: [0, H - 9.5], lean: .3, fN: [7, 1.5], fF: [-9, 1.5], kneeDir: [1, -.4] }),
  legsDown: bare({ pel: [0, 3.6], lean: -1.4, fN: [17, 1.5], fF: [16, 2.6] }),
  // Behind the back: resignation, arms opening, the sword slipping, the jolt, the hand to the wound, down forward
  slump: pose({ pel: [0, H - 3], lean: .2, head: .38, fN: [4, 1.5], fF: [-4, 1.5], hF: [3, H + 1], blade: blade([6, H - 1], -.9, 0) }),
  open: pose({ pel: [0, H - 3], lean: .16, head: .3, fN: [4, 1.5], fF: [-4, 1.5], hF: [-6, H + 3], blade: blade([9, H + 3], -1.2, 0) }),
  opened: bare({ pel: [0, H - 3], lean: .16, head: .3, fN: [4, 1.5], fF: [-4, 1.5], hN: [9, H + 3], hF: [-6, H + 3] }),
  jolt: bare({ pel: [-1, H - 1.8], lean: -.38, head: .5, hN: [10, H + 2], hF: [-8, H + 3] }),
  stiff: bare({ pel: [0, H - 2.4], lean: -.1, head: .3, hN: [4, H + 11], hF: [3, H + 7] }),
  sagB: bare({ pel: [0, H - 6], lean: .5, head: .5, fN: [5, 1.5], fF: [-4, 1.5], hN: [6, H - 1], hF: [4, H - 2] }),
  kneel: bare({ pel: [1, H - 9.5], lean: .45, head: .5, fN: [8, 1.5], fF: [-6, 1.5], hN: [9, H - 7], hF: [7, H - 8], elb: 'down', kneeDir: [1, -.4] }),
  handsDown: bare({ pel: [1, H - 12], lean: .9, head: .7, fN: [3, 1.5], fF: [-7, 1.5], hN: [8, 3], hF: [7, 2.5], elb: 'down' }),
  prone: bare({ pel: [1, 4.8], lean: 1.45, head: .9, fN: [-3, 1.5], fF: [-7, 1.5], hN: [12, 1.5], hF: [9, 1.5], elb: 'down' }),
  // Far behind: he turns, raises his guard at nothing, feels something across his chest
  guardUp: pose({ pel: [0, H - 3], lean: .05, head: .1, blade: blade([7, H + 8], 1.2, 1) }),
  chestTouch: pose({ pel: [0, H - 3.2], lean: .12, head: .35, hF: [4, H + 9], blade: blade([8, H], .6, 0) }),
  // Peek-a-boo: he looks down at his hands
  handsLook: bare({ pel: [0, H - 3], lean: .3, head: .55, hN: [8, H + 5], hF: [7, H + 4], elb: 'down' }),
  // Whirlwind: where each blow lands, the body gives there; then the wide cut throws him
  impact: [
    pose({ pel: [1, H - 5], lean: .35, head: .2, fN: [1, 4], fF: [-8, 1.5], hF: [-5, H + 4], blade: blade([9, H + 6], -.2, 0) }),     // legs swept
    pose({ pel: [2, H - 3], lean: -.25, head: .5, hF: [8, H + 6], blade: blade([3, H + 9], .8, 0) }),                                // struck in the back
    pose({ pel: [-1, H - 1], lean: -.4, head: .6, hF: [5, H + 14], blade: blade([6, H + 15], 1.6, 0) }),                             // lifted from below
    pose({ pel: [0, H - 7], lean: .45, head: .5, fN: [6, 1.5], fF: [-4, 1.5], elb: 'down', hF: [3, H - 3], blade: blade([5, H - 4], -1.2, 0) }),   // crushed from above
    pose({ pel: [3, H - 4], lean: .65, head: -.3, hF: [7, H + 4], blade: blade([8, H + 2], 1, 0) }),                                 // run through from behind
  ],
  flung: bare({ pel: [0, H - 1], lean: -.95, head: .4, fN: [9, 6], fF: [5, 9], hN: [-6, H + 8], hF: [-9, H + 5] }),
};
