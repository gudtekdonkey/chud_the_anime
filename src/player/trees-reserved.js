// ---- The growth trees (1B, player/mastery.js) of the four skills the design reserved and the iso slice builds first:
// F counter, R Blade Recall, Q Lightning Chain, X Time Slice. Pure data with no imports, so both today's game
// (mastery.js spreads them into TREES; they are not in its SKILLS yet, so its kit screen and skill bar are unchanged)
// and the iso slice (src/iso/skills/kit.js) read the same trees. Proposed, pending the owner (docs/design-notes.md);
// the numbers are placeholders like the rest. Keys in mastery.js's MUL multiply (default 1), the rest add (default 0).
export const RESERVED_TREES = {
  counter: { rung: { name: 'LONG READ', about: 'The counter window is 0.05 s longer.', fx: { win: .05 } },
    a: { name: 'IRON WALL', about: 'A block staggers the attacker too.', deepAbout: 'And knocks him to a knee.', fx: { stag: 1 }, deep: { stag: 2 } },
    b: { name: 'BITE BACK', about: 'The counter cuts 50% harder.', deepAbout: 'Twice as hard, and each counter gives 15% Qi.', fx: { dmg: 1.5 }, deep: { dmg: 2, qi: .15 } } },
  recall: { rung: { name: 'LONG THROW', about: 'The blade flies 20% further.', fx: { dist: 1.2 } },
    a: { name: 'WIDE PATH', about: 'It cuts what is within half again as far of its path.', deepAbout: 'Twice as far.', fx: { reach: 1.5 }, deep: { reach: 2 } },
    b: { name: 'QUICK HAND', about: 'R cools down 25% sooner.', deepAbout: '50% sooner.', fx: { cd: .75 }, deep: { cd: .5 } } },
  chain: { rung: { name: 'ONE MORE LINK', about: 'The chain leaps to one more enemy.', fx: { hops: 1 } },
    a: { name: 'LONG ARC', about: 'Each leap reaches 30% further.', deepAbout: '60% further.', fx: { r: 1.3 }, deep: { r: 1.6 } },
    b: { name: 'HEAVY HAUL', about: 'The yank drags every linked enemy, not just the first.', deepAbout: 'And the draw-cut cuts 50% harder.', fx: { haul: 1 }, deep: { haul: 1, dmg: 1.5 } } },
  slice: { rung: { name: 'WIDE STILLNESS', about: 'The zone is 15% wider.', fx: { size: 1.15 } },
    a: { name: 'SECOND PASS', about: 'He cuts each one twice.', deepAbout: 'Twice, in a zone 15% wider still.', fx: { twice: 1 }, deep: { twice: 1, size: 1.15 } },
    b: { name: 'BORROWED TIME', about: 'It spends two thirds of the meter, not all of it.', deepAbout: 'Half the meter.', fx: { cost: .67 }, deep: { cost: .5 } } },
};
