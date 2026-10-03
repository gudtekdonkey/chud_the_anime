// ---- The hair check's audit (scripts/check-hair.mjs): every hairstyle under every hat, on him and on the samurai,
// through a run of the flow's own moves with their springs live (idle, the start, a run that turns, the stop, the
// skid, the roll, J1 → J2 → J3, the lunge, the sheathe, the guard, the recoil, the knock, the death, the falling cut,
// the armed run). Each frame counts hair outside the hat's shells, a chain through his body and a hat through his
// body. Facing never changes these (hair, hat and chains all hang under the body's turn), so one facing is measured
// and the check renders all eight.
import { Actor } from 'ronin-engine/flow/flow.js';
import { threeLook } from '../look/three/look3d.js';
import { HAIR, HATS } from './head.js';
import { resolve } from './contract.js';

export function auditPoses(every = 6) {
  const W = { t: 0, dt: 1 / 120, fx: [], event() {} }, a = new Actor(W, { x: 0, z: 0, h: 0 }), out = [];
  const run = (sec, f) => { const n = Math.round(sec / W.dt); for (let i = 0; i < n; i++) { if (f) f(i * W.dt); a.update(W.dt); W.t += W.dt; if (i % every === 0) out.push({ name: a.clip.name, pose: a.pose }); } };
  const play = (name, sec, o = {}, f) => { try { a.play(name, o); } catch { return; } run(sec, f); };
  play('idle', .8); play('start', .2, {}, () => { a.vt = 110; }); a.v = 60;
  play('run', 1.2, {}, t => { a.vt = 110; a.ht = t > .5 ? 1.6 : 0; });
  play('stop', .4, {}, () => { a.vt = 0; }); a.v = 100; play('skid', .4, { h1: a.h + Math.PI }); a.v = 0;
  for (const m of ['roll', 'J1', 'J2', 'J3', 'lunge', 'sheathe', 'guard', 'recoil', 'knock', 'die', 'fcut']) play(m, .6);
  a.v = 90; play('runArmed', .6, {}, () => { a.vt = 90; });
  return out;
}

export function audit({ foe = false, every = 6 } = {}) {
  const poses = auditPoses(every), head = { hair: '', hat: '' }, look = threeLook({ foe, head }), rows = [];
  let total = { shell: 0, body: 0, hatBody: 0, verts: 0, frames: 0, pairs: 0, refused: 0 };
  for (const hat of HATS) for (const hair of HAIR) {
    head.hair = hair.id; head.hat = hat.id; total.pairs++;
    if (resolve(hair, hat).refused) { total.refused++; continue; }
    const r = { hair: hair.id, hat: hat.id, shell: 0, body: 0, hatBody: 0, worst: '' };
    for (const { name, pose } of poses) { look.show({ pose, x: 0, y: 0, z: 0, yaw: 0, flash: false, tint: null, tintA: 0, alpha: 1, hero: false });
      const a = look.rig.headSlot.audit(); total.frames++; total.verts += a.verts;
      if (a.shell + a.body + a.hatBody > 0 && !r.worst) r.worst = name;
      r.shell += a.shell; r.body += a.body; r.hatBody += a.hatBody; }
    total.shell += r.shell; total.body += r.body; total.hatBody += r.hatBody;
    if (r.shell + r.body + r.hatBody) rows.push(r);
  }
  look.dispose(); look.rig.headSlot.dispose();
  return { foe, poses: poses.length, ...total, bad: rows };
}
