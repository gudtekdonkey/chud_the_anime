import { sprite, psprite, disc } from './sprites.js';

// ---- 16x16 inventory icons (from prototypes/20-items.html) ----
const coinShade = (r) => (d, dx, dy) => d > r - 1 ? 'K' : dx + dy > 2.5 ? 'L' : dx + dy < -3.5 ? 'W' : 'l';
export const ICON = {
  shrine: sprite('i-shrine', ['................', '......KKKK......', '....KKLLLLKK....', '..KKLggggggLKK..', 'KKLggggggggggLKK', '.KKKKKKKKKKKKKK.', '..KlKkkkkkkKlK..', '..KlKkkBBkkKlK..',
    '..KlKkBCCBkKlK..', '..KLKkBCwBkKLK..', '..KLKkkCCkkKLK..', '..KLKkkkkkkKLK..', '.KKKKKKKKKKKKKK.', '.KllllllllllllK.', '.KggggggggggggK.', '.KKKKKKKKKKKKKK.']),
  nodachi: sprite('i-nodachi', ['...............W', '..............Wl', '.............Wl.', '............Wl..', '...........Wl...', '..........Wl....', '.........Wl.....', '........Wl......',
    '.......Wl.......', '...K..Wl........', '...KKLl.........', '....LLLK........', '...KgKKK........', '..KgKC..........', '.KgK.CC.........', '.KK...C.........']),
  katana: sprite('i-katana', ['................', '..............W.', '.............Wl.', '............Wl..', '...........Wl...', '..........Wl....', '.........Wl.....', '........Wl......',
    '.......Wl.......', '....K.Wl........', '....KLl.........', '.....LLK........', '....KgK.........', '...KgK..........', '..KgK...........', '..KK............']),
  chest: sprite('i-chest', ['................', '................', '.KKKKKKKKKKKKKK.', '.KLLLLLPPLLLLLK.', '.KgggggPCgggggK.', '.KGGGGGPPGGGGGK.', '.KKKKKKPPKKKKKK.', '.KgggggPCgggggK.',
    '.KgLgggPPgggLgK.', '.KgggggPCgggggK.', '.KGGGGGPPGGGGGK.', '.KLGGGGPPGGGGLK.', '.KggggggggggggK.', '.KKKKKKKKKKKKKK.', '..KK........KK..', '................']),
  tablet: sprite('i-tablet', ['....KKKKKKKK....', '...KllllllllK...', '...KlgggggggK...', '...KlgCCgCggK...', '...KlggCgCCgK...', '...KlgggggggK...', '...KlgCgCCggK...', '...KlgCCgCggK...',
    '...KlgggggggK...', '...KlggCCgCgK...', '...KlgCggCggK...', '...KlggggggGK...', '..KKGGGGGGGGKK..', '.KGGGGGGGGGGGGK.', '.KKKKKKKKKKKKKK.', '................']),
  qi: psprite('i-qi', 16, 16, put => { disc(put, 8, 8, 5, d => d > 4.1 ? 'c' : d > 3 ? 'C' : d > 1.6 ? 'B' : 'w'); put(2, 3, 'B'); put(13, 12, 'B'); put(13, 3, 'c'); put(3, 13, 'c'); }),
  rice: sprite('i-rice', ['................', '................', '.......KK.......', '......KWWK......', '.....KWwWWK.....', '.....KWWWWK.....', '....KWWWWWlK....', '....KWlWWWlK....',
    '...KWWWWWlWlK...', '...KWWWWWWWlK...', '..KWWKKKKKWllK..', '..KWlKDDDKlllK..', '..KllKDDDKlllK..', '..KKKKKKKKKKKK..', '................', '................']),
  mon: psprite('i-mon', 16, 16, put => { disc(put, 10.5, 6, 4.6, coinShade(4.6)); disc(put, 6.5, 9.5, 5.6, coinShade(5.6));
    for (const [x, y] of [[6, 9], [7, 9], [6, 10], [7, 10]]) put(x, y, 'K'); put(5, 8, 'L'); put(8, 8, 'L'); put(3, 6, 'w'); }),
  shard: sprite('i-shard', ['........K.......', '.......KBK......', '.......KBCK.....', '......KBwCK.....', '......KBwCcK....', '.....KBwBCcK....', '...KKBwBCCcK....', '.....KBBCCcK....',
    '.....KBCCcK.....', '......KCccK.....', '....KKCcK.......', '......KcK.......', '.......K........', '................', '..B.........C...', '................']),
  bomb: sprite('i-bomb', ['...........B....', '..........BwB...', '...........C....', '..........K.....', '.........K......', '......KKKK......', '....KKGGGGKK....', '...KGLgGGGGGK...',
    '..KGLgGGGGGGGK..', '..KGgGGGGGGGGK..', '..KGCGCGCGCGGK..', '..KGGGGGGGGGGK..', '..KGGGGGGGGGDK..', '...KGGGGGGGDK...', '....KKGGGGKK....', '......KKKK......']),
  talisman: sprite('i-talisman', ['.....KKKKKK.....', '.....KPPPPK.....', '.....KPPPCK.....', '.....KPPCPK.....', '.....KPCPPK.....', '.....KPCCCK.....', '.....KPPCPK.....', '.....KPCPPK.....',
    '.....KCPPPK.....', '.....KPPPpK.....', '.....KPKKpK.....', '.....KPKKpK.....', '.....KPPPpK.....', '.....KPpPpK.....', '......KpKpK.....', '.......K.K......']),
  whetstone: sprite('i-whet', ['................', '................', '..C.............', '.cB.............', '..c........KKK..', '.........KKlLLK.', '.......KKlLLLgK.', '.....KKlLLLLggK.',
    '...KKlLLLLLggK..', '.KKlLLLLLLggK...', 'KlLLLLLLLggK....', 'KLLLLLLLggK.....', 'KggggggggK......', 'KKKKKKKKK.......', '................', '................']),
  incense: sprite('i-incense', ['........l.......', '.......l....l...', '.......l...l....', '....l...l..l....', '....l..l....l...', '.....l.B...B....', '....B..C...C....', '....C..g...g....',
    '....g..g...g....', '....g..g...g....', '..KKgKKgKKKgKK..', '.KLllllllllllLK.', '.KLLLLLLLLLLLLK.', '..KggggggggggK..', '...KKKKKKKKKK...', '................']),
  bead: sprite('i-bead', ['................', '................', '......KKKK......', '.....KCBBCK.....', '....KCBwwBCK....', '....KCBwBCCcK...', '....KCCCCCCcK...', '....KcCCCCccK...',
    '.....KccccccK...', '......KKKcccK...', '........KccK....', '.......KccK.....', '......KcKK......', '......KK........', '...B........B...', '................']),
  mirror: psprite('i-mirror', 16, 16, put => { disc(put, 8, 7, 6.5, (d, dx, dy) => d > 5.6 ? 'K' : d > 4.6 ? 'L' : dx + dy < -2 ? 'W' : 'l');
    for (const [x, y] of [[5, 2], [6, 3], [6, 4], [7, 5], [8, 6], [8, 7], [9, 8], [10, 9], [10, 10], [6, 7], [5, 8]]) put(x, y, 'K');
    put(4, 4, 'C'); put(4, 5, 'C'); put(5, 3, 'B'); for (let y = 13; y < 16; y++) { put(7, y, 'g'); put(8, y, 'L'); put(6, y, 'K'); put(9, y, 'K'); } put(7, 15, 'K'); put(8, 15, 'K'); }),
  bell: sprite('i-bell', ['.......KK.......', '.......KK.......', '......KggK......', '.....KgLLLK.....', '....KgLWLLLK....', '....KgLWLLLK....', '....KgLLLLLK....', '...KgLLLLLLgK...',
    '...KgLLLLLLgK...', '..KllllllllllK..', '..KKKKKKKKKKKK..', '......KCCK......', '.......BB.......', '......KPPK......', '......KPPK......', '......KpPK......']),
  tsuba: psprite('i-tsuba', 16, 16, (put, rows) => { disc(put, 8, 8, 7, (d, dx, dy) => d > 6.1 ? 'K' : d > 5.2 ? (dx + dy < 0 ? 'l' : 'L') : dx + dy < -3 ? 'g' : 'G');
    for (let y = 5; y < 11; y++) { put(7, y, 'K'); put(8, y, y > 5 && y < 10 ? 'K' : 'D'); } put(4, 8, 'K'); put(11, 8, 'K');
    put(8, 2, 'C'); put(8, 13, 'C'); put(2, 8, 'C'); put(13, 8, 'C');
    // the crack: the right half drops a pixel
    const crack = [9, 10, 9, 10, 11, 10, 9, 10, 11, 10, 9, 10, 9, 10, 9, 9];
    for (let y = 15; y >= 1; y--) { const cx = crack[y]; for (let x = 15; x > cx; x--) rows[y][x] = rows[y - 1][x]; rows[y][cx] = rows[y][cx] === '.' ? '.' : 'K'; } }),
  crane: sprite('i-crane', ['................', '........K.......', '.......KPK......', '......KPPpK.....', 'K.....KPPpK.....', 'PK...KPPPPpK..K.', 'KPK..KPPPPpK.KP.', '..PK.KPPPPpKKPK.',
    '...PKPPPPPPpPK..', '....PPPPPPPPpK..', '....KpPPPPPppK..', '.....KppppppK...', '......KKKKKK....', '................', '................', '................']),
  knot: sprite('i-knot', ['................', '.....KKKK.......', '....KLCLLK......', '...KLK..KLK.....', '...KCK..KCK.....', '...KLK..KLK.....', '....KLLCLK......', '.....KLLK.......',
    '....KLKKLK......', '...KLK..KLK.....', '..KCK....KCK....', '..KLK.....KLK...', '..KLK......KLK..', '..KCK.......KC..', '..KK.........K..', '................']),
};
