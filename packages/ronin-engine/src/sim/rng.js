// ---- Seeded randomness: the same world seed always makes the same world, and every system draws from its own stream ----
// hash(...parts): a 32-bit hash of strings and numbers. rng(seed): a small fast generator (mulberry32) with helpers.
// rngFor(seed, ...keys): the stream for one purpose ("zone", x, y) or ("day", 123, "economy"), independent of every other.
export function hash(...parts) {
  let h = 2166136261 >>> 0;
  for (const p of parts) { const s = String(p); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } h ^= 0x9e37; h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
export function rng(seed) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const r = {
    next, range: (lo, hi) => lo + next() * (hi - lo), int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    chance: p => next() < p, pick: arr => arr[Math.floor(next() * arr.length)],
    // pairs: [[item, weight], ...]
    weighted: pairs => { let t = 0; for (const [, w] of pairs) t += w; let x = next() * t; for (const [v, w] of pairs) if ((x -= w) < 0) return v; return pairs[pairs.length - 1][0]; },
    shuffle: arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
  };
  return r;
}
export const rngFor = (seed, ...keys) => rng(hash(seed, ...keys));
