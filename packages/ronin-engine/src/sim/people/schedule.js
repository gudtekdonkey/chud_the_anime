import { AGE, SCHEDULES, JOB_SCHEDULE } from '../packs/edo/people.js';
import { age } from './kin.js';
import { residents } from './settle.js';

// ---- Daily schedules, only near him (owner: the schedules only run while he is in or near their zone) ----
// Each hour he plays, everyone living in his zone and the eight around it gets actor.doing (what) and actor.where (a place in the zone:
// home, field, shop, inn, post, barracks, yard, camp, road, temple, shrine, hall, village). Off screen these go stale; nobody reads them there.
export function activity(L, a, hour) {
  const ag = age(L, a);
  let name = ag < AGE.WORK ? 'child' : ag >= 65 ? 'elder' : JOB_SCHEDULE[a.job] || 'field';
  if (name === 'watch') name = +a.id.slice(1) % 2 ? 'watchNight' : 'watchDay';       // guards change watch
  let h = hour;
  for (const [t] of a.traits) { if (t === 'lazy') h = (h + 23) % 24; else if (t === 'eager') h = (h + 1) % 24; }   // up late, or early
  const day = SCHEDULES[name];
  let seg = day[0];
  for (const s of day) if (s[0] <= h) seg = s;
  let [, what, where] = seg;
  if (what === 'rest' && a.traits.some(([t]) => t === 'drunk')) { what = 'drink'; where = 'inn'; }
  if (what === 'work' && a.needs && a.needs.food < .4) what = 'forage';                // a hungry village looks for food, not work
  return [what, where];
}
export function scheduleHour(L, cal) {
  const p = L.player && L.actors[L.player], at = p && (p.at || p.home); if (!at) return;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
    for (const a of residents(L, (at[0] + dx) + ',' + (at[1] + dy))) { if (a.id === L.player) continue; const [what, where] = activity(L, a, cal.hour); a.doing = what; a.where = where; }
}
