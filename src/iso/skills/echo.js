// ---- Echoes of him: the afterimages a blink or a drop leaves, and Mirror Meditation's images, each one more of his
// LOOK (look/look.js), so they are the 3D model or the pixel drawing, whichever he is, tinted cyan and dissolving
// through the look's own dither. A pool, built on first use and parked off screen when idle; nothing here knows which
// look it holds.
import { makeLook } from '../look/look.js';
import { IDLE0 } from './moves.js';

export const CYAN = [.435, .953, .894], WHITE = [1, 1, 1];
const PARK = { pose: { ...IDLE0, hN: IDLE0.hN, hF: IDLE0.hF }, x: -9999, y: 0, z: -9999, yaw: 0, flash: false, tint: null, tintA: 0, alpha: 0, hero: false };

export function makeEchoes(scene, kind) {
  let K = kind; const pool = [];
  function take() { let e = pool.find(q => !q.busy); if (!e) { e = { look: makeLook(K, { foe: false }) }; e.look.mount(scene); pool.push(e); }
    Object.assign(e, { busy: true, frame: null, out: null, alpha: -1 }); return e; }
  const free = e => { e.busy = false; e.look.show(PARK); };
  return {
    // an afterimage: his frame `f` frozen where he was, white for `hold` s, then cyan, dissolving over `fade` s
    ghost(f, t, hold = .05, fade = .25, a0 = .75) { if (!f) return; const e = take(); e.kind = 'ghost'; e.f = { ...f, hero: false }; e.t0 = t; e.hold = hold; e.fade = fade; e.a0 = a0; return e; },
    // a mirror image: `src()` hands the frame each render ({ pose, x, y, z, yaw }), with its alpha and glitch
    image(src) { const e = take(); e.kind = 'image'; e.src = src; return e; },
    free,
    // each render: show what changed; the pixel look redraws only when its frame or its alpha moved
    render(t) {
      for (const e of pool) { if (!e.busy) continue;
        if (e.kind === 'ghost') { const u = t - e.t0; if (u > e.hold + e.fade) { free(e); continue; }
          const a = u < e.hold ? e.a0 : e.a0 * (1 - (u - e.hold) / e.fade), white = u < e.hold;
          if (Math.abs(a - e.alpha) > .06 || e.alpha < 0) { e.alpha = a; e.look.show({ ...e.f, flash: white, tint: CYAN, tintA: .7, alpha: a }); } continue; }
        const f = e.src(); if (!f) { free(e); continue; }
        if (f.pose !== e.out || Math.abs(f.alpha - e.alpha) > .06) { e.out = f.pose; e.alpha = f.alpha; e.look.show({ flash: false, tint: CYAN, tintA: .55, hero: false, ...f }); } }
    },
    stamp(g) { for (const e of pool) if (e.busy && e.look.stamp && e.kind === 'image') e.look.stamp(g); },
    // the model switch: every echo becomes the other look
    setLook(k) { K = k; for (const e of pool) e.look.dispose(); pool.length = 0; },
    get busy() { return pool.filter(e => e.busy).length; },
  };
}
