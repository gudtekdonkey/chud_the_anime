// ---- Boot: `?iso` opens the new direction's vertical slice (src/iso/, docs/iso-slice.md); without it, today's game, untouched ----
// (a build embedded where no query reaches it sets window.__ISO_BOOT and passes the slice's parameters in the hash)
const Q = new URLSearchParams(location.search || (window.__ISO_BOOT ? location.hash.replace(/^#/, '') : ''));
if (Q.has('iso') || window.__ISO_BOOT) import(Q.has('gear') ? './iso/gear/catalogue.js' : './iso/main.js'); else import('./game.js');   // ?iso&gear: the gear catalogue
