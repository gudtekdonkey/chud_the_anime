import { pz } from '../rig/pose.js';
import { ARMS } from './knobs.js';
import { FIDGETS } from './fidgets.js';
import { mix } from './mix.js';

// ---- Baking a personality into rig poses: idle, walk and run, one pose per frame ----
// With no traits this gives back exactly today's idle and run, pose for pose.
const TAU = Math.PI * 2;
// the calm breath and the mantle's stir, one breath long (the same tables the plain idle was drawn from)
const BREATH_T = [0, 0, 0, .15, .45, .75, .95, 1, 1, 1, .85, .6, .3, .1, 0, 0];
const FLUT_T = [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0];
const table = (tb, u) => { let x = (u % 1 + 1) % 1 * tb.length; if (Math.abs(x - Math.round(x)) < 1e-6) x = Math.round(x) % tb.length;
  const i = Math.floor(x), f = x - i; return tb[i] + (tb[(i + 1) % tb.length] - tb[i]) * f; };
const toward = (a, t, w) => { w = Math.min(1, Math.max(0, w)); return a.map((v, i) => v + (t[i] - v) * w); };
function hands(q, m) { for (const a in m.f) q.fa = toward(q.fa, ARMS[a], m.f[a]); for (const a in m.b) q.ba = toward(q.ba, ARMS[a], m.b[a]); }
// both feet on the floor: the hips drop to the longer leg's reach (whole pixels) and the other knee opens to meet the floor
const reach = ([th, kn]) => 5 * Math.cos(th) + 6 * Math.cos(th - kn);
function meet([th, kn], R) {
  const x = Math.min(1, Math.max(-1, (R - 5 * Math.cos(th)) / 6)), a = Math.acos(x);
  const shin = Math.abs(a - (th - kn)) < Math.abs(-a - (th - kn)) ? a : -a;   // keep the knee bending the way it already does
  return [th, th - shin];
}
function plant(q) {
  const drop = Math.round(11 - Math.max(reach(q.fl), reach(q.bl))), R = 11 - drop;
  q.hy += drop;
  if (Math.abs(reach(q.fl) - R) > .4) q.fl = meet(q.fl, R);
  if (Math.abs(reach(q.bl) - R) > .4) q.bl = meet(q.bl, R);
}
function addTo(q, add) { for (const k in add) q[k] = Array.isArray(add[k]) ? q[k].map((v, i) => v + add[k][i]) : k === 'flutter' ? Math.max(q[k], add[k]) : q[k] + add[k]; }

// idle: breaths, with the fidgets spaced through the loop, each one finishing as its stretch of breaths ends
export function idleFrames(m, fidgets = []) {
  const n1 = Math.max(4, Math.round(m.period * m.fps)), every = Math.max(1, Math.round(m.every));
  let breaths = fidgets.length ? every * fidgets.length : 1;
  if ((m.sway || m.swayLean || m.jitter) && breaths % 2) breaths *= 2;   // the sway takes two breaths, so the loop must too
  const n = n1 * breaths, seg = n1 * every, out = [];
  for (let i = 0; i < n; i++) {
    const u = i / n1, b = table(BREATH_T, u) * m.breath, slow = Math.sin(TAU * i / (2 * n1));
    const jit = m.jitter * (.6 * Math.sin(TAU * 3 * i / n) + .4 * Math.sin(TAU * 7 * i / n + 1));
    const q = pz({ lean: m.lean + m.swayLean * slow, chest: m.chest, hx: m.hx + m.sway * slow + jit, hy: m.hy + m.bob * b, bow: m.bow, hat: m.hat, dim: m.dim, breath: b,
      fl: [.1 * m.legs + .45 * m.knee, .08 + m.knee], bl: [-.1 * m.legs - .2 * m.knee, .04 + .7 * m.knee],
      fa: [m.fa[0] + b * m.armBreath, m.fa[1]], ba: [m.ba[0] - b * m.armBreath, m.ba[1]], flutter: FLUT_T[Math.floor(u * 16 + 1e-6) % 16] * m.flutter });
    hands(q, m); plant(q);
    const fd = fidgets.length && FIDGETS[fidgets[Math.floor(i / seg) % fidgets.length]];
    if (fd) { const len = Math.min(seg, Math.max(4, Math.round(fd.dur * m.fps))), at = i % seg - (seg - len);
      if (at >= 0) { const r = fd.at(at / len); if (r.f) q.fa = toward(q.fa, r.f, r.w); if (r.b) q.ba = toward(q.ba, r.b, r.w); addTo(q, r.add); } }
    q.hx = Math.round(q.hx); q.hy = Math.round(q.hy);
    out.push(q);
  }
  return out;
}

// walk and run: 8 frames a stride (16 when he wobbles, which takes two)
export function gaitFrames(m) {
  const cycles = m.wobble ? 2 : 1, out = [];
  const stride = Math.max(0, m.stride), lift = Math.max(0, m.lift), swing = Math.max(0, m.swing);
  const lf = 1 - m.limp * .4, lk = 1 - m.limp * .6;          // the near leg, when he limps: a shorter, stiffer step
  for (let i = 0; i < 8 * cycles; i++) {
    const T = i / 8, ph = T % 1, slow = Math.sin(TAU * T / cycles);
    const a = TAU * (ph + m.limp * .06 * Math.sin(TAU * ph)), s = Math.sin(a), c = Math.cos(a), dip = .5 - .5 * Math.cos(2 * a);
    const q = pz({ hx: Math.round(m.hx + m.wobble * 2 * slow),
      hy: Math.round(m.hy + m.bounce * dip + m.heavy * 1.5 * dip ** 3 + m.limp * 1.5 * Math.max(0, -s)),
      lean: m.lean + m.rock * .06 * Math.cos(2 * a) + m.wobble * .1 * slow, chest: m.chest, bow: m.bow, hat: m.hat, dim: m.dim,
      fl: [stride * lf * s, m.knee0 + lift * lk * Math.max(0, c)], bl: [-stride * s, m.knee0 + lift * Math.max(0, -c)],
      fa: [-swing * s + m.fa0, m.faEl], ba: [swing * s + m.ba0, m.baEl], flutter: m.flutter * (i % 4) / 2 });
    hands(q, m); out.push(q);
  }
  // plant (the walk): the hips settle so the lower foot stays on the floor through the stride, in whole pixels; a long walking
  // stride would otherwise lift both feet off it where the legs split. 0 keeps a gait as it was (the run, which has a flight phase)
  if (m.plant) { const low = q => Math.max(reach(q.fl), reach(q.bl)), top = Math.max(...out.map(low));
    for (const q of out) q.hy += Math.round(m.plant * (top - low(q))); }
  return out;
}

// a whole personality: [[trait, strength], ...] plus optional hand-tuning -> poses, frame rates and speeds
export function bake(list, extra) {
  const m = mix(list, extra), idleFps = m.fidgets.length ? Math.max(m.idle.fps, 12) : m.idle.fps;   // fidgets need more than 6 fps to read
  return { idle: { poses: idleFrames({ ...m.idle, fps: idleFps }, m.fidgets), fps: idleFps },
    walk: { poses: gaitFrames(m.walk), fps: m.walk.fps }, run: { poses: gaitFrames(m.run), fps: m.run.fps },
    speed: { walk: m.walk.speed, run: m.run.speed }, fidgets: m.fidgets, knobs: m };
}
