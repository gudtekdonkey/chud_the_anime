import { P } from '../state.js';
import { SHEETS, placeholderSheet } from '../anims/sheets.js';
import { POSES } from '../anims/poses.js';
import { KATANA_ART } from './katana.js';
import { YARI } from './yari.js';
import { NODACHI } from './nodachi.js';
import { TANTO } from './tanto.js';

// ---- Weapons: every move exists for every weapon, on the same timeline and hits; each weapon brings its own poses and art ----
// a weapon: { id, name, about, art (drawing hooks, see katana.js), poses: { anim: frames } that replace the katana's,
//   adapt(pose, anim, i) for every other frame, reach (x the melee hit's distance and radius), weight { stop, shake } (x the hit pause and shake) }.
// Its frames must match the katana's count, so timing and hit beats never move.
const KATANA = { id: 'katana', name: 'Katana', about: 'The sheathed blade at his hip: quick draw, clean arcs, the slow resheathe.', art: KATANA_ART, poses: {},
  reach: 1, weight: { stop: 1, shake: 1 } };
export const WEAPONS = [KATANA, YARI, NODACHI, TANTO];
export const weapon = () => WEAPONS.find(w => w.id === P.weapon) || KATANA;

export function framesFor(w, name) {
  const base = POSES[name]; if (!base) return undefined;   // the hand-drawn sit rows take the art alone
  if (w === KATANA) return base;
  const own = w.poses[name], out = (own || base.map((p, i) => p && (w.adapt ? w.adapt(p, name, i) : p))).map(p => p && { ...p, wp: w.art });
  if (out.length !== base.length) throw new Error(`${w.id} ${name}: ${out.length} frames, the katana has ${base.length}`);
  return out;
}
// baked once per weapon on first equip; a dropped-in strip stays with the weapon it was dropped on
const BAKED = { katana: { ...SHEETS } };
function equip(id) {
  const w = WEAPONS.find(v => v.id === id); if (!w) return;
  BAKED[weapon().id] = { ...SHEETS };
  if (!BAKED[id]) { BAKED[id] = {}; for (const k in SHEETS) BAKED[id][k] = placeholderSheet(k, framesFor(w, k), w.art); }
  Object.assign(SHEETS, BAKED[id]);
  P.weapon = id;
}
// the API for pickups and the inventory: setWeapon('nodachi') equips at once, mid-move is fine; returns false for an unknown id
export const setWeapon = id => WEAPONS.some(w => w.id === id) && (equip(id), true);
// melee reach, scaled by the weapon: [distance ahead, radius]
export const reach = (d, r) => [d * weapon().reach, r * weapon().reach];
