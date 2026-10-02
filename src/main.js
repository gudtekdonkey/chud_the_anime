// ---- Boot: `?iso` opens the new direction's vertical slice (src/iso/, docs/iso-slice.md); without it, today's game, untouched ----
if (new URLSearchParams(location.search).has('iso')) import('./iso/main.js'); else import('./game.js');
