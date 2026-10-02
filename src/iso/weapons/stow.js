// ---- Where each weapon rides when it is home, as data both sides read: wield.js hangs the model there, and the poses
// (poses.js) send his hand there to draw it and to put it back, so the hand meets the weapon where it hangs.
// A spec is in a bone's frame (world units: +z his front, +y up, +x his left): `at` the right hand's grip on it (or `c`,
// the middle of a long weapon), `dir` the way it runs from the grip, `grab` how far along it from its grip the hand takes
// it (a slung haft is taken high, behind the right shoulder; a hilt over the shoulder a little above the mouth).
import { WEAPON } from './arsenal.js';

const SLUNG = { bone: 'chest', c: [-1.0, 3.6, -3.0], dir: [-.42, 1, -.1], grab: 4 };   // across the back, head up over the right shoulder
export const STOW = {
  wakizashi: { stow: { bone: 'hips', at: [1.9, .7, 1.2], dir: [-.1, -.31, -.94] } },     // the katana's saya place (ronin.js)
  daisho: { offStow: { bone: 'hips', at: [1.65, 1.15, 1.45], dir: [-.12, -.42, -.9] } }, // the wakizashi a little above the katana
  nodachi: { stow: { bone: 'chest', at: [-1.5, 5.6, -2.8], dir: [.4, -.9, -.08], grab: -.8 } },
  kanabo: { stow: { bone: 'chest', at: [-1.2, 3.6, -2.95], dir: [.45, -.88, -.15], grab: -.8 } },
  yari: { stow: SLUNG }, naginata: { stow: SLUNG }, bo: { stow: SLUNG }, tetsubo: { stow: SLUNG },
  tanto: { stow: { bone: 'hips', at: [-.6, .9, 2.15], dir: [.75, -.45, -.25] }, offStow: { bone: 'hips', at: [-.2, .45, 2.2], dir: [.8, -.35, -.3] } },
  kama: { stow: { bone: 'hips', at: [1.3, -.7, 1.7], dir: [0, 1, .25] }, offStow: { bone: 'hips', at: [.3, -.7, 2.05], dir: [-.05, 1, .3] } },
  jitte: { stow: { bone: 'hips', at: [1.75, 1.1, 1.35], dir: [-.05, -.6, -.8] } },
  tessen: { stow: { bone: 'hips', at: [1.5, 1.0, 1.55], dir: [0, -.85, -.5] } },
  nunchaku: { stow: { bone: 'hips', at: [1.3, 1.2, 1.65], dir: [0, -.95, -.3] } },
  kusarigama: { stow: { bone: 'hips', at: [1.6, .2, 1.5], dir: [-.1, .85, .5] }, coil: { bone: 'hips', at: [0, .3, -2.15], dir: [0, 0, -1] } },
};
const norm = d => { const l = Math.hypot(...d); return d.map(v => v / l); };
// the grip's place on the bone, in world units: a centred spec's grip sits half its length's difference below the middle
export function stowAt(s, w) { const d = norm(s.dir); if (!s.c) return { at: s.at, d }; const k = (w.ext[1] - w.ext[0]) / 2; return { at: s.c.map((v, i) => v - d[i] * k), d }; }
const TAU = Math.PI * 2, SPINE = 6.8;   // rig px, the chest bone above the hips (look/three/rig.js SK.spineTop)
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
