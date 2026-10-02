// ---- The pipeline: the scene is drawn into a 960×540 target (three attachments: colour, data, normal), the hero's
// hidden parts get their silhouette, then one full-screen pass outlines, snaps every pixel to the palette, lays the
// effects layer and the rain on top, and writes the canvas. The canvas is scaled up by whole multiples, nearest-neighbour.
import * as THREE from 'three';
import { VW, VH } from './view.js';
import { PALETTE, hex } from './palette.js';
import { SH, silhouetteMat } from './shade.js';

// the overlay's toggles; the defaults are the owner's picks on the 3D faces page (2026-10-02, "like this actually"):
// low-res target off (drawn at k× and shown as is), toon bands on (4), dither on, palette off, outline off, pixel
// upscale on, rim light on, the glints kept
export const PIPE = { lowres: 0, toon: 1, dither: 1, palette: 0, outline: 0, nearest: 1, rim: 1, glint: 1, bands: 4, fog: 1, rain: 1, k: 2,
  line: [1, '#060709', 0], clash: 1, cine: 1 };
// what the frame's moment asks of the post pass (main.js sets it each frame): the clash, the close-up, its focus
export const MOMENT = { impact: 0, cine: 0, bars: 0, focus: [480, 270], gray: 0 };   // gray: Time Slice's stopped time (skills/timeslice.js)

const POST = /* glsl */`
precision highp float;
uniform sampler2D tC, tD, tN, tFx; uniform vec3 uPal[${PALETTE.length}];
uniform float uPalOn, uOutline, uRain, uTime, uK, uOW, uOLChar, uImpact, uCine, uBars, uGray; uniform vec2 uDOff, uFocus; uniform vec3 uInk; uniform ivec2 uSize;
in vec2 vUv; layout(location = 0) out vec4 oC;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec4 D(ivec2 p) { return texelFetch(tD, clamp(p, ivec2(0), uSize - 1), 0); }
vec3 N(ivec2 p) { return texelFetch(tN, clamp(p, ivec2(0), uSize - 1), 0).xyz * 2. - 1.; }
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy); vec3 c = texelFetch(tC, p, 0).rgb; vec4 d = D(p);
  bool solid = d.w > .5; float obj = solid ? d.y : -1.;
  if (uOutline > .5) {
    // the style's line: uOW render pixels wide (k-scaled), ink round each character; inside him plate edges and folds;
    // on the world (unless the style rings the characters only) a soft line on its ledges
    ivec2 o[4] = ivec2[4](ivec2(1, 0), ivec2(-1, 0), ivec2(0, 1), ivec2(0, -1));
    float ink = 0., crease = 0.; int w = int(max(1., floor(uOW * uK + .5)));
    for (int r = 1; r <= 4; r++) { if (r > w) break;
      for (int i = 0; i < 4; i++) { vec4 q = D(p + o[i] * r); if (q.w < .5 || q.y > 2.5) continue;
        bool qChar = q.y > .5; float dz = q.x - (solid ? d.x : -1e5);
        if (qChar && (obj < .5 || obj > 2.5 || dz > 2.5 || (abs(q.y - obj) > .1 && dz > 0.))) ink = 1.;
        else if (r == 1 && qChar && abs(q.y - obj) < .1) { if ((abs(q.z - d.z) > .5 && dz > .15) || (dot(N(p), N(p + o[i])) < .55 && dz > .05)) crease = 1.; }
        else if (r == 1 && uOLChar < .5 && !qChar && obj < .5 && dz > 3.) crease = max(crease, .5); } }
    if (ink > .5) c = uInk; else if (crease > .5) c *= obj < .5 ? .62 : .55; else if (crease > 0.) c *= .78;
  }
  if (uPalOn > .5) { vec3 best = c; float bd = 1e9;
    for (int i = 0; i < ${PALETTE.length}; i++) { vec3 e = uPal[i] - c; float dd = dot(e * e, vec3(2., 4., 3.)); if (dd < bd) { bd = dd; best = uPal[i]; } }
    c = best; }
  // the finisher's close-up: the world gives way to ink and speed lines rushing out from the two of them
  if (uCine > 0. && (obj < .5 || obj > 2.5)) { vec2 q = gl_FragCoord.xy / uK - uFocus; float an = atan(q.y, q.x), rr = length(q);
    float ray = hash(vec2(floor(an * 40.), floor(uTime * 12.))); vec3 bg = vec3(.035, .04, .065) + vec3(.08, .07, .09) * smoothstep(320., 40., rr);
    if (ray > .78 && rr > 60. + 140. * hash(vec2(floor(an * 40.), 3.))) bg = mix(bg, vec3(.78, .84, .9), .55);
    c = mix(c, bg, uCine); }
  // rain: thin streaks falling slightly slanted, in the dark between the drops (screen-space, world-anchored by the camera offset)
  if (uRain > .5 && uCine < .5) { vec2 s = floor(gl_FragCoord.xy / uK) + uDOff / uK; float col = floor((s.x + s.y * .22) / 3.); float sp = 420. + hash(vec2(col, 1.)) * 160.;
    float y = mod(s.y + uTime * sp + hash(vec2(col, 2.)) * 900., 140. + hash(vec2(col, 3.)) * 220.);
    if (mod(s.x + s.y * .22, 3.) < 1. && y < 7. && hash(vec2(col, floor((s.y + uTime * sp) / 400.))) > .45) c = mix(c, vec3(.44, .51, .6), .55); }
  // stopped time (Time Slice): the world drains of colour, all but him (object 1); the effects layer keeps its own
  if (uGray > 0. && !(obj > .5 && obj < 1.5)) { float l = dot(c, vec3(.3, .59, .11)); c = mix(c, vec3(l) * vec3(.86, .93, 1.08), uGray); }
  ivec2 fp = ivec2(vec2(p) / uK); vec4 fx = texelFetch(tFx, ivec2(fp.x, ${VH - 1} - fp.y), 0); c = mix(c, fx.rgb, fx.a);
  // the clash (Anime limited's impact frames, every style): black and white, then inverted, while the hit-stop holds
  if (uImpact > .5) { float l = dot(c, vec3(.3, .59, .11)); bool hi = l > .16; if (uImpact > 1.5) hi = !hi; c = hi ? vec3(.98) : vec3(.03); }
  // letterbox
  float by = gl_FragCoord.y / float(uSize.y); if (uBars > 0. && (by < .12 * uBars || by > 1. - .12 * uBars)) c = vec3(0.);
  oC = vec4(c, 1.);
}`;

export function makePipeline(canvas) {
  THREE.ColorManagement.enabled = false;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, stencil: false, depth: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.setPixelRatio(1); renderer.setSize(VW, VH, false); renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.autoClear = false;
  const rt = new THREE.WebGLRenderTarget(VW, VH, { count: 3, type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, stencilBuffer: true });
  const fxCanvas = document.createElement('canvas'); fxCanvas.width = VW; fxCanvas.height = VH;
  const fx = fxCanvas.getContext('2d'), fxTex = new THREE.CanvasTexture(fxCanvas);
  fxTex.minFilter = fxTex.magFilter = THREE.NearestFilter; fxTex.generateMipmaps = false; fxTex.flipY = false;
  const post = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false,
    vertexShader: 'precision highp float; in vec3 position; out vec2 vUv; void main() { vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: POST,
    uniforms: { tC: { value: rt.textures[0] }, tD: { value: rt.textures[1] }, tN: { value: rt.textures[2] }, tFx: { value: fxTex },
      uPal: { value: PALETTE.map(c => new THREE.Vector3(...c)) }, uPalOn: { value: 1 }, uOutline: { value: 1 }, uRain: { value: 1 },
      uTime: SH.uTime, uDOff: SH.uDOff, uK: { value: 1 }, uOW: { value: 1 }, uOLChar: { value: 0 }, uImpact: { value: 0 }, uCine: { value: 0 }, uBars: { value: 0 }, uGray: { value: 0 }, uFocus: { value: new THREE.Vector2(480, 270) }, uSize: { value: new THREE.Vector2(VW, VH) }, uInk: { value: new THREE.Vector3(...hex('#060709')) } } });
  const quad = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)), post);
  quad.frustumCulled = false; const postScene = new THREE.Scene(); postScene.add(quad); const postCam = new THREE.Camera();
  const sil = silhouetteMat();

  // the target's scale: the low-res target draws at 960×540 (1 render pixel per 2× game pixel); off, at k× that
  let k = 0;
  function resize() { const nk = PIPE.lowres ? 1 : PIPE.k; if (Math.abs(nk - k) < 1e-3) return; k = nk; const w = Math.round(VW * k), h = Math.round(VH * k);
    renderer.setSize(w, h, false); rt.setSize(w, h);
    post.uniforms.uK.value = k; post.uniforms.uSize.value = new THREE.Vector2(w, h); SH.uPx.value = Math.max(1, Math.round(k)); }
  function render(scene, cam) {
    resize(); canvas.style.imageRendering = PIPE.nearest ? 'pixelated' : 'auto';
    SH.uToon.value = PIPE.toon; SH.uDither.value = PIPE.dither; SH.uFog.value = PIPE.fog; SH.uBands.value = PIPE.bands; SH.uRimOn.value = PIPE.rim;
    post.uniforms.uPalOn.value = PIPE.palette; post.uniforms.uOutline.value = PIPE.outline; post.uniforms.uRain.value = PIPE.rain;
    const u = post.uniforms; u.uOW.value = PIPE.line[0]; u.uInk.value.set(...hex(PIPE.line[1])); u.uOLChar.value = PIPE.line[2];
    u.uImpact.value = PIPE.clash ? MOMENT.impact : 0; u.uCine.value = MOMENT.cine; u.uBars.value = MOMENT.bars; u.uGray.value = MOMENT.gray; u.uFocus.value.set(MOMENT.focus[0], VH - MOMENT.focus[1]);
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, true);
    cam.layers.set(0); renderer.render(scene, cam);
    scene.overrideMaterial = sil; cam.layers.set(1); renderer.render(scene, cam); scene.overrideMaterial = null; cam.layers.set(0);
    fxTex.needsUpdate = true;
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  }
  return { renderer, render, fx, fxCanvas, get k() { return k; } };
}
