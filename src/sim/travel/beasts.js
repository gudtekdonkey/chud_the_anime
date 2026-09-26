import { zoneAt } from '../ledger.js';

// ---- The creatures of the voids (owner, 2026-09-26) ----
// People keep to the settled lands. Bandits hold the edge (encounters.js). Out in the voids (worldgen carves them; wild.js says
// where) live mystical creatures far stronger than any man: rare by day, still elusive at night. Until he is level FIGHT he cannot
// fight one: the first meetings scare him off, then they knock him out (cut scenes), so he explores, gets caught, and learns he has
// to stay, build and grow far stronger. From level FIGHT they come for him at night and can be fought. Level SPIKE is his first
// power spike (a mystical skill, the live game's): past it he stands a real chance.
export const BEASTS = {
  FIGHT: 11, SPIKE: 30,
  chance: { day: .007, night: .035 },   // per void zone crossed, before depth (each zone deeper into the void +25%, up to 4)
  cap: .09,
  scares: 2,                            // below FIGHT: this many scare-offs, then every meeting knocks him out
  // of those rolls, the share that is the creature itself; the rest are signs of it (tracks, a sound, eyes, a felled tree)
  face: { low: { day: .4, night: .35 }, high: { day: .5, night: .8 } },
};

// the creatures, by the ground they keep to: old folk names for things no one has seen and lived to describe well
export const CREATURES = {
  omukade:   { name: 'the great centipede', biomes: ['mountains', 'hills'] },
  tsuchigumo:{ name: 'the earth spider', biomes: ['hills', 'forest', 'mountains'] },
  nue:       { name: 'the nue', biomes: ['bamboo', 'forest', 'plains', 'paddy'] },
  mizuchi:   { name: 'the river serpent', biomes: ['marsh', 'coast'] },
  ogama:     { name: 'the great toad', biomes: ['marsh', 'paddy'] },
};
export const creatureFor = (biome, r) => { const ks = Object.keys(CREATURES).filter(k => CREATURES[k].biomes.includes(biome)); return ks.length ? r.pick(ks) : 'nue'; };

// how far inside a void (0 at its rim, up to 4)
export function voidInner(L, x, y) {
  for (let R = 1; R <= 4; R++) for (let yy = y - R; yy <= y + R; yy++) for (let xx = x - R; xx <= x + R; xx++) {
    if (Math.max(Math.abs(xx - x), Math.abs(yy - y)) !== R) continue; const z = zoneAt(L, xx, yy); if (z && z.biome !== 'sea' && !z.void) return R - 1; }
  return 4;
}
// the chance that crossing this zone brings a creature or its sign
export function beastChance(c) {
  if (c.ring !== 'void') return 0;
  return Math.min(BEASTS.cap, (c.night ? BEASTS.chance.night : BEASTS.chance.day) * (1 + .25 * c.inner));
}
// which: a sign, a scare, a knockout, or (from FIGHT) the creature to fight
export function beastType(L, c, r) {
  const st = L.sys.travel.beasts, high = c.level >= BEASTS.FIGHT, f = BEASTS.face[high ? 'high' : 'low'][c.night ? 'night' : 'day'];
  if (!r.chance(f)) return 'beastSign';
  return high ? 'beast' : st.faced < BEASTS.scares ? 'beastScare' : 'beastKO';
}

// the nearest zone outside every void, toward the settled land: where he runs to, where he wakes
function outOfVoid(L, x, y) {
  for (let R = 1; R <= 12; R++) for (let yy = y - R; yy <= y + R; yy++) for (let xx = x - R; xx <= x + R; xx++) {
    if (Math.max(Math.abs(xx - x), Math.abs(yy - y)) !== R) continue; const z = zoneAt(L, xx, yy); if (z && z.biome !== 'sea' && !z.void) return [z.x, z.y]; }
  return [x, y];
}
function nearestHome(L, x, y) {
  for (let R = 0; R <= 25; R++) for (let yy = y - R; yy <= y + R; yy++) for (let xx = x - R; xx <= x + R; xx++) {
    if (Math.max(Math.abs(xx - x), Math.abs(yy - y)) !== R) continue; const z = zoneAt(L, xx, yy); if (z && (z.kind === 'town' || z.kind === 'village')) return z; }
  return null;
}
const beastWho = k => [{ id: null, name: CREATURES[k].name, cls: 'creature', weapon: null, creature: k, fighter: true }];
const SIGNS = {
  day: ['Tracks in the mud, each one wider than your hat, and none of them going back.', 'A tree as thick as a man, snapped at the height of a roof.', 'Bones in the grass, picked clean, and among them a whole suit of armour, dented inward.', 'Everything has gone quiet: no birds, no insects, nothing.'],
  night: ['Something far off breathes. The ground feels it before you do.', 'Two lights between the trees, too far apart to be one animal, and then they blink.', 'A long sound, like a temple bell dragged over stone, from somewhere very close.', 'The grass ahead lies flat in a path wider than a road, and it is still moving.'],
};

export const BEAST_SCENES = {
  // a sign that something lives here: a warning, nothing more
  beastSign: {
    make(L, c, r) { const k = creatureFor(c.z.biome, r);
      return { title: 'Something lives here', who: [], data: { creature: k }, text: r.pick(SIGNS[c.night ? 'night' : 'day']),
        choices: [{ id: 'back', label: 'Turn back' }, { id: 'on', label: 'Go on' }] }; },
    resolve(L, sc, ch) {
      if (ch === 'back') return { text: 'You go back the way you came, and do not hurry, and do not look round.', move: outOfVoid(L, ...sc.zone), events: [['travel.beastSign', { creature: sc.data.creature, turned: true }]] };
      return { text: 'You go on. It is a long time before you hear the birds again.', events: [['travel.beastSign', { creature: sc.data.creature, turned: false }]] };
    },
  },
  // below FIGHT, the first meetings: it shows itself, and he runs (a cut scene; the one choice only closes it)
  beastScare: {
    make(L, c, r) { const k = creatureFor(c.z.biome, r);
      return { title: 'Run', cut: 'beastScare', who: beastWho(k), data: { creature: k }, choices: [{ id: 'ok', label: 'Run' }],
        text: `It rises out of the ${c.z.biome === 'marsh' ? 'water' : 'trees'}: ${CREATURES[k].name}, bigger than a gatehouse. Your hand goes to your sword, and your sword hand knows better. You run.` }; },
    resolve(L, sc, ch, r) { L.sys.travel.beasts.faced++;
      return { text: 'You run until the ground is farmland again, and only then does your heart remember how to slow down.', hours: r.int(1, 2), hurt: .1, move: outOfVoid(L, ...sc.zone),
        events: [['travel.beastFled', { creature: sc.data.creature }]] }; },
  },
  // below FIGHT, every meeting after the scares: it knocks him down, and he wakes somewhere safe (a cut scene)
  beastKO: {
    make(L, c, r) { const k = creatureFor(c.z.biome, r), home = nearestHome(L, c.x, c.y);
      return { title: 'Too slow', cut: 'beastKO', who: beastWho(k), data: { creature: k, wake: home ? [home.x, home.y] : outOfVoid(L, c.x, c.y), wakeName: home?.name },
        choices: [{ id: 'ok', label: '...' }], text: `${CREATURES[k].name[0].toUpperCase() + CREATURES[k].name.slice(1)} is on you before you have turned round. There is a sound like a door slamming, very close, and then nothing at all.` }; },
    resolve(L, sc, ch, r) { L.sys.travel.beasts.faced++; L.sys.travel.beasts.ko++;
      return { text: sc.data.wakeName ? `You wake on a mat in ${sc.data.wakeName}. A woodcutter found you at the edge of the wild and carried you here; he will not say how far.` : 'You wake at the edge of the wild, alone, with no idea how you got here.',
        hours: r.int(6, 12), hurt: .6, move: sc.data.wake, events: [['travel.beastKO', { creature: sc.data.creature }]] }; },
  },
  // from FIGHT: it comes for him, and it can be fought
  beast: {
    make(L, c, r) { const k = creatureFor(c.z.biome, r);
      return { title: CREATURES[k].name[0].toUpperCase() + CREATURES[k].name.slice(1), who: beastWho(k), data: { creature: k, level: c.level },
        choices: [{ id: 'fight', label: 'Fight it' }, { id: 'flee', label: 'Run' }], text: `${CREATURES[k].name[0].toUpperCase() + CREATURES[k].name.slice(1)} has found you, and this time it does not stop to look.` }; },
    resolve(L, sc, ch, r, result) {
      const lv = sc.data.level, edge = Math.min(.9, .2 + (lv - BEASTS.FIGHT) * .012 + (lv >= BEASTS.SPIKE ? .35 : 0));
      const ko = () => ({ hours: r.int(6, 12), hurt: .7, move: outOfVoid(L, ...sc.zone), events: [['travel.beastKO', { creature: sc.data.creature }]] });
      if (ch === 'flee') return r.chance(Math.min(.9, .45 + edge * .5)) ? { text: 'You get away, just.', hours: 1, hurt: .2, move: outOfVoid(L, ...sc.zone), events: [['travel.beastFled', { creature: sc.data.creature }]] }
        : { text: 'It is faster than you. You wake at the edge of the wild much later, and it is gone.', ...ko() };
      const won = result ? !!result.won : r.chance(edge);
      if (!won) return { text: 'It throws you through a tree. You wake at the edge of the wild much later, and it is gone.', fight: { foes: [sc.data.creature], lethal: false, won: false, slain: [] }, ...ko() };
      L.sys.travel.beasts.slain[sc.data.creature] = (L.sys.travel.beasts.slain[sc.data.creature] || 0) + 1;
      return { text: `It falls, and the ground shakes when it does. Nobody will believe you.`, hurt: .4, fight: { foes: [sc.data.creature], lethal: true, won: true, slain: [] },
        loot: [{ item: `${sc.data.creature}Part`, n: 1 }, { item: 'shards', n: r.int(20, 40) }],
        deeds: [{ deed: 'slewCreature', creature: sc.data.creature, karma: 0, standing: {}, witnesses: [] }], events: [['travel.beastSlain', { creature: sc.data.creature }]] };
    },
  },
};
