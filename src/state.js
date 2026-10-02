import { makeFigure } from './wardrobe/dress.js';

// ---- Shared mutable state: the player, the camera beats and every effect list ----
export const P = { x: 200, y: 180, z: 0, vz: 0, vx: 0, vy: 0, face: 1, view: 'E', state: 'idle', t: 0, still: 0, combo: false,
  hitDone: {}, ev: {}, inv: false, ghosts: [], dead: 0, flash: 0, struck: new Set(), charge: null, cv: null, fr: null, trem: 0,
  qi: 0, qiIdle: 0, storm: 0, aura: 0,
  gait: { walk: 40, run: 78 },   // px/s, set by his personality
  cd: {}, cdMax: {}, cdPop: {}, cdDeny: {},   // cooldowns: seconds left, the full length, the ready glint, the refused-press blink
  blinks: 1, blinkT: 0, kLock: 0,   // K's blink charges, seconds until they all come back, the flash reset after an execution
  weapon: 'katana',
  // the combo ladder and Flow (player/combo.js): the chain's count and its window, Flow's seconds left, HUD glints, the longest combo announced
  flowN: 0, flowGap: 0, flow: 0, flowPop: 0, flowPip: 0, flowUsed: 0, comboSeen: 2, comboUp: 0 };
export const parts = [];
// what he wears (item ids from src/wardrobe/items.js) and the state of its cloth; the wardrobe under the game changes it
export const wear = makeFigure();
// reassigned from many modules, so they live on one object: screen shake, hit pause, the pale screen flash,
// and roomClear (page checkbox: treat the enemies as no threat)
export const S = { shake: 0, hitstop: 0, impact: 0, scr: { t: 0, max: 1, a: 0 }, roomClear: false, banner: null, powerTest: 0,
  skillTest: 'played',   // the page's skills picker (player/mastery.js): 'played', 'mastered', 'trees' (every tree full) or 'wild:<skill>'
  smoke: 0 };   // seconds of the static bomb's smoke left: while it is up every enemy counts as isolated, so K can take any of them


// ---- The inventory: the HUD reads only this, and every system writes to it. Qi stays on P.qi (0..1) ----
// hp 0..1; power 1..3 is the I / II / III tier, from shrine upgrades and power relics (items/inventory.js powerTier); edge: seconds of whetstone left
// basic: landed basic cuts, his basic skill; it grows the J combo (player/combo.js)
export const INV = { hp: .6, mon: 0, shards: 0, exp: 0, lv: 1, power: 1, upgrades: 0, edge: 0, edgeSlot: 2, basic: 0,
  weapon: 'katana',   // mirrors P.weapon for the HUD; the weapon system (src/weapons/) sets both
  quick: [{ id: 'bomb', n: 3 }, { id: 'talisman', n: 2 }, { id: 'whetstone', n: 2 }, { id: 'incense', n: 3 }],   // null = empty
  charms: ['bead', 'mirror', 'knot', null],
  // each skill's growth (player/mastery.js): wild casts so far (three and its key works), known, tree points from landed casts, the fork's pick
  sk: Object.fromEntries(['double', 'moon', 'rift', 'mirror', 'sweep', 'tele', 'breath'].map(k => [k, { wild: 0, known: k === 'tele', pts: 0, pick: null }])),
  fx: { qi: 0, mon: 0, shards: 0, weapon: 0, hp: 0, quick: [0, 0, 0, 0], charms: [0, 0, 0, 0] } };   // flash timers the HUD counts down
// rising +1 text and plus marks, and the glints on a caught coin (world space, drawn over everything)
export const pops = [], glints = [];

// ---- Engine effects: drawn in world space, never in the sheets, so they survive real art replacing the placeholder ----
export const frags = [], slashes = [], cuts = [], zaps = [], rings = [], timers = [], moons = [], voids = [], mirrors = [];
// he lands inside a burst of electric smoke: dark puffs that swell and rise, and bolts swirling round him
export const smoke = [], cracks = [], debris = [], ribbons = [];
// the non-lightning elements' matter (flames, goo, drops, gusts, motes) and the floor stains it leaves
export const mats = [], stains = [];
