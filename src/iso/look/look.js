// ---- THE LOOK: what a character looks like, behind one small interface, so the 3D model and the pixel drawing are
// interchangeable (owner 2026-10-02: "should be interchangeable though"). The controller (play/) owns everything else:
// movement, the state machine, the flow poses, hitboxes and timing. It hands its look one FRAME per animation tick and
// never asks which look it has; a future hand-made sprite sheet is a third implementation of the same four calls.
//
//   look.mount(scene)     add the look's objects to the scene (both looks draw through the same pipeline: depth, fog,
//                         the lanterns' light, the silhouette when he is hidden)
//   look.show(frame)      draw this frame. frame = {
//                           pose,   the flow's side pose: the rig's joint angles and targets (anim/moves.js)
//                           x, y, z (world units: his feet), yaw (his facing, radians, 0 = south, the 8 facings or free),
//                           flash (bool: the white hit flash), tint, tintA (a colour laid over him), alpha (0..1 dissolve),
//                           hero (bool: the player, whose hat shadows the scene) }
//   look.stamp(g)         after the scene: pixels the look adds on the effects layer (the 3D look's eye glints), may be empty
//   look.dispose()        remove its objects
import { threeLook } from './three/look3d.js';
import { pixelLook } from './pixel/lookpix.js';

export const LOOKS = { '3d': threeLook, pixel: pixelLook };
export const makeLook = (kind, o) => LOOKS[kind](o);
