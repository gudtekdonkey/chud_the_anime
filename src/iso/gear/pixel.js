// ---- An outfit for the pixel look (look/pixel/): the pages' 2D engine draws from a style object of feature flags
// (a hat, a hood, a dō, kusazuri, suneate, kote, sode, sleeves, a coat …) and material ramps, so an outfit becomes a
// style: Iron Ash's refined F1 (FC.RF1) stripped to the body, then each worn piece's `pix` words switch its features
// on, and its colours become the ramps of the parts they paint. Coarser than the 3D dresser (the engine has one
// armour colour, one hat shape per kind), but every piece shows up as something, and the look seam stays four calls.
import { FC } from '../look/pixel/styles.js';
import { DYES } from './palette.js';
import { worn } from './dress.js';

const BARE = { hat: null, hood: null, face: null, faceFx: null, throat: null, mantle: null, cape: null, surcoat: null, coat: null, sleeves: null, dou: null, kusazuri: null, koshimino: null,
  haidate: null, shins: null, kote: null, pauldron: null, kyahan: null, waraji: null, obi: null, tasuki: null, collar2: null, tails: null, skirt: .45 };
const DOU = { from: 2.4, to: 1.6, lv: 3 }, PAUL = { w: 3.2, h: 6, lv: 5, lames: 3 };
// the engine's ramps run to ~11 shades; ours have 8: stretch them, keeping the darkest and lightest
const stretch = r => Array.from({ length: 11 }, (_, i) => r[Math.min(7, Math.round(i * .7))]);
const RAMPS = Object.fromEntries(Object.entries(DYES).map(([k, d]) => ['G' + k, stretch(d.r)]));
const rampOf = (p, letter = 'A') => { const d = p && p.pal[letter]; return d === 'i' ? 'i' : d ? 'G' + d : null; };   // iron keeps the engine's own metal shading

export function pixStyle(outfit) {
  const R = FC.RF1, S = { ...R, ...BARE, id: 'gear', ramps: { ...R.ramps, ...RAMPS }, mats: { ...R.mats }, body: { ...R.body, hemR: 2.9, kneeR: 2.8 }, lv: { ...R.lv } };
  const M = S.mats, on = (p, part, letter) => { const r = rampOf(p, letter); if (r) M[part] = r; };
  for (const p of worn(outfit)) {
    const w = new Set(p.pix.split(/\s+/).filter(Boolean)), side = p.side === 'R' ? 'N' : 'F';   // his right is the near side
    if (p.slot === 'torso' && p.layer === 'base') { on(p, 'body'); on(p, 'arms'); on(p, 'sleeves'); on(p, 'coat'); on(p, 'obi'); S.obi = { lv: 4 }; }
    if (p.slot === 'legs' && p.layer === 'base') on(p, 'legs');
    if (p.slot === 'feet' && p.layer === 'base') { on(p, 'feet'); on(p, 'wrap'); }
    if (p.slot.startsWith('hand')) on(p, 'hands');
    if (w.has('coat')) S.coat = { len: .7, flare: 1.4 };
    if (w.has('jacket')) S.coat = S.coat || { len: .35, flare: .6 };
    if (w.has('tasuki')) S.tasuki = { ink: DYES[p.pal.B || p.pal.A].r[4] };
    if (w.has('hakama')) { S.skirt = .95; S.body.hemR = 4.6; S.body.kneeR = 3.4; }
    if (w.has('trousers')) { S.skirt = .6; S.body.hemR = 3.2; }
    if (w.has('tight')) { S.skirt = 0; S.body.hemR = 2.7; }
    if (w.has('short')) S.body.hemR = 2.6;
    if (w.has('apron')) { S.koshimino = { n: 1, angles: [0], len: 9, w: 3, lv: 3, part: 'coat', flare: .4 }; on(p, 'coat', p.pal.B ? 'B' : 'A'); }
    if (w.has('dou') || w.has('vest') || w.has('mail')) { S.dou = DOU; on(p, 'armour'); }
    if (w.has('surcoat')) { S.surcoat = { len: 12, flare: 1.8, lv: 4, mon: 7, sway: 1.6 }; M.coat = rampOf(p, 'B'); }
    // the engine's sleeves and mantle hang on cloth chains the slice does not simulate (lookpix.js draws without cloth):
    // a wide sleeve draws as the arm, a straw cape as the engine's cape, longer
    if (w.has('mantle') || w.has('cape')) { S.cape = { len: w.has('mantle') ? 11 : 7 }; on(p, 'cape'); }
    if (w.has('kusazuri')) { S.kusazuri = { n: 7, len: 7, w: 1.9, lv: 3, flare: 1.4, follow: .6 }; if (!S.dou) on(p, 'armour'); }
    if (w.has('koshimino')) { S.koshimino = { n: 9, len: 8, w: 1.4, lv: 4, part: 'straw', flare: 1.8, tatter: 1 }; on(p, 'straw'); }
    if (w.has('haidate')) { S.haidate = { lv: 3, to: .8 }; if (!S.dou) on(p, 'armour'); }
    if (w.has('shins')) { S.shins = { r: 2.5, lv: 0, knee: true }; on(p, 'shins'); }
    if (w.has('boots')) { S.shins = S.shins || { r: 2.3, lv: 1 }; on(p, 'shins'); on(p, 'feet'); }
    if (w.has('kyahan') || w.has('wraps')) { S.kyahan = { r: 2.4, r2: 1.9, lv: 2 }; on(p, 'wrap'); }
    if (w.has('waraji')) S.waraji = { lv: 6 };
    if (w.has('tabi')) on(p, 'feet');
    if (w.has('kote')) { S.kote = { arms: ((S.kote && S.kote.arms) || '') + side, lv: 4, chain: 2 }; if (!S.dou) on(p, 'armour'); }
    if (w.has('pauldron')) { S.pauldron = { ...PAUL, arm: ((S.pauldron && S.pauldron.arm) || '') + side }; if (!S.dou) on(p, 'armour'); }
    if (w.has('hat')) { S.hat = R.hat; on(p, 'hat'); }
    if (w.has('kasa')) { S.hat = { ...R.hat, R: 14, ry: 1.6, h: 7, y: 2.4, top: 1.2, prof: 1.35 }; on(p, 'hat'); }
    if (w.has('helm')) { S.hat = { ...R.hat, R: 6.4, ry: 1.2, h: 4.6, y: 1.4, top: 4.5, prof: .9 }; on(p, 'hat'); }
    if (w.has('basket')) { S.hood = { lv: 5, r: 4.6 }; on(p, 'hood'); }
    if (w.has('hood')) { S.hood = { lv: 5, r: 3.8 }; on(p, 'hood'); }
    if (w.has('cap') || w.has('hair') || w.has('band')) on(p, 'hair');
    if (w.has('menpo')) { S.face = R.face; S.faceFx = R.faceFx; on(p, 'mask', p.slot === 'head' && p.pal.A === 'i' ? 'A' : 'B'); }
    else if (w.has('mask') && !S.face) { S.face = { lv: 4, brow: -.6, back: -.9, part: 'mask' }; on(p, 'mask'); }
  }
  return S;
}
