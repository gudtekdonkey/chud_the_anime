# Instructions for the next session

Read this first, then `CLAUDE.md`, then `docs/handoff-2026-10-03.md`.

## The project

`gudtekdonkey/chud_the_anime` is a pixel-art action game about a dark ronin, written in plain JavaScript on Vite. It has two lines:

- **Today's 2D game** at `/`. Its code is under `src/` (everything outside `src/iso/`).
- **The new direction** at `?iso`, under `src/iso/`. It is a 3D-rendered-to-pixel Iron Ash ronin in a night courtyard, using the Sea of Stars camera. It has:
  - the Animation Flow moves
  - the four styles: Painterly (the default), Pixel-render, Anime limited and Toon + dither
  - enemies, the squad AI, skills, 15 weapons, gore, gear, hair, idles and personality
  - the rest of the game, ported over

`main` is at 487eb0c. Every child branch is merged into it. Develop on the branch your session is assigned. When the owner says "push and merge to main", fast-forward `origin/main` to your branch, and only once the checks pass.

## Your first task

Confirm `npm run check:iso` passes **twice in a row** on main. A run takes about 20 minutes.

- On the final code, it last passed every step up to "skills: in every style".
- These steps have not been run on the final code yet: the pixel look, power III, the 15 weapons, the executions, the squad battle (`check-iso-squad.mjs`) and the port (`check-iso-port.mjs`).
- When a step fails, find its cause. After the merge, failures have mostly been waits that should use the game's clock instead of the wall clock, or setups that slipped. Fix the cause in the test or in the game. Two of the failures were real game bugs.
- Never skip, weaken or delete a step. Never steer the game through `window.__iso` / `window.__game`; those hooks are read-only.
- Commit and push after each fix, because the container can restart and lose uncommitted work.
- Save run logs to your scratchpad. Never read a check's full output into context; grep it for `FAIL` and `ok`.

Then run `npm run check`, `check:hd`, `check:gear`, `check:hair` and `node scripts/sim-smoke.mjs 1 5`, report the results, and push.

## Waiting on the owner (ask, don't decide)

`docs/handoff-2026-10-03.md` → "Open owner decisions":

1. Armour: the Torso slot, the stat scaling, and whether the default look is procedural or built from gear.
2. Hair: the styles and hats.
3. The lantern ash pickup's look.
4. Where the 39.5° body view and the upright body view are each used.
5. The executions review picks.

## How the owner works

- **Design goes to an artifact before code.** Show the current state, then options A/B/C drawn for real, one marked Recommended, and a picks line the owner can copy (`Thing: 1B 2A`). Nothing in code changes until the owner picks.
- **Record every owner decision**, quoted, in `docs/design-notes.md`.
- **Tuning numbers, colours and timings change only on purpose.** The Animation Flow page's moves are the approved ones. Change them there first, or mark an addition in `moves-extra.js` (or `skills/moves.js`).
- **Parallel work goes to separate cloud sessions** (create_session, one `outcome_branch` each). The owner says "own session" for this.
- **Merge one branch at a time**, keep both sides' features and docs, and run the checks after each merge.
- **ETAs must be honest.** The owner asks often. Look at the real state (git log, the run logs) before answering. If an estimate slips, say so and say why.
- **Keep replies short and plain.** The owner writes fast and informally, with typos. Read for intent.

## Rules that bite

- Pin dependencies exactly. Never run `playwright install`; the Chromium build is already at `PLAYWRIGHT_BROWSERS_PATH`.
- Nothing in `src/iso/` is imported by today's game. See CLAUDE.md for the few of today's modules the slice may import.
- `src/iso/ai/` and the engine half of `src/iso/squad/` stay free of three.js and the DOM.
- Gear is data rows, and hair and hats go through the head-slot contract. Run `check:gear` / `check:hair` after touching either.
- Every new move gets an `ANIMS` row with an `about` text. Every new key gets a check step.
- No model names in commits, code or docs.
