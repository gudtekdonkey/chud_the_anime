// ---- The hero's controller: the core loop on the Animation Flow page's moves (owner's flow picks): idle, the run in
// 8 directions with its start, turns, 180° skid and stop; the roll (i-frames, into a run or a cut); J1 → J2 → J3, each
// cut starting from the last's pose; a cut cancelled into the roll; run into a lunge; the blade-out guard and the
// sheathe after calm. Presses are remembered 0.2 s and fire at the first frame that can take them.
import { hOf, wrapA, AF } from '../anim/flow.js';
import { consume } from './input.js';
import { Char } from './char.js';

const snap8 = h => Math.round(h / (Math.PI / 4)) * (Math.PI / 4);
// each cut: its hit (the page's 'hit' key), when the next J chains, when it can be cancelled (hit + 2 frames), when
// moving ends it, its weight (hit-stop), its root travel (rig px) and the cut after it
export const CUT = {
  J1: { hit: .185, chain: .26, recover: .4, w: 1, travel: 4.6, next: 'J2' },
  J2: { hit: .145, chain: .24, recover: .4, w: 1, travel: 4.5, next: 'J3' },
  J3: { hit: .265, chain: .7, recover: .7, w: 3, travel: 10.2, next: 'J1' },
  lunge: { hit: .15, chain: .36, recover: .46, w: 2, travel: 13.2, next: 'J2' },
};
const ARMED = new Set(['guard', 'J1', 'J2', 'J3', 'lunge', 'runArmed', 'recoil', 'knock']);

export class Hero extends Char {
  constructor(o) { super(o); this.calm = 0; this.lastCut = null; this.lastCutEnd = -9; this.hits = 0; this.taken = 0; const a = this.a; a.play('idle'); a.update(1 / 120); a.sample(true); }
  get state() { return this.a.clip.name; }
  get armed() { const n = this.state, a = this.a; return ARMED.has(n) || (n === 'roll' && !!a.co.blade) || (n === 'sheathe' && a.ct < 1.02); }
  get iframes() { return this.state === 'roll' && this.a.ct > .03 && this.a.ct < .34; }
  control(inp, foe, t) {
    const a = this.a, n = this.state, ct = a.ct, dir = inp.dir, cut = CUT[n];
    // ---- the roll: from anything but a roll in its first part, a cut before its hit (+2 frames), or a fresh hit taken
    const canRoll = !(n === 'roll' && ct < .38) && !(cut && ct < cut.hit + 2 / 60) && !(n === 'recoil' && ct < .2) && !(n === 'knock');
    if (consume('roll', () => canRoll)) { const h = snap8(dir ?? a.h), blade = this.armed;
      a.ht = h; a.h = h; a.turnSnap = true; a.vt = 0;
      a.play('roll', { blade, dist: 50, next: x => { const d = this.dir; if (d != null) { x.v = 70; this.runTo(d, blade); } else x.play(blade ? 'guard' : 'idle'); } });
      return; }
    // ---- a cut: J1 from rest or a run, the next link in the chain's window, a lunge out of a fast run
    const chainNext = cut ? (ct >= cut.chain ? cut.next : null) : (n === 'guard' && t - this.lastCutEnd < .3 && this.lastCut ? CUT[this.lastCut].next : 'J1');
    const canCut = chainNext && !(n === 'roll' && ct < .36) && !(n === 'recoil' && ct < .3) && n !== 'knock' && !(n === 'skid' && ct < .2);
    if (consume('cut', () => canCut)) { const name = (n === 'run' || n === 'runArmed' || n === 'start') && a.v > 80 ? 'lunge' : chainNext; this.startCut(name, foe, dir); return; }
    // ---- moving: starts, steers, skids round; a cut or a roll in its recovery is ended by the stick
    const free = n === 'idle' || n === 'guard' || n === 'run' || n === 'runArmed' || n === 'start' || (n === 'stop' && ct > .2) || n === 'sheathe' || (cut && ct >= cut.recover) || (n === 'recoil' && ct > .3);
    this.dir = dir;
    if (dir != null && free) {
      if ((n === 'run' || n === 'runArmed') && a.v > 70 && Math.abs(wrapA(dir - a.h)) > 2.3) { if (!this.armed) { a.play('skid', { h1: dir, v1: 115 }); return; } }
      this.runTo(dir, this.armed);
    } else if (dir == null && (n === 'run' || n === 'start')) { a.play('stop'); a.vt = 0; }
    else if (dir == null && n === 'runArmed') { a.play('guard', { blend: .1 }); a.vt = 0; }   // blade out: settle straight into the guard
    // ---- calm with the blade out: after 2 s of stillness, the sheathe (the flick, the slide home, the click)
    if (n === 'guard' && dir == null) { this.calm += 1 / 60; if (this.calm > 2) { a.play('sheathe'); this.calm = 0; } } else this.calm = 0;
  }
  runTo(h, armed) { const a = this.a, n = a.clip.name, clip = armed ? 'runArmed' : 'run'; a.ht = h; a.vt = 110;
    if (n !== clip && n !== 'start') { if (a.v > 40 || armed) a.play(clip, { blend: .06 }); else a.play('start'); } }
  // a cut turns to the samurai in front of him (snapped to the 8 facings) and steps in to reach him, never through him
  startCut(name, foe, dir) {
    const a = this.a; let h = snap8(dir ?? a.h), rs = 1;
    if (foe && !foe.dead) { const dx = foe.a.x - a.x, dz = foe.a.z - a.z, d = Math.hypot(dx, dz), hf = hOf(dx, dz);
      if (d < 90 && (dir == null || Math.abs(wrapA(hf - h)) < 1.2)) { h = snap8(hf); rs = Math.max(.3, Math.min(2, (d - 28) / CUT[name].travel)); } }
    a.h = a.ht = h; a.turnSnap = true; a.vt = 0; a.v = name === 'lunge' ? a.v : 0;
    if (this.lastCut !== name) this.cutStart = this.a.W.t;
    this.lastCut = name;
    a.play(name, { rs, next: x => { this.lastCutEnd = x.W.t; x.play('guard'); } });
  }
  get worldR() { return this.r / AF; }
}
