// ---- The courtyard's people: villagers and samurai of different cultures, each one person of it (personOf: the
// culture's shared manner plus one trait of their own, from a seed), idling and wandering. They are actors like the
// hero, on the same flow moves, with a persona: it sets how they stand, walk and breathe, which idles they drift into
// and how often, how long they rest before wandering on, and how they take the hero coming close (a curious one turns
// to look, a cautious one steps out of his way). Not in the fight: the hit rules only know the samurai.
import { Char } from '../play/char.js';
import { W } from 'ronin-engine/clock/world.js';
import { AF, hOf, wrapA } from 'ronin-engine/flow/flow.js';
import { makeLook } from '../look/look.js';
import { personaOf, personOf, describe, CULTURES } from './picks.js';
import { folkLook } from './folk.js';
import { WALK } from 'ronin-engine/persona/gait.js';
import 'ronin-engine/persona/gait.js';

// who stands where: [kind, culture, seed, x, z, wander radius] (world units; the hero starts at 250,120, the samurai at 330,110)
export const FOLK = [
  ['villager', 'village', 1, 110, 80, 50], ['villager', 'village', 2, 150, 225, 45], ['villager', 'port', 3, 385, 215, 45],
  ['villager', 'monastery', 4, 250, 238, 30], ['samurai', 'clan', 5, 430, 70, 40], ['samurai', 'outlaws', 6, 60, 170, 40], ['villager', 'court', 7, 330, 185, 30],
];

export class Npc extends Char {
  constructor([kind, culture, seed, x, z, rad]) {
    super({ x, z, h: (seed * 2.3) % 6.28 - 3.14, foe: kind === 'samurai', look: kind === 'samurai' ? '3d' : 'folk' });
    this.kind = kind; this.culture = culture; this.seed = seed; this.home = [x, z, rad]; this.r = 4;
    if (kind === 'villager') this.look = folkLook({ seed });
    this.setPersona(personOf(culture, seed));
    this.mode = 'idle'; this.until = W.t + 1 + this.rnd() * 4; this.a.play('idle'); this.a.update(1 / 120); this.a.sample(true);
  }
  rnd() { this.s = ((this.s ?? this.seed * 7919) * 16807) % 2147483647; return this.s / 2147483647; }
  setPersona(list) { this.list = list; const a = this.a; a.persona = personaOf(list, { armed: this.kind === 'samurai' }); a.seed = this.seed * 131 + 7; a.idler = null;
    this.label = `${CULTURES[this.culture].name} · ${describe(list.slice(-1))}`; }
  get state() { return this.a.clip.name; }
  // the model switch: villagers keep their kimono in 3D; in pixel, the pages' drawing tinted to tell them apart
  setLook(kind, scene) { this.look.dispose(); this.lookKind = kind; const v = this.kind === 'villager';
    this.look = kind === '3d' ? (v ? folkLook({ seed: this.seed }) : makeLook('3d', { foe: true })) : makeLook('pixel', { foe: !v });
    this.a.tint = kind !== '3d' && v ? '#8f7a52' : null; this.a.tintA = .4; this.look.mount(scene); }
  control(hero, others, t) {
    const a = this.a, P = a.persona, dh = Math.hypot(hero.x - this.x, hero.z - this.z), wary = P.behave.traits.caution > .25;
    if (this.mode === 'idle') {
      a.look = dh < 36 ? hero.a : null;                                         // he turns to see who comes near
      if (wary && dh < 20) { const away = hOf(this.x - hero.x, this.z - hero.z); this.go(this.x + Math.sin(away) * 24, this.z + Math.cos(away) * 24, t); }
      else if (t > this.until) { const [hx, hz, r] = this.home, an = this.rnd() * Math.PI * 2, d = r * Math.sqrt(this.rnd()); this.go(hx + Math.sin(an) * d, hz + Math.cos(an) * d, t); }
    } else {
      const dx = this.target[0] - this.x, dz = this.target[1] - this.z, d = Math.hypot(dx, dz);
      a.ht = hOf(dx, dz); if (Math.abs(wrapA(a.ht - a.h)) > 2.4) a.v = 0;
      if (d < 3 || t > this.giveUp) { this.mode = 'idle'; a.vt = 0; a.play('idle', { blend: .3 }); this.until = t + (3 + 3 * P.gap * .5) * (.6 + .8 * this.rnd()) * P.linger; }
    }
    // never through the hero, the samurai or each other: a soft push, theirs alone
    for (const o of [hero, ...others]) if (o !== this && o.a.alpha > .5) { const ex = this.x - o.x, ez = this.z - o.z, e = Math.hypot(ex, ez), m = this.r + (o.r || 4) + 2;
      if (e < m && e > 1e-3) { a.x += ex / e * (m - e) * .25 / AF; a.z += ez / e * (m - e) * .25 / AF; } }
  }
  go(x, z, t) { const a = this.a; this.target = [x, z]; this.mode = 'walk'; this.giveUp = t + 9; a.look = null; a.ht = hOf(x - this.x, z - this.z);
    a.vt = WALK.speed * a.persona.walk.speed; a.play('walk', { blend: .2 }); }
}

// the courtyard's people, mounted and ready (main.js steps them with the hero and the samurai)
export function addFolk(scene) { return FOLK.map(f => { const n = new Npc(f); n.look.mount(scene); return n; }); }
// their names over their heads on the effects layer (T toggles)
export const LABELS = { on: 1 };
export function drawLabels(g, folk, toPx) { if (!LABELS.on) return; g.save(); g.font = '7px ui-monospace, monospace'; g.textAlign = 'center';
  for (const n of folk) { const [x, y] = toPx([n.x, 31, n.z]), s = n.label; g.fillStyle = 'rgba(6,7,9,.6)'; const w = g.measureText(s).width; g.fillRect(x - w / 2 - 2, y - 7, w + 4, 9);
    g.fillStyle = n.kind === 'samurai' ? '#d9a39a' : '#cfd6d2'; g.fillText(s, x, y); }
  g.restore(); }
