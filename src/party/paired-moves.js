import { S } from '../state.js';
import { COL } from '../config.js';
import { pz } from 'ronin-engine/rig/pose.js';
import { RX } from '../assassin/enemy-poses.js';
import { blades } from '../world/enemies.js';
import { residue, spark, ring, rr, sgn } from '../fx/util.js';
import { zap } from '../fx/bolts.js';
import { bleed } from '../fx/blood.js';
import { slay, halve, cutLine, rope, ghost, wx, wy } from './paired.js';

// ---- The paired executions' choreography (the data, names and needs, is PAIRED in party/kit.js) ----
// Each run(x, t) poses three actors in a frame local to the enemy: x.E (him, at 0), x.H (the ronin, on the + side, facing -1 toward
// him) and x.A (the partner, who starts wherever they stood). An actor is { lx, ly, z (off the floor), f (1 faces +), anim, at
// (seconds into it), rot (turned about the middle, + is clockwise facing -), hide, flash (until t), alpha }. x.E takes keys
// ([t, pose] from E.k0) or a pose. They only show the key frames, each leaning into the motion (design notes), and every one is
// the two weapons working together.
const cl = v => Math.max(0, Math.min(1, v)), k = (t, a, b) => cl((t - a) / (b - a));
const ez = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, out = u => 1 - (1 - u) * (1 - u), inn = u => u * u;
const to = (A, p, q, u) => { A.lx = p[0] + (q[0] - p[0]) * u; A.ly = p[1] + (q[1] - p[1]) * u; };
const play = (A, anim, at) => { A.anim = anim; A.at = Math.max(0, at); };
const react = (x, t, keys) => { x.E.keys = [[0, x.E.pose], ...keys]; x.E.k0 = t; };
const fall = { fwd: [[.12, RX.sag], [.32, RX.kneel], [.5, RX.handsDown], [.7, RX.prone]], back: [[.15, RX.handsBack], [.45, RX.supine]] };
const DISARMED = pz({ ...RX.swung, sword: null });
// the partner closes on their mark as the ronin lands on his, a trail of afterimages behind them
function rush(x, t, dt, mark, T = .18, f = 1) {
  const A = x.A; A.f = f; if (t < T) { to(A, x.a0, mark, ez(t / T)); play(A, 'run', t); trail(x, 'A', t, dt); } else [A.lx, A.ly] = mark; }
function trail(x, who, t, dt, every = .06) { if (Math.floor(t / every) !== Math.floor((t - dt) / every)) ghost(x, who, .22); }
// he breaks into slices where he was and lands on his mark (the solo K's flash, without the stage)
function land(x, mark, f = -1) { const H = x.H; x.once('land' + mark, true, () => { [H.lx, H.ly] = mark; H.f = f; residue(wx(x, mark[0]), wy(x, mark[1]), 6); }); }
function hit(x, t, stop = .09, shake = .15) { x.E.flash = t + 2 / 60; S.hitstop = Math.max(S.hitstop, stop); S.shake = Math.max(S.shake, shake); }
// both put the weapon away (a pole is only lowered: its sheathe is its own pose), him quicker than a calm resheathe
function sheatheAll(x, t, t0, who = 'HA') { for (const c of who) play(x[c], 'sheathe', (t - t0) * 2.4); }
const sparks = (x, lx, ly, n, col = '#ffffff', sp = 60) => { for (let i = 0; i < n; i++) spark(wx(x, lx), wy(x, ly), rr(-sp, sp), -rr(0, sp), rr(.15, .35), col, true); };
const bolt = (x, lx0, ly0, lx1, ly1) => zap(wx(x, lx0), wy(x, ly0), wx(x, lx1), wy(x, ly1), .12, 2.2, COL.fx2);
// a piece on the floor that topples over: it slides off the cut toward dir (+ the ronin's side), turns flat and drops (the solo
// executions' fallScript, in local terms)
const topple = (dir, delay = 0, spin = 1.55, drift = 1) => ({ script: t => { const u = Math.max(0, t - delay), q = Math.min(1, u / .45);
  return { dx: dir * drift * (u * 8 + q * 5), dz: -60 * q * q, a: dir * spin * ez(q), done: t > 1.5 + delay }; } });
// the halves of a cut down his middle fall away from each other
const apart = (delay = 0) => (Q, dx) => topple(Math.sign(dx) || 1, delay + rr(0, .08), 1.55, 1.3);

export const RUNS = {
  // the crossing cut: he glitches to the near side, the partner closes on the far side, both pass through him and past each
  // other, hold, and resheathe together; he falls on the click
  cross: { dur: 1.3, run(x, t, dt) { const { H, A } = x;
    land(x, [13, 0]); rush(x, t, dt, [-13, 0], .16);
    if (t < .16) { play(H, 'slash1', Math.min(t, .09)); if (t >= .1) play(A, 'slash1', Math.min(t, .09)); }
    else if (t < .26) { const u = ez((t - .16) / .1); to(H, [13, 0], [-20, 2], u); to(A, [-13, 0], [20, -2], u);
      play(H, 'slash1', .09 + (t - .16) * 1.2); play(A, 'slash1', .09 + (t - .16) * 1.2); trail(x, 'H', t, dt, .03);
      x.once('cut', t >= .2, () => { hit(x, t); S.impact = 2; cutLine(x, 0, -11, 1, .6); cutLine(x, 0, -11, 1, -.7); react(x, t, [[.06, RX.jolt]]); }); }
    else if (t < .8) { play(H, 'slash1', .21 + (t - .26)); play(A, 'slash1', .21 + (t - .26)); }
    else { sheatheAll(x, t, .8); x.once('click', t >= 1.12, () => { react(x, t, fall.fwd); slay(x, { stop: 0, shake: .1, impact: false }); }); } } },

  // the partner plants the pole at his side, he runs up it and they heave: a flip over the enemy, and down through his head
  vault: { dur: 1.9, run(x, t, dt) { const { H, A, E } = x;
    land(x, [32, 0]); rush(x, t, dt, [11, 2], .2, -1);
    if (t >= .2) play(A, 'slash5', t < .4 ? .06 : .06 + (t - .4) * 1.1);   // crouched on the pole, then the heave
    if (t < .2) play(H, 'ready', t);
    else if (t < .4) { to(H, [32, 0], [13, 0], (t - .2) / .2); play(H, 'run', t); }
    else if (t < .88) { const u = (t - .4) / .48; to(H, [13, 0], [-3, 0], out(u)); H.z = 50 * Math.sin(u * Math.PI / 2); H.rot = -2 * Math.PI * ez(u);
      play(H, 'jump', .15); trail(x, 'H', t, dt);
      x.once('heave', true, () => { sparks(x, 12, -20, 6, COL.fx2); react(x, t, [[.25, RX.guardUp]]); }); }
    else if (t < .96) { H.rot = 0; H.z = 50; play(H, 'moon', (t - .88) * 1.5); }
    else if (t < 1.04) { H.z = 50 * (1 - inn((t - .96) / .08)); play(H, 'moon', .15 + (t - .96) * 2); trail(x, 'H', t, dt, .02); }
    else { H.z = 0; play(H, t < 1.4 ? 'slash6' : 'sheathe', t < 1.4 ? .6 : (t - 1.4) * 2.4); if (t >= 1.4) play(A, 'ready', t); }
    x.once('split', t >= 1.04, () => { hit(x, t, .12, .2); S.impact = 2; bolt(x, 0, -80, 0, -2); cutLine(x, 0, -14, 0, 1, 16);
      halve(x, [[0, -60, 0, 4]], apart(.04)); slay(x, { stop: .12, shake: .2 }); sparks(x, 0, -2, 8); }); } },

  // their heavy swing lifts him; he blinks above and cuts him in two in the air
  batter: { dur: 1.8, run(x, t, dt) { const { H, A, E } = x;
    land(x, [14, 0]); rush(x, t, dt, [-12, 0]);
    if (t >= .18) play(A, t < .9 ? 'slash5' : 'ready', t < .9 ? (t - .18) * .9 : t);
    x.once('launch', t >= .36, () => { hit(x, t, .08, .18); sparks(x, -4, -10, 8); react(x, t, [[.15, RX.handsBack]]); bleed(wx(x, 0), wy(x, 0), 10, -x.s, .6); });
    if (t >= .36 && !E.gone) { const u = k(t, .36, .72); E.z = 54 * Math.sin(u * Math.PI / 2); E.lx = 4 * u; E.rot = -1.2 * u; }
    if (t < .45) play(H, 'ready', t);
    else if (t < .62) { x.once('blink', true, () => { residue(wx(x, 14), wy(x, 0), 8); H.hide = true; }); }
    else if (t < .78) { x.once('above', true, () => { H.hide = false; [H.lx, H.ly] = [6, 0]; residue(wx(x, 6), wy(x, -64), 8); });
      H.z = 64 - 8 * k(t, .62, .78); play(H, 'moon', (t - .62) * 1.6); }
    else if (t < 1.08) { const u = k(t, .78, 1.08); H.z = 56 * (1 - inn(u)); H.lx = 6 - 4 * u; play(H, 'fall', t); }
    else { H.z = 0; play(H, t < 1.3 ? 'land' : 'sheathe', t < 1.3 ? t - 1.08 : (t - 1.3) * 2.4); x.once('down', true, () => sparks(x, 2, 0, 6, '#8f9692', 30)); }
    x.once('split', t >= .74, () => { hit(x, t, .1, .18); cutLine(x, 3, -E.z - 12, 1, .15, 15);
      halve(x, [[-20, -12, 20, -12]], (Q, dx, h) => h > 12 ? { vx: 25, vz: 45, va: 5 } : { vx: -15, vz: 12, va: -4 }); slay(x, { stop: .1, shake: .18 }); }); } },

  // the chain takes him by the neck and yanks him through the ronin's draw
  reel: { dur: 1.8, run(x, t, dt) { const { H, A, E } = x;
    land(x, [-15, 0], 1); rush(x, t, dt, [-38, 0]);
    const hand = [A.lx + 7, -14];
    if (t >= .18) play(A, t < 1 ? 'slash1' : 'ready', t < 1 ? (t - .18) * .8 : t);
    if (t >= .2 && t < .36) rope(x, hand, [hand[0] + (E.lx - hand[0]) * k(t, .2, .34), hand[1] + (-20 - hand[1]) * k(t, .2, .34)], 'chain');
    else if (t >= .36 && !E.gone) rope(x, hand, [E.lx, -20 - E.z], 'chain');
    x.once('wrap', t >= .34, () => { sparks(x, 0, -20, 5, COL.fx2, 30); react(x, t, [[.08, RX.jolt]]); });
    if (t >= .48 && !E.gone) { const u = inn(k(t, .48, .62)); E.lx = -30 * u; E.z = 4 * Math.sin(u * Math.PI); E.rot = .25 * u; }
    play(H, t < .5 ? 'double' : t < 1.2 ? 'slash2' : 'sheathe', t < .5 ? .12 : t < 1.2 ? (t - .5) * .9 : (t - 1.2) * 2.4);
    x.once('split', t >= .56, () => { hit(x, t); S.impact = 2; cutLine(x, -15, -12, 1, -.1, 14);
      halve(x, [[-20, -12, 20, -12]], (Q, dx, h) => h > 12 ? { vx: -70, vz: 25, va: -6 } : topple(-1, .12, 1.55, 2)); slay(x); }); } },

  // the iron fan snaps open in his face; he turns to it, and the ronin cuts him from behind
  fan: { dur: 1.7, run(x, t, dt) { const { H, A, E } = x;
    rush(x, t, dt, [-11, -4]);
    if (t >= .18) play(A, t < .9 ? 'slash1' : 'ready', t < .9 ? (t - .18) * .9 : t);
    x.once('snap', t >= .24, () => { E.f = -1; react(x, t, [[.06, RX.flinch], [.25, RX.guardUp]]);
      for (let i = 0; i < 10; i++) spark(wx(x, -6), wy(x, -16 + rr(-4, 4)), x.s * rr(40, 90), rr(-10, 10), rr(.15, .3), i % 2 ? COL.fx2 : '#ffffff', true, 0); });
    if (t < .32) H.hide = true; else { land(x, [13, 0]); H.hide = false; }
    play(H, t < .4 ? 'double' : t < 1.1 ? 'slash2' : 'sheathe', t < .4 ? .1 : t < 1.1 ? (t - .4) * .9 : (t - 1.1) * 2.4);
    x.once('split', t >= .48, () => { hit(x, t); S.impact = 2; cutLine(x, 0, -15, 1, -.9, 14);
      halve(x, [[-12, -26, 12, -4]], (Q, dx, h) => h > 14 ? topple(-1, 0, 1.55, 1.6) : topple(1, .4)); slay(x); }); } },

  // the jitte catches his swing and twists the sword out of his hands; the ronin runs him through from behind
  catch: { dur: 1.8, run(x, t, dt) { const { H, A, E } = x;
    land(x, [13, 0]); rush(x, t, dt, [-13, 0], .16);
    x.once('turn', t >= .06, () => { E.f = -1; react(x, t, [[.14, RX.windup], [.26, RX.swung]]); });
    if (t >= .16) play(A, t < 1 ? 'slash1' : 'ready', t < 1 ? (t - .16) * .7 : t);
    x.once('clang', t >= .32, () => { hit(x, t, .07, .12); sparks(x, -6, -17, 9); ring(wx(x, -6), wy(x, -17), 2, 2, .12, 8); react(x, t, [[.1, RX.swung]]); });
    x.once('twist', t >= .48, () => { react(x, t, [[.08, DISARMED]]); sparks(x, -6, -15, 4);
      blades.push({ x: wx(x, -8), y: wy(x, 2), z: 16, vx: -x.s * rr(20, 35), vz: rr(30, 50), a: -1, va: sgn() * rr(8, 12), face: -x.s }); });
    play(H, t < .5 ? 'ready' : t < 1.15 ? 'slash1' : 'sheathe', t < .5 ? t : t < 1.15 ? (t - .5) * .9 : (t - 1.15) * 2.4);
    if (t >= .5 && t < .62) to(H, [13, 0], [8, 0], ez(k(t, .5, .62)));
    x.once('through', t >= .62, () => { hit(x, t); S.impact = 2; cutLine(x, 2, -14, 1, .3, 9); bleed(wx(x, 0), wy(x, 0), 14, -x.s, 1.2);
      react(x, t, [[.08, RX.jolt], ...fall.fwd.map(([tt, p]) => [tt + .1, p])]); slay(x); }); } },

  // the spear runs him through and lifts him overhead; the ronin leaps and cuts him off the point
  skewer: { dur: 1.9, run(x, t, dt) { const { H, A, E } = x;
    land(x, [15, 0]); rush(x, t, dt, [-22, 0]);
    if (t >= .18) play(A, t < .4 ? 'slash1' : t < .95 ? 'slash5' : 'ready', t < .4 ? (t - .18) * .8 : t < .95 ? .1 + (t - .4) * .4 : t);
    x.once('in', t >= .3, () => { hit(x, t, .06, .12); bleed(wx(x, 0), wy(x, 0), 13, x.s, .8); react(x, t, [[.08, RX.jolt], [.4, RX.stiff]]); });
    if (t >= .42 && !E.gone) { const u = ez(k(t, .42, .78)); E.lx = -9 * u; E.z = 26 * u; E.rot = .35 * u; }
    if (t < .6) play(H, 'ready', t);
    else if (t < .86) { const u = k(t, .6, .86); to(H, [15, 0], [-2, 0], u); H.z = 34 * Math.sin(u * Math.PI / 2); play(H, u < .6 ? 'jump' : 'slash2', u < .6 ? .1 : (t - .76) * 1.2); trail(x, 'H', t, dt); }
    else if (t < 1.1) { const u = k(t, .86, 1.1); H.z = 34 * (1 - inn(u)); H.lx = -2 - 6 * u; play(H, 'slash2', .12 + (t - .86)); }
    else { H.z = 0; play(H, t < 1.3 ? 'land' : 'sheathe', t < 1.3 ? t - 1.1 : (t - 1.3) * 2.4); }
    x.once('split', t >= .84, () => { hit(x, t); S.impact = 2; cutLine(x, -8, -E.z - 12, 1, .1, 13);
      halve(x, [[-20, -12, 20, -12]], (Q, dx, h) => h > 12 ? { vx: 20, vz: 30, va: 4 } : { vx: -8, vz: 6, va: -2 }); slay(x); }); } },

  // he swings at the partner and they are the ronin: a shadow step trades their places, and both cut
  switch: { dur: 1.7, run(x, t, dt) { const { H, A, E } = x;
    land(x, [14, 0]); rush(x, t, dt, [-14, 0], .15);
    x.once('turn', t >= .1, () => { E.f = -1; react(x, t, [[.2, RX.windup], [.36, RX.swung]]); });
    x.once('swap', t >= .3, () => { ghost(x, 'H', .6); ghost(x, 'A', .6); residue(wx(x, 14), wy(x, 0), 6); residue(wx(x, -14), wy(x, 0), 6);
      [H.lx, H.ly, H.f, A.lx, A.ly, A.f] = [-14, 0, 1, 14, 0, -1]; });
    const go = t >= .3;
    play(H, !go ? 'ready' : t < 1.05 ? 'slash1' : 'sheathe', !go ? t : t < 1.05 ? (t - .3) * 1.1 : (t - 1.05) * 2.4);
    if (t >= .15) play(A, !go ? 'ready' : t < 1.05 ? 'slash2' : 'sheathe', !go ? t : t < 1.05 ? (t - .3) * 1.1 : (t - 1.05) * 2.4);
    x.once('x', t >= .44, () => { hit(x, t, .1, .16); S.impact = 2; cutLine(x, 0, -13, 1, .7); cutLine(x, 0, -13, 1, -.7);
      react(x, t, [[.06, RX.doubled], [.3, RX.kneel], [.5, RX.handsDown], [.7, RX.prone]]); slay(x); }); } },

  // both still, hands on the hilt; one draw each, and he falls apart on the shared click
  duet: { dur: 1.9, run(x, t, dt) { const { H, A, E } = x;
    land(x, [15, 0]); rush(x, t, dt, [-15, 0]);
    x.once('still', t >= .2, () => react(x, t, [[.2, RX.guardUp]]));
    x.once('glint', t >= .36, () => { for (const [lx, f] of [[15, -1], [-15, 1]]) ring(wx(x, lx + f * 3), wy(x, -11), 1, 1, .14, 5); });
    if (t < .56) { play(H, 'double', .12); if (t >= .18) play(A, 'double', .12); }
    else { x.once('draw', true, () => { ghost(x, 'H', .7); ghost(x, 'A', .7); [H.lx, H.ly, A.lx, A.ly] = [-24, 1, 24, -1];
        hit(x, t, .1, .15); S.impact = 2; cutLine(x, 0, -15, 1, .8, 13); cutLine(x, 0, -15, 1, -.8, 13); react(x, t, [[.05, RX.stiff]]); });
      if (t < 1.2) { play(H, 'slash6', .62); play(A, 'slash6', .62); } else sheatheAll(x, t, 1.2); }
    x.once('click', t >= 1.62, () => { halve(x, [[-14, -30, 14, -2], [-14, -2, 14, -30]], apart()); slay(x, { stop: 0, shake: .12, impact: false }); }); } },

  // two short blades and his close on him at two heights at once: three pieces
  scissors: { dur: 1.7, run(x, t, dt) { const { H, A } = x;
    land(x, [13, 0]); rush(x, t, dt, [-13, 0], .16);
    play(H, t < 1.1 ? 'slash2' : 'sheathe', t < 1.1 ? t * .8 : (t - 1.1) * 2.4);
    if (t >= .16) play(A, t < 1.1 ? 'slash1' : 'sheathe', t < 1.1 ? (t - .1) * .8 : (t - 1.1) * 2.4);
    x.once('close', t >= .3, () => { hit(x, t, .1, .16); S.impact = 2; cutLine(x, 0, -9, 1, 0, 14); cutLine(x, 0, -20, 1, 0, 14);
      halve(x, [[-20, -9, 20, -9], [-20, -20, 20, -20]], (Q, dx, h) => h > 20 ? { vx: 18, vz: 45, va: 6 } : h > 9 ? { vx: -28, vz: 18, va: -4 } : topple(sgn(), .35)); slay(x); }); } },

  // the nunchaku takes his ankle and flips him upside down; the ronin cuts him in two before he lands
  flip: { dur: 1.8, run(x, t, dt) { const { H, A, E } = x;
    land(x, [14, 0]); rush(x, t, dt, [-17, 0], .16);
    if (t >= .16) play(A, t < .9 ? 'slash1' : 'ready', t < .9 ? (t - .16) * .8 : t);
    const hand = [A.lx + 6, -12];
    if (t >= .18 && t < .3) rope(x, hand, [hand[0] + (0 - hand[0]) * k(t, .18, .28), -1], 'chain');
    else if (t >= .3 && t < .5 && !E.gone) rope(x, hand, [E.lx, -1 - E.z], 'chain');
    x.once('wrap', t >= .28, () => { sparks(x, 0, -1, 5, COL.fx2, 30); react(x, t, [[.08, RX.jolt], [.25, RX.handsBack]]); });
    if (t >= .32 && !E.gone) { const u = k(t, .32, .6); E.z = 24 * Math.sin(u * Math.PI / 2); E.rot = Math.PI * ez(u); E.lx = -3 * u; }
    if (t < .42) play(H, 'ready', t);
    else if (t < .6) { const u = k(t, .42, .6); to(H, [14, 0], [5, 0], u); H.z = 22 * Math.sin(u * Math.PI / 2); play(H, u < .5 ? 'jump' : 'slash2', u < .5 ? .1 : (t - .51) * 1.2); trail(x, 'H', t, dt); }
    else if (t < .84) { const u = k(t, .6, .84); H.z = 22 * (1 - inn(u)); H.lx = 5 - 4 * u; play(H, 'slash2', .1 + (t - .6)); }
    else { H.z = 0; play(H, t < 1.1 ? 'land' : 'sheathe', t < 1.1 ? t - .84 : (t - 1.1) * 2.4); }
    x.once('split', t >= .6, () => { hit(x, t); S.impact = 2; cutLine(x, -2, -E.z - 12, 1, .2, 13);
      halve(x, [[-20, -12, 20, -12]], (Q, dx, h) => h > 12 ? { vx: -10, vz: 10, va: -3 } : { vx: 16, vz: 24, va: 4 }); slay(x); }); } },

  // their scarf goes round his neck and hauls him off his feet, into the ronin's cut
  snare: { dur: 1.8, run(x, t, dt) { const { H, A, E } = x;
    land(x, [14, 0]); rush(x, t, dt, [-28, 0]);
    if (t >= .18) play(A, t < 1 ? 'slash1' : 'ready', t < 1 ? (t - .18) * .7 : t);
    const neck = [A.lx + 2, -17];
    if (t >= .2 && t < .34) rope(x, neck, [neck[0] + (0 - neck[0]) * k(t, .2, .33), -20], 'cloth');
    else if (t >= .34 && t < .8) rope(x, neck, [E.lx, -20 - E.z], 'cloth');
    x.once('pull', t >= .38, () => react(x, t, [[.1, RX.jolt], [.24, RX.handsBack]]));
    if (t >= .38) { const u = ez(k(t, .38, .6)); E.lx = -9 * u; E.z = 3 * Math.sin(u * Math.PI); }
    play(H, t < .44 ? 'ready' : t < 1.15 ? 'slash1' : 'sheathe', t < .44 ? t : t < 1.15 ? (t - .44) * .9 : (t - 1.15) * 2.4);
    if (t >= .44 && t < .56) to(H, [14, 0], [3, 0], ez(k(t, .44, .56)));
    x.once('cut', t >= .56, () => { hit(x, t); S.impact = 2; cutLine(x, -7, -16, 1, -.6, 11); bleed(wx(x, -8), wy(x, 0), 16, -x.s, 1.2);
      react(x, t, [[.1, RX.handsBack], [.4, RX.supine]]); slay(x); }); } },

  // they kneel in their armour; he runs up their back, somersaults, and comes down through the enemy
  step: { dur: 1.9, run(x, t, dt) { const { H, A } = x;
    land(x, [34, 0]); rush(x, t, dt, [12, 2], .2, -1);
    if (t >= .2) play(A, t < .6 ? 'death' : 'ready', t < .6 ? .5 : t);   // down on one knee, a step to run up
    x.once('look', t >= .3, () => react(x, t, [[.2, RX.guardUp]]));
    if (t < .2) play(H, 'ready', t);
    else if (t < .42) { to(H, [34, 0], [14, 1], (t - .2) / .22); play(H, 'run', t); }
    else if (t < .5) { H.z = 12 * k(t, .42, .5); H.lx = 14 - 2 * k(t, .42, .5); play(H, 'jump', .05); }
    else if (t < .9) { const u = k(t, .5, .9); H.lx = 12 - 10 * u; H.z = 12 + 30 * Math.sin(u * Math.PI) - 4 * u; H.rot = -2 * Math.PI * ez(k(t, .5, .82));
      play(H, u < .75 ? 'jump' : 'slash2', u < .75 ? .15 : (t - .8) * 1.3); trail(x, 'H', t, dt); }
    else if (t < 1.06) { const u = k(t, .9, 1.06); H.rot = 0; H.lx = 2 - 10 * u; H.z = 8 * (1 - inn(u)); play(H, 'slash2', .13 + (t - .9)); }
    else { H.z = 0; play(H, t < 1.35 ? 'land' : 'sheathe', t < 1.35 ? t - 1.06 : (t - 1.35) * 2.4); }
    x.once('split', t >= .9, () => { hit(x, t, .1, .18); S.impact = 2; cutLine(x, 0, -16, 1, 1.1, 15);
      halve(x, [[-14, -30, 14, -2]], (Q, dx, h) => dx < 0 ? topple(-1, .05, 1.55, 1.5) : topple(1, .4)); slay(x); }); } },
};
