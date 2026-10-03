// ---- The gear's colours: every piece is painted from these ramps (8 shades, darkest first), so 200 pieces stay one
// palette. The game's rules (docs/design-notes.md, Clothing): cloth is shades of black; colour is rarity (black and dark
// grey common, grey and whitish rare, beige rarer, a real colour very rare) and rank (only royalty wears red); armour
// takes dark dyes, each black tinted to its hue at the same lightness (oxblood, indigo, moss, plum, bronze, teal). The
// iron, indigo and straw are Iron Ash V3's own ramps (gfx/palette.js).
import { RAMP } from 'ronin-engine/render/gfx/palette.js';

const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), toHex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
// a ramp of n shades through a few stops, evenly
export function ramp(stops, n = 8) {
  const S = stops.map(hx); return Array.from({ length: n }, (_, i) => { const u = i / (n - 1) * (S.length - 1), k = Math.min(S.length - 2, Math.floor(u)), f = u - k;
    return toHex(S[k].map((v, j) => v + (S[k + 1][j] - v) * f)); });
}
const pick = (r, idx) => idx.map(i => r[i]);

// letter → ramp. Cloth first (by rarity), then the dark dyes, then the hard materials.
export const DYES = {
  k: { name: 'black', kind: 'cloth', tier: 0, r: ramp(['#0f1012', '#1c1d20', '#2c2d31', '#3e3f43']) },
  d: { name: 'dark grey', kind: 'cloth', tier: 0, r: ramp(['#16181b', '#25282c', '#373b40', '#4e5359']) },
  e: { name: 'earth brown', kind: 'cloth', tier: 1, r: ramp(['#1a130c', '#2c2015', '#3f2f20', '#56412e']) },
  o: { name: 'moss drab', kind: 'cloth', tier: 1, r: ramp(['#15170f', '#23281a', '#333a27', '#465036']) },
  v: { name: 'indigo', kind: 'cloth', tier: 1, r: pick(RAMP.v, [0, 1, 2, 3, 4, 5, 6, 7]) },
  g: { name: 'grey', kind: 'cloth', tier: 2, r: ramp(['#2a2c2f', '#45484c', '#64676b', '#83868a']) },
  w: { name: 'ash white', kind: 'cloth', tier: 2, r: ramp(['#46484a', '#6c6e6e', '#939491', '#b9b9b3']) },
  h: { name: 'hemp beige', kind: 'cloth', tier: 3, r: ramp(['#2e271c', '#4a4030', '#6a5d46', '#8c7d61']) },
  p: { name: 'persimmon', kind: 'cloth', tier: 4, r: ramp(['#2a130c', '#45200f', '#633019', '#7f4124']) },
  r: { name: 'royal red', kind: 'cloth', tier: 4, r: ramp(['#2b0b0e', '#4a1016', '#6a1820', '#86232a']) },
  // armour dyes: lacquer over iron, at the iron's own lightness
  x: { name: 'oxblood', kind: 'dye', tier: 1, r: ramp(['#1a0e0f', '#2e1719', '#442325', '#5c3133']) },
  n: { name: 'indigo lacquer', kind: 'dye', tier: 1, r: ramp(['#0f121b', '#1a1f2e', '#283044', '#38425b']) },
  s: { name: 'moss lacquer', kind: 'dye', tier: 1, r: ramp(['#11140f', '#1e2419', '#2d3626', '#3f4a35']) },
  u: { name: 'plum', kind: 'dye', tier: 2, r: ramp(['#170f17', '#271a27', '#3a283a', '#4f374f']) },
  z: { name: 'bronze', kind: 'dye', tier: 2, r: ramp(['#1a140c', '#2e2416', '#453622', '#5e4a30']) },
  t: { name: 'teal', kind: 'dye', tier: 2, r: ramp(['#0d1514', '#162523', '#223735', '#304b48']) },
  q: { name: 'black lacquer', kind: 'dye', tier: 0, r: ramp(['#08090b', '#121418', '#1e2126', '#2c3036']) },
  i: { name: 'iron', kind: 'metal', tier: 0, r: pick(RAMP.i, [0, 1, 2, 3, 4, 5, 7, 9]) },
  c: { name: 'chain', kind: 'metal', tier: 0, r: ramp(['#121416', '#22262a', '#353a3f', '#50565c']) },
  l: { name: 'leather', kind: 'hide', tier: 0, r: ramp(['#170f0a', '#291b12', '#3d2a1c', '#543b28']) },
  m: { name: 'straw', kind: 'straw', tier: 0, r: pick(RAMP.m, [0, 0, 1, 2, 3, 4, 5, 5]).map((h, i) => i ? h : '#1f1b11') },
  b: { name: 'bamboo', kind: 'straw', tier: 0, r: ramp(['#1e1d12', '#34321e', '#4d4a2d', '#68643f']) },
  y: { name: 'wood', kind: 'wood', tier: 0, r: ramp(['#150f0a', '#251a11', '#38281a', '#4d3825']) },
  f: { name: 'fur', kind: 'hide', tier: 1, r: ramp(['#16120e', '#2a221a', '#40352a', '#5a4c3d']) },
};
export const KIND_NAME = { cloth: 'cloth', dye: 'lacquered iron', metal: 'iron', hide: 'hide', straw: 'straw', wood: 'wood' };
// 'A3' with the piece's palette { A: 'k' } → the hex: capitals A–D name the piece's own colours (so a recolour is one
// letter), a lower-case dye letter is that dye itself; the digit is the shade, 0 darkest to 7
export function colour(ref, pal) {
  const k = ref[0], i = +ref.slice(1), d = DYES[k >= "A" && k <= "Z" ? pal && pal[k] : k];
  if (!d) throw new Error(`gear colour ${ref}: no dye for ${k}`); return d.r[Math.max(0, Math.min(7, i))];
}
