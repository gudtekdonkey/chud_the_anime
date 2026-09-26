import { pz, HILT, lerpP } from '../rig/pose.js';
import { rr, sgn } from '../fx/util.js';
import { at, hold, lin, IDLE, EG, RX, whiff } from './enemy-poses.js';
import { partOf, toPieces, splitPiece, shatter, sever, dropSword, fallScript, slideOff } from './pieces.js';
import { F } from './stage-fx.js';

// ---- Executions, batch 1 (approved), ported from prototypes/14-executions-batch-1.html ----
// Each runs in the stage's own frame, where the enemy faces left (-1) and the ronin came from the left; the stage mirrors it.
// side: where he lands (+1 behind the enemy, -1 in front), gap: how far from him, dur: until the enemy has come to rest,
// free: when the ronin has sheathed and the player has him back. run(S, t, R, E) poses both bodies at time t.
// S.tail(t0, from): how he ends from pose `from` at t0: sheathed if nobody is left near, else the blade stays out for the next K.
// bare: he never draws, so he never has to sheathe. unseen: the cuts were made before we saw them, so no blow lands (no knockback).
// end: where the player gets him back, x from the enemy in this frame ('start' = back where he flashed from). K reads it to
// pick an execution that leaves him in reach of another lone enemy.
const CY = '#6ff3e4', CY2 = '#b8fff6', WH = '#ffffff';
const head = (S, E, pose, vx, vz, va) => S.pieces.push(...toPieces(partOf(E, pose, { noHead: true }), [], E.y, P => { P.vz = vz; P.vx = vx; P.va = va; }));
export const EXECS = [
  { name: 'Behind the back', side: +1, gap: 10, dur: 2.2, free: 1.55,
    run(S, t, R, E) {
      const wait = pz({ hy: 3, lean: .25, chest: .15, fl: [.55, .85], bl: [-.5, .3], fa: HILT, ba: [-.3, .6] });
      const stab = pz({ hx: 1, hy: 3, lean: .38, chest: .36, fl: [.75, 1.05], bl: [-.65, .3], fa: [-2.25, .05], sword: Math.PI + .3, ba: [-.5, .5], hat: 1, flutter: 1 });   // the blade swept back, high: neck height
      const SLICE = .5;
      R.face = 1; R.pose = at([[0, wait], [SLICE - .02, wait], [SLICE, stab, lin], [.95, pz({ ...stab, lean: .4, flutter: 0 })], ...S.tail(.95, stab)], t);
      // the enemy, still facing away: resignation, then his arms open and the sword slips out of his hand
      const slump = pz({ hy: 3, lean: .2, chest: .38, fl: [.3, .45], bl: [-.3, .3], fa: [.55, .25], ba: [.35, .35], sword: 1.25 });
      const open = pz({ hy: 3, lean: .16, chest: .34, fl: [.3, .45], bl: [-.3, .3], fa: [1.2, -.1], ba: [-1.05, 0], sword: .9 });
      E.face = -1;
      // the blade goes in: his back arches, he looks down and finds the wound with his hand, his knees go, and he tips forward
      const opened = pz({ ...open, sword: null });
      const nh = o => pz({ ...o, noHead: true });
      E.pose = t < SLICE ? at([[0, EG], [.18, slump], [.4, open], [SLICE, opened]], t)
        : at([[SLICE, nh(opened)], [SLICE + .06, nh({ ...RX.jolt, fa: [1.3, .1], ba: [-1.2, .1] }), lin], [.9, nh({ ...RX.stiff, fa: [.9, .6], ba: [-.3, .5], sword: null })],
              [1.2, nh({ ...RX.sag, sword: null })], [1.45, nh(RX.kneel)], [1.68, nh(RX.handsDown)], [1.92, nh(RX.prone)]], t);
      S.once('drop', t >= SLICE - .05, () => dropSword(S, E, open, 1));
      S.once('stab', t >= SLICE, () => { F.hit(S, E, .1, .05); F.ghost(S, { ...R, pose: stab }, WH, .1); F.cut(S, E.x - 10, E.y - 18, E.x + 12, E.y - 19, .2);
        head(S, E, opened, -46, 165, -10);   // the head flies forward and up, away from the blade that took it
        F.burst(S, E.x, E.y - 18, 12); });
      if (t >= SLICE && t < 1.1 && Math.random() < .3) F.spark(S, E.x + rr(-1, 1), E.y - 17, rr(-15, 15), -rr(10, 30), .2, Math.random() < .5 ? CY2 : WH);
      S.once('click', t >= 1.3, () => F.slivers(S, E.x, E.y, 6));
    } },
  { name: 'Through and past', side: -1, gap: 22, end: 28, dur: 1.4, free: 1.02,
    run(S, t, R, E) {
      const crouch = pz({ hy: 4, lean: .6, chest: .15, fl: [.85, 1.45], bl: [-.85, .5], fa: HILT, ba: [-.05, .8] });
      const past = pz({ hx: 2, hy: 6, lean: .85, chest: .5, fl: [1.4, 1.6], bl: [-1.35, .05], fa: [1.5, -.05], sword: .25, ba: [-1.85, 0], hat: 1, flutter: 1 });
      const settle = pz({ hx: 1, hy: 5, lean: .7, chest: .4, fl: [1.3, 1.5], bl: [-1.2, .1], fa: [1.45, 0], sword: .35, ba: [-1.7, .05], hat: 1 });
      R.face = 1; R.pose = at([[0, crouch], [.07, past, hold], [.1, past], [.2, settle], [.42, settle], ...S.tail(.42, settle)], t);
      if (t >= .07) R.x = E.x + 28;
      S.once('pass', t >= .07, () => { const x0 = E.x - 22;
        for (let k = 0; k < 3; k++) F.ghost(S, { x: x0 + (E.x + 28 - x0) * (k + 1) / 4, y: R.y, face: 1, pose: lerpP(crouch, past, (k + 1) / 3) }, k % 2 ? CY2 : WH, .14 + k * .02);
        F.speed(S, x0, E.x + 28, R.y, 10); F.cut(S, E.x - 9, E.y - 16, E.x + 9, E.y - 7, .75); F.hit(S, E, .08, 1 / 60); });
      S.once('whiff', t >= .1, () => whiff(S, E, -1));
      // on the click the top half drops at once and pitches the way he turned, the legs fold back under it
      S.once('click', t >= .76, () => { F.burst(S, E.x, E.y - 11, 12);
        sever(S, E, [E.x - 9, E.y - 16, E.x + 9, E.y - 7], P => { P.x0 = P.x; P.z0 = P.z; P.script = fallScript(1, 1); }); });
      // he swings at empty air, folds over the cut, turns after him reaching, a hand goes to the wound, the legs start to go
      E.pose = at([[0, EG], [.05, RX.windup], [.07, RX.windup], [.11, RX.swung, lin], [.2, RX.doubled], [.3, RX.turning], [.36, RX.reach], [.58, RX.clutch], [.76, RX.sag], [.77, RX.legsSag], [1.0, RX.legsKneel], [1.3, RX.legsDown]], t);
      E.face = t >= .32 ? 1 : -1;
    } },
  { name: 'Rising launch', side: -1, gap: 9, dur: 1.5, free: 1.5,
    run(S, t, R, E) {
      const low = pz({ hy: 6, lean: .55, chest: .2, fl: [1.2, 1.9], bl: [-.2, 2.3], fa: [.4, .3], sword: 2.2, ba: [-.4, .5] });
      const up = pz({ hy: 0, lean: -.3, chest: -.45, fl: [.8, .3], bl: [-.8, .15], fa: [2.8, -.05], sword: -1.5, ba: [2.3, .2], hat: 1, flutter: 1 });
      const land = pz({ hx: 1, hy: 6, lean: .7, chest: .35, fl: [1.3, 1.7], bl: [-1.1, .2], fa: [1.05, .05], sword: 1.3, ba: [-1.2, .1], hat: 1 });
      R.face = 1; R.pose = at([[0, low], [.05, up, lin], [.14, up], [.62, land, hold], [.9, pz({ ...land, hy: 5, lean: .6 })], ...S.tail(.9, land)], t);
      R.hidden = t >= .13 && t < .62;   // gone from the ground: he is up among the pieces
      R.z = t >= .62 && t < .68 ? (1 - (t - .62) / .06) * 40 : 0;
      S.once('rise', t >= .05, () => { F.hit(S, E, .05, 1 / 60); F.cres(S, E.x - 3, E.y - 12, 1, 12, -1.2, 1, .14);
        sever(S, E, [E.x - 10, E.y - 9, E.x + 10, E.y - 11], P => { P.vz = 150; P.vx = 6; P.va = 5; }); });
      E.pose = t < .05 ? EG : at([[.05, pz({ ...RX.legsSag, hy: 2, fl: [.4, .5], bl: [-.45, .35] })], [.35, pz({ ...RX.legsSag, hx: 2 })], [.65, RX.legsKneel], [.95, RX.legsDown]], t);
      S.once('gone', t >= .13, () => F.slivers(S, R.x, R.y, 10));
      // the air: cut flashes on whatever is flying, and the pieces split and split again
      for (let i = 0; i < 5; i++) S.once('air' + i, t >= .2 + i * .075, () => {
        const air = S.pieces.filter(P => P.z > 12); if (!air.length) return;
        const P = air[Math.random() * air.length | 0], a = rr(0, 3.14), cx = P.x, cy = P.fy - P.z, L = [cx - Math.cos(a) * 9, cy - Math.sin(a) * 9, cx + Math.cos(a) * 9, cy + Math.sin(a) * 9];
        F.cut(S, L[0], L[1], L[2], L[3], .1); F.burst(S, cx, cy, 5, 110); splitPiece(S, P, L, 40); S.stop = Math.max(S.stop, .025); });
      S.once('down', t >= .68, () => { S.shake = .15; F.dust(S, R.x, R.y, 14); F.ring(S, R.x, R.y, 5, 2, .25, 20); F.crack(S, R.x + 4, R.y); });
      S.once('click', t >= 1.24, () => { for (const P of S.pieces) P.rest = 1, P.life = Math.min(P.life, .4); F.slivers(S, E.x, E.y + 4, 10); });
    } },
  { name: 'Whirlwind', side: -1, gap: 12, end: -14, dur: 1.5, free: 1.35,
    run(S, t, R, E) {
      const steps = [
        { t: 0,   dx: -11, dy: 2,  f: 1,  p: pz({ hy: 6, lean: .55, chest: .3, fl: [1.35, 1.6], bl: [-.45, 2.1], fa: [1.45, 0], sword: .4, ba: [-1.3, .2], flutter: 1 }), rot: .5 },
        { t: .08, dx: 11,  dy: -3, f: -1, p: pz({ hy: 3, lean: .75, chest: .45, fl: [1.1, 1.2], bl: [-1.0, .15], fa: [1.15, 0], sword: 1.15, ba: [-1.5, 0], hat: 1, flutter: 1 }), rot: -.9 },
        { t: .16, dx: -9,  dy: -4, f: 1,  p: pz({ hy: 1, lean: -.25, chest: -.45, fl: [.85, .35], bl: [-.85, .2], fa: [2.75, 0], sword: -1.35, ba: [2.2, .2], hat: 1 }), rot: -1.3 },
        { t: .24, dx: 2,   dy: 1,  f: -1, z: 12, p: pz({ lean: .6, chest: .35, fl: [1.2, 1.7], bl: [.3, 1.9], fa: [1.2, 0], sword: 1.35, ba: [-.9, .3], flutter: 1 }), rot: 1.4 },
        { t: .32, dx: 12,  dy: 3,  f: -1, p: pz({ hx: 2, hy: 4, lean: .6, chest: .3, fl: [1.2, 1.3], bl: [-1.2, .1], fa: [1.6, 0], sword: 0, ba: [-1.8, 0], flutter: 1 }), rot: 0 },
        { t: .42, dx: -14, dy: 0,  f: 1,  p: pz({ hx: 2, hy: 5, lean: .72, chest: .5, fl: [1.3, 1.45], bl: [-1.25, .1], fa: [1.35, .05], sword: .95, ba: [-1.7, .05], hat: 1 }), rot: .2, big: true },
      ];
      if (S.ex0 == null) S.ex0 = E.x;
      const ex = S.ex0;   // the enemy is flung at the end, so the cuts stay round where he stood
      let i = steps.length - 1; while (i > 0 && t < steps[i].t) i--;
      const st = steps[i];
      R.x = ex + st.dx; R.y = E.y + 1 + st.dy; R.face = st.f; R.z = st.z || 0;
      R.pose = t < .42 ? st.p : at([[.42, st.p], [.75, st.p], ...S.tail(.75, st.p)], t);
      steps.forEach((s, k) => S.once('w' + k, t >= s.t, () => {
        if (k) { const q = steps[k - 1]; F.ghost(S, { x: ex + q.dx, y: E.y + 1 + q.dy, z: q.z || 0, face: q.f, pose: q.p }, k % 2 ? CY : WH, .16); }
        F.cres(S, ex, E.y - 10, s.f, s.big ? 17 : 11, s.rot, sgn(), s.big ? .24 : .12);
        F.hit(S, E, s.big ? .1 : .03, s.big ? .06 : 0); F.burst(S, ex, E.y - 10, s.big ? 12 : 4, 110); E.jit = sgn(); }));
      E.face = -1;
      // every hit lands somewhere and the body gives there: legs swept, back struck, lifted from below, crushed from above, run through from behind
      const IMPACT = [
        pz({ hx: 1, hy: 4, lean: .35, chest: .2, fl: [.2, 1.6], bl: [-1.1, .6], fa: [1.9, .3], ba: [-.8, .4], sword: -.2 }),
        pz({ hx: 2, hy: 2, lean: -.25, chest: -.6, fl: [.55, .5], bl: [-.35, .3], fa: [.4, .8], ba: [1.6, .6], sword: .8 }),
        pz({ hx: -1, hy: 0, lean: -.4, chest: -.5, fl: [.3, .2], bl: [-.6, .2], fa: [2.8, .2], ba: [2.5, .3], sword: -1.4 }),
        pz({ hy: 6, lean: .45, chest: .6, fl: [1.0, 1.7], bl: [-.3, 1.5], fa: [.3, .6], ba: [.2, .6], sword: 1.3 }),
        pz({ hx: 3, hy: 3, lean: .65, chest: .5, fl: [.9, .8], bl: [-1.0, .3], fa: [1.2, .2], ba: [.9, .8], sword: 1.0 }),
      ];
      if (t < .42) E.pose = at([[0, EG], ...steps.flatMap((q, k) => [[q.t + .001, k ? IMPACT[k - 1] : EG], [q.t + .04, IMPACT[k], lin]])], t);
      // the wide final cut throws him: off his feet, flung back, coming apart in the air, pieces tumbling and skidding to rest
      if (t >= .42 && !E.gone) { const u = t - .42;
        E.x = ex + 80 * u; E.z = Math.max(0, 115 * u - 160 * u * u);
        E.pose = at([[.42, IMPACT[4]], [.47, pz({ hy: 1, lean: -.95, chest: -.45, fl: [1.3, .9], bl: [.7, 1.3], fa: [-1.9, .3], ba: [-2.4, .2], sword: null }), lin]], t); }
      S.once('fling', t >= .42, () => dropSword(S, { ...E, x: ex }, IMPACT[4], 1));
      S.once('apart', t >= .51, () => { const x = E.x, y = E.y - (E.z || 0), vz = 115 - 320 * .09;
        shatter(S, E, [[x - 10, y - 18, x + 8, y - 3], [x + 10, y - 16, x - 8, y - 4], [x - 12, y - 10, x + 12, y - 9]], (P, cx) => { P.vx = 62 + (cx - x) * 3 + rr(-12, 12); P.vz = vz + rr(-20, 25); P.va = rr(3, 8) * sgn(); });
        F.burst(S, x, y - 10, 14); F.slivers(S, x, E.y, 8); S.shake = .12; });
      if (t > .5) E.jit = 0;
    } },
  { name: 'Far behind', side: +1, gap: 52, dur: 1.4, free: 1.1,
    run(S, t, R, E) {
      const after = pz({ hx: 1, hy: 6, lean: .8, chest: .45, fl: [1.35, 1.6], bl: [-1.3, .05], fa: [1.45, -.05], sword: .3, ba: [-1.85, 0], hat: 1, flutter: 1 });
      R.face = 1; R.pose = at([[0, after], [.1, pz({ ...after, hy: 5, lean: .72, flutter: 0 })], [.5, pz({ ...after, hy: 5, lean: .7, flutter: 0 })], ...S.tail(.5, pz({ ...after, hy: 5, lean: .7 }))], t);
      S.once('line', true, () => { F.cut(S, E.x - 30, E.y - 11, R.x - 4, E.y - 11, .5); F.speed(S, E.x - 30, R.x, R.y, 12); F.hit(S, E, .06, 1 / 60); });
      const chestTouch = pz({ ...RX.guardUp, fa: [.9, .4], sword: .6, ba: [1.25, 1.55], lean: .08, chest: .15 });   // he feels something across his chest
      E.pose = at([[0, EG], [.1, RX.flinch], [.28, RX.turning], [.4, RX.guardUp], [.62, chestTouch], [.84, pz({ ...chestTouch, hy: 4 })], [.85, pz({ ...RX.legsSag, hy: 3 })], [1.15, RX.legsKneel], [1.45, RX.legsDown]], t);
      E.face = t >= .32 ? 1 : -1;
      // shoulder to hip: the top slides down the slope of the cut and off him, the legs are left to fold
      S.once('click', t >= .84, () => { const x = E.x;
        sever(S, E, [x - 9, E.y - 21, x + 9, E.y - 7], P => { P.x0 = P.x; P.z0 = P.z; P.script = slideOff(-1, .78); });
        F.cut(S, x - 9, E.y - 21, x + 9, E.y - 7, .5); F.burst(S, x, E.y - 13, 8); });
    } },
  { name: 'Peek-a-boo', side: -1, gap: 9, dur: 1.8, free: .9, stay: true, end: 'start', unseen: true,
    run(S, t, R, E) {
      const beside = pz({ fa: [.2, .25], lean: .02 });
      const home = pz({ hy: 2, lean: .2, fa: [1.45, .05], sword: 1.2, ba: [-.4, .3] });
      R.face = 1;
      if (t < .32) { R.pose = beside; R.glitch = t > .24 ? (t - .24) * 18 : 0; }
      else { R.x = S.start.x; R.y = S.start.y; R.pose = S.armed ? at([[.32, home], ...S.tail(.32, home)], t) : at([[.32, home], [.42, pz({ hy: 1, lean: .12, fa: [1.0, .6], sheathing: true, ba: [.45, 1.1] })], [.56, pz({ hy: 1, lean: .06, fa: HILT, ba: [.3, 1.0] })], [.9, IDLE]], t);
        R.glitch = t < .38 ? (.38 - t) * 18 : 0; }
      S.once('back', t >= .32, () => { F.slivers(S, E.x - 9, E.y, 8); F.slivers(S, S.start.x, S.start.y, 6); });
      if (!E.gone) E.pose = at([[0, EG], [.06, RX.flinch], [.22, RX.windup], [.3, RX.windup], [.36, RX.swung, lin], [.48, pz({ ...RX.swung, lean: .35, hy: 3 })], [.56, RX.turning], [.7, RX.handsLook]], t);
      S.once('whiff', t >= .35, () => whiff(S, E, -1));
      E.face = t >= .56 && t < .64 ? 1 : -1;
      S.once('drop', t >= .6, () => dropSword(S, E, RX.guardUp, 1));
      S.once('click', t >= .56, () => { const x = E.x, y = E.y;
        for (let k = 0; k < 5; k++) { const a = rr(0, 3.14); F.cut(S, x - Math.cos(a) * 12, y - 10 - Math.sin(a) * 12, x + Math.cos(a) * 12, y - 10 + Math.sin(a) * 12, .3); } });
      // the cuts glow on him while he looks down at his hands; then he comes apart as he sinks
      S.once('apart', t >= .82, () => { const x = E.x, y = E.y;
        shatter(S, E, [[x - 10, y - 20, x + 10, y], [x + 10, y - 20, x - 10, y], [x - 12, y - 12, x + 12, y - 8], [x - 3, y - 22, x + 2, y + 2]], (P, cx) => { P.vx = (cx - x) * 2.2; P.vz = rr(-25, -5); P.va = (cx - x) * .35 + rr(-1, 1); });
        S.shake = .08; F.burst(S, x, y - 10, 12); });
    } },
  { name: 'Peek-a-boo, from behind', side: +1, gap: 6, dur: 1.9, free: .6, stay: true, end: 'start', bare: true,
    run(S, t, R, E) {
      const reach = pz({ hy: 1, lean: .12, fl: [.3, .3], bl: [-.35, .3], fa: [2.0, .9], ba: [1.8, 1.0] });
      const grip = pz({ hy: 2, lean: .2, chest: .1, fl: [.4, .5], bl: [-.45, .4], fa: [2.25, 1.15], ba: [2.05, 1.25] });
      const twist = pz({ hy: 2, lean: .05, chest: -.3, fl: [.45, .5], bl: [-.5, .4], fa: [1.9, 1.3], ba: [2.5, .7], flutter: 1 });
      R.face = -1;
      if (t < .34) { R.pose = at([[0, reach], [.07, grip], [.15, twist, lin], [.34, twist]], t); R.glitch = t > .27 ? (t - .27) * 20 : 0; }
      else { R.x = S.start.x; R.y = S.start.y; R.face = 1; R.pose = at([[.34, pz({ fa: [.8, .9], ba: [.6, .9] })], [.6, IDLE]], t); R.glitch = t < .4 ? (.4 - t) * 18 : 0; }
      // no blade at all: he snaps the head round
      S.once('snap', t >= .15, () => { S.stop = .1; S.shake = 1 / 60; E.flashT = .05;
        for (let k = 0; k < 4; k++) F.spark(S, E.x + rr(-2, 2), E.y - 18, rr(-40, 40), rr(-30, 0), .1, WH, true); });
      E.face = t >= .15 && t < .2 ? 1 : -1;
      // the head is wrenched round to face backward; the body is dragged after it: a stagger back toward the twist, the knees go, over onto his back
      const hf = o => pz({ ...o, headFlip: true });
      const wrenched = hf({ hx: -1, hy: 2, lean: -.3, chest: -.55, fl: [.35, .4], bl: [-.45, .35], fa: [.5, .5], ba: [-.6, .3], sword: 1.1 });
      E.pose = t < .19 ? at([[0, EG], [.06, RX.flinch], [.15, RX.flinch]], t)
        : at([[.19, wrenched, lin], [.36, hf({ ...wrenched, hx: -3, lean: -.42, chest: -.62, fl: [.15, .3], bl: [-.75, .4] })],
              [.54, hf({ hx: -4, hy: 5, lean: -.55, chest: -.55, fl: [.85, 1.35], bl: [-.25, 1.15], fa: [.2, .4], ba: [-.9, .3], sword: null })],
              [.74, hf({ ...RX.handsBack, hx: -5 })], [.96, hf({ ...RX.supine, hx: -5 })]], t);
      S.once('drop', t >= .45, () => dropSword(S, E, wrenched, 1));
      S.once('back', t >= .34, () => { F.slivers(S, E.x + 6, E.y, 8); F.slivers(S, S.start.x, S.start.y, 6); });
    } },
];
