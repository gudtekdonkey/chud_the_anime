// ---- The pixel look: Iron Ash V3 (the refined base with the F1 menpō, FC.RF1) drawn by the pages' own 2D engine
// (engine.js, styles.js) from the same side pose, in any facing, with the body camera's A and B (view.js BODY), one
// sprite pixel to one render pixel at 2×. The sprite stands in the 3D scene as a card at his feet: its upper part
// upright (so it sorts against walls and pillars by height, as Top-Down Views' blit does), the rows under his feet
// laid on the floor; it takes the night's light, the lanterns' warmth, the fog, the flash and the silhouette like any model.
import * as THREE from 'three';
import { drawFigure, toPix } from './engine.js';
import { FC } from './styles.js';
import { SH } from '../../gfx/shade.js';
import { piece } from '../../gfx/build.js';
import { shadeMat } from '../../gfx/shade.js';
import { RAMP } from '../../gfx/palette.js';
import { BODY, OBL, U } from '../../gfx/view.js';

const BW = 96, BH = 100, BX0 = 48, BY0 = 72, CLOTH0 = { chains: [] };
const VERT = `precision highp float; uniform mat4 modelMatrix, viewMatrix, projectionMatrix; in vec3 position; in vec2 uv; out vec2 vUv; out vec3 vW;
void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const FRAG = `precision highp float; uniform sampler2D tFig; uniform vec3 uMoon, uVD; uniform vec4 uLampPos[4]; uniform vec4 uLampCol[4];
uniform float uFlash, uFade, uTint, uObj, uPx, uFog, uTime; uniform vec3 uTintCol, uFogCol; uniform vec2 uDOff;
in vec2 vUv; in vec3 vW; layout(location = 0) out vec4 oC; layout(location = 1) out vec4 oD; layout(location = 2) out vec4 oN;
float bayer(vec2 p) { ivec2 q = ivec2(mod(p, 4.)); int i = q.x + q.y * 4; int b[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5); return (float(b[i]) + .5) / 16.; }
void main() { vec4 t = texture(tFig, vUv); if (t.a < .5) discard;
  if (uFade > 0. && bayer(floor((gl_FragCoord.xy + uDOff) / uPx)) < uFade) discard;
  vec3 warm = vec3(0.); for (int i = 0; i < 4; i++) { float d = length(uLampPos[i].xyz - vW), a = clamp(1. - d / uLampPos[i].w, 0., 1.); warm += uLampCol[i].rgb * a * a * uLampCol[i].w; }
  vec3 c = t.rgb * (vec3(.8, .84, .96) + warm * .9);   // the drawing keeps its own shading; the night cools it a little, the lanterns warm it
  c = mix(c, uTintCol, uTint); if (uFlash > .5) c = vec3(1.);
  oC = vec4(c, 1.); oD = vec4(dot(uVD, vW), uObj, 1., 1.); oN = vec4(.5, 1., .5, 1.); }`;

export function pixelLook({ foe = false } = {}) {
  const S = FC.RF1, data = new Uint8Array(BW * BH * 4), tex = new THREE.DataTexture(data, BW, BH, THREE.RGBAFormat);
  tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.flipY = false; tex.needsUpdate = true;
  const mat = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
    uniforms: { tFig: { value: tex }, uMoon: SH.uMoon, uVD: SH.uVD, uLampPos: SH.uLampPos, uLampCol: SH.uLampCol, uPx: SH.uPx, uFog: SH.uFog, uTime: SH.uTime, uFogCol: SH.uFogCol, uDOff: SH.uDOff,
      uFlash: { value: 0 }, uFade: { value: 0 }, uTint: { value: 0 }, uTintCol: { value: new THREE.Vector3(1, 1, 1) }, uObj: { value: foe ? 2 : 1 } } });
  // the card: rows above the foot line stand up (a row is one render pixel of height), the rows below lie on the floor
  const geo = new THREE.BufferGeometry(), root = new THREE.Object3D();
  const rowUp = 1 / (U * OBL.b), rowFlat = 1 / (U * OBL.a), col = 1 / U, x0 = -BX0 * col, x1 = (BW - BX0) * col, vf = BY0 / BH;
  const P = [x0, BY0 * rowUp, 0, x1, BY0 * rowUp, 0, x1, 0, 0, x0, 0, 0, x0, .1, 0, x1, .1, 0, x1, .1, (BH - BY0) * rowFlat, x0, .1, (BH - BY0) * rowFlat];
  const UV = [0, 0, 1, 0, 1, vf, 0, vf, 0, vf, 1, vf, 1, 1, 0, 1];
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3)); geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(UV), 2));
  geo.setIndex([0, 3, 1, 1, 3, 2, 4, 7, 5, 5, 7, 6]);
  const card = new THREE.Mesh(geo, mat); card.frustumCulled = false; card.position.z = 1.2; card.layers.enable(1); root.add(card);
  // in the silhouette pass the card hands the shared material its picture, so the silhouette is his shape, not the card's
  card.onBeforeRender = (r, sc, c, g, m) => { if (m.uniforms && m.uniforms.uSilTex) { m.uniforms.tSil.value = tex; m.uniforms.uSilTex.value = 1; m.uniformsNeedUpdate = true; } };
  card.onAfterRender = (r, sc, c, g, m) => { if (m.uniforms && m.uniforms.uSilTex) { m.uniforms.uSilTex.value = 0; m.uniformsNeedUpdate = true; } };
  const shm = shadeMat({ obj: 3 }); shm.uniforms.uFade.value = .45;
  const shadow = piece().cyl(5.4, 5.4, .05, 14, RAMP.k[0], { p: [0, .06, 0], s: [1, 1, .62], glow: true }).mesh(shm); root.add(shadow);
  let scene = null;
  return {
    kind: 'pixel',
    mount(s) { scene = s; s.add(root); },
    show(f) {
      root.position.set(Math.round(f.x * 2) / 2, f.y, Math.round(f.z * 2) / 2);
      const pose = f.pose.blade && f.pose.blade.away ? { ...f.pose, blade: { out: 1, g: f.pose.hN || f.pose.blade.g, ang: -1.4, two: 0, vis: 0 } } : f.pose;   // the blade thrown: the vendored engine has no empty saya, so the hand keeps only the hilt
      const B = drawFigure(S, pose, CLOTH0, { a: f.yaw, p: 1, cp: BODY.B, sp: BODY.A }, { W: BW, H: BH, X0: BX0, Y0: BY0, enemy: foe ? 1 : 0 });
      data.set(toPix(B).d); tex.needsUpdate = true;
      mat.uniforms.uFlash.value = f.flash ? 1 : 0; mat.uniforms.uFade.value = 1 - (f.alpha ?? 1);
      mat.uniforms.uTint.value = f.tint ? f.tintA : 0; if (f.tint) mat.uniforms.uTintCol.value.set(...f.tint);
      shadow.visible = (f.alpha ?? 1) > .3;
    },
    stamp() {},
    dispose() { if (scene) scene.remove(root); tex.dispose(); },
  };
}
