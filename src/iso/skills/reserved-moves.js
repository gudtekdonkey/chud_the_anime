// ---- The new skills' moves (F counter, R Blade Recall, Q Lightning Chain, X Time Slice), and the samurai's thrust.
// ADDITIONS, not the Animation Flow page's: built in its language (keyed side poses, the same rig, the same easing),
// from the prototypes' key poses (prototypes/18-skills-ideas.html, 23-counters.html), as moves-extra.js adds runArmed.
import { keyed, proc, H, TAU, lerp, clamp, EZ } from 'ronin-engine/flow/flow.js';
import { SH, blade } from 'ronin-engine/flow/moves.js';
import { ATTACKS } from '../play/foe.js';

// the katana away from him (thrown, or hanging in the air): no blade in the hand or the saya (look/three/rig.js hides it)
export const AWAY = { out: 0, away: 1, g: [4.8, H + .4], ang: .5, two: 0 };
const G = [8.8, H + 4], GA = .55;                                   // the guard's grip and angle (moves.js guard)
const guardKey = (t, pel0 = 0) => ({ t, e: 'io', pel: [pel0, H - 2.3], lean: .14, head: .03, fN: [pel0 + 5.5, 1.5], fF: [pel0 - 4.6, 1.5], elb: 'back', blade: blade([pel0 + G[0], G[1]], GA, 1) });

// ---- F, the counter (prototype 23): the stance, the block, and one answer per attack ----
// the stance: blade in the back of his hand, point down behind him, lead shoulder to the enemy; held while the window is up
keyed('cStance', [
  { t: 0, e: 'o', pel: [0, H - 2.6], lean: .12, head: .04, fN: [6, 1.5], fF: [-5.4, 1.5], hF: [6, H + 2.4], elb: 'back', blade: blade([3.2, H + 2.4], -2.2, 0) },
  { t: .07, e: 'io', pel: [-1, H - 3.5], lean: -.06, head: .1, fN: [6.6, 1.5], fF: [-6.6, 1.5], hF: [7.4, H + 4], elb: 'back', blade: blade([1.4, H + 1.2], -2.45, 0) },
  { t: .4, e: 'io', pel: [-1.2, H - 3.8], lean: -.04, head: .1, fN: [6.6, 1.5], fF: [-6.6, 1.5], hF: [7.2, H + 3.6], elb: 'back', blade: blade([1.2, H + 1], -2.5, 0) },
  { t: .6, e: 'io', pel: [-1, H - 3.4], lean: -.02, head: .08, fN: [6.6, 1.5], fF: [-6.6, 1.5], hF: [7, H + 3.4], elb: 'back', blade: blade([1.4, H + 1.2], -2.45, 0) }],
  { blend: .04, next: 'guard' });
// too early: only a block. The blade comes up crosswise, the blow lands on it and pushes him back a step
keyed('cBlock', [
  { t: 0, e: 'o', pel: [-1, H - 3.5], lean: -.06, head: .1, fN: [6.6, 1.5], fF: [-6.6, 1.5], hF: [7, H + 6], elb: 'back', blade: blade([5, H + 11], 2.75, 1) },
  { t: .05, e: 'o', pel: [-6, H - 3.6], lean: -.26, head: .22, fN: [3, 1.5], fF: [-9.5, 1.5], elb: 'back', blade: blade([3, H + 12], 2.8, 1) },
  { t: .3, e: 'io', pel: [-8.5, H - 3], lean: -.08, head: .1, fN: [-1.5, 1.5], fF: [-12, 1.5], elb: 'back', blade: blade([1.5, H + 8], 1.4, 1) },
  { t: .55, ...guardKey(.55, -8), e: 'io' }], { blend: .02, next: 'guard' });
// the overhead / falling cut → receive and flow: the blade over his head like a roof, the blow slides off past his
// shoulder, his blade rolls over the top and comes down diagonally into the back of the bent neck
keyed('cFlow', [
  { t: 0, e: 'o', ev: 'parry', pel: [-1, H - 3], lean: -.08, head: .12, fN: [6, 1.5], fF: [-6, 1.5], hF: [4, H + 13], elb: 'back', blade: blade([3, H + 13.5], 2.8, 1) },
  { t: .09, e: 'i', pel: [-1.6, H - 3.3], lean: -.14, head: .14, fN: [6, 1.5], fF: [-6.4, 1.5], elb: 'back', blade: blade([2, H + 14.5], 2.98, 1) },
  { t: .14, e: 'i', pel: [1.2, H - 3.8], lean: .22, head: -.04, fN: [8, 3.5], fF: [-6.4, 1.5], elb: 'back', blade: blade([5, H + 15], 1.6, 1) },
  { t: .19, e: 'o', ev: 'chit', pel: [5, H - 5.2], lean: .62, head: -.22, fN: [13, 1.5], fF: [-5, 1.5], elb: 'down', blade: blade([13, H + 3], -.7, 1) },
  { t: .25, e: 'ob', pel: [6, H - 5.6], lean: .7, head: -.26, fN: [13, 1.5], fF: [-4.6, 1.5], elb: 'down', blade: blade([12, H - 3], -1.38, 1) },
  { t: .5, e: 'io', pel: [6, H - 5.2], lean: .62, head: -.2, fN: [13, 1.5], fF: [-4.6, 1.5], elb: 'down', blade: blade([12.2, H - 2.6], -1.34, 1) },
  { t: .78, ...guardKey(.78, 6), e: 'io' }], { blend: .02, next: 'guard' });
// the thrust → along the blade: he turns it aside with a small circle and slides down the samurai's own blade into his chest
keyed('cAlong', [
  { t: 0, e: 'o', ev: 'parry', pel: [-1.4, H - 3.6], lean: .02, head: .08, fN: [6, 1.5], fF: [-6.6, 1.5], elb: 'back', blade: blade([9, H + 7], .35, 1) },
  { t: .08, e: 'i', pel: [1.5, H - 4], lean: .3, head: -.08, fN: [9, 3.5], fF: [-6.6, 1.5], elb: 'back', blade: blade([11, H + 7.5], .12, 1) },
  { t: .16, e: 'o', ev: 'chit', pel: [8, H - 5], lean: .58, head: -.2, fN: [15, 1.5], fF: [-5, 1.5], elb: 'back', blade: blade([18, H + 6], .02, 1) },
  { t: .34, e: 'io', pel: [8.4, H - 5], lean: .55, head: -.18, fN: [15, 1.5], fF: [-5, 1.5], elb: 'back', blade: blade([18.4, H + 6], .02, 1) },
  { t: .46, e: 'o', pel: [7, H - 4], lean: .3, head: -.08, fN: [15, 1.5], fF: [-4, 1.5], elb: 'back', blade: blade([12, H + 5.5], .3, 1) },
  { t: .74, ...guardKey(.74, 7), e: 'io' }], { blend: .02, next: 'guard' });
// which answer meets which attack (prototype 23 has fourteen; the slice's samurai has two)
export const ANSWER = { fcut: 'cFlow', thrust: 'cAlong' };

// the samurai's thrust: the blade drawn back to the hip, point forward (the tell), a long step and the thrust
keyed('thrust', [
  { t: 0, ...guardKey(0), e: 'io' },
  { t: .3, e: 'io', ev: 'tele', pel: [-2, H - 3.2], lean: -.04, head: .08, fN: [5, 3.2], fF: [-4.6, 1.5], elb: 'back', blade: blade([2.4, H + 5.5], .06, 1) },
  { t: .42, e: 'i', pel: [-2.3, H - 3.3], lean: -.05, head: .08, fN: [5.4, 3.4], fF: [-4.6, 1.5], elb: 'back', blade: blade([2.2, H + 5.4], .05, 1) },
  { t: .47, e: 'i', pel: [3, H - 3.8], lean: .3, head: -.04, fN: [12, 4], fF: [-4.6, 1.5], elb: 'back', blade: blade([9, H + 6], .02, 1) },
  { t: .5, e: 'o', ev: 'strike', pel: [9, H - 4.6], lean: .52, head: -.16, fN: [17, 1.5], fF: [-4.6, 1.5], elb: 'back', blade: blade([16.5, H + 6.5], 0, 1) },
  { t: .62, e: 'ob', pel: [9.6, H - 4.8], lean: .55, head: -.18, fN: [17, 1.5], fF: [-4, 1.5], elb: 'back', blade: blade([17, H + 6.2], .02, 1) },
  { t: .9, e: 'io', pel: [9, H - 3], lean: .25, head: -.04, fN: [17, 1.5], fF: [3, 3], elb: 'back', blade: blade([15, H + 5], .3, 1) },
  { t: 1.15, ...guardKey(1.15, 9), e: 'io' }], { blend: .05, next: 'guard', reach: 22 });
ATTACKS.push('thrust');

// ---- R, Blade Recall (prototype 18; the owner: it never spins) ----
// the throw: drawn back over the shoulder, then thrown point-first; his hand opens on 'release'
keyed('rThrow', [
  { t: 0, e: 'io', pel: [0, H - 2.6], lean: .14, head: .03, fN: [5.6, 1.5], fF: [-5, 1.5], hF: [5.4, H + 2], elb: 'back', blade: blade([6, H + 4], .6, 0) },
  { t: .1, e: 'i', pel: [-2, H - 2.4], lean: -.2, head: .12, fN: [6, 3.5], fF: [-5.4, 1.5], hF: [6.4, H + 3], elb: 'back', blade: blade([-3, H + 10], 2.75, 0) },
  { t: .16, e: 'o', ev: 'release', pel: [3, H - 3.6], lean: .55, head: -.2, fN: [12, 1.5], fF: [-5.4, 1.5], hN: [13, H + 9], hF: [-2, H], elb: 'back', blade: AWAY },
  { t: .4, e: 'io', pel: [3.5, H - 3.2], lean: .4, head: -.12, fN: [12, 1.5], fF: [-5, 1.5], hN: [10, H + 6], hF: [-1, H + 1], elb: 'back', blade: AWAY },
  { t: .7, e: 'io', pel: [3.6, H - 2.4], lean: .12, head: .04, fN: [12, 1.5], fF: [-1, 1.5], hN: [6, H + 1.5], hF: [5.2, H + 1.6], elb: 'back', blade: AWAY }],
  { blend: .04, next: 'idle' });
// the call (home to the sheath): one hand on the empty saya's mouth, the other open toward the blade, braced
proc('rCall', (a, t) => { const b = Math.sin(t * TAU / 1.4);
  return { p: { pel: [-1, H - 3 - .2 * b], lean: -.08, head: .08, fN: [6, 1.5], fF: [-6, 1.5], hN: [4.4, H - .4], hF: [10, H + 5 + .3 * b], elb: 'back', sayaTilt: .2, blade: AWAY } }; }, { loop: true, blend: .06 });
// home: the blade slides into the saya with the click; his hand comes off the hilt
keyed('rHome', [
  { t: 0, e: 'o', ev: 'click', pel: [-1.6, H - 3.4], lean: -.12, head: .1, fN: [6, 1.5], fF: [-6.4, 1.5], hN: [4.4, H - .4], hF: [9, H + 4], elb: 'back', sayaTilt: .3, blade: SH },
  { t: .3, e: 'io', pel: [-.4, H - 2.6], lean: .1, head: .06, fN: [6, 1.5], fF: [-6, 1.5], hN: [2, H - 1.4], hF: [5.4, H + 1.6], elb: 'back', blade: SH }], { blend: .02, next: 'idle' });
// the catch: side on, the hand open where it will pass
proc('rReach', (a, t) => ({ p: { pel: [-.6, H - 3.2], lean: -.14, head: .1, fN: [6, 1.5], fF: [-6.2, 1.5], hN: [9, H + 6], hF: [3, H + 1], elb: 'back', blade: AWAY } }), { loop: true, blend: .05 });
// caught: its weight swings his arm back and slides him a step, then the flick (chiburi) and into the sheathe
keyed('rCaught', [
  { t: 0, e: 'o', ev: 'catch', pel: [-.6, H - 3.2], lean: -.14, head: .1, fN: [6, 1.5], fF: [-6.2, 1.5], hF: [3, H + 1], elb: 'back', blade: blade([9, H + 6], 3.0, 0) },
  { t: .1, e: 'o', pel: [-5, H - 3.4], lean: -.3, head: .16, fN: [2, 1.5], fF: [-9, 1.5], hF: [-1, H + 2], elb: 'back', blade: blade([-2, H + 7], 2.95, 0) },
  { t: .3, e: 'io', pel: [-5, H - 3], lean: .05, head: .06, fN: [2, 1.5], fF: [-9, 1.5], hF: [0, H + 2], elb: 'back', blade: blade([2, H + 9], 2.2, 0) },
  { t: .42, e: 'o', pel: [-4.4, H - 3.4], lean: .2, head: -.02, fN: [2, 1.5], fF: [-9, 1.5], elb: 'back', blade: blade([6.2, H + 1], -1.3, 0) },
  { t: .62, e: 'io', ...guardKey(.62, -4.6) }], { blend: .02, next: 'sheathe' });
// the anchor (hold R): he goes to the blade, a flash along the thread; arrives with the grip in hand, the blade over his
// shoulder pointing back at them, does not turn round
keyed('rAnchor', [
  { t: 0, e: 'l', pel: [2, H - 4.4], lean: .72, head: -.26, fN: [12, 4], fF: [-6, 3], hN: [12, H + 4], hF: [-3, H + 1], elb: 'back', blade: AWAY },
  { t: .14, e: 'o', ev: 'catch', pel: [3, H - 4.8], lean: .5, head: -.16, fN: [11, 1.5], fF: [-5, 1.5], hF: [5, H + 1], elb: 'back', blade: blade([7, H + 10], 2.7, 0) },
  { t: .55, e: 'io', pel: [3, H - 4], lean: .4, head: -.1, fN: [11, 1.5], fF: [-5, 1.5], hF: [5, H + 1], elb: 'back', blade: blade([7, H + 10.4], 2.68, 0) },
  { t: .7, e: 'o', pel: [3.4, H - 3.6], lean: .24, head: -.04, fN: [11, 1.5], fF: [-5, 1.5], elb: 'back', blade: blade([9.4, H + 1], -1.3, 0) },
  { t: .9, e: 'io', ...guardKey(.9, 3.2) }], { blend: .02, next: 'sheathe' });

// ---- Q, Lightning Chain (prototype 18): the free hand drawn back and thrown open, the chain hooks, the yank; then the
// draw-cut he meets the dragged man with (J1's iai draw, its hit as 'qhit') ----
const castKeys = bl => [
  { t: 0, e: 'io', pel: [0, H - 2.6], lean: .14, head: .03, fN: [5.6, 1.5], fF: [-5, 1.5], hN: bl.out ? bl.g : [4.8, H + .4], hF: [4, H + 2], elb: 'back', blade: bl },
  { t: .1, e: 'i', pel: [-1.5, H - 2.8], lean: -.1, head: .1, fN: [6, 3], fF: [-5.4, 1.5], hN: bl.out ? bl.g : [4.8, H + .4], hF: [-4, H + 4], elb: 'back', blade: bl },
  { t: .17, e: 'o', ev: 'cast', pel: [3, H - 3.6], lean: .45, head: -.15, fN: [11, 1.5], fF: [-5.4, 1.5], hN: bl.out ? bl.g : [4.8, H + .4], hF: [14, H + 5], elb: 'back', blade: bl },
  { t: .5, e: 'io', pel: [3.2, H - 3.4], lean: .4, head: -.12, fN: [11, 1.5], fF: [-5.4, 1.5], hN: bl.out ? bl.g : [4.8, H + .4], hF: [14.4, H + 5.2], elb: 'back', blade: bl }];
const LOW = blade([4, H + 1], -2.3, 0);   // blade out: carried low in the near hand while the free hand casts
keyed('qCast', castKeys(SH), { blend: .04 });
keyed('qCastA', castKeys(LOW), { blend: .04 });
// the yank: lean back and pull up; the draw-cut follows as he arrives
keyed('qYank', [
  { t: 0, e: 'o', pel: [3.2, H - 3.4], lean: .4, head: -.12, fN: [11, 1.5], fF: [-5.4, 1.5], hN: [4.8, H + .4], hF: [14.4, H + 5.2], elb: 'back', blade: SH },
  { t: .09, e: 'o', ev: 'yank', pel: [-2, H - 4.2], lean: -.32, head: .16, fN: [6, 3], fF: [-6, 1.5], hN: [4.1, H - 1.3], hF: [1, H + 9], elb: 'back', blade: SH, sayaTilt: .2 },
  { t: .14, e: 'io', pel: [-2.2, H - 4.2], lean: -.3, head: .14, fN: [6, 1.5], fF: [-6, 1.5], hN: [4.1, H - 1.3], hF: [1.5, H + 8], elb: 'back', blade: SH, sayaTilt: .2 }], { blend: .02 });
// the draw-cut: J1's keys from its draw on (anim/moves.js), its hit renamed so the chain's rules land it
keyed('qCut', [
  { t: 0, e: 'i', pel: [-1.2, H - 4.2], lean: .5, head: -.28, fN: [5.6, 1.5], fF: [-5.8, 1.5], hN: [4.1, H - 1.3], hF: [1, H - 3.2], elb: 'back', blade: { out: 0, g: [4.1, H - 1.3], ang: .5, two: 0 }, sayaTilt: .2 },
  { t: .04, e: 'i', pel: [1, H - 4.4], lean: .58, head: -.3, fN: [8.5, 4.5], fF: [-5.8, 1.5], hN: [10, H + .5], hF: [.5, H - 3.4], elb: 'back', blade: blade([10, H + .5], -2.7, 0, { vis: 9 }), sayaTilt: .25 },
  { t: .075, e: 'o', pel: [3, H - 4.6], lean: .55, head: -.26, fN: [11.5, 1.5], fF: [-5.8, 1.5], hF: [-1.5, H - 1.5], elb: 'back', blade: blade([13.5, H + 2], -.3, 0, { vis: 30 }), sayaTilt: .2 },
  { t: .105, e: 'o', ev: 'qhit', pel: [4, H - 4], lean: .42, head: -.18, fN: [11.5, 1.5], fF: [-5.8, 1.5], hF: [-2, H - .5], elb: 'back', blade: blade([13.5, H + 9.5], .95, 0), sayaTilt: .1 },
  { t: .135, e: 'o', pel: [4.5, H - 3], lean: .16, head: 0, fN: [11.5, 1.5], fF: [-5.8, 1.5], elb: 'back', blade: blade([9, H + 15], 2.1, 1) },
  { t: .19, e: 'ob', pel: [4.2, H - 2.6], lean: .09, head: .06, fN: [11.5, 1.5], fF: [-5.8, 1.5], elb: 'back', blade: blade([7.5, H + 15.5], 2.35, 1) },
  { t: .4, e: 'io', pel: [4.4, H - 2.6], lean: .14, head: .04, fN: [11.5, 1.5], fF: [-.5, 1.5], elb: 'back', blade: blade([10, H + 10], 1.4, 1) },
  { t: .62, e: 'io', ...guardKey(.62, 4.6) }], { blend: .03, next: 'guard' });
// the samurai, hooked and dragged: feet planted against it, leaning back, slid across the floor
proc('dragged', (a, t) => { const j = Math.sin(t * 90) * .04;
  return { p: { pel: [-2, H - 4], lean: -.42 + j, head: .4, fN: [4, 1.5], fF: [-7, 1.5], hN: [6, H + 7], hF: [3, H + 9], elb: 'back', blade: blade([6, H + 7], 1.9, 0) } }; },
  { loop: true, blend: .03, noLock: () => true });

// ---- X, Time Slice (prototype 18): the iai crouch, the cut he leaves at each one, and the kneel sliding the blade home ----
keyed('tsCrouch', [
  { t: 0, e: 'o', pel: [0, H - 2.6], lean: .2, head: 0, fN: [6, 1.5], fF: [-5.6, 1.5], hN: [4.8, H + .4], hF: [3, H - 1], elb: 'back', blade: SH },
  { t: .2, e: 'io', pel: [-1.4, H - 6.4], lean: .58, head: -.22, fN: [7.4, 1.5], fF: [-7.4, 1.5], hN: [4.2, H - 1.6], hF: [2, H - 3.4], elb: 'back', blade: SH, sayaTilt: .3 },
  { t: .3, e: 'io', pel: [-1.5, H - 6.6], lean: .6, head: -.24, fN: [7.4, 1.5], fF: [-7.4, 1.5], hN: [4.2, H - 1.6], hF: [2, H - 3.4], elb: 'back', blade: SH, sayaTilt: .3 }], { blend: .04 });
// one cut in stopped time: the draw's follow-through, held (it is shown for a frame or two at each one)
proc('tsCut', (a) => { const k = a.co.k ?? 0;
  return { p: { pel: [4, H - 5 + k], lean: .66 - k * .1, head: -.24, fN: [13, 1.5], fF: [-6, 2.4], hF: [-2, H - 1], elb: 'back', blade: blade([14, H + 6 - k * 5], .5 - k * 1.2, 0), sayaTilt: .2 } }; },
  { loop: true, blend: 0, noLock: () => true });
// the kneel: back where he started, on one knee, sliding the blade home; 'click' and time comes back
const KP = [0, H - 8.6], mouth = [KP[0] + 2.2, KP[1] + 1.2], SA = Math.PI + .32 - .1 - TAU, sd = [Math.cos(SA), Math.sin(SA)], ins = vis => [mouth[0] - sd[0] * vis, mouth[1] - sd[1] * vis];
const kneel = (t, vis, e = 'io', ev) => ({ t, e, ev, pel: [KP[0], KP[1]], lean: .3, head: .06, fN: [7, 1.5], fF: [-7.5, 1.5], kneeDir: [1, -.2], hF: [mouth[0] - .3, mouth[1] + .4], elb: 'back', sayaTilt: .1,
  blade: vis > 0 ? blade(ins(vis), SA, 0, { vis }) : SH });
keyed('tsKneel', [kneel(0, 22, 'i'), kneel(.32, 6, 'o'), kneel(.5, 1.6, 'h'), kneel(.52, 0, 'io', 'click'),
  { t: .9, e: 'io', pel: [0, H - 8], lean: .26, head: .04, fN: [7, 1.5], fF: [-7.5, 1.5], kneeDir: [1, -.2], hN: [2, H - 7], hF: [5, H - 6], elb: 'back', blade: SH },
  { t: 1.25, e: 'io', pel: [.3, H - 2.4], lean: .14, head: .06, fN: [7, 1.5], fF: [-5, 1.5], hN: [1.8, H - 1.5], hF: [5.2, H + 1.6], elb: 'back', blade: SH }], { blend: 0, next: 'idle' });
