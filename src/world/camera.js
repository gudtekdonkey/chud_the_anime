import { snap } from '../config.js';
import { P } from '../state.js';
import { FEEL } from '../player/feel.js';
import { TURNS } from '../player/facing.js';
import { MARGIN } from './room.js';

// ---- The camera (owner pick Q7C: it follows with a little lag and look-ahead, and shakes on heavy hits) ----
// The room is exactly one screen, so there is nothing to follow: the camera is a small offset instead, a few pixels of
// look-ahead toward where he runs or cuts, eased (the lag), in whole screen pixels, never past the room's drawn margin.
// world/render.js draws the world shifted by -CAM.ox, -CAM.oy, plus the shake.
export const CAM = { x: 0, y: 0, ox: 0, oy: 0 };
const last = { x: null, y: null };
const clamp = (v, m) => Math.max(-m, Math.min(m, v));
export function updateCamera(dt) {
  if (last.x == null) Object.assign(last, { x: P.x, y: P.y });
  const vx = (P.x - last.x) / dt, vy = (P.y - last.y) / dt; last.x = P.x; last.y = P.y;
  const C = FEEL.cam, sp = Math.hypot(vx, vy), run = Math.min(1, sp / 78);
  let tx = 0, ty = 0;
  if (P.state === 'exec' || sp > 400) { /* an execution's stage, a blink: hold where it is */ tx = CAM.x; ty = CAM.y; }
  else if (TURNS.has(P.state) || P.state === 'walk') { if (sp > 1) { tx = vx / sp * C.look * run; ty = vy / sp * C.lookY * run; } }
  else if (P.state !== 'idle' && P.state !== 'death') tx = P.face * C.attack;   // a cut, a skill, a stance: toward the way he faces
  const k = 1 - Math.exp(-C.ease * dt);
  CAM.x += (tx - CAM.x) * k; CAM.y += (ty - CAM.y) * k;
  const m = MARGIN - 6;   // room for the biggest shake (4 px) and a pixel to spare
  CAM.ox = clamp(snap(CAM.x), m); CAM.oy = clamp(snap(CAM.y), m);
}
