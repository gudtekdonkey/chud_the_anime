// ---- The game's clock and its world, as the Animation Flow page runs them (af/core.js World): the actors, the effects,
// hit-stop (everything but the shake freezes) and the events a move fires (hit, impact, click). Steps at 1/120 s.
import { FX } from '../flow/flow.js';

export const W = {
  t: 0, dt: 1 / 120, actors: [], fx: [], stop: 0, stopDur: 1, on: {}, post: [],   // post: systems stepped after the effects (gore.js)
  event(a, name) { const f = this.on[name]; if (f) f(a, this); },
  hitstop(sec) { if (sec > this.stop) this.stopDur = sec; this.stop = Math.max(this.stop, sec); },
  // one step: returns false while a hit-stop holds the world; the effects step through flow's FX hook (render/fx.js)
  step(before) {
    if (this.stop > 0) { this.stop -= this.dt; return false; }
    this.t += this.dt; if (before) before(this.dt);
    for (const a of this.actors) a.update(this.dt);
    for (const a of this.actors) if (a.after) a.after(this.dt);
    for (const a of this.actors) a.sample();
    FX.step(this, this.dt); for (const f of this.post) f(this, this.dt); return true;
  },
};
// hit-stop by weight (owner's Q6C): 3 / 5 / 8 frames at 60 fps
export const STOP = { light: 3 / 60, heavy: 5 / 60, kill: 8 / 60 };
