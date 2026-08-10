import { modelRadius } from './loadModel';
import type { BoxData, LampData, SceneModel } from '../types';

/**
 * Where a new thing goes when the spot you asked for is taken.
 *
 * This used to be one function living beside the mesh loader, and it only ever
 * knew about meshes: the two places that called it handed it `models` and
 * nothing else, and the two that put a cube or a lamp down did not call it at
 * all. So three taps on the cube gave three cubes in one cell - one of them
 * visible, the other two inside it - three taps on the lamp gave three lamps at
 * one point with only the top one grabbable, and a cube dropped where a chair
 * already stood went straight through it.
 *
 * None of that was reachable while the shelf shut itself on every placement.
 * Now that it stays up, the second tap is one tap away, and a run of placements
 * is what the shelf is for.
 *
 * So the question moved here and got asked properly: what is already standing
 * where I want to stand?
 */

/**
 * How far apart two things are left when one has to move aside.
 *
 * A finger's width, not an arm's. Two chairs a hand apart read as a pair
 * standing together; half a metre - what this was once - put every copy its own
 * arm's length away, so a row of chairs came out as a scattering across the
 * floor and every one had to be dragged back in.
 */
const CLEARANCE = 0.06;

/** Something already standing somewhere, and how much floor it takes. */
export interface Standing {
  position: [number, number, number];
  radius: number;
}

/**
 * A box's footprint.
 *
 * Half its longer horizontal side, which is what `modelRadius` gives for a
 * mesh - so the two kinds measure the same way and can be held against each
 * other. A box turned off-square sweeps a little wider than this and a
 * neighbour may end up touching its corner; the alternative is the
 * circumscribed circle, which is a metre and a half wide for a metre cube and
 * would stop two cubes ever sitting side by side on the ruling.
 */
export const boxRadius = (box: { scale: [number, number, number] }) =>
  Math.max(box.scale[0], box.scale[2]) / 2;

/**
 * A lamp's, for keeping lamps off each other.
 *
 * About the size of the mark that stands for it, so two of them land far
 * enough apart to be told apart and taken hold of separately.
 */
export const LAMP_RADIUS = 0.35;

/**
 * Everything standing on the floor: the boxes and the meshes, together.
 *
 * Together is the point. They occupy the same ground and neither used to know
 * the other was there.
 *
 * TWO THINGS ARE NOT IN THIS LIST.
 *
 * Lamps, because they hang at head height and above - a lamp over a box is a
 * lamp lighting a box rather than a collision. They are only ever held against
 * each other, in `addLamp`.
 *
 * And a mesh that is a whole scene, because a room is not something standing on
 * the floor, it IS the floor. It sits on the origin and measures ten metres
 * across, so counting it here would give it a five-metre footprint and push
 * every cube you tried to put down outside its own walls.
 */
export const onTheFloor = (scene: { boxes: BoxData[]; models: SceneModel[] }): Standing[] => [
  ...scene.boxes.map((box) => ({ position: box.position, radius: boxRadius(box) })),
  ...scene.models
    .filter((model) => model.kind !== 'scene')
    .map((model) => ({ position: model.position, radius: modelRadius(model) })),
];

/** Where the lamps are, for keeping the next one off them. */
export const lampsStanding = (lamps: LampData[]): Standing[] =>
  lamps.map((lamp) => ({ position: lamp.position, radius: LAMP_RADIUS }));

/**
 * Somewhere clear to stand, as close in as it will go.
 *
 * Walk a widening ring around the wanted point until there is room for this
 * one's footprint beside everything already there - in steps of about a radius,
 * so the first ring that clears is the tight one rather than the next one out.
 *
 * `snap` quantises every candidate before it is tried, which is how a cube
 * stays on the ruling: each place tested is a cell centre, so the answer is one
 * too. Snapping the result afterwards instead would be free to land it back on
 * top of the thing it had just stepped around.
 *
 * `clearance` is the gap left between footprints, and cell-snapped things want
 * none: two metre cubes in neighbouring cells are exactly a metre apart and
 * exactly a metre wide between them, so any gap at all would push the second
 * one a whole cell further out and leave a hole in the row.
 */
export const findFreeSpot = (
  taken: Standing[],
  wanted: [number, number],
  radius: number,
  { snap, clearance = CLEARANCE }: { snap?: (v: number) => number; clearance?: number } = {}
): [number, number] => {
  const at = (x: number, z: number): [number, number] => (snap ? [snap(x), snap(z)] : [x, z]);
  const clashes = ([x, z]: [number, number]) =>
    taken.some((other) => {
      const gap = Math.hypot(x - other.position[0], z - other.position[2]);
      return gap < radius + other.radius + clearance;
    });

  const first = at(wanted[0], wanted[1]);
  if (!clashes(first)) return first;

  const step = Math.max(0.12, radius * 0.9);
  for (let ring = 1; ring < 40; ring++) {
    // More places to try the further out it goes, so the ring is searched at
    // about the same spacing however big it is.
    const count = Math.max(8, Math.round(ring * 8));
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const spot = at(wanted[0] + Math.cos(angle) * ring * step, wanted[1] + Math.sin(angle) * ring * step);
      if (!clashes(spot)) return spot;
    }
  }
  return first;
};
