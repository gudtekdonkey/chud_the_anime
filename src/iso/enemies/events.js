// ---- The enemies' events, sound-ready: every telegraph, swing, hit, block, parry, guard break, dodge, vanish, shot and
// death is emitted here with who, where and which move, so a sound pass (or a camera, or the squad AI) subscribes
// instead of reaching into the enemy code. `onEnemy(fn)` returns its unsubscribe. The last 400 are kept in ELOG (the
// check reads them through window.__iso).
import { W } from 'ronin-engine/clock/world.js';

export const ELOG = [];
const subs = new Set();
export const onEnemy = fn => { subs.add(fn); return () => subs.delete(fn); };
export function emit(name, e, extra = {}) {
  const ev = { name, t: +W.t.toFixed(3), id: e ? e.id : 0, type: e ? e.kind : null, x: e ? +e.x.toFixed(1) : 0, z: e ? +e.z.toFixed(1) : 0, ...extra };
  ELOG.push(ev); if (ELOG.length > 400) ELOG.shift();
  for (const f of subs) f(ev);
  return ev;
}
// the names, for whoever wires sounds: what each one means
export const EVENT_NAMES = {
  spawn: 'an enemy enters', telegraph: 'a wind-up starts (the red flash; orange when it cannot be blocked)', commit: 'the glint just before the blow',
  swing: 'the blow comes out (hit or miss)', 'hurt-hero': 'a blow or a shot landed on the hero', whiff: 'the hero rolled through it',
  hit: 'the hero cut him', armor: 'super armour took a cut without flinching', block: 'a cut met his guard (the clang)', break: 'his guard broke',
  parry: 'he parried the hero\'s cut', dodge: 'he hopped clear', vanish: 'smoke, gone', appear: 'out of the smoke', shoot: 'an arrow or shuriken leaves',
  deflect: 'the hero cut a shot out of the air', slam: 'the ground slam lands', phase: 'the boss changes phase', flee: 'morale broke',
  regroup: 'he comes back', death: 'killed', 'hero-down': 'the hero ran out of health (refilled: the slice has no death)',
};
