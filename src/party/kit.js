import { P, INV, wear } from '../state.js';
import { ITEMS, BY_ID, SLOTS } from '../wardrobe/items.js';
import { setWeapon, WEAPONS } from '../weapons/weapons.js';
import { SHEATHED } from '../assassin/rules.js';

// ---- The party and its kits (prototypes/34-companions.html): the ronin and every companion carry the same kit, so any piece fits any of them ----
// A kit is { weapon, wear: Set of wardrobe ids (one per slot), charms }. His kit IS the game's own state: his weapon is P.weapon
// (set through setWeapon), what he wears is wear.outfit, his charms are INV.charms. INV keeps what the party shares: mon, shards,
// the quick slots. Gear nobody wears sits in the BAG; there can be several of a piece, each worn by one person.

// the weapon decides how a companion fights (their role): hand Kuro the katana and he fights as a duelist.
// kind: where they stand and whom they pick (companions.js): duel beside you, line on your side at reach, flank behind him, break into crowds
const DUEL = { name: 'DUELIST', kind: 'duel', about: 'Stays at your side and answers whoever comes at you.' },
  LINE = { name: 'HOLDS THE LINE', kind: 'line', about: 'Plants themself between you and them and keeps them at arm\'s length and more.' },
  FLANK = { name: 'FLANKER', kind: 'flank', about: 'Goes round the far side of your target and cuts from behind.' },
  BREAK = { name: 'BREAKER', kind: 'break', about: 'Wades into the thickest knot of them for the wide, heavy cut.' };
export const ROLES = {
  katana: { ...DUEL, cd: .75, speed: 1, hit: .16 }, tessen: { ...DUEL, cd: .6, speed: 1.05, hit: .12 },
  yari: { ...LINE, cd: .9, speed: .95, hit: .18 }, naginata: { ...LINE, cd: 1, speed: .95, hit: .2 }, bo: { ...LINE, cd: .8, speed: 1, hit: .16 },
  tanto: { ...FLANK, cd: .45, speed: 1.15, hit: .1 }, kusarigama: { ...FLANK, cd: .8, speed: 1.1, hit: .18 },
  nodachi: { ...BREAK, cd: 1.35, speed: .85, hit: .24 }, kanabo: { ...BREAK, cd: 1.5, speed: .8, hit: .26 }, tetsubo: { ...BREAK, cd: 1.5, speed: .8, hit: .26 },
  jitte: { ...DUEL, cd: .6, speed: 1.05, hit: .12 }, daisho: { ...DUEL, cd: .7, speed: 1, hit: .16 }, wakizashi: { ...DUEL, cd: .6, speed: 1.05, hit: .14 },
  kama: { ...FLANK, cd: .5, speed: 1.1, hit: .12 }, nunchaku: { ...FLANK, cd: .5, speed: 1.1, hit: .12 },
};
export const WEAPON_NAME = Object.fromEntries(WEAPONS.map(w => [w.id, w.name.toUpperCase()]));
// scope: 'party' works whoever wears it; 'wearer' acts on whoever wears it; 'hero' needs his skills; 'ally' needs a companion
export const CHARMS = {
  bead: { name: 'THUNDER BEAD', scope: 'party', about: 'Storm Chain jumps one more, whoever wears it.' },
  tsuba: { name: 'SPLIT TSUBA', scope: 'wearer', about: 'The wearer\'s landed hits build 25% more Qi.' },
  crane: { name: 'PAPER CRANE', scope: 'wearer', about: 'Once per area, a killing blow on the wearer leaves them at a sliver instead.' },
  knot: { name: 'SAGEO KNOT', scope: 'wearer', about: 'The wearer\'s sheath click after a kill shocks enemies nearby.' },
  mirror: { name: 'CRACKED MIRROR', scope: 'hero', about: 'Each glitch teleport leaves an afterimage that cuts once.' },
  bell: { name: 'TEMPLE BELL', scope: 'hero', about: 'Each execution gives 25% Qi.' },
  oath: { name: 'IRON OATH', scope: 'ally', about: 'Once per area the wearer steps in and takes a blow meant for you.' },
};
// paired executions: each says what a partner needs, like the solo executions' rules (assassin/rules.js), and any companion
// who meets it can join K. needs: weapons (any of), skill (they know it), item (they wear it). The owner cut the Bond Cord charm
export const PAIRED = [
  { id: 'cross', name: 'CROSSING CUT', about: 'You and the partner pass through him from both sides; he falls on the shared click.', needs: { weapons: SHEATHED } },   // a blade drawn from a scabbard
];
export const SKILLS = { spearwall: 'SPEAR WALL', shadowstep: 'SHADOW STEP', iai: 'IAI' };
export const fits = (c, ex) => { const n = ex.needs;
  return (!n.weapons || n.weapons.includes(c.kit.weapon)) && (!n.skill || c.skills.includes(n.skill)) && (!n.item || c.kit.wear.has(n.item)); };
export const pairsFor = c => PAIRED.filter(ex => fits(c, ex));

// ---- Levels: companions earn EXP and level like him (INV's 100 x level curve), but choose their own stats (owner) ----
export const STATS = { vigor: { name: 'VIG', long: 'VIGOR', about: 'Takes less from every cut.' }, edge: { name: 'EDG', long: 'EDGE', about: 'A chance for any cut to land heavy.' },
  speed: { name: 'SPD', long: 'SPEED', about: 'Moves faster.' }, focus: { name: 'FOC', long: 'FOCUS', about: 'Cuts again sooner and builds more Qi.' } };
export const expNeed = lv => 100 * lv;
const LEAN_W = { katana: { edge: 1, focus: 1, speed: 1 }, yari: { vigor: 2, focus: 1 }, tanto: { speed: 2, edge: 1 }, nodachi: { edge: 2, vigor: 1 },
  naginata: { vigor: 1, focus: 1 }, kanabo: { vigor: 2, edge: 1 }, kusarigama: { speed: 1, focus: 2 }, tessen: { focus: 2, speed: 1 }, bo: { vigor: 1, speed: 1, focus: 1 },
  tetsubo: { vigor: 2, edge: 1 }, jitte: { focus: 2, vigor: 1 }, daisho: { edge: 2, focus: 1 }, wakizashi: { edge: 1, speed: 1, focus: 1 }, kama: { speed: 2, edge: 1 }, nunchaku: { speed: 2, focus: 1 } };
const LEAN_T = { vigor: ['heavy', 'lumbering', 'soldier', 'grim', 'stoic', 'veteran', 'brawler'], speed: ['nimble', 'lightFooted', 'restless', 'twitchy', 'eager', 'shinobi', 'bouncy'],
  edge: ['menacing', 'cocky', 'duelist', 'coiled', 'wary'], focus: ['calm', 'serene', 'monk', 'scholar', 'humble', 'regal'] };
// what a companion values: their weapon's needs plus their personality
export function leaning(c) {
  const w = { vigor: 1, edge: 1, speed: 1, focus: 1 };
  for (const [k, v] of Object.entries(LEAN_W[c.kit.weapon])) w[k] += v;
  for (const [id, str] of c.traits) for (const k in LEAN_T) if (LEAN_T[k].includes(id)) w[k] += 1.5 * str;
  return w;
}
export const leansOf = c => Object.entries(leaning(c)).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => STATS[k].long);
// EXP in, levels gained out. Each point is a weighted pick, so two spearmen still grow apart
export function gainExp(c, n) {
  c.exp += n; let ups = 0;
  while (c.exp >= expNeed(c.lv)) { c.exp -= expNeed(c.lv); c.lv++; ups++;
    const w = leaning(c); let r = Math.random() * Object.values(w).reduce((a, b) => a + b, 0), pick = 'vigor';
    for (const [k, v] of Object.entries(w)) if ((r -= v) <= 0) { pick = k; break; }
    c.stats[pick]++; c.chose = pick; }
  return ups;
}
export const stat = (c, k) => c.stats ? c.stats[k] - 1 : 0;   // points above the start
export const HERO_CHARMS = 4, ALLY_CHARMS = 2, PARTY_MAX = 30;

// ---- Who: him, bound to the game's state, then the three we know by name ----
const HERO = { id: 'hero', name: 'RONIN', title: 'YOU', from: 'you', skills: [],
  get traits() { return P.personality || []; }, get lv() { return INV.lv; }, get exp() { return INV.exp; },
  kit: { get weapon() { return P.weapon; }, set weapon(w) { setWeapon(w); INV.fx.weapon = .14; }, get wear() { return wear.outfit; }, get charms() { return INV.charms; } } };
const fresh = () => ({ lv: 1, exp: 0, chose: null, stats: { vigor: 1, edge: 1, speed: 1, focus: 1 } });
const NAMED = [
  { id: 'kuro', name: 'KURO', title: 'THE OLD SPEAR', skills: ['spearwall'], traits: [['grim', 1], ['soldier', .5]], from: 'road',
    kit: { weapon: 'yari', wear: ['plates', 'obi', 'kote'], charms: ['oath', null] } },
  { id: 'suzume', name: 'SUZUME', title: 'THE SPARROW', skills: ['shadowstep'], traits: [['nimble', 1], ['restless', .5]], from: 'freed',
    kit: { weapon: 'tanto', wear: ['longscarf', 'cord', 'wraps'], charms: ['tsuba', null] } },
  { id: 'tetsu', name: 'TETSU', title: 'THE WALL', skills: [], traits: [['heavy', 1], ['lumbering', .6]], from: 'hired',
    kit: { weapon: 'nodachi', wear: ['coat', 'ragged', 'obi'], charms: [null, null] } },
];
export const ROSTER = [HERO, ...NAMED.map(c => ({ ...c, ...fresh(), kit: { ...c.kit, wear: new Set(c.kit.wear) } }))];
export const FROM = { you: '', road: 'MET ON THE ROAD', freed: 'FREED FROM THE ENEMY', hired: 'HIRED AT CAMP' };
export const BAG = { wear: ['crow', 'tattered', 'scarf', 'cape', 'wraps', 'plates'], weapons: ['katana', 'yari'], charms: ['crane', 'oath'] };
export const party = { members: ['kuro', 'suzume', 'tetsu'], order: 'follow' };   // who follows him (the rest wait at camp), and G's order
export const byId = id => ROSTER.find(c => c.id === id);
export const inParty = c => c.id === 'hero' || party.members.includes(c.id);
export const charmSlots = c => c.id === 'hero' ? HERO_CHARMS : ALLY_CHARMS;
// a 'party' charm counts whoever in the party wears it (Thunder Bead)
export const partyHas = id => ROSTER.some(c => inParty(c) && c.kit.charms.includes(id));

// ---- Everyone after the first three is made up on the spot, from the same wardrobe, weapons and traits ----
const NAMES = ['AKANE', 'BENKEI', 'CHIYO', 'DAISUKE', 'EIJI', 'FUMIKO', 'GORO', 'HANA', 'ISAMU', 'JIRO', 'KAEDE', 'MASA', 'NOBU', 'OSEN', 'RIKU', 'SABURO',
  'SHINO', 'TAKEO', 'UME', 'YASU', 'ZEN', 'HARU', 'KENJI', 'MIO', 'RYO', 'SORA', 'TORA', 'YUKI', 'KAITO', 'NAMI', 'OBORO', 'GIN', 'ISE', 'KOHAKU', 'ROKU'];
const TITLES = { duel: ['THE QUIET BLADE', 'THE DUELIST', 'THE LAST STUDENT'], line: ['THE SPEAR', 'THE GATEKEEPER', 'THE OLD SOLDIER'],
  flank: ['THE KNIFE', 'THE SHADOW', 'THE THIEF'], break: ['THE BREAKER', 'THE OX', 'THE MOUNTAIN'] };
const TRAIT_POOL = { bearing: ['stoic', 'proud', 'humble', 'hunched', 'coiled', 'slouch', 'soldier'], energy: ['lazy', 'restless', 'twitchy', 'weary', 'eager', 'heavy', 'lightFooted'],
  mood: ['calm', 'nervous', 'cocky', 'brooding', 'cheerful', 'grim', 'wary', 'melancholy', 'menacing', 'serene'],
  quirk: ['hatTipper', 'hiltFiddler', 'neckCracker', 'shoulderRoller', 'footTapper', 'sigher', 'glancer', 'knuckleCracker', 'scratcher'],
  body: ['limping', 'elder', 'lumbering', 'nimble'], discipline: ['shinobi', 'duelist', 'monk', 'brawler', 'wanderer', 'shadow', 'veteran'] };
// his straw hat and flat mantle stay his look
const NOT_FOR_ALLIES = new Set(['straw', 'mantle']);
const CHANCE = { shoulders: .4, neck: .45, back: .3, body: .7, waist: .6, hands: .5 };
const pick = a => a[Math.floor(Math.random() * a.length)];
let made = 0;
export function randomWear() {
  const out = [];
  for (const [slot, p] of Object.entries(CHANCE)) if (Math.random() < p) { const opts = ITEMS.filter(i => i.slot === slot && !NOT_FOR_ALLIES.has(i.id)); if (opts.length) out.push(pick(opts).id); }
  return out;
}
export function makeCompanion(from, wearIds = randomWear()) {
  const used = new Set(ROSTER.map(c => c.name)), name = NAMES.find(n => !used.has(n)) || 'RONIN ' + (++made);
  const weapon = pick(Object.keys(ROLES)), groups = Object.keys(TRAIT_POOL).sort(() => Math.random() - .5).slice(0, 1 + (Math.random() < .6));
  const c = { ...fresh(), id: 'c' + Math.random().toString(36).slice(2, 8), name, title: pick(TITLES[ROLES[weapon].kind]), from, skills: Math.random() < .4 ? [pick(Object.keys(SKILLS))] : [],
    traits: groups.map(gp => [pick(TRAIT_POOL[gp]), +(.5 + Math.random() * .5).toFixed(2)]), kit: { weapon, wear: new Set(wearIds), charms: [null, null] } };
  ROSTER.push(c); if (party.members.length < PARTY_MAX) party.members.push(c.id);
  return c;
}
// a companion who dies is gone for good; what they wore goes back in the bag
export function bury(c) {
  ROSTER.splice(ROSTER.indexOf(c), 1); party.members = party.members.filter(id => id !== c.id);
  BAG.wear.push(...c.kit.wear); BAG.weapons.push(c.kit.weapon); BAG.charms.push(...c.kit.charms.filter(Boolean));
}

// ---- Equipping. Each returns a short note for the kit screen, or '' ----
export const SLOT_ROWS = [{ key: 'weapon', name: 'WEAPON' }, ...SLOTS.map(([id, name]) => ({ key: id, name: name.toUpperCase() })), { key: 'charms', name: 'CHARMS' }];
export const wornIn = (c, slot) => [...c.kit.wear].find(id => BY_ID[id] && BY_ID[id].slot === slot) || null;
export function takeOff(c, slot) { const id = wornIn(c, slot); if (!id) return ''; c.kit.wear.delete(id); BAG.wear.push(id); return ''; }
// from: the person wearing it, or null for the bag
export function putOn(c, id, from) {
  let note = '';
  if (from && from !== c) { from.kit.wear.delete(id); note = 'TAKEN FROM ' + from.name; }
  else if (!from) BAG.wear.splice(BAG.wear.indexOf(id), 1);
  takeOff(c, BY_ID[id].slot); c.kit.wear.add(id);
  return note;
}
// weapons: from the bag your old one goes back in it; from someone else it is a trade, so nobody is left unarmed
export function giveWeapon(c, w, from) {
  if (from === c) return '';
  const mine = c.kit.weapon;
  if (!from) { BAG.weapons.splice(BAG.weapons.indexOf(w), 1); BAG.weapons.push(mine); c.kit.weapon = w; return ''; }
  c.kit.weapon = w; from.kit.weapon = mine;
  return from.name + ' TAKES THE ' + WEAPON_NAME[mine];
}
export function charmFits(c, id) {
  const s = CHARMS[id].scope;
  if (s === 'hero' && c.id !== 'hero') return 'ONLY THE RONIN CAN USE THIS';
  if (s === 'ally' && c.id === 'hero') return 'ONLY A COMPANION CAN USE THIS';
  return '';
}
const flashCharm = (c, i) => { if (c.id === 'hero') INV.fx.charms[i] = .14; };
// from: { who, i } when it is worn, else { bag: index }
export function putCharm(c, i, id, from) {
  const why = charmFits(c, id); if (why) return why;
  const old = c.kit.charms[i];
  if (from.who) from.who.kit.charms[from.i] = null; else BAG.charms.splice(from.bag, 1);
  if (CHARMS[old]) BAG.charms.push(old);
  c.kit.charms[i] = id; flashCharm(c, i);
  return from.who && from.who !== c ? 'TAKEN FROM ' + from.who.name : '';
}
export function dropCharm(c, i) { const id = c.kit.charms[i]; if (!CHARMS[id]) return; c.kit.charms[i] = null; BAG.charms.push(id); flashCharm(c, i); }
export function toggleParty(c) {
  if (c.id === 'hero') return '';
  const i = party.members.indexOf(c.id);
  if (i >= 0) { party.members.splice(i, 1); return c.name + ' WAITS AT CAMP'; }
  if (party.members.length >= PARTY_MAX) return 'THE PARTY IS FULL: ' + PARTY_MAX;
  party.members.push(c.id); return c.name + ' JOINS';
}
