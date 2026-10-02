import { W, H } from './config.js';
import { game } from './screen.js';
import { gestures } from './gestures.js';
import { TOUCH, queue } from './player/touch.js';
import { PT } from './player/prompts.js';
import { clickAt } from './player/click.js';
import { CAM } from './world/camera.js';

// ---- The pointer on the play surface: a finger (or pen) is the touch scheme, the mouse is click to move ----
// Fingers go through the gesture recogniser (src/gestures.js) into the step's queue (player/touch.js); the left mouse button
// sets a goal on the floor or a samurai (player/click.js), held it follows the cursor. Right click is left unbound. Only the
// canvas listens, so the page's pickers keep their mouse.
const finger = e => e.pointerType !== 'mouse';
// a point on the canvas (CSS px) to world units, through the camera's offset
export function toWorld(x, y, r = game.getBoundingClientRect()) { return [x / r.width * W + CAM.ox, y / r.height * H + CAM.oy]; }
// the fading trails of finished strokes (a finger's path stays a beat after it lifts)
export const FADES = [];
const pg = gestures(game, g => { if (g.pts && g.pts.length > 1) FADES.push({ pts: g.pts, r: g.r, t0: performance.now() }); queue(g); }, finger);
TOUCH.stick = pg.stick;
export const trails = () => pg.trails();
export const pollGestures = () => pg.poll();

let held = false;
const at = e => { const r = game.getBoundingClientRect(); return toWorld(e.clientX - r.left, e.clientY - r.top, r); };
game.addEventListener('pointerdown', e => {
  if (finger(e) || e.button !== 0) return;   // right click: unbound (the browser's own menu)
  PT.touch = false; held = true; game.setPointerCapture?.(e.pointerId); clickAt(...at(e));
});
game.addEventListener('pointermove', e => { if (!finger(e) && held && e.buttons & 1) clickAt(...at(e), true); });
for (const t of ['pointerup', 'pointercancel']) game.addEventListener(t, e => { if (!finger(e)) held = false; });
game.addEventListener('keydown', () => { PT.touch = false; });   // the prompts draw keys again
