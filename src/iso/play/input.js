// ---- Keys for the slice: WASD / arrows move (the stick maps straight to the screen), Shift or L rolls, J cuts; I O P N U C
// are the skills (skills/skills.js), and the reserved keys F R Q X (skills/reserved.js) are bound here too. A press is
// remembered 0.2 s (the owner's Q3A input buffer) until a state can take it; held keys are read each step.
const DOWN = new Set(), PRESS = [];
const MAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'roll', ShiftRight: 'roll', KeyL: 'roll', KeyJ: 'cut',
  KeyI: 'double', KeyO: 'moon', KeyP: 'rift', KeyN: 'mirror', KeyU: 'sweep', KeyC: 'breath' };   // the skills' keys (skills/skills.js)
const MOVE = new Set(['up', 'down', 'left', 'right']);
export const BUFFER = .2;
// another key the slice takes as a press (a skill): the code and the press's name
export const bindKey = (code, k) => { MAP[code] = k; };
export function initInput(target) {
  addEventListener('keydown', e => { const k = MAP[e.code]; if (!k) return; e.preventDefault(); if (!e.repeat && !MOVE.has(k)) PRESS.push({ k, age: 0 }); DOWN.add(k); });
  addEventListener('keyup', e => { const k = MAP[e.code]; if (k) DOWN.delete(k); });
  addEventListener('blur', () => DOWN.clear());
  target.addEventListener('pointerdown', () => target.focus());
}
// the stick: a screen direction (x right, z down) or null; and the remembered presses, oldest first. Read once a
// game step (1/60 s), so a press ages on the game's clock: a hit-stop or a slow frame never eats it
export function readInput() {
  const x = (DOWN.has('right') ? 1 : 0) - (DOWN.has('left') ? 1 : 0), z = (DOWN.has('down') ? 1 : 0) - (DOWN.has('up') ? 1 : 0);
  for (const p of PRESS) p.age += 1 / 60; while (PRESS.length && PRESS[0].age > BUFFER) PRESS.shift();
  return { dir: x || z ? Math.atan2(x, z) : null, presses: PRESS };
}
// a remembered press of kind k, used (and forgotten) if `take` says the state can take it now
export function consume(k, take) { const i = PRESS.findIndex(p => p.k === k); if (i < 0 || !take()) return false; PRESS.splice(i, 1); return true; }
export const pending = k => PRESS.some(p => p.k === k);
export const held = k => DOWN.has(k);   // a key still down (the skills' holds: I, O, P, C; ↓ for Seiza)
