// ---- A companion's look: the hero's look (3D or pixel, look/look.js) made theirs, behind the same four calls. Today's
// rule (design notes, Companions): companions are built like him and told apart by their eyes, white where his are cyan;
// here each also wears their own surcoat colour, and their weapon's length shows on the blade (a placeholder until the
// weapons work gives the 3D weapons). Nothing outside look/ and this file knows which look a companion has.
import { makeLook } from '../look/look.js';
import { RAMP } from 'ronin-engine/render/gfx/palette.js';

const WHITE = [.92, .95, .94];
const lum = c => .3 * c[0] + .59 * c[1] + .11 * c[2];
const near = (c, h) => { const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255; return Math.abs(c[0] - r) + Math.abs(c[1] - g) + Math.abs(c[2] - b) < .02; };
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
// how long each weapon's blade is against the katana's (today's art: katana 13 px, nodachi 19 (the grave one) or 26, tanto 8, yari 37)
export const BLADE_LEN = { katana: 1, nodachi: 1.55, tanto: .55, wakizashi: .75, yari: 1.9, naginata: 1.6, kanabo: 1.3, tetsubo: 1.7, bo: 1.8, kusarigama: .5, tessen: .45, jitte: .6, daisho: 1, nunchaku: .5, kama: .45 };

// recolour the 3D rig's vertex colours: the indigo surcoat to `tone` (kept as dark as it was), the cyan eyes to white
function recolour(rig, tone) {
  const T = hexRGB(tone), tl = lum(T) || 1, ref = lum(hexRGB(RAMP.v[5]));
  for (const me of rig.meshes) { const col = me.geometry.attributes.color; if (!col) continue; const a = col.array;
    for (let i = 0; i < a.length; i += 4) { const c = [a[i], a[i + 1], a[i + 2]];
      if (RAMP.y.some(h => near(c, h))) { a[i] = WHITE[0]; a[i + 1] = WHITE[1]; a[i + 2] = WHITE[2]; }
      else if (RAMP.v.some(h => near(c, h))) { const k = lum(c) / ref; for (let j = 0; j < 3; j++) a[i + j] = Math.min(1, T[j] * k * ref / tl); } }
    col.needsUpdate = true; }
}

export function allyLook(kind, { tone = '#3a3b3e', weapon = 'katana' } = {}) {
  const base = makeLook(kind, { foe: false }), rig = base.rig;
  if (rig) { recolour(rig, tone); if (rig.blade) rig.blade.scale.z = BLADE_LEN[weapon] ?? 1; }
  const tint = hexRGB(tone);
  return { ...base, kind: base.kind, ally: true,
    // the pixel look draws him; a companion takes a wash of their colour so the two read apart
    show(f) { base.show(kind === 'pixel' && !f.tint ? { ...f, tint, tintA: .28 } : f); },
    // the eyes' glints, white (the base look stamps cyan)
    stamp(g) { base.stamp({ set fillStyle(v) { g.fillStyle = '#eef4f2'; }, fillRect: (...a) => g.fillRect(...a) }); } };
}
