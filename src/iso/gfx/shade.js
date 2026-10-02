// ---- The material every 3D thing is drawn with: the pipeline's first steps happen here, per pixel of the low-res target.
// Toon: the moonlight (key, from above and in front), the lanterns and the cool rim are each cut into a few bands.
// Dither: a 4×4 Bayer pattern, anchored to the world, breaks each band edge. Then three targets are written for the post
// pass: the colour, the data (depth, object, part) the outline reads, and the normal.
import * as THREE from 'three';
import { VD } from './view.js';
import { hex } from './palette.js';

const v3 = h => new THREE.Vector3(...hex(h));
// shared by every material: the lights and the pipeline's toggles (the overlay flips them). The light is the 3D faces
// page's (owner: "this style … is the best"): one key from above, in front, from his right; a floor bounce from below;
// a cool rim from behind; the hat's brim really shadows his face, his shoulders and the floor. Here the key is the moon,
// and the lanterns add warm pools (The Last Night).
export const SH = {
  uKey: { value: new THREE.Vector3(-.55, .85, .8).normalize() }, uFill: { value: new THREE.Vector3(0, -.45, 1).normalize() },
  uRimDir: { value: new THREE.Vector3(.75, .35, -.8).normalize() }, uRimCol: { value: v3('#97a3ae') }, uMoon: { value: v3('#97a1c0') },
  uView: { value: VD.clone() }, uVD: { value: VD.clone() },
  uLampPos: { value: Array.from({ length: 4 }, () => new THREE.Vector4(0, -999, 0, 1)) },
  uLampCol: { value: Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, 0, 0)) },
  uToon: { value: 1 }, uDither: { value: 1 }, uBands: { value: 4 }, uRimOn: { value: 1 }, uFog: { value: 1 }, uTime: { value: 0 }, uDOff: { value: new THREE.Vector2() }, uPx: { value: 1 },
  uFogCol: { value: v3('#4a5670') },
  uHatOn: { value: 0 }, uHatInv: { value: new THREE.Matrix4() }, uHatR: { value: 9.5 }, uKeyHat: { value: new THREE.Vector3(0, 1, 0) },
};

const VERT = /* glsl */`
precision highp float;
uniform mat4 modelMatrix, viewMatrix, projectionMatrix; uniform mat3 normalMatrix;
in vec3 position; in vec3 normal; in vec4 color; in float part;
out vec3 vW; out vec3 vN; out vec4 vC; flat out float vPart;
void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(normalMatrix * normal); vC = color; vPart = part;
  gl_Position = projectionMatrix * viewMatrix * w; }`;

const FRAG = /* glsl */`
precision highp float;
uniform vec3 uKey, uFill, uRimDir, uRimCol, uMoon, uView, uVD, uFogCol, uKeyHat;
uniform vec4 uLampPos[4]; uniform vec4 uLampCol[4]; uniform mat4 uHatInv;
uniform float uToon, uDither, uBands, uRimOn, uFog, uTime, uPx, uHatOn, uHatR; uniform vec2 uDOff;
uniform float uFlash, uObj, uFade, uFloor, uRim, uTint, uSelf; uniform vec3 uTintCol;
in vec3 vW; in vec3 vN; in vec4 vC; flat in float vPart;
layout(location = 0) out vec4 oC; layout(location = 1) out vec4 oD; layout(location = 2) out vec4 oN;
float bayer(vec2 p) { ivec2 q = ivec2(mod(p, 4.)); int i = q.x + q.y * 4;
  int b[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5); return (float(b[i]) + .5) / 16.; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
// the faces page's bands: v cut into n, the top 45% of each band dithered up into the next
float band(float v, float b) { if (uToon < .5) return v; float n = uBands, vv = v * n, k = floor(vv), fr = vv - k;
  if (uDither > .5 && fr > .55 && b < (fr - .55) / .45) k += 1.; return min(k, n - 1.) / (n - 1.); }
// the courtyard's ground: raked gravel (fine speckle, the rake's lines running east-west, curling round the tōrō) and a
// path of flat stones from the gate down the yard and across to the engawa; puddles sit dark and catch the lanterns
vec3 ground(vec3 base, vec2 p, inout float wet) {
  float path = max(step(abs(p.x - 300.), 20.) * step(p.y, 300.), step(abs(p.y - 140.), 15.) * step(300., p.x) * step(p.x, 470.));
  vec3 c;
  if (path > .5) { float row = floor(p.y / 13.); vec2 q = vec2(p.x + hash(vec2(row, 3.)) * 11., p.y);
    float tw = 13. + floor(hash(vec2(row, 5.)) * 5.); vec2 cell = floor(q / vec2(tw, 13.)), f = fract(q / vec2(tw, 13.)) * vec2(tw, 13.);
    float edge = min(min(f.x, tw - f.x), min(f.y, 13. - f.y)), h = hash(cell);
    c = base * 1.25 * (.92 + .14 * h); if (edge < .5) c = base * .55;
    else if (hash(cell + 7.) > .8 && abs(f.x - tw * .5 - (f.y - 6.) * (hash(cell + 2.) - .5) * 1.4) < .35 && f.y > 2.) c *= .8; }
  else { float d = length(p - vec2(170., 150.)), rake = d < 34. ? d : p.y;   // the rake's lines ring the tōrō
    c = base * (.86 + .16 * hash(floor(p * 2.))); if (mod(rake, 3.2) < .6) c *= .8;
    if (noise(p * .05) > .72 && noise(p * .3) > .4) c = mix(c, vec3(.11, .14, .1), .5); }    // moss in the shade
  float pud = noise(p * .045 + 3.1); if (pud > .7) { wet = 1.; c *= .55; }
  return c;
}
void main() {
  vec2 px = floor((gl_FragCoord.xy + uDOff) / 1.); float bz = bayer(px);
  if (uFade > 0. && bayer(floor((gl_FragCoord.xy + uDOff) / uPx)) < uFade) discard;   // dissolve (the roof cut away, a body fading)
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 base = vC.rgb; float wet = 0.;
  if (uFloor > .5) base = ground(base, vW.xz, wet);
  vec3 col;
  if (vC.a < .5) col = base;                           // emissive: the eyes, the blade's steel, lantern paper
  else {
    float sh = 1.;                                     // the brim's shadow: the key ray from here meets the hat's disc
    if (uHatOn > .5 && uSelf < .5) { vec3 p = (uHatInv * vec4(vW, 1.)).xyz;
      if (p.y < -.1 && uKeyHat.y > .01) { float t = -p.y / uKeyHat.y; vec2 q = p.xz + uKeyHat.xz * t; if (dot(q, q) < uHatR * uHatR) sh = .3; } }
    float d = max(dot(n, uKey), 0.) * sh, f = max(dot(n, uFill), 0.);
    float s = band(clamp(.08 + .64 * d + .3 * f, 0., 1.), bz);
    vec3 warm = vec3(0.); float wi = 0.;
    for (int i = 0; i < 4; i++) { vec3 dl = uLampPos[i].xyz - vW; float dist = length(dl), att = clamp(1. - dist / uLampPos[i].w, 0., 1.);
      float lam = max(dot(n, dl / max(dist, .001)), 0.) * .7 + .3; float e = att * att * lam * uLampCol[i].w;
      warm += uLampCol[i].rgb * e; wi += e; }
    float wq = band(min(wi, 1.), fract(bz + .37)); vec3 wc = wi > 0. ? warm / wi : vec3(0.);
    float rim = pow(1. - max(dot(n, uView), 0.), 1.5) * max(dot(n, uRimDir), 0.) * uRimOn * uRim * 1.6;
    rim = uToon > .5 ? (rim > .45 ? 1. : (uDither > .5 && rim > .3 && bz < .5 ? 1. : 0.)) : clamp(rim, 0., 1.);
    col = base * uMoon * (.35 + 1.05 * s) + base * wc * wq * 2.1 + uRimCol * rim * .45;
    if (wet > .5) col += wc * wq * .35 + uRimCol * .04;   // a puddle catches the lanterns and the sky
  }
  // ground mist: drifting banks low over the floor, lit warm where a lantern reaches it
  if (uFog > .5) { float h = clamp(1. - vW.y / 14., 0., 1.); float m = noise(vW.xz * vec2(.018, .03) + vec2(uTime * .05, uTime * .02)) * .8 + noise(vW.xz * .07 - uTime * .04) * .2;
    float a = h * h * smoothstep(.45, .95, m) * .26; vec3 fc = uFogCol;
    for (int i = 0; i < 4; i++) { float dd = length(uLampPos[i].xz - vW.xz); fc += uLampCol[i].rgb * clamp(1. - dd / (uLampPos[i].w * .8), 0., 1.) * uLampCol[i].w * .4; }
    a = uDither > .5 && uPx < 1.5 ? floor(a * 4. + bz) / 4. : a; col = mix(col, fc, a); }   // dithered on the low-res target, smooth over a hi-res one
  col = mix(col, uTintCol, uTint);
  if (uFlash > .5) col = vec3(1.);
  oC = vec4(col, 1.);
  oD = vec4(dot(uVD, vW), uObj, vPart, 1.);
  oN = vec4(n * .5 + .5, 1.);
}`;

// obj: 0 the world, 1 the hero, 2 a samurai, 3 effects/light (never outlined)
export function shadeMat({ obj = 0, floor = 0, rim = obj ? 1 : .5, side = THREE.FrontSide, stencil = false } = {}) {
  const m = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: FRAG, side,
    uniforms: { ...SH, uFlash: { value: 0 }, uObj: { value: obj }, uFade: { value: 0 }, uFloor: { value: floor }, uRim: { value: rim }, uSelf: { value: 0 },
      uTint: { value: 0 }, uTintCol: { value: new THREE.Vector3(1, 1, 1) } } });
  if (stencil) Object.assign(m, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
  return m;
}

// the silhouette: a character hidden behind the roof, a pillar or a wall shows as a dithered shape (drawn only where
// something nearer covers him, and never over his own visible pixels: the stencil his own pass wrote)
export function silhouetteMat() {
  return new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, depthWrite: false, depthFunc: THREE.GreaterDepth,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp,
    uniforms: { uDOff: SH.uDOff },
    fragmentShader: /* glsl */`precision highp float; uniform vec2 uDOff; in vec3 vW; in vec3 vN; in vec4 vC; flat in float vPart;
      layout(location = 0) out vec4 oC; layout(location = 1) out vec4 oD; layout(location = 2) out vec4 oN;
      void main() { vec2 p = floor(gl_FragCoord.xy + uDOff); if (mod(p.x + p.y, 2.) > .5) discard;
        oC = vec4(.16, .44, .45, 1.); oD = vec4(-1e4, 4., 0., 1.); oN = vec4(.5, 1., .5, 1.); }` });
}
