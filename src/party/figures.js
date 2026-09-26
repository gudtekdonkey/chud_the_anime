import { RC, FW, FH, OX, OY, PX, snap } from '../config.js';
import { HILT } from '../rig/pose.js';
import { ANIMS } from '../anims/anims.js';
import { Raster, packPal } from '../wardrobe/raster.js';
import { dress, makeFigure, turnCloth } from '../wardrobe/dress.js';
import { WEAPONS, framesFor } from '../weapons/weapons.js';
import { bake } from '../traits/bake.js';

// ---- Drawing anyone in the party: the rig with their weapon's poses and art, what they wear, how their traits make them move ----
// Frames per weapon, personality and move, cached: { poses, fps, loop }
const near = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) < .2;
// a weapon's adapt() finds the resting hilt hand by identity; a trait bake builds new arrays, so match it by value
const adapt = (w, p, name, i) => p && { ...(w.adapt ? w.adapt(near(p.fa, HILT) ? { ...p, fa: HILT } : p, name, i) : p), wp: w.art };
const CACHE = new Map(), BAKES = new Map();
export const traitKey = c => c.traits.map(([id, k]) => id + k).join(',');
export function bakeFor(c) { const k = traitKey(c); let b = BAKES.get(k); if (!b) BAKES.set(k, b = bake(c.traits)); return b; }
export function frames(c, name) {
  const wid = c.kit.weapon, key = wid + '|' + traitKey(c) + '|' + name; let f = CACHE.get(key); if (f) return f;
  const w = WEAPONS.find(v => v.id === wid);
  if (name === 'idle' || name === 'walk' || name === 'run') { const b = bakeFor(c)[name]; f = { poses: b.poses.map((p, i) => adapt(w, p, name, i)), fps: b.fps, loop: true }; }
  else f = { poses: framesFor(w, name).map(p => p && { ...p, wp: w.art }), fps: ANIMS[name].fps, loop: ANIMS[name].loop };
  CACHE.set(key, f); return f;
}
export const poseOf = (f, t) => { const i = Math.floor(t * f.fps); return f.poses[f.loop ? i % f.poses.length : Math.min(f.poses.length - 1, i)]; };
export const lenOf = f => f.poses.length / f.fps;

// eyes tell them apart: the ronin cyan, companions white, enemies red (their own drawing, world/enemy-draw.js)
const RAST = { hero: new Raster(FW, FH, OX, OY), ally: new Raster(FW, FH, OX, OY, .3, packPal({ ...RC, E: '#e9eeee', e: '#8a9294' })) };
// a figure for a companion that shares their kit's wear Set, so dressing them on the kit screen shows at once
export const figureFor = c => { const F = makeFigure([]); F.outfit = c.kit.wear; return F; };
// one character's pixels this frame: a canvas FW x FH, feet at (OX, OY). The canvas is reused: draw it before the next paint
export const paint = (F, pose, dt, pal = 'ally') => dress(RAST[pal], F, pose, dt);
export function faceTo(F, face, want) { if (face !== want) turnCloth(F); return want; }

const WHITE = document.createElement('canvas'); WHITE.width = FW; WHITE.height = FH; const wg = WHITE.getContext('2d');
export function white(cv) { wg.clearRect(0, 0, FW, FH); wg.drawImage(cv, 0, 0);
  wg.globalCompositeOperation = 'source-in'; wg.fillStyle = '#ffffff'; wg.fillRect(0, 0, FW, FH); wg.globalCompositeOperation = 'source-over'; return WHITE; }
// a canvas on the floor at (x, y), as he is drawn: contact shadow, floor reflection, then the figure (o.flash white, o.alpha)
export function place(g, cv, x, y, face, o = {}) {
  x = snap(x); y = snap(y); const a = o.alpha ?? 1;
  g.fillStyle = `rgba(20,24,24,${.35 * a})`; g.fillRect(Math.round(x) - 5, Math.round(y), 10, 2);
  g.save(); g.globalAlpha = .17 * a; g.translate(x, 2 * y + 1); g.scale(face / PX, -1 / PX); g.drawImage(cv, -OX, -OY); g.restore();
  g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(face / PX, 1 / PX); g.drawImage(o.flash ? white(cv) : cv, -OX, -OY); g.restore();
}
