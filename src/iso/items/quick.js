// ---- The quick slots 1-4 (today's items/quick.js): each use under a second, so it never breaks a fight. The static
// bomb dashed at his feet: smoke over the whole screen for 6 s (owner), the samurai lose him and every one is open to K,
// and he glitches a few steps back. The thunder talisman: lightning on the nearest samurai, jumping once. The whetstone:
// the edge turns cyan for 20 s and his Qi builds twice as fast. The grave incense: 60% health over 1.5 s; moving or
// a hit puts it out.
import { CTX, nearestFoe } from 'ronin-engine/iso/ctx.js';
import { W, STOP } from 'ronin-engine/clock/world.js';
import { hOf, AF } from 'ronin-engine/flow/flow.js';
import { sparks, dust, ring } from 'ronin-engine/iso/fx.js';
import { shake } from 'ronin-engine/iso/gfx/view.js';
import { P, S, INV, takeQuick, heal } from './inv.js';
import { bolt, arcBolt, smoke } from './item-fx.js';
import { numAt } from '../hud/world-ui.js';

export const CLIP = { bomb: 'throw', talisman: 'raise', whetstone: 'hone', incense: 'incense' };
export const EDGE_T = 20, SMOKE_T = 6, INCENSE = { heal: .6, dur: 1.5 };
export const USE = { slot: -1, id: null, t: 0, dur: 1, fired: new Set() };
const DUR = { bomb: .5, talisman: .55, whetstone: .8, incense: .85 };
const once = (k, at) => { if (USE.fired.has(k) || USE.t < at) return false; USE.fired.add(k); return true; };
export let incense = null;   // { left, rate, taken } while the incense burns

export function useQuick(i) {
  if (USE.id || !INV.quick[i]) return false; const id = takeQuick(i); if (!id) return false;
  Object.assign(USE, { slot: i, id, t: 0, dur: DUR[id], fired: new Set() }); P.useSlot = i; if (id === 'whetstone') INV.edgeSlot = i;
  const a = CTX.hero.a; a.vt = 0; a.v = 0; a.play(CLIP[id], { rs: .001 }); CTX.busy = 'quick'; return true;
}
export function tickQuick(dt) {
  const hero = CTX.hero, a = hero.a;
  if (incense) { const moved = Math.abs(a.v) > 8 || hero.taken !== incense.taken;
    if (moved) { incense = null; } else { const n = Math.min(incense.left, INCENSE.heal / INCENSE.dur * dt); heal(n); incense.left -= n; if (incense.left <= 0) incense = null; } }
  S.smoke = Math.max(0, (S.smoke || 0) - dt);
  if (!USE.id) return; USE.t += dt; const id = USE.id;
  if (id === 'bomb') {
    if (once('boom', .26)) { const back = [-Math.sin(a.h), -Math.cos(a.h)]; dust(W, a.x, a.z, 14, { spd: 40, life: .6 }); ring(W, a.x, a.z, { r: 20 }); W.hitstop(.04); shake(1, 3 / 60);
      S.smoke = SMOKE_T; smoke(SMOKE_T); sparks(W, a.x, 16, a.z, 6, { spd: 40, spread: 6 }); a.x += back[0] * 17 / AF; a.z += back[1] * 17 / AF; a.feet.N.lock = a.feet.F.lock = 0; } }
  if (id === 'talisman') {
    if (once('hit', .3)) { const f = nearestFoe(hero.x, hero.z, 220); if (f) { bolt(f.x, f.z); f.lastBy = null; const r = f.react(2, hOf(f.x - hero.x, f.z - hero.z), 1); W.hitstop(STOP.light + .02); shake(1, 2 / 60);
      sparks(W, f.a.x, 22, f.a.z, 10, { spd: 120, spread: 6 }); numAt(f, 10, r === 'kill' ? 'big' : 'deal'); USE.t1 = f; } else bolt(hero.x + 30, hero.z); }
    if (once('jump', .42) && USE.t1) { const f = USE.t1, b = nearestFoe(f.x, f.z, 130, f); if (b) { arcBolt([f.x, 14, f.z], [b.x, 14, b.z]); b.react(1, hOf(b.x - f.x, b.z - f.z), 1); numAt(b, 10); } } }
  if (id === 'whetstone') {
    if (USE.t > .15 && USE.t < .5 && Math.random() < .5) sparks(W, a.x + Math.sin(a.h) * 10, 22, a.z + Math.cos(a.h) * 10, 1, { spd: 50, spread: 4 });
    if (once('lit', .45)) { INV.edge = EDGE_T; W.hitstop(.05); } }
  if (id === 'incense' && once('light', .4)) incense = { left: INCENSE.heal, taken: hero.taken };
  if (USE.t >= USE.dur) { USE.id = null; USE.slot = -1; P.useSlot = -1; CTX.busy = null; if (a.clip.name === CLIP[id]) a.play(id === 'whetstone' ? 'guard' : 'idle'); }
}
