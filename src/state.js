// ---- Shared mutable state: the player, the camera beats and every effect list ----
export const P = { x: 200, y: 180, z: 0, vz: 0, vx: 0, vy: 0, face: 1, state: 'idle', t: 0, still: 0, combo: false,
  hitDone: {}, ev: {}, inv: false, ghosts: [], dead: 0, flash: 0, struck: new Set(), charge: null, cv: null, fr: null, trem: 0,
  qi: 0, qiIdle: 0, storm: 0, aura: 0,
  gait: { walk: 40, run: 78 },   // px/s, set by his personality
  cd: {}, cdMax: {}, cdPop: {}, cdDeny: {} };  // cooldowns: seconds left, the full length, the ready glint, the refused-press blink
export const parts = [];
// reassigned from many modules, so they live on one object: screen shake, hit pause, the pale screen flash,
// and roomClear (page checkbox: treat the enemies as no threat)
export const S = { shake: 0, hitstop: 0, impact: 0, scr: { t: 0, max: 1, a: 0 }, roomClear: false };

// ---- Engine effects: drawn in world space, never in the sheets, so they survive real art replacing the placeholder ----
export const frags = [], slashes = [], cuts = [], zaps = [], rings = [], timers = [], moons = [], voids = [], mirrors = [];
// he lands inside a burst of electric smoke: dark puffs that swell and rise, and bolts swirling round him
export const smoke = [], cracks = [], debris = [];
// the non-lightning elements' matter (flames, goo, drops, gusts, motes) and the floor stains it leaves
export const mats = [], stains = [];
