// ---- The 3D look: Iron Ash V3 as a procedural low-poly model (ronin.js), posed from the flow's side pose (rig.js),
// drawn through the pipeline (toon bands, dither, rim light; palette and outline as the overlay sets them). It keeps
// the 3D faces page's glint rule: the brim hides his eyes at this camera, so two cyan pixels are stamped back just
// under the brim's edge whenever he faces the camera (LOOK3D.glint).
import * as THREE from 'three';
import { makeRonin } from './ronin.js';
import { applyPose } from './rig.js';
import { SH } from '../../gfx/shade.js';
import { toScreen } from '../../gfx/view.js';

export const LOOK3D = { hatTilt: 14, brim: 1, glint: 1 };   // the overlay's hat tunables (faces page: 14° tilt, the wide brim as drawn)
const _v = new THREE.Vector3(), _q = new THREE.Quaternion();

export function threeLook({ foe = false } = {}) {
  const rig = makeRonin({ foe }); let scene = null, last = null;
  return {
    kind: '3d',
    mount(s) { scene = s; s.add(rig.root); },
    show(f) {
      last = f; rig.root.position.set(Math.round(f.x * 2) / 2, f.y, Math.round(f.z * 2) / 2);
      rig.updateShear(); rig.body.rotation.y = f.yaw;
      if (rig.hat) { rig.hatTilt = LOOK3D.hatTilt * Math.PI / 180; rig.hat.scale.set(LOOK3D.brim, 1, LOOK3D.brim); }
      applyPose(rig, f.pose);
      for (const m of rig.mats) { const u = m.uniforms; u.uFlash.value = f.flash ? 1 : 0; u.uFade.value = 1 - (f.alpha ?? 1);
        u.uTint.value = f.tint ? f.tintA : 0; if (f.tint) u.uTintCol.value.set(...f.tint); }
      rig.shadow.visible = (f.alpha ?? 1) > .3;
      rig.root.updateMatrixWorld(true);
      if (f.hero && rig.hat) {   // the brim's shadow on him and on the floor (shade.js)
        SH.uHatOn.value = 1; SH.uHatInv.value.copy(rig.hat.matrixWorld).invert(); SH.uHatR.value = rig.hatR;
        SH.uKeyHat.value.copy(SH.uKey.value).transformDirection(SH.uHatInv.value);
      }
    },
    // the glint rule: an eye facing the camera gets its pixel, dropped to just under the brim when the brim covers it
    stamp(g) {
      if (!last || !rig.hat || !LOOK3D.glint || (last.alpha ?? 1) < .5) return;   // the hat's wearer only: the samurai's eyes show
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(rig.body.getWorldQuaternion(_q)); if (fwd.z < .2) return;
      let rimY = null;
      if (rig.hat) { const pts = []; for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; _v.set(Math.sin(a) * rig.hatR, -.05, Math.cos(a) * rig.hatR).applyMatrix4(rig.hat.matrixWorld); pts.push(toScreen(_v.x, _v.y, _v.z)); } rimY = pts; }
      for (const e of rig.eyes) { e.getWorldPosition(_v); const [x, y] = toScreen(_v.x, _v.y, _v.z); let gy = y;
        if (rimY) { let best = -1e9; for (const p of rimY) if (Math.abs(p[0] - x) < 2) best = Math.max(best, p[1]); if (best > gy - 1) gy = Math.max(gy, best + 1); }
        g.fillStyle = '#6ff3e4'; g.fillRect(x | 0, gy | 0, 1, 1); }
    },
    dispose() { if (scene) scene.remove(rig.root); },
    rig,
  };
}
