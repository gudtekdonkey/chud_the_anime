// ---- ?iso&sheet: a contact sheet for review: rows of moments from the core loop (each a clip at a time), the eight
// facings across, in the room's light, through the same pipeline and the look picked (&look=pixel). Frozen, so a
// screenshot shows exactly what each facing draws; &foe draws the samurai, &outfit=<preset> dresses them (gear/).
import { Actor, CLIPS, FA } from './anim/flow.js';
import { makeLook } from './look/look.js';
import { params } from './hair/nav.js';

export const SHEET_ROWS = [['idle', .6], ['run', .1], ['run', .35], ['J1', .185], ['J2', .145], ['J3', .265], ['roll', .2], ['guard', .5]];
export function buildSheet(scene, foe, rows = SHEET_ROWS.slice(0, 4), outfit = null) {
  const W = { t: 0, dt: 1 / 120, fx: [], event() {} }, cells = [];
  rows.forEach(([clip, t], r) => FA.forEach((yaw, c) => {
    const a = new Actor(W, { x: 0, z: 0, h: yaw, foe: foe ? 1 : 0 }); a.v = clip === 'run' ? 110 : 0; a.vt = a.v;
    a.play(clip, { blend: 0 }); const n = Math.round(t / W.dt); for (let i = 0; i < n; i++) a.update(W.dt); a.update(W.dt); a.x = a.z = 0; a.h = yaw;
    const look = makeLook(params().get('look') === 'pixel' ? 'pixel' : '3d', { foe, outfit }); look.mount(scene);
    cells.push({ look, frame: { pose: a.pose, x: 60 + c * 34, y: 0, z: 40 + r * 34, yaw, flash: false, tint: null, alpha: 1, hero: false } });
  }));
  return { cells, center: [60 + 3.5 * 34, 40 + (rows.length - 1) * 17 - 6], show() { for (const c of cells) c.look.show(c.frame); }, stamp(g) { for (const c of cells) c.look.stamp(g); } };
}
export { CLIPS };
