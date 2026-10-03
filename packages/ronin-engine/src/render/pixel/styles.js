// ---- The pixel look's styles: Iron Ash V3, its refined base and the faces (F1 menpō is FC.RF1), verbatim from the
// pages (scratchpad tdv/engine.js). Only the imports and exports are new.
import { RAMP } from './engine.js';
function mkBody(o = {}) { const b = { thigh: 10, shin: 9.8, torso: 13.5, neck: 1.6, headR: 4.4, uarm: 7, farm: 7, hipW: 2.4, shW: 5.2, chestR: 4.3, waistR: 3.6,
  legR: 3.1, kneeR: 2.8, hemR: 3.9, footR: 1.5, uarmR: 2.3, elR: 2, wrR: 1.7, handR: 1.6, ...o }; b.hipH = b.thigh + b.shin + 1.2; return b; }
const KASA = { R: 20, ry: 1.6, h: 7.5, y: 2.4, top: 1.2, prof: 1.35 };
const dither = (x, y) => ((x + y) & 1) === 0;
const STYLES = {};
STYLES.E = { id: 'E', body: mkBody({ thigh: 9.4, shin: 9.2, torso: 13.5, shW: 6.2, chestR: 4.9, waistR: 4.1, hipW: 3, legR: 3.4, kneeR: 3.1, hemR: 4.4, uarmR: 2.6, elR: 2.3, headR: 4.3 }),
  stance: 1.45, sink: .8, stride: .85, lift: .8, bob: .7, runLean: .3,
  ramps: { i: ['#0f1012', '#16181b', '#1e2124', '#272a2e', '#313539', '#3d4146', '#4b4f54', '#5c5f63', '#727476', '#8d8e8e', '#a9a8a4'],
    m: ['#17140d', '#211d13', '#2c2618', '#38301e', '#453b24', '#53472b', '#625433', '#72623c', '#837146', '#958253'],
    b: ['#1a0f10', '#261517', '#331c1e', '#412426', '#4f2c2e', '#5e3537', '#6e4042', '#804c4d', '#935a5a', '#a86c6a', '#bd8380'] },
  enemyMat: { k: 'r', i: 'b', m: 'r' },
  mats: { hat: 'i', armour: 'i', shins: 'i', mantle: 'm', mask: 'i' },
  hat: { R: 19, ry: 1.6, h: 4.5, y: 2.2, top: 4, prof: 1.1 },
  mantle: { cols: 6, rows: 6, len: 19, w: 7, pin: 2, off: 1.6, tatter: [1, .8, .95, .72, 1.02, .84] }, flutter: .6, windMul: .7,
  pauldron: { arm: 'N', w: 3.2, h: 6, lv: 5, lames: 3 }, shins: { r: 2.6, lv: 0 },
  face: { lv: 4, brow: .4, back: -.9, part: 'mask' }, sayaR: 1.3, skirt: .95, obi: { lv: 4 },
  lv: { legN: 2, legF: 1, armN: 3, armF: 1, body: 2, head: 2, hat: 4, hatUnder: 1, hatEdge: 7, mantle: 4, saya: 3, skirt: 2, foot: 1, hand: 3 },
  eyeDrop: -.2,
  shade: c => { let v = c.v; const metal = c.mat === 'i' || c.mat === 'b', d = dither(c.x, c.y);
    if (c.tag & 64) return v;
    if (c.O(0, -1)) v += metal ? 4 : 2; else if (c.O(0, -2)) v += metal ? (d ? 3 : 1) : (d ? 1 : 0); else if (c.O(0, -3)) v += d ? 1 : 0;
    if (c.mat === 'm') { if ((c.x * 3 + c.y * 2) % 4 === 0) v += 2; else if ((c.x + c.y * 3) % 5 === 0) v -= 2; }
    if (c.E(0, 1)) v -= 1; else if (c.E(0, 2) && d) v -= 1;
    if (c.Nr(0, -1)) v -= 1; return v; },
  enemy: { mats: { armour: 'i', shins: 'i', mask: 'i', head: 'k' }, face: null },
};

// ---- Iron Ash variations: E's armour, hat and shading kept; the clothing redesigned, more armour added ----
const E0 = STYLES.E;
const IA_RAMPS = { ...E0.ramps,
  c: ['#121315', '#18191c', '#1f2023', '#27282b', '#303134', '#3a3b3e', '#46474a', '#535456', '#626364'],   // undyed dark cloth: wraps, hood
  v: ['#101219', '#151823', '#1b1f2d', '#222738', '#2a3044', '#333a51', '#3e465f', '#4a536e', '#58627f'],   // muted indigo (one accent)
  t: ['#0e1413', '#131b1a', '#192321', '#1f2b29', '#263432', '#2e3e3b', '#384a46', '#435652', '#4f635f'],   // muted teal-grey lining
  q: ['#1d1214', '#27181b', '#311e22', '#3c2529', '#472c30', '#533438', '#603d41'] };
const IA_ENEMY = { k: 'r', i: 'b', m: 'r', c: 'r', v: 'q', t: 'q' };
const IA_SHADE = c => { let v = c.v; const metal = c.mat === 'i' || c.mat === 'b', d = dither(c.x, c.y);
  if (c.tag & 64) return v;
  if (c.O(0, -1)) v += metal ? 4 : 2; else if (c.O(0, -2)) v += metal ? (d ? 3 : 1) : (d ? 1 : 0); else if (c.O(0, -3)) v += d ? 1 : 0;
  if (c.mat === 'm') { if ((c.x * 3 + c.y * 2) % 4 === 0) v += 2; else if ((c.x + c.y * 3) % 5 === 0) v -= 2; }
  if (c.E(0, 1)) v -= 1; else if (c.E(0, 2) && d) v -= 1;
  if (c.Nr(0, -1)) v -= 1; return v; };
const KUSA = { n: 6, len: 7.5, w: 1.9, lv: 3, flare: 1.4 };
const DOU = { from: 2.4, to: 1.6, lv: 3 };
const SUNE = { r: 2.5, lv: 0, knee: true };
function iron(id, o) { const S = { ...E0, id, ramps: IA_RAMPS, enemyMat: IA_ENEMY, shade: IA_SHADE, mantle: null, mats: { ...E0.mats, wrap: 'c', straw: 'm', hood: 'c', scarf: 'c', accent: 't', coat: 'v', sleeves: 'k' }, ...o };
  S.lv = { ...E0.lv, ...(o.lv || {}) }; S.body = mkBody({ thigh: 9.4, shin: 9.2, torso: 13.5, shW: 6.2, chestR: 4.9, waistR: 4.1, hipW: 3, legR: 3.4, kneeR: 3.1, hemR: 4.4, uarmR: 2.6, elR: 2.3, headR: 4.3, ...(o.body || {}) });
  S.enemy = { mats: { ...S.mats, head: 'k', mask: 'i' }, face: null, hood: null, tasuki: S.tasuki, ...(o.enemy || {}) };
  return S; }
const IA = {};
IA.E = { ...E0, id: 'E' };
IA.V1 = iron('V1', { body: { hemR: 2.7, kneeR: 2.9, uarmR: 2.3, elR: 2.1 }, skirt: .5,
  tasuki: { ink: '#a8915c' }, kyahan: { r: 2.5, r2: 1.9, lv: 3 }, waraji: { lv: 6 }, shins: { ...SUNE, r: 2.2 },
  dou: DOU, kusazuri: { ...KUSA, n: 5, len: 6.5 }, kote: { arms: 'NF', lv: 4, chain: 2 }, obi: { lv: 4, h: 2 } });
IA.V2 = iron('V2', { body: { hemR: 5.6, kneeR: 3.6, legR: 3.5 }, skirt: 1, legPat: 6, collar2: { outer: 6, depth: 4.5 },
  dou: DOU, kusazuri: { ...KUSA, n: 7, len: 6, rT: 1.2 }, haidate: { lv: 3, to: .75 }, pauldron: { ...E0.pauldron, arm: 'NF' }, obi: { lv: 4 }, lv: { skirt: 2 } });
IA.V3 = iron('V3', { body: { hemR: 3.1, kneeR: 3 }, skirt: .7, surcoat: { len: 12, flare: 1.8, lv: 4, mon: 7 },
  dou: DOU, kusazuri: { ...KUSA, n: 7, len: 7 }, shins: SUNE, kote: { arms: 'N', lv: 4, chain: 2 }, kyahan: { r: 2.4, r2: 1.9, lv: 2 }, waraji: { lv: 6 },
  pauldron: { ...E0.pauldron, arm: 'NF' }, face: E0.face });
IA.V4 = iron('V4', { body: { hemR: 3.4 }, skirt: .8, hood: { lv: 5, r: 3.8 }, face: null, eyeDrop: .8, eyeIn: 1,
  tails: [{ at: 'neck', len: 17, rows: 6, s: -.5, r: 1.8, lv: 5, part: 'scarf', taper: .35 }, { at: 'neck', len: 12, rows: 4, s: .5, r: 1.5, lv: 4, part: 'scarf', taper: .35 }],
  dou: DOU, kusazuri: { ...KUSA, n: 6 }, shins: SUNE, kote: { arms: 'N', lv: 4, chain: 2 }, kyahan: { r: 2.6, r2: 2, lv: 2 } });
IA.V5 = iron('V5', { body: { hemR: 2.8, kneeR: 2.9 }, skirt: .55, flutter: .9, windMul: .9,
  mantle: { cols: 6, rows: 7, len: 30, w: 6.8, pin: 7, off: .2, tatter: [1, .78, .93, .7, 1, .85] }, cape: { len: 7 }, mats: { ...E0.mats, wrap: 'c', straw: 'm', hood: 'c', scarf: 'c', accent: 't', coat: 'v', sleeves: 'k', mantle: 'c', cape: 'c' },
  lv: { mantle: 4, cape: 5 }, kusazuri: { ...KUSA, n: 6 }, shins: SUNE, kyahan: { r: 2.5, r2: 1.9, lv: 2 }, waraji: { lv: 6 }, kote: { arms: 'N', lv: 4, chain: 2 } });
IA.V6 = iron('V6', { body: { hemR: 4.6 }, skirt: .95, sleeves: { len: 8, lv: 3 }, collar2: { outer: 6, inner: 7, depth: 5 },
  coat: { len: .7, flare: 1.4 }, mats: { ...E0.mats, wrap: 'c', straw: 'm', hood: 'c', scarf: 'c', accent: 't', coat: 'k', sleeves: 't' }, lv: { coat: 4 },
  dou: DOU, haidate: { lv: 3, to: .8 }, shins: SUNE, pauldron: { ...E0.pauldron, arm: 'NF' }, obi: { lv: 4 } });

// ---- Iron Ash faces: V3 exactly, only the face under the brim changes ----
const V3 = IA.V3;
const FACE_RAMPS = { ...V3.ramps, sk: ['#161210', '#1f1916', '#2a211d', '#352a24', '#42342c', '#504036', '#604c40', '#715a4c'] };
function face(id, o) { return { ...V3, id, ramps: FACE_RAMPS, enemyMat: { ...V3.enemyMat, sk: 'r' }, body: { ...V3.body, neck: V3.body.neck + 2.4, headR: V3.body.headR + .4 }, ...o }; }  // the neck 1.4px longer so the face clears the shoulder plates
const FC = {};
FC.V3 = { ...V3, id: 'V3' };
const menpo = (f, lit = 0) => { const hr = f.hr;
  f.cap([hr * .8, 0, -.4], [hr + 1.1, 0, -1.4], .7, 9 + lit, 'mask', { out: 1 });           // the nose, standing off the plate
  f.px([hr + .6, 0, -1.9], 1, 'mask', { out: 1 });                                            // its shadow
  f.line([hr * .92, -1.4, -2.5], [hr * .92, 1.4, -2.5], 0, 'mask');                          // the mouth slit
  for (const sd of [-1, 1]) f.line([hr * .62, sd * 2.6, -.6], [hr * .25, sd * 3.5, -3], 6 + lit, 'mask'); // the cheek plates' edge
};
FC.F1 = face('F1', { face: { lv: 7, brow: .9, back: -.9, part: 'mask' }, eyeDrop: -.2, faceFx: f => menpo(f) });
FC.F2 = face('F2', { face: { lv: 5, brow: -1.8, back: -.6, part: 'mask' }, eyeDrop: -.1, eyes: { ink: '#b8fff6', ink2: '#6ff3e4' },
  faceFx: f => { const hr = f.hr;
    for (const sd of [-1, 1]) { f.line([hr * .85, sd * .5, 1.3], [hr * .6, sd * 2.8, 1.9], 7, 'mask');          // a scowling brow ridge
      f.cap([hr * .9, sd * 1.7, .1], [hr * .9, sd * 1.7, .1], .9, 0, 'mask');                              // the eye holes
      f.line([hr + .4, sd * .4, -1.6], [hr * .7, sd * 2.9, -2.6], 8, 'scarf');                              // the moustache, swept down
      f.line([hr * .7, sd * 2.9, -2.6], [hr * .5, sd * 3.2, -3.4], 7, 'scarf'); }
    f.cap([hr * .8, 0, -.2], [hr + 1.4, 0, -1.4], .8, 6, 'mask', { out: 1 });
    f.line([hr * .95, -1.3, -2.5], [hr * .95, 1.3, -2.5], 0, 'mask');
    f.line([hr * .97, -1, -2.5], [hr * .97, 1, -2.5], 0, 'mask', { ink: '#a9a8a4' }); } });
FC.F3 = face('F3', { face: { lv: 7, brow: .5, back: -.9, part: 'mask' }, eyeDrop: -.2, eyes: { n: 1 },
  faceFx: f => { const hr = f.hr; f.line([hr * .98, 0, -.3], [hr * .9, 0, -hr + .3], 0, 'mask', { ink: '#52e8d6' }); f.px([hr * .95, 0, -1.4], 0, 'mask', { ink: '#b8fff6' }); } });
FC.F4 = face('F4', { face: null, eyeDrop: .6, eyeIn: 0,
  faceFx: f => { f.region((dx, dy, fr) => (fr > .3 && dy > -.2 && dy < 1.6) ? { lv: 0, part: 'hood' } : { lv: 6, part: 'hood', pat: 1 });
    f.line([f.hr * .9, -2.4, -2.6], [f.hr * .5, 2.6, -1.2], 2, 'hood'); } });
FC.F5 = face('F5', { face: { lv: 3, brow: -1, back: -.4, part: 'skin' }, mats: { ...V3.mats, skin: 'sk' }, eyeDrop: .1, eyes: { w: 1 },
  faceFx: f => { const hr = f.hr;
    f.region((dx, dy, fr, x, y) => fr > -.4 && dy > 1.6 && ((x + y) & 1) ? { lv: 1, part: 'skin' } : null);   // stubble along the jaw
    for (const sd of [-1, 1]) f.px([hr * .8, sd * 2, -.9], 5, 'skin');                                          // the cheekbones catch a little light
    f.cap([hr * .85, 0, -.4], [hr + .7, 0, -1.2], .5, 4, 'skin', { out: 1 });
    f.line([hr * .9, -1, -2.3], [hr * .9, .8, -2.2], 0, 'skin');
    f.line([hr * .8, -2.4, .6], [hr * .7, -1.2, -2], 0, 'skin', { ink: '#7d6152' }); } });               // the scar
FC.F6 = face('F6', { face: { lv: 8, brow: .9, back: -.9, part: 'mask' }, eyeDrop: -.2, eyes: { n: 0 }, throat: { r: 2.4, lv: 4 },
  faceFx: f => menpo(f, 3) });

// ---- V3 refined: the same design drawn better ----
const SHADE_R = c => { if (c.hat) return IA_SHADE(c); let v = c.v; const metal = c.mat === 'i' || c.mat === 'b', d = dither(c.x, c.y);
  if (c.tag & 64) return v;
  if (c.O(0, -1)) v += metal ? 4 : 2;
  else if (c.O(0, -2)) v += metal ? (c.inner ? (d ? 3 : 1) : 2) : (c.inner && d ? 1 : 0);
  else if (c.O(0, -3) && c.inner && d) v += 1;
  if (c.mat === 'm') { if ((c.x * 3 + c.y * 2) % 4 === 0) v += 2; else if ((c.x + c.y * 3) % 5 === 0) v -= 2; }
  if (c.E(0, 1) || c.Bh(0, 1)) v -= metal ? 2 : 1; else if (c.E(0, 2) && d && c.inner) v -= 1;
  if (c.NrX(0, -1) || c.NrX(1, 0) || c.NrX(-1, 0) || c.NrX(0, 1)) v -= 2; else if (c.Nr(0, -1)) v -= 1;    // a darker line wherever a nearer part crosses
  return v; };
const refine = S => ({ ...S, refine: true, shade: SHADE_R, lean0: .13, head0: .08, footFwd: 1, handFwd: .6, sink: 1.1, stance: 1.55,
  body: { ...S.body, neck: S.body.neck + (S === V3 ? 1.4 : 0), footL: 1.2, footR: 1.25, handR: 1.8, kneeR: S.body.kneeR - .2, uarmR: 2.4 },
  hat: { ...S.hat, clean: true, tiltMul: 0 }, surcoat: S.surcoat && { ...S.surcoat, sway: 1.6 },
  lv: { ...S.lv, hand: 5, foot: 1, armN: S.lv.armN + 1, legN: S.lv.legN + 1 }, kusazuri: S.kusazuri && { ...S.kusazuri, follow: .6 } });
FC.R = { ...refine(V3), id: 'R' };
for (const k of ['F1', 'F2', 'F3', 'F4', 'F5', 'F6']) FC['R' + k] = { ...refine(FC[k]), id: 'R' + k };

export { FC, STYLES };
