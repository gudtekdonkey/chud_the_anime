import { P } from '../state.js';
import { ANIMS } from '../anims/anims.js';
import { POSES } from '../anims/poses.js';
import { rebake } from '../anims/sheets.js';
import { bake } from 'ronin-engine/traits/bake.js';

// ---- His personality: a list of [trait, strength] (traits/traits.js) that re-bakes how he stands, walks and runs ----
// Only these three moves take it for now; attacks, skills and stances stay exactly as drawn.
export function setPersonality(list) {
  const b = bake(list);
  for (const k of ['idle', 'walk', 'run']) { POSES[k] = b[k].poses; ANIMS[k].fps = b[k].fps; }
  POSES.idleGlitch = POSES.idle.slice(0, 16).filter((_, i) => i % 2 === 0);   // the glitch keeps its 8 frames
  for (const k of ['idle', 'idleGlitch', 'walk', 'run']) rebake(k);
  P.gait = b.speed; P.personality = list;
  if (['idle', 'idleGlitch', 'walk', 'run'].includes(P.state)) P.t = 0;   // start the new loop cleanly
  return b;
}
