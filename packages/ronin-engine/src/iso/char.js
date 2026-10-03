// ---- A character: the flow actor (all of his motion, in the page's units) and the LOOK that draws him (look/look.js).
// The controller lives here and in the game's own (chud_the_anime: hero.js / foe.js); a look is swapped without the controller noticing.
import * as THREE from 'three';
import { Actor, AF, hv } from '../flow/flow.js';
import { W } from '../clock/world.js';
import { makeLook } from './look.js';
import { BODY_SHEAR } from './gfx/view.js';
import { collide, groundAt } from '../world/room.js';

const hexRGB = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const _v = new THREE.Vector3();

export class Char {
  constructor({ foe = false, x, z, h = 0, look = '3d', outfit = null }) {
    this.foe = foe; this.a = new Actor(W, { x: x / AF, z: z / AF, h, foe: foe ? 1 : 0 }); this.a.char = this;
    this.lookKind = look; this.outfit = outfit; this.look = makeLook(look, { foe, outfit }); this.gy = 0; this.trail = []; this.r = 4.5; this.weapon = 'katana'; this.wlen = 23; this.a.after = dt => this.after(dt);
    W.actors.push(this.a);
  }
  get x() { return this.a.x * AF; } get z() { return this.a.z * AF; }
  get vx() { return this.a.v * hv(this.a.h)[0] * AF; } get vz() { return this.a.v * hv(this.a.h)[1] * AF; }
  setLook(kind, scene) { this.look.dispose(); this.lookKind = kind; this.look = makeLook(kind, { foe: this.foe, outfit: this.outfit }); this.look.mount(scene); }
  // what he wears (gear/outfits.js; null: Iron Ash as built): the look is rebuilt, the controller never notices
  dress(outfit, scene) { this.outfit = outfit; this.setLook(this.lookKind, scene); this.shown = null; }
  // after the world steps: walls, posts and the room's edge push him out; the ground under him eases up the engawa's step
  after(dt) { const p = { x: this.x, z: this.z }; collide(p, this.r); this.a.x = p.x / AF; this.a.z = p.z / AF;
    this.gy += (groundAt(p.x, p.z) - this.gy) * Math.min(1, dt * 18); }
  // the frame a look draws (look.js): the sampled pose and position, his facing, the flash, a tint, the dissolve
  frame(hero = false) { const o = this.a.out; if (!o) return null;
    // the blade thrown (skills/recall.js): whatever the move, his hands are empty and the saya too
    const pose = this.bladeAway && !(o.pose.blade && o.pose.blade.away) ? { ...o.pose, blade: { ...o.pose.blade, out: 0, away: 1 } } : o.pose;
    return { pose, x: o.x * AF, y: this.gy, z: o.z * AF, yaw: o.yaw, flash: o.flash, tint: o.tint ? hexRGB(o.tint) : null, tintA: o.tintA, alpha: o.alpha ?? 1, hero, weapon: this.weapon }; }
  // the blade's mid and tip in the world, from the side pose (the trail is the controller's, never a look's)
  bladeWorld() { const o = this.a.out, b = o && o.pose.blade; if (!b || !b.out) return null;
    const L = Math.min(this.wlen, b.vis ?? 99), d = [Math.cos(b.ang), Math.sin(b.ang)], cy = Math.cos(o.yaw), sy = Math.sin(o.yaw), rx = o.x * AF, rz = o.z * AF;
    const pt = (f, u) => { _v.set(-1, u * AF, f * AF); _v.set(_v.x * cy + _v.z * sy, _v.y, -_v.x * sy + _v.z * cy).applyMatrix4(BODY_SHEAR); return [rx + _v.x, this.gy + _v.y, rz + _v.z]; };
    const m = 6 + (L - 6) * .5; return { mid: pt(b.g[0] + d[0] * m, b.g[1] + d[1] * m), tip: pt(b.g[0] + d[0] * L, b.g[1] + d[1] * L) }; }
}
