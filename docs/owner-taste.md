# The owner's taste, from every round so far (read before designing anything)

- Game: top-down pixel-art action game at 480x270, a dark ronin in a straw hat. Palette: near-black bodies, cyan #6ff3e4 / #52e8d6 / #b8fff6 and white effects on a muted grey floor #474c4a. Enemies are samurai built exactly like him (same rig) but bare-headed with a topknot, darker red-grey, red eye. Everything is 1px pixel art: no blur, no anti-aliasing (alpha fades are fine).
- "Dramatic yet controlled": a ~2-frame white whole-body flash on impact, a short hit pause, a small screen shake. Never messy.
- Brutal and QUICK. Never drawn out. Short wind-ups.
- Show only the KEY frames of a fast action, but every frame you do show must accurately reflect momentum: leaning into where he is going and where he has just been, hips and chest driving, follow-through. Chaotic in the middle ("he's up and then you're back down"), abstract rather than showing every motion.
- Kills: the enemy is cut into real pieces (cut from his own pixels) that tumble and fall. Falls that should be heavy and smooth use eased scripted motion, not bouncy physics (the owner asked for a smoother fall once).
- Endings: the ronin holds the final pose, resheathes, and the kill/finisher lands on the sheath click.
- He keeps the katana sheathed unless attacking.
- Things he loved: afterimages left where he was, the glitch teleport slivers, the rising launch with cuts flashing on falling pieces, whirlwind of six cuts from six places each in a different pose, "far behind" (he's simply elsewhere and the enemy splits later), peek-a-boo (nothing seems to happen, then death on the click), Thousand Cuts, the Crescent Moon's layered energy, Storm Chain lightning jumping between enemies, the Cross Rift void tear, the Qi meter, the enemy giving up (shoulders drop, head down, arms open, sword falls) before being killed.
- Things he disliked: robotic motion, the same pose just mirrored, standing too straight during fast moves, effects that are underwhelming or just lines, smoke instead of electricity, animations that are drawn out.

## NEW, most important for deaths (owner, just now)
- More REALISTIC deaths. A clean split that just slides off and hangs there reads fake. The body was in motion (turning, flinching, stepping), so when it's cut it FALLS and TWISTS with that momentum and with gravity: there is always downward motion, nothing hangs suspended in the air (unless it was deliberately launched, like the rising launch).
- The enemy must REACT to everything happening to him: flinch when the ronin appears, start to turn toward him or raise his guard, stagger when struck, knees buckle as he dies. He should never just stand there waiting like a mannequin while things happen to him.
- Practically: give the enemy a reaction pose timeline (startle, begin turning, stagger in the direction of each hit, arms/sword dropping). When cutting him into pieces, give each piece velocity from the body's motion plus the cut: the upper part drops right away and rotates the way he was turning or the way he was struck; the legs buckle and fold; landing is heavy (no bounce, a short slide), then rest.
