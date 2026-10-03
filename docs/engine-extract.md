# The shared engine (`gudtekdonkey/ronin-engine`)

The owner asked for it on 2026-10-03: "We should actually export all this shared gaming engine stuff that can be used in many games into shared repo." The pick was "Engine first": the engine is pulled out before two other games build on it. One is dust_the_western, a western on the same engine with guns. The other is a port of the animation and world systems into dealer_solana.

The design page is https://claude.ai/artifact/KdSDZk4UbMtxx4hbfpgtaS.

**Picks (owner 2026-10-03):** "3C 4B 5A 6C. The rest is as you recommend", which gives `1A 2A 3C 4B 5A 6C`. They are recorded, quoted, in `design-notes.md` "The shared engine".

The engine is staged in `packages/ronin-engine/` until the repo exists. Its README has the module map and how a game plugs in. CLAUDE.md "The shared engine" lists what moved where.

## Done (branch `claude/engine-extract`)

| Piece | State |
|---|---|
| 1A one package, subpath imports; three.js 0.186.1 a pinned optional peer | done |
| The core: flow and moves, the world clock, input, traits, personas, AI, the squad's engine half, the world sim | moved |
| 3C: the iso layer | moved. This covers the render pipeline and styles, the look seam, `Char`, the 3D rig, the pixel engine, effects, the close-up, the core loop (hero, foe, rules), the enemy framework, the squad bodies, combo prompts, touch, pathing, executions, blood, severing, both skill systems and the kit, gear and hair machinery, wielding |
| 5A guns | done: `fire` blocks on weapon rows, one shots module (the archer and the squad's arrows fly on it with their numbers), `fireFrom` / `reload`, no step-in for a ranged weapon |
| 4B packs | done: the Edo tables are in `sim/packs/edo/`, and `usePack` swaps them. Not yet packed: the travel lane's scenes and beasts and the story lane's chapters. They mix data with logic and the ledger, so they are next |
| The guard | done: `npm run golden` is unchanged across every move. The only accepted change is the source text `dust(` → `FX.dust(`, checked identical otherwise. `npm run check:engine` and `scripts/boot-smoke.mjs` round it out |

## Still to do

1. **check:iso twice on the final tree.** A run on the mid-split tree (through the weapons and shots move) passed 51 steps with no failure before this note was written. The other session's test fixes (`claude/iso-check-validation-zm4byh`) merge first.
2. **The travel scenes and the story chapters as pack tables (4B, second half).**
3. **2A: the move to the repo.** Once the owner has created `gudtekdonkey/ronin-engine`, `git filter-repo` carries `packages/ronin-engine/` across with its history. chud then takes it as a git submodule at `engine/` (`"ronin-engine": "file:engine"`).
4. **6C: dealer_solana's port.** That is its own session in its own repo:
   - swap its ledger, rng and trait mixer for the engine's
   - give it the Animation Flow engine through a third look: its SDF renderer behind the four calls, with an adapter from the flow's side pose to its skeleton
   - leave its picture as it is
