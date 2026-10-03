// ---- The flow engine, ported from the "Animation Flow" page (owner 2026-10-02: "these animations and flow style";
// scratchpad af/core.js): clips (keyed in move space, or procedural), blends of 2–4 frames into each new clip, springs
// for the overlapping action, planted feet, and the pose and position sampled together at 30 fps.
// Everything here is in the page's own units ("rig px": his hip 19.8 high, the run 110/s); the 3D side scales by AF.
export const AF = .5;                         // rig px → world units: one rig px is one render pixel at 2× (the pages draw him so: ~46 px with the hat)
export const TAU = Math.PI * 2;
export const H = 19.8;                        // hip height in rig px (Iron Ash: thigh 9.4 + shin 9.2 + 1.2)
export const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const hv = h => [Math.sin(h), Math.cos(h)];                 // heading (atan2 dx, dz) to a floor vector
export const wrapA = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
export const faceK = h => ((Math.round(h / (Math.PI / 4)) % 8) + 8) % 8;
export const FA = [0, 1, 2, 3, 4, 5, 6, 7].map(k => { const a = k * Math.PI / 4; return a > Math.PI + 1e-6 ? a - TAU : a; }); // S SE E NE N NW W SW
export const hOf = (dx, dz) => Math.atan2(dx, dz);
export const DIR = { S: 0, SE: Math.PI / 4, E: Math.PI / 2, NE: 3 * Math.PI / 4, N: Math.PI, NW: -3 * Math.PI / 4, W: -Math.PI / 2, SW: -Math.PI / 4 };
export const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
// the effects a move throws (the dust of a stride, a stop, a roll) and their step each tick: the render side hands them
// in (iso/fx.js), so the core never imports three.js
export const FX = { dust() {}, step() {} };

export const EZ = { l: t => t, i: t => t * t * t, i2: t => t * t, o: t => 1 - (1 - t) ** 3, o2: t => 1 - (1 - t) ** 2, io: t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2, s: t => t * t * (3 - 2 * t),
  ob: t => { const c = 1.9, d = t - 1; return 1 + (c + 1) * d * d * d + c * d * d; }, h: () => 0 };

// pose mixing: numbers lerp, arrays per element; discrete fields come from one side
const DISC = { out: 1, two: 1, elb: 1, smear: 1, ev: 1 };
export function mixP(a, b, u, from) {
  if (a === undefined) return b; if (b === undefined) return a;
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * u;
  if (Array.isArray(a) && Array.isArray(b) && typeof a[0] === 'number') return a.map((x, i) => x + (b[i] - x) * u);
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) { const o = {};
    for (const k in a) o[k] = DISC[k] ? (from === 'b' ? (k in b ? b[k] : a[k]) : a[k]) : mixP(a[k], b[k], u, from);
    for (const k in b) if (!(k in a)) o[k] = DISC[k] ? (from === 'b' ? b[k] : undefined) : b[k]; return o; }
  return from === 'b' ? b : a;
}
export const clone = p => JSON.parse(JSON.stringify(p));

// ---- clips: keys [{ t, e: easing into the NEXT key, r: root distance along his heading, ...pose }], in his own frame (f forward, u up) ----
export const CLIPS = {};
export function keyed(name, keys, o = {}) { const p0 = keys[0].pel[0]; for (const k of keys) if (k.r == null) k.r = k.pel[0] - p0;  // the root rides under the pelvis
  CLIPS[name] = { name, kind: 'keys', keys, dur: keys[keys.length - 1].t, ...o }; return CLIPS[name]; }
function toLocal(p, r) { for (const k of ['pel', 'fN', 'fF', 'hN', 'hF']) if (p[k]) p[k] = [p[k][0] - r, p[k][1]]; if (p.blade && p.blade.g) p.blade = { ...p.blade, g: [p.blade.g[0] - r, p.blade.g[1]] }; return p; }
export function proc(name, fn, o = {}) { CLIPS[name] = { name, kind: 'proc', fn, ...o }; return CLIPS[name]; }
export function evalKeys(keys, t) {
  let i = 0; while (i + 1 < keys.length && keys[i + 1].t <= t) i++;
  const A = keys[i], B = keys[Math.min(i + 1, keys.length - 1)];
  if (A === B || t <= A.t) { const p = clone(A); return { p, r: A.r || 0, i }; }
  const u0 = clamp((t - A.t) / (B.t - A.t), 0, 1), u = EZ[A.e || 'io'](u0);
  const p = mixP(A, B, u, 'a'); return { p, r: (A.r || 0) + ((B.r || 0) - (A.r || 0)) * u, i };
}

// ---- springs: a mass on a spring hung from a bone; it keeps its velocity when the bone's changes, then settles ----
const spr = (w, z) => ({ x: 0, v: 0, w, z });
function sstep(s, target, dt, lim) { const a = s.w * s.w * (target - s.x) - 2 * s.z * s.w * s.v; s.v += a * dt; s.x += s.v * dt;
  if (lim != null) { if (s.x > lim) { s.x = lim; s.v = Math.min(s.v, 0); } if (s.x < -lim) { s.x = -lim; s.v = Math.max(s.v, 0); } } }

export const SETTINGS = { fps: 30, sec: 1, blend: 1, free: 0, fpsFor: null };   // the frame rate (or the style's fpsFor), how strong the springs are, engine blending, free yaw (not the 8 facings)
// the body's points the springs watch (the page's 2D skeleton, reduced to what they need)
const TORSO = 13.5, NECK = 1.6, HEADR = 4.3;
function points(p) { const sp = [Math.sin(p.lean), Math.cos(p.lean)], hd = p.lean + (p.head || 0), hs = [Math.sin(hd), Math.cos(hd)];
  const chest = [p.pel[0] + sp[0] * TORSO, p.pel[1] + sp[1] * TORSO], neck = [chest[0] + sp[0] * NECK, chest[1] + sp[1] * NECK];
  return { pel: p.pel, sh: [chest[0] - sp[0] * 1.6, chest[1] - sp[1] * 1.6], head: [neck[0] + hs[0] * HEADR, neck[1] + hs[1] * HEADR] }; }

export class Actor {
  constructor(W, o) { Object.assign(this, { W, foe: 0, x: 0, z: 0, y: 0, h: 0, ht: 0, v: 0, vt: 0, acc: 700, dec: 900, turn: 9, clip: null, ct: 0, snapP: null, bt: 0, bd: 0, phase: .3,
    sp: { hatF: spr(17, .32), hatU: spr(17, .35), kz: spr(12, .28), kzU: spr(12, .4), sodeF: spr(15, .35), sodeU: spr(15, .35), coat: spr(8, .32), swing: spr(14, .4), head: spr(13, .42), roll: spr(10, .75), lean: spr(11, .45) },
    feet: { N: { lock: 0, w: null, off: 0 }, F: { lock: 0, w: null, off: 0 } }, out: null, tick: 0, flash: 0, tint: null, tintA: 0, trail: [], prev: null, alpha: 1 }, o);
    this.fk = faceK(this.h); this.ht = this.h; this.flow = true; }
  play(name, o = {}) { const c = (this.wid && CLIPS[name + '@' + this.wid]) || CLIPS[name]; if (!c) throw new Error('no clip ' + name);   // wid: his weapon's own take on the move (weapons/)
    if (this.pose && (o.blend ?? c.blend ?? .06) > 0 && SETTINGS.blend) { this.snapP = clone(this.pose); this.bd = (o.blend ?? c.blend ?? .06); this.bt = 0; } else this.bd = 0;
    this.clip = c; this.ct = o.at || 0; this.lastR = null; this.co = o; this.fired = new Set(); this.ended = 0; if (c.enter) c.enter(this, o); }
  ev(name) { this.W.event(this, name); }
  update(dt) {
    const h0 = this.h;
    if (this.look && this.clip && (this.clip.name === 'guard' || this.clip.name === 'idle')) this.ht = hOf(this.look.x - this.x, this.look.z - this.z);
    const dh = wrapA(this.ht - this.h), m = this.turn * dt; this.h = wrapA(this.h + clamp(dh, -m, m)); this.v += clamp(this.vt - this.v, -this.dec * dt, this.acc * dt);
    this.wh = wrapA(this.h - h0) / dt;
    this.ct += dt; const c = this.clip; let pose, r = null;
    if (c.kind === 'keys') { const e = evalKeys(c.keys, Math.min(this.ct, c.dur)); pose = toLocal(e.p, e.r); r = e.r * (this.co.rs || 1);
      for (const k of c.keys) if (k.ev && k.t <= this.ct && !this.fired.has(k)) { this.fired.add(k); this.ev(k.ev); } }
    else { const e = c.fn(this, this.ct, dt); pose = e.p; r = e.r ?? null; if (e.move) this.move(e.move); }
    if (r != null) { if (this.lastR != null) this.move(r - this.lastR); this.lastR = r; }
    pose = clone(pose); if (!pose.hF) pose.hF = [pose.pel[0] + 3, pose.pel[1] + 2]; if (!pose.hN) pose.hN = [pose.pel[0] + 4, pose.pel[1] + 2];
    if (c.post) c.post(pose, this);                          // a weapon's own grips on the katana's keys (weapons/poses.js)
    if (this.bd > 0 && this.bt < this.bd) { this.bt += dt; pose = mixP(this.snapP, pose, EZ.s(clamp(this.bt / this.bd, 0, 1)), 'b'); }
    this.secondary(pose, dt);
    this.lockFeet(pose, dt);
    this.pose = pose;
    if (c.dur != null && !c.loop && this.ct >= c.dur && !this.ended) { this.ended = 1; const nx = this.co.next || c.next; if (nx) { if (typeof nx === 'function') nx(this); else this.play(nx); } }
    if (this.flash > 0) this.flash -= dt;
  }
  move(d) { const v = hv(this.mh ?? this.h); this.x += v[0] * d; this.z += v[1] * d; }
  // overlapping action: hat, kusazuri, sode, the jinbaori and the head hang off the body on springs and lag behind it
  secondary(p, dt) {
    const K = points(p), v = hv(this.h), k = SETTINGS.sec, sp = this.sp;
    const wp = q => [this.x + v[0] * q[0], this.y + q[1], this.z + v[1] * q[0]];
    const pts = { head: wp(K.head), pel: wp(K.pel), sh: wp(K.sh) };
    if (this.prev) { const vel = {}; for (const n in pts) { const a = pts[n], b = this.prev.pts[n]; vel[n] = [((a[0] - b[0]) * v[0] + (a[2] - b[2]) * v[1]) / dt, (a[1] - b[1]) / dt]; }
      if (this.prev.vel) { const pv = this.prev.vel, dv = n => [vel[n][0] - pv[n][0], vel[n][1] - pv[n][1]], g = (x, lim) => clamp(x, -lim, lim);
        const dhd = dv('head'), dp = dv('pel'), ds = dv('sh');
        sp.hatF.v -= g(dhd[0], 260) * k; sp.hatU.v -= g(dhd[1], 200) * k * .8;
        sp.kz.v -= g(dp[0], 260) * k * 1.2; sp.kzU.v -= g(dp[1], 200) * k;
        sp.sodeF.v -= g(ds[0], 260) * k * .9; sp.sodeU.v -= g(ds[1], 200) * k * .9;
        sp.head.v -= g(dp[0], 260) * .006 * k; sp.lean.v += Math.max(0, -g(dp[0], 300)) * .006 * k; }
      this.vel = vel; }
    this.prev = { pts, vel: this.vel };
    const vF = this.vel ? this.vel.pel[0] : 0;
    sstep(sp.hatF, 0, dt, 2.2 * k); sstep(sp.hatU, 0, dt, 1.3 * k); sstep(sp.kz, 0, dt, 3.2 * k); sstep(sp.kzU, 0, dt, 2 * k);
    sstep(sp.sodeF, 0, dt, 1.8 * k); sstep(sp.sodeU, 0, dt, 1.2 * k); sstep(sp.head, 0, dt, .3); sstep(sp.lean, 0, dt, .35);
    sstep(sp.coat, clamp(vF / 110, -1.2, 2.2) * (.55 + .45 * k) + (p.coat || 0), dt, 2.5);
    sstep(sp.swing, (p.swing || 0), dt); sstep(sp.roll, clamp(this.wh * clamp(vF, 0, 140) / 110 * .06, -.2, .2) * (.5 + .5 * k), dt);
    p.hatLag = [sp.hatF.x, sp.hatU.x]; p.hatTilt = (p.hatAbs ?? (p.hatTilt || 0) * .5) + sp.hatF.x * .07 * (1 + k) / 2;
    p.kzLag = sp.kz.x; p.kzLift = sp.kzU.x * .5; p.sodeLag = [sp.sodeF.x, sp.sodeU.x];
    p.speed = sp.coat.x; p.swing = sp.swing.x * (.6 + .4 * k); p.head = (p.head || 0) + sp.head.x; p.lean = p.lean + sp.lean.x; p.roll = (p.roll || 0) + sp.roll.x;
  }
  // planted feet stay where they landed on the floor; a lifted foot is free; a big mismatch lets go and eases back
  lockFeet(p, dt) {
    const v = hv(this.h), noLock = this.clip.noLock && this.clip.noLock(this);
    for (const k of ['N', 'F']) { const f = p['f' + k], ft = this.feet[k]; if (!f) continue;
      const down = f[1] < 2.4 && !noLock && this.y < .5;
      if (down) { if (!ft.lock) { ft.lock = 1; ft.w = [this.x + v[0] * f[0], this.z + v[1] * f[0]]; }
        else { const fl = (ft.w[0] - this.x) * v[0] + (ft.w[1] - this.z) * v[1], err = fl - f[0]; if (Math.abs(err) > 7) { ft.lock = 0; ft.off = err; } else f[0] = fl; } }
      else ft.lock = 0;
      if (!ft.lock && ft.off) { f[0] += ft.off; ft.off *= Math.exp(-dt * 28); if (Math.abs(ft.off) < .05) ft.off = 0; }
    }
  }
  // the frame: sampled at SETTINGS.fps, pose and position together; the drawn facing steps one of the 8 per frame toward
  // his heading (attacks and rolls snap), unless SETTINGS.free draws the heading itself
  sample(force) {
    const fps = SETTINGS.fpsFor ? SETTINGS.fpsFor(this) : SETTINGS.fps;   // the style's frame stepping (gfx/style.js); the motion itself steps at 1/120 s
    this.tick += this.W.dt; if (!force && this.out && this.tick < 1 / fps - 1e-6) return false; this.tick = 0;
    const tk = faceK(this.h); if (tk !== this.fk) { const d = ((tk - this.fk + 12) % 8) - 4; this.fk = (this.fk + (this.turnSnap ? (tk - this.fk) : Math.sign(d || 1)) + 8) % 8; }
    this.turnSnap = false;
    this.out = { pose: this.pose, x: this.x, y: this.y, z: this.z, yaw: SETTINGS.free ? this.h : FA[this.fk], flash: this.flash > 0, tint: this.tint, tintA: this.tintA, alpha: this.alpha, t: this.W.t };
    return true;
  }
}
