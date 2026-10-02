// ---- THE ENEMY TYPES as data (docs/enemies.md, docs/enemy-behavior.md §1, §5): everything about an archetype is a
// row here, never a branch in the code. Distances and speeds are the flow's rig px (×0.5 = world units), like the
// moves. A move is a string of clips (enemies/moves.js) with the range it is started from, the token pool it needs,
// its own cooldown and a pick weight; what each clip's blow covers is moves.js HITS.
//
//   role      melee | ranged (where the squad places him: a ring round the hero, or behind the melee)
//   weapon    sword | spear | bow | club | tanto (his hold pose and his 3D weapon)
//   ring      the distance he waits at without a token; tooClose: a ranged one backs off inside it
//   cd        the pause after any attack, [min, max] s; aggro: the chance a think starts a move it can
//   guard     blocks (hits before it breaks); parry: { win, cd, chance by phase }; dodge: { cd, chance }
//   armor     super armour while attacking (a cut lands, he does not flinch, until his poise breaks)
//   brave     0..1: how little an ally's death shakes him; breakAt: the morale under which he runs
export const TYPES = {
  swordsman: { name: 'Samurai swordsman', role: 'melee', weapon: 'sword', hp: 6, poise: 3, r: 4.5, turn: 7, stalk: 36, run: 84, ring: 74,
    cd: [.9, 2], aggro: .8, brave: .6, breakAt: .35, guard: { hits: 2, chance: .3 }, dodge: { cd: 3, chance: .1 },
    moves: {
      string2: { seq: ['e_cut1', 'e_cut2'], range: [0, 36], pool: 'melee', cd: 1.5, weight: 3 },
      string3: { seq: ['e_cut1', 'e_cut2', 'e_cut3'], range: [0, 36], pool: 'melee', cd: 3, weight: 2 },
      thrust: { seq: ['e_thrust'], range: [18, 46], pool: 'melee', cd: 2, weight: 2 },
      guardBreak: { seq: ['e_kick'], range: [0, 26], pool: 'melee', cd: 4, weight: 1.2 },
    },
    model: { pal: 'samurai', head: 'hachimaki' } },
  spearman: { name: 'Ashigaru spearman', role: 'melee', weapon: 'spear', hp: 4, poise: 2, r: 4.5, turn: 6, stalk: 34, run: 80, ring: 92,
    cd: [.8, 1.8], aggro: .85, brave: .4, breakAt: .45, dodge: { cd: 2.2, chance: .35 },
    moves: {
      poke: { seq: ['e_poke'], range: [20, 52], pool: 'melee', cd: 1, weight: 3 },
      poke2: { seq: ['e_poke', 'e_poke'], range: [20, 50], pool: 'melee', cd: 2, weight: 2 },
      sweep: { seq: ['e_sweep'], range: [0, 46], pool: 'melee', cd: 3.5, weight: 1.4 },
    },
    model: { pal: 'ashigaru', head: 'jingasa', weapon: 'yari' } },
  archer: { name: 'Ashigaru archer', role: 'ranged', weapon: 'bow', hp: 3, poise: 1, r: 4.5, turn: 5, stalk: 40, run: 86, ring: 230, tooClose: 110,
    cd: [1.2, 2.2], aggro: .9, brave: .3, breakAt: .5, dodge: { cd: 2, chance: .5 },
    moves: { loose: { seq: ['e_draw'], range: [60, 520], pool: 'ranged', cd: 1.6, weight: 1 } },
    model: { pal: 'ashigaru', head: 'jingasaFlat', weapon: 'yumi', quiver: true } },
  heavy: { name: 'Kanabō heavy', role: 'melee', weapon: 'club', hp: 14, poise: 6, r: 6.5, turn: 3.6, stalk: 24, run: 52, ring: 72, cost: 2, armor: true,
    cd: [1.4, 2.6], aggro: .7, brave: 1, breakAt: 0,
    moves: {
      swing: { seq: ['e_kswing'], range: [0, 50], pool: 'melee', cd: 2.5, weight: 2 },
      slam: { seq: ['e_kslam'], range: [0, 48], pool: 'melee', cd: 4.5, weight: 1.5 },
    },
    model: { pal: 'heavy', head: 'kabuto', weapon: 'kanabo', scale: 1.2, oSode: true } },
  ninja: { name: 'Shinobi', role: 'melee', weapon: 'tanto', hp: 3, poise: 1, r: 4.2, turn: 11, stalk: 64, run: 140, ring: 112,
    cd: [.7, 1.5], aggro: .9, brave: .5, breakAt: .3, dodge: { cd: 1.6, chance: .5 }, vanish: { cd: 7, hide: 1 }, ambushAt: 150,
    moves: {
      dash: { seq: ['e_dash'], range: [28, 52], pool: 'melee', cd: 1.6, weight: 3 },
      shuriken: { seq: ['e_throw'], range: [80, 300], pool: 'ranged', cd: 3, weight: 2 },
    },
    model: { pal: 'ninja', head: 'hood', weapon: 'tanto' } },
  duelist: { name: 'The Red Ronin', role: 'melee', weapon: 'sword', boss: true, hp: 20, poise: 5, r: 4.8, turn: 9, stalk: 44, run: 96, ring: 64,
    cd: [.8, 1.6], aggro: .85, brave: 1, breakAt: 0, guard: { hits: 3, chance: .35 }, parry: { win: .4, cd: 2.4, chance: [.55, .7, .85] },
    moves: {
      string2: { seq: ['e_cut1', 'e_cut2'], range: [0, 36], pool: 'melee', cd: 1.4, weight: 2 },
      string3: { seq: ['e_cut1', 'e_cut2', 'e_cut3'], range: [0, 36], pool: 'melee', cd: 2.6, weight: 2 },
      thrust: { seq: ['e_thrust'], range: [18, 46], pool: 'melee', cd: 2, weight: 1.5 },
      iai: { seq: ['e_iai'], range: [34, 66], pool: 'melee', cd: 2.4, weight: 2.5 },
      flurry: { seq: ['e_flurry'], range: [0, 38], pool: 'melee', cd: 3, weight: 2, phase: 1 },
      iai2: { seq: ['e_iai', 'e_iai'], range: [34, 66], pool: 'melee', cd: 4, weight: 2, phase: 2 },
    },
    // the pattern: patient and parrying, then faster with the flurry under 60%, then the double flash-cut under 30%
    phases: [{ at: 1, cdK: 1 }, { at: .6, cdK: .7 }, { at: .3, cdK: .5 }],
    model: { pal: 'duelist', head: 'sandogasa', coat: true } },
};

// the overlay's picker: one of each, then mixed groups (the lone samurai is today's slice, `samurai`)
export const GROUPS = {
  samurai: { name: 'The lone samurai (the slice)', list: [] },
  swordsman: { name: 'One swordsman', list: ['swordsman'] },
  spearman: { name: 'One spearman', list: ['spearman'] },
  archer: { name: 'One archer', list: ['archer'] },
  heavy: { name: 'One heavy', list: ['heavy'] },
  ninja: { name: 'One shinobi', list: ['ninja'] },
  duelist: { name: 'Mini-boss: the Red Ronin', list: ['duelist'] },
  patrol: { name: 'Patrol: 3 swords, a spear', list: ['swordsman', 'swordsman', 'swordsman', 'spearman'] },
  mixed: { name: 'Mixed: swords, spear, archer, heavy', list: ['swordsman', 'swordsman', 'spearman', 'archer', 'heavy'] },
  ambush: { name: 'Ambush: shinobi in hiding', list: ['ninja!', 'ninja!', 'archer', 'swordsman'] },
  warband: { name: 'Warband: eight', list: ['swordsman', 'swordsman', 'spearman', 'spearman', 'archer', 'archer', 'heavy', 'ninja'] },
};
