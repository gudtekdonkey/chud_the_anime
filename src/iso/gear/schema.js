// ---- The gear schema (owner 2026-10-02: "200 pieces of armor … they should all be able to work with each other.
// Layers: BASE (different shirts, different pants), ARMOR (different samurai armors). Slots: head, left arm, right arm,
// left hand, right hand, feet, pants"; "mix of samurai/villager/ninja"). docs/gear.md has the whole of it.
//
// An outfit is a grid: every SLOT has a BASE piece and an ARMOUR piece over it. TORSO is the one slot added to the
// owner's list: shirts are the base layer's torso, and a samurai dō (the chest and back plates, laced round the body)
// hangs from no limb, so neither a shirt-only torso nor an arm slot can carry it.
// A piece is data: parts measured from the skeleton's bones (gear/parts.js), each in a ZONE at a SHELL. Shells nest
// inside out, so any pieces combine: a part sits on whatever the shells under it have built up in its zone, never inside
// it. A piece may HIDE zones under it (a dō hides the shirt's chest) or SHAPE them (shin guards tuck the hakama in).
import { DYES } from './palette.js';

export const SLOTS = ['head', 'torso', 'armL', 'armR', 'handL', 'handR', 'legs', 'feet'];
export const SLOT_NAME = { head: 'Head', torso: 'Torso', armL: 'Left arm', armR: 'Right arm', handL: 'Left hand', handR: 'Right hand', legs: 'Pants', feet: 'Feet' };
export const LAYERS = ['base', 'armour'];
export const LAYER_NAME = { base: 'Base', armour: 'Armour' };
export const FAMILIES = ['samurai', 'villager', 'ninja'];
// inside out: what each shell is for (a part names its own; a piece's shell is its outermost part's)
export const SHELL = { body: 0, tight: 1, shirt: 2, pants: 3, over: 4, mail: 5, plate: 6, outer: 7 };
// the zones a part can sit in. A limb zone is per side (upperL, foreR …): arm and hand pieces take their slot's side,
// a shirt's sleeves and a pair of trousers take both
export const ZONES = ['crown', 'face', 'neck', 'chest', 'belly', 'hips', 'upper', 'fore', 'hand', 'thigh', 'shin', 'foot'];
export const LIMB = { upper: 1, fore: 1, hand: 1, thigh: 1, shin: 1, foot: 1 };
// where a slot's parts may go (a shirt carries its sleeves; feet reach up the shin for gaiters and greaves)
export const REACH = {
  head: ['crown', 'face', 'neck'], torso: ['chest', 'belly', 'hips', 'neck', 'upper', 'fore'],
  armL: ['upper', 'fore'], armR: ['upper', 'fore'], handL: ['hand', 'fore'], handR: ['hand', 'fore'],
  legs: ['hips', 'thigh', 'shin'], feet: ['foot', 'shin'],
};
export const sideOf = slot => slot.endsWith('L') ? 'L' : slot.endsWith('R') ? 'R' : null;

// rarity follows the cloth's colour (Clothing: black common … a real colour very rare) and sets the stat budget
export const RARITY = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const BUDGET = [1, 2, 3, 3, 4];
// stats on the party's scale (owner pick 3A: VIG / EDG / SPD / FOC, `party/kit.js` gearStats): 'V2E1' → { vigor 2, edge 1 }
export const STAT = { V: 'vigor', E: 'edge', S: 'speed', F: 'focus' };
export const STAT_KEYS = ['vigor', 'edge', 'speed', 'focus'];
export const STAT_SHORT = { vigor: 'VIG', edge: 'EDG', speed: 'SPD', focus: 'FOC' };
export function parseStats(s) { const o = {}; for (const [, k, n] of (s || '').matchAll(/([VESF])(\d)/g)) o[STAT[k]] = (o[STAT[k]] || 0) + +n; return o; }
export const statSum = st => Object.values(st).reduce((a, b) => a + b, 0);

// a piece's rarity from its colours: the rarest cloth or dye it is painted in
export function rarityOf(pal) { let t = 0; for (const k of Object.values(pal)) t = Math.max(t, DYES[k] ? DYES[k].tier : 0); return RARITY[t]; }

// every piece is checked at load: a broken row fails loudly, never draws wrong
export function validate(p) {
  const bad = m => { throw new Error(`gear ${p.id}: ${m}`); };
  if (!SLOTS.includes(p.slot)) bad(`slot ${p.slot}`);
  if (!LAYERS.includes(p.layer)) bad(`layer ${p.layer}`);
  if (!FAMILIES.includes(p.family)) bad(`family ${p.family}`);
  if (!p.name || !p.about) bad('needs a name and an about line');
  if (!p.parts.length) bad('no parts');
  for (const k of Object.values(p.pal)) if (!DYES[k]) bad(`dye ${k}`);
  for (const q of p.parts) {
    if (q.z && !REACH[p.slot].includes(q.z)) bad(`part ${q.k} in ${q.z}, outside the ${p.slot} slot's reach`);
    if (q.sh == null || q.sh < 1 || q.sh > 7) bad(`part ${q.k} without a shell`);
    if (p.layer === 'base' && q.sh > SHELL.over) bad(`base part ${q.k} at an armour shell`);
    if (p.layer === 'armour' && q.sh < SHELL.mail && !q.trim) bad(`armour part ${q.k} under the mail shell`);
  }
  for (const z of p.hides || []) if (!ZONES.includes(z)) bad(`hides ${z}`);
  for (const z of Object.keys(p.shapes || {})) if (!ZONES.includes(z)) bad(`shapes ${z}`);
  const sum = statSum(p.stats); if (sum < 1 || sum > 4) bad(`stats sum ${sum}`);
}
