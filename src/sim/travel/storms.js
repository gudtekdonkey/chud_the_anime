import { zoneAt, emit } from '../ledger.js';

// ---- Glitch storms: the otherworld tearing through, crossing the world map over days (owner, 2026-09-26; no story behind them) ----
// Lived in onDay, so they move while he is away. Felt where they pass: shrines go dark, people glitch, time slips, strange things are
// left on the ground (residue), and his own glitch powers run stronger or wild inside one (stormEffects, read live by the game).
// L.sys.travel.storms: [{ id, x, y (zone coords, fractional), r (zones), peak, power, hdg, speed, age, life, path: [[x, y, power]],
//   regions: [ids reached], touched: ['x,y' settlements already felt] }]
// L.sys.travel.past: the last few storms, for the map's history. dark: { 'x,y': day it relights }. residue: { 'x,y': { day, n, power } }
export const STORM = {
  perDay: { spring: .14, summer: .16, autumn: .26, winter: .1 },   // about eighteen a year; autumn is storm season
  max: 6, speed: [1.2, 3.5], life: [8, 20], radius: [2.5, 6], peak: [.45, 1],
  core: .5, edge: 1.35,        // full strength inside r × core, fading to nothing at r × edge
  shrineDark: .35,             // a shrine under a storm this strong can go dark
};

// the storm's strength envelope over its life: builds fast, holds, dies slowly
const env = u => u < .25 ? ease(u / .25) : u > .7 ? ease((1 - u) / .3) : 1;
const ease = k => k * k * (3 - 2 * k);

export function stormsDay(L, st, cal, r) {
  // relight the shrines whose dark has passed, and let old residue fade
  for (const k in st.dark) if (st.dark[k] <= cal.day) { delete st.dark[k]; emit(L, 'storm.shrineLit', { zone: k.split(',').map(Number) }); }
  for (const k in st.residue) if (cal.day - st.residue[k].day > 12) delete st.residue[k];
  // a storm is born: somewhere over the land, heading anywhere
  if (st.storms.length < STORM.max && r.chance(STORM.perDay[cal.season])) {
    let z = null; for (let t = 0; t < 20 && !z; t++) { const c = L.zones[r.int(0, L.zones.length - 1)]; if (c.kind !== 'sea') z = c; }
    if (z) spawnStorm(L, { x: z.x + .5, y: z.y + .5, r: r.range(...STORM.radius), peak: r.range(...STORM.peak), hdg: r.range(0, 6.283), speed: r.range(...STORM.speed), life: r.int(...STORM.life) });
  }
  for (let i = st.storms.length - 1; i >= 0; i--) {
    const s = st.storms[i];
    // it wanders: the heading turns a little each day, the speed breathes
    s.hdg = +(s.hdg + r.range(-.45, .45)).toFixed(3);
    const v = s.speed * r.range(.7, 1.2);
    s.x = +(s.x + Math.cos(s.hdg) * v).toFixed(2); s.y = +(s.y + Math.sin(s.hdg) * v).toFixed(2); s.age++;
    shape(s);
    s.path.push([Math.floor(s.x), Math.floor(s.y), s.power]);
    if (s.age >= s.life || s.x < -3 || s.y < -3 || s.x > L.size.w + 3 || s.y > L.size.h + 3) { st.storms.splice(i, 1); fade(L, st, s); continue; }
    feel(L, st, s, cal, r);
  }
}
// a storm made on purpose (a world event from the story lane, a test): o = { x, y, r, peak, hdg, speed, life, age }; returns it
export function spawnStorm(L, o) {
  const st = L.sys.travel, day = Math.floor(L.hour / 24);
  const s = { id: 'storm' + (st.nextStorm = (st.nextStorm || 0) + 1), x: +o.x.toFixed(2), y: +o.y.toFixed(2), r0: +(o.r ?? 3).toFixed(2), r: 0, peak: +(o.peak ?? .8).toFixed(2), power: 0,
    hdg: +(o.hdg ?? 0).toFixed(3), speed: +(o.speed ?? 2).toFixed(2), age: o.age ?? 0, life: o.life ?? 10, born: day, path: [], regions: [], touched: [] };
  shape(s); st.storms.push(s);
  const z = zoneAt(L, Math.floor(s.x), Math.floor(s.y));
  emit(L, 'storm.born', { storm: s.id, zone: [Math.floor(s.x), Math.floor(s.y)], region: z ? z.region : -1, power: s.peak });
  return s;
}
function shape(s) { const e = env(s.age / s.life); s.power = +(s.peak * Math.max(.15, e)).toFixed(2); s.r = +(s.r0 * (.6 + .4 * e)).toFixed(2); }
function fade(L, st, s) {
  st.past.push({ id: s.id, born: s.born, died: s.born + s.age, peak: s.peak, path: s.path.map(([x, y]) => [x, y]), regions: s.regions });
  if (st.past.length > 12) st.past.shift();
  emit(L, 'storm.faded', { storm: s.id, zone: [Math.floor(s.x), Math.floor(s.y)], days: s.age, regions: s.regions.length });
}

// what a storm does to the ground it covers today: a bounded square of zones (at most ~120), settlements felt once per storm
function feel(L, st, s, cal, r) {
  const R = Math.ceil(s.r * STORM.edge);
  for (let y = Math.floor(s.y) - R; y <= Math.floor(s.y) + R; y++) for (let x = Math.floor(s.x) - R; x <= Math.floor(s.x) + R; x++) {
    const z = zoneAt(L, x, y); if (!z || z.kind === 'sea') continue;
    const k = strength(s, x + .5, y + .5); if (k <= 0) continue;
    if (!s.regions.includes(z.region)) { s.regions.push(z.region); emit(L, 'storm.reached', { storm: s.id, region: z.region, zone: [x, y], power: +k.toFixed(2) }); }
    const key = x + ',' + y;
    // strange things left on the ground where it was strongest: the game spawns them when he walks in (residueAt)
    if (k > .55 && z.kind === 'wild' && r.chance(.08 * k) && Object.keys(st.residue).length < 60) st.residue[key] = { day: cal.day, n: r.int(1, 3), power: +k.toFixed(2) };
    if (z.kind === 'wild' || s.touched.includes(key)) continue;
    s.touched.push(key);
    emit(L, 'storm.touched', { storm: s.id, zone: [x, y], kind: z.kind, region: z.region, power: +k.toFixed(2) });
    if (z.kind === 'shrine' && k > STORM.shrineDark && r.chance(.4 + k * .5) && !st.dark[key]) {
      st.dark[key] = cal.day + r.int(3, 10);
      emit(L, 'storm.shrineDark', { storm: s.id, zone: [x, y], region: z.region, until: st.dark[key] });
    }
    if (z.kind === 'town' || z.kind === 'village' || z.kind === 'camp' || z.kind === 'fort') {
      // people there glitch for a while (a flicker, a doubled step); a strong storm makes the place lose hours it cannot account for
      emit(L, 'storm.glitched', { storm: s.id, zone: [x, y], region: z.region, kind: z.kind, power: +k.toFixed(2) });
      if (k > .6 && r.chance(k * .4)) emit(L, 'storm.lostTime', { storm: s.id, zone: [x, y], region: z.region, hours: r.int(2, 10) });
    }
  }
}

// ---- read live ----
const strength = (s, x, y) => { const d = Math.hypot(x - s.x, y - s.y), a = s.r * STORM.core, b = s.r * STORM.edge;
  return d <= a ? s.power : d >= b ? 0 : s.power * ease(1 - (d - a) / (b - a)); };
// the strongest storm over a point (zone coords, fractional: the game passes his place inside the zone): { k 0..1, storm, dist }
export function stormAt(L, x, y) {
  let best = { k: 0, storm: null, dist: Infinity };
  for (const s of L.sys.travel.storms) { const k = strength(s, x, y), d = Math.hypot(x - s.x, y - s.y); if (k > best.k || (!best.k && d < best.dist)) best = { k, storm: s, dist: d }; }
  return best;
}
export const shrineDark = (L, x, y) => !!L.sys.travel.dark[x + ',' + y];
export const residueAt = (L, x, y) => L.sys.travel.residue[x + ',' + y] || null;
export function takeResidue(L, x, y) { const k = x + ',' + y, v = L.sys.travel.residue[k]; if (!v) return null; delete L.sys.travel.residue[k];
  emit(L, 'storm.residueTaken', { zone: [x, y], n: v.n }); return v; }

// what a storm of strength k does to the fight and to him, for the live game (k from stormAt). Plain numbers; the game decides how
//   glitch: how often a person flickers (teleports a few px, slices, doubles), per second
//   power: his glitch skills' multiplier (K's range, the slivers, Qi from hits); wild: the chance a glitch skill misfires somewhere near
//   lostTime: the chance, per zone crossed in it, that he comes out hours later than he went in
export function stormEffects(k) {
  return { k, glitch: +(k * 1.6).toFixed(2), power: +(1 + k * .6).toFixed(2), qi: +(1 + k).toFixed(2), wild: +Math.max(0, (k - .45) * .7).toFixed(2),
    lostTime: +Math.max(0, (k - .5) * .5).toFixed(2), loot: +(k * .3).toFixed(2) };
}
