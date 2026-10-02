// ---- Boot: build everything, wire the page, run a fixed 60 Hz update under a render per animation frame ----
import { P, wear, INV, S, voids } from './state.js';
import { ENEMIES } from './world/enemies.js';
import { NUMS } from './fx/numbers.js';
import { K } from './assassin/markers.js';
import { update } from './player/update.js';
import { render } from './world/render.js';
import { readInput } from './input.js';
import { fillMoveset } from './ui/moveset.js';
import { initStripTester } from './ui/strip-tester.js';
import { initPersonality } from './ui/personality.js';
import { initElementPicker } from './ui/element-picker.js';
import { initWeaponPicker } from './ui/weapon-picker.js';
import { initWardrobe } from './ui/wardrobe.js';
import { KIT } from './ui/kit-screen.js';
import { ROSTER, party } from './party/kit.js';
import { allies } from './party/companions.js';
import { PF } from './player/facing.js';
import { PAIRS, pairCandidate } from './party/paired.js';
import { tv, known } from './player/mastery.js';
import { ST } from './player/stats.js';
import { statOf } from './party/kit.js';
import { FEEL, stops } from './player/feel.js';
import { PB } from './player/blend.js';
import { B } from './player/buffer.js';
import { CAM } from './world/camera.js';
import { strideOf } from './player/locomotion.js';

let last = performance.now(), acc = 0;
function frame(now) {
  acc = Math.min(acc + (now - last) / 1000, .1); last = now;
  while (acc >= 1 / 60) { acc -= 1 / 60; const inp = readInput(); if (!KIT.open) update(1 / 60, inp); }   // the kit screen pauses the game
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
if (import.meta.env.DEV || new URLSearchParams(location.search).has('test')) window.__game = { P, PF, E: ENEMIES, N: NUMS, V: voids, wear, INV, S, K, ROSTER, party, allies, KIT, PAIRS, pairReady: () => !!pairCandidate(),
  // growth, read-only: a tree's value now, whether a key works, his stats in full and what they do
  tv, known, stat: k => statOf(ROSTER[0], k), get ST() { return Object.fromEntries(Object.entries(ST).map(([k, f]) => [k, f()])); },
  // the animation flow, read-only: its tuning, the last hit pauses, the drawn pose's blend, the input buffer, the camera, a gait's stride
  FEEL, stops, PB, B, CAM, stride: strideOf };
