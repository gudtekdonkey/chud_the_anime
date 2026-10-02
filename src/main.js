// ---- Boot: `?iso` opens the new direction's vertical slice (src/iso/, docs/iso-slice.md); without it, today's game, untouched ----
const Q = new URLSearchParams(location.search);
if (Q.has('iso')) import(Q.has('gear') ? './iso/gear/catalogue.js' : './iso/main.js'); else import('./game.js');   // ?iso&gear: the gear catalogue
