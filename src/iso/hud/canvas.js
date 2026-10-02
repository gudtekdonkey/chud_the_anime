// ---- The HUD's canvas: today's `#game` (480×270, the game's own pixels). Today's HUD pieces (ui/hud-kit.js, ui/pixfont.js,
// ui/icons.js) draw through screen.js's `g`, which grabs #game when it first loads; the slice hands it this canvas, so
// those pieces are imported as they are, never copied. This module must load before anything that imports screen.js.
// The pipeline lays the canvas over the finished frame (gfx/post.js setHud), after the clash and the letterbox.
if (!document.getElementById('game')) { const c = document.createElement('canvas'); c.id = 'game'; c.width = 480; c.height = 270; c.hidden = true; document.body.appendChild(c); }
