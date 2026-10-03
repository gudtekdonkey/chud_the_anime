// ---- The weapons in 3D, procedural low-poly in Iron Ash's language (flat-shaded plates, the iron ramp, lit edges, the
// blades' cyan-white steel glowing as the katana's does): placeholders a 3D artist replaces, as the ronin is. Each is
// built from today's game's side art (src/weapons/*.js), its proportions taken from the 2D pixels (×0.9 world units a
// pixel, the slice's scale). A weapon's main piece has its origin at the right hand's grip and runs along +z toward the
// business end (the point, the head, the iron end), +y its own "up" (the katana's spine side); `ext` (arsenal.js) is how far
// it reaches either way. Sheaths, slings and coils are separate pieces that wield.js hangs on the bones.
import * as THREE from 'three';
import { piece, newPart } from 'ronin-engine/iso/gfx/build.js';
import { RAMP as R } from 'ronin-engine/iso/gfx/palette.js';

const PI = Math.PI, Z = [PI / 2, 0, 0];                     // a cylinder's axis (y) turned onto +z
const node = (parent, p = [0, 0, 0]) => { const o = new THREE.Object3D(); o.position.set(...p); if (parent) parent.add(o); return o; };
const C = { blade: R.i[9], edge: R.i[10], iron: R.i[4], ironD: R.i[3], ironL: R.i[7], lac: R.k[2], wrap: R.k[1], dia: R.i[5], wood: R.m[2], woodL: R.m[3], cord: R.v[5], paper: R.v[3] };

// a sword: wrapped grip with diamonds, kashira, tsuba, habaki, a blade (the `blade` node, scaled as it leaves the saya)
function sword(put, len, hilt, o = {}) {
  const main = node(), w = o.w ?? .18, h = o.h ?? .45;
  newPart(); const g = piece().box(.42, .48, hilt, C.wrap, { p: [0, 0, -hilt / 2] }).box(.48, .52, .3, C.ironL, { p: [0, 0, -hilt - .1] });
  for (let i = 1; i < hilt / .7; i++) g.box(.46, .2, .2, C.dia, { p: [0, .16, -i * .7], r: [0, 0, PI / 4] });
  put(main, g);
  newPart(); put(main, piece().cyl(o.tsuba ?? .7, o.tsuba ?? .7, .18, 8, C.ironL, { p: [0, 0, .15], r: Z }).box(.3, .55, .35, R.m[4], { p: [0, 0, .42] }));
  const blade = node(main); newPart();
  put(blade, piece().box(w, h, len, C.blade, { p: [0, 0, .3 + len / 2], glow: true }).box(w * .66, .14, len - .3, C.edge, { p: [0, -h / 2, .3 + len / 2 - .15], glow: true })
    .cyl(0, h * .55, .9, 4, C.edge, { p: [0, -h * .1, .3 + len + .4], r: Z, s: [.4, 1, 1], glow: true }));
  return { main, blade };
}
// a black saya from its mouth along +z, len long: the mouth's iron ring, the sageo cord, the kojiri
function saya(put, len, o = {}) { const s = node(), w = o.w ?? .48;
  newPart(); put(s, piece().box(w, .62, len, R.k[2], { p: [0, 0, len / 2] }).box(w + .08, .7, .45, R.i[6], { p: [0, 0, .2] }).box(w + .08, .7, .5, R.i[5], { p: [0, 0, len - .2] }));
  if (!o.bare) { newPart(); put(s, piece().box(w + .1, .2, Math.min(2, len * .3), R.m[3], { p: [0, .3, 1.4] })); }
  return s; }
// a haft along z from -back to fwd (wood or lacquer), iron-shod at the butt
function haft(put, main, back, fwd, r, col = C.wood) { newPart();
  put(main, piece().cyl(r, r, back + fwd, 7, col, { p: [0, 0, (fwd - back) / 2], r: Z }).cyl(r + .06, r + .06, .7, 7, C.ironD, { p: [0, 0, -back + .35], r: Z })
    .cyl(r + .04, r + .04, .25, 7, R.m[4], { p: [0, 0, -back + 2.2], r: Z })); }
// a curved blade from z0 bending toward +y as it runs, in `n` plates
function curved(put, parent, z0, len, h0, bend, n = 4, w = .14) { newPart(); const pc = piece(); let z = z0, y = 0, a = 0;
  for (let i = 0; i < n; i++) { const l = len / n, hh = h0 * (1 - i / (n + 1.5)); a += bend / n;
    pc.box(w, hh, l + .05, C.blade, { p: [0, y + Math.sin(a) * l / 2, z + Math.cos(a) * l / 2], r: [-a, 0, 0], glow: true });
    pc.box(w * .7, .12, l, C.edge, { p: [0, y + Math.sin(a) * l / 2 - Math.cos(a) * hh / 2, z + Math.cos(a) * l / 2 + Math.sin(a) * hh / 2], r: [-a, 0, 0], glow: true });
    z += Math.cos(a) * l; y += Math.sin(a) * l; }
  put(parent, pc); }
// a sickle: a wooden handle up to a ferrule, the blade off its top at right angles (along −y), curling back toward the hand
function sickle(put, handle, blade) { const main = node(); haft(put, main, 1, handle, .26);
  newPart(); put(main, piece().cyl(.32, .32, .45, 6, C.ironL, { p: [0, 0, handle - .1], r: Z }));
  newPart(); const pc = piece(); let y = 0, z = handle, a = 0; const n = 4;
  for (let i = 0; i < n; i++) { const l = blade / n; a += .3;
    pc.box(.12, l + .05, .5 - i * .07, C.blade, { p: [0, y - Math.cos(a) * l / 2, z - Math.sin(a) * l / 2], r: [a, 0, 0], glow: true });
    pc.box(.08, l, .12, C.edge, { p: [0, y - Math.cos(a) * l / 2, z - Math.sin(a) * l / 2 - .26], r: [a, 0, 0], glow: true });
    y -= Math.cos(a) * l; z -= Math.sin(a) * l; }
  put(main, pc); return main; }

// every model: { main, blade? (scaled by vis), sheaths: [{ node, at: stow key }], off?, offBlade?, fan?, free?, chain?, coil? }
export const MODELS = {
  katana: () => ({ builtIn: true, sheaths: [] }),
  wakizashi(put) { const s = sword(put, 8.4, 1.9, { tsuba: .6 }); return { ...s, sheaths: [{ node: saya(put, 8.6), at: 'stow' }] }; },
  daisho(put) { const w = sword(put, 8.4, 1.9, { tsuba: .6 }); return { builtIn: true, off: w.main, offBlade: w.blade, sheaths: [{ node: saya(put, 8.6), at: 'offStow' }] }; },
  nodachi(put) { const s = sword(put, 20.5, 5.4, { tsuba: 1.05, w: .24, h: .62 }); return { ...s, sheaths: [{ node: saya(put, 21.4, { w: .56 }), at: 'stow' }] }; },
  tanto(put) { const a = sword(put, 6.2, 1.6, { tsuba: .46, w: .16, h: .44 }), b = sword(put, 6.2, 1.6, { tsuba: .46, w: .16, h: .44 });
    return { ...a, off: b.main, offBlade: b.blade, sheaths: [{ node: saya(put, 6.6, { w: .42, bare: 1 }), at: 'stow' }, { node: saya(put, 6.6, { w: .42, bare: 1 }), at: 'offStow' }] }; },
  jitte(put) { const main = node(); newPart();
    put(main, piece().cyl(.26, .26, 2.4, 6, C.wrap, { p: [0, 0, -1.2], r: Z }).cyl(.34, .34, .3, 6, C.ironL, { p: [0, 0, -2.45], r: Z }));
    newPart(); put(main, piece().cyl(.17, .21, 7.4, 6, C.ironL, { p: [0, 0, 3.7], r: Z }).cyl(0, .2, .6, 6, C.edge, { p: [0, 0, 7.7], r: Z, glow: true }));
    newPart(); put(main, piece().box(.16, .7, .18, C.iron, { p: [0, .32, .7] }).box(.14, .14, 2.0, C.ironL, { p: [0, .62, 1.7] }));   // the hook
    return { main, sheaths: [] }; },
  tessen(put) { const main = node(), fan = [];
    for (let i = 0; i < 9; i++) { const rib = node(main, [0, 0, -.6]); newPart(); const outer = i === 0 || i === 8;
      put(rib, piece().box(outer ? .18 : .1, outer ? .16 : .08, 6.4, outer ? C.iron : C.ironD, { p: [0, 0, 3.0] })
        .box(.9, .04, 4.4, C.paper, { p: [.45, 0, 3.9] }).box(.9, .08, .22, C.edge, { p: [.45, 0, 6.15], glow: true })); fan.push(rib); }
    newPart(); put(main, piece().cyl(.22, .22, .5, 6, C.ironL, { p: [0, 0, -.6], r: [0, 0, PI / 2] }));
    return { main, fan, sheaths: [] }; },
  nunchaku(put) { const stick = p => { newPart(); return piece().cyl(.27, .27, 4.4, 8, C.lac, { p: [0, 0, p], r: Z }).cyl(.31, .31, .3, 8, C.ironL, { p: [0, 0, p + 2.1], r: Z }).cyl(.31, .31, .3, 8, C.ironL, { p: [0, 0, p - 2.1], r: Z }); };
    const main = node(); put(main, stick(1.3)); const free = node(); put(free, stick(2.3));
    const cord = node(); newPart(); put(cord, piece().box(.14, .14, 1, C.cord, { p: [0, 0, .5] }));
    return { main, free, cord, sheaths: [] }; },
  kama(put) { return { main: sickle(put, 4.8, 4.0), off: sickle(put, 4.8, 4.0), sheaths: [] }; },
  kusarigama(put) { const main = sickle(put, 5.0, 4.3), links = [], chain = node();
    for (let i = 0; i < 20; i++) { const l = node(chain); newPart(); put(l, piece().box(i % 2 ? .1 : .3, i % 2 ? .3 : .1, .62, R.i[6])); links.push(l); }
    const weight = node(chain); newPart(); put(weight, piece().ball(.62, R.i[3], {}, 0).box(.3, .3, .3, R.i[7], { p: [0, .5, 0] }));
    const coil = node(); newPart(); put(coil, piece().ring(1.0, .34, 9, R.i[5], { r: [PI / 2, 0, 0] }).ring(.72, .3, 9, R.i[4], { p: [0, 0, .15], r: [PI / 2, 0, 0] }).ball(.5, R.i[3], { p: [.4, -.8, .2] }, 0));
    return { main, chain: { node: chain, links, weight }, sheaths: [{ node: coil, at: 'coil' }] }; },
  yari(put) { const main = node(); haft(put, main, 12, 17, .3, C.wood);
    newPart(); put(main, piece().cyl(.42, .36, .9, 7, C.ironL, { p: [0, 0, 17.2], r: Z }).box(.2, .55, .5, R.i[6], { p: [0, 0, 17.8] }));
    newPart(); put(main, piece().cyl(0, .62, 4.3, 4, C.blade, { p: [0, 0, 20.1], r: Z, s: [.32, 1, 1], glow: true }).box(.06, .14, 3.8, C.edge, { p: [0, 0, 19.9], glow: true }));
    return { main, sheaths: [] }; },
  naginata(put) { const main = node(); haft(put, main, 11, 15, .32, R.k[3]);
    newPart(); put(main, piece().cyl(.38, .38, 1.2, 7, C.ironL, { p: [0, 0, 14.6], r: Z }).cyl(.75, .75, .16, 8, C.ironL, { p: [0, 0, 15.25], r: Z }));
    curved(put, main, 15.35, 7.8, .95, .55); return { main, sheaths: [] }; },
  bo(put) { const main = node(); newPart();
    put(main, piece().cyl(.33, .33, 28, 8, C.wood, { p: [0, 0, 0], r: Z }).cyl(.37, .37, .6, 8, C.ironD, { p: [0, 0, 13.7], r: Z }).cyl(.37, .37, .6, 8, C.ironD, { p: [0, 0, -13.7], r: Z })
      .cyl(.35, .35, .2, 8, C.woodL, { p: [0, 0, 6], r: Z }).cyl(.35, .35, .2, 8, C.woodL, { p: [0, 0, -6], r: Z }));
    return { main, sheaths: [] }; },
  tetsubo(put) { const main = node(); newPart(); put(main, piece().cyl(.3, .3, 8, 7, C.wrap, { p: [0, 0, -2.5], r: Z }).cyl(.36, .36, .4, 7, C.ironL, { p: [0, 0, -6.4], r: Z }));
    newPart(); const pc = piece().cyl(.62, .38, 18.5, 8, C.iron, { p: [0, 0, 10.75], r: Z });
    for (let z = 5; z < 20; z += 3.4) { const r = .38 + (z - 1.5) / 18.5 * .24 + .07; pc.cyl(r, r, .4, 8, C.ironL, { p: [0, 0, z], r: Z }); }
    put(main, pc.cyl(.5, .66, .5, 8, C.ironL, { p: [0, 0, 20.1], r: Z })); return { main, sheaths: [] }; },
  kanabo(put) { const main = node(); newPart(); put(main, piece().cyl(.3, .3, 4.4, 7, C.wrap, { p: [0, 0, -2.2], r: Z }).cyl(.4, .4, .35, 7, C.ironL, { p: [0, 0, .2], r: Z }));
    newPart(); const pc = piece().cyl(.98, .5, 17, 8, R.i[2], { p: [0, 0, 9.1], r: Z });
    for (let z = 3; z < 17; z += 2.2) for (let k = 0; k < 8; k++) { const a = (k + (z / 2.2) % 2 * .5) / 8 * PI * 2, r = .5 + (z - .6) / 17 * .48 + .1;
      pc.box(.24, .24, .24, R.i[7], { p: [Math.cos(a) * r, Math.sin(a) * r, z], r: [0, 0, a] }); }
    put(main, pc.cyl(.7, .98, .5, 8, R.i[6], { p: [0, 0, 17.7], r: Z })); return { main, sheaths: [] }; },
};
