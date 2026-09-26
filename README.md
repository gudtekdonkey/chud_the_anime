# chud_the_anime

A top-down pixel-art action game about a dark ronin. The look is inspired by Hyper Light Drifter and Penusbmic's DARK series, but every character and animation here is original.

## Run it

No build step. Open a file in a browser:

- `game/index.html` is the playable engine: a 480×270 screen, our ronin as a posable rig, and a training dummy.
- `prototypes/` holds the design pages in the order they were made. Each is a standalone HTML file.

## Controls (game/index.html)

Click the screen first.

| Key | Move |
|---|---|
| WASD / arrows | Run |
| J | Light-speed quick-draw; press again for the rising answer cut |
| Shift or L | Ground slide |
| Space | Jump |
| K | Glitch teleport |
| I | Glitch double slash |
| U | Storm slam |
| C | Sit cross-legged (any key gets him up) |
| X | Die (for testing) |

On a touch screen, buttons appear under the game.

## Layout

- `game/`: the engine, one self-contained HTML file.
- `prototypes/`: style studies, character rounds, and UI ideas.
- `docs/design-notes.md`: decisions made so far and what's next.
