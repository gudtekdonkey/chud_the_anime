// ---- Boot: `?iso` opens the new direction's vertical slice (src/iso/, docs/iso-slice.md); without it, today's game, untouched ----
// (a build embedded where no query reaches it sets window.__ISO_BOOT and passes the slice's parameters in the hash)
if (new URLSearchParams(location.search).has('iso') || window.__ISO_BOOT) import('./iso/main.js'); else import('./game.js');
