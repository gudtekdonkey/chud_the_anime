// ---- Constants: the screen, the palette, the rig's frame ----
export const W = 480, H = 270;
// PX: screen pixels per world pixel. ?hd draws every figure at 2x on a 960x540 canvas (the owner's bigger, more detailed ronin);
// the world keeps its 480x270 units, so movement, reach and ranges never change. snap rounds a world position to the pixel grid.
export const PX = typeof location !== 'undefined' && new URLSearchParams(location.search).has('hd') ? 2 : 1;
export const snap = v => Math.round(v * PX) / PX;
export const COL = { body: '#15181c', mid: '#262b31', eye: '#6ff3e4', blade: '#f2f2f2', fx: '#52e8d6', fx2: '#b8fff6', core: '#ffffff', flash: '#e4fffb' };
// one rig frame: 96x64, his feet at (OX, OY); roomy enough for the nodachi overhead and the yari at full thrust
export const FW = 96 * PX, FH = 64 * PX, OX = 48 * PX, OY = 56 * PX;   // in screen pixels
// the rig's palette: one letter per colour, shared by the rig and the hand-drawn rows
export const RC = { K: '#0c0d11', D: '#2c323b', M: '#1b1e25', m: '#30353e', H: '#2a2f37', G: '#3b424c', B: '#1a1d24',
  E: '#6ff3e4', e: '#2e6a64', W: '#e9eeee', S: '#7d868e', s: '#2c3037', T: '#806650',   // T: a spear's lacquered haft, warm so it reads against the grey floor
  // clothing: shades of black only, never a bright colour (the accents come from the effects and the eyes)
  r: '#1c2027', q: '#262b33', o: '#0f1115', w: '#9aa3aa', t: '#5b4838', g: '#566069',   // HD (?hd) detail: r the rim of light on his black, q a dark cord, o his hair, w a blade's back, t a haft's shaded side, g the glare off his hat
  c0: '#0f1115', c1: '#14171c', c2: '#1b1e25', c3: '#22262e', c4: '#2b2f38', c5: '#30353e', c6: '#3d424d' };
export const SQ = .8; // SQ flattens circles into the top-down floor plane
