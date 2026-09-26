// ---- Constants: the screen, the palette, the rig's frame ----
export const W = 480, H = 270;
export const COL = { body: '#15181c', mid: '#262b31', eye: '#6ff3e4', blade: '#f2f2f2', fx: '#52e8d6', fx2: '#b8fff6', core: '#ffffff', flash: '#e4fffb' };
// one rig frame: 48x48, his feet at (OX, OY)
export const FW = 48, FH = 48, OX = 24, OY = 40;
// the rig's palette: one letter per colour, shared by the rig and the hand-drawn rows
export const RC = { K: '#0c0d11', D: '#2c323b', M: '#1b1e25', m: '#30353e', H: '#2a2f37', G: '#3b424c', B: '#1a1d24',
  E: '#6ff3e4', e: '#2e6a64', W: '#e9eeee', S: '#7d868e', s: '#2c3037' };
export const SQ = .8; // SQ flattens circles into the top-down floor plane
