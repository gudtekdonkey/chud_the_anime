# chud_the_anime

A top-down pixel-art action game about a dark ronin. The look is inspired by Hyper Light Drifter and Penusbmic's DARK series, but every character and animation here is original.

## Run it

Needs Node 20.19 or newer.

```sh
npm install
npm run dev       # dev server, opens the game, reloads on save
npm run build     # dist/index.html: the whole game in one file
npm run preview   # serve the build
npm run check     # build, then a Playwright smoke test in Chromium
```

`dist/index.html` is self-contained: open it straight from disk, or zip it and upload it to itch.io as an HTML5 game. The design prototypes are copied to `dist/prototypes/`.

`npm run check` plays a key sequence against the build and fails on any page error or a missed state. Screenshots and the state log land in `test-output/`. It uses an installed Chromium (`PLAYWRIGHT_BROWSERS_PATH`); on a fresh machine run `npx playwright install chromium` once.

## Controls

Click the screen first.

| Key | Move |
|---|---|
| WASD / arrows | Run |
| Hold V | Walk (how he stands, walks and runs comes from the personality picked under the game) |
| J | Light-speed quick-draw; press again during the follow-through for the rising answer cut |
| Shift or L | Ground slide |
| Space | Jump |
| K | Glitch teleport |
| I | Tap: glitch double slash. Hold: Thousand Cuts (aim with the arrows while holding) |
| O | Hold and release: Crescent Moon, cast in place; the longer the hold, the bigger it is |
| P | Cross Rift: tap for a mid-size rift, hold to charge a bigger one |
| N | Mirror Meditation |
| U | Storm slam |
|  | Storm Chain turns on by itself for 8 s when the Qi meter fills |
| C | Sit cross-legged (any key gets him up) |
| X | Die (for testing) |

The "Room is clear" box under the game treats the training dummies as props, so after an attack he sheathes at once. On a touch screen, buttons appear under the game.

## Layout

- `index.html`: the page markup. `src/`: the game as ES modules (`main.js` boots it; `CLAUDE.md` has the full module map).
- `src/rig/`, `src/anims/`: the posable rig and every animation's poses, baked into sheets at load.
- `src/player/`: the state machine and the skills. `src/fx/`: the effect systems. `src/world/`: the room, dummies and rendering. `src/ui/`: the Qi meter, the skill bar, the moveset table and the sprite-strip tester.
- `prototypes/`: style studies, character rounds, UI ideas and test builds, numbered in the order they were made. Each is a standalone HTML file (`13-charged-i.html`: hold I to charge, keys 1–6 pick one of six variations).
- `docs/design-notes.md`: decisions made so far and what's next.
- `scripts/check.mjs`: the smoke test.

## Test a sprite strip

Under the game, choose a PNG strip (frames side by side in one row), pick the animation it replaces and its frame width. It swaps in at once; nothing leaves your browser.

## GitHub Pages

`.github/workflows/pages.yml` builds and deploys `dist/` on every push to `main`. Turn it on once in the repository's Settings → Pages, with Source set to **GitHub Actions**.
