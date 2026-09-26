import { rngFor } from './rng.js';
import { TIME, calendar } from './time.js';

// ---- The ledger: the whole world as plain data, and the clock that moves it ----
// Everything that lasts lives here and nowhere else: the world grid, regions, cultures, plots and their owners, every person,
// money, crimes, events. It is plain JSON (save.js stores it), so a server could run it later (docs/foundations.md).
// Systems (economy, people, crime, quests, events...) register with system() and are stepped by advance():
//   onHour(L, cal, rng)   every game hour, only while the ronin is playing (live), or catching up a short gap
//   onDay(L, cal, rng)    every game day, always, including catch-up after time away
//   onSeason(L, cal, rng) at the start of each season
//   onYear(L, cal, rng)   at the start of each year
// Each call gets its own seeded random stream (the system's id + the hour/day), so the same world and the same absence give the same result.
// Rule for every system: keep the ledger's shape plain (objects, arrays, strings, numbers), key everything by stable ids, and never keep
// ledger state in module variables.

export const LEDGER_VERSION = 1;
const SYSTEMS = [];
// def: { id, order (lower runs first, default 50), onHour, onDay, onSeason, onYear, init(L) (once, when a ledger is made or loaded without it) }
export function system(def) {
  const i = SYSTEMS.findIndex(s => s.id === def.id); if (i >= 0) SYSTEMS.splice(i, 1);
  SYSTEMS.push({ order: 50, ...def }); SYSTEMS.sort((a, b) => a.order - b.order);
  return def;
}
export const systems = () => SYSTEMS.slice();

// a fresh, empty ledger; worldgen.js fills it
export function createLedger(seed, realNow = Date.now()) {
  return {
    v: LEDGER_VERSION, seed: seed >>> 0,
    hour: 0, realAt: realNow,            // game hours since the world began; the real time the ledger last caught up to
    size: { w: 100, h: 100 },            // the world grid, in zones (owner, 2026-09-26)
    zones: [],                           // zones[y * w + x]: compact zone records (worldgen.js)
    regions: [], cultures: [],           // worldgen.js
    plots: {},                           // plot id "x,y:p" -> { title, holder, ... } only where it differs from the zone's default (zone.js)
    actors: {},                          // actor id -> person (actors.js); the ronin is L.player
    player: null,
    log: [],                             // recent events [{ h, type, ... }], newest last, capped
    ids: {},                             // next id per kind
    sys: {},                             // each system's own state, under its id: L.sys.economy, L.sys.crime ...
  };
}
export function initSystems(L) { for (const s of SYSTEMS) if (s.init && !L.sys[s.id]) { L.sys[s.id] = {}; s.init(L); } }

export function newId(L, kind) { const n = (L.ids[kind] || 0) + 1; L.ids[kind] = n; return kind + n; }
export const zoneAt = (L, x, y) => (x < 0 || y < 0 || x >= L.size.w || y >= L.size.h) ? null : L.zones[y * L.size.w + x];

// ---- events: every system tells the world what happened through emit(); listeners (the HUD, quests, the notice board) react ----
const LISTENERS = new Map();
export function on(type, fn) { (LISTENERS.get(type) || LISTENERS.set(type, []).get(type)).push(fn); return () => { const a = LISTENERS.get(type); a.splice(a.indexOf(fn), 1); }; }
export const LOG_CAP = 4000;
// data: anything plain; by convention { zone: [x, y], actor, region, culture } where they apply, so the world map and the quests can find it
export function emit(L, type, data = {}) {
  const e = { h: L.hour, type, ...data };
  L.log.push(e); if (L.log.length > LOG_CAP * 1.25) L.log.splice(0, L.log.length - LOG_CAP);   // trimmed in batches: a busy world emits a lot
  for (const fn of LISTENERS.get(type) || []) fn(e, L);
  for (const fn of LISTENERS.get('*') || []) fn(e, L);
  return e;
}

// ---- time ----
// catch-up budget: a long absence is lived day by day (onDay/onSeason/onYear), never hour by hour
const HOURLY_CATCHUP = 48;
export function advance(L, hours, live = false) {
  const hourly = live || hours <= HOURLY_CATCHUP;
  for (let i = 0; i < hours; i++) {
    L.hour++;
    const cal = calendar(L.hour);
    if (hourly) for (const s of SYSTEMS) if (s.onHour) s.onHour(L, cal, rngFor(L.seed, 'h', L.hour, s.id));
    if (cal.hour === 0) {
      if (cal.dayOfSeason === 1) {
        if (cal.seasonIndex === 0) for (const s of SYSTEMS) if (s.onYear) s.onYear(L, cal, rngFor(L.seed, 'y', cal.year, s.id));
        for (const s of SYSTEMS) if (s.onSeason) s.onSeason(L, cal, rngFor(L.seed, 's', cal.day, s.id));
      }
      for (const s of SYSTEMS) if (s.onDay) s.onDay(L, cal, rngFor(L.seed, 'd', cal.day, s.id));
    }
  }
}
// bring the world up to the real clock. Call it every frame while playing (live: every hour runs its onHour), and on load and on
// return to the tab (a long absence is lived day by day). Returns how many game hours were lived
export function catchUp(L, realNow = Date.now(), { live = false, maxHours = Infinity } = {}) {
  const hours = Math.min(maxHours, Math.floor((realNow - L.realAt) / TIME.REAL_MS_PER_HOUR));
  if (hours <= 0) return 0;
  advance(L, hours, live);
  L.realAt += hours * TIME.REAL_MS_PER_HOUR;
  if (hours > 1) emit(L, 'time.caughtUp', { hours });
  return hours;
}
