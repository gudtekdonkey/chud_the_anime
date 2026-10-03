// ---- Paired executions in 3D: K on a lone samurai with a companion nearby who is set up for one (today's PAIRED
// rules, src/party/kit.js `fits`: a weapon, a skill, an item; some also need his weapon). Re-staged for the courtyard on
// the flow's moves: he glitches into place, they close in, the blows land on the hits, the kill on the killing blow
// with the full-screen close-up (owner: "the cut scenes on killing blows is an amazing touch"). At most one every 5 s
// for the whole party, counted from the end of the last (owner); never the same one twice running. Five are staged
// here (the ones Kuro, Suzume and Tetsu can do); the rest of PAIRED waits for its weapons in 3D.
// While one plays it holds him, the companion and the samurai (CTX.busy / CTX.held), and swallows their cuts' own hits.
import { PAIRED, fits } from '../../party/kit.js';
import { CTX, nearestFoe, lone } from '../ctx.js';
import { PARTY } from './party.js';
import { W, STOP } from 'ronin-engine/clock/world.js';
import { hOf, AF } from 'ronin-engine/flow/flow.js';
import { sparks, dust, tear, focus, ring } from 'ronin-engine/render/fx.js';
import { startCine } from '../fx/cine.js';
import { shake } from 'ronin-engine/render/gfx/view.js';
import { P, qiAdd } from '../items/inv.js';
import { numAt } from '../hud/world-ui.js';

export const PAIR_CD = 5, K_RANGE = 70, PARTNER_RANGE = 90;   // the party's cooldown; how near the samurai and the partner must be (world units)
export const PAIR = { cd: 0, last: null, run: null, done: 0, log: [] };
const heroFits = ex => !ex.needs.hero || ex.needs.hero.includes(P.weapon || 'katana');

// the paired executions K could play now: { al, f, opts: [{ al, ex }] } (al: the nearest partner) or null
export function pairCandidate() {
  if (PAIR.run || PAIR.cd > 0 || CTX.busy) return null;
  const hero = CTX.hero, f = nearestFoe(hero.x, hero.z, K_RANGE); if (!f || !lone(f)) return null;
  const near = PARTY.standing().filter(al => Math.hypot(al.x - f.x, al.z - f.z) <= PARTNER_RANGE).sort((a, b) => Math.hypot(a.x - f.x, a.z - f.z) - Math.hypot(b.x - f.x, b.z - f.z));
  const opts = near.flatMap(al => PAIRED.filter(ex => STAGE[ex.id] && fits(al.c, ex) && heroFits(ex)).map(ex => ({ al, ex })));
  return opts.length ? { al: opts[0].al, f, opts } : null;
}
// K: play one (any pair that fits, never the same one twice running). `force` picks one by id (the check, &pair=)
export function startPaired(force) {
  const c = pairCandidate(); if (!c) return false;
  let opts = force ? c.opts.filter(o => o.ex.id === force) : c.opts.filter(o => o.ex.id !== PAIR.last); if (!opts.length) opts = c.opts;
  const { al, ex } = opts[Math.floor(Math.random() * opts.length)]; PAIR.last = ex.id; PAIR.log.push(ex.id);
  begin(ex, al, c.f); return ex.id;
}
// a staging without a partner (port.js: K's solo finisher on a combo, until the executions are ported)
export function startSolo(f) { if (!f || f.dead || PAIR.run || CTX.busy) return false; begin({ id: 'solo' }, null, f); return 'solo'; }
function begin(ex, al, f) {
  const hero = CTX.hero, run = { ex, al, f, t: 0, steps: [], tw: [], fired: 0 };
  CTX.busy = ex.id === 'solo' ? 'exec' : 'paired'; CTX.held.add(f); if (al) CTX.held.add(al); PAIR.run = run;
  for (const ch of [hero, al, f]) if (ch) { ch.a.vt = 0; ch.a.v = 0; }
  f.a.play('guard', { blend: .05 });
  STAGE[ex.id](stager(run, hero, al, f)); run.steps.sort((a, b) => a[0] - b[0]);
}

// the verbs a staging is written in (world units; the samurai at the centre, `u` the way from him to the hero)
function stager(run, hero, al, f) {
  const u0 = [hero.x - f.x, hero.z - f.z], l = Math.hypot(...u0) || 1, u = [u0[0] / l, u0[1] / l], side = [-u[1], u[0]];
  const at = (d, s = 0) => [f.x + u[0] * d + side[0] * s, f.z + u[1] * d + side[1] * s];
  const put = (c, [x, z]) => { c.a.x = x / AF; c.a.z = z / AF; c.a.feet.N.lock = c.a.feet.F.lock = 0; c.a.prev = null; };
  const face = (c, [x, z]) => { c.a.h = c.a.ht = hOf(x - c.x, z - c.z); c.a.turnSnap = true; };
  const fpos = () => [f.x, f.z];
  const S = {
    hero, al, f, at, u,
    when: (t, fn) => run.steps.push([t, fn]),
    // a glitch to a spot: residue where he was, a cyan flash where he lands
    blink: (c, p, look = fpos()) => { sparks(W, c.a.x, 16, c.a.z, 6, { spd: 40, spread: 6 }); put(c, p); face(c, look); c.a.tint = '#6ff3e4'; c.a.tintA = .55; c.a.tintTill = W.t + .12; ring(W, c.a.x, c.a.z, { r: 8, life: .2 }); },
    // run to a spot over `dur`
    dash: (c, p, dur, clip = 'runArmed') => { face(c, p); c.a.play(clip, { blend: .05 }); c.a.vt = 0; run.tw.push({ c, from: [c.x, c.z], to: p, t0: run.t, dur, then: () => { face(c, fpos()); c.a.play('guard', { blend: .06 }); } }); },
    // a cut toward a spot, carried there over `dur` (its own root motion off)
    cut: (c, clip, to, dur = .2) => { face(c, to || fpos()); c.a.play(clip, { rs: .001, next: x => x.play('guard') }); if (to) run.tw.push({ c, from: [c.x, c.z], to, t0: run.t, dur }); },
    play: (c, clip, o) => c.a.play(clip, o),
    carry: (c, to, dur) => run.tw.push({ c, from: [c.x, c.z], to, t0: run.t, dur }),
    // a blow that does not kill: he reels (w 1 recoil, 3 knocked to a knee)
    blow: (w, by = hero) => { const hd = hOf(f.x - by.x, f.z - by.z); f.react(w, hd, 0); W.hitstop(w > 1 ? STOP.heavy : STOP.light); sparks(W, f.a.x, 22, f.a.z, 8, { dir: hd, spd: 120 }); focus(W, f.a.x, 22, f.a.z); },
    // the close-up, a beat before the killing blow
    cine: () => startCine(hero, f),
    // the kill: execution-grade hit-stop, the black slash, the big number, the Qi
    kill: (by = hero, ang = .5) => { const hd = hOf(f.x - by.x, f.z - by.z); f.lastBy = al || null; f.react(3, hd, 99); W.hitstop(STOP.kill); shake(1.5, 4 / 60);
      tear(W, f.a.x, 20, f.a.z, ang, 30, 6); sparks(W, f.a.x, 22, f.a.z, 14, { dir: hd, spd: 140 }); dust(W, f.a.x, f.a.z, 10, { spd: 34, life: .5 }); focus(W, f.a.x, 22, f.a.z);
      numAt(f, 99, 'exec'); qiAdd(.15); if (al) PAIR.done++; else PAIR.solo = (PAIR.solo || 0) + 1; },
    end: () => end(run),
  };
  return S;
}
function end(run) {
  const hero = CTX.hero; for (const c of [hero, run.al]) if (c && c.state !== 'sheathe') c.a.play('guard', { blend: .08 });
  CTX.held.delete(run.f); if (run.al) CTX.held.delete(run.al); CTX.busy = null; PAIR.run = null; if (run.al) PAIR.cd = PAIR_CD;
}

// ---- the stagings. Times in seconds of game time from K ----
const STAGE = {
  // CROSSING CUT: both pass through him from either side, hold, resheathe together; he falls on the shared click
  cross(S) { const { hero, al, at } = S;
    S.when(0, () => { S.blink(hero, at(16)); S.dash(al, at(-16), .2); });
    S.when(.28, () => { S.cut(hero, 'lunge', at(-24), .16); S.cut(al, 'lunge', at(24), .16); });
    S.when(.62, () => { S.play(hero, 'guard'); S.play(al, 'guard'); });
    S.when(.9, () => { S.play(hero, 'sheathe'); S.play(al, 'sheathe'); });
    S.when(1.78, () => S.cine());
    S.when(1.92, () => S.kill(hero, Math.PI / 2 + .3));   // the click (sheathe + 1.02)
    S.when(2.5, () => S.end()); },
  // BATTER UP: their heavy swing knocks him off his feet; he is there as he comes down
  batter(S) { const { hero, al, at } = S;
    S.when(0, () => { S.dash(al, at(-15, 4), .2); S.blink(hero, at(26, -8)); });
    S.when(.24, () => S.cut(al, 'J3'));
    S.when(.5, () => S.blow(3, al));
    S.when(.62, () => { S.blink(hero, at(12)); S.cine(); S.cut(hero, 'J3'); });
    S.when(.88, () => S.kill(hero, Math.PI / 2 + .4));
    S.when(1.7, () => S.end()); },
  // SKEWER: the spear runs him through from the front; he comes round the back and cuts him off the point
  skewer(S) { const { hero, al, at } = S;
    S.when(0, () => { S.dash(al, at(-20), .22); S.blink(hero, at(22, 10)); });
    S.when(.26, () => S.cut(al, 'lunge', at(-12), .14));
    S.when(.42, () => S.blow(1, al));
    S.when(.55, () => { S.blink(hero, at(12, 2)); S.cine(); S.cut(hero, 'J2'); });
    S.when(.7, () => S.kill(hero, -.4));
    S.when(1.5, () => S.end()); },
  // POLE VAULT: they plant the pole beside him; he runs up it, flips over and comes down through his head
  vault(S) { const { hero, al, at } = S;
    S.when(0, () => { S.dash(al, at(14, 12), .18); S.blink(hero, at(34)); });
    S.when(.2, () => S.play(al, 'guard'));
    S.when(.3, () => { S.play(hero, 'roll', { blade: true, dist: 1 }); S.carry(hero, at(-12), .36); });
    S.when(.62, () => { S.cine(); S.cut(hero, 'J3'); });
    S.when(.88, () => S.kill(hero, Math.PI / 2));
    S.when(1.7, () => S.end()); },
  // (solo) K's finisher on a combo's last link, until the executions are ported: a blink behind him, the close-up, J3
  solo(S) { const { hero, at } = S; S.when(0, () => S.blink(hero, at(-14))); S.when(.08, () => { S.cine(); S.cut(hero, 'J3'); }); S.when(.34, () => S.kill(hero, Math.PI / 2 + .3)); S.when(1.1, () => S.end()); },
  // SWITCH: he swings at them and they are you: the shadow step trades places, and both cut
  switch(S) { const { hero, al, at } = S;
    S.when(0, () => { S.dash(al, at(-16), .2); S.blink(hero, at(16)); });
    S.when(.3, () => { S.blink(hero, at(-14)); S.blink(al, at(14)); });
    S.when(.42, () => { S.cine(); S.cut(hero, 'J1'); S.cut(al, 'J1'); });
    S.when(.62, () => S.kill(hero, .5));
    S.when(1.4, () => S.end()); },
};

// one game step (not during a hit-stop): the staging's beats and the carried moves
export function tickPaired(dt) {
  PAIR.cd = Math.max(0, PAIR.cd - dt);
  const run = PAIR.run; if (!run) return;
  run.t += dt;
  while (run.fired < run.steps.length && run.steps[run.fired][0] <= run.t) run.steps[run.fired++][1]();
  for (const tw of [...run.tw]) { const k = Math.min(1, (run.t - tw.t0) / tw.dur), c = tw.c;
    c.a.x = (tw.from[0] + (tw.to[0] - tw.from[0]) * k) / AF; c.a.z = (tw.from[1] + (tw.to[1] - tw.from[1]) * k) / AF;
    if (k >= 1) { run.tw.splice(run.tw.indexOf(tw), 1); if (tw.then) tw.then(); } }
}
// the paired one's own cuts land nowhere: its blows are the staging's
export function swallowsHit(a) { const r = PAIR.run; return !!r && (a === CTX.hero.a || (r.al && a === r.al.a)); }
export { STAGE };
