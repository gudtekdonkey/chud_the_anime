import { OX, OY, RC, PX } from '../config.js';
// one hand-drawn pixel: a PX block, rows counted up from the bottom row at bottom (in screen pixels)
const cell = (g, x, y, bottom, rowsN) => g.fillRect(x, bottom + (y - rowsN + 1) * PX, PX, PX);
import { pz } from '../rig/pose.js';

// ---- Hand-drawn frames: the views the side-on rig cannot pose (opened to the camera, sitting with his back to it) ----
// opened to the camera: hand-drawn front view, 28 wide, mantle thrown back, blade hanging point-down from one hand
export const OPEN_FRONT = [
  '...........GGGGGG...........', '........GGGHHHHHHGGG........', '.....GGHHHHHHHHHHHHHHGG.....', '....GBBBBBBBBBBBBBBBBBBG....', '.....KBBBBBBBBBBBBBBBBK.....',
  '..........KKKKKKKK..........', '..........KKEKKEKK..........', '...........KKKKKK...........', '.......mMMMKKKKKKMMMm.......', '......mMMMMKDKKDKMMMMm......',
  '.....MMMMK.KDKKDK.KMMMM.....', '.....MMM.K.KKKKKK.K.MMM.....', '.....MM..K.KKDDKK.K..MM.....', '.....M...K.KKKKKK..K..M.....', '....M...K..DDDDDD..K...M....',
  '....M..SK..KKKKKK...K..M....', '......W....KKKKKK...........', '.....W.....KKKKKK...........', '....W.....KKK..KKK..........', '...W.....KKK....KKK.........',
  '..W.....KKK......KKK........', '.W.....KKK........KKK.......', '......KKK..........KKK......', '.....KKKK..........KKKK.....'];
export const INVITE_FRONT = OPEN_FRONT.map((r, y) => { const a = [...r];
  if (y >= 10 && y <= 15) for (let x = 18; x <= 21; x++) if (a[x] === 'K') a[x] = '.';
  for (const x of ({ 10: [18, 19], 11: [20, 21], 12: [22, 23], 13: [24] })[y] || []) a[x] = 'K';
  if (y === 12) a[24] = 'D'; return a.join(''); });
// another weapon's art swaps the katana's pixels (S, W) for its own front view (art.front: [x, y, colour] in these rows)
export function frontFrame(g, fx, list, i, art) {
  const b = [0, 0, 0, 1, 1, 1, 1, 0][i % 8], lift = i === 5 || i === 6, prop = art && art.front;
  list.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '.' || (prop && (ch === 'S' || ch === 'W'))) return;
    let xx = x; if (lift && (ch === 'M' || ch === 'm') && y >= 11) xx += x < 14 ? -1 : 1;
    g.fillStyle = RC[ch]; cell(g, fx + OX + (xx - 14) * PX, y + (y < 14 ? b : 0), OY, list.length); }));
  if (prop) for (const [x, y, ch] of prop) { g.fillStyle = RC[ch]; cell(g, fx + OX + (x - 14) * PX, y + (y < 14 ? b : 0), OY, list.length); }
}

// Sitting, back to the camera, cross-legged like a monk. Hand-drawn rows, 20 wide. A frame that returns a pose is left to the rig.
const SIT_UP = [
  '.......GGGGGG.......', '....GGHHHHHHHHGG....', '.GGHHHHHHHHHHHHHHGG.', 'GBBBBBBBBBBBBBBBBBBG', '.KBBBBBBBBBBBBBBBBK.',
  '......KKKKKKKK......', '......KKKKKKKK......', '.......KKKKKK.......',
  '.....mMMMMMMMMm.....', '....mMMMMMMMMMMm....', '....MMMMMMMMMMMM....', '....MMMMMMMMMMMM....',
  '.....MMM.MM.MMM.....', '.....KKKKKKKKKK.....', '.....KKKDDDDKKK.....'];
const SIT_LEGS = ['..KKKKKKKKKKKKKKKK..', '.KKKKDDKKKKDDKKKKKK.', '..KKKKKKKKKKKKKKKK..'];
const KATANA_DOWN = [[16, 17, 'S'], [17, 17, 'W'], [18, 17, 'W'], [19, 17, 'W']];
const STAND_BACK = [
  '.......GGGGGG.......', '....GGHHHHHHHHGG....', '.GGHHHHHHHHHHHHHHGG.', 'GBBBBBBBBBBBBBBBBBBG', '.KBBBBBBBBBBBBBBBBK.',
  '......KKKKKKKK......', '......KKKKKKKK......', '.......KKKKKK.......',
  '.....mMMMMMMMMm.....', '....mMMMMMMMMMMm....', '....MMMMMMMMMMMM....', '....MMMMMMMMMMMM....',
  '.....MMM.MM.MMM.....', '.....K.KKKKKK.K.....', '.....K.KKKKKK.K.....', '.......DDDDDD.......',
  '.......KKKKKK.......', '......KKKKKKKK......', '......KKK..KKK......', '.......KK..KK.......',
  '.......KK..KK.......', '.......KK..KK.......', '.......KK..KK.......', '......KKK..KKK......'];
function rows(g, fx, list, bottom, extra = []) {
  bottom = OY + (bottom - OY) * PX;   // bottom: OY, or OY - 1 for the seated breath, in the rig's own pixels
  list.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') { g.fillStyle = RC[ch]; cell(g, fx + OX + (x - 10) * PX, y, bottom, list.length); } }));
  for (const [x, y, ch] of extra) { g.fillStyle = RC[ch]; cell(g, fx + OX + (x - 10) * PX, y, bottom, list.length); }
}
// art.sit: another weapon laid beside him instead of the katana, [x, y, colour] like SWORD_DOWN
export function sitFrame(g, fx, name, i, art) {
  const SWORD_DOWN = (art && art.sit) || KATANA_DOWN;
  if (name === 'standUp') {
    if (i === 0) return rows(g, fx, [...SIT_UP, ...SIT_LEGS], OY - 1, SWORD_DOWN);
    if (i === 1) return rows(g, fx, [...STAND_BACK.slice(0, 16), '......KKKKKKKK......', '.....KKK....KKK.....', '....KKK......KKK....', '...KKKK......KKKK...'], OY);
    if (i === 2) return rows(g, fx, STAND_BACK, OY);
    return pz(art ? { fa: [.3, .5], wp: art } : { fa: [.3, .5] });   // back on the rig: the sheet poses (and dresses) this one
  }
  if (name === 'sitDown') {
    if (i === 0) return rows(g, fx, STAND_BACK, OY);
    if (i === 1) return rows(g, fx, [...STAND_BACK.slice(0, 16), '......KKKKKKKK......', '.....KKK....KKK.....', '....KKK......KKK....', '...KKKK......KKKK...'], OY);
    if (i === 2) return rows(g, fx, [...SIT_UP, ...SIT_LEGS], OY - 1, SWORD_DOWN);
    return rows(g, fx, [...SIT_UP, ...SIT_LEGS], OY, SWORD_DOWN);
  }
  // seated breath: the back and shoulders rise a pixel, slowly; the hips and legs stay put
  const up = [0, 0, 0, 1, 1, 1, 1, 0][i];
  const body = up ? [...SIT_UP.slice(0, 14), SIT_UP[13], SIT_UP[14]] : SIT_UP;
  rows(g, fx, [...body, ...SIT_LEGS], OY, SWORD_DOWN.map(([x, y, c]) => [x, y + up, c]));
}
