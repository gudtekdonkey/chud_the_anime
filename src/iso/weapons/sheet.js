// ---- ?iso&arsenal: the weapons' contact sheet, frozen, for review. Rows are weapons (&w=yari,bo,... or &w=0-4 by index,
// five a page by default); across are the moments of the loop (stowed, the draw, J1, J2, J3 at their hits, the guard,
// the armed run, the stow) in one facing (&face=0..7, 1 = SE), or, with &m=<moment>, the eight facings of one moment.
// &sweep also plays every weapon through the draw, J1 → J2 → J3 and the stow in all eight facings, off screen, through
// the 3D look, and leaves what happened in window.__arsenal for scripts/check-iso.mjs.
import * as THREE from 'three';
import { Actor, FA, CLIPS } from 'ronin-engine/flow/flow.js';
import { makeLook } from '../look/look.js';
import { piece } from 'ronin-engine/render/gfx/build.js';
import { shadeMat } from 'ronin-engine/render/gfx/shade.js';
import { RAMP } from 'ronin-engine/render/gfx/palette.js';
import { PIPE } from 'ronin-engine/render/gfx/post.js';
import { CAM, projMatrix, toScreen } from 'ronin-engine/render/gfx/view.js';
import { ARSENAL, WEAPON } from './arsenal.js';

export const MOMENTS = [['stowed', 'idle', .6], ['draw', 'J1', .12], ['J1', 'J1', .185], ['J2', 'J2', .145], ['J3', 'J3', .305], ['guard', 'guard', .5], ['run', 'runArmed', .12], ['stow', 'sheathe', .8]];
const stub = () => ({ t: 0, dt: 1 / 120, fx: [], actors: [], stop: 0, log: [], event(a, n) { this.log.push({ ev: n, clip: a.clip.name, ct: +a.ct.toFixed(4) }); } });
// a frozen pose: the clip played from its start to t, in facing yaw
function poseAt(id, clip, t, yaw) { const W = stub(), a = new Actor(W, { x: 0, z: 0, h: yaw }); a.wid = id === 'katana' ? null : id;
  if (clip === 'runArmed') a.v = a.vt = 110; a.play(clip, { blend: 0 }); const n = Math.round(t / W.dt); for (let i = 0; i <= n; i++) { W.t += W.dt; a.update(W.dt); }
  return a.pose; }
const pick = q => { if (!q) return ARSENAL.slice(0, 5).map(w => w.id); const r = q.match(/^(\d+)-(\d+)$/); if (r) return ARSENAL.slice(+r[1], +r[2] + 1).map(w => w.id);
  return q.split(',').map(s => /^\d+$/.test(s) ? ARSENAL[+s].id : s).filter(s => WEAPON[s]); };

export function runArsenal({ scene, cam, pipe, Q }) {
  scene.add(piece().box(1400, 2, 900, RAMP.n[5], { p: [240, -1, 150] }).mesh(shadeMat({ obj: 0 })));
  const aside = document.querySelector('.iso aside'); if (aside) aside.remove(); document.querySelector('.iso').style.display = 'block'; PIPE.k = +(Q.get('k') || 2);
  const cv = document.querySelector('canvas'); cv.style.width = '100%'; cv.style.height = 'auto';
  const mos = Q.has('mo') ? Q.get('mo').split(',').map(n => MOMENTS.find(x => x[0] === n)).filter(Boolean) : MOMENTS;
  const ids = pick(Q.get('w')), m = Q.get('m'), face = +(Q.get('face') ?? 1), cols = m ? FA.map((y, i) => [i, y]) : mos.map((mo, i) => [i, FA[face]]);
  const DX = 46, DZ = 44, X0 = 40, Z0 = 50, cells = [];
  ids.forEach((id, r) => cols.forEach(([c, yaw]) => { const mo = m ? MOMENTS.find(x => x[0] === m) || MOMENTS[2] : mos[c];
    const look = makeLook('3d', {}); look.mount(scene);
    cells.push({ look, frame: { pose: poseAt(id, mo[1], mo[2], yaw), x: X0 + c * DX, y: 0, z: Z0 + r * DZ, yaw, flash: false, tint: null, alpha: 1, hero: false, weapon: id } }); }));
  const center = [X0 + (cols.length - 1) * DX / 2, Z0 + (ids.length - 1) * DZ / 2 - 8], zoom = +(Q.get('zoom') || Math.min(1.25, 430 / (cols.length * DX), 230 / (ids.length * DZ)));
  PIPE.rain = 0; PIPE.fog = 0;
  const heads = m ? ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'] : mos.map(x => x[0]);
  const loop = () => { CAM.px = CAM.x = center[0]; CAM.py = CAM.z = center[1]; projMatrix(cam.projectionMatrix, center[0], center[1], zoom); cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    for (const c of cells) c.look.show(c.frame);
    const g = pipe.fx; g.clearRect(0, 0, pipe.fxCanvas.width, pipe.fxCanvas.height); g.font = '10px ui-monospace, monospace'; g.fillStyle = '#9fb3b0';
    heads.forEach((t, c) => { const [x, y] = toScreen(X0 + c * DX, 0, Z0 - DZ * .62); g.fillText(t, x - 12, y); });
    ids.forEach((id, r) => { const [x, y] = toScreen(X0 - DX * .55, 0, Z0 + r * DZ); g.fillText(WEAPON[id].name, Math.max(2, x - 40), y); });
    for (const c of cells) c.look.stamp(g);
    pipe.render(scene, cam); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  window.__iso = { ready: true, arsenal: true };
  if (Q.has('sweep')) setTimeout(() => { window.__arsenal = sweep(); }, 50);
}

// every weapon × every facing: rest, J1 (the draw), J2, J3 on their chain beats, the guard, the stow; through a 3D look
export function sweep() {
  const off = new THREE.Scene(), out = [];
  for (const w of ARSENAL) { const look = makeLook('3d', {}); look.mount(off);
    FA.forEach((yaw, f) => { const W = stub(), a = new Actor(W, { x: 0, z: 0, h: yaw }), r = { id: w.id, facing: f, errors: [], samples: 0 };
      a.wid = w.id === 'katana' ? null : w.id;
      const show = () => { const o = a.out; look.show({ pose: o.pose, x: 0, y: 0, z: 0, yaw: o.yaw, flash: false, tint: null, alpha: 1, hero: true, weapon: w.id }); r.samples++;
        const rig = look.rig, st = rig.wstate || {}, p = rig.wpnParts && rig.wpnParts.nodes[0]; if (p && ![p.position.x, p.position.y, p.position.z].every(Number.isFinite)) throw new Error('weapon at NaN');
        return { out: !!(o.pose.blade && o.pose.blade.out), main: st.main }; };
      const one = () => { W.t += W.dt; a.update(W.dt); a.sample(true); return show(); };
      const step = (until, max = 8) => { for (let i = 0; i < max * 120 && !until(); i++) { W.t += W.dt; a.update(W.dt); if (a.sample()) r.last = show(); } };
      try {
        a.play('idle'); step(() => a.ct > .3); r.rest = r.last;
        a.play('J1'); r.drawFrom = one(); step(() => W.log.some(e => e.ev === 'hit' && e.clip === 'J1')); a.sample(true); r.atHit = show();
        step(() => a.ct >= .3); a.play('J2'); step(() => a.ct >= .28); a.play('J3'); step(() => W.log.some(e => e.ev === 'impact')); a.sample(true); r.atImpact = show();
        step(() => a.clip.name === 'guard' && a.ct > .4); a.play('sheathe'); step(() => a.clip.name === 'idle' && a.ct > .3); a.sample(true); r.end = show();
      } catch (e) { r.errors.push(String(e && e.stack || e)); }
      r.events = W.log.map(e => `${e.clip}:${e.ev}@${e.ct}`).join(' ');
      out.push(r); });
    look.dispose(); }
  const beats = {}; for (const n of ['J1', 'J2', 'J3', 'lunge', 'sheathe', 'guard', 'runArmed']) beats[n] = ARSENAL.map(w => { const c = CLIPS[n + '@' + w.id] || CLIPS[n];
    return { id: w.id, dur: c.dur ?? null, ev: c.keys ? c.keys.filter(k => k.ev).map(k => `${k.ev}@${k.t}`).join(' ') : '', loop: !!c.loop }; });
  return { done: true, results: out, beats };
}
