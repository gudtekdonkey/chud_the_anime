// ---- Swipe moves on touch (prototypes/46-combo-prompts.html, approved): a floating stick on the left 45% of the screen;
// on the rest: tap = J; swipe = a dash that way (the roll), or the lunge cut when a samurai is within 96 units and 40°
// of it; swipe up = the jump (the roll up, until the slice has a jump); hold 280 ms = charge or guard (TOUCH.onHold, for
// the skills); double tap = K, read on the second touch-down so a single tap never waits; a flick there and back = the
// parry (TOUCH.onParry: F's counter is not built); a two-finger tap = a chosen skill (TOUCH.onTwo). While a combo prompt
// is up, a tap answers J and a swipe answers its direction. `&swipe` makes the mouse a finger, to test on PC.
// Presses go in as the keys' own events, so the input buffer and every controller take them as they take keys.
import { CTX, nearestFoe } from '../ctx.js';
import { hOf, wrapA } from 'ronin-engine/flow/flow.js';
import { OBL } from 'ronin-engine/render/gfx/view.js';
import { CP, answer, readDir } from '../combo/prompts.js';
import { W } from 'ronin-engine/clock/world.js';

export const TOUCH = { stick: null, dir: null, inject: null, log: [], onHold: null, onParry: null, onTwo: null, hold: null };
const TAP = { ms: 220, px: 14 }, SWIPE = 26, HOLD = 280, DOUBLE = 260, LUNGE_R = 96, LUNGE_A = 40 * Math.PI / 180, STICK = .45;
const press = code => { dispatchEvent(new KeyboardEvent('keydown', { code })); dispatchEvent(new KeyboardEvent('keyup', { code })); };
// a screen drag (px) → a floor heading (flow.js hOf: x right, z down the screen; the floor's z is squashed by OBL.a)
const headingOf = (dx, dy) => hOf(dx, dy / OBL.a);
let lastTap = -1e9, downs = new Map();

export function initTouch(canvas, mouseToo = false) {
  const finger = e => e.pointerType === 'touch' || (mouseToo && e.pointerType === 'mouse');
  canvas.addEventListener('pointerdown', e => { if (!finger(e)) return; e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch { /* a synthetic pointer has nothing to capture */ }
    const r = canvas.getBoundingClientRect(), left = (e.clientX - r.left) / r.width < STICK, now = performance.now();
    const d = { x: e.clientX, y: e.clientY, t: now, left, max: 0, far: null, scale: r.width / 480 };
    downs.set(e.pointerId, d);
    if (downs.size === 2 && !left) { d.two = true; TOUCH.log.push('two'); if (TOUCH.onTwo) TOUCH.onTwo(); return; }
    if (left) { TOUCH.stick = d; return; }
    if (now - lastTap < DOUBLE) { lastTap = -1e9; d.double = true; gesture('double'); press('KeyK'); return; }   // K on the second touch-down
    d.holdT = setTimeout(() => { if (!d.ended && d.max < TAP.px * d.scale) { d.held = true; gesture('hold'); TOUCH.hold = d; if (TOUCH.onHold) TOUCH.onHold(true); } }, HOLD);
  }, { passive: false });
  canvas.addEventListener('pointermove', e => { const d = downs.get(e.pointerId); if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y, m = Math.hypot(dx, dy);
    if (m > d.max) { d.max = m; d.far = [dx, dy]; }
    if (d === TOUCH.stick) TOUCH.dir = m > 8 * d.scale ? headingOf(dx, dy) : null; });
  const up = e => { const d = downs.get(e.pointerId); if (!d) return; downs.delete(e.pointerId); d.ended = true; clearTimeout(d.holdT);
    if (d === TOUCH.stick) { TOUCH.stick = null; TOUCH.dir = null; return; }
    if (d.held) { TOUCH.hold = null; if (TOUCH.onHold) TOUCH.onHold(false); return; }
    if (d.two || d.double) return;
    const dt = performance.now() - d.t, dx = e.clientX - d.x, dy = e.clientY - d.y, m = Math.hypot(dx, dy), sc = d.scale;
    if (d.max > SWIPE * sc && m < d.max * .4) { gesture('parry'); if (TOUCH.onParry) TOUCH.onParry(); return; }   // there and back
    if (m > SWIPE * sc) { swipe(headingOf(dx, dy)); return; }
    if (dt < TAP.ms + HOLD && d.max < TAP.px * sc) { lastTap = performance.now(); gesture('tap'); if (CP.prompt) answer(CP.prompt.ans === 'K' ? 'K' : 'J'); else press('KeyJ'); } };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
}
function gesture(k) { TOUCH.log.push(k); }
// a swipe: answers a prompt, else the lunge cut on a samurai that way, else a dash (the roll) that way
function swipe(h) {
  const hero = CTX.hero;
  if (CP.prompt) { gesture('swipe-answer'); answer(readDir(h, CP.prompt.foe)); return; }
  const f = nearestFoe(hero.x, hero.z, LUNGE_R);
  if (f && Math.abs(wrapA(hOf(f.x - hero.x, f.z - hero.z) - h)) < LUNGE_A && !CTX.busy) { gesture('lunge'); hero.startCut('lunge', f, h); return; }
  gesture(Math.abs(wrapA(h - Math.PI)) < Math.PI / 4 ? 'jump' : 'dash');
  TOUCH.inject = { dir: h, until: W.t + .12 }; press('ShiftLeft');
}
// the direction touch asks for this step: the stick, or a swipe's dash held for the roll to read
export function touchDir() { if (TOUCH.inject && W.t > TOUCH.inject.until) TOUCH.inject = null; return TOUCH.inject ? TOUCH.inject.dir : TOUCH.dir; }
