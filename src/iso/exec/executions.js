// ---- The executions on the 3D test level: the approved batch 1 (today's src/assassin/executions.js, from
// prototypes/14-executions-batch-1.html) re-staged in 3D, five of them, on the same beats: Behind the back, Through and
// past, Whirlwind, Far behind, Peek-a-boo. Each runs in its stage's frame: the samurai at 0 facing −x (toward where the
// ronin came from), x along the line he came in on, y across it, heights in world units (≈ the old game's px).
// side: +1 he lands behind the samurai, −1 in front; gap: how far; dur: until the samurai has come to rest; kill: the
// killing blow (he is dead from there); free: the player has the ronin back. run(S, t, R, E) poses both bodies at t;
// S.tail(t0, from) is the batch's quick sheathe (the flick, the tip into the saya, the click at t0 + 0.34).
// The cuts are real: S.sever takes the part off the 3D model as a piece (sever.js); blood by weight (fx/blood.js).
import { H, rnd } from 'ronin-engine/flow/flow.js';
import { STOP } from 'ronin-engine/clock/world.js';
import { at, pose, HR, EG, RX, WHIRL } from './poses.js';

const sgn = () => rnd() < .5 ? -1 : 1;
export const EXECS = [
  { name: 'Behind the back', side: +1, gap: 10, dur: 2.2, kill: .5,
    run(S, t, R, E) {
      const SLICE = .5;
      R.face = 1; R.pose = at([[0, HR.wait], [SLICE - .02, HR.wait], [SLICE, HR.stab, 'lin'], [.95, { ...HR.stab, lean: .42 }], ...S.tail(.95, HR.stab)], t);
      // still facing away: resignation, then his arms open and the sword slips out of his hand
      E.face = -1;
      E.pose = t < SLICE ? at([[0, EG], [.18, RX.slump], [.4, RX.open], [SLICE, RX.opened]], t)
        // the blade goes in: his back arches, the hand finds the wound, his knees go, and he tips forward
        : at([[SLICE, RX.opened], [SLICE + .06, RX.jolt, 'lin'], [.9, RX.stiff], [1.2, RX.sagB], [1.45, RX.kneel], [1.68, RX.handsDown], [1.92, RX.prone]], t);
      S.once('drop', t >= SLICE - .05, () => S.drop([-6, 8, 2]));
      S.once('stab', t >= SLICE, () => { S.hit(STOP.kill); S.ghost(HR.stab, R.x, R.y, 0, 1, 'w', .1); S.line(-10, 18, 12, 19, .2);
        S.sever('head', { v: [-24, 62, 0], spin: -9 });   // the head flies forward and up, away from the blade that took it
        S.blood(-1, 17.5, -.6, 1, 'kill'); S.burst(0, 18, 12); S.kill(); });
      if (t >= SLICE && t < 1.1 && rnd() < .3) S.burst(rnd() * 2 - 1, 17, 1);
      S.once('slivers', t >= 1.3, () => S.slivers(0, 4, 6));
    } },
  { name: 'Through and past', side: -1, gap: 22, dur: 1.4, kill: .76,
    run(S, t, R, E) {
      R.face = 1; R.pose = at([[0, HR.crouch], [.07, HR.past, 'hold'], [.1, HR.past], [.2, HR.settle], [.42, HR.settle], ...S.tail(.42, HR.settle)], t);
      if (t >= .07) R.x = 28;
      S.once('pass', t >= .07, () => { const x0 = -22;
        for (let k = 0; k < 3; k++) S.ghost(at([[0, HR.crouch], [1, HR.past]], (k + 1) / 3), x0 + (28 - x0) * (k + 1) / 4, 0, 0, 1, k % 2 ? 'c' : 'w', .14 + k * .02);
        S.speed(x0, 28, 10); S.line(-9, 16, 9, 7, .75); S.hit(STOP.heavy); S.blood(0, 11, 1, .25, 'heavy'); });
      S.once('whiff', t >= .1, () => S.dust(-8, 4));
      // on the click the top half drops at once and pitches the way he turned, the legs fold back under it
      S.once('click', t >= .76, () => { S.burst(0, 11, 12); S.drop([10, 6, -3]); S.sever('upper', { v: [12, 4, 0], spin: 3.5 }); S.blood(0, 10, .3, 1, 'kill'); S.kill(); });
      // he swings at empty air, folds over the cut, turns after him reaching, a hand goes to the wound, the legs go
      E.pose = at([[0, EG], [.05, RX.windup], [.07, RX.windup], [.11, RX.swung, 'lin'], [.2, RX.doubled], [.3, RX.turning], [.36, RX.reach], [.58, RX.clutch], [.76, RX.sag],
        [.77, RX.legsSag], [1.0, RX.legsKneel], [1.3, RX.legsDown]], t);
      E.face = t >= .32 ? 1 : -1;
    } },
  { name: 'Whirlwind', side: -1, gap: 12, dur: 1.5, kill: .42,
    run(S, t, R, E) {
      let i = WHIRL.length - 1; while (i > 0 && t < WHIRL[i].t) i--;
      const st = WHIRL[i];
      R.x = st.dx; R.y = st.dy + 1; R.face = st.f; R.z = st.z || 0;
      R.pose = t < .42 ? st.p : at([[.42, st.p], [.75, st.p], ...S.tail(.75, st.p)], t);
      WHIRL.forEach((s, k) => S.once('w' + k, t >= s.t, () => {
        if (k) { const q = WHIRL[k - 1]; S.ghost(q.p, q.dx, q.dy + 1, q.z || 0, q.f, k % 2 ? 'c' : 'w', .16); }
        S.cres(0, 10, s.f, s.big ? 17 : 11, s.rot, s.big ? .24 : .12);
        S.hit(s.big ? STOP.kill : STOP.light); S.burst(0, 10, s.big ? 12 : 4); S.blood(0, 10 + Math.sin(s.rot) * 3, s.f, -Math.sin(s.rot) * .6, s.big ? 'kill' : 'light', { noGush: !s.big });
        if (s.big) S.kill(); }));
      // every hit lands somewhere and the body gives there; the wide final cut throws him off his feet
      E.face = -1;
      if (t < .42) E.pose = at([[0, EG], ...WHIRL.slice(0, 5).flatMap((q, k) => [[q.t + .001, k ? RX.impact[k - 1] : EG], [q.t + .04, RX.impact[k], 'lin']]), [.42, RX.impact[4]]], t);
      else { const u = t - .42; E.x = 80 * u; E.z = Math.max(0, 115 * u - 160 * u * u); E.pose = at([[.42, RX.impact[4]], [.47, RX.flung, 'lin']], t); }
      S.once('fling', t >= .42, () => S.drop([34, 30, 4]));
      // coming apart in the air: the pieces tumble and skid to rest
      S.once('apart', t >= .51, () => { const v = (x, h, y) => ({ v: [36 + x + rnd() * 10, 26 + h + rnd() * 12, y], spin: (4 + rnd() * 5) * sgn() });
        S.sever('head', v(8, 18, -3)); S.sever('armR', v(2, 8, -6)); S.sever('armL', v(4, 8, 6)); S.sever('upper', v(0, 10, 0)); S.sever('thighL', v(-6, 0, 4)); S.sever('all', v(-10, -4, -2));
        S.burst(E.x, 10 + E.z, 14); S.slivers(E.x, 0, 8); S.blood(E.x, 10 + E.z, 1, .4, 'kill'); S.shake(1.2, .12); });
    } },
  { name: 'Far behind', side: +1, gap: 52, dur: 1.4, kill: .84,
    run(S, t, R, E) {
      const low = { ...HR.after, pel: [2, H - 5], lean: .72 };
      R.face = 1; R.pose = at([[0, HR.after], [.1, low], [.5, low], ...S.tail(.5, low)], t);
      S.once('line', true, () => { S.line(-30, 11, R.x - 4, 11, .5); S.speed(-30, R.x, 12); S.hit(STOP.light); S.blood(0, 11, 1, .15, 'light'); });
      // he feels something across his chest
      E.pose = at([[0, EG], [.1, RX.flinch], [.28, RX.turning], [.4, RX.guardUp], [.62, RX.chestTouch], [.84, pose({ ...RX.chestTouch, pel: [0, H - 5] })],
        [.85, RX.legsSag], [1.15, RX.legsKneel], [1.45, RX.legsDown]], t);
      E.face = t >= .32 ? 1 : -1;
      // shoulder to hip: the top slides down the slope of the cut and off him, the legs are left to fold
      S.once('click', t >= .84, () => { S.drop([8, 4, 3]); S.sever('upper', { v: [9, -3, 0], spin: 2.2, float: .4 }); S.line(-9, 21, 9, 7, .5); S.burst(0, 13, 8); S.blood(0, 12, .4, 1, 'kill'); S.kill(); });
    } },
  { name: 'Peek-a-boo', side: -1, gap: 9, dur: 1.8, kill: .82, unseen: true,
    run(S, t, R, E) {
      R.face = 1;
      if (t < .32) { R.pose = HR.beside; R.glitch = t > .24 ? (t - .24) * 18 : 0; }
      else { R.x = S.start.x; R.y = S.start.y; R.face = S.start.face; R.pose = at([[.32, HR.home], ...S.tail(.32, HR.home, [.1, .18, .24, .58])], t); R.glitch = t < .38 ? (.38 - t) * 18 : 0; }
      S.once('back', t >= .32, () => { S.slivers(-9, 0, 8); S.slivers(S.start.x, 0, 6, S.start.y); });
      // he swings at where the ronin stood, turns, looks down at his hands
      E.pose = at([[0, EG], [.06, RX.flinch], [.22, RX.windup], [.3, RX.windup], [.36, RX.swung, 'lin'], [.48, pose({ ...RX.swung, pel: [6, H - 4], lean: .35 })], [.56, RX.turning], [.7, RX.handsLook]], t);
      S.once('whiff', t >= .35, () => S.dust(-8, 4));
      E.face = t >= .56 && t < .64 ? 1 : -1;
      S.once('drop', t >= .6, () => S.drop([-4, 6, 3]));
      // the cuts glow on him; then he comes apart as he sinks
      S.once('cuts', t >= .56, () => { for (let k = 0; k < 5; k++) { const a = rnd() * 3.14; S.line(-Math.cos(a) * 12, 10 - Math.sin(a) * 12, Math.cos(a) * 12, 10 + Math.sin(a) * 12, .3); } });
      S.once('apart', t >= .82, () => { const v = (x, h, y) => ({ v: [x * 2.2, h, y * 2.2], spin: (x + rnd() - .5) * .7 });
        S.sever('head', v(1, 6, 0)); S.sever('armR', v(-2, 2, -3)); S.sever('armL', v(2, 2, 3)); S.sever('upper', v(-1, 0, 0)); S.sever('thighR', v(2, -2, -2)); S.sever('all', v(-2, -2, 1));
        S.shake(.8, .08); S.burst(0, 10, 12); for (const h of [17, 12, 7]) S.blood(0, h, rnd() - .5, .6, 'heavy', { k: .7 }); S.kill(); });
    } },
];
