// ---- Where a weapon rides when it is home: the game's STOW rows (registry.js) read the same way by both sides: the
// look hangs the model there, and the poses (poses.js) send his hand there to draw it and to put it back, so the hand
// meets the weapon where it hangs. A spec is in a bone's frame (world units: +z his front, +y up, +x his left): `at` the
// right hand's grip on it (or `c`, the middle of a long weapon), `dir` the way it runs from the grip, `grab` how far along
// it from its grip the hand takes it.
import { WEAPON, STOW } from './registry.js';
export { STOW };

const norm = d => { const l = Math.hypot(...d); return d.map(v => v / l); };
// the grip's place on the bone, in world units: a centred spec's grip sits half its length's difference below the middle
export function stowAt(s, w) { const d = norm(s.dir); if (!s.c) return { at: s.at, d }; const k = (w.ext[1] - w.ext[0]) / 2; return { at: s.c.map((v, i) => v - d[i] * k), d }; }
const TAU = Math.PI * 2, SPINE = 6.8;   // rig px, the chest bone above the hips (render/rig3d.js SK.spineTop)
// where his hand takes the weapon `id` from its stow, in a side pose's plane: g [forward, up] rig px (absolute), the
// weapon's angle there, its sideways lean (lat), the hand's sideways place (x, world units) and how far down the weapon
// from the hand its own grip is (slide, rig px). An angle that points down behind him is unwound past π, so a draw and
// a stow swing over his back, never through his front
export function mountOf(id, p, which = 'stow') {
  const s = STOW[id] && STOW[id][which]; if (!s) return null;
  const w = WEAPON[id], { at, d } = stowAt(s, which === 'stow' ? w : { ext: [0, 0] }), grab = s.grab || 0, gp = at.map((v, i) => v + d[i] * grab);
  const lean = p.lean || 0, tilt = s.bone === 'chest' ? lean : lean * .25;
  const o = s.bone === 'chest' ? [p.pel[0] + Math.sin(lean) * SPINE, p.pel[1] + Math.cos(lean) * SPINE] : p.pel;
  const c = Math.cos(tilt), sn = Math.sin(tilt), side = (y, z) => [z * c + y * sn, y * c - z * sn];
  const q = side(gp[1] * 2, gp[2] * 2), dd = side(d[1], d[2]); let ang = Math.atan2(dd[1], dd[0]); if (ang < -Math.PI / 2) ang += TAU;
  return { g: [o[0] + q[0], o[1] + q[1]], ang, lat: d[0], x: gp[0], slide: grab * 2 };
}
