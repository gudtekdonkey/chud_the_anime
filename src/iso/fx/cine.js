// ---- THE FINISHER'S CLOSE-UP (owner 2026-10-02: "attack full screen animation"): when J3 starts on a samurai in
// reach, the camera punches in on the two of them, the screen letterboxes, the courtyard gives way to ink and speed
// lines, the strike lands with its impact frames, and the camera pulls back out: ~0.8 s, anime-style. Any key press
// skips it. Presentation only: the game keeps its own clock and its hitboxes the whole time.
import { PIPE, MOMENT } from 'ronin-engine/render/gfx/post.js';

export const CINE = { on: false, t: 0, dur: .8, zoom: 1, cx: 0, cz: 0 };
const IN = .12, OUT = .2, PEAK = 3.2;
const sm = t => t * t * (3 - 2 * t);
export function startCine(hero, foe) { if (!PIPE.cine || CINE.on) return; Object.assign(CINE, { on: true, t: 0, hero, foe }); }
addEventListener('keydown', e => { if (CINE.on && CINE.t > .05 && !e.repeat) CINE.t = Math.max(CINE.t, CINE.dur - OUT); });   // skip: straight to the pull-back
// the camera's zoom and target, the ink and the bars, for this frame (dt in game time; the world's hit-stop holds it too)
export function cineStep(dt) {
  if (!CINE.on) { MOMENT.cine = 0; MOMENT.bars = 0; CINE.zoom = 1; return; }
  CINE.t += dt; const t = CINE.t, k = t < IN ? sm(t / IN) : t > CINE.dur - OUT ? sm(Math.max(0, (CINE.dur - t) / OUT)) : 1;
  CINE.zoom = 1 + (PEAK - 1) * k; MOMENT.bars = k; MOMENT.cine = Math.min(1, k * 1.15);
  const h = CINE.hero, f = CINE.foe; CINE.cx = (h.x + f.x) / 2; CINE.cz = (h.z + f.z) / 2 - 6;
  if (t >= CINE.dur) { CINE.on = false; MOMENT.cine = 0; MOMENT.bars = 0; CINE.zoom = 1; }
}
