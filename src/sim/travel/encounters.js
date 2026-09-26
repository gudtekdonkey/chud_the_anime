import { zoneAt } from '../ledger.js';
import { calendar } from '../time.js';
import { stormAt } from './storms.js';
import { bandNear } from './roads.js';
import { wildDepth, wildRing } from '../wild.js';
import { voidInner } from './beasts.js';

// ---- Which encounter, how often: the chances as he crosses a zone (owner, 2026-09-26: random events while travelling) ----
// context() gathers everything a chance reads: road or wild, the region's danger and weather, its people and their enemies nearby,
// the hour and season, a band on the road, a storm, his karma, his standing with these people and any bounty on him.
// Each ENCOUNTERS row is plain: a weight from the context (0 = cannot happen here). Scenes (scenes-*.js) make and resolve them.

export const TRAVEL = {
  chance: { road: .06, wild: .045 },  // per zone crossed (about 25 real seconds), before danger and the rest
  cap: .45, gap: 2,                   // never more than this per zone; at least `gap` quiet zones between two encounters
  karmaScale: 100,                    // karma is read as karma / karmaScale, clamped to -1..1 (the crime lane's scale is open)
  stormFelt: .1,                      // stepping into a storm this strong is an encounter of its own
};

const clamp = (v, a = -1, b = 1) => Math.max(a, Math.min(b, v));
export function context(L, x, y) {
  const st = L.sys.travel, z = zoneAt(L, x, y), reg = L.regions[z.region], culture = L.cultures[reg.culture], s = st.regions[z.region];
  const cal = calendar(L.hour), p = L.actors[L.player];
  // the strongest people near here who hate this region's people: a war party could be on the road
  let enemy = null, ev = -.5;
  for (const g of L.regions) { if (g.culture === culture.id) continue; const rel = culture.relations[g.culture] ?? 0;
    if (rel < ev && Math.hypot(g.center[0] - x, g.center[1] - y) < 16) { ev = rel; enemy = g.culture; } }
  const depth = wildDepth(L, x, y), ring = wildRing(L, x, y, depth);
  const heatHere = st.heat[culture.id] || 0, heat = Object.values(st.heat).reduce((a, b) => Math.max(a, b), 0);
  return { x, y, z, region: z.region, culture, kind: culture.kind, road: z.road, cal, night: cal.night, season: cal.season,
    danger: s.danger, weather: s.weather, famine: s.famine > 0, storm: stormAt(L, x + .5, y + .5), band: bandNear(st, x, y),
    karma: clamp((p.karma || 0) / TRAVEL.karmaScale), standing: p.standing?.[culture.id] || 0, heat, heatHere,
    hunted: Object.keys(st.heat).filter(c => st.heat[c] > 0).map(Number), enemy, safe: st.safeUntil > L.hour, escort: !!st.escort,
    mon: p.money?.mon || 0, depth, ring, inner: ring === 'void' ? voidInner(L, x, y) : 0, level: p.level || 1 };
}

// the chance that crossing this zone brings anything at all
export function chanceAt(c) {
  let p = c.road ? TRAVEL.chance.road : TRAVEL.chance.wild;
  p *= .7 + c.danger;
  if (c.night) p *= 1.25;
  if (c.weather === 'fog') p *= 1.2;
  if (c.band) p += .25;                       // a band on this stretch of road finds him more often than not
  if (c.heat > 0) p += Math.min(.1, c.heat / 2000);
  if (c.safe) p *= .4;                        // walking with pilgrims
  if (c.ring === 'edge') p *= 1.3;            // the edge of the settled lands: bandit country (owner, 2026-09-26)
  if (c.ring === 'void') p *= .15;            // nobody goes into the voids: people are rare there (the creatures are beasts.js)
  return Math.min(TRAVEL.cap, p);
}

// weights: who he meets, given where and when. Numbers are starting values, open to tuning (docs/sim-travel.md has the table)
export const ENCOUNTERS = {
  // the region's outlaws: a band out on the road, or men from the nearest camp. Low karma: they take him for one of their own, and bother him less
  ambush:   { w: c => ((c.band ? 3 : 0) + c.danger ** 1.5 * (c.road ? 3 : 4)) * (c.night ? 1.6 : 1) * (c.famine ? 1.3 : 1) * (c.safe ? .3 : 1) * (1 + Math.min(0, c.karma) * .5) * (c.escort ? 1.4 : 1) * (c.ring === 'edge' ? 2.5 : c.ring === 'void' ? 0 : 1) },
  // a war party of a people who hate this region's people, crossing into it
  raiders:  { w: c => c.enemy == null ? 0 : .35 + c.danger * .4 },
  // hunters come for the bounty: on him from any people (more on their own land); guards stop him where his standing is low
  hunters:  { w: c => c.heat <= 0 ? 0 : Math.min(2.5, c.heat / 150) * (c.heatHere ? 1.5 : 1) },
  patrol:   { w: c => (c.road && (c.kind === 'clan' || c.kind === 'court') ? .3 : 0) + Math.max(0, -c.standing) * 1.5 + (c.heatHere ? .5 : 0) },
  merchant: { w: c => (c.road ? 1.2 : .25) * (c.night ? .25 : 1) * (c.kind === 'merchants' ? 1.6 : 1) * (c.famine ? .5 : 1) * (1 - c.danger * .5) },
  pilgrims: { w: c => (c.road ? .55 : .15) * (c.season === 'spring' || c.season === 'autumn' ? 1.5 : 1) * (c.kind === 'monastic' ? 2 : 1) * (c.night ? .2 : 1) },
  // the wounded ask the kind for help more (word gets round); in a dangerous region the wounded man can be bait
  wounded:  { w: c => .45 * (1 + c.danger) * (1 + Math.max(0, c.karma) * .5) },
  duelist:  { w: c => .3 * (c.kind === 'clan' || c.kind === 'rebels' ? 1.3 : 1) * (c.night ? .5 : 1) },
  funeral:  { w: c => (c.road ? .35 : .08) * (c.famine ? 2 : 1) * (c.season === 'winter' ? 1.4 : 1) },
  horse:    { w: c => (c.road ? .3 : .2) * (1 + c.danger) },
  // the weather turns on him: what the season allows, where it is not already doing it
  weather:  { w: c => c.weather === 'clear' || c.weather === 'cloud' ? .6 : .15 },
};

// in a void nobody lives and nobody travels: only a lost man, the weather or a runaway horse (the creatures are beasts.js)
const IN_VOID = new Set(['wounded', 'weather', 'horse']);
export function pickType(c, r) {
  const pairs = Object.entries(ENCOUNTERS).filter(([id]) => c.ring !== 'void' || IN_VOID.has(id)).map(([id, e]) => [id, Math.max(0, e.w(c))]).filter(([, w]) => w > 0);
  return pairs.length ? r.weighted(pairs) : null;
}
