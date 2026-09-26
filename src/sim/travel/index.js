import { system, on, emit, newId } from '../ledger.js';
import { rngFor } from '../rng.js';
import { initRoads, countCamps, roadsDay } from './roads.js';
import { stormsDay, stormEffects } from './storms.js';
import { TRAVEL, context, chanceAt, pickType } from './encounters.js';
import { ROAD_SCENES } from './scenes-road.js';
import { MEET_SCENES } from './scenes-meet.js';
import { BEAST_SCENES, beastChance, beastType } from './beasts.js';
import { cultName } from './kit.js';

// ---- Travel: the roads, the weather, the glitch storms, and what he meets on the way (docs/sim-travel.md) ----
// While he is away (onDay): each region's danger and weather move, outlaw bands roam out of their camps and home again, storms are born,
// cross the map and fade. While he travels (live): the game calls enterZone(L, x, y) each time he crosses into a zone; now and then it
// returns a scene (a small encounter with choices), and choose(L, choiceId, result) plays the choice out through emit().
// Import this file before generateWorld() or loadWorld(), so the system is registered when the ledger is made.
export * from './roads.js';
export * from './storms.js';
export * from './encounters.js';
export * from './beasts.js';

export const SCENES = { ...ROAD_SCENES, ...MEET_SCENES, ...BEAST_SCENES,
  // an escort that reached its town: the promised pay
  arrived: { make: (L, c) => { const e = L.sys.travel.escort;
    return { title: 'Arrived', who: [], data: { pay: e.pay, who: e.who }, choices: [{ id: 'ok', label: 'Take the pay' }], text: `${e.name} counts out ${e.pay} mon at the gate of ${e.toName}, and means every one of them.` }; },
    resolve: (L, sc) => (L.sys.travel.escort = null, { text: 'The merchant goes in to sell his goods.', mon: sc.data.pay, events: [['travel.escorted', { merchant: sc.data.who, mon: sc.data.pay }]] }) },
};

system({ id: 'travel', order: 60,
  init(L) { const st = L.sys.travel;
    Object.assign(st, { v: 1, beasts: { faced: 0, ko: 0, slain: {} }, storms: [], past: [], dark: {}, residue: {}, heat: {}, scene: null, escort: null, safeUntil: 0, quiet: 0, lastK: 0, steps: 0, met: {} });
    initRoads(L, st); },
  onDay(L, cal, r) { const st = L.sys.travel;
    roadsDay(L, st, cal, r); stormsDay(L, st, cal, r);
    if (st.escort && L.hour > st.escort.until) { emit(L, 'travel.escortFailed', { merchant: st.escort.who }); st.escort = null; } },
  onSeason(L) { countCamps(L, L.sys.travel); },
});

// ---- what we hear from the other lanes (docs/sim-travel.md: what travel reads) ----
on('econ.famine', (e, L) => { const s = L.sys.travel?.regions[e.region]; if (s) s.famine = 28; });
on('crime.bounty', (e, L) => { const st = L.sys.travel; if (!st || e.actor !== L.player || e.culture == null) return; st.heat[e.culture] = (st.heat[e.culture] || 0) + (e.mon ?? e.amount ?? 50); });
on('crime.bountyCleared', (e, L) => { const st = L.sys.travel; if (st && e.actor === L.player) delete st.heat[e.culture]; });
on('travel.bountyPaid', (e, L) => { delete L.sys.travel.heat[e.culture]; });

// ---- live ----
// he has just crossed into zone (x, y): returns a scene he is now in, or null. The scene stays in L.sys.travel.scene until chosen.
// opts.level: his character level (the live game's; kept on his record as `level`), which decides what the creatures of the voids do
export function enterZone(L, x, y, opts = {}) {
  const st = L.sys.travel; if (st.scene) return st.scene;
  st.beasts ||= { faced: 0, ko: 0, slain: {} }; if (opts.level) L.actors[L.player].level = opts.level;
  const r = rngFor(L.seed, 'travel', L.hour, x, y, st.steps++), c = context(L, x, y), k = c.storm.k;
  let type = null;
  if (st.escort && st.escort.to[0] === x && st.escort.to[1] === y) type = 'arrived';
  // a storm: stepping into it is always felt; each further zone inside it can take time from him
  else if (k > TRAVEL.stormFelt) type = st.lastK <= TRAVEL.stormFelt ? 'storm' : r.chance(stormEffects(k).lostTime) ? 'slip' : null;
  st.lastK = k;
  if (!type) { if (st.quiet > 0) { st.quiet--; return null; }
    if (r.chance(beastChance(c))) type = beastType(L, c, r);          // the voids: a creature, or its sign
    else if (!r.chance(chanceAt(c))) return null; else type = pickType(c, r); }
  return type ? open(L, type, c, r) : null;
}
// put a scene on his road now, whatever the odds (a quest, a world event, a test): returns it, or the scene he is already in
export function openScene(L, type, x, y) {
  const st = L.sys.travel; if (st.scene) return st.scene; if (!SCENES[type]) throw new Error(`no travel scene "${type}"`);
  const c = context(L, x, y); if (type === 'storm' && !c.storm.storm) return null;
  if (type === 'raiders' && c.enemy == null) return null; if (type === 'hunters' && !c.hunted.length) return null;
  return open(L, type, c, rngFor(L.seed, 'travelo', L.hour, x, y, st.steps++));
}
function open(L, type, c, r) {
  const st = L.sys.travel, made = SCENES[type].make(L, c, r), events = made.events || []; delete made.events;
  const sc = { id: newId(L, 'enc'), type, h: L.hour, zone: [c.x, c.y], region: c.region, culture: c.culture.id, ...made };
  st.scene = sc; st.quiet = TRAVEL.gap; st.met[type] = (st.met[type] || 0) + 1;
  emit(L, 'travel.encounter', { enc: sc.id, encounter: type, zone: sc.zone, region: sc.region, culture: sc.culture });
  for (const [t, d] of events) emit(L, t, { zone: sc.zone, ...d });
  return sc;
}
// he chose: play it out. result: the live game's fight result { won, slain: [actor ids] } where the choice was a fight.
// Returns the resolution (kit.js); its `hours` are for the caller to advance (advance(L, hours, true)), `next` a scene that follows at once
export function choose(L, choiceId, result) {
  const st = L.sys.travel, sc = st.scene; if (!sc || !sc.choices.some(ch => ch.id === choiceId)) return null;
  const r = rngFor(L.seed, 'travelc', sc.id, choiceId), out = SCENES[sc.type].resolve(L, sc, choiceId, r, result);
  apply(L, sc, out);
  if (out.again) { sc.choices = out.again; return out; }   // the scene goes on with new choices (the caught horse)
  st.scene = null;
  if (out.news) out.text += ' ' + news(L, sc.zone);
  emit(L, 'travel.resolved', { enc: sc.id, encounter: sc.type, choice: choiceId, zone: sc.zone, region: sc.region });
  if (out.then) out.next = open(L, out.then, context(L, ...sc.zone), r);
  return out;
}
function apply(L, sc, out) {
  const p = L.actors[L.player], at = { zone: sc.zone, region: sc.region, enc: sc.id, encounter: sc.type };
  if (out.mon) p.money.mon = Math.max(0, p.money.mon + out.mon);
  for (const id of out.fight?.slain || []) dead(L, id, L.player, sc.zone);
  for (const d of out.dead || []) dead(L, d.id, d.by, sc.zone);
  if (out.fight) emit(L, 'travel.fight', { ...at, encounter: sc.type, won: out.fight.won, foes: out.fight.foes, slain: out.fight.slain });
  // karma and standing belong to the crime lane: travel only says what he did, and who saw it
  for (const d of out.deeds || []) emit(L, 'travel.deed', { ...at, witnesses: [], standing: {}, ...d });
  for (const l of out.loot || []) emit(L, 'travel.loot', { ...at, ...l });
  if (out.hurt) emit(L, 'travel.hurt', { ...at, amount: out.hurt });
  if (out.move) p.at = out.move;   // he ran, or woke, somewhere else: the live game puts him there
  for (const [t, d] of out.events || []) emit(L, t, { ...at, ...d });
}
function dead(L, id, by, zone) {
  const a = L.actors[id]; if (!a || !a.alive) return;
  a.alive = false; a.died = L.hour;
  emit(L, 'travel.slain', { actor: id, by, zone, culture: a.culture });
}

// what the road knows: the nearest band and the nearest storm, as a traveller would say it
const DIR = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
const dirTo = (dx, dy) => DIR[(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8];
export function news(L, [x, y]) {
  const st = L.sys.travel, out = [];
  const b = st.bands.slice().sort((a, c) => Math.hypot(a.at[0] - x, a.at[1] - y) - Math.hypot(c.at[0] - x, c.at[1] - y))[0];
  if (b && Math.hypot(b.at[0] - x, b.at[1] - y) < 12) { const d = Math.round(Math.hypot(b.at[0] - x, b.at[1] - y));
    out.push(d < 1 ? `Men of ${cultName(L, b.culture)} are on this very road.` : `Men of ${cultName(L, b.culture)} are on the road ${d} zones to the ${dirTo(b.at[0] - x, b.at[1] - y)}.`); }
  const s = st.storms.slice().sort((a, c) => Math.hypot(a.x - x, a.y - y) - Math.hypot(c.x - x, c.y - y))[0];
  if (s) out.push(`The world is tearing ${Math.round(Math.hypot(s.x - x, s.y - y))} zones to the ${dirTo(s.x - x, s.y - y)}, and moving ${dirTo(Math.cos(s.hdg), Math.sin(s.hdg))}.`);
  const unsafe = st.regions.map((s2, i) => [i, s2.danger]).filter(([, d]) => d >= .6).map(([i]) => L.regions[i])
    .sort((a, c) => Math.hypot(a.center[0] - x, a.center[1] - y) - Math.hypot(c.center[0] - x, c.center[1] - y))[0];
  if (unsafe) out.push(`Nobody sane walks the roads of ${unsafe.name} just now.`);
  return out.length ? out.join(' ') : 'The roads are quiet, for once.';
}
