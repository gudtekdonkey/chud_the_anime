// ---- Hairstyles, as data (docs/hair.md): each is parts measured from the scalp (centre space, contract.js), every part
// in one REGION, and chains that hang on springs (tails, braids, sheets of loose hair, locks). `crownItem` says what
// sits on the crown ('knot' or 'tail'): the hat decides what becomes of it. `scalp`: what the bare head shows ('skin':
// a shaved pate; 'hair': the hair's own colour). Original designs: period ones from the Sengoku and Edo eras, a few
// stylised. A new style is a new row; a part is { r: region, g: shell | rod | spike | lump | loop | box, c: colour }.
import { RAMP as R } from 'ronin-engine/iso/gfx/palette.js';
import { onScalp } from './parts.js';

const PI = Math.PI;
export const COLS = {
  black: { h: R.k[1], hi: R.k[3], lo: R.k[0], tie: R.i[9] },
  ink: { h: R.v[1], hi: R.v[3], lo: R.v[0], tie: R.l[2] },
  brown: { h: R.w[1], hi: R.w[2], lo: R.w[0], tie: R.m[3] },
  grey: { h: R.i[5], hi: R.i[7], lo: R.i[3], tie: R.v[4] },
  white: { h: R.i[9], hi: R.i[10], lo: R.i[7], tie: R.l[2] },
  stubble: { h: R.k[2], hi: R.k[3], lo: R.k[1], tie: R.k[2] },
  cloth: { h: R.c[2], hi: R.c[4], lo: R.c[1], tie: R.c[3] },
};
// the scalp's regions: the crown cap, then back and sides (three arcs, never overlapping)
const CROWN = (t, o = {}) => ({ r: 'crown', g: 'shell', c: 'h', th: [0, .3], t, ...o });
const BS = (th0, th1, t, c = 'h') => [{ r: 'back', g: 'shell', c, th: [th0, th1 + .04], arc: ['back', PI / 4], t },
  { r: 'sides', g: 'shell', c, th: [th0, th1], arc: ['left', PI / 4], t }, { r: 'sides', g: 'shell', c, th: [th0, th1], arc: ['right', PI / 4], t }];
const FRONT = PI;                                             // onScalp's phi for his face
const fringe = (n, spread, th, len, w, sweep = 0, down = .7, c = 'h') => Array.from({ length: n }, (_, i) => { const u = n > 1 ? i / (n - 1) - .5 : 0, ph = FRONT + u * spread;
  return { r: 'fringe', g: 'spike', c: i % 2 ? 'hi' : c, at: onScalp(th, ph, .06), dir: [Math.sin(ph) * .5 + sweep, -down, -Math.cos(ph) * .5], len: len * (1 - Math.abs(u) * .3), w }; });
const lock = (sx, len, o = {}) => ({ r: 'strands', root: [1.8 * sx, .55, 1.05], dir: [.1 * sx, -1, .15], len, segs: 2, w: [.24, .16], d: .2, kind: 'lock', tip: 'point', hang: .5, ...o });
const sheet = (len, w, o = {}) => ({ r: 'tail', root: [0, -.45, -2.0], dir: [0, -1, -.25], len, segs: Math.max(2, Math.round(len / 1.1)), w, d: .42, kind: 'flat', tip: 'fringe', hang: .9, ...o });
const sideLocks = (len, o = {}) => [1, -1].map(sx => ({ r: 'strands', root: [1.85 * sx, .2, .9], dir: [.05 * sx, -1, .15], len, segs: 2, w: [.75, .6], d: .3, kind: 'flat', tip: 'fringe', hang: .7, ...o }));
// the chonmage's knot: the gathered hair rising from the back of the crown, folded forward over the shaved pate
const mage = (len, r = .3, c = 'h') => [
  { r: 'knot', g: 'rod', c, at: [0, .87, -1.82], dir: [0, 1.2, .75], len: 1.45, r0: r + .1, r1: r + .02 },
  { r: 'knot', g: 'rod', c, at: [0, 2.12, -1.05], dir: [0, .02, 1], len, r0: r, r1: r - .04 },
  { r: 'knot', g: 'rod', c: 'tie', at: [0, 2.12, -.98], dir: [0, 0, 1], len: .32, r0: r + .05, r1: r + .05 }];
const spikesRound = (n, th, len, w, o = {}) => Array.from({ length: n }, (_, i) => { const ph = (i + .5) / n * 2 * PI, a = onScalp(th + .12 * (i % 3) / 2, ph, 0);
  return { r: th < .25 ? 'crown' : 'back', g: 'spike', c: i % 2 ? 'hi' : 'h', at: a, dir: [a[0], a[1] * .6 + (o.up ?? -.3), a[2]], len: len * (.8 + .3 * ((i * 7) % 3) / 2), w }; })
  .filter(s => !(Math.abs(Math.atan2(s.at[0], s.at[2])) < .9 && s.at[1] < 1.3));   // nothing hangs over his eyes

export const HAIR = [
  // ---- topknots
  { id: 'chonmage', name: 'Chonmage', group: 'Topknot', col: 'black', scalp: 'skin', crownItem: 'knot',
    parts: [...BS(.36, .64, .13), ...mage(2.0), { r: 'knot', g: 'lump', c: 'h', at: [0, 2.14, .98], rad: .27 }] },
  { id: 'ichomage', name: 'Ginkgo knot', group: 'Topknot', col: 'black', scalp: 'skin', crownItem: 'knot',
    parts: [...BS(.36, .64, .13), ...mage(1.3, .27), { r: 'knot', g: 'box', c: 'hi', at: [0, 2.2, .3], s: [1.15, .14, .6], rot: [-.06, 0, 0] }] },
  { id: 'chasen', name: 'Tea-whisk knot', group: 'Topknot', col: 'black', scalp: 'hair', crownItem: 'knot',
    parts: [CROWN(.1), ...BS(.3, .62, .12),
      { r: 'knot', g: 'rod', c: 'h', at: [0, 1.85, -.75], dir: [0, 1, -.3], len: .75, r0: .38, r1: .3 },
      { r: 'knot', g: 'rod', c: 'tie', at: [0, 2.05, -.8], dir: [0, 1, -.3], len: .42, r0: .41, r1: .36 },
      ...[[0, 1, -.2], [.45, 1, -.3], [-.45, 1, -.3], [0, .9, -.8], [.25, .9, .25], [-.25, .9, .25]].map((d, i) => ({ r: 'knot', g: 'spike', c: i % 2 ? 'hi' : 'h', at: [0, 2.5, -.95], dir: d, len: .85, w: .22 }))] },
  { id: 'ronin-knot', name: "Ronin's knot", group: 'Topknot', col: 'black', scalp: 'skin', crownItem: 'knot',
    parts: [CROWN(.1, { c: 'lo' }), ...BS(.3, .64, .15), ...mage(1.2, .32),
      { r: 'knot', g: 'spike', c: 'hi', at: [0, 2.15, .1], dir: [.6, .2, 1], len: .7, w: .2 }, { r: 'knot', g: 'spike', c: 'h', at: [0, 2.15, .1], dir: [-.5, .3, 1], len: .6, w: .2 }],
    chains: [lock(1, 1.5), lock(-1, 1.2)] },
  { id: 'white-knot', name: 'Old knot', group: 'Old master', col: 'white', scalp: 'skin', crownItem: 'knot',
    parts: [...BS(.38, .62, .1, 'lo'), ...mage(1.5, .2)] },
  // ---- tied back
  { id: 'ronin', name: 'Ronin tied back', group: 'Tied', col: 'black', scalp: 'hair',
    parts: [CROWN(.16, { lift: .04 }), ...BS(.3, .66, .15), ...fringe(3, .5, .29, .75, .26, -.35, .55),
      { r: 'back', g: 'lump', c: 'tie', at: [0, -.32, -2.12], rad: .3, s: [1.25, .9, .8] }],
    chains: [{ r: 'tail', root: [0, -.38, -2.15], dir: [0, -.4, -1], len: 2.0, segs: 3, w: [.66, .36], d: .55, kind: 'round', tip: 'brush', hang: .8 }, lock(1, 1.4), lock(-1, 1.1, { root: [-1.8, .45, 1.0] })] },
  { id: 'low-tail', name: 'Low tail', group: 'Tied', col: 'black', scalp: 'hair',
    parts: [CROWN(.14), ...BS(.3, .68, .14), { r: 'back', g: 'lump', c: 'tie', at: [0, -.75, -2.02], rad: .28, s: [1.3, .8, .8] }],
    chains: [{ r: 'tail', root: [0, -.82, -2.04], dir: [0, -1, -.3], len: 4.4, segs: 4, w: [.76, .44], d: .6, kind: 'round', tip: 'point', hang: .9 }] },
  { id: 'high-tail', name: 'High tail', group: 'Tied', col: 'black', scalp: 'hair', crownItem: 'tail',
    parts: [CROWN(.14), ...BS(.3, .66, .14), { r: 'knot', g: 'lump', c: 'tie', at: [0, 1.88, -1.05], rad: .36, s: [1.2, .9, 1] }],
    chains: [{ r: 'knot', root: [0, 1.95, -1.3], dir: [0, .3, -1], len: 4.6, segs: 4, w: [.82, .44], d: .66, kind: 'round', tip: 'point', hang: .75 }] },
  { id: 'braid', name: 'Single braid', group: 'Braided', col: 'black', scalp: 'hair',
    parts: [CROWN(.13), ...BS(.3, .68, .13)],
    chains: [{ r: 'tail', root: [0, -.62, -2.04], dir: [0, -1, -.3], len: 4.8, segs: 5, w: [.64, .42], d: .6, kind: 'braid', tip: 'brush', hang: .9 }] },
  { id: 'twin-braids', name: 'Twin braids', group: 'Braided', col: 'brown', scalp: 'hair',
    parts: [CROWN(.13), ...BS(.3, .66, .13), ...[1, -1].map(sx => ({ r: 'back', g: 'lump', c: 'tie', at: [1.15 * sx, -.7, -1.7], rad: .26 }))],
    chains: [1, -1].map(sx => ({ r: 'tail', root: [1.15 * sx, -.78, -1.72], dir: [.25 * sx, -1, -.35], len: 3.8, segs: 4, w: [.52, .38], d: .5, kind: 'braid', tip: 'brush', hang: .9 })) },
  { id: 'half-up', name: 'Half up', group: 'Tied', col: 'black', scalp: 'hair', crownItem: 'knot',
    parts: [CROWN(.15), ...BS(.3, .7, .15), { r: 'knot', g: 'lump', c: 'h', at: [0, 1.5, -1.55], rad: .5, s: [1, .9, .9] },
      { r: 'knot', g: 'rod', c: 'tie', at: [-.75, 1.62, -1.6], dir: [1, .1, 0], len: 1.5, r0: .06, r1: .06 }],
    chains: [sheet(2.6, [2.6, 2.2])] },
  { id: 'bun', name: 'Low bun', group: 'Tied', col: 'black', scalp: 'hair',
    parts: [CROWN(.14), ...BS(.3, .68, .14), { r: 'back', g: 'lump', c: 'h', at: [0, -.42, -2.32], rad: .62, s: [1, .88, .82] },
      { r: 'back', g: 'rod', c: 'tie', at: [-.95, -.28, -2.4], dir: [1, .12, 0], len: 1.9, r0: .07, r1: .05 }] },
  { id: 'mizura', name: 'Mizura loops', group: 'Ancient', col: 'black', scalp: 'hair',
    parts: [CROWN(.12), ...BS(.3, .6, .12), ...[1, -1].flatMap(sx => [
      { r: 'sides', g: 'loop', c: 'h', at: [2.2 * sx, -.62, -.15], R: .55, tube: .2, rot: [0, PI / 2, 0] },
      { r: 'sides', g: 'lump', c: 'tie', at: [2.12 * sx, -.08, -.15], rad: .18 },
      { r: 'sides', g: 'spike', c: 'hi', at: [2.2 * sx, -1.15, -.15], dir: [0, -1, 0], len: .7, w: .2 }])] },
  // ---- loose
  { id: 'long-loose', name: 'Long and loose', group: 'Loose', col: 'black', scalp: 'hair',
    parts: [CROWN(.16, { lift: .05 }), ...BS(.3, .7, .16)], chains: [sheet(4.4, [3.0, 2.4]), ...sideLocks(2.1)] },
  { id: 'hime', name: 'Straight cut', group: 'Loose', col: 'ink', scalp: 'hair',
    parts: [CROWN(.15), ...BS(.3, .7, .15), { r: 'fringe', g: 'box', c: 'hi', at: [0, 1.08, 1.84], s: [2.5, .55, .28], rot: [-.45, 0, 0] }],
    chains: [sheet(3.4, [2.9, 2.7], { tip: 'cut' }), ...sideLocks(1.7, { root: [1.75, .55, 1.0], tip: 'cut', w: [.7, .7] }).map((c, i) => i ? { ...c, root: [-1.75, .55, 1.0] } : c)] },
  { id: 'wild', name: 'Wild', group: 'Loose', col: 'black', scalp: 'hair',
    parts: [CROWN(.2, { lift: .08 }), ...BS(.3, .66, .2), ...spikesRound(13, .2, 1.1, .4), ...spikesRound(9, .45, 1.0, .36, { up: -.8 })],
    chains: [lock(1, 1.5), lock(-1, 1.3, { root: [-1.8, .45, 1.0] })] },
  // ---- short
  { id: 'crop', name: 'Close crop', group: 'Short', col: 'black', scalp: 'hair', parts: [CROWN(.09), ...BS(.3, .6, .09)] },
  { id: 'stubble', name: 'Shaved, grown in', group: 'Short', col: 'stubble', scalp: 'skin', parts: [CROWN(.1), ...BS(.3, .6, .1)] },
  { id: 'monk', name: "Monk's shave", group: 'Short', col: 'black', scalp: 'skin', parts: [] },
  { id: 'wrapped', name: 'Wrapped (shinobi)', group: 'Covered', col: 'cloth', scalp: 'hair',
    parts: [CROWN(.3), ...BS(.3, .66, .3), { r: 'back', g: 'lump', c: 'tie', at: [0, -.15, -2.32], rad: .42, s: [1.3, .85, .8] }],
    chains: [1, -1].map(sx => ({ r: 'tail', root: [.22 * sx, -.2, -2.38], dir: [.3 * sx, -1, -.5], len: 1.5, segs: 2, w: [.5, .4], d: .14, kind: 'flat', tip: 'cut', hang: .7 })) },
  // ---- old masters
  { id: 'sage', name: 'Bald sage', group: 'Old master', col: 'white', scalp: 'skin',
    parts: [...BS(.42, .7, .16)], chains: [sheet(3.0, [2.6, 2.0], { root: [0, -.62, -1.96] }), lock(1, 2.4, { root: [1.85, .05, .85], w: [.3, .14] }), lock(-1, 2.2, { root: [-1.85, .05, .85], w: [.3, .14] })] },
  { id: 'silver-mane', name: 'Silver mane', group: 'Old master', col: 'white', scalp: 'hair',
    parts: [CROWN(.24, { lift: .12 }), ...BS(.3, .7, .22), ...fringe(4, .8, .27, .85, .3, .1, .6)],
    chains: [sheet(4.8, [3.2, 2.6]), ...sideLocks(2.4)] },
  // ---- stylised
  { id: 'spiked', name: 'Spiked fringe', group: 'Stylised', col: 'ink', scalp: 'hair',
    parts: [CROWN(.22, { lift: .1 }), ...BS(.3, .64, .2), ...fringe(5, .9, .27, 1.0, .34, .15, .75),
      ...spikesRound(8, .42, 1.2, .4, { up: -.9 }).filter(s => s.at[2] < 0)] },
  { id: 'flame', name: 'Swept flame', group: 'Stylised', col: 'black', scalp: 'hair',
    parts: [CROWN(.2, { lift: .1 }), ...BS(.3, .62, .18), ...Array.from({ length: 8 }, (_, i) => { const x = ((i % 4) - 1.5) * .55, z = 1.3 - Math.floor(i / 4) * 1.5;
      return { r: 'crown', g: 'spike', c: i % 2 ? 'hi' : 'h', at: [x, Math.sqrt(Math.max(.2, 1 - (x / 1.95) ** 2 - (z / 1.95) ** 2)) * 2.05 + .1, z], dir: [x * .2, .55, -1], len: 1.4 + .3 * (i % 3), w: .44 }; })] },
];
export const HAIR_ID = Object.fromEntries(HAIR.map(h => [h.id, h]));
export const DEFAULT_HAIR = { hero: 'ronin', foe: 'chonmage' };   // the samurai keep their topknot (owner)
