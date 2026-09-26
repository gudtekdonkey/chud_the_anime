import { sprite, psprite, disc } from '../ui/sprites.js';

// ---- World sprites at game scale (from prototypes/20-items.html) ----
export const WS = {
  shrine: sprite('w-shrine', ['......KKK......', '....KKLLLKK....', '..KKLgggggLKK..', 'KKLgggggggggLKK', '.KKKKKKKKKKKKK.', '..KlKkkkkkKlK..', '..KlKkkkkkKlK..', '..KLKkkkkkKLK..',
    '..KLKkkkkkKLK..', '.KKKKKKKKKKKKK.', '.KlllllllllllK.', '.KgggggggggggK.', '.KKKKKKKKKKKKK.']),
  blade: sprite('w-blade', ['......K..', '.....KgK.', '.....KgK.', '.....KgK.', '....KLLLK', '.....lW..', '.....lW..', '.....lW..', '....lW...', '....lW...', '....lW...',
    '....lW...', '...lW....', '...lW....', '...lW....', '..KlWK...', '.KgGGgK..', 'KgGGGGgK.']),
  mound: sprite('w-mound', ['..KkkK...', '.KgGGgK..', 'KgGGGGgK.']),
  chest: sprite('w-chest', ['.KKKKKKKKKKKK.', 'KLLLLLPPLLLLLK', 'KgggggPCgggggK', 'KKKKKKPPKKKKKK', 'KgggggPCgggggK', 'KgLgggPPgggLgK', 'KgggggPCgggggK', 'KGGGGGPPGGGGGK',
    'KggggggggggggK', 'KKKKKKKKKKKKKK', '.KK........KK.']),
  tablet: sprite('w-tablet', ['...KKKKKKK...', '..KlllllllK..', '.KlggggggggK.', '.KlgxxgxgggK.', '.KlggxgxxggK.', '.KlggggggggK.', '.KlgxgxxgggK.', '.KlgxxgxgggK.', '.KlggggggggK.',
    '.KlggxxgxggK.', '.KlgxggxgggK.', '.KlggggggggK.', '.KlggggggGGK.', 'KKGGGGGGGGGKK', 'KGGGGGGGGGGGK', 'KKKKKKKKKKKKK']),
  rice: sprite('w-rice', ['...K...', '..KWK..', '.KWwWK.', '.KWWlK.', 'KWKDKlK', 'KKKKKKK']),
  coin: sprite('w-coin', ['.KKK.', 'KlWlK', 'KlKLK', 'KllLK', '.KKK.']),
  shard: sprite('w-shard', ['.K.', 'KBK', 'KwC', 'KBC', 'KCc', '.Kc', '..K']),
  bomb: sprite('w-bomb', ['....B.', '...K..', '..K...', '.KKK..', 'KLgGK.', 'KGGGK.', '.KKK..']),
  talisman: sprite('w-talisman', ['KKK', 'KPK', 'KCK', 'KPK', 'KCK', 'KpK', 'KKK']),
  whet: sprite('w-whet', ['.KKKKK.', 'KlLLLgK', 'KKKKKKK']),
  incense: sprite('w-incense', ['KKKKKKK.', 'KggggggC', 'KKKKKKK.']),
  bead: sprite('w-bead', ['.KKK.', 'KCBCK', 'KBwCK', 'KCCcK', '.KKcK', '...K.']),
  mirror: psprite('w-mirror', 7, 8, put => { disc(put, 3.5, 3.5, 3.5, (d, dx, dy) => d > 2.6 ? 'K' : dx + dy < -1 ? 'W' : 'l'); put(3, 2, 'K'); put(4, 3, 'K'); put(2, 4, 'C'); put(3, 6, 'K'); put(3, 7, 'g'); }),
  bell: sprite('w-bell', ['..K..', '.KLK.', '.KWK.', 'KLLLK', 'KKKKK', '..C..', '..P..']),
  tsuba: psprite('w-tsuba', 7, 7, put => { disc(put, 3.5, 3.5, 3.5, (d, dx, dy) => d > 2.6 ? 'K' : dx + dy < 0 ? 'l' : 'L'); put(3, 2, 'K'); put(3, 3, 'K'); put(3, 4, 'K'); put(4, 5, 'K'); put(3, 0, 'C'); }),
  crane: sprite('w-crane', ['...K...', 'K.KPK.K', 'PKPPpKP', '.KPPPK.', '..KKK..']),
  crane2: sprite('w-crane2', ['.......', 'K.....K', 'PKKPKKP', '.KPPPK.', '..KKK..']),
  knot: sprite('w-knot', ['.KKK.', 'KC.CK', '.KLK.', 'KLKLK', 'C...C', 'K...K']),
};
// the chest split at the seal, for the lid that pops on the sheath click
export const chestLid = sprite('w-lid', WS.chest.rows.slice(0, 3).map(r => r.slice(0, 6) + r[5] + r[8] + r.slice(8)));
export const chestBody = sprite('w-cbody', WS.chest.rows.slice(3).map(r => r.slice(0, 6) + r[5] + r[8] + r.slice(8)));
// placeholder remains for Harvest (a fallen samurai's pieces and dropped blade) until real bodies from the enemies work call onKill
export const REMAINS = sprite('w-remains', ['.......RR...........', '......RrrR..........', '...RRRrrrrR.....RR..', '..RrrrrrrrR....RrrR.',
  '.RrrrrrrrrR...RrrrrR', '..RRRRRRRR.....RRRR.', '....lWWWWWWWWWLK....']);
