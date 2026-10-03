// ---- The new skills' kit in the slice (the engine's kit, ronin-engine/iso/skills/kit.js, with this game's rows): which keys, their cooldowns, the Qi meter Time Slice spends, the power tier,
// and growth (1B: a tree per skill, filled by landed casts, gated by power; the trees are data shared with today's game,
// player/trees-reserved.js). The slice has no kit screen yet, so the page's address picks what the Tab screen would:
// `&power=1..3`, `&pick=counter:b,chain:a` (a fork, for good), `&trees` (every tree full), `&qi=0..1` (the meter at start).
import { RESERVED_TREES as TREES } from '../../player/trees-reserved.js';
import { defineKit } from 'ronin-engine/iso/skills/kit.js';

// keys, names and cooldowns (proposed, pending the owner: docs/design-notes.md). The counter's 1 s runs only after a
// stance that caught nothing (a counter gives it straight back); Time Slice also needs a full Qi meter
const ROWS = [
  { id: 'counter', key: 'F', code: 'KeyF', name: 'COUNTER', cd: 1 },
  { id: 'recall', key: 'R', code: 'KeyR', name: 'BLADE RECALL', cd: 6 },
  { id: 'chain', key: 'Q', code: 'KeyQ', name: 'LIGHTNING CHAIN', cd: 9 },
  { id: 'slice', key: 'X', code: 'KeyX', name: 'TIME SLICE', cd: 30 },
];
// power's I / II / III numbers for these skills (as player/power.js TIERS): cooldowns ×1 / .9 / .8 (PW), Lightning
// Chain's links 3 / 4 / 5 (Storm Chain's), Time Slice's zone 80 / 110 / 150 world units round him, the recall's cut 2 / 2 / 3
const TIER = { links: [3, 4, 5], zone: [80, 110, 150], recall: [2, 2, 3] };
defineKit({ skills: ROWS, trees: TREES, tier: TIER });
export * from 'ronin-engine/iso/skills/kit.js';
