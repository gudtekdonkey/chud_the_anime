// ---- ?iso&reel=<name>: the Animation Flow page's demo scenarios (af/demos.js SC), played by the slice's own
// controller pieces on the same script and clock, for side-by-side review against the page's contact sheets
// (scripts/iso-reel.mjs). A review mode, not the game: window.__reel.seek(t) steps the world to game time t and draws.
// Positions are the page's (rig px), moved into the open courtyard.
import { DIR, AF } from './anim/flow.js';

const Z0 = 190, OX = 260, OZ = 0;   // the page's stage row, shifted into the open yard
export const REELS = {
  idle: { T: [100, 168], build(R) { const a = R.hero(100, 196, DIR.SE); R.M.idle(a); } },
  start: { T: [100, 160], build(R) { const a = R.hero(40, Z0, DIR.E); R.M.idle(a); R.at(.6, () => R.M.run(a, DIR.E)); } },
  turn: { T: [100, 160], build(R) { const a = R.hero(-6, 200, DIR.E); a.v = 110; R.M.run(a, DIR.E);
    R.at(.62, () => R.M.steer(a, DIR.NE, 100)); R.at(1.0, () => R.M.steer(a, DIR.E, 110)); R.at(1.55, () => R.M.skid(a, DIR.W)); } },
  stop: { T: [100, 160], build(R) { const a = R.hero(-4, Z0, DIR.E); a.v = 110; R.M.run(a, DIR.E); R.at(.82, () => R.M.stop(a)); } },
  roll: { T: [112, 160], build(R) { const a = R.hero(-2, Z0, DIR.E), f = R.foe(196, Z0, DIR.W); R.M.guard(f); a.v = 110; R.M.run(a, DIR.E);
    R.at(.42, () => R.M.roll(a, DIR.E, { run: 110 })); R.at(1.18, () => R.M.roll(a, DIR.E, { dist: 40, then: x => R.M.cut(x, 'J1') })); } },
  chain: { T: [100, 160], build(R) { const a = R.hero(64, Z0, DIR.E), f = R.foe(99, Z0, DIR.W); R.M.guard(f); R.M.idle(a);
    R.at(.35, () => R.M.cut(a, 'J1')); R.at(.65, () => R.M.cut(a, 'J2')); R.at(.93, () => R.M.cut(a, 'J3')); } },
  lunge: { T: [100, 160], build(R) { const a = R.hero(-6, Z0, DIR.E), f = R.foe(132, Z0, DIR.W); R.M.guard(f); a.v = 110; R.M.run(a, DIR.E); R.at(.86, () => R.M.lunge(a)); } },
  sheathe: { T: [100, 168], build(R) { const a = R.hero(92, 196, DIR.SE); R.M.idle(a); R.at(.5, () => R.M.cut(a, 'J1')); R.at(1.7, () => R.M.sheathe(a)); } },
};
// the page's commands (af/demos.js M, the flowing side), on an actor
export const M = {
  idle(a) { a.vt = 0; a.play('idle'); },
  guard(a) { a.vt = 0; a.play('guard'); },
  run(a, h, v = 110) { a.ht = h; a.vt = v; const n = a.clip && a.clip.name; if (n !== 'run' && n !== 'start') { if (a.v > 40) a.play('run', { blend: .06 }); else a.play('start'); } },
  steer(a, h, v) { a.ht = h; if (v != null) a.vt = v; },
  stop(a) { a.play('stop'); },
  skid(a, h1, v1 = 115) { a.play('skid', { h1, v1 }); },
  roll(a, h, o = {}) { a.ht = h; a.h = h; a.vt = 0; a.play('roll', { blade: o.blade, dist: o.dist ?? 50, next: x => { if (o.then) o.then(x); else if (o.run) { x.v = 70; M.run(x, o.runH ?? h, o.run); } else M[o.blade ? 'guard' : 'idle'](x); } }); },
  cut(a, n, o = {}) { a.vt = 0; a.v = 0; a.play(n, { next: o.then }); },
  lunge(a, o = {}) { a.vt = 0; a.play('lunge', { next: o.then }); },
  sheathe(a) { a.play('sheathe'); },
};
export const reelPos = (x, z) => [(x + OX) * AF, (z + OZ) * AF];
