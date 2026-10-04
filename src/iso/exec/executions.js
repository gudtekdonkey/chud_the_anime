// ---- The executions on the 3D test level: the approved batch 1 (today's src/assassin/executions.js, from
// prototypes/14-executions-batch-1.html) re-staged in 3D, five of them, on the same beats: Behind the back, Through and
// past, Whirlwind, Far behind, Peek-a-boo. Each runs in its stage's frame: the samurai at 0 facing −x (toward where the
// ronin came from), x along the line he came in on, y across it, heights in world units (≈ the old game's px).
// side: +1 he lands behind the samurai, −1 in front; gap: how far; dur: until the samurai has come to rest; kill: the
// killing blow (he is dead from there); free: the player has the ronin back. run(S, t, R, E) poses both bodies at t;
// S.tail(t0, from) is the batch's quick sheathe (the flick, the tip into the saya, the click at t0 + 0.34).
// The cuts are real: S.sever takes the part off the 3D model as a piece (sever.js); blood by weight (fx/blood.js).
// Sharper (owner 3A, 2026-10-04: "Too slow to start", "Same feel each time"): a 0.06 s set (`pre`, was 0.2), the first
// blow inside 0.1 s of landing, fewer keys leaning harder, the ronin back by ~0.8 s, the pieces thrown harder; and each
// kills its own way: one thrust (Behind the back), the click (Through and past), a flurry (Whirlwind), dead before he
// turns (Far behind), never there (Peek-a-boo).
import { H, rnd } from 'ronin-engine/flow/flow.js';
import { STOP } from 'ronin-engine/clock/world.js';
import { at, pose, HR, EG, RX, WHIRL } from 'ronin-engine/iso/exec/poses.js';
import { EXECS as REG } from 'ronin-engine/iso/exec/registry.js';

const sgn = () => rnd() < .5 ? -1 : 1;
export const EXECS = REG; REG.push(
  { name: 'Behind the back', side: +1, gap: 10, pre: .06, dur: 1.3, kill: .1,
    run(S, t, R, E) {
      const IN = .1;   // one thrust, no wind-up: he lands already low and drives it in
      R.face = 1; R.pose = at([[0, HR.wait], [IN, HR.stab, 'lin'], [.3, { ...HR.stab, lean: .5 }], ...S.tail(.3, HR.stab)], t);
      E.face = -1;
      E.pose = t < IN ? at([[0, EG], [IN, RX.slump]], t)
        // the blade goes in: he jolts up stiff, sags, kneels and goes down on his face
        : at([[IN, RX.slump], [IN + .04, RX.jolt, 'lin'], [.3, RX.stiff], [.5, RX.sagB], [.68, RX.kneel], [.86, RX.handsDown], [1.05, RX.prone]], t);
      S.once('drop', t >= IN - .03, () => S.drop([-8, 10, 2]));
      S.once('stab', t >= IN, () => { S.hit(STOP.kill); S.ghost(HR.stab, R.x, R.y, 0, 1, 'w', .1); S.line(-10, 18, 12, 19, .2); S.shake(1.1, .1);
        S.sever('head', { v: [-32, 80, 0], spin: -12 });   // the head flies forward and up, away from the blade that took it
        S.blood(-1, 17.5, -.6, 1, 'kill'); S.burst(0, 18, 14); S.kill(); });
      if (t >= IN && t < .5 && rnd() < .3) S.burst(rnd() * 2 - 1, 17, 1);
      S.once('slivers', t >= .7, () => S.slivers(0, 4, 6));
    } },
  { name: 'Through and past', side: -1, gap: 22, pre: .06, dur: 1.1, kill: .54,
    run(S, t, R, E) {
      R.face = 1; R.pose = at([[0, HR.crouch], [.04, HR.past, 'hold'], [.06, HR.past], [.14, HR.settle], [.2, HR.settle], ...S.tail(.2, HR.settle)], t);
      if (t >= .04) R.x = 28;
      S.once('pass', t >= .04, () => { const x0 = -22;
        for (let k = 0; k < 3; k++) S.ghost(at([[0, HR.crouch], [1, HR.past]], (k + 1) / 3), x0 + (28 - x0) * (k + 1) / 4, 0, 0, 1, k % 2 ? 'c' : 'w', .14 + k * .02);
        S.speed(x0, 28, 10); S.line(-9, 16, 9, 7, .55); S.hit(STOP.heavy); S.blood(0, 11, 1, .25, 'heavy'); });
      S.once('whiff', t >= .06, () => S.dust(-8, 4));
      // the one that waits: on the click the top half drops at once and pitches the way he turned, the legs fold under it
      S.once('click', t >= .54, () => { S.burst(0, 11, 14); S.drop([12, 8, -3]); S.sever('upper', { v: [16, 6, 0], spin: 4.5 }); S.blood(0, 10, .3, 1, 'kill'); S.shake(1, .08); S.kill(); });
      // he swings at empty air, folds over the cut, turns after him reaching, a hand to the wound, the legs go
      E.pose = at([[0, EG], [.03, RX.windup], [.07, RX.swung, 'lin'], [.14, RX.doubled], [.22, RX.turning], [.28, RX.reach], [.42, RX.clutch], [.54, RX.sag],
        [.55, RX.legsSag], [.75, RX.legsKneel], [1.0, RX.legsDown]], t);
      E.face = t >= .22 ? 1 : -1;
    } },
  { name: 'Whirlwind', side: -1, gap: 12, pre: .06, dur: 1.0, kill: .252,
    run(S, t, R, E) {
      const K = .6, WH = WHIRL.map(s => ({ ...s, t: s.t * K })), END = WH.at(-1).t;   // the batch's six cuts at 1.7× the pace
      let i = WH.length - 1; while (i > 0 && t < WH[i].t) i--;
      const st = WH[i];
      R.x = st.dx; R.y = st.dy + 1; R.face = st.f; R.z = st.z || 0;
      R.pose = t < END ? st.p : at([[END, st.p], [.45, st.p], ...S.tail(.45, st.p)], t);
      WH.forEach((s, k) => S.once('w' + k, t >= s.t, () => {
        if (k) { const q = WH[k - 1]; S.ghost(q.p, q.dx, q.dy + 1, q.z || 0, q.f, k % 2 ? 'c' : 'w', .12); }
        S.cres(0, 10, s.f, s.big ? 19 : 11, s.rot, s.big ? .22 : .1);
        S.hit(s.big ? STOP.kill : STOP.light); S.burst(0, 10, s.big ? 14 : 4); S.blood(0, 10 + Math.sin(s.rot) * 3, s.f, -Math.sin(s.rot) * .6, s.big ? 'kill' : 'light', { noGush: !s.big });
        if (s.big) S.kill(); }));
      // every hit lands somewhere and the body gives there; the wide last cut throws him off his feet
      E.face = -1;
      if (t < END) E.pose = at([[0, EG], ...WH.slice(0, 5).flatMap((q, k) => [[q.t + .001, k ? RX.impact[k - 1] : EG], [q.t + .025, RX.impact[k], 'lin']]), [END, RX.impact[4]]], t);
      else { const u = t - END; E.x = 100 * u; E.z = Math.max(0, 130 * u - 190 * u * u); E.pose = at([[END, RX.impact[4]], [END + .04, RX.flung, 'lin']], t); }
      S.once('fling', t >= END, () => S.drop([40, 34, 4]));
      // coming apart in the air: the pieces tumble and skid to rest
      S.once('apart', t >= END + .06, () => { const v = (x, h, y) => ({ v: [46 + x + rnd() * 12, 32 + h + rnd() * 14, y * 1.3], spin: (5 + rnd() * 6) * sgn() });
        S.sever('head', v(8, 18, -3)); S.sever('armR', v(2, 8, -6)); S.sever('armL', v(4, 8, 6)); S.sever('upper', v(0, 10, 0)); S.sever('thighL', v(-6, 0, 4)); S.sever('all', v(-10, -4, -2));
        S.burst(E.x, 10 + E.z, 16); S.slivers(E.x, 0, 8); S.blood(E.x, 10 + E.z, 1, .4, 'kill'); S.shake(1.3, .12); });
    } },
  { name: 'Far behind', side: +1, gap: 52, pre: .06, dur: 1.0, kill: .12,
    run(S, t, R, E) {
      const low = { ...HR.after, pel: [2, H - 5], lean: .8 };
      R.face = 1; R.pose = at([[0, HR.after], [.08, low], [.3, low], ...S.tail(.3, low)], t);
      S.once('line', true, () => { S.line(-30, 11, R.x - 4, 11, .45); S.speed(-30, R.x, 12); S.hit(STOP.heavy); S.blood(0, 11, 1, .15, 'light'); });
      // dead before he can turn: a flinch, a hand half way to his chest, and the top slides off down the slope of the cut
      E.face = -1;
      E.pose = at([[0, EG], [.06, RX.flinch], [.12, RX.chestTouch], [.13, RX.legsSag], [.4, RX.legsKneel], [.7, RX.legsDown]], t);
      S.once('slide', t >= .12, () => { S.drop([10, 6, 3]); S.sever('upper', { v: [12, -2, 0], spin: 2.8, float: .4 }); S.line(-9, 21, 9, 7, .4); S.burst(0, 13, 10); S.blood(0, 12, .4, 1, 'kill'); S.kill(); });
    } },
  { name: 'Peek-a-boo', side: -1, gap: 9, pre: .06, dur: 1.1, kill: .4, unseen: true,
    run(S, t, R, E) {
      R.face = 1;
      if (t < .14) { R.pose = HR.beside; R.glitch = t > .1 ? (t - .1) * 30 : 0; }
      else { R.x = S.start.x; R.y = S.start.y; R.face = S.start.face; R.pose = at([[.14, HR.home], ...S.tail(.14, HR.home, [.08, .16, .22, .5])], t); R.glitch = t < .18 ? (.18 - t) * 30 : 0; }
      S.once('back', t >= .14, () => { S.slivers(-9, 0, 8); S.slivers(S.start.x, 0, 6, S.start.y); });
      // he swings at where the ronin stood, turns, looks down at his hands
      E.pose = at([[0, EG], [.04, RX.windup], [.1, RX.swung, 'lin'], [.18, pose({ ...RX.swung, pel: [6, H - 4], lean: .35 })], [.22, RX.turning], [.3, RX.handsLook]], t);
      S.once('whiff', t >= .1, () => S.dust(-8, 4));
      E.face = t >= .22 && t < .28 ? 1 : -1;
      S.once('drop', t >= .26, () => S.drop([-5, 8, 3]));
      // the cuts glow on him; then he comes apart as he sinks
      S.once('cuts', t >= .22, () => { for (let k = 0; k < 5; k++) { const a = rnd() * 3.14; S.line(-Math.cos(a) * 12, 10 - Math.sin(a) * 12, Math.cos(a) * 12, 10 + Math.sin(a) * 12, .22); } });
      S.once('apart', t >= .4, () => { const v = (x, h, y) => ({ v: [x * 3, h * 1.3, y * 3], spin: (x + rnd() - .5) * .9 });
        S.sever('head', v(1, 6, 0)); S.sever('armR', v(-2, 2, -3)); S.sever('armL', v(2, 2, 3)); S.sever('upper', v(-1, 0, 0)); S.sever('thighR', v(2, -2, -2)); S.sever('all', v(-2, -2, 1));
        S.shake(1, .08); S.burst(0, 10, 14); for (const h of [17, 12, 7]) S.blood(0, h, rnd() - .5, .6, 'heavy', { k: .7 }); S.kill(); });
    } },
);
