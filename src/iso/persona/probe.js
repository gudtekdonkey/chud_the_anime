// ---- Measuring personas and idles away from the scene (the check reads these through window.__iso.persona, and
// they run in Node too): actors on a world of their own, stepped at the flow's 1/120 s, never drawn, never touching
// the game. plainSame: no traits gives the page's moves exactly. idleReport: each idle plays, moves the body, glides
// (no jump between steps) and comes home. compare: what two personas do differently, idle choices included.
import { Actor, CLIPS } from '../anim/flow.js';
import { IDLES, IDLE_NAMES, forceIdle, idlePose, lengthOf } from '../anim/idles.js';
import { PAGE, idleOf, bear } from './gait.js';
import { personaOf, summary } from './persona.js';

const world = () => ({ t: 0, dt: 1 / 120, event() {}, fx: [], on: {} });
const body = p => [...p.pel, p.lean, p.head || 0, ...p.hN, ...p.hF, ...p.fN, ...p.fF, p.hy || 0, p.hr || 0, p.tw || 0];
const flat = (p, o = []) => { if (typeof p === 'number') o.push(p); else if (Array.isArray(p)) p.forEach(x => flat(x, o)); else if (p && typeof p === 'object') for (const k of Object.keys(p).sort()) flat(p[k], o); return o; };
const maxDiff = (a, b) => { if (a.length !== b.length) return Infinity; let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m; };

// the persona path with no traits against the page's own function, move by move, over many moments and speeds
export function plainSame() {
  const P = personaOf([]), out = {};
  for (const name of ['idle', 'guard', 'run', 'runArmed']) { let worst = 0;
    for (let i = 0; i < 240; i++) { const t = i * .0371, v = 20 + (i * 7.3) % 100;
      const mk = () => { const a = new Actor(world(), { x: 0, z: 0 }); a.v = v; a.phase = .3 + i * .013; a.foe = i % 2; return a; };
      const a0 = mk(), a1 = mk(); a1.persona = P; a1.generic = true;
      const p0 = PAGE[name](a0, t, 1 / 120).p, p1 = CLIPS[name].fn(a1, t, 1 / 120).p;
      worst = Math.max(worst, maxDiff(flat(p0), flat(p1)), Math.abs(a0.phase - a1.phase)); }
    out[name] = worst; }
  return out;
}

// every idle on the plain body: how far it moves him (rig px / rad), the biggest step between two 1/120 s samples,
// how far from the breath it ends, and its length
export function idleReport(list = []) {
  const P = personaOf(list), out = {};
  for (const id of IDLE_NAMES) { const I = IDLES[id], len = lengthOf(I), n = Math.ceil(len * 120) + 2;
    let dev = 0, jump = 0, prev = null, end = 0, drew = false;
    for (let i = 0; i <= n; i++) { const t = i / 120, base = bear(idleOf(P.idle, t), P.idle), p = idlePose(base, id, t);
      const b = body(p), b0 = body(base); dev = Math.max(dev, maxDiff(b, b0)); if (prev) jump = Math.max(jump, maxDiff(b, prev)); prev = b;
      if (p.blade && p.blade.out) drew = true; if (i === n) end = maxDiff(b, b0); }
    out[id] = { dev, jump, end, len, drew, about: I.about }; }
  return out;
}

// one actor at rest with a persona for `sec` seconds: which idles it drifted into
export function idleChoices(list, sec = 240, seed = 3, armed = true) {
  const a = new Actor(world(), { x: 0, z: 0 }); a.persona = personaOf(list, { armed }); a.seed = seed; a.play('idle');
  for (let i = 0; i < sec * 120; i++) { a.W.t += 1 / 120; a.update(1 / 120); }
  const count = {}; for (const id of a.idler ? a.idler.played : []) count[id] = (count[id] || 0) + 1;
  return { n: a.idler ? a.idler.n : 0, count };
}
// a forced idle on a real actor (springs, planted feet and all): it played, and the actor is back in the breath after
export function playOne(id, list = []) {
  const a = new Actor(world(), { x: 0, z: 0 }); a.persona = personaOf(list); a.generic = true; forceIdle(a, id); a.play('idle');
  let seen = false; for (let i = 0; i < (lengthOf(IDLES[id]) + 1) * 120; i++) { a.W.t += 1 / 120; a.update(1 / 120); if (a.idler.cur === id) seen = true; }
  return { seen, n: a.idler.n, finite: flat(a.pose).every(Number.isFinite) };
}
export function compare(A, B, sec = 240) {
  const one = list => ({ ...summary(personaOf(list)), choices: idleChoices(list, sec) });
  return { a: one(A), b: one(B) };
}
