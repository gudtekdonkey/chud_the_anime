// ---- THE HEAD-SLOT CONTRACT (docs/hair.md): how a hat and a hairstyle meet, as data both sides declare, so hair is
// never drawn through a hat in any pose or facing. Shared with the armour work: a helmet or hat from any session
// declares the fields below and the hair follows them; nothing here knows a particular hat.
//
// Spaces (world units, the 3D look's skeleton): HEAD space is the head bone's (origin at the skull's base, y up,
// +z his face, +x his left); every hair part and every head-mounted hat is built in CENTRE space, HEAD + (0, HC, 0),
// the middle of the scalp. A hat's shells are in its own node's space (centre space for `mount: 'head'`; the brim
// pivot's for `mount: 'pivot'`, which lags and tilts on the hat's springs as the jingasa always has).
//
// A hairstyle has REGIONS: crown (the top of the scalp), back, sides, fringe, tail (anything that hangs), strands
// (loose locks at the face) and knot (a crown item: a topknot, a bun on the crown, a high tail's tie). A hat says for
// each region `show` (drawn, kept inside the hat's shells: compressed under it where they meet) or `hide` (not drawn:
// fully covered), and what a crown item does: `show`, `under` (compressed into the hat), `through` (out of a hole in
// its top: the kabuto's tehen), `inside` (housed by a tall crown: the eboshi), `behind` (re-tied low at the nape),
// `hide`, or `refuse` (the pair cannot be worn: the bandana takes only hair with nothing on the crown, owner).
import { SK } from 'ronin-engine/iso/rig3d.js';

export const HC = SK.headR;                                  // the scalp's middle, above the head joint
export const SCALP = [1.95, 2.05, 1.95];                     // the head ball's radii (ronin.js: ball 1.95, y ×1.05)
export const REGIONS = ['crown', 'back', 'sides', 'fringe', 'tail', 'strands', 'knot'];
export const KNOT_MODES = ['show', 'under', 'through', 'inside', 'behind', 'hide', 'refuse'];
export const MARGIN = .07;                                   // hair stays this far inside a shell's surface

// resolve a pair: what is drawn and how. hair.crownItem: 'knot' (short: a topknot or bun) or 'tail' (a high tail)
export function resolve(hair, hat) {
  const r = { refused: false, knot: 'show', regions: {} };
  for (const k of REGIONS) r.regions[k] = (hat.regions && hat.regions[k]) || 'show';
  if (hair.crownItem) { const m = (hat.crown || {})[hair.crownItem] || 'show'; r.knot = m;
    if (m === 'refuse') r.refused = true;
    r.regions.knot = m === 'hide' || m === 'inside' ? 'hide' : 'show'; }
  else r.regions.knot = 'hide';
  return r;
}

// ---- shells: the hat's inside, the room the hair has. All are convex where they bind, so a triangle whose corners
// are inside stays inside. Each `clampPt` moves a point (in the shell's space, a Vector3) back inside; returns true
// if it moved.
//   cone  { y0, R, top, r1 }        a brim hat: the outer surface y(r) = top for r ≤ r1, falling to y0 at r = R; hair
//                                    under it within r < R
//   dome  { c, r, cut, open }       a bowl, hood or wrap: the ellipsoid c ± r; binds points on every cut plane's side
//                                    (n·p ≥ d, cut = [[nx, ny, nz, d], …]); `open` = [[x0, x1], [y0, y1], z0] a window
//                                    that does not bind (the hood's face)
//   wall  { y, r, sz, arc }          a skirt or band: radius r[0] at y[0] to r[1] at y[1] (z scaled by sz), binding
//                                    within `arc` of the back (π: all round)
export function inside(s, p, m = MARGIN) {
  if (s.t === 'cone') { const r = Math.hypot(p.x, p.z); if (r >= s.R) return true; return p.y <= coneY(s, r) - m + 1e-6; }
  if (s.t === 'dome') { if (!binds(s, p)) return true; return ell(s, p) <= 1 - m / Math.min(...s.r) + 1e-6; }
  if (s.t === 'wall') { const w = wallAt(s, p); if (!w) return true; return Math.hypot(p.x, p.z / s.sz) <= w - m + 1e-6; }
  return true;
}
export function clampPt(s, p, m = MARGIN) {
  if (inside(s, p, m)) return false;
  if (s.t === 'cone') { p.y = coneY(s, Math.hypot(p.x, p.z)) - m; return true; }
  if (s.t === 'dome') { const k = (1 - m / Math.min(...s.r)) / ell(s, p); p.set(s.c[0] + (p.x - s.c[0]) * k, s.c[1] + (p.y - s.c[1]) * k, s.c[2] + (p.z - s.c[2]) * k); return true; }
  if (s.t === 'wall') { const w = wallAt(s, p), q = Math.hypot(p.x, p.z / s.sz), k = (w - m) / q; p.x *= k; p.z *= k; return true; }
  return false;
}
const coneY = (s, r) => r <= s.r1 ? s.top : s.top - (r - s.r1) * (s.top - s.y0) / (s.R - s.r1);
const ell = (s, p) => Math.hypot((p.x - s.c[0]) / s.r[0], (p.y - s.c[1]) / s.r[1], (p.z - s.c[2]) / s.r[2]);
function binds(s, p) {
  if (s.cut) for (const c of s.cut) if (c[0] * p.x + c[1] * p.y + c[2] * p.z < c[3]) return false;
  const o = s.open; if (o && p.x > o[0][0] && p.x < o[0][1] && p.y > o[1][0] && p.y < o[1][1] && p.z > o[2]) return false;
  return true;
}
function wallAt(s, p) {
  if (p.y > s.y[0] || p.y < s.y[1]) return 0;
  if (s.arc < Math.PI - 1e-3 && Math.abs(Math.atan2(p.x, -p.z)) > s.arc) return 0;
  return s.r[0] + (s.r[1] - s.r[0]) * (p.y - s.y[0]) / (s.y[1] - s.y[0]);
}

// ---- the body hair must hang clear of (chains only: tails, braids, loose locks): in a bone's space, inflated by the
// chain's own half-thickness. box { b: bone, c, h } and ell { b, c, r }. The dō and the jinbaori's shoulders (the
// samurai's are narrower, so these hold for both), and the head itself.
export const BODY = [
  { t: 'box', b: 'chest', c: [0, 1.3, -.08], h: [3.15, 2.05, 2.28] },
  { t: 'ell', b: 'spine', c: [0, 1.8, -.05], r: [2.6, 2.4, 2.25] },
  { t: 'ell', b: 'head', c: [0, HC, 0], r: [2.0, 2.1, 2.0] },
  { t: 'ell', b: 'neck', c: [0, .3, 0], r: [1.0, 1.1, 1.0] },
];
// push a point (in the collider's space) out of it, inflated by m; true if it moved
export function pushOut(c, p, m) {
  if (c.t === 'ell') { const r = c.r.map(v => v + m), d = Math.hypot((p.x - c.c[0]) / r[0], (p.y - c.c[1]) / r[1], (p.z - c.c[2]) / r[2]);
    if (d >= 1) return false; const k = 1.0001 / Math.max(d, 1e-4);
    if (d < 1e-4) { p.z = c.c[2] - r[2]; return true; }
    p.set(c.c[0] + (p.x - c.c[0]) * k, c.c[1] + (p.y - c.c[1]) * k, c.c[2] + (p.z - c.c[2]) * k); return true; }
  const q = [p.x - c.c[0], p.y - c.c[1], p.z - c.c[2]], h = c.h.map(v => v + m);
  if (Math.abs(q[0]) >= h[0] || Math.abs(q[1]) >= h[1] || Math.abs(q[2]) >= h[2]) return false;
  // out through the nearest face, but never down through the floor of the box (hair rests on top of a shoulder)
  let best = 1e9, ax = 2, sg = -1;
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { if (i === 1 && s < 0) continue; const d = h[i] - s * q[i]; if (d < best) { best = d; ax = i; sg = s; } }
  q[ax] = sg * h[ax] * 1.0001; p.set(q[0] + c.c[0], q[1] + c.c[1], q[2] + c.c[2]); return true;
}

// a style or hat with a field the contract does not know is a bug: say so at load (as traits/mix.js does)
export function validate(HAIR, HATS) {
  const errs = [];
  for (const h of HAIR) { if (h.crownItem && !['knot', 'tail'].includes(h.crownItem)) errs.push(`${h.id}: crownItem ${h.crownItem}`);
    for (const p of [...h.parts, ...(h.chains || [])]) if (!REGIONS.includes(p.r)) errs.push(`${h.id}: region ${p.r}`); }
  for (const t of HATS) { for (const [k, v] of Object.entries(t.regions || {})) if (!REGIONS.includes(k) || !['show', 'hide'].includes(v)) errs.push(`${t.id}: ${k} ${v}`);
    for (const [k, v] of Object.entries(t.crown || {})) if (!['knot', 'tail'].includes(k) || !KNOT_MODES.includes(v)) errs.push(`${t.id}: crown ${k} ${v}`);
    for (const s of t.shells || []) if (!['cone', 'dome', 'wall'].includes(s.t)) errs.push(`${t.id}: shell ${s.t}`); }
  if (errs.length) throw new Error('head-slot contract: ' + errs.join('; '));
}
