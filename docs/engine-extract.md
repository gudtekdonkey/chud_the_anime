# The shared engine (`gudtekdonkey/ronin-engine`)

The owner asked for it on 2026-10-03: "We should actually export all this shared gaming engine stuff that can be used in many games into shared repo." The pick was "Engine first": the engine is pulled out before two other games build on it. One is dust_the_western, a western on the same engine with guns. The other is a port of the animation and world systems into dealer_solana.

The design page is https://claude.ai/artifact/KdSDZk4UbMtxx4hbfpgtaS. It covers what goes into the engine and what stays, the package shape, guns as weapons with a `fire` block and one projectile module, how this game keeps every number (a golden snapshot plus all the checks), and what fits dealer_solana. Recommended picks: `Engine: 1A 2A 3B 4A 5A 6A`.

**Status:** waiting for the owner's picks. No code has moved yet. Until `gudtekdonkey/ronin-engine` exists, the engine is staged under `packages/ronin-engine/` on `claude/engine-extract`.
