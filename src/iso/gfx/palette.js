// ---- The slice's palette: every pixel of the picture snaps to one of these (the "palette" step). From Iron Ash V3
// (iron-ash-face: the iron, indigo, straw and samurai ramps), the game's cyan, and The Last Night's night and lanterns.
export const RAMP = {
  k: ['#060709', '#0c0d11', '#14171c', '#1b1e25'],                                                     // near-blacks
  i: ['#16181b', '#1e2124', '#272a2e', '#313539', '#3d4146', '#4b4f54', '#5c5f63', '#727476', '#8d8e8e', '#a9a8a4', '#c7c9c6'], // iron
  c: ['#18191c', '#1f2023', '#27282b', '#303134', '#3a3b3e', '#46474a'],                               // undyed dark cloth
  v: ['#101219', '#151823', '#1b1f2d', '#222738', '#2a3044', '#333a51', '#3e465f', '#4a536e', '#58627f', '#6f7a98'], // indigo
  m: ['#2c2618', '#453b24', '#625433', '#837146', '#a8915c', '#c8b07a'],                               // straw
  y: ['#52e8d6', '#6ff3e4', '#b8fff6', '#ffffff'],                                                    // cyan, the hero's light
  b: ['#1a0f10', '#261517', '#331c1e', '#412426', '#4f2c2e', '#5e3537', '#6e4042', '#804c4d', '#935a5a', '#a86c6a', '#bd8380'], // the samurai
  l: ['#5a1f1a', '#7a2a22', '#9a3a2c', '#b84c36', '#ff5a4a'],                                          // red lacquer, his eye
  n: ['#0b0e14', '#10141c', '#151a24', '#1b212d', '#222a37', '#2b3443', '#354052', '#414d62', '#4f5c73', '#63708a'], // night stone
  w: ['#1f1510', '#33201a', '#4d2c1d', '#6e3a20', '#94502a', '#b8602a', '#e08a3a', '#ffb36a', '#ffd29a', '#fff0d0'], // lantern light
  g: ['#1d2633', '#27324a', '#3a4660', '#56637d'],                                                     // fog
  f: ['#1c1f16', '#262b1d', '#323a26'],                                                                // moss between the stones
};
export const hex = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
export const PALETTE = Object.values(RAMP).flat().map(hex);
