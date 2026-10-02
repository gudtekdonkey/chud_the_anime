import { S } from '../state.js';

// ---- Feel: every tuning number of the animation flow picks in one place (owner 2026-10-02, "Flow: Q1C Q2B Q3A Q4C Q5C Q6C Q7C Q8C").
// Claude's numbers, open to tuning. What reads them: player/buffer.js, player/locomotion.js, player/blend.js, world/camera.js,
// player/combo.js (the cut's step in) and every hit pause (hitStop below).
export const FEEL = {
  // Q3A: a press is remembered this long (s) and fires on the first step it can, out of a hit pause or at a cancel window
  buffer: .2,
  // Q3A, generous Dead Cells cancel windows: seconds into a move from which a group of keys may cut it short.
  // dodge = slide or jump, skill = I O P N U K. A J cut's: dodge one frame after its strike, skills once its hit window closes
  // (cutCancel below, from player/combo.js CUTS); the next J in the follow-through stays the ladder's (combo.js GO)
  cancel: { moon: { dodge: .3, skill: .45 }, sweep: { dodge: .62, skill: .8 } },
  cutDodge: 2 / 60, cutSkill: .1,
  // Q6C: hit-stop by weight, in 60 Hz frames, times the weapon's weight (weapons/*.js weight.stop) on its own cuts.
  // light: J1 to J5, I's tap, Thousand Cuts' cuts, the mirror images; heavy: the J finisher, Thousand Cuts' and Cross Rift's
  // click, the Crescent Moon; exec: Sky Drop's slam, an execution's killing blow
  stop: { light: 3, heavy: 5, exec: 8 },
  heavyShake: 2 / 60,   // Q7C: only a heavy hit shakes (s of shake, times weight.shake); a light one never does
  // Q7C: the room is one screen, so the camera is a small offset: look-ahead toward his move or cut, eased, whole pixels,
  // never past the room's edge (world/room.js draws the floor MARGIN px past the screen)
  cam: { look: 4, lookY: 2, attack: 3, ease: 5 },   // px ahead running, px up or down, px toward a cut, 1/s (the lag)
  // movement that flows: seconds from standing to top speed and back (top speeds unchanged: his gait, 74 blade out)
  move: { accel: .1, decel: .08, stopV: .18 },   // stopV: under this share of top speed a run settles into idle
  turnStep: .045,   // s a facing shows while he runs round (rig/turn.js STEP is .03 standing): the run arcs, never snaps
  turnLean: .14,    // radians of extra lean into a turn at full turning speed
  // Q2B: pose blending at draw time, in 60 Hz frames: from the last drawn pose into a new move. Never changes a hit's timing
  blend: { base: 3, attack: 2, settle: 4 },
  // Q1C: locomotion loops are in-betweened to 30 fps on the run's own clock; everything else keeps its authored, held frames
  fps: 30, tween: new Set(['run', 'walk', 'runArmed']),
  // Q5C: springs (w rad/s, z damping) on what hangs off him: strong on the mantle, subtle on the hat (whole pixels, ±1)
  spring: { hat: { w: 16, z: .35, k: .004, max: 1 }, mantle: { w: 9, z: .3, k: .9 }, lean: { w: 12, z: .45, k: .00018, max: .12 }, cloth: .12 },
  // the cuts track their target: a step in of up to this many px before the strike, stopping this far short of him
  track: { max: 36, standoff: 16, dy: 10, level: 20 },
};
// the J ladder's cancel windows, from each cut's strike (player/combo.js CUTS sk)
export const cutCancel = sk => ({ dodge: sk + FEEL.cutDodge, skill: sk + FEEL.cutSkill });

// a hit pause by weight; wt: the weapon's weight.stop for its own cuts. A heavy one shakes a little; a light one never does.
// The log is read-only for `npm run check` (window.__game.stops): the last few pauses, by weight and frames
export const stops = [];
export function hitStop(w, wt = 1, shake = 1) {
  const f = FEEL.stop[w] * wt; S.hitstop = Math.max(S.hitstop, f / 60);
  if (w !== 'light') S.shake = Math.max(S.shake, FEEL.heavyShake * shake);
  stops.push({ w, f }); if (stops.length > 12) stops.shift();
}
// which weight a hit kind (player/hits.js) lands with
export const weightOf = kind => /^(slash6|cm|cr)/.test(kind) ? 'heavy' : /^sw/.test(kind) ? 'exec' : 'light';
