// ---- Pose helpers: a pose is a flat object of joint angles; keyframes are eased between them ----
// angles in radians: limbs 0 = straight down, + swings forward; knee + folds the shin back; elbow + folds the forearm forward
const REST = { hx: 0, hy: 0, lean: .04, chest: 0, breath: 0, fl: [.1, .08], bl: [-.1, .04], fa: [.12, .18], ba: [-.08, .12],
  sword: null, bsword: null, sheathing: false, hat: 0, flutter: 0, bow: 0, dim: 0, neck: 0, bare: false, empty: false };
// bow: head dips forward; dim: eyes dimmed (meditation); neck: the head lolls (+ forward); bare: no hat or mantle (the samurai); empty: no sword at all
export const pz = o => ({ ...REST, ...o });
export const HILT = [.42, 1.0];          // front hand resting on the hilt at the hip
export const lerpP = (a, b, k) => { const o = {}; for (const key in a) {
  const x = a[key], y = b[key];
  o[key] = Array.isArray(x) ? x.map((v, i) => v + (y[i] - v) * k) : typeof x === 'number' && typeof y === 'number' ? x + (y - x) * k : k < .5 ? x : y; }
  return o; };
export const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, lin = k => k;
// sample eased keyframes [time, pose, easing?] into frames
export function keyed(keys, fps) {
  const n = Math.round(keys[keys.length - 1][0] * fps) + 1;
  return Array.from({ length: n }, (_, i) => { const t = i / fps; let j = 0;
    while (j < keys.length - 2 && keys[j + 1][0] <= t) j++;
    const [t0, a] = keys[j], [t1, b, e] = keys[j + 1];
    return lerpP(a, b, (e || ease)(Math.min(1, Math.max(0, (t - t0) / (t1 - t0))))); });
}
