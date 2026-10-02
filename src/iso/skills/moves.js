// ---- The skills' moves, in the Animation Flow page's pose language (anim/moves.js: pel / fN / fF / hN / hF in rig px,
// lean / head in radians, the blade's grip and angle), so the 3D skeleton and the pixel drawing both take them through
// the look seam. ADDITIONS, not the page's: the page's own Sky Drop and blink were left out of the slice (anim/moves.js)
// and its source is not in this checkout, so these are authored here from today's skill poses (src/anims/poses.js,
// breath-poses.js) and timings (player/update.js, skills.js, mirror.js, breath.js): the same beats, new keys. Swap any
// clip for the page's keys behind the same name.
import { keyed, proc, evalKeys, H, TAU, EZ, clamp, lerp } from '../anim/flow.js';
import { SH, blade } from '../anim/moves.js';
import { BT } from './beats.js';

const sh = g => ({ out: 0, g, ang: .5, two: 0 });
const still = keys => keys.map(k => ({ r: 0, ...k }));                 // no root motion: the skill moves him itself
const local = (p, r) => { for (const k of ['pel', 'fN', 'fF', 'hN', 'hF']) if (p[k]) p[k] = [p[k][0] - r, p[k][1]]; if (p.blade && p.blade.g) p.blade = { ...p.blade, g: [p.blade.g[0] - r, p.blade.g[1]] }; return p; };
// the whole body raised `dy` rig px off the floor (Sky Drop's blink, the lotus): the feet lift, so nothing stays planted
export const lift = (p, dy) => { for (const k of ['pel', 'fN', 'fF', 'hN', 'hF']) if (p[k]) p[k] = [p[k][0], p[k][1] + dy]; if (p.blade && p.blade.g) p.blade = { ...p.blade, g: [p.blade.g[0], p.blade.g[1] + dy] }; return p; };
// keys → a pose at t, in his own frame (root motion taken out, as the flow does for keyed clips)
const at = (keys, t) => { const e = evalKeys(keys, t); return { p: local(e.p, e.r), r: e.r }; };

// ---- the stances the skills share ----
export const IDLE0 = { pel: [0, H - 2.2], lean: .13, head: .07, fN: [5.65, 1.5], fF: [-4.96, 1.5], hN: [1.8, H - 1.5], hF: [5.2, H + 1.6], elb: 'back', blade: SH };
const DRAW = { pel: [-1.2, H - 4.2], lean: .5, head: -.28, fN: [5.6, 1.5], fF: [-5.8, 1.5], hN: [4.1, H - 1.3], hF: [1, H - 3.2], elb: 'back', blade: sh([4.1, H - 1.3]), sayaTilt: .2 };
export const CROUCH = { pel: [-1.6, H - 5.8], lean: .64, head: -.34, fN: [6.6, 1.5], fF: [-6.8, 1.5], hN: [3.8, H - 2.6], hF: [.4, H - 4.2], elb: 'back', blade: sh([3.8, H - 2.6]), sayaTilt: .3 };
const CUT_LO = { pel: [3, H - 4.6], lean: .55, head: -.26, fN: [11.5, 1.5], fF: [-5.8, 1.5], hF: [-1.5, H - 1.5], elb: 'back', blade: blade([13.5, H + 2], -.3, 0, { vis: 30 }), sayaTilt: .2 };
const CUT_A = { pel: [4, H - 4], lean: .42, head: -.18, fN: [11.5, 1.5], fF: [-5.8, 1.5], hF: [-2, H - .5], elb: 'back', blade: blade([13.5, H + 9.5], .95, 0) };
const CUT_HI = { pel: [4.4, H - 3], lean: .16, head: 0, fN: [11.5, 1.5], fF: [-4, 1.5], elb: 'back', blade: blade([8, H + 15.5], 2.3, 1) };
const CUT_B = { pel: [4.6, H - 4.8], lean: .6, head: -.2, fN: [12, 1.5], fF: [-3, 1.5], elb: 'back', blade: blade([10.5, H + 4], -.4, 1) };
const CUT_L = { pel: [4.2, H - 4.4], lean: .5, head: -.2, fN: [11.5, 1.5], fF: [-4.5, 1.5], hF: [-1, H + 1], elb: 'back', blade: blade([13, H + 7], .12, 0) };
const FREEZE = { pel: [4.2, H - 5], lean: .62, head: -.22, fN: [12, 1.5], fF: [-3, 1.5], elb: 'down', blade: blade([8.8, H - 1.6], -1.35, 1) };
// the quick sheathe after I and P (today's frames 13-15): the blade laid back into the saya at his hip, the click
const MOUTH = [5.6, H - 1.8], IN = -2.92, ins = vis => [MOUTH[0] + .975 * vis, MOUTH[1] + .22 * vis];
const SHEATH_A = { pel: [3.4, H - 3], lean: .22, head: .05, fN: [12, 1.5], fF: [-3, 1.5], hF: [5.4, H - 1.4], elb: 'back', blade: { out: 1, g: ins(12), ang: IN, two: 0, vis: 12 }, sayaTilt: .1 };
const SHEATH_B = { ...SHEATH_A, blade: { out: 1, g: ins(2), ang: IN, two: 0, vis: 2 } };
const CLICK = { ...SHEATH_A, hN: [7.8, H - .6], blade: SH };
const SETTLE = { pel: [3.6, H - 2.3], lean: .14, head: .06, fN: [12, 1.5], fF: [-1, 1.5], hN: [5.4, H - 1.2], hF: [8.4, H + 1.6], elb: 'back', blade: SH };
export const CUTS4 = [CUT_LO, CUT_A, CUT_B, CUT_L];

// ---- I tapped: the glitch double slash. Crouch into the draw, vanish (.15), the lunge cut (.225), the second cut down
// past his body (.325), held, sheathed, the click (.6); 16 frames at 24 fps, as today's `double`
export const DOUBLE = { blink: .15, c1: .225, c2: .325, click: .6, dur: 16 / 24 };
keyed('skDouble', [
  { t: 0, e: 'io', ...IDLE0 }, { t: .1, e: 'i', ...DRAW }, { t: .15, e: 'h', ...CROUCH }, { t: .2, e: 'o', ...CUT_LO }, { t: .225, e: 'o', ...CUT_A },
  { t: .28, e: 'i', ...CUT_HI }, { t: .325, e: 'o', ...CUT_B }, { t: .36, e: 'h', ...FREEZE }, { t: .52, e: 'io', ...FREEZE }, { t: .56, e: 'io', ...SHEATH_A },
  { t: .59, e: 'h', ...SHEATH_B }, { t: .6, e: 'io', ...CLICK }, { t: DOUBLE.dur, ...SETTLE }], { blend: .05, next: 'idle' });

// ---- I or P held: the charge, crouched over the hilt; it trembles once full (a.co.charge 0..1)
proc('skCharge', (a, t) => { const c = a.co.charge || 0, b = Math.sin(t * TAU / .9), tr = c >= 1 ? (Math.random() - .5) * .5 : 0;
  const p = JSON.parse(JSON.stringify(CROUCH)); p.pel = [p.pel[0] + tr, p.pel[1] - .6 * c + .2 * b]; p.lean += .06 * c; return { p }; }, { loop: true, blend: .06 });

// ---- released: Thousand Cuts (I) or Cross Rift (P). V s vanished (Thousand Cuts flashes a cut pose at each spot),
// then the two strikes (V, V + .1), held to F = V + .16 + hold, sheathed, the click at F + .06; ends at F + .2
const REL = (V, F) => { const k = [{ t: 0, e: 'h', ...CROUCH }, { t: Math.max(.01, V - .02), e: 'o', ...CUT_LO }, { t: V, e: 'o', ...CUT_A }, { t: V + .055, e: 'i', ...CUT_HI },
  { t: V + .1, e: 'o', ...CUT_B }, { t: V + .14, e: 'h', ...FREEZE }, { t: F, e: 'io', ...FREEZE }, { t: F + .03, e: 'io', ...SHEATH_A }, { t: F + .055, e: 'h', ...SHEATH_B },
  { t: F + .06, e: 'io', ...CLICK }, { t: F + .2, ...SETTLE }]; const p0 = k[0].pel[0]; for (const q of k) q.r = q.pel[0] - p0; return k; };
proc('skRelease', (a, t) => { const o = a.co; if (!o.keys) o.keys = REL(o.V, o.F);
  if (o.vanish && t < o.V) { const q = JSON.parse(JSON.stringify(CUTS4[(o.cutJ || 0) % 4])); return { p: local(q, q.pel[0]) }; }   // Thousand Cuts: a cut at each spot, placed by the skill
  return at(o.keys, t); }, { blend: .03, next: 'idle' });

// ---- O held: the blade raised high behind his head, feet planted, in place; let go: one huge descending cut (.8 s)
const MOON_UP = { pel: [-.8, H - 3], lean: -.14, head: .12, fN: [6.2, 1.5], fF: [-6.2, 1.5], elb: 'back', blade: blade([-1.6, H + 15.5], 2.7, 1) };
proc('skMoonHold', (a, t) => { const c = a.co.charge || 0, b = Math.sin(t * TAU / 1.1), p = JSON.parse(JSON.stringify(MOON_UP));
  p.pel[1] += .35 * b - .8 * c; p.lean -= .05 * c; p.blade.ang += .08 * c; if (c >= 1) p.pel[0] += (Math.random() - .5) * .4; p.breath = (b + 1) / 2; return { p }; }, { loop: true, blend: .08 });
keyed('skMoon', [
  { t: 0, e: 'i', ...MOON_UP }, { t: .03, e: 'i', pel: [2, H - 3.6], lean: .3, head: -.05, fN: [9, 4], fF: [-6.2, 1.5], elb: 'back', blade: blade([5, H + 16], 1.4, 1) },
  { t: .06, e: 'o', pel: [6, H - 5.5], lean: .72, head: -.26, fN: [14.5, 1.5], fF: [-5, 2], elb: 'down', blade: blade([14.5, H + 1], -.85, 1) },
  { t: .12, e: 'ob', pel: [6.4, H - 6.2], lean: .78, head: -.28, fN: [14.5, 1.5], fF: [-5, 1.5], elb: 'down', blade: blade([13.5, H - 4], -1.3, 1) },
  { t: .45, e: 'io', pel: [6.3, H - 5.8], lean: .72, head: -.22, fN: [14.5, 1.5], fF: [-5, 1.5], elb: 'down', blade: blade([13.8, H - 3.4], -1.25, 1) },
  { t: .8, pel: [6.6, H - 2.4], lean: .14, head: .03, fN: [14.5, 1.5], fF: [2, 1.5], elb: 'back', blade: blade([15.4, H + 4], .55, 1) }], { blend: .03, next: 'guard' });

// ---- N: Mirror Meditation. Still, palms together at his chest, head bowed, breathing (1.4 s)
proc('skMeditate', (a, t) => { const b = (Math.sin(t * TAU / 1.4 - 1.5) + 1) / 2, k = EZ.o(clamp(t / .2, 0, 1));
  return { p: { pel: [0, H - 2 - .3 * b], lean: .03 + .02 * b, head: lerp(.07, .34, k), fN: [3.6, 1.5], fF: [-3.6, 1.5], hN: [4.4, H + 8.4 + .5 * b], hF: [4.7, H + 8.8 + .5 * b], elb: 'down', blade: SH, breath: b } }; },
{ dur: 1.4, blend: .1, next: 'idle' });
// a mirror image's dash: low and leaning, hand on the hilt, about to draw (then the page's J1 plays its cut)
proc('skDash', () => ({ p: { ...JSON.parse(JSON.stringify(CROUCH)), lean: .78, head: -.4 } }), { loop: true, blend: .03 });

// ---- U: Sky Drop (owner pick 2026-10-01). A 0.12 s crouch; the blink up and forward, the blade overhead as the storm
// comes down into it; at .36 he turns it point down and drops, blade first; lands at .44 kneeling in the crater, the
// blade in the floor; up out of it into guard (24 frames at 20 fps). The lift is laid on by `DROP.lift`
export const DROP = { up: .12, drop: .36, land: .44, dur: 24 / 20, high: 88,
  lift: t => t < .12 ? 0 : t < .36 ? 88 + 8 * (t - .12) / .24 : t < .44 ? 96 * (1 - ((t - .36) / .08) ** 2) : 0 };
const DROPK = [
  { t: 0, e: 'o', ...IDLE0 }, { t: .07, e: 'h', pel: [-1, H - 6], lean: .56, head: -.3, fN: [6, 1.5], fF: [-6.5, 1.5], hN: [4.1, H - 2.4], hF: [1, H - 4], elb: 'back', blade: sh([4.1, H - 2.4]), sayaTilt: .25 },
  { t: .12, e: 'io', pel: [0, H - 1], lean: -.18, head: .18, fN: [4.5, 9], fF: [-3.5, 7], elb: 'back', blade: blade([.5, H + 16.5], 1.62, 1) },
  { t: .3, e: 'i', pel: [1, H - 1.5], lean: .1, head: 0, fN: [5, 9], fF: [-3, 7.5], elb: 'back', blade: blade([3.5, H + 15], 1.1, 1) },
  { t: .36, e: 'i', pel: [2, H - 2], lean: .5, head: -.25, fN: [6, 8], fF: [-2, 6.5], elb: 'down', blade: blade([7, H + 3], -1.4, 1) },
  { t: .44, e: 'o', pel: [7, H - 8.5], lean: .8, head: -.3, fN: [14, 1.5], fF: [-4, 1.5], elb: 'down', blade: blade([15, H - 6.5], -1.45, 1) },
  { t: .5, e: 'io', pel: [7.2, H - 9], lean: .84, head: -.32, fN: [14, 1.5], fF: [-4, 1.5], elb: 'down', blade: blade([15, H - 6.8], -1.47, 1) },
  { t: .85, e: 'io', pel: [7.2, H - 8.6], lean: .8, head: -.26, fN: [14, 1.5], fF: [-4, 1.5], elb: 'down', blade: blade([15, H - 6.5], -1.45, 1) },
  { t: 1, e: 'io', pel: [7.6, H - 5], lean: .45, head: -.1, fN: [14, 1.5], fF: [3, 3.5], elb: 'down', blade: blade([15.6, H - 1], -1, 1) },
  { t: DROP.dur, pel: [8.2, H - 2.3], lean: .14, head: .03, fN: [14, 1.5], fF: [3.5, 1.5], elb: 'back', blade: blade([17, H + 4], .55, 1) }];
for (const k of DROPK) k.r = 0;   // he travels by the skill's own blink and drift
proc('skDrop', (a, t) => { const e = at(DROPK, t); lift(e.p, DROP.lift(t)); return { p: e.p }; }, { dur: DROP.dur, blend: .04, next: 'guard', noLock: a => a.ct < .45 });

// ---- C: Breath of Qi (prototypes/18; today's breath-poses.js), its beats in beats.js (BT)
const STAND = { pel: [0, H - 3.6], lean: .04, head: .02, fN: [6.2, 1.5], fF: [-6.2, 1.5], hN: [3, H - .6], hF: [3.4, H - 1], elb: 'down', blade: SH };
const RAISE = { pel: [0, H - 1.6], lean: -.06, head: -.12, fN: [5.6, 1.5], fF: [-5.6, 1.5], hN: [1.6, H + 17], hF: [2.2, H + 16.5], elb: 'down', blade: SH, breath: 1 };
const PRESS = { pel: [0, H - 4.2], lean: .1, head: .14, fN: [6.4, 1.5], fF: [-6.4, 1.5], hN: [4.4, H + .6], hF: [4.8, H + 1], elb: 'down', blade: SH };
const DOWN = { pel: [-.5, H - 7.5], lean: .36, head: .1, fN: [6, 1.5], fF: [-4.5, 3], hN: [5, H - 4], hF: [5.4, H - 3.6], elb: 'down', blade: SH };
const SEIZA = { pel: [-1, 7.4], lean: .08, head: .26, fN: [-3.2, 1.5], fF: [-4, 1.5], kneeDir: [1, -.15], hN: [5.4, 8.8], hF: [5.8, 9.1], elb: 'down', blade: SH };
const SIT = { pel: [0, 4.4], lean: .03, head: .08, fN: [5, 1.5], fF: [3.6, 2], kneeDir: [.8, .5], hN: [6.6, 6.2], hF: [6.4, 6.6], elb: 'down', blade: SH };
const READY = { pel: [0, H - 3], lean: .18, head: .04, fN: [6, 1.5], fF: [-5.5, 1.5], hN: [4.8, H + .4], hF: [2, H - 1.5], elb: 'back', blade: SH };
const INHALE = { pel: [-1, H - 3], lean: -.2, head: -.25, fN: [6.5, 1.5], fF: [-6.5, 1.5], hN: [-7, H + 6], hF: [-6.5, H + 5], elb: 'back', blade: SH, breath: 1 };
const EXHALE = { pel: [2.6, H - 5], lean: .4, head: -.1, fN: [11, 1.5], fF: [-6, 1.5], hN: [14, H + 8], hF: [13.5, H + 8.5], elb: 'back', blade: SH, coat: 1 };
function kata() { const b = BT.kata, k = [{ t: 0, ...IDLE0 }, { t: .25, ...IDLE0 }, { t: .5, ...STAND }];
  for (let i = 0; i < 3; i++) { const t = b.B0 + i * b.BP; k.push({ t: t + .55, e: 'io', ...RAISE }, { t: t + .9, e: 'io', ...PRESS }); }
  return still([...k, { t: 3.55, ...STAND }, { t: b.END, ...IDLE0 }]); }
function seiza() { const b = BT.seiza, k = [{ t: 0, ...IDLE0 }, { t: .22, ...IDLE0 }, { t: .36, ...DOWN }, { t: .55, ...SEIZA }];
  for (let i = 0; i < 3; i++) { const t = b.B0 + i * b.BP; k.push({ t, ...SEIZA }, { t: t + .45, ...SEIZA, pel: [-1, 8], head: .18, breath: 1 }, { t: t + .75, ...SEIZA }); }
  return still([...k, { t: b.GET, ...SEIZA }, { t: b.GET + .12, ...DOWN }, { t: b.GET + .3, ...READY }, { t: b.END, ...IDLE0 }]); }
function lotus() { const b = BT.lotus, k = [{ t: 0, ...IDLE0 }, { t: .25, ...IDLE0 }, { t: .42, ...DOWN, pel: [-.3, H - 9] }, { t: .62, ...SIT }];
  for (let t = .62 + .7; t < b.DROP - .2; t += 1.4) k.push({ t, ...SIT, pel: [0, 5], breath: 1 }, { t: t + .7, ...SIT });
  return still([...k, { t: b.DROP, ...SIT }, { t: 3.62, ...DOWN }, { t: b.END, ...IDLE0 }]); }
function sbreath() { const b = BT.sbreath;
  return still([{ t: 0, ...IDLE0 }, { t: .35, ...READY }, { t: b.IN0, ...READY, pel: [0, H - 4], lean: .1 }, { t: b.IN1, ...INHALE }, { t: b.EX, e: 'h', ...INHALE, lean: -.26 },
    { t: b.EX + .001, ...EXHALE }, { t: b.EX + .5, ...EXHALE, lean: .22, coat: 0 }, { t: b.EX + .9, ...READY }, { t: 3, ...READY }, { t: b.END, ...IDLE0 }]); }
keyed('skKata', kata(), { blend: .08, next: 'idle' });
keyed('skSeiza', seiza(), { blend: .08, next: 'idle' });
const LOTUSK = lotus();
// the lotus lifts him off the floor (today's P.z: 6 px, turning gently), then sets him down
proc('skLotus', (a, t) => { const b = BT.lotus, e = at(LOTUSK, t), k = u => clamp(u, 0, 1);
  const z = t < b.LIFT ? 0 : t < b.OFF ? 12 * EZ.o(k((t - b.LIFT) / .5)) + 1.5 * Math.sin((t - b.LIFT) * 2.4) * k((t - 1.1) / .3) : 12 * (1 - k((t - b.OFF) / (b.DROP - b.OFF)));
  return { p: lift(e.p, z) }; }, { dur: BT.lotus.END, blend: .08, next: 'idle', noLock: () => true });
keyed('skStorm', sbreath(), { blend: .06, next: 'idle' });
// tap C: he sits cross-legged, his back to the camera, breathing slowly; any key gets him up (.2 s)
proc('skSit', (a, t) => { const b = (Math.sin(t * TAU / 3) + 1) / 2, p = JSON.parse(JSON.stringify(SIT)); p.pel[1] += .3 * b; p.head += .04 * b; p.breath = b; return { p }; }, { loop: true, blend: .25, noLock: () => true });
keyed('skStand', still([{ t: 0, e: 'o', ...SIT }, { t: .2, ...IDLE0 }]), { blend: .02, next: 'idle' });
