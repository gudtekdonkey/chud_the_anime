// ---- The weapons a game defines: rows of data, each with its own take on every move on the base moves' keys and beats
// (poses.js), so hit timing never moves (the design rule: "every move works with every weapon, on the same timing and
// hits, but each weapon has its own poses"). A row:
//   id, name, about
//   reach   × the cut's reach and how far short of a target the cut's step stops
//   weight  { stop: × the hit-stop, shake: × the heavy hit's shake }
//   carry   hip (a saya at the left hip) · obi (through the sash) · slung (across his back) · shoulder (down his back, grip over the right shoulder)
//   ext     [behind the right hand's grip, ahead of it] in world units: the model's length, the trail's and the floor's reach
//   hands   two (both hands on it, bh rig px apart along it) or one (the left hand free, or holding its `off` weapon)
// A game hands in its rows with their grips (cuts: per move, a spec per key; null keeps the base key), where each
// rides (stow: STOW's rows, stow.js) and how each is built in 3D (models: id → put → { main, blade?, sheaths, ... },
// placed on the rig by iso/weapons/wield.js).
import { buildWeapon } from './poses.js';

export const ARSENAL = [], WEAPON = {}, STOW = {}, MODELS = {};
export function defineWeapons(rows, { cuts = {}, stow = {}, models = {} } = {}) {
  Object.assign(STOW, stow); Object.assign(MODELS, models);
  for (const w of rows) { w.len = w.ext[1] * 2;   // grip to tip in rig px (the trail's length)
    ARSENAL.push(w); WEAPON[w.id] = w; }
  for (const w of rows) buildWeapon(w, cuts[w.id]);
  return ARSENAL;
}

// equip a character (iso/char.js): the controller's side (its clips, reach, weight, trail) and the frame's `weapon`,
// which the look builds a model for. Mid-move is fine; a looping stance picks up the new weapon's pose at once
export function equip(c, id) {
  const w = WEAPON[id] || WEAPON.katana, a = c.a; c.wpn = w; c.weapon = w.id; c.wlen = w.len; a.wid = w.id === 'katana' ? null : w.id;
  const n = a.clip && a.clip.name; if (n === 'guard' || n === 'runArmed') a.play(n, { blend: .1 });
  return w;
}
