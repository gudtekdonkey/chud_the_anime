// ---- The head slot's hats, each declaring the contract (contract.js, docs/hair.md): how it is mounted, its brim (the
// brim shadow and the glint rule read it), its shells (the room hair has inside it), which regions it hides, what a
// crown item does, and its own chains (cloth ties on springs). Geometry is low-poly in the slice's ramps, built in the
// hat node's space. The jingasa is ronin.js's, unchanged; the rest are placeholders in the same language.
import * as THREE from 'three';
import { piece, newPart } from '../gfx/build.js';
import { RAMP as R } from '../gfx/palette.js';
import { SCALP } from './contract.js';
import { shell, loop } from './parts.js';

const PI = Math.PI;
// open cylinder `ring` round the back by `half` radians either side (CylinderGeometry's theta: 0 at +z)
const skirt = (pc, col, rTop, rBot, y0, y1, half, o = {}) => pc.add(new THREE.CylinderGeometry(rTop, rBot, y0 - y1, 14, 1, true, PI - half, 2 * half), col, { p: [0, (y0 + y1) / 2, 0], ...o });
const band = (pc, col, r, y0, y1, sz = 1) => pc.add(new THREE.CylinderGeometry(r, r, y0 - y1, 14, 1, false), col, { p: [0, (y0 + y1) / 2, 0], s: [1, 1, sz] });

export const HAT_R = 9.5;
export const HATS = [
  { id: 'none', name: 'No hat', mount: 'head', shells: [], build: () => [] },

  // the hero's iron jingasa (ronin.js): a shallow cone on the brim pivot; it sits on the crown with a finger's room
  { id: 'jingasa', name: 'Iron jingasa', mount: 'pivot', brim: HAT_R, cords: true, throwable: true,
    shells: [{ t: 'cone', y0: -.05, R: HAT_R * .97, top: 1.75, r1: 1.0 }],
    crown: { knot: 'under', tail: 'behind' }, regions: {},
    build() { const out = [];
      newPart(); out.push(piece().cyl(1.0, HAT_R, 1.8, 14, R.i[4], { p: [0, .85, 0] }));
      newPart(); out.push(piece().ring(HAT_R + .1, .42, 14, R.i[7], { p: [0, -.05, 0] }));
      newPart(); out.push(piece().cyl(.56 * HAT_R + .1, .56 * HAT_R + .18, .3, 14, R.i[6], { p: [0, .82, 0] }).cyl(.55, .8, .55, 8, R.i[7], { p: [0, 1.95, 0] }));
      newPart(); const ribs = piece(); for (let i = 0; i < 8; i++) { const a = i * PI / 4 + PI / 8, r0 = 1.2, r1 = HAT_R - .35, y0 = 1.72, y1 = -.02;
        const mx = (r0 + r1) / 2, my = (y0 + y1) / 2 + .08, len = Math.hypot(r1 - r0, y1 - y0), tilt = Math.atan2(y0 - y1, r1 - r0);
        ribs.box(.2, .12, len, R.i[3], { p: [Math.sin(a) * mx, my, Math.cos(a) * mx], r: [tilt, a, 0] }); } out.push(ribs);
      return out; } },

  // a straw sugegasa: a tall woven cone; there is room in its point for a knot
  { id: 'kasa', name: 'Straw kasa', mount: 'pivot', brim: 8.2, cords: true, throwable: true,
    shells: [{ t: 'cone', y0: -.05, R: 8.2 * .97, top: 3.1, r1: .2 }],
    crown: { knot: 'under', tail: 'behind' }, regions: {},
    build() { const pc = piece(); newPart();
      pc.cyl(.2, 8.2, 3.2, 12, R.m[3], { p: [0, 1.55, 0] }).cyl(.05, .3, .45, 6, R.m[2], { p: [0, 3.3, 0] });
      const p2 = piece(); newPart(); for (const r of [2.4, 4.6, 6.6]) p2.ring(r + .06, .14, 12, R.m[2], { p: [0, 3.15 - (r - .2) * 3.2 / 8, 0] });
      p2.ring(8.25, .22, 12, R.m[1], { p: [0, 0, 0] }); return [pc, p2]; } },

  // a kabuto: a ribbed iron bowl to the brow, a visor, the shikoro of three lames round the back and sides with its
  // turn-backs, a small crescent; the topknot (or a high tail, a plume) comes out of the tehen, the hole in its top
  { id: 'kabuto', name: 'Kabuto', mount: 'head', hole: [0, 2.55, 0],
    shells: [{ t: 'dome', c: [0, .1, 0], r: [2.3, 2.3, 2.3], cut: [[0, 1, 0, .4]] },
      { t: 'wall', y: [.45, -1.5], r: [2.42, 3.25], sz: 1, arc: 2.25 }],
    crown: { knot: 'through', tail: 'through' }, regions: { fringe: 'hide', strands: 'hide' },
    build() { const bowl = piece(); newPart();
      bowl.add(new THREE.SphereGeometry(2.42, 14, 5, 0, 2 * PI, .16, 1.22), R.i[4], { p: [0, .1, 0] });
      const rim = piece(); newPart(); rim.add(new THREE.CylinderGeometry(2.5, 2.5, .3, 14, 1, true), R.i[6], { p: [0, .48, 0] });
      loop(rim, R.i[7], [0, 2.52, 0], .42, .1, [PI / 2, 0, 0]);
      const ribs = piece(); newPart(); for (let i = 0; i < 8; i++) { const a = i * PI / 4; for (let k = 0; k < 3; k++) { const th = .3 + k * .4, r = 2.47;
        ribs.box(.14, .1, .62, R.i[6], { p: [Math.sin(a) * Math.sin(th) * r, .1 + Math.cos(th) * r, Math.cos(a) * Math.sin(th) * r], r: [th, a, 0], part: 0 }); } }
      const shik = piece(); for (const [i, [t, b, y0, y1]] of [[2.5, 2.8, .45, -.2], [2.8, 3.05, -.15, -.85], [3.05, 3.3, -.8, -1.5]].entries()) { newPart();
        skirt(shik, i % 2 ? R.i[3] : R.i[5], t, b, y0, y1, 2.2); skirt(shik, R.v[5], b + .02, b + .03, y1 + .14, y1, 2.2); }
      const turn = piece(); newPart(); for (const sx of [1, -1]) turn.box(.22, .75, 1.0, R.i[6], { p: [2.55 * sx, .15, 1.05], r: [0, .7 * sx, -.35 * sx] });
      const visor = piece(); newPart(); visor.add(new THREE.CylinderGeometry(2.5, 2.95, .22, 10, 1, true, -1.05, 2.1), R.i[5], { p: [0, .42, 0] });
      const crest = piece(); newPart(); crest.add(new THREE.TorusGeometry(.85, .09, 3, 10, PI), R.i[9], { p: [0, 1.9, 2.05], r: [0, 0, 0] });
      return [bowl, rim, ribs, shik, turn, visor, crest]; } },

  // a tate-eboshi: the court's tall lacquered cap; it houses the topknot and sits on the crown
  { id: 'eboshi', name: 'Eboshi', mount: 'head',
    shells: [{ t: 'dome', c: [0, 1.6, -.15], r: [1.82, 3.0, 1.72], cut: [[0, .984, -.179, .942]] }],
    crown: { knot: 'inside', tail: 'behind' }, regions: { crown: 'hide' },
    build() { const pc = piece(); newPart();   // its base sits on the scalp front and back (tilted back .18)
      pc.cyl(1.2, 1.9, 3.4, 10, R.k[2], { p: [0, 2.6, -.45], r: [-.18, 0, 0], s: [1, 1, .92] }).box(1.4, .9, .3, R.k[3], { p: [0, 3.75, .1], r: [-.45, 0, 0] });
      return [pc]; } },

  // a tengai: the komusō's deep woven basket over the whole head; a long tail falls out below it
  { id: 'tengai', name: 'Tengai basket', mount: 'head',
    shells: [{ t: 'wall', y: [2.3, -1.6], r: [2.4, 2.5], sz: 1, arc: PI }],
    crown: { knot: 'hide', tail: 'behind' }, regions: { crown: 'hide', back: 'hide', sides: 'hide', fringe: 'hide', strands: 'hide' },
    build() { const pc = piece(); newPart();
      pc.add(new THREE.CylinderGeometry(2.55, 2.68, 3.85, 12, 1, true), R.m[2], { p: [0, .28, 0] }).add(new THREE.SphereGeometry(2.55, 12, 3, 0, 2 * PI, 0, PI / 2), R.m[2], { p: [0, 2.2, 0], s: [1, .45, 1] });
      const w = piece(); newPart(); for (let i = 0; i < 4; i++) w.ring(2.62 + i * .02, .16, 12, R.m[1], { p: [0, 1.75 - i * 1.0, 0] });
      w.box(1.3, .35, .1, R.k[1], { p: [0, .25, 2.66] });   // the weave's open band he looks through
      return [pc, w]; } },

  // a zukin: a cloth hood open at the face, its drape to the shoulders; everything under it is covered, a fringe shows
  // in the opening, and a tail (a high one re-tied low) falls out below the drape
  { id: 'hood', name: 'Hood', mount: 'head', cloth: true,
    shells: [{ t: 'dome', c: [0, .05, -.05], r: [2.3, 2.45, 2.35], open: [[-1.45, 1.45], [-2.6, 1.25], 1.1] },
      { t: 'wall', y: [-.9, -1.85], r: [2.2, 2.32], sz: 1, arc: 2.5 }],
    crown: { knot: 'hide', tail: 'behind' }, regions: { crown: 'hide', back: 'hide', sides: 'hide', strands: 'hide' },
    build() { const pc = piece(); newPart();
      pc.add(new THREE.SphereGeometry(1, 12, 6, PI * 1.5 - PI * .68, PI * 1.36, 0, PI * .8), R.v[3], { p: [0, .05, -.05], s: [2.42, 2.55, 2.48] })
        .add(new THREE.SphereGeometry(1, 6, 2, PI * .5 - PI * .33, PI * .66, 0, PI * .3), R.v[3], { p: [0, .05, -.05], s: [2.42, 2.55, 2.48] });
      const d = piece(); newPart(); skirt(d, R.v[2], 2.3, 2.42, -.85, -1.9, 2.55);
      const hem = piece(); newPart(); hem.add(new THREE.TorusGeometry(1, .07, 3, 12, PI * .66), R.v[5], { p: [0, .05 + 2.55 * Math.cos(PI * .3), -.05], r: [PI / 2, 0, -PI * .17], s: [2.42 * Math.sin(PI * .3) + .05, 2.48 * Math.sin(PI * .3) + .05, 1] });
      return [pc, d, hem]; } },

  // a bandana: cloth wrapped over the crown and tied behind; only hair with nothing on the crown fits under it (owner)
  { id: 'bandana', name: 'Bandana', mount: 'head', cloth: true,
    shells: [{ t: 'dome', c: [0, 0, 0], r: [SCALP[0] + .26, SCALP[1] + .26, SCALP[2] + .26], cut: [[0, 1, -.416, .42]] },
      { t: 'dome', c: [0, 0, 0], r: [SCALP[0] + .26, SCALP[1] + .26, SCALP[2] + .26], cut: [[0, 1, 0, -.45], [0, 0, -1, -.6]] }],
    crown: { knot: 'refuse', tail: 'refuse' }, regions: {},
    chains: [{ root: [.25, -.25, -2.35], dir: [.3, -1, -.5], len: 1.5, segs: 2, w: [.55, .4], d: .14, kind: 'flat', hang: .7, c: R.l[2], hi: R.l[3] },
      { root: [-.25, -.25, -2.35], dir: [-.3, -1, -.5], len: 1.3, segs: 2, w: [.55, .4], d: .14, kind: 'flat', hang: .7, c: R.l[2], hi: R.l[3] }],
    build() { const pc = piece(); newPart();
      shell(pc, R.l[2], { t: .4, th: [0, .32], seg: 14 }); shell(pc, R.l[2], { t: .4, th: [.32, .58], arc: ['back', PI * .62], seg: 14 });
      const k = piece(); newPart(); k.ball(.42, R.l[3], { p: [0, -.2, -2.3], s: [1.3, .8, .8] }, 0); return [pc, k]; } },

  // a headband: a sweatband round the brow, open on top, so all hair shows over it (owner)
  { id: 'headband', name: 'Headband', mount: 'head', cloth: true,
    shells: [{ t: 'wall', y: [.9, .3], r: [2.1, 2.1], sz: 1, arc: PI }],
    crown: { knot: 'show', tail: 'show' }, regions: {},
    build() { const pc = piece(); newPart(); band(pc, R.v[4], 2.24, .88, .32); pc.ball(.3, R.v[5], { p: [0, .6, -2.3], s: [1.2, .9, .7] }, 0); return [pc]; } },

  // a hachimaki: the white band tied behind, its two long ends on springs, a red sun on the brow
  { id: 'hachimaki', name: 'Hachimaki', mount: 'head', cloth: true,
    shells: [{ t: 'wall', y: [.82, .38], r: [2.1, 2.1], sz: 1, arc: PI }],
    crown: { knot: 'show', tail: 'show' }, regions: {},
    chains: [{ root: [.2, .6, -2.3], dir: [.35, -.4, -1], len: 2.4, segs: 3, w: [.42, .36], d: .1, kind: 'flat', hang: .55, c: R.i[10], hi: R.i[9] },
      { root: [-.2, .6, -2.3], dir: [-.3, -.6, -1], len: 2.0, segs: 3, w: [.42, .36], d: .1, kind: 'flat', hang: .6, c: R.i[10], hi: R.i[9] }],
    build() { const pc = piece(); newPart(); band(pc, R.i[10], 2.22, .8, .4);
      pc.cyl(.32, .32, .08, 8, R.l[3], { p: [0, .6, 2.24], r: [PI / 2, 0, 0] }).ball(.28, R.i[9], { p: [0, .6, -2.28], s: [1.3, .9, .7] }, 0); return [pc]; } },
];
export const HAT = Object.fromEntries(HATS.map(h => [h.id, h]));
