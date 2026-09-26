import { game } from './screen.js';
import { S } from './state.js';

// ---- Input ----
export const held = new Set(), taps = new Set();
const KEYS = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down',
  j: 'slash', ' ': 'jump', Shift: 'slide', l: 'slide', k: 'tele', i: 'double', u: 'sweep', c: 'sit', x: 'die', o: 'moon', p: 'rift', n: 'mirror', v: 'walk',
  e: 'act', g: 'order', h: 'hurt', 1: 'q1', 2: 'q2', 3: 'q3', 4: 'q4' };   // E: tap = the locked-on item's verb, hold = Harvest; 1-4: quick slots; G: party hold / follow; H: cut a companion (testing)
game.addEventListener('keydown', e => { const k = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key]; if (!k) return; e.preventDefault(); if (!held.has(k)) taps.add(k); held.add(k); });
game.addEventListener('keyup', e => { const k = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key]; if (k) held.delete(k); });
game.addEventListener('blur', () => held.clear());
game.addEventListener('pointerdown', () => game.focus());
document.querySelectorAll('.pad button').forEach(b => {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', e => { e.preventDefault(); held.add(k); taps.add(k); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => held.delete(k)));
});
export function readInput() {
  const inp = { mx: (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0), my: (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0),
    slash: taps.has('slash'), jump: taps.has('jump'), slide: taps.has('slide'), tele: taps.has('tele'),
    double: taps.has('double'), sweep: taps.has('sweep'), sit: taps.has('sit'), die: taps.has('die'),
    moon: taps.has('moon'), rift: taps.has('rift'), mirror: taps.has('mirror'),
    act: taps.has('act'), order: taps.has('order'), hurt: taps.has('hurt'), quick: [1, 2, 3, 4].map(i => taps.has('q' + i)) };
  taps.clear();
  return inp;
}

document.getElementById('clear').addEventListener('change', e => { S.roomClear = e.target.checked; game.focus(); });
