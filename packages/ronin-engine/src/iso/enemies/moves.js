// ---- The enemies' moves, in the Animation Flow page's style and units (anim/flow.js: eased keys, the root riding
// under the pelvis, 2–4 frame blends in, the springs and planted feet on top), on the shared skeleton. Additions for
// the enemy types, not the page's: each attack has its wind-up (the 'e:tele' key: the red flash), a held read, the
// blow ('e:strike', 'e:slam', 'e:loose', 'e:throw') and a recovery that is the punish window. HITS says what each blow
// covers, measured from his root at the blow, and when he stops tracking the hero (the commit, before the blow).
import { proc, keyed, H, TAU, clamp } from '../../flow/flow.js';
import { blade } from '../../flow/moves.js';

const G0 = { pel: [0, H - 2.3], lean: .14, head: .03, fN: [5.5, 1.5], fF: [-4.6, 1.5], elb: 'back', blade: blade([8.8, H + 4], .55, 1) };
const k = (t, e, p, o = {}) => ({ t, e, ...p, ...o });

// ---- the hold of each weapon (his guard), breathing; the stalk steps the feet under it
export const HOLD = {
  sword: (t, s) => { const b = Math.sin(t * TAU / 2.1 + s); return { ...G0, pel: [0, H - 2.3 - .4 * (b + 1) / 2], lean: .14 + .025 * b, blade: blade([8.8, H + 4 + .45 * b], .55 + .04 * b, 1) }; },
  spear: (t, s) => { const b = Math.sin(t * TAU / 2.3 + s); return { pel: [0, H - 2.8 - .4 * (b + 1) / 2], lean: .18 + .02 * b, head: .02, fN: [6, 1.5], fF: [-6, 1.5], elb: 'back', blade: blade([5, H + 5 + .4 * b], .1, 1) }; },
  bow: (t, s) => { const b = Math.sin(t * TAU / 2.6 + s); return { pel: [0, H - 2.2 - .3 * (b + 1) / 2], lean: .12, head: .03, fN: [5, 1.5], fF: [-5, 1.5], hF: [1, H + 1 + .3 * b], elb: 'back', blade: blade([5, H + 1], -.8, 0) }; },
  club: (t, s) => { const b = Math.sin(t * TAU / 2.8 + s); return { pel: [0, H - 2.8 - .5 * (b + 1) / 2], lean: .1 + .03 * b, head: .04, fN: [6, 1.5], fF: [-6, 1.5], elb: 'back', blade: blade([3, H + 11 + .4 * b], 2.4, 1) }; },
  tanto: (t, s) => { const b = Math.sin(t * TAU / 1.6 + s); return { pel: [0, H - 4 - .5 * (b + 1) / 2], lean: .35 + .03 * b, head: -.1, fN: [6, 1.5], fF: [-6, 1.5], hF: [9, H + 3 + .3 * b], elb: 'back', blade: blade([7, H + 1], -.5, 0, { vis: 9 }) }; },
};
const holdOf = a => HOLD[a.char.T.weapon](a.W.t, a.char.seed);
proc('e_guard', a => ({ p: holdOf(a) }), { loop: true, blend: .12 });
// the stalk: the hold, the feet stepping under it, moving along a.mh (sideways, back) while he faces the hero
proc('e_stalk', (a, t, dt) => { a.phase += a.v * dt / 15; const p = holdOf(a), s = Math.sin(TAU * a.phase), c = Math.cos(TAU * a.phase);
  p.fN = [p.fN[0] + 2.6 * s, 1.5 + 2.4 * Math.max(0, c)]; p.fF = [p.fF[0] - 2.6 * s, 1.5 + 2.4 * Math.max(0, -c)]; p.pel = [p.pel[0], p.pel[1] - .5 * Math.abs(c)];
  return { p, move: a.v * dt }; }, { loop: true, blend: .1, noLock: () => true });

// ---- the swordsman (and the duelist): a three-cut string, a thrust, a guard-breaking kick
keyed('e_cut1', [
  k(0, 'io', G0), k(.05, 'io', G0, { ev: 'e:tele', pel: [0, H - 2.8] }),
  k(.3, 'io', { pel: [-1.5, H - 2.4], lean: -.1, head: .12, fN: [5, 3.5], fF: [-4.6, 1.5], elb: 'back', blade: blade([-.5, H + 15], 2.6, 1) }),
  k(.4, 'i', { pel: [-1.8, H - 2.4], lean: -.12, head: .12, fN: [5.5, 3.8], fF: [-4.6, 1.5], elb: 'back', blade: blade([-.8, H + 15.3], 2.65, 1) }),
  k(.46, 'i', { pel: [3, H - 3.6], lean: .35, head: -.05, fN: [12, 4], fF: [-4.6, 1.5], elb: 'back', blade: blade([6, H + 15], 1.6, 1) }),
  k(.5, 'o', { ev: 'e:strike', pel: [6, H - 4.8], lean: .65, head: -.2, fN: [14, 1.5], fF: [-4.6, 1.5], elb: 'down', blade: blade([14, H + 3], -.5, 1) }),
  k(.56, 'ob', { pel: [6.6, H - 5.2], lean: .7, head: -.24, fN: [14, 1.5], fF: [-4.6, 1.5], elb: 'down', blade: blade([11, H - 3], -1.4, 1) }),
  k(.74, 'io', { pel: [6.4, H - 4.4], lean: .55, head: -.15, fN: [14, 1.5], fF: [0, 3], elb: 'down', blade: blade([11.5, H - 2], -1.25, 1) })], { blend: .06 });
// from cut 1's low blade: a rising diagonal, ending high (no return to neutral: its first key is cut 1's last)
keyed('e_cut2', [
  k(0, 'io', { pel: [0, H - 4.4], lean: .55, head: -.15, fN: [7.6, 1.5], fF: [-6.4, 3], elb: 'down', blade: blade([5.1, H - 2], -1.25, 1) }),
  k(.12, 'i', { pel: [-.6, H - 4.8], lean: .6, head: -.1, fN: [7.6, 1.5], fF: [-5, 1.5], elb: 'down', blade: blade([2, H - 4], -2.2, 1) }),
  k(.2, 'o', { ev: 'e:strike', pel: [3, H - 3], lean: .2, head: -.05, fN: [10, 1.5], fF: [-5, 1.5], elb: 'back', blade: blade([9, H + 12], 1.3, 1) }),
  k(.26, 'ob', { pel: [3.6, H - 2.6], lean: .05, head: .02, fN: [10, 1.5], fF: [-5, 1.5], elb: 'back', blade: blade([5, H + 16], 2.3, 1) }),
  k(.46, 'io', { pel: [3.4, H - 2.6], lean: .08, head: .05, fN: [10, 1.5], fF: [-3, 3], elb: 'back', blade: blade([4, H + 15.5], 2.4, 1) })], { blend: .03 });
// from cut 2's high blade: a second wind-up (a second flash), the step-lunge and the heavy chop
keyed('e_cut3', [
  k(0, 'io', { ev: 'e:tele', pel: [0, H - 2.6], lean: .08, head: .05, fN: [6.6, 1.5], fF: [-6.4, 3], elb: 'back', blade: blade([.6, H + 15.5], 2.4, 1) }),
  k(.22, 'i', { pel: [-1.6, H - 2.2], lean: -.15, head: .14, fN: [6, 4], fF: [-6.4, 1.5], elb: 'back', blade: blade([-1.5, H + 15.5], 2.7, 1) }),
  k(.3, 'i', { pel: [4, H - 4], lean: .45, head: -.1, fN: [15, 5], fF: [-6.4, 1.5], elb: 'back', blade: blade([7, H + 16], 1.5, 1) }),
  k(.34, 'o', { ev: 'e:strike', pel: [9, H - 6.4], lean: .8, head: -.25, fN: [18, 1.5], fF: [-4, 2.6], elb: 'down', blade: blade([16, H + 3], -.8, 1) }),
  k(.38, 'o', { pel: [9.6, H - 7.4], lean: .85, head: -.3, fN: [18, 1.5], fF: [-3, 1.5], elb: 'down', blade: blade([15, H - 6], -1.45, 1) }),
  k(.66, 'io', { pel: [9.4, H - 6.8], lean: .78, head: -.24, fN: [18, 1.5], fF: [-3, 1.5], elb: 'down', blade: blade([15, H - 5.8], -1.42, 1) }),
  k(.92, 'io', { pel: [10, H - 2.3], lean: .14, head: .03, fN: [18, 1.5], fF: [4, 1.5], elb: 'back', blade: blade([18.8, H + 4], .55, 1) })], { blend: .03 });
keyed('e_thrust', [
  k(0, 'io', G0), k(.04, 'io', G0, { ev: 'e:tele', pel: [0, H - 2.6] }),
  k(.36, 'io', { pel: [-2.5, H - 3.8], lean: .05, head: .08, fN: [5, 1.5], fF: [-6, 1.5], elb: 'back', blade: blade([-1, H + 6], .05, 1) }),
  k(.46, 'i', { pel: [-2.8, H - 4], lean: .02, head: .08, fN: [5, 1.5], fF: [-6, 1.5], elb: 'back', blade: blade([-1.5, H + 6], .04, 1) }),
  k(.52, 'o', { ev: 'e:strike', pel: [10, H - 5.4], lean: .6, head: -.2, fN: [20, 1.5], fF: [-5, 1.5], elb: 'back', blade: blade([20, H + 5], -.05, 1) }),
  k(.6, 'ob', { pel: [11, H - 5.6], lean: .62, head: -.2, fN: [20, 1.5], fF: [-4, 2], elb: 'back', blade: blade([20.5, H + 4.6], -.08, 1) }),
  k(.92, 'io', { pel: [11.5, H - 2.5], lean: .14, head: .03, fN: [20, 1.5], fF: [6, 1.5], elb: 'back', blade: blade([20.3, H + 4], .55, 1) })], { blend: .06 });
// the guard break: lean back, the knee chambers, the front kick (it cannot be blocked: the orange flash)
keyed('e_kick', [
  k(0, 'io', G0), k(.04, 'io', G0, { ev: 'e:tele' }),
  k(.3, 'io', { pel: [-2, H - 1.6], lean: -.25, head: .15, fN: [4, 8], fF: [-4.6, 1.5], kneeDir: [1, .3], hF: [-3, H + 3], elb: 'back', blade: blade([3, H + 6], 1.2, 0) }),
  k(.4, 'o', { ev: 'e:strike', pel: [1.5, H - 1.4], lean: -.35, head: .12, fN: [17, H - 4], fF: [-4.6, 1.5], kneeDir: [1, .6], hF: [-4, H + 4], elb: 'back', blade: blade([3, H + 5], 1.4, 0) }),
  k(.5, 'ob', { pel: [2, H - 2], lean: -.15, head: .08, fN: [12, 4], fF: [-4.6, 1.5], hF: [-2, H + 3], elb: 'back', blade: blade([4, H + 5], 1.2, 0) }),
  k(.78, 'io', { pel: [3, H - 2.3], lean: .14, head: .03, fN: [9, 1.5], fF: [-4.6, 1.5], elb: 'back', blade: blade([11.8, H + 4], .55, 1) })], { blend: .06 });

// ---- the spearman: the poke (reach), the low sweep (wide, knocks down)
const SPG = { pel: [0, H - 2.8], lean: .18, head: .02, fN: [6, 1.5], fF: [-6, 1.5], elb: 'back', blade: blade([5, H + 5], .1, 1) };
keyed('e_poke', [
  k(0, 'io', SPG), k(.03, 'io', SPG, { ev: 'e:tele' }),
  k(.24, 'io', { pel: [-2, H - 3.2], lean: .08, head: .04, fN: [6, 1.5], fF: [-6, 1.5], elb: 'back', blade: blade([-1, H + 5.5], .12, 1) }),
  k(.3, 'i', { pel: [-2.2, H - 3.3], lean: .07, head: .04, fN: [6, 1.5], fF: [-6, 1.5], elb: 'back', blade: blade([-1.4, H + 5.6], .12, 1) }),
  k(.36, 'o', { ev: 'e:strike', pel: [4, H - 4], lean: .4, head: -.1, fN: [11, 1.5], fF: [-6, 1.5], elb: 'back', blade: blade([14, H + 4.5], .02, 1) }),
  k(.44, 'ob', { pel: [4.4, H - 4], lean: .42, head: -.1, fN: [11, 1.5], fF: [-6, 1.5], elb: 'back', blade: blade([15, H + 4.4], .02, 1) }),
  k(.66, 'io', { pel: [4, H - 2.8], lean: .18, head: .02, fN: [10, 1.5], fF: [-2, 1.5], elb: 'back', blade: blade([9, H + 5], .1, 1) })], { blend: .05 });
keyed('e_sweep', [
  k(0, 'io', SPG), k(.04, 'io', SPG, { ev: 'e:tele' }),
  k(.4, 'io', { pel: [-1.5, H - 2], lean: -.2, head: .1, fN: [6, 3], fF: [-6, 1.5], elb: 'back', blade: blade([-1, H + 10], 2.9, 1) }),
  k(.5, 'i', { pel: [-1.8, H - 2], lean: -.22, head: .1, fN: [6, 3.2], fF: [-6, 1.5], elb: 'back', blade: blade([-1.5, H + 10.5], 3, 1) }),
  k(.58, 'o', { ev: 'e:strike', pel: [3, H - 6], lean: .55, head: -.15, fN: [10, 1.5], fF: [-7, 1.5], elb: 'down', blade: blade([8, H + 1], -.25, 1) }),
  k(.64, 'ob', { pel: [3.4, H - 6.4], lean: .6, head: -.15, fN: [10, 1.5], fF: [-7, 1.5], elb: 'down', blade: blade([7, H], -.45, 1) }),
  k(1, 'io', { pel: [3, H - 2.8], lean: .18, head: .02, fN: [10, 1.5], fF: [-3, 1.5], elb: 'back', blade: blade([8, H + 5], .1, 1) })], { blend: .05 });

// ---- the archer: nock, raise (the aim line appears), the long draw, the release, back to the hold
const AH = { pel: [0, H - 2.2], lean: .12, head: .03, fN: [5, 1.5], fF: [-5, 1.5], hF: [1, H + 1], elb: 'back', blade: blade([5, H + 1], -.8, 0) };
keyed('e_draw', [
  k(0, 'io', AH),
  k(.15, 'io', { pel: [0, H - 2.4], lean: .05, head: 0, fN: [4, 1.5], fF: [-6, 1.5], hF: [6, H + 5], elb: 'back', blade: blade([7, H + 5], -.3, 0) }),
  k(.35, 'io', { ev: 'e:tele', pel: [-.5, H - 2.4], lean: -.02, head: 0, fN: [4, 1.5], fF: [-6, 1.5], hF: [5, H + 8.5], elb: 'back', blade: blade([10, H + 9], 0, 0) }),
  k(1, 'l', { pel: [-1, H - 2.4], lean: -.06, head: -.02, fN: [4, 1.5], fF: [-6, 1.5], hF: [-1, H + 9.5], elb: 'back', blade: blade([10.5, H + 9], 0, 0) }),
  k(1.15, 'o', { ev: 'e:loose', pel: [-1, H - 2.4], lean: -.06, head: -.02, fN: [4, 1.5], fF: [-6, 1.5], hF: [-1, H + 9.5], elb: 'back', blade: blade([10.5, H + 9], 0, 0) }),
  k(1.2, 'o', { pel: [-1.6, H - 2.2], lean: -.1, head: -.02, fN: [4, 1.5], fF: [-6, 1.5], hF: [-4, H + 10], elb: 'back', blade: blade([10, H + 9.5], .08, 0) }),
  k(1.5, 'io', AH)], { blend: .06 });

// ---- the heavy: the kanabō's long wind-ups; the swing, the overhead ground slam (super armour through both)
const HH = { pel: [0, H - 2.6], lean: .1, head: .04, fN: [6, 1.5], fF: [-6, 1.5], elb: 'back', blade: blade([3, H + 11], 2.4, 1) };
keyed('e_kswing', [
  k(0, 'io', HH), k(.04, 'io', HH, { ev: 'e:tele' }),
  k(.6, 'io', { pel: [-3, H - 3.2], lean: -.25, head: .15, fN: [6, 3], fF: [-7, 1.5], elb: 'back', blade: blade([-3, H + 10], 2.9, 1) }),
  k(.72, 'i', { pel: [-3.2, H - 3.3], lean: -.27, head: .15, fN: [6, 3], fF: [-7, 1.5], elb: 'back', blade: blade([-3.4, H + 10], 2.95, 1) }),
  k(.84, 'o', { ev: 'e:strike', pel: [5, H - 5], lean: .45, head: -.1, fN: [14, 1.5], fF: [-6, 1.5], elb: 'back', blade: blade([12, H + 6], .15, 1) }),
  k(.92, 'ob', { pel: [6, H - 5.4], lean: .55, head: -.12, fN: [14, 1.5], fF: [-6, 1.5], elb: 'back', blade: blade([11, H + 3], -.35, 1) }),
  k(1.4, 'io', { pel: [6, H - 3], lean: .2, head: .04, fN: [14, 1.5], fF: [-1, 1.5], elb: 'back', blade: blade([9, H + 11], 2.4, 1) })], { blend: .08 });
keyed('e_kslam', [
  k(0, 'io', HH), k(.04, 'io', HH, { ev: 'e:tele' }),
  k(.7, 'io', { pel: [-1, H - 1.6], lean: -.3, head: .2, fN: [7, 4], fF: [-6, 1.5], elb: 'back', blade: blade([0, H + 17], 1.8, 1) }),
  k(.9, 'i', { pel: [-1.2, H - 1.4], lean: -.32, head: .2, fN: [7.5, 4.2], fF: [-6, 1.5], elb: 'back', blade: blade([-.5, H + 17.5], 1.9, 1) }),
  k(1, 'o', { ev: 'e:slam', pel: [6, H - 7], lean: .85, head: -.3, fN: [14, 1.5], fF: [-6, 1.5], elb: 'down', blade: blade([14, H - 2], -1, 1) }),
  k(1.08, 'ob', { pel: [6.4, H - 7.6], lean: .9, head: -.32, fN: [14, 1.5], fF: [-6, 1.5], elb: 'down', blade: blade([14, H - 4], -1.25, 1) }),
  k(1.7, 'io', { pel: [6.4, H - 6.8], lean: .82, head: -.26, fN: [14, 1.5], fF: [-6, 1.5], elb: 'down', blade: blade([14, H - 3.6], -1.2, 1) }),
  k(2.1, 'io', { pel: [6, H - 2.6], lean: .1, head: .04, fN: [14, 1.5], fF: [0, 1.5], elb: 'back', blade: blade([9, H + 11], 2.4, 1) })], { blend: .08 });

// ---- the shinobi: the low dash-cut, the shuriken throw, the smoke vanish and the leap out of it
const NH = { pel: [0, H - 4], lean: .35, head: -.1, fN: [6, 1.5], fF: [-6, 1.5], hF: [9, H + 3], elb: 'back', blade: blade([7, H + 1], -.5, 0, { vis: 9 }) };
const tb = (g, ang) => blade(g, ang, 0, { vis: 9 });
keyed('e_dash', [
  k(0, 'io', NH), k(.03, 'io', NH, { ev: 'e:tele' }),
  k(.2, 'i', { pel: [-2, H - 6], lean: .55, head: -.2, fN: [6, 1.5], fF: [-8, 1.5], hF: [4, H], elb: 'back', blade: tb([2, H], -2.4) }),
  k(.3, 'o', { pel: [18, H - 5], lean: .7, head: -.25, fN: [28, 3], fF: [8, 4], hF: [20, H], elb: 'back', blade: tb([26, H + 3], .3) }),
  k(.34, 'o', { ev: 'e:strike', pel: [26, H - 6], lean: .65, head: -.2, fN: [34, 1.5], fF: [14, 1.5], hF: [24, H - 1], elb: 'back', blade: tb([32, H + 6], 1.3) }),
  k(.42, 'ob', { pel: [28, H - 6.4], lean: .5, head: -.15, fN: [34, 1.5], fF: [20, 1.5], hF: [26, H - 1], elb: 'back', blade: tb([31, H + 8], 1.9) }),
  k(.7, 'io', { pel: [28, H - 4], lean: .35, head: -.1, fN: [34, 1.5], fF: [22, 1.5], hF: [37, H + 3], elb: 'back', blade: tb([35, H + 1], -.5) })], { blend: .04, noLock: a => a.ct > .18 && a.ct < .36 });
keyed('e_throw', [
  k(0, 'io', NH), k(.03, 'io', NH, { ev: 'e:tele' }),
  k(.22, 'io', { pel: [-1, H - 3.5], lean: -.1, head: .05, fN: [6, 1.5], fF: [-6, 1.5], hF: [-4, H + 9], elb: 'back', blade: tb([5, H + 1], -.5) }),
  k(.3, 'o', { ev: 'e:throw', pel: [2, H - 4.4], lean: .45, head: -.15, fN: [7, 1.5], fF: [-6, 1.5], hF: [13, H + 6], elb: 'back', blade: tb([6, H], -.6) }),
  k(.55, 'io', { pel: [1.6, H - 4], lean: .35, head: -.1, fN: [7.6, 1.5], fF: [-4.4, 1.5], hF: [10.6, H + 3], elb: 'back', blade: tb([8.6, H + 1], -.5) })], { blend: .05 });
keyed('e_vanish', [
  k(0, 'io', NH),
  k(.12, 'i', { pel: [-1, H - 8], lean: .7, head: -.2, fN: [6, 1.5], fF: [-6, 1.5], hF: [8, 2], elb: 'down', blade: tb([4, H - 3], -1) }),
  k(.15, 'o', { ev: 'e:smoke', pel: [-1, H - 8.4], lean: .74, head: -.22, fN: [6, 1.5], fF: [-6, 1.5], hF: [8, 1.5], elb: 'down', blade: tb([4, H - 3], -1) }),
  k(.4, 'io', { pel: [-1, H - 8], lean: .7, head: -.2, fN: [6, 1.5], fF: [-6, 1.5], hF: [8, 2], elb: 'down', blade: tb([4, H - 3], -1) })], { blend: .04 });
keyed('e_ambush', [
  k(0, 'o', { ev: 'e:appear', pel: [0, H - 7], lean: .5, head: -.2, fN: [5, 1.5], fF: [-5, 1.5], hF: [5, 4], elb: 'down', blade: tb([4, H - 2], -1.2) }),
  k(.06, 'o', { ev: 'e:tele', pel: [0, H - 7.4], lean: .55, head: -.2, fN: [5, 1.5], fF: [-5, 1.5], hF: [5, 3], elb: 'down', blade: tb([4, H - 2.5], -1.2) }),
  k(.22, 'o', { pel: [8, H + 6], lean: .3, head: -.1, fN: [12, 10], fF: [2, 8], hF: [12, H + 10], elb: 'back', blade: tb([10, H + 14], 2.2) }),
  k(.32, 'i', { pel: [12, H + 4], lean: .4, head: -.15, fN: [17, 7], fF: [6, 6], hF: [16, H + 9], elb: 'back', blade: tb([13, H + 15], 2.4) }),
  k(.38, 'o', { ev: 'e:strike', pel: [16, H - 6], lean: .8, head: -.25, fN: [22, 1.5], fF: [8, 1.5], hF: [20, H - 2], elb: 'down', blade: tb([24, H - 1], -.9) }),
  k(.72, 'io', { pel: [16, H - 4], lean: .35, head: -.1, fN: [22, 1.5], fF: [10, 1.5], hF: [25, H + 3], elb: 'back', blade: tb([23, H + 1], -.5) })], { blend: 0, noLock: a => a.ct < .37 });

// ---- the duelist: the flash-step cut from a low back guard, a three-cut flurry, the parry and its riposte, the phase roar
keyed('e_iai', [
  k(0, 'io', G0), k(.04, 'io', G0, { ev: 'e:tele' }),
  k(.3, 'i', { pel: [-1.4, H - 5], lean: .55, head: -.28, fN: [6, 1.5], fF: [-7, 1.5], hF: [1, H - 3.2], elb: 'back', blade: blade([1, H - 1], -2.6, 0) }),
  k(.38, 'i', { pel: [26, H - 5], lean: .72, head: -.26, fN: [36, 3], fF: [14, 1.5], hF: [27, H - 3.6], elb: 'back', blade: blade([34, H + 1.5], -2.2, 0) }),
  k(.42, 'o', { ev: 'e:strike', pel: [36, H - 6.4], lean: .78, head: -.3, fN: [44, 1.5], fF: [22, 2.6], hF: [32, H - 3], elb: 'back', blade: blade([46, H + 5], .1, 0) }),
  k(.47, 'o', { pel: [37, H - 6], lean: .6, head: -.24, fN: [44, 1.5], fF: [26, 1.5], elb: 'back', blade: blade([43.5, H + 13], 1.5, 0) }),
  k(.58, 'ob', { pel: [37.6, H - 5.2], lean: .42, head: -.1, fN: [44, 1.5], fF: [26, 1.5], elb: 'back', blade: blade([41, H + 15], 2.1, 1) }),
  k(.95, 'io', { pel: [38, H - 2.4], lean: .14, head: .03, fN: [44, 1.5], fF: [32, 1.5], elb: 'back', blade: blade([46.8, H + 4], .55, 1) })], { blend: .05, noLock: a => a.ct > .28 && a.ct < .45 });
keyed('e_flurry', [
  k(0, 'io', G0), k(.03, 'io', G0, { ev: 'e:tele' }),
  k(.12, 'i', { pel: [-1, H - 3], lean: .3, head: -.05, fN: [5.5, 1.5], fF: [-5, 1.5], elb: 'down', blade: blade([2, H - 3], -2.3, 1) }),
  k(.18, 'o', { ev: 'e:strike', pel: [3, H - 3], lean: .25, head: -.05, fN: [9, 1.5], fF: [-5, 1.5], elb: 'back', blade: blade([9, H + 12], 1.3, 1) }),
  k(.3, 'i', { pel: [2.6, H - 2.4], lean: .02, head: .08, fN: [9, 1.5], fF: [-4, 1.5], elb: 'back', blade: blade([2, H + 15.5], 2.6, 1) }),
  k(.36, 'o', { ev: 'e:strike', pel: [6, H - 4.8], lean: .65, head: -.2, fN: [13, 1.5], fF: [-4, 1.5], elb: 'down', blade: blade([14, H + 3], -.5, 1) }),
  k(.48, 'i', { pel: [4, H - 4.6], lean: .3, head: -.04, fN: [13, 1.5], fF: [-3, 1.5], elb: 'back', blade: blade([3, H + 6], .05, 1) }),
  k(.56, 'o', { ev: 'e:strike', pel: [13, H - 5.4], lean: .6, head: -.2, fN: [22, 1.5], fF: [-3, 1.5], elb: 'back', blade: blade([23, H + 5], -.05, 1) }),
  k(.66, 'ob', { pel: [14, H - 5.6], lean: .62, head: -.2, fN: [22, 1.5], fF: [-2, 2], elb: 'back', blade: blade([23.5, H + 4.6], -.08, 1) }),
  k(1, 'io', { pel: [14.5, H - 2.5], lean: .14, head: .03, fN: [22, 1.5], fF: [8, 1.5], elb: 'back', blade: blade([23.3, H + 4], .55, 1) })], { blend: .04 });
// the parry stance: the blade turned up across his front, a hair from moving (the window; a white glint on the edge)
proc('e_parryStance', (a, t) => { const q = clamp(t / .06, 0, 1);
  return { p: { ...G0, pel: [-.5 * q, H - 3 - .3 * q], lean: .05, head: .06, fN: [5.5, 1.5], fF: [-5.6, 1.5], blade: blade([7, H + 7 + Math.sin(t * 40) * .15], 1.25, 1) } }; }, { loop: true, blend: .03 });
keyed('e_parry', [
  k(0, 'o', { pel: [-.5, H - 3.3], lean: .05, head: .06, fN: [5.5, 1.5], fF: [-5.6, 1.5], elb: 'back', blade: blade([7, H + 7], 1.25, 1) }),
  k(.05, 'o', { pel: [-2, H - 3], lean: -.12, head: .1, fN: [5.5, 1.5], fF: [-6, 1.5], elb: 'back', blade: blade([8, H + 12], 1.95, 1) }),
  k(.16, 'io', { pel: [-1.8, H - 3.2], lean: -.05, head: .06, fN: [5.5, 1.5], fF: [-6, 1.5], elb: 'back', blade: blade([6, H + 14], 2.3, 1) })], { blend: .02 });
keyed('e_riposte', [
  k(0, 'i', { pel: [0, H - 3.2], lean: -.05, head: .06, fN: [7.3, 1.5], fF: [-4.2, 1.5], elb: 'back', blade: blade([7.8, H + 14], 2.3, 1) }),
  k(.12, 'o', { ev: 'e:strike', pel: [6, H - 5], lean: .7, head: -.2, fN: [14, 1.5], fF: [-4, 1.5], elb: 'down', blade: blade([15, H + 2], -.6, 1) }),
  k(.18, 'ob', { pel: [6.6, H - 5.4], lean: .72, head: -.22, fN: [14, 1.5], fF: [-4, 1.5], elb: 'down', blade: blade([12, H - 3], -1.4, 1) }),
  k(.56, 'io', { pel: [7, H - 2.3], lean: .14, head: .03, fN: [14, 1.5], fF: [2, 1.5], elb: 'back', blade: blade([15.8, H + 4], .55, 1) })], { blend: .02 });
keyed('e_phase', [
  k(0, 'o', G0),
  k(.2, 'io', { pel: [-2, H - 1.8], lean: -.4, head: .4, fN: [5.5, 1.5], fF: [-6, 1.5], hF: [-3, H + 10], elb: 'back', blade: blade([2, H + 12], 2.9, 0) }),
  k(.3, 'o', { ev: 'e:phase', pel: [1, H - 5.5], lean: .45, head: -.1, fN: [7, 1.5], fF: [-7, 1.5], hF: [6, H - 2], elb: 'back', blade: blade([11, H - 1], -.9, 0) }),
  k(.9, 'io', { pel: [1, H - 5], lean: .4, head: -.08, fN: [7, 1.5], fF: [-7, 1.5], hF: [6, H - 2], elb: 'back', blade: blade([11, H - 1], -.9, 0) }),
  k(1.15, 'io', { ...G0, pel: [1, H - 2.3], fN: [6.5, 1.5], fF: [-3.6, 1.5], blade: blade([9.8, H + 4], .55, 1) })], { blend: .04 });

// ---- shared: the block, a blow taken on it, the guard broken, the hop (a dodge, any way, by a.mh)
proc('e_block', (a, t) => { const p = holdOf(a), q = clamp(t / .07, 0, 1);
  return { p: { ...p, pel: [p.pel[0] - .8 * q, p.pel[1] - .6 * q], lean: .02, head: .08, blade: blade([8.5, H + 7.5 + Math.sin(t * 30) * .1], 1.45, 1) } }; }, { loop: true, blend: .03 });
keyed('e_blockHit', [
  k(0, 'o', { pel: [0, H - 2.9], lean: .02, head: .08, fN: [5.5, 1.5], fF: [-4.6, 1.5], elb: 'back', blade: blade([8.5, H + 7.5], 1.45, 1) }),
  k(.05, 'o', { pel: [-3.5, H - 3.4], lean: -.2, head: .2, fN: [4, 2.5], fF: [-4.6, 1.5], elb: 'back', blade: blade([5, H + 9], 1.75, 1) }),
  k(.28, 'io', { pel: [-4, H - 2.9], lean: .02, head: .08, fN: [1.5, 1.5], fF: [-8.6, 1.5], elb: 'back', blade: blade([4.5, H + 7.5], 1.45, 1) })], { blend: .02 });
keyed('e_broken', [
  k(0, 'o', { pel: [0, H - 2.9], lean: .02, head: .08, fN: [5.5, 1.5], fF: [-4.6, 1.5], elb: 'back', blade: blade([8.5, H + 7.5], 1.45, 1) }),
  k(.06, 'o', { pel: [-4, H - 2.4], lean: -.55, head: .55, fN: [5.5, 3], fF: [-4.6, 1.5], hF: [-6, H + 6], elb: 'back', blade: blade([1, H + 14], 2.9, 0) }),
  k(.3, 'io', { pel: [-9, H - 3.8], lean: -.35, head: .4, fN: [-1, 1.5], fF: [-13, 1.5], hF: [-12, H + 4], elb: 'back', blade: blade([-5, H + 12], 2.6, 0) }),
  k(.6, 'io', { pel: [-10, H - 4.6], lean: -.1, head: .25, fN: [-4, 3], fF: [-13, 1.5], hF: [-10, H + 2], elb: 'back', blade: blade([-4, H + 9], 2, 0) }),
  k(.95, 'io', { pel: [-10.5, H - 3], lean: .12, head: .04, fN: [-5, 1.5], fF: [-14, 1.5], elb: 'back', blade: blade([-1.7, H + 4], .55, 1) })], { blend: .02 });
keyed('e_hop', [
  k(0, 'o', { pel: [0, H - 3], lean: .2, head: 0, fN: [5, 1.5], fF: [-5, 1.5], elb: 'back', blade: blade([7, H + 4], .55, 1) }),
  k(.06, 'o', { pel: [0, H - 5.5], lean: .3, head: -.05, fN: [5, 1.5], fF: [-5, 1.5], elb: 'back', blade: blade([6, H + 3], .5, 1) }),
  k(.2, 'o', { pel: [14, H + 1], lean: .05, head: .05, fN: [18, 6], fF: [10, 5], elb: 'back', blade: blade([20, H + 7], .7, 1) }),
  k(.3, 'o', { pel: [22, H - 5], lean: .3, head: -.05, fN: [27, 1.5], fF: [17, 1.5], elb: 'back', blade: blade([28, H + 3], .5, 1) }),
  k(.44, 'io', { pel: [22, H - 2.6], lean: .15, head: .03, fN: [27, 1.5], fF: [17, 1.5], elb: 'back', blade: blade([30, H + 4], .55, 1) })], { blend: .03, noLock: a => a.ct < .3 });

// what each blow covers, from his root at the blow (rig px): a point (fwd, rad), an arc (arc half-angle, reach) or a
// ring (centre fwd, rad); t the blow's time in its clip (the flurry has three), commit the tracking cut-off before it;
// w 2 knocks the hero down; unblock = the orange flash; ff = it hits his own side too
export const HITS = {
  e_cut1: { t: .5, fwd: 18, rad: 16 }, e_cut2: { t: .2, fwd: 18, rad: 16 }, e_cut3: { t: .34, fwd: 16, rad: 18, w: 2, dmg: 2 },
  e_thrust: { t: .52, fwd: 24, rad: 11 }, e_kick: { t: .4, fwd: 14, rad: 12, w: 2, unblock: 1 },
  e_poke: { t: .36, fwd: 36, rad: 10 }, e_sweep: { t: .58, arc: 1.4, reach: 50, w: 2, unblock: 1 },
  e_draw: { t: 1.15, commit: .2, shot: 'arrow' }, e_kswing: { t: .84, arc: 1.1, reach: 52, w: 2, dmg: 2, ff: 1, commit: .24 },
  e_kslam: { t: 1, ring: [24, 32], w: 2, dmg: 3, unblock: 1, ff: 1, commit: .3 },
  e_dash: { t: .34, fwd: 10, rad: 14, commit: .14 }, e_throw: { t: .3, shot: 'star' }, e_ambush: { t: .38, fwd: 10, rad: 15, w: 2, commit: .2 },
  e_iai: { t: .42, fwd: 8, rad: 16, dmg: 2, commit: .14 }, e_flurry: { t: [.18, .36, .56], fwd: 18, rad: 16 }, e_riposte: { t: .12, fwd: 18, rad: 16, w: 2, dmg: 2, commit: .06 },
};
export const hitTimes = c => { const h = HITS[c]; return !h ? [] : Array.isArray(h.t) ? h.t : [h.t]; };
