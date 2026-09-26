import { rr } from '../fx/util.js';
import { pool, drip } from '../fx/blood.js';
import { newBody, stepBody, thudBody, eyeDark } from '../world/enemy-body.js';
import { smoothAt, lying } from './enemy-poses.js';
import { updatePieces, lowest, EYE_ON, EYE_OFF } from './pieces.js';
import { F, wx } from './stage-fx.js';

// ---- The deaths pass on an execution's stage (from prototypes/28 to 31): the enemy is a body, not a puppet ----
// His executions still pose him by keys; here those keys are read as smooth curves and every joint chases them on the samurai's
// spring body (world/enemy-body.js), so he flows through his poses, goes limp as he goes down, and hits the floor with weight
export const SETTLE = 2;   // how long the body keeps moving after the execution is done: the landing, the twitches, the eye going out
const clp = (v, a, b) => Math.min(b, Math.max(a, v));
export const stageBody = E => { E.body = newBody(E.pose); };
export function stepStageBody(St, dt) {
  const E = St.E, b = E.body, raw = E.pose, tgt = { ...(raw.keys ? smoothAt(raw.keys, raw.t) : raw), noHead: raw.noHead, noUpper: raw.noUpper, empty: raw.empty };
  // the trunk hitting the floor: the hips or the chest were coming down fast and now they have stopped
  const T = { hy: tgt.hy, l: tgt.lean || 0 };
  if (dt > 0 && b.pT) { const vy = (T.hy - b.pT.hy) / dt, vl = Math.abs(T.l - b.pT.l) / dt;
    if (b.pv && lying(tgt) && ((b.pv.hy > 14 && vy < b.pv.hy * .3) || (b.pv.l > 2 && vl < b.pv.l * .3))) thud(St, tgt, Math.max(b.pv.hy / 40, b.pv.l / 5));
    b.pv = { hy: vy, l: vl }; }
  if (dt > 0) b.pT = T;
  stepBody(b, tgt, dt);
  E.dark = eyeDark(b);
}
// the trunk stops dead; the arms slap down, the head knocks, dust comes up, and the blood starts to spread under him
function thud(St, tgt, speed) {
  const E = St.E, b = E.body;
  if (b.t - (b.lastThud ?? -9) < .14) return; b.lastThud = b.t;
  const first = b.thudT, k = clp(speed, .4, 1.4);
  thudBody(b, tgt, k); if (first != null) b.thudT = first;   // the twitches and the eye count from the first landing
  F.dust(St, E.x, E.y, Math.round(4 + 6 * k)); St.shake = Math.max(St.shake, .03 + .03 * k);
  F.ring(St, E.x, E.y + 1, 2, 1, .12, 4 + 3 * k);
  if (!b.pooled) { b.pooled = true; pool(wx(St, E.x + rr(-3, 3)), E.y + 1, rr(3.5, 5.5)); }
}
// pieces land with weight: dust and blood where they fall, a trail while they fly; the eye in a severed head goes out
export function updateStagePieces(St, dt) {
  const h0 = new Map(St.pieces.map(P => [P, P.z - lowest(P)]));
  updatePieces(St, dt);
  for (const P of St.pieces) {
    P.age = (P.age || 0) + dt; const n = P.pts.length, hb = h0.get(P);
    if (!P.landed && hb != null && hb > .6 && P.z - lowest(P) <= .3) { P.landed = true;
      F.dust(St, P.x, P.fy, clp(Math.round(n / 14), 2, 10)); if (n > 60) St.shake = Math.max(St.shake, .04);
      if (n > 12) pool(wx(St, P.x + rr(-2, 2)), P.fy + 1, clp(n / 40, 1.5, 4.5)); }
    if (!P.landed && n > 20 && P.age < .9 && Math.random() < .5) drip(wx(St, P.x), P.fy, P.z);
    if (P.age > .35 && !P.eyeOut && (P.age > .6 || (P.age * 30 | 0) % 3 === 0)) { P.eyeOut = P.age > .6;
      for (const q of P.pts) if (q[2] === EYE_ON) q[2] = EYE_OFF; }
  }
}
