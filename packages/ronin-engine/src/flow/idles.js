// ---- Twenty idles in the Animation Flow style (owner 2026-10-02: "20 different idle animations, and our personality
// system and how it affects someone's behaviour/animations"). An addition, not the page's: each idle is keyed poses
// with easing (anim/flow.js keys: { t, e: easing into the next key, ...fields }), laid over the LIVE base idle (the
// breathing stance, with the person's bearing) through an envelope that eases in and back out, so the character drifts
// from the breath into the idle and home again with nothing snapping; the springs (hat, kusazuri, sode, head) ride on
// whatever comes out. A key's fields:
//   offsets, scaled by the envelope:  dp [forward, up] the pelvis · dl lean · dh head · dfN / dfF the feet · hat (the brim's tilt)
//   absolutes, mixed in by it:        hN / hF hands · elb · blade · hy head yaw · hr head roll · tw chest twist
// Fields a key leaves out carry over from the key before (or after, for the first ones), so every field glides.
// hy / hr / tw turn the 3D skeleton sideways (look/three/rig.js); the pixel engine, vendored verbatim, has no lateral
// axis and ignores them. `hold` [t0, t1] is the stretch a person may linger in; `blade` marks an idle that draws the katana.
import { EZ, H, TAU, clamp, lerp, mixP } from './flow.js';
import { SH, blade } from './moves.js';

const HILT = [4.8, H + .4], GRIP = [3.2, H - .6], RN = [1.8, H - 1.5], LF = [5.2, H + 1.6];       // the hand on the hilt; the plain idle's right and left hands
// GRIP: the hand closed on the hilt by the saya's mouth, where the draw starts and the blade goes home; the saya's mouth at the idle's hips and a grip drawn `vis` out of it along the saya (the page's sheathe, at rest)
const MOUTH = [2.2, H - 1], SAYA = Math.PI + .32 - .1 - TAU, SD = [Math.cos(SAYA), Math.sin(SAYA)];
const inSaya = vis => blade([MOUTH[0] - SD[0] * vis, MOUTH[1] - SD[1] * vis], SAYA, 0, { vis });
const SHEATHED = (g = GRIP) => ({ out: 0, g, ang: .5, two: 0 });
const wob = (u, f, a) => a * Math.sin(u * f * TAU) * Math.sin(Math.PI * clamp(u, 0, 1));   // a shake that fades in and out

export const IDLES = {
  breathe: { about: 'the plain stance: one long, deep breath in, held, let go', dur: 3.2, in: .5, out: .7, keys: [
    { t: 0, e: 'io', dp: [0, 0], dl: 0, dh: 0 }, { t: 1.2, e: 'io', dp: [-.2, .9], dl: -.05, dh: -.06, hN: [1.6, H - .6], hF: [5, H + 2.4] },
    { t: 1.7, e: 'o', dp: [-.2, 1], dl: -.05, dh: -.06 }, { t: 3.2, dp: [.1, -.3], dl: .03, dh: .05, hN: RN, hF: LF }] },
  weightShift: { about: 'shifts his weight onto the back foot, settles there, comes forward again', dur: 3.2, in: .5, out: .6, hold: [1, 2.2], keys: [
    { t: 0, e: 'io', dp: [0, 0], dl: 0, hr: 0 }, { t: .9, e: 'io', dp: [-2.2, -.6], dl: -.06, dh: .04, hr: -.08, dfN: [0, .4], tw: -.12 },
    { t: 2.2, e: 'io', dp: [-2, -.7], dl: -.05, dh: .05, hr: -.06, dfN: [0, .4], tw: -.1 }, { t: 3.2, dp: [.3, 0], dl: .02, hr: 0, dfN: [0, 0], tw: 0 }] },
  checkBlade: { about: 'thumbs the guard, eases a hand-width of steel out of the saya, looks at it, slides it home', dur: 3, in: .4, out: .5, blade: 1, hold: [1, 1.7], keys: [
    { t: 0, e: 'io', hN: HILT, hF: [3, H], dh: .05, blade: SHEATHED() }, { t: .5, e: 'i', hN: GRIP, hF: [2.8, H - .4], dh: .22, blade: SHEATHED() },
    { t: .62, e: 'o', dh: .26, blade: inSaya(.5) }, { t: .95, e: 'io', dh: .38, dl: .05, blade: inSaya(6.5), hy: -.15 },
    { t: 1.7, e: 'io', dh: .4, dl: .06, blade: inSaya(6), hy: -.2 }, { t: 2.05, e: 'i', dh: .3, blade: inSaya(.4), hy: 0 },
    { t: 2.12, e: 'io', dh: .2, blade: SHEATHED(), hN: GRIP }, { t: 3, dh: .05, dl: 0, blade: SHEATHED(), hN: HILT }] },
  adjustHat: { about: 'reaches up, takes the brim, tugs the hat down and squares it', dur: 2.2, in: .35, out: .45, keys: [
    { t: 0, e: 'io', hN: [5, H + 12], dh: 0, hat: 0 }, { t: .45, e: 'i', hN: [7.2, H + 19.5], dh: -.05, hat: 0 },
    { t: .7, e: 'ob', hN: [6.8, H + 18], dh: .14, hat: .32 }, { t: 1.15, e: 'io', hN: [7, H + 18.4], dh: .1, hat: .24, hy: .12 },
    { t: 1.5, e: 'io', hN: [7.1, H + 18.6], dh: .08, hat: .22, hy: -.05 }, { t: 2.2, hN: [4, H + 8], dh: .04, hat: .16, hy: 0 }] },
  shoulderRoll: { about: 'rolls his shoulders up and back, twice, and lets them drop', dur: 2.2, in: .3, out: .4, keys: [
    { t: 0, e: 'io', dp: [0, 0], dl: 0, hN: RN, hF: LF, tw: 0 }, { t: .35, e: 'io', dp: [.3, 1.2], dl: .04, hN: [2.2, H + 1], hF: [4.6, H + 3.4], tw: .15 },
    { t: .7, e: 'io', dp: [-.4, .7], dl: -.1, hN: [.6, H], hF: [4, H + 2.2], tw: -.15 }, { t: 1.05, e: 'io', dp: [.3, 1.2], dl: .04, hN: [2.2, H + 1], hF: [4.6, H + 3.4], tw: .15 },
    { t: 1.4, e: 'io', dp: [-.4, .7], dl: -.1, hN: [.6, H], hF: [4, H + 2.2], tw: -.15 }, { t: 2.2, dp: [0, -.4], dl: .03, hN: RN, hF: LF, tw: 0 }] },
  scanHorizon: { about: 'a hand to the brim against the light, eyes slow along the horizon one way, then the other', dur: 4.6, in: .5, out: .6, hold: [1.2, 3.4], keys: [
    { t: 0, e: 'io', hN: [6, H + 15], dh: -.08, hy: 0, dl: -.03 }, { t: .55, e: 'io', hN: [7, H + 17.5], dh: -.16, hy: -.15, dl: -.05 },
    { t: 1.8, e: 'io', hN: [7, H + 17.4], dh: -.18, hy: -.75, tw: -.2, dl: -.05 }, { t: 3.4, e: 'io', hN: [7, H + 17.6], dh: -.16, hy: .7, tw: .18, dl: -.05 },
    { t: 4.6, hN: [5, H + 10], dh: -.05, hy: 0, tw: 0, dl: 0 }] },
  hiltRest: { about: 'lets the sword hand settle on the hilt and the other on the saya, and leans on them, the thumb tapping', dur: 4.6, in: .6, out: .7, hold: [1, 3.6], keys: [
    { t: 0, e: 'io', hN: HILT, hF: [3.4, H - .6], dl: .02, dp: [0, 0] }, { t: .8, e: 'io', hN: [5.2, H + .2], hF: [3.2, H - .9], dl: .06, dp: [.4, -.3], hr: .05 },
    { t: 3.6, e: 'io', hN: [5.1, H + .3], hF: [3.2, H - .8], dl: .07, dp: [.5, -.4], hr: .06 }, { t: 4.6, hN: HILT, hF: [3.6, H], dl: .02, dp: [0, 0], hr: 0 }],
    fx: (u, p, w) => { p.hN[1] += w * .35 * Math.max(0, Math.sin(u * 9 * TAU)) * (u > .25 && u < .75 ? 1 : 0); } },
  neckCrack: { about: 'tips his head slowly over to one side, snaps it, then the other', dur: 2, in: .3, out: .35, keys: [
    { t: 0, e: 'io', hr: 0, dh: 0 }, { t: .5, e: 'i', hr: .42, dh: .08 }, { t: .58, e: 'o', hr: .5, dh: .04 }, { t: .66, e: 'io', hr: .1, dh: 0 },
    { t: 1.15, e: 'i', hr: -.42, dh: .08 }, { t: 1.23, e: 'o', hr: -.5, dh: .04 }, { t: 1.4, e: 'io', hr: -.08, dh: -.02 }, { t: 2, hr: 0, dh: 0 }],
    fx: (u, p, w) => { const s = (u > .27 && u < .33) || (u > .6 && u < .66) ? 1 : 0; p.lean += s * .03 * w; } },
  kneelRest: { about: 'steps back and sinks onto one knee, a hand on the raised knee, breathes, rises', dur: 6.2, in: .45, out: .55, hold: [1.6, 4.6], keys: [
    { t: 0, e: 'io', dp: [0, 0], dl: 0, dh: 0, dfF: [0, 0], dfN: [0, 0], hN: RN, hF: LF },
    { t: .45, e: 'io', dp: [-1, -.6], dl: .05, dh: .04, dfF: [-2.6, 3.4], dfN: [0, 0] },
    { t: .8, e: 'io', dp: [-1.6, -3.2], dl: .14, dh: .1, dfF: [-5, 0], dfN: [.6, 0], hN: [5, H - 4], hF: [5, H - 2] },
    { t: 1.6, e: 'io', dp: [-1.8, -7.4], dl: .28, dh: .16, dfF: [-5.4, 0], dfN: [1, 0], hN: [6.8, H - 8.2], hF: [4.6, H - 7] },
    { t: 4.6, e: 'io', dp: [-1.8, -7.2], dl: .25, dh: .22, dfF: [-5.4, 0], dfN: [1, 0], hN: [6.9, H - 8], hF: [4.4, H - 6.8] },
    { t: 5.3, e: 'io', dp: [-.8, -2.4], dl: .12, dh: .06, dfF: [-5.2, 0], dfN: [.6, 0], hN: [4.6, H - 3], hF: [5, H - 1] },
    { t: 5.75, e: 'io', dp: [-.2, -.4], dl: .04, dh: 0, dfF: [-2.4, 3.2], dfN: [.2, 0] }, { t: 6.2, dp: [0, 0], dl: 0, dh: 0, dfF: [0, 0], dfN: [0, 0], hN: RN, hF: LF }] },
  leanSword: { about: 'draws slowly, sets the point to the ground before him, folds both hands on the pommel and leans on it', dur: 7.4, in: .45, out: .6, blade: 1, hold: [2.4, 5.2], keys: [
    { t: 0, e: 'io', hN: HILT, hF: [3, H], blade: SHEATHED(), dl: 0, dp: [0, 0], dh: 0 },
    { t: .5, e: 'i', hN: GRIP, hF: [2.8, H - .4], blade: SHEATHED(), dl: .04 },
    { t: .62, e: 'io', blade: inSaya(1), hF: [2.8, H - .4] },
    { t: 1.15, e: 'io', blade: blade([9.5, H + 3], -2.85, 0, { vis: 14 }), hF: [3, H - .2], dl: .06, dh: .08 },
    { t: 1.55, e: 'io', blade: blade([10.5, H + 7], -2.2, 0), hF: [4, H + 1.6], dl: .04 },
    { t: 2, e: 'o', blade: blade([8.2, H + 3.4], -1.27, 1), hF: [8.2, H + 3.4], dl: .14, dp: [.6, -.4], dh: .12 },
    { t: 2.4, e: 'io', blade: blade([7.8, H + 2.2], -1.24, 1), dl: .24, dp: [1, -.9], dh: .16 },
    { t: 5.2, e: 'io', blade: blade([7.8, H + 2.1], -1.25, 1), dl: .26, dp: [1.1, -1], dh: .2, hr: .06 },
    { t: 5.7, e: 'io', blade: blade([10.5, H + 6], -.9, 1), dl: .12, dp: [.5, -.3], dh: .06, hr: 0 },
    { t: 6.1, e: 'io', blade: blade([10.8, H + 1.6], -1.3, 0), hF: [3, H], dl: .1 },
    { t: 6.5, e: 'io', blade: inSaya(16), hF: [2.8, H - .3], dl: .06, dh: .1 },
    { t: 6.85, e: 'i', blade: inSaya(.4), hF: [2.8, H - .4], dl: .04, dh: .05 },
    { t: 6.92, e: 'io', blade: SHEATHED(), hN: GRIP }, { t: 7.4, blade: SHEATHED(), hN: HILT, hF: [3, H], dl: 0, dp: [0, 0], dh: 0 }] },
  shiver: { about: 'the cold gets in: arms wrapped round himself, shoulders up, shaking, then a shake-off', dur: 2.6, in: .35, out: .45, keys: [
    { t: 0, e: 'io', hN: [4, H + 7], hF: [3.5, H + 8], dp: [0, 0], dl: 0, dh: 0 }, { t: .35, e: 'io', hN: [5, H + 9.2], hF: [4.4, H + 10], dp: [.2, .8], dl: .1, dh: .12 },
    { t: 1.8, e: 'io', hN: [5, H + 9.4], hF: [4.4, H + 10.2], dp: [.2, .9], dl: .1, dh: .14 }, { t: 2.1, e: 'o', hN: [3, H + 2], hF: [5.5, H + 3], dp: [0, -.2], dl: -.02, dh: -.05 },
    { t: 2.6, hN: RN, hF: LF, dp: [0, 0], dl: 0, dh: 0 }],
    fx: (u, p, w) => { const k = w * (u < .72 ? 1 : 0); p.pel[0] += wob(u, 23, .35) * k; p.lean += wob(u, 19, .03) * k; p.hr = (p.hr || 0) + wob(u, 17, .06) * k;
      if (u > .72 && u < .85) p.hr += Math.sin((u - .72) / .13 * 3 * TAU) * .25 * w; } },
  flickRain: { about: 'shakes the rain off the brim with a flick of the head, brushes it off a shoulder', dur: 2.4, in: .3, out: .4, keys: [
    { t: 0, e: 'io', hy: 0, dh: 0, hat: 0, hN: RN }, { t: .25, e: 'io', dh: .18, hat: .1 },
    { t: .3, e: 'o', hy: .35, dh: .2, hat: .14 }, { t: .4, e: 'o', hy: -.35, dh: .18 }, { t: .5, e: 'o', hy: .28 }, { t: .62, e: 'io', hy: 0, dh: .05, hat: -.05 },
    { t: 1, e: 'io', hN: [4.4, H + 11.6], tw: .2, dh: .1, hy: -.25 }, { t: 1.25, e: 'io', hN: [2.4, H + 9.4], tw: .15, hy: -.3 },
    { t: 1.5, e: 'io', hN: [4.6, H + 11.8], tw: .2, hy: -.28 }, { t: 1.75, e: 'io', hN: [2.2, H + 9], tw: .12, hy: -.2 }, { t: 2.4, hN: RN, tw: 0, hy: 0, dh: 0, hat: 0 }] },
  wipeBlade: { about: 'draws, lays the blade level across himself, draws it through a fold of the sleeve, a flick, slides it home', dur: 6, in: .4, out: .5, blade: 1, hold: [2, 3.3], keys: [
    { t: 0, e: 'io', hN: HILT, hF: [3, H], blade: SHEATHED(), dh: 0, dl: 0 },
    { t: .45, e: 'i', hN: GRIP, hF: [2.8, H - .4], blade: SHEATHED(), dh: .1 },
    { t: .55, e: 'io', blade: inSaya(1), hF: [2.8, H - .4] },
    { t: 1.05, e: 'io', blade: blade([9.5, H + 3.5], -2.9, 0, { vis: 15 }), hF: [3.2, H], dh: .14 },
    { t: 1.5, e: 'io', blade: blade([3.5, H + 7], .06, 0), hF: [5.6, H + 7.4], dh: .3, dl: .05 },
    { t: 3.3, e: 'io', blade: blade([3, H + 7.2], .02, 0), hF: [19, H + 7.9], dh: .32, dl: .06 },
    { t: 3.65, e: 'io', blade: blade([4, H + 7], .1, 0), hF: [5, H + 3], dh: .2 },
    { t: 3.8, e: 'i', blade: blade([10, H + 6], 1.1, 0), hF: [4.6, H + 2], dh: .06 },
    { t: 3.95, e: 'o', blade: blade([11, H + 1], -1.35, 0), hF: [4.6, H + 2], dh: .02, dl: .08 },
    { t: 4.8, e: 'io', blade: blade([10.6, H + 1.4], -1.2, 0), hF: [2.8, H - .3], dh: .08 },
    { t: 5.15, e: 'io', blade: inSaya(15), hF: [2.8, H - .4], dh: .12 },
    { t: 5.5, e: 'i', blade: inSaya(.4), hF: [2.8, H - .4], dh: .06 },
    { t: 5.56, e: 'io', blade: SHEATHED(), hN: GRIP }, { t: 6, blade: SHEATHED(), hN: HILT, hF: [3, H], dh: 0, dl: 0 }],
    fx: (u, p) => { if (p.blade.out && u > .25 && u < .55) { const b = p.blade, d = [Math.cos(b.ang), Math.sin(b.ang)], k = clamp((p.hF[0] - b.g[0]) / Math.max(.1, d[0]), 2, 22);
      p.hF = [b.g[0] + d[0] * k, b.g[1] + d[1] * k + .7]; } } },     // the far hand pinches the blade and runs along it
  stretch: { about: 'laces his fingers and pushes both arms up over the hat, leaning back, then lets them fall', dur: 3, in: .4, out: .5, keys: [
    { t: 0, e: 'io', hN: [5, H + 10], hF: [5, H + 10], dp: [0, 0], dl: 0, dh: 0 }, { t: .6, e: 'io', hN: [3, H + 23], hF: [3, H + 23], dp: [-.2, 1.2], dl: -.1, dh: -.12, hat: -.12 },
    { t: 1.6, e: 'io', hN: [2.4, H + 24.5], hF: [2.4, H + 24.5], dp: [-.4, 1.6], dl: -.16, dh: -.16, hat: -.14, hr: .08 },
    { t: 2.1, e: 'o', hN: [4, H + 6], hF: [6, H + 5], dp: [.1, -.3], dl: .04, dh: .04, hat: 0, hr: 0 }, { t: 3, hN: RN, hF: LF, dp: [0, 0], dl: 0, dh: 0 }] },
  footTap: { about: 'impatient: taps his front foot, four quick beats, a hand on the hip', dur: 2.2, in: .3, out: .35, keys: [
    { t: 0, e: 'io', dfN: [0, 0], hF: [.6, H + 3.2], dh: 0, elb: 'back' }, { t: 2.2, dfN: [0, 0], hF: [.6, H + 3.2], dh: 0 }],
    fx: (u, p, w) => { const b = u > .15 && u < .85 ? Math.max(0, Math.sin((u - .15) / .7 * 4 * Math.PI)) : 0; p.fN = [p.fN[0] + .4 * b * w, p.fN[1] + 1.6 * b * w]; p.head += .04 * b * w; } },
  armsFolded: { about: 'folds his arms across his chest and settles his weight, chin down', dur: 5.4, in: .55, out: .65, hold: [1, 4.4], keys: [
    { t: 0, e: 'io', hN: [5, H + 8.6], hF: [4.6, H + 9.4], dl: 0, dh: 0, dp: [0, 0] }, { t: .8, e: 'io', hN: [5.4, H + 9.6], hF: [5, H + 10.4], dl: -.04, dh: .1, dp: [-.4, 0], tw: .06 },
    { t: 4.4, e: 'io', hN: [5.4, H + 9.4], hF: [5, H + 10.2], dl: -.03, dh: .14, dp: [-.5, -.1], tw: .08, hy: -.06 }, { t: 5.4, hN: RN, hF: LF, dl: 0, dh: 0, dp: [0, 0], tw: 0, hy: 0 }] },
  meditate: { about: 'hands folded low, eyes down, the breath slowing until he is almost still', dur: 6.4, in: .7, out: .8, hold: [1.2, 5.2], keys: [
    { t: 0, e: 'io', hN: [4.6, H + 1.4], hF: [4.4, H + 1.8], dh: 0, dl: 0, dp: [0, 0] }, { t: 1.2, e: 'io', hN: [4.8, H + 1.2], hF: [4.6, H + 1.6], dh: .3, dl: -.02, dp: [-.2, -.5] },
    { t: 5.2, e: 'io', hN: [4.8, H + 1.2], hF: [4.6, H + 1.6], dh: .32, dl: -.02, dp: [-.2, -.6] }, { t: 6.4, hN: RN, hF: LF, dh: 0, dl: 0, dp: [0, 0] }],
    fx: (u, p, w) => { p.pel[1] += Math.sin(u * 2 * TAU) * .25 * w; } },                         // one slow breath, three times as slow
  glanceBack: { about: 'glances back over his shoulder, holds it, turns to the front again', dur: 2.4, in: .25, out: .4, hold: [.7, 1.4], keys: [
    { t: 0, e: 'io', hy: 0, tw: 0, dh: 0 }, { t: .35, e: 'o', hy: 1.3, tw: .35, dh: -.06, dp: [-.2, 0] },
    { t: 1.4, e: 'io', hy: 1.35, tw: .38, dh: -.04, dp: [-.2, 0] }, { t: 1.75, e: 'io', hy: .1, tw: .05, dh: .02 }, { t: 2.4, hy: 0, tw: 0, dh: 0, dp: [0, 0] }] },
  slump: { about: 'tired: a long breath out, the shoulders go, the head hangs, arms dead; then he gathers himself', dur: 4.8, in: .5, out: .6, hold: [1.6, 3.6], keys: [
    { t: 0, e: 'io', dp: [0, .5], dl: -.03, dh: -.05, hN: RN, hF: LF }, { t: .6, e: 'o', dp: [0, .7], dl: -.04, dh: -.08 },
    { t: 1.6, e: 'io', dp: [.6, -1.8], dl: .3, dh: .38, hN: [1.2, H - 5.2], hF: [2.4, H - 4.6], elb: 'down' },
    { t: 3.6, e: 'io', dp: [.7, -2], dl: .32, dh: .42, hN: [1.2, H - 5.4], hF: [2.4, H - 4.8], elb: 'down' },
    { t: 4.2, e: 'io', dp: [0, .6], dl: .02, dh: -.04, hN: [2, H - 1], hF: [5, H + 1.8], elb: 'back' }, { t: 4.8, dp: [0, 0], dl: 0, dh: 0, hN: RN, hF: LF }] },
  readyCrouch: { about: 'something stirs: he drops into a low, wide crouch, hand on the hilt, thumb at the guard, eyes up', dur: 4.4, in: .35, out: .6, hold: [1, 3.4], keys: [
    { t: 0, e: 'io', dp: [0, 0], dl: 0, dh: 0, dfN: [0, 0], dfF: [0, 0], hN: HILT, hF: [3, H] },
    { t: .2, e: 'io', dp: [.3, -.4], dl: .08, dfN: [1.4, 2.6], dfF: [0, 0] }, { t: .4, e: 'io', dp: [0, -2.8], dl: .22, dh: -.14, dfN: [2.6, 0], dfF: [-.8, 2.2] },
    { t: .6, e: 'o', dp: [-.4, -4], dl: .3, dh: -.2, dfN: [2.8, 0], dfF: [-2.4, 0], hN: [5.4, H - 1.2], hF: [2.6, H - 1.6] },
    { t: 3.4, e: 'io', dp: [-.4, -4.2], dl: .32, dh: -.22, dfN: [2.8, 0], dfF: [-2.4, 0], hN: [5.4, H - 1.4], hF: [2.6, H - 1.8], hy: .25 },
    { t: 3.8, e: 'io', dp: [0, -1.4], dl: .12, dh: -.05, dfN: [2.8, 0], dfF: [-1.2, 2.4], hy: 0 }, { t: 4.4, dp: [0, 0], dl: 0, dh: 0, dfN: [1.2, 0], dfF: [0, 0], hN: HILT, hF: [3, H] }],
    fx: (u, p, w) => { if (u > .25 && u < .75) p.pel[0] += Math.sin(u * 3 * TAU) * .25 * w; } },
};
export const IDLE_NAMES = Object.keys(IDLES);

// fields: a key leaves out what the key before had, so carry each field forward (and back, into the first keys)
for (const id of IDLE_NAMES) { const I = IDLES[id], ks = I.keys, all = new Set(ks.flatMap(k => Object.keys(k)));
  for (const f of all) { if (f === 't' || f === 'e') continue; let first = ks.find(k => k[f] !== undefined)[f];
    for (const k of ks) { if (k[f] === undefined) k[f] = first; else first = k[f]; } } }

// a key time stretched through the idle's hold (a calm person lingers in it; s = 1 is as authored)
const stretchT = (I, u, s) => { if (!I.hold || s === 1) return u; const [a, b] = I.hold, L = (b - a) * s;
  return u < a ? u : u < a + L ? a + (u - a) / s : u - L + (b - a); };
export const lengthOf = (I, s = 1) => I.dur + (I.hold ? (I.hold[1] - I.hold[0]) * (s - 1) : 0);
const env = (I, u, len) => EZ.s(clamp(u / I.in, 0, 1)) * EZ.s(clamp((len - u) / I.out, 0, 1));
const add2 = (a, d, w) => [a[0] + d[0] * w, a[1] + d[1] * w];
const evalAt = (ks, t) => { let i = 0; while (i + 1 < ks.length && ks[i + 1].t <= t) i++; const A = ks[i], B = ks[Math.min(i + 1, ks.length - 1)];
  if (A === B || t <= A.t) return A; return mixP(A, B, EZ[A.e || 'io'](clamp((t - A.t) / (B.t - A.t), 0, 1)), 'a'); };

// one idle at time u (seconds into it, real time) over a base pose; s stretches its hold
export function idlePose(base, id, u, s = 1) {
  const I = IDLES[id], len = lengthOf(I, s), w = env(I, u, len), k = evalAt(I.keys, stretchT(I, u, s)), p = { ...base };
  if (k.dp) p.pel = add2(base.pel, k.dp, w); if (k.dl) p.lean = base.lean + k.dl * w; if (k.dh) p.head = (base.head || 0) + k.dh * w;
  if (k.dfN) p.fN = add2(base.fN, k.dfN, w); if (k.dfF) p.fF = add2(base.fF, k.dfF, w);
  if (k.hat) p.hatTilt = (base.hatTilt || 0) + k.hat * w * 2;            // the springs halve hatTilt (flow.js secondary)
  for (const f of ['hy', 'hr', 'tw']) if (k[f] !== undefined) p[f] = lerp(base[f] || 0, k[f], w);
  for (const f of ['hN', 'hF']) if (k[f]) p[f] = mixP(base[f], k[f], w);
  if (k.elb && w > .5) p.elb = k.elb;
  if (k.blade && k.blade.out) { p.blade = k.blade; p.hN = k.blade.g; } else if (k.blade && w > .5) p.blade = { ...SH, ...k.blade, out: 0 };
  if (I.fx) I.fx(stretchT(I, u, s) / I.dur, p, w);
  return p;
}

// play one idle over and over (the gallery, the check): `a.idler.force`
export const forceIdle = (a, id) => { a.idler = { cur: null, at: 0, next: null, seed: 1, n: 0, played: [], force: id }; };

// ---- The drift: a character at rest breathes, and now and then slips into one of the idles their personality
// favours, then back. `a.persona.idles` is the weighted list (persona/persona.js), `gap` the seconds between them,
// `tempo` how fast they play, `linger` how long they hold. The plain ronin has none, so he only breathes, as drawn.
export function drift(a, t, base) {
  const P = a.persona, D = a.idler || (a.idler = { cur: null, at: 0, next: null, seed: a.seed ?? 1, n: 0, played: [] });
  const rnd = () => (D.seed = (D.seed * 16807) % 2147483647) / 2147483647;
  if (t < D.last) { D.cur = null; D.next = null; } D.last = t;                     // the idle clip restarted
  const pool = D.force ? [[D.force, 1]] : P && P.idles; if (!pool || !pool.length) return base;
  const gap = D.force ? .6 : P.gap;
  if (D.next == null) D.next = t + (D.force ? .3 : gap * (.4 + .6 * rnd()));
  if (!D.cur && t >= D.next) {
    let tot = 0; for (const [id, w] of pool) if (id !== D.prev || pool.length === 1) tot += w;
    let r = rnd() * tot, pick = pool[0][0]; for (const [id, w] of pool) { if (id === D.prev && pool.length > 1) continue; r -= w; if (r <= 0) { pick = id; break; } }
    D.cur = pick; D.at = t; D.s = D.force ? 1 : P.linger * (.8 + .5 * rnd()); D.n++; D.played.push(pick); if (D.played.length > 64) D.played.shift();
  }
  if (!D.cur) return base;
  const tempo = D.force ? 1 : P.tempo, u = (t - D.at) * tempo, len = lengthOf(IDLES[D.cur], D.s);
  if (u >= len) { D.prev = D.cur; D.cur = null; D.next = t + gap * (.7 + .6 * rnd()); return base; }
  return idlePose(base, D.cur, u, D.s);
}
