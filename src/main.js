// ---- Boot: build everything, wire the page, run a fixed 60 Hz update under a render per animation frame ----
import { P, wear, INV, S } from './state.js';
import { ENEMIES } from './world/enemies.js';
import { update } from './player/update.js';
import { render } from './world/render.js';
import { readInput } from './input.js';
import { fillMoveset } from './ui/moveset.js';
import { initStripTester } from './ui/strip-tester.js';
import { initPersonality } from './ui/personality.js';
import { initElementPicker } from './ui/element-picker.js';
import { initWeaponPicker } from './ui/weapon-picker.js';
import { initWardrobe } from './ui/wardrobe.js';

let last = performance.now(), acc = 0;
function frame(now) {
  acc = Math.min(acc + (now - last) / 1000, .1); last = now;
  while (acc >= 1 / 60) { acc -= 1 / 60; update(1 / 60, readInput()); }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

fillMoveset();
initStripTester();
initPersonality();
initElementPicker();
initWeaponPicker();
initWardrobe();

// a read-only debug hook for `npm run check`: in dev, or in any build opened with ?test
if (import.meta.env.DEV || new URLSearchParams(location.search).has('test')) window.__game = { P, E: ENEMIES, wear, INV, S };
