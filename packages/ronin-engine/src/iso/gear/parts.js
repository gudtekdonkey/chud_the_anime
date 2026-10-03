// ---- Gear parts: the procedural pieces a gear row is made of, measured from the skeleton's bones (look/three/rig.js SK),
// so they fit every pose and facing (rigid on their bone, as Iron Ash's armour is). A part names its ZONE and SHELL;
// the dresser (dress.js) builds parts inside out and keeps, per zone, how far the shells under it already stand off the
// body (`pads`, sampled at 5 points down the bone). A part's radius is the body's + that pad + its own thickness, so it
// always sits on what is under it: that is what lets any 200 pieces combine without poking through each other.
// Bone frames: torso and leg bones have +x his left and +z forward; arm bones +x outward (each side), +z forward on the
// left arm and backward on the right (rig.js aims them so); `out` and `front` below hide that.
import * as THREE from 'three';
import { SK } from '../rig3d.js';
import { colour } from './palette.js';
import { newPart } from '../gfx/build.js';

export const HC = SK.headR, HEAD_R = 1.9, FACE_Z = 1.78;    // the head's centre over its joint, its radius, the face's front
const lerp = (a, b, t) => a + (b - a) * t;
// the body under everything (shell 0): per zone, its bone, y from top to bottom on the bone, radius top → bottom, z squash
export const BODY = {
  neck: { bone: 'neck', y: [SK.neck + .1, -.3], r: [.66, .72] },
  chest: { bone: 'chest', y: [SK.torsoTop - SK.spineTop + .05, -.3], r: [2.2, 2.1], sq: .78 },
  belly: { bone: 'spine', y: [SK.spineTop, .35], r: [2.02, 1.82], sq: .78 },
  hips: { bone: 'hips', y: [.55, -1.5], r: [1.85, 1.98], sq: .8 },
  upper: { bone: 'arm', y: [.35, -SK.upper], r: [.66, .55] },
  fore: { bone: 'fore', y: [0, -SK.fore + .05], r: [.54, .42] },
  thigh: { bone: 'thigh', y: [.45, -SK.thigh], r: [1.1, .86] },
  shin: { bone: 'shin', y: [.05, -SK.shin + .25], r: [.82, .5] },
};
const ARM = { upper: 1, fore: 1, hand: 1 }, LEG = { thigh: 1, shin: 1, foot: 1 };
export const keyOf = (z, side) => (ARM[z] || LEG[z]) ? z + side : z;
const boneOf = (B, z, side) => { const b = BODY[z] ? BODY[z].bone : { crown: 'head', face: 'head', hand: 'hand', foot: 'foot' }[z]; return B[(ARM[z] || LEG[z]) ? b + side : b]; };
// a direction round a bone, by name, as an angle in its x/z plane (0 = +z)
function dirA(z, side, d) {
  if (typeof d === 'number') return d; const sg = side === 'R' ? -1 : 1;
  if (ARM[z]) return { out: Math.PI / 2, in: -Math.PI / 2, front: sg > 0 ? 0 : Math.PI, back: sg > 0 ? Math.PI : 0 }[d];
  if (LEG[z]) return { out: sg * Math.PI / 2, in: -sg * Math.PI / 2, front: 0, back: Math.PI }[d];
  return { front: 0, back: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 }[d];
}
// a point given in "outward / up / forward" terms on a limb → the bone's own frame
const local = (z, side, p) => { const sg = side === 'R' ? -1 : 1; if (LEG[z]) return [p[0] * sg, p[1], p[2]]; if (ARM[z]) return [p[0], p[1], p[2] * sg]; return p; };

// ---- the context the dresser hands each part: where to put geometry, the pads, the springs ----
export function makeCtx(rig, pal) {
  const acc = new Map(), pads = {};
  const ctx = {
    rig, B: rig.B, pal, pads,
    col: ref => colour(ref, ctx.pal),
    // geometry for `node`, merged per node and material (cloth is double-sided)
    pc(node, cloth = false) { let e = acc.get(node); if (!e) acc.set(node, e = {}); const k = cloth ? 'cloth' : 'mat'; return e[k] || (e[k] = rig.newPiece()); },
    acc,
    pad(key) { return pads[key] || (pads[key] = [0, 0, 0, 0, 0]); },
    padMax(key, a = 0, b = 1) { const p = ctx.pad(key); let m = 0; for (let i = 0; i < 5; i++) { const t = i / 4; if (t >= a - .13 && t <= b + .13) m = Math.max(m, p[i]); } return m; },
    raise(key, a, b, f) { const p = ctx.pad(key); for (let i = 0; i < 5; i++) { const t = i / 4; if (t >= a - .13 && t <= b + .13) p[i] = Math.max(p[i], f(Math.min(1, Math.max(0, (t - a) / Math.max(1e-3, b - a))))); } },
    node(parent, p = [0, 0, 0], r = [0, 0, 0]) { const o = new THREE.Object3D(); o.position.set(...p); o.rotation.set(...r); parent.add(o); return o; },
  };
  return ctx;
}

// ---- the part kinds. Each builds `q` (the row's part, already given its side) and raises its zone's pad ----
export const KINDS = {
  // a sleeve, a trouser leg, a shirt's body, a bracer: a tapered tube down the bone between t[0] and t[1]
  tube(ctx, q, side) {
    const Z = BODY[q.z], bone = boneOf(ctx.B, q.z, side), key = keyOf(q.z, side), [ta, tb] = q.t || [0, 1], th = q.th ?? .12, fl = q.fl || [0, 0];
    const base = ctx.padMax(key, ta, tb), y0 = lerp(Z.y[0], Z.y[1], ta), y1 = lerp(Z.y[0], Z.y[1], tb);
    const r0 = lerp(Z.r[0], Z.r[1], ta) + base + th + fl[0], r1 = lerp(Z.r[0], Z.r[1], tb) + base + th + fl[1], sq = q.sq ?? Z.sq ?? 1;
    const off = local(q.z, side, [q.off ? q.off[0] : 0, 0, q.off ? q.off[1] : 0]), cloth = q.open || q.cloth;
    newPart(); const pc = ctx.pc(bone, cloth), o = { p: [off[0], (y0 + y1) / 2, off[2]], s: [1, 1, sq] };
    if (q.open) pc.ring2(r0, r1, y0 - y1, q.seg || 8, ctx.col(q.c), o); else pc.cyl(r0, r1, y0 - y1, q.seg || 8, ctx.col(q.c), o);
    if (q.hem) { newPart(); pc.cyl(r1 + .05, r1 + .08, .28, q.seg || 8, ctx.col(q.hem), { p: [off[0], y1 + .14, off[2]], s: [1, 1, sq] }); }
    if (q.top) { newPart(); pc.cyl(r0 + .06, r0 + .04, .26, q.seg || 8, ctx.col(q.top), { p: [off[0], y0 - .13, off[2]], s: [1, 1, sq] }); }
    ctx.raise(key, ta, tb, u => base + th + lerp(fl[0], fl[1], u) + .02);
  },
  // horizontal lames (a dō, a skirt of plates, a laced sleeve): n bands down t, each flaring a little, laced at the foot
  lames(ctx, q, side) {
    const Z = BODY[q.z], bone = boneOf(ctx.B, q.z, side), key = keyOf(q.z, side), [ta, tb] = q.t || [0, 1], th = q.th ?? .2, n = q.n || 3, base = ctx.padMax(key, ta, tb), sq = q.sq ?? Z.sq ?? 1;
    const pc = ctx.pc(bone), cs = [q.c, q.c2 || q.c];
    for (let i = 0; i < n; i++) { const a = lerp(ta, tb, i / n), b = lerp(ta, tb, (i + 1) / n), ya = lerp(Z.y[0], Z.y[1], a), yb = lerp(Z.y[0], Z.y[1], b);
      const ra = lerp(Z.r[0], Z.r[1], a) + base + th, rb = lerp(Z.r[0], Z.r[1], b) + base + th + (q.flare ?? .08);
      newPart(); pc.cyl(ra, rb, (ya - yb) * 1.04, q.seg || 8, ctx.col(cs[i % 2]), { p: [0, (ya + yb) / 2, 0], s: [1, 1, sq] });
      if (q.lace) pc.cyl(rb + .02, rb + .02, .18, q.seg || 8, ctx.col(q.lace), { p: [0, yb + .12, 0], s: [1, 1, sq * 1.01] }); }
    if (q.plate) { const t = (ta + tb) / 2, r = (lerp(Z.r[0], Z.r[1], t) + base + th) * sq + .08; newPart();      // a lit plate on the chest
      pc.box(q.plate[0], q.plate[1], .3, ctx.col(q.hi || q.c2 || q.c), { p: [0, lerp(Z.y[0], Z.y[1], t) + (q.plateY || 0), r] }); }
    ctx.raise(key, ta, tb, () => base + th + (q.flare ?? .08) + .04);
  },
  // thin rings at the given t's: lacing, ties, an obi, cords (trim: they raise nothing)
  band(ctx, q, side) {
    const Z = BODY[q.z], bone = boneOf(ctx.B, q.z, side), key = keyOf(q.z, side), pc = ctx.pc(bone);
    for (const [j, t] of q.at.entries()) { const base = ctx.padMax(key, t, t), r = lerp(Z.r[0], Z.r[1], t) + base + (q.th ?? .06), y = lerp(Z.y[0], Z.y[1], t);
      const tl = q.tilt ? q.tilt * (j % 2 ? 1 : -1) : 0;   // tilted (a wrap, a sash): wider in x so it never sinks into the sides
      newPart(); pc.cyl(r, r + (q.fl || 0), q.h ?? .22, q.seg || 8, ctx.col(q.c), { p: [0, y, 0], s: [1 / Math.cos(tl), 1, q.sq ?? Z.sq ?? 1], r: [0, 0, tl] }); }
    if (!q.trim) { const [a, b] = [Math.min(...q.at), Math.max(...q.at)], m = ctx.padMax(key, a, b); ctx.raise(key, a, b, () => m + (q.th ?? .06) + .02); }
  },
  // wraps: bands that overlap at a slant down a limb (leg wraps, arm wraps, hand wraps up the forearm)
  wrap(ctx, q, side) {
    const n = q.n || 6, [ta, tb] = q.t || [0, 1], at = Array.from({ length: n }, (_, i) => lerp(ta, tb, (i + .5) / n));
    KINDS.band(ctx, { ...q, at, h: (tb - ta) * (BODY[q.z].y[0] - BODY[q.z].y[1]) / n * 1.25, tilt: q.tilt ?? .14, trim: true, fl: -.03 }, side);
    if (q.c2) KINDS.band(ctx, { ...q, at: [ta + .02, tb - .02], c: q.c2, h: .14, th: (q.th ?? .06) + .04, trim: true }, side);
    const key = keyOf(q.z, side), base = ctx.padMax(key, ta, tb); ctx.raise(key, ta, tb, () => base + (q.th ?? .06) + .04);
  },
  // plates on one side of a limb or the torso: rows down t, centred at `face`, `w` wide (splints, kote, suneate, haidate)
  plates(ctx, q, side) {
    const Z = BODY[q.z], bone = boneOf(ctx.B, q.z, side), key = keyOf(q.z, side), [ta, tb] = q.t || [0, 1], n = q.n || 3, th = q.th ?? .2, base = ctx.padMax(key, ta, tb), sq = q.sq ?? Z.sq ?? 1;
    const faces = [].concat(q.face ?? 'out'), pc = ctx.pc(bone), cs = [q.c, q.c2 || q.c];
    for (const f of faces) { const a = dirA(q.z, side, f);
      for (let i = 0; i < n; i++) { const t = lerp(ta, tb, (i + .5) / n), r = lerp(Z.r[0], Z.r[1], t) + base + th / 2, y = lerp(Z.y[0], Z.y[1], t), h = (tb - ta) * (Z.y[0] - Z.y[1]) / n * (q.gap ? .8 : 1.08);
        newPart(); pc.box(q.w ?? 1, h, th, ctx.col(cs[i % 2]), { p: [Math.sin(a) * r, y, Math.cos(a) * r * sq], r: [q.tip || 0, a, 0] });
        if (q.lace) pc.box((q.w ?? 1) * .9, .12, th + .04, ctx.col(q.lace), { p: [Math.sin(a) * r, y - h / 2 + .08, Math.cos(a) * r * sq], r: [0, a, 0] }); } }
    ctx.raise(key, ta, tb, () => base + th + .03);
  },
  // panels hung on hinges round the hips: kusazuri, a hakama's skirt, a straw skirt, an apron, a coat's tails
  skirt(ctx, q) {
    const B = ctx.B, rig = ctx.rig, n = q.n || 6, at = q.at || Array.from({ length: n }, (_, i) => (i + .5) / n * Math.PI * 2 - Math.PI);
    const hp = ctx.padMax('hips', .5, 1), tp = Math.max(ctx.padMax('thighL', 0, .4), ctx.padMax('thighR', 0, .4));
    const rx = Math.max(BODY.hips.r[1] + hp, SK.hipJ[0] + BODY.thigh.r[0] + tp - .35) + .12, rz = rx * .82, top = q.top ?? .4, cloth = !!q.cloth;
    for (const ang of at) {
      const yawN = ctx.node(B.hips, [0, top, 0], [0, ang, 0]), r = 1 / Math.hypot(Math.sin(ang) / rx, Math.cos(ang) / rz), rest = (q.rest ?? -.2) - tp * .25;
      const h = ctx.node(yawN, [0, 0, r], [rest, 0, 0]), pc = ctx.pc(h, cloth), rows = q.rows || 1, len = q.len || 3, w = q.w || 1.8;
      for (let i = 0; i < rows; i++) { const L = len / rows; newPart();
        pc.box(w * (1 + i * (q.spread ?? .04)), L * 1.05, q.th ?? .26, ctx.col(i % 2 ? (q.c2 || q.c) : q.c), { p: [0, -L * (i + .5), i * .04] });
        if (q.lace) pc.box(w * .96, .22, (q.th ?? .26) + .04, ctx.col(q.lace), { p: [0, -L * (i + 1) + .14, i * .04 + .02] }); }
      if (q.hem) { newPart(); pc.box(w * 1.02, .26, (q.th ?? .26) + .05, ctx.col(q.hem), { p: [0, -len + .1, .03] }); }
      rig.springs.push(cloth ? { node: h, rest, out: Math.cos(ang) < 0 ? 1 : -1, kind: 'cloth', side: Math.sin(ang) } : { node: h, rest, ang, kind: 'plate' });
    }
    ctx.raise('hips', .3, 1, () => hp + (q.th ?? .26) + .1);
  },
  // panels hung from the chest: a surcoat's or a coat's front and back, a cape, a straw rain cape's layers
  panel(ctx, q) {
    const B = ctx.B, rig = ctx.rig, cp = ctx.padMax('chest', 0, .6), Z = BODY.chest, y = q.y ?? -.65;
    for (const [x, where, w, len] of q.items) {
      const back = where === 'back', r = (lerp(Z.r[0], Z.r[1], .8) + cp + .18) * Z.sq, out = back ? 1 : -1, rest = (q.rest ?? .08) * out;
      const h = ctx.node(B.chest, [x, y, back ? -r : r], [rest, 0, 0]), pc = ctx.pc(h, true); newPart();
      pc.box(w, len, q.th ?? .3, ctx.col(q.c), { p: [0, -len / 2, 0] });
      if (q.hem) pc.box(w, .3, (q.th ?? .3) + .04, ctx.col(q.hem), { p: [0, -len + .2, 0] });
      rig.springs.push({ node: h, rest, out, kind: 'cloth', side: x || .001 });
    }
    if (q.yoke) { newPart(); const r = (Z.r[0] + cp + .2); ctx.pc(B.chest, true).box(r * 2 + .5, .55, r * Z.sq * 2 + .3, ctx.col(q.yoke), { p: [0, Z.y[0] - .25, 0] });
      if (q.yokeBack) ctx.pc(B.chest, true).box(r * 2 - .4, 3.4, .32, ctx.col(q.yoke), { p: [0, Z.y[0] - 1.9, -r * Z.sq - .1] });
      if (q.mon) { newPart(); ctx.pc(B.chest, true).cyl(1.0, 1.0, .1, 8, ctx.col(q.mon), { p: [0, Z.y[0] - 1.6, -r * Z.sq - .3], r: [Math.PI / 2, 0, 0] }).cyl(.5, .5, .12, 8, ctx.col(q.yoke), { p: [0, Z.y[0] - 1.6, -r * Z.sq - .32], r: [Math.PI / 2, 0, 0] }); } }
    ctx.raise('chest', 0, 1, () => cp + .3);
  },
  // the crossed collar of a kimono, left over right, on whatever the chest wears
  collar(ctx, q) {
    const Z = BODY.chest, cp = ctx.padMax('chest', 0, .4), r = (Z.r[0] + cp + .06) * Z.sq, pc = ctx.pc(ctx.B.chest, true), top = Z.y[0] - .2, d = q.deep ?? 2.4;
    newPart(); pc.box(.55, d, .12, ctx.col(q.c), { p: [-.42, top - d / 2 + .1, r], r: [0, 0, -.42] });
    newPart(); pc.box(.55, d, .14, ctx.col(q.c), { p: [.42, top - d / 2 + .1, r + .05], r: [0, 0, .42] });
    if (q.under) { newPart(); pc.box(.9, d * .5, .1, ctx.col(q.under), { p: [0, top - d * .25, r - .03] }); }
  },
  // a cap over the head: a hood, a helmet's bowl, hair (a SphereGeometry cut by theta; `open` leaves the face clear)
  cap(ctx, q) {
    const base = Math.max(ctx.padMax('crown'), q.face ? ctx.padMax('face') : 0), th = q.th ?? .14, r = HEAD_R + base + th, open = q.open ?? 0;
    const geo = new THREE.SphereGeometry(r, q.seg || 10, q.rings || 6, Math.PI / 2 + open / 2, Math.PI * 2 - open, q.from || 0, q.theta ?? 1.7);
    newPart(); ctx.pc(ctx.B.head, !!q.cloth).add(geo, ctx.col(q.c), { p: [0, HC + (q.dy || 0), q.dz || 0], s: q.s || [1, 1, 1] });
    if (q.rim) { newPart(); const rr = r * Math.sin(q.theta ?? 1.7); ctx.pc(ctx.B.head).cyl(rr + .06, rr + .1, .24, q.seg || 10, ctx.col(q.rim), { p: [0, HC + (q.dy || 0) + r * Math.cos(q.theta ?? 1.7), q.dz || 0] }); }
    ctx.raise('crown', 0, 1, () => base + th + (q.bump || 0));
    if (!open && (q.theta ?? 1.7) > 1.5) { ctx.raise('face', 0, 1, () => base + th); ctx.raise('eye', 0, 1, () => base + th); }   // a closed hood: the eyes glow through it
  },
  // a helmet's neck guard: open rings stepping out below the bowl, the front left clear
  shikoro(ctx, q) {
    const base = ctx.padMax('crown'), n = q.n || 3, open = q.open ?? 2.2, pc = ctx.pc(ctx.B.head);
    for (let i = 0; i < n; i++) { const rt = HEAD_R + base + .05 + i * (q.flare ?? .35), rb = rt + (q.flare ?? .35), h = q.h ?? .75, y = HC - .15 - i * h * .85;
      newPart(); pc.add(new THREE.CylinderGeometry(rt, rb, h, 10, 1, true, open / 2, Math.PI * 2 - open), ctx.col(i % 2 ? (q.c2 || q.c) : q.c), { p: [0, y - h / 2, -.1] });
      if (q.lace) pc.add(new THREE.CylinderGeometry(rb + .02, rb + .02, .14, 10, 1, true, open / 2, Math.PI * 2 - open), ctx.col(q.lace), { p: [0, y - h + .1, -.1] }); }
  },
  // over the face: menpō, a half mask, a cloth wrap, a beak (they stand on the face's own pad)
  mask(ctx, q) {
    const base = ctx.padMax('face'), z = FACE_Z + base, pc = ctx.pc(ctx.B.head, q.style === 'wrap'), c = ctx.col(q.c), c2 = ctx.col(q.c2 || q.c);
    newPart();
    if (q.style === 'wrap') {   // cloth over nose and mouth, round to the ears
      pc.add(new THREE.SphereGeometry(HEAD_R + base + .1, 10, 4, Math.PI / 2 - 1.5, 3.0, 1.45, .95), c, { p: [0, HC, 0] });
    } else {
      const lo = q.style === 'half' || q.style === 'oni' || q.style === 'menpo';
      pc.box(2.1, lo ? 1.4 : 2.3, .4, c, { p: [0, HC - (lo ? .6 : .15), z + .1] });
      if (q.style === 'menpo' || q.style === 'oni') { pc.box(.42, .62, .55, c2, { p: [0, HC - .2, z + .45] }); pc.box(.9, .14, .1, ctx.col('k0'), { p: [0, HC - .95, z + .32] });
        for (const sx of [1, -1]) pc.box(.65, 1.0, .5, c2, { p: [1.15 * sx, HC - .7, z - .4], r: [0, .55 * sx, 0] });
        newPart(); pc.cyl(1.35, 1.95, 1.0, 8, ctx.col(q.throat || q.c), { p: [0, HC - 1.85, .2] }); }
      if (q.style === 'oni') { for (const sx of [1, -1]) pc.box(.8, .18, .2, c2, { p: [.55 * sx, HC + .65, z + .2], r: [0, 0, -.35 * sx] });
        pc.box(1.0, .16, .14, ctx.col('w5'), { p: [0, HC - 1.0, z + .36] }); }
      if (q.style === 'beak') pc.add(new THREE.ConeGeometry(.55, 2.2, 6), c2, { p: [0, HC - .5, z + 1.2], r: [Math.PI / 2, 0, 0] });
      if (q.style === 'full') for (const sx of [1, -1]) pc.box(.7, .16, .1, ctx.col('k0'), { p: [.55 * sx, HC + .2, z + .32] });   // the eye slits
    }
    ctx.raise('face', 0, 1, () => base + (q.style === 'wrap' ? .12 : .5));
    if (q.style === 'full') ctx.raise('eye', 0, 1, () => base + .32);   // a full mask: the eyes in its slits
  },
  // a hat: on the head's pivot (rig.js tips it with the overlay's hat tilt and the spring's lag), lifted over what the
  // crown already wears. A brimmed hat becomes the rig's hat: the brim shadows his face and the glint rule keeps his eyes
  hat(ctx, q) {
    const rig = ctx.rig, B = ctx.B, base = ctx.padMax('crown'), hp = rig.hatPivot || (rig.hatPivot = ctx.node(B.head, [0, HC + .55, 0])), hat = ctx.node(hp, [0, base * .8, 0]), R = q.R ?? 9.5;
    const pc = ctx.pc(hat, !!q.cloth), c = ctx.col(q.c), c2 = ctx.col(q.c2 || q.c), seg = q.seg || 14;
    newPart();
    if (q.style === 'tengai') {   // the basket: down over the face to the chin
      pc.cyl(1.9 + base, 2.5 + base, 4.6, 12, c, { p: [0, -.6, 0] }); pc.cyl(2.0 + base, 2.0 + base, .3, 12, c2, { p: [0, 1.7, 0] });
      for (let i = 0; i < 4; i++) { newPart(); pc.cyl(2.0 + base + i * .15, 2.1 + base + i * .15, .14, 12, c2, { p: [0, 1.2 - i * 1.1, 0] }); }
      const fp = ctx.padMax('face'); ctx.raise('crown', 0, 1, () => base + .8); ctx.raise('face', 0, 1, () => fp + .7); return;
    }
    const h = q.h ?? 1.8, top = q.style === 'kasa' ? .08 : q.style === 'dome' ? R * .55 : 1.0;
    pc.cyl(top, R, h, seg, c, { p: [0, h / 2 - .05, 0] });
    if (q.style === 'dome') pc.cyl(.3, R * .55, h * .7, seg, c, { p: [0, h + h * .35 - .1, 0] });
    newPart(); pc.ring(R + .1, .42, seg, c2, { p: [0, -.05, 0] });
    if (q.ribs) { newPart(); for (let i = 0; i < q.ribs; i++) { const a = (i + .5) * Math.PI * 2 / q.ribs, r0 = top + .2, r1 = R - .35, mx = (r0 + r1) / 2, my = h * .5 + .08, len = Math.hypot(r1 - r0, h), tilt = Math.atan2(h, r1 - r0);
      pc.box(.2, .12, len, ctx.col(q.rib || q.c2 || q.c), { p: [Math.sin(a) * mx, my, Math.cos(a) * mx], r: [tilt, a, 0] }); } }
    if (q.knob) { newPart(); pc.cyl(.55, .8, .55, 8, c2, { p: [0, h + .1, 0] }); }
    if (q.band) { newPart(); pc.cyl(R * .42 + .1, R * .42 + .18, .3, seg, ctx.col(q.band), { p: [0, h * .55, 0] }); }
    if (q.veil) { newPart(); ctx.pc(hat, true).ring2(R * .55, R * .6, 3.4, 12, ctx.col(q.veil), { p: [0, -1.7, 0] }); const fp = ctx.padMax('face'); ctx.raise('face', 0, 1, () => fp + .3); }
    if (q.cords !== false) for (const sx of [1, -1]) { const hn = ctx.node(B.head, [1.3 * sx, HC + .2, .3]); newPart();
      ctx.pc(hn).box(.16, 2.1, .16, ctx.col(q.cord || 'm3'), { p: [-.22 * sx, -1.0, .3], r: [-.25, 0, .25 * sx] }); rig.springs.push({ node: hn, kind: 'cord' }); }
    if (R > 4) { rig.hat = hat; rig.hatR = R; }
    ctx.raise('crown', 0, 1, () => base + .3);
  },
  // on a helmet's front: horns, a crescent, a disc, a plume (detail: raises nothing)
  crest(ctx, q) {
    const base = ctx.padMax('crown'), pc = ctx.pc(ctx.B.head), c = ctx.col(q.c), y = HC + 1.0, z = (HEAD_R + base) * .82; newPart();
    if (q.style === 'kuwagata') { pc.box(.8, .6, .2, ctx.col(q.c2 || q.c), { p: [0, y - .1, z + .1] }); for (const sx of [1, -1]) pc.box(.22, 3.0, .14, c, { p: [.75 * sx, y + 1.4, z + .15], r: [0, 0, -.32 * sx] }); }
    else if (q.style === 'crescent') pc.add(new THREE.TorusGeometry(1.7, .14, 3, 14, Math.PI * .8), c, { p: [0, y + .55, z + .2], r: [0, 0, Math.PI * .1] });
    else if (q.style === 'disc') { pc.cyl(.75, .75, .14, 10, c, { p: [0, y + .6, z + .15], r: [Math.PI / 2, 0, 0] }); pc.cyl(.35, .35, .16, 8, ctx.col(q.c2 || q.c), { p: [0, y + .6, z + .2], r: [Math.PI / 2, 0, 0] }); }
    else if (q.style === 'horns') for (const sx of [1, -1]) pc.add(new THREE.ConeGeometry(.32, 1.9, 5), c, { p: [1.25 * sx, y + .6, z * .45], r: [0, 0, -.5 * sx] });
    else if (q.style === 'plume') pc.box(.3, .5, 3.2, c, { p: [0, y + 1.3, -.6], r: [-.5, 0, 0] });
    else if (q.style === 'tall') pc.add(new THREE.ConeGeometry(1.2, 3.4, 8), c, { p: [0, y + 1.9, -.5], r: [-.35, 0, 0] });
    else if (q.style === 'ridge') pc.add(new THREE.TorusGeometry(HEAD_R + base + .02, .16, 3, 12, Math.PI), c, { p: [0, HC, 0], r: [0, Math.PI / 2, Math.PI / 2] });
    if (q.fuki) for (const sx of [1, -1]) { newPart(); pc.box(.2, .9, 1.0, ctx.col(q.fuki), { p: [(HEAD_R + base + .25) * sx, HC - .25, z * .55], r: [0, .55 * sx, 0] }); }
  },
  // a glove or a gauntlet over the hand; `cuff` runs it up the forearm, `plate` lays a plate on its back, `claws` the shuko
  glove(ctx, q, side) {
    const hand = boneOf(ctx.B, 'hand', side), base = ctx.padMax('hand' + side), th = q.th ?? .1, p = base + th, pc = ctx.pc(hand);
    newPart(); pc.box(.72 + 2 * p, .84 + p, .66 + 2 * p, ctx.col(q.c), { p: [0, -.4, 0] });
    if (q.plate) { newPart(); pc.box(.18, .62, .62 + 2 * p, ctx.col(q.plate), { p: [.36 + p + .06, -.3, 0] }); }
    if (q.claws) for (const dz of [-.22, 0, .22]) { newPart(); pc.box(.3, .1, .1, ctx.col(q.claws), { p: [-(.36 + p + .12), -.55, dz] }); }
    if (q.cuff) KINDS.tube(ctx, { k: 'tube', z: 'fore', t: [q.cuff, 1], th: q.cuffTh ?? th + .04, fl: [0, .05], c: q.c2 || q.c }, side);
    ctx.raise('hand' + side, 0, 1, () => p + .02);
  },
  // over the foot: a tabi, a boot, a kogake; `up` runs it up the shin, `split` draws the tabi's toe
  boot(ctx, q, side) {
    const foot = boneOf(ctx.B, 'foot', side), base = ctx.padMax('foot' + side), th = q.th ?? .1, p = base + th, pc = ctx.pc(foot);
    newPart(); pc.box(.8 + 2 * p, .62 + p, 1.62 + 2 * p, ctx.col(q.c), { p: [0, -.3 + p / 2, .4] });
    if (q.split) pc.box(.06, .5, .3, ctx.col('k0'), { p: [-.1, -.28, 1.2 + p] });
    if (q.plates) for (let i = 0; i < q.plates; i++) { newPart(); pc.box(.86 + 2 * p, .14, .4, ctx.col(i % 2 ? q.c2 || q.c : q.p || q.c), { p: [0, .04 + p - i * .02, .9 - i * .42], r: [-.22, 0, 0] }); }
    if (q.up) KINDS.tube(ctx, { k: 'tube', z: 'shin', t: [q.up, 1], th: q.upTh ?? th + .04, fl: [q.flUp || 0, 0], c: q.c2 || q.c }, side);
    if (q.spikes) for (const dz of [.2, .7]) { newPart(); pc.box(.6, .16, .12, ctx.col(q.spikes), { p: [0, -.72, dz] }); }
    ctx.raise('foot' + side, 0, 1, () => p + .02);
  },
  // under the foot: a sandal's sole and straps, a geta's teeth
  sole(ctx, q, side) {
    const foot = boneOf(ctx.B, 'foot', side), base = ctx.padMax('foot' + side), pc = ctx.pc(foot), c = ctx.col(q.c), c2 = ctx.col(q.c2 || q.c);
    newPart(); pc.box(1.1 + base, q.style === 'geta' ? .3 : .25, 2.3 + base, c, { p: [0, -.62, .4] });
    if (q.style === 'geta') for (const dz of [-.25, 1.05]) pc.box(1.0, .3, .2, c, { p: [0, -.86, dz] });
    if (q.style !== 'flat') { newPart(); pc.box(.22, .25, .8, c2, { p: [0, -.38 + base, 1.1 + base] });
      for (const sx of [1, -1]) pc.box(.14, .5, .14, c2, { p: [(.45 + base) * sx, -.25, .2], r: [0, 0, .2 * sx] }); }
  },
  // a shoulder guard on its hinge (rig.js swings it with the sode spring): rows of plates (or one padded panel)
  sode(ctx, q, side) {
    const arm = boneOf(ctx.B, 'upper', side), base = ctx.padMax('upper' + side, 0, .5), rest = (q.rest ?? .12) + base * .2;
    const sh = ctx.node(arm, [.85 + base, .4 + (q.dy || 0), 0], [0, 0, rest]), pc = ctx.pc(sh, !!q.cloth), rows = q.rows || 3, L = q.len ?? 1.12, w = q.w ?? 2.8;
    for (let i = 0; i < rows; i++) { newPart(); pc.box(q.th ?? .28, L * 1.1, w * (1 + i * (q.spread ?? .03)), ctx.col(i % 2 ? (q.c2 || q.c) : q.c), { p: [i * (q.step ?? .12), -.55 - i * L, 0] });
      if (q.lace) pc.box((q.th ?? .28) + .04, .22, w * (1 + i * (q.spread ?? .03)) + .04, ctx.col(q.lace), { p: [i * (q.step ?? .12) + .02, -1.1 - i * L, 0] }); }
    if (q.cap) { newPart(); pc.add(new THREE.SphereGeometry(.9, 6, 3, 0, Math.PI * 2, 0, 1.3), ctx.col(q.cap), { p: [-.55, .15, 0] }); }
    ctx.rig.springs.push({ node: sh, rest, kind: 'sode', sx: side === 'R' ? -1 : 1 });
    ctx.raise('upper' + side, 0, .5, () => base + .25);
  },
  // a detail: a box `on` the zone's surface ([direction, t]: a crest, a patch, a pouch, a buckle), standing on what is
  // already worn there and facing out; or at p in the zone's outward / up / forward terms, pushed out by its pad (`rad`)
  box(ctx, q, side) {
    const bone = boneOf(ctx.B, q.z, side), key = keyOf(q.z, side), pc = ctx.pc(bone, !!q.cloth); newPart();
    if (q.on) { const Z = BODY[q.z], [d, t] = q.on, a = dirA(q.z, side, d), r = lerp(Z.r[0], Z.r[1], t) + ctx.padMax(key, t, t) + q.s[2] / 2, sq = Z.sq ?? 1, rr = q.r || [0, 0, 0];
      pc.box(...q.s, ctx.col(q.c), { p: [Math.sin(a) * r, lerp(Z.y[0], Z.y[1], t) + (q.dy || 0), Math.cos(a) * r * sq], r: [rr[0], a + rr[1], rr[2]] }); return; }
    const p = local(q.z, side, q.p), pad = q.rad ? ctx.padMax(key) : 0, d = Math.hypot(p[0], p[2]) || 1;
    pc.box(...q.s, ctx.col(q.c), { p: [p[0] + p[0] / d * pad, p[1], p[2] + p[2] / d * pad], r: q.r ? local(q.z, side, q.r) : [0, 0, 0] });
  },
  // a hanging tail (a headband's, a sash's, a hood's): its own hinge, swung by the cord or cloth spring
  tail(ctx, q, side) {
    const bone = boneOf(ctx.B, q.z, side), key = keyOf(q.z, side), p = local(q.z, side, q.p), pad = ctx.padMax(key), d = Math.hypot(p[0], p[2]) || 1;
    const h = ctx.node(bone, [p[0] + p[0] / d * pad, p[1], p[2] + p[2] / d * pad], [q.rest ?? .2, 0, q.roll || 0]); newPart();
    ctx.pc(h, true).box(q.w ?? .5, q.len, .12, ctx.col(q.c), { p: [0, -q.len / 2, 0] });
    ctx.rig.springs.push(q.z === 'crown' || q.z === 'neck' ? { node: h, kind: 'cord' } : { node: h, rest: q.rest ?? .2, out: 1, kind: 'cloth', side: p[0] || .001 });
  },
};
