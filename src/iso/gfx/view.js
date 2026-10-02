// ---- The camera: "Tall 3/4 · Sea of Stars preset · pitch 54 yaw 0 oblique zoom 1" (owner 2026-10-02), as the
// Top-Down Views page (tdv) drew it: an oblique 3/4 where the floor keeps its full depth and heights shrink with the
// pitch, and bodies are drawn a little less from above (the genre's cheat, tdv's `obl`). One world unit is one pixel of
// today's 480×270 game, drawn as 2×2 render pixels on the 960×540 target (the owner's 2× ronin, ?hd's scale).
import * as THREE from 'three';

export const VW = 960, VH = 540, U = 2;            // render target size, render pixels per world unit
const PITCH = 54 * Math.PI / 180, a0 = Math.sin(PITCH), b0 = Math.cos(PITCH), m = Math.max(a0, b0);
export const OBL = { a: a0 / m, b: b0 / m };       // screen y = a·z − b·y: the floor at full depth, heights at 0.727
export const VD = new THREE.Vector3(0, OBL.a, OBL.b).normalize();   // toward the camera: depth is VD·p, nearer is bigger
const DR = 900;                                    // depth range either side of the target

// Bodies are drawn from their own camera (the oblique cheat, an overlay choice): around his feet the screen has
// y = A·z − B·y (A how much of his top shows, B his height), while his depth (VD·p) stays the world's, so he still
// sorts against walls and pillars. Each character's root carries the shear that does this; a pixel look bakes the same
// A and B into its drawing (tdv engine's `cp` = B, `sp` = A).
//   '39.5'    the picked camera on the 3D faces page and Top-Down Views: heights as the walls', the body from 39.5° (A .6)
//   'upright' bodies at full height from a low 20° (the Sea of Stars view's tall read: heights ×1/0.727, A = tan 20°)
//   '54'      no cheat: bodies seen exactly as the floor is
export const BODY = { mode: '39.5', A: .6, B: OBL.b };
export const BODY_SHEAR = new THREE.Matrix4();
export function setBody(mode) {
  const { a, b } = OBL; BODY.mode = mode;
  Object.assign(BODY, mode === 'upright' ? { A: Math.tan(20 * Math.PI / 180), B: 1 } : mode === '54' ? { A: a, B: b } : { A: .6, B: b });
  const { A, B } = BODY, den = a * a + b * b;
  BODY_SHEAR.set(1, 0, 0, 0, 0, (b * B + a * a) / den, (a * b - b * A) / den, 0, 0, (a * b - a * B) / den, (a * A + b * b) / den, 0, 0, 0, 0, 1);
}
setBody('39.5');

// the camera: a target T in the world; the projection maps the world straight to clip space (the camera object stays at the origin)
export const CAM = { x: 240, z: 150, tx: 240, tz: 150, lx: 0, lz: 0, shake: 0, shT: 0, sx: 0, sy: 0, px: 0, py: 0, zoom: 1 };
export function projMatrix(m4, tx, tz, zoom = 1) {
  CAM.zoom = zoom;
  const sx = U * zoom / (VW / 2), sy = U * zoom / (VH / 2), { a, b } = OBL;
  m4.set(sx, 0, 0, -tx * sx,
    0, b * sy, -a * sy, a * tz * sy,
    -VD.x / DR, -VD.y / DR, -VD.z / DR, (VD.x * tx + VD.z * tz) / DR,
    0, 0, 0, 1);
  return m4;
}
// world → render pixels (the fx layer draws with this); the same numbers as the projection
export const toScreen = (x, y, z) => [VW / 2 + U * CAM.zoom * (x - CAM.px), VH / 2 + U * CAM.zoom * (OBL.a * (z - CAM.py) - OBL.b * y)];

// follow with a little lag and look-ahead, shake on top, then snapped to whole render pixels so nothing shimmers
export function follow(cam3, hero, room, dt) {
  const k = 1 - Math.exp(-5 * dt), sp = Math.hypot(hero.vx, hero.vz), la = Math.min(1, sp / 80);
  CAM.lx += ((sp > 1 ? hero.vx / sp : 0) * 14 * la - CAM.lx) * (1 - Math.exp(-3 * dt));   // look-ahead where he runs
  CAM.lz += ((sp > 1 ? hero.vz / sp : 0) * 9 * la - CAM.lz) * (1 - Math.exp(-3 * dt));
  CAM.tx = hero.x + CAM.lx; CAM.tz = hero.z + CAM.lz - 10;   // he sits a touch low: more of the courtyard in front of him
  CAM.x += (CAM.tx - CAM.x) * k; CAM.z += (CAM.tz - CAM.z) * k;
  const hw = VW / 2 / U, hh = VH / 2 / U / OBL.a;
  CAM.x = Math.max(room.x0 + hw, Math.min(room.x1 - hw, CAM.x)); CAM.z = Math.max(room.z0 + hh, Math.min(room.z1 - hh, CAM.z));
  if (CAM.shT > 0) { CAM.shT -= dt; CAM.sx = (Math.random() * 2 - 1) * CAM.shake; CAM.sy = (Math.random() * 2 - 1) * CAM.shake; } else CAM.sx = CAM.sy = 0;
  CAM.px = Math.round((CAM.x + CAM.sx) * U) / U; CAM.py = Math.round((CAM.z + CAM.sy) * U * OBL.a) / (U * OBL.a);
  projMatrix(cam3.projectionMatrix, CAM.px, CAM.py); cam3.projectionMatrixInverse.copy(cam3.projectionMatrix).invert();
}
export const shake = (amp, t) => { CAM.shake = Math.max(CAM.shT > 0 ? CAM.shake : 0, amp); CAM.shT = Math.max(CAM.shT, t); };
