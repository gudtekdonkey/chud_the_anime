// ---- Every move with every weapon, on the katana's keys (the design rule: "every move works with every weapon, on the
// same timing and hits, but each weapon has its own poses"). A weapon's take on a move is registered as CLIPS['J1@yari']
// (anim/flow.js plays it for an actor whose `wid` is the weapon): the katana's clip with the same key times, easings,
// events ('hit', 'impact', 'click'), root travel, legs and body, and the weapon's own arms, grips and angles laid on its
// keys (cuts.js). Loops (guard, the armed run) and the stow are the katana's procedures with the weapon's grip laid on
// top. Every pose then passes the weapon's `post`: the haft's two hands, a one-handed weapon's free fist or off-hand
// weapon, and the floor (a long weapon stops on it, as today's art plants it, never through it).
import { CLIPS, H, EZ, clamp, lerp, mixP, clone } from 'ronin-engine/flow/flow.js';
import { ARSENAL } from './arsenal.js';
import { STOW, mountOf } from './stow.js';
import { CUTS } from './cuts.js';

const h = n => H + n;
// a grip spec onto a pose: forward counts from the pose's pelvis (abs: from his feet), up from the floor
function blade(p, s, w) {
  if (s.stow) return { out: 0, g: [p.pel[0] + 4.8, h(.4)], ang: .5, two: 0 };
  const f = s.abs ? 0 : p.pel[0], b = { out: 1, g: [f + s.g[0], s.g[1]], ang: s.ang, two: s.two ?? (w.hands === 'two' ? 1 : 0), x: s.x ?? -1.1, lat: s.lat ?? 0, slide: s.slide ?? 0, vis: 99 };
  for (const k of ['bh', 'off', 'spread', 'chain']) if (s[k] != null) b[k] = clone(s[k]);
  return b;
}
function lay(p, s, w) { if (!s) return p; const f = s.abs ? 0 : p.pel[0];
  p.blade = blade(p, s, w); if (s.hN) p.hN = [f + s.hN[0], s.hN[1]]; if (s.hF) p.hF = [f + s.hF[0], s.hF[1]];
  for (const k of ['lean', 'head', 'elb']) if (s[k] != null) p[k] = s[k];
  return p; }
// the draw from where it hangs: the hand to the weapon (D1, still home), then out in the hand there (D2)
const draw = (w, p, which) => { const m = mountOf(w.id, p); if (!m) return null;
  return which === 1 ? { stow: 1, abs: 1, hN: m.g } : { abs: 1, g: m.g, ang: m.ang, lat: m.lat, x: m.x, slide: m.slide, two: 0 }; };

// the floor: the far end (L ahead of the grip) and the butt (B behind it) stay above it; the winding of the angle is kept
function floorAng(up, ang, L, B, min = .8) { const n = Math.atan2(Math.sin(ang), Math.cos(ang)); let a = n;
  if (up + Math.sin(a) * L < min) { const k = Math.asin(clamp((min - up) / L, -1, 1)); a = Math.cos(a) >= 0 ? k : Math.PI - k; }
  if (B > 0 && up - Math.sin(a) * B < min) { const k = Math.asin(clamp((up - min) / B, -1, 1)); a = Math.cos(a) >= 0 ? k : Math.PI - k; }
  return ang + (a - n); }
function post(w) { const L = w.ext[1] * 2, Bk = w.ext[0] * 2;
  return p => { const b = p.blade; if (!b || !b.out) return;
    if (b.x == null) b.x = -1.1; if (b.lat == null) b.lat = 0;
    if (w.hands === 'one' && b.two) { b.two = 0; p.hF = [p.pel[0] + 4, h(5)]; }   // the katana's two-handed keys: a one-handed weapon keeps a guard fist
    if (w.hands === 'two' && b.two && b.bh == null) b.bh = w.bh;
    if (w.off && !b.off) b.off = w.off.chain ? { ang: -Math.PI / 2 } : { ...w.off };
    b.ang = floorAng(b.g[1], b.ang, Math.max(0, L - (b.slide || 0)), Bk + (b.slide || 0));
    if (b.chain > 2 && b.off) b.off.ang = floorAng(p.hF[1], b.off.ang, b.chain, 0);
  }; }

// a keyed move: the katana's keys, the weapon's spec on each (null keeps the katana's key; 'D1'/'D2' the draw)
function keyedFor(w, name, specs) { const base = CLIPS[name];
  const keys = base.keys.map((k, i) => { const p = clone(k), s = specs && specs[i];
    if (s === 'D1' || s === 'D2') return lay(p, draw(w, p, s === 'D1' ? 1 : 2), w);
    if (i === 0 && name !== 'J2' && name !== 'J3' && w.carry !== 'hip' && p.blade && !p.blade.out) p.hN = [p.pel[0] + 2, h(-1)];   // a weapon not at the hip: no reach for a hilt there
    return lay(p, s, w); });
  if (keys.length !== base.keys.length) throw new Error(`${w.id} ${name}: ${keys.length} keys, the katana has ${base.keys.length}`);
  CLIPS[name + '@' + w.id] = { ...base, keys, post: post(w) }; }
// a procedure (guard, the armed run, the roll, the hit reactions): the katana's, the weapon's spec laid on, moved as the katana's blade moves
function procFor(w, name, spec, ref) { const base = CLIPS[name];
  const fn = spec ? (a, t, dt) => { const e = base.fn(a, t, dt), p = e.p, kb = p.blade, s = { ...spec };
    if (ref && kb && kb.out) { s.g = [spec.g[0] + kb.g[0] - p.pel[0] - ref[0], spec.g[1] + kb.g[1] - ref[1]]; s.ang = spec.ang + kb.ang - ref[2]; }   // breathing, the run's swing
    e.p = lay({ ...p }, s, w); if (name === 'runArmed' && w.hands === 'one' && !spec.hF) e.p.hF = p.hF; return e; } : base.fn;
  CLIPS[name + '@' + w.id] = { ...base, fn, post: post(w) }; }
// the stow (today's slungStow / shoulderStow / the obi's): a flick, a beat, up and round to where it hangs, home on the
// katana's click (1.02 s), the hand let go. The body is the katana's sheathe; only the weapon and the right hand differ
function stowFor(w, guard, flick, lift) { const base = CLIPS.sheathe, E = EZ.io;
  const fn = (a, t, dt) => { const e = base.fn(a, t, dt), p = { ...e.p }, m = mountOf(w.id, p), home = { abs: 1, g: m.g, ang: m.ang, lat: m.lat, x: m.x, slide: m.slide, two: 0 };
    if (t < 1.02) { const K = [[0, guard], [.13, flick], [.45, flick], [.66, lift], [.9, home], [1.02, home]]; let i = 0; while (i + 1 < K.length && K[i + 1][0] <= t) i++;
      const A = K[i], B = K[Math.min(i + 1, K.length - 1)], u = A === B ? 0 : E(clamp((t - A[0]) / (B[0] - A[0]), 0, 1));
      p.blade = mixP(blade(p, A[1], w), blade(p, B[1], w), u, 'a'); p.hN = p.blade.g.slice(); if (!p.blade.two) p.hF = e.p.hF; }
    else { const r = E(clamp((t - 1.02) / .4, 0, 1)); p.blade = blade(p, { stow: 1 }, w); p.hN = [lerp(m.g[0], p.pel[0] + 1.8, r), lerp(m.g[1], h(-1.5), r)]; }
    e.p = p; return e; };
  CLIPS['sheathe@' + w.id] = { ...base, fn, post: post(w) }; }

const FLICK = { slung: { g: [6, h(8)], ang: 1.62, two: 0 }, shoulder: { g: [9, h(3)], ang: -1.25, two: 0 }, obi: { g: [9, h(2)], ang: -1.3, two: 0 } };
const LIFT = { slung: { g: [1, h(16)], ang: 1.7, x: -2, two: 0 }, shoulder: { g: [2, h(17)], ang: 1.4, two: 0 }, obi: { g: [6, h(5)], ang: -.6, two: 0 } };
for (const w of ARSENAL) {
  if (w.id === 'katana') continue;
  const c = CUTS[w.id] || {};
  for (const n of ['J1', 'J2', 'J3', 'lunge', 'recoil', 'knock']) keyedFor(w, n, c[n]);
  procFor(w, 'guard', c.guard, [8.8, h(4), .55]);
  procFor(w, 'runArmed', c.run, [-1.5, h(.8), -2.72]);
  procFor(w, 'roll', null);
  if (STOW[w.id] && STOW[w.id].stow && w.carry !== 'hip') stowFor(w, c.guard || { g: [8.8, h(4)], ang: .55 }, FLICK[w.carry], LIFT[w.carry]);
  else CLIPS['sheathe@' + w.id] = { ...CLIPS.sheathe, post: post(w) };
}
// for the check: a weapon's take keeps the katana's length and its events on the same beats
export function beatsOf(name, id) { const c = CLIPS[name + '@' + id] || CLIPS[name]; return { dur: c.dur, ev: c.keys ? c.keys.filter(k => k.ev).map(k => `${k.ev}@${k.t}`) : [] }; }
