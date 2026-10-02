// ---- Hair under the armour session's gear (src/iso/gear/, docs/gear.md): every gear head piece is a hat in the head-slot
// contract (docs/hair.md), its declaration DERIVED from its own parts, so the 24 hairstyles fit under all of them and a
// new gear head piece needs nothing here. A cap becomes a dome (its polar band and its face opening), a shikoro a wall
// per lame, a brimmed hat a cone on the hat pivot, the tengai a wall; the regions and the crown item's fate follow from
// what the parts are (a helmet, a hood, a wrap, a band, a brim). The radii are the dresser's own (gear/dress.js): each
// part sits on the crown pad the parts under it raised, recomputed here in the same order.
//
// Hair is its own pick, not a gear piece: the gear catalogue's hair pieces (pix 'hair': the chonmage, loose hair) stay
// in it for the outfits and the pixel look, but the 3D look leaves them out and they only suggest the hair pick.
import { resolve as resolveGear } from '../gear/dress.js';
import { BY_ID, BY_CELL } from '../gear/items.js';
import { PRESETS } from '../gear/outfits.js';
import { HEAD_R } from '../gear/parts.js';

export const GEAR_HAIR = { chonmage: 'chonmage', 'loose-hair': 'ronin' };   // a gear hair piece → the hairstyle it suggests
const isHair = id => !!id && !!BY_ID[id] && /\bhair\b/.test(BY_ID[id].pix || '');
const SEGS = .94;                          // a low-poly sphere's faces sit inside its radius: shells shrink by this

// the outfit as the 3D look builds it: its head hair taken out (the hair pick draws hair)
export function stripHair(o) { if (!o || !isHair(o.head && o.head.base)) return o; return { ...o, head: { ...o.head, base: null } }; }
// the hairstyle an outfit's gear hair suggests (null: it has none)
export const hairOf = o => (o && isHair(o.head && o.head.base) && (GEAR_HAIR[o.head.base] || 'ronin')) || null;

const RANK = { knot: ['hide', 'behind', 'inside', 'under', 'show'], tail: ['hide', 'behind', 'show'] };
const worse = (k, a, b) => RANK[k].indexOf(a) <= RANK[k].indexOf(b) ? a : b;

// the head slot's hat for an outfit: { id, name, mount: 'gear', shells (each with its space), regions, crown }
export function gearHat(outfit) {
  const o = stripHair(outfit), { entries } = resolveGear(o);
  const head = entries.filter(e => e.p.slot === 'head' && !e.hidden);
  const shells = [], hides = new Set(), names = [...new Set(head.map(e => e.p.name))];
  let crown = 0, face = 0, knot = 'show', tail = 'show';
  const kn = m => { knot = worse('knot', knot, m); }, tl = m => { tail = worse('tail', tail, m); };
  const parts = head.map(e => e.q), helmet = parts.some(q => q.k === 'shikoro');
  for (const q of parts) {
    if (q.k === 'cap') {
      const base = Math.max(crown, q.face ? face : 0), th = q.th ?? .14, r = (HEAD_R + base + th) * SEGS, s = q.s || [1, 1, 1], from = q.from || 0, theta = q.theta ?? 1.7, open = q.open ?? 0;
      shells.push({ t: 'dome', space: 'centre', c: [0, q.dy || 0, q.dz || 0], r: [r * s[0], r * s[1], r * s[2]], polar: [from, from + theta], gap: open / 2 || undefined });
      crown = base + th + (q.bump || 0); if (!open && theta > 1.5) face = Math.max(face, base + th);
      if (helmet) continue;
      if (from > .5) continue;                                   // a band at the brow: open on top, every hairstyle shows
      if (open > 0 && from + theta > 2) { for (const r of ['crown', 'back', 'sides', 'strands']) hides.add(r); kn('hide'); tl('behind'); }   // a hood
      else if (q.cloth || q.sh <= 4) { kn('behind'); tl('behind'); }    // a wrap tied over the crown: a knot is tied low instead
      else { kn('under'); tl('behind'); }                         // a cap of iron: pressed under it
      if (parts.some(c => c.k === 'crest' && c.style === 'tall')) kn('inside');   // the eboshi's tall crown houses the knot
    } else if (q.k === 'shikoro') {
      const n = q.n || 3, open = q.open ?? 2.2, fl = q.flare ?? .35, h = q.h ?? .75;
      for (let i = 0; i < n; i++) { const rt = (HEAD_R + crown + .05 + i * fl) * SEGS - .1, top = -.15 - i * h * .85;
        shells.push({ t: 'wall', space: 'centre', y: [top, top - h], r: [rt, rt + fl * SEGS], sz: 1, arc: Math.PI - open / 2 }); }
      hides.add('fringe'); hides.add('strands'); kn('under'); tl('behind');
    } else if (q.k === 'hat') {
      const off = crown * .8;   // the hat node sits over the crown pad on the pivot (parts.js hat)
      if (q.style === 'tengai') { const b = crown;
        shells.push({ t: 'wall', space: 'pivot', y: [-.6 + 2.3 + off, -.6 - 2.3 + off], r: [(1.9 + b) * SEGS, (2.5 + b) * SEGS], sz: 1, arc: Math.PI });
        for (const r of ['crown', 'back', 'sides', 'fringe', 'strands']) hides.add(r); kn('hide'); tl('behind'); crown += .8; continue; }
      const R = q.R ?? 9.5, h = q.h ?? 1.8, top = q.style === 'kasa' ? .08 : q.style === 'dome' ? R * .55 : 1.0;
      shells.push({ t: 'cone', space: 'pivot', y0: -.05 + off, R: R * .97, top: h - .05 + off, r1: top });
      if (q.veil) hides.add('strands');
      kn('under'); tl('behind'); crown += .3;
    } else if (q.k === 'mask') {
      if (q.style === 'wrap') shells.push({ t: 'dome', space: 'centre', c: [0, 0, 0], r: Array(3).fill((HEAD_R + face + .1) * SEGS), polar: [1.45, 2.4], only: 1.5 });
      face += q.style === 'wrap' ? .12 : .5;
    }
  }
  const regions = Object.fromEntries([...hides].map(r => [r, 'hide']));
  return { id: 'gear:' + head.map(e => e.p.id).filter((v, i, a) => a.indexOf(v) === i).join('+'), name: names.join(' + ') || 'No hat', mount: 'gear', shells, regions, crown: { knot, tail }, gear: true };
}

// every gear head to try hair under: each head piece alone (gear's hair pieces aside), then each preset's pair
export function gearHeads() { const out = [], name = h => [h.base, h.armour].filter(Boolean).map(id => BY_ID[id].name).join(' + ');
  for (const p of BY_CELL.head.base) if (!isHair(p.id)) out.push({ base: p.id, armour: null });
  for (const p of BY_CELL.head.armour) out.push({ base: null, armour: p.id });
  for (const pr of PRESETS) { const h = stripHair(pr.o).head; if (h.base && h.armour) out.push({ ...h }); }
  return out.map(h => ({ ...h, name: name(h) })); }
