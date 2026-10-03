import { P, INV } from '../state.js';
import { g } from '../screen.js';
import { pz } from 'ronin-engine/rig/pose.js';
import { makeFigure } from '../wardrobe/dress.js';
import { living } from '../world/enemies.js';
import { addMon, showBanner } from '../items/inventory.js';
import { residue } from '../fx/util.js';
import { makeCompanion, randomWear, FROM, PARTY_MAX, party } from './kit.js';
import { allies, syncParty, say, PS, newArea } from './companions.js';
import { paint, place } from './figures.js';

// ---- Recruiting, all three ways (owner): met on the road, freed from the enemy, hired at camp ----
// spots: the camp's notice board, a wanderer who walks in from the west edge, and a bound captive the samurai guard
// (a new one with every other squad). E beside one, with no item locked on, takes them on.
export const HIRE = 30, GUARD_R = 50;
const BOUND = pz({ hy: 6, lean: .3, fl: [1.3, 2.2], bl: [-.1, 2.4], fa: [-.6, .9], ba: [-.8, .8], bow: 1 });
const who = () => ({ F: makeFigure(randomWear()) });
export const spots = [{ kind: 'camp', x: 26, y: 132 }, { kind: 'road', x: 28, y: 210, t: 0, ...who() }, { kind: 'captive', x: 372, y: 200, ...who() }];
let squads = 0, wasEmpty = false;
const guarded = s => living().some(e => Math.hypot(e.x - s.x, e.y - s.y) < GUARD_R);
export function verb(s) {
  if (party.members.length >= PARTY_MAX) return 'PARTY FULL';
  if (s.kind === 'camp') return INV.mon >= HIRE ? 'HIRE ' + HIRE : 'NEED ' + HIRE + ' MON';
  if (s.kind === 'captive') return guarded(s) ? 'GUARDED' : 'FREE';
  return 'RECRUIT';
}
export const nearSpot = () => spots.find(s => s.x > 0 && Math.hypot(s.x - P.x, (s.y - P.y) * 1.4) < 22);
function recruit(s) {
  const v = verb(s); if (v !== 'RECRUIT' && v !== 'FREE' && !v.startsWith('HIRE')) return say(v);
  if (s.kind === 'camp') addMon(-HIRE);
  const c = makeCompanion(s.kind === 'camp' ? 'hired' : s.kind === 'captive' ? 'freed' : 'road', s.F ? [...s.F.outfit] : undefined);
  syncParty(); const a = allies.find(x => x.c === c); if (a) { a.x = s.x; a.y = s.y; a.px = s.x; }
  showBanner(FROM[c.from], c.name + ' JOINS', 2); residue(s.x, s.y, 4);
  if (s.kind === 'road') Object.assign(s, { x: -40, t: -8 }, who());   // another wanderer comes down the road later
  if (s.kind === 'captive') s.x = -999;                                   // the next one is marched in with a later squad
}
// E: a tap beside a spot recruits. Returns true when it took the press
export function recruitInput(inp) {
  if (!inp.act) return false;
  const s = nearSpot(); if (!s) return false;
  recruit(s); return true;
}
export function updateRecruits(dt) {
  for (const s of spots) { if (s.F) s.F.t += dt;
    if (s.kind === 'road' && s.x < 28) { s.t += dt; if (s.t > 0) s.x = Math.min(28, s.x + dt * 30); } }
  // a new squad (the room was empty, now it is not): every other one brings a captive
  const empty = !living().length;
  if (wasEmpty && !empty) newArea();
  if (wasEmpty && !empty && ++squads % 2 === 0) { const s = spots.find(q => q.kind === 'captive'); if (s.x < 0) Object.assign(s, { x: 372, y: 200 }, who()); }
  wasEmpty = empty;
}

// ---- drawing ----
function board(x, y) { g.fillStyle = '#1b1e25'; g.fillRect(x - 1, y - 14, 2, 14); g.fillRect(x + 9, y - 14, 2, 14);
  g.fillStyle = '#2c323b'; g.fillRect(x - 3, y - 20, 16, 9); g.fillStyle = '#7d868e'; g.fillRect(x - 1, y - 18, 4, 5); g.fillRect(x + 5, y - 18, 5, 3);
  g.fillStyle = 'rgba(18,22,22,.4)'; g.fillRect(x - 3, y + 1, 16, 1); }
export const recruitDrawables = () => spots.filter(s => s.x > -30).map(s => ({ y: s.y, d: () => s.kind === 'camp' ? board(s.x, s.y)
  : place(g, paint(s.F, s.kind === 'captive' ? BOUND : pz({ breath: Math.sin(PS.clock * 2) * .5 + .5, fa: [.3, .9] }), 1 / 60), s.x, s.y, 1) }));
