// ---- The squad's vocabulary (owner 2026-10-02, docs/squad-ai.md): ROLES and LIBERTY per companion, and the squad
// instructions: FORMATIONS, TACTICS and ORDERS. Plain data and slot arithmetic; engine side (no drawing, no DOM), so the
// 2D game can take it as it is. Order names match the dominion lane's squad orders where they overlap
// (src/sim/dominion/data.js ORDERS: hold, charge, follow, fallback).
//
// "you can set one of your companions as a tank, so he knows his job is to attract attention and take damage from
// enemies, your ranged troops for example, are by default set to keep out of enemy range, but you can also set them to
// tank if you want.. you can set them to protect you or any other character or attempt to assassinate high value targets"
export const ROLES = {
  tank:      { name: 'Tank', icon: 'T', about: 'Draws the foes onto himself: taunts, stands in front, blocks, takes the hits.' },
  striker:   { name: 'Striker', icon: 'S', about: 'Melee damage: goes for the target the tactic names and cuts in chains.' },
  ranged:    { name: 'Ranged', icon: 'R', about: 'Keeps out of enemy reach and kites; looses from a good range.' },
  protector: { name: 'Protector', icon: 'P', about: 'Stays by his charge (you or anyone): body-blocks, intercepts, peels off attackers.' },
  assassin:  { name: 'Assassin', icon: 'A', about: 'Seeks isolated high-value targets (a leader, an archer) and executes them unobserved.' },
  support:   { name: 'Support', icon: '+', about: 'Lifts the downed and covers the hurt as they fall back.' },
};
export const ROLE_IDS = Object.keys(ROLES);
// the weapon sets the default (design notes: yari holds the line, tanto flanks, nodachi breaks; bows keep their distance)
export const ROLE_BY_WEAPON = { katana: 'striker', yari: 'tank', nodachi: 'striker', tanto: 'assassin', bow: 'ranged', bo: 'support', kanabo: 'tank', naginata: 'tank' };
export const defaultRole = wpn => ROLE_BY_WEAPON[wpn] || 'striker';

// "you can give them different liberty levels -> to achieve a task maybe he has greater freedom of movement away from you"
// the leash: how far from his anchor (you, his charge, or the point he holds) he may go to do his job
export const LIBERTY = {
  close: { name: 'Close', leash: 34 }, near: { name: 'Near', leash: 80 }, free: { name: 'Free', leash: 160 }, unbound: { name: 'Unbound', leash: 1e4 } };
export const LIBERTY_IDS = Object.keys(LIBERTY);
export const ROLE_LIBERTY = { tank: 'near', striker: 'near', ranged: 'near', protector: 'close', assassin: 'unbound', support: 'near' };

export const FORMATIONS = {
  line: { name: 'Line', about: 'A rank abreast behind you (ranks of six), facing the foe when holding.' },
  wedge: { name: 'Wedge', about: 'A V with you at its point.' },
  circle: { name: 'Circle', about: 'A ring round you (or the point held).' },
  column: { name: 'Column', about: 'Single file behind you.' },
  loose: { name: 'Loose', about: 'Spread out, room to swing and harder to sweep.' },
};
export const FORMATION_IDS = Object.keys(FORMATIONS);
export const TACTICS = {
  focus: { name: 'Focus', about: 'Everyone on your target (the one you are fighting, or the one you ordered attacked).' },
  spread: { name: 'Spread out', about: 'Each takes a different foe; no more than two on one.' },
  weakest: { name: 'Protect the weakest', about: 'Close round the most hurt of the party and cut down whoever is on him.' },
  ambush: { name: 'Ambush', about: 'Hold still and hold back until you strike; then all in.' },
};
export const TACTIC_IDS = Object.keys(TACTICS);
export const ORDERS = {
  follow: { name: 'Follow me', key: 'G', about: 'Stay in formation round you; fight within the leash.' },
  hold: { name: 'Hold', key: 'G', about: 'Hold this ground in formation; fight only what comes within the leash.' },
  charge: { name: 'Charge', about: 'All in, leash off, more aggression.' },
  fallback: { name: 'Fall back', about: 'Back behind you, away from the foe; block, do not start fights.' },
  regroup: { name: 'Regroup', about: 'Back to the formation now, whatever is happening; then follow.' },
  attack: { name: 'Attack that', about: 'Right click a foe: all of the selection on him.' },
  goto: { name: 'Go there', about: 'Right click the ground: go there in formation, then hold.' },
};
export const ORDER_IDS = ['follow', 'hold', 'charge', 'fallback', 'regroup'];

// ---- formation slots: member i of n round an anchor facing `fwd` (heading); spacing in world units.
// Ranged members are put in the rear slots by the caller (squad.js), so they stand behind the blades.
export function slotOffset(form, i, n, follow) {
  const S = 15, back = follow ? -20 : 0;
  switch (form) {
    case 'column': return [0, back - (follow ? i * 14 : (i - (n - 1) / 2) * 14)];
    case 'wedge': { const k = i + 1, side = k % 2 ? -1 : 1, rank = Math.ceil(k / 2); return follow ? [side * rank * 12, -rank * 13] : [side * rank * 12, 8 - rank * 13]; }
    case 'circle': { const ring = Math.floor(i / 8), m = Math.min(8, n - ring * 8), a = (i % 8) / m * Math.PI * 2 + (follow ? Math.PI : 0); return [Math.sin(a) * (24 + ring * 14), Math.cos(a) * (24 + ring * 14)]; }
    case 'loose': { const row = Math.floor(i / 4), m = Math.min(4, n - row * 4), j = i % 4, h = Math.sin(i * 12.9898) * 43758.5453, jit = (h - Math.floor(h)) - .5;
      return [(j - (m - 1) / 2) * 26 + jit * 8, back - row * 24 + jit * 10]; }
    default: { const row = Math.floor(i / 6), m = Math.min(6, n - row * 6), j = i % 6; return [(j - (m - 1) / 2) * S, back - row * 14]; }   // line: ranks of six
  }
}
// an offset [side, forward] round anchor a facing heading h → a world point
export function slotAt(a, h, off) { const fx = Math.sin(h), fz = Math.cos(h), sx = Math.cos(h), sz = -Math.sin(h); return { x: a.x + sx * off[0] + fx * off[1], z: a.z + sz * off[0] + fz * off[1] }; }
