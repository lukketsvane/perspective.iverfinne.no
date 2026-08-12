/**
 * The objects the tool ships with: an aeroplane, the four men working on it,
 * and a drum.
 *
 * They are true to life - measured, they come in at the sizes the real things
 * are, so anything drawn against one is drawn against a real man.
 *
 * IT WAS THREE TIMES THIS SIZE, and the cut is the point. There were two
 * chairs, a car, four horses, a platypus, three crowded studies, a bowser, a
 * rack, a trolley and a bell - twenty megabytes of shelf, most of which was on
 * it because it was interesting rather than because this drawing needed it.
 * What is left is one subject and the yard around it, which is the thing the
 * tool actually opens on and the thing a page gets drawn from.
 *
 * Everything else in the library is the viewer's own. A file dropped in is kept
 * in the browser and listed beside these from then on, so a mesh is imported
 * once and placed as often as the drawing wants - see `lib/assets.ts`.
 *
 * Meshes are fetched on demand rather than bundled, so opening the app pays for
 * one.
 */

export interface LibraryMesh {
  id: string;
  /** Never drawn: this is the accessible name, and the placed model's own. */
  name: string;
  url: string;
  /**
   * The real height of the thing, in metres. Absent for anything authored at
   * its true size, which is placed exactly as it comes.
   */
  height?: number;
  /**
   * A room rather than an object.
   *
   * The difference is not size, it is what you do with it. An object is
   * something you stand a known distance from and draw; a scene is something
   * you walk into and draw from inside. So a scene lands on the origin instead
   * of beside whatever is already there, and carries no construction cage and
   * no vanishing points of its own - one box round fifteen figures, a desk and
   * a wolf answers nothing, and its three axes are the world's, which the
   * construction sheet already marks.
   */
  kind?: 'object' | 'scene';
}

export const MESH_LIBRARY: LibraryMesh[] = [
  /*
   * The ellipse lesson. A circle in perspective is an ellipse, its openness
   * set by how far it stands from the eye line - the fact every wheel, cup
   * and arch is drawn with, and the one thing a scene of boxes cannot show.
   * A metre round and a metre tall, so both of its circles read against the
   * grid.
   *
   * It survived the cut because it is not a file: it is lathed on the spot from
   * eleven lines in loadModel.ts, so it costs the shelf nothing to keep.
   */
  { id: 'cylinder', name: 'Cylinder', url: 'primitive:cylinder' },

  /*
   * The Hughes H-1, 1935: the one form on the shelf that is a solid of
   * revolution with things hung off it.
   *
   * Every vehicle that used to be here was a long box with wheels, which is a
   * box lesson. A racer's fuselage is a lathe-turned body tapering in two
   * directions at once, and its wings are one aerofoil section swept and
   * stretched - so the cross-section changes along the length in a way no box
   * construction predicts, and the ellipse the cowling presents changes its
   * openness continuously from nose to tail. That is the drawing this shelf did
   * not have, and it is why this is the one thing on it that was never in
   * question.
   *
   * Measured, it is 9.7 across the wings and 8.8 long, standing 3.2 on its own
   * gear with the tail down.
   *
   * IT IS NINETEEN MEGABYTES, twelve times the heaviest figure here and four
   * fifths of the shelf on its own. Nothing loads until it is tapped, so it
   * costs a first visit nothing - but it is a real cost to whoever taps it, and
   * on a phone it is the single heaviest thing this tool will ever ask a
   * browser to parse.
   */
  // No height: this one is authored at its real size and squarely aligned, so
  // it is placed exactly as it comes. The first copy needed 2.4 m forced onto
  // it, which is a number somebody has to be right about; a file that measures
  // itself is better than a file plus a correction.
  { id: 'hughes-h1', name: 'Hughes H-1 Racer', url: '/meshes/hughes-h1.glb' },

  /*
   * THE FOUR MEN: what turns one aeroplane into an airfield.
   *
   * An aircraft alone on an infinite grid is a beautiful object and a poor
   * subject. Nothing in the frame says how big it is except the ruling, which
   * is a convention you have to already believe; nothing is at a different
   * depth from it; and there is no second form for its own to be drawn
   * against. Four men fix all three at once - they are the size every viewer
   * knows best, they stand at four separate distances, and not one of them is
   * a shape the aeroplane is.
   *
   * They are also the ordinary reason a 1935 racer is sitting still: it is
   * being checked over, worked on and waited beside. Kim Jung Gi's pages are
   * full of exactly this - the vehicle is never the drawing, the yard is.
   *
   * FOUR POSES, chosen so that no two are the same drawing problem. Two upright
   * with the mass stacked, one folded down on one knee, one folded right up on
   * its heels - and the last of those is the hardest thing here to draw, a
   * whole body compressed into a metre and a bit with every limb foreshortened
   * at once.
   *
   * NONE OF THEM CARRIES A HEIGHT, for the same reason the racer does not: the
   * real size is baked into the file. Measured, they are 0.62 x 1.72 x 0.56,
   * 0.62 x 1.70 x 0.81, 0.85 x 1.68 x 1.21 and 0.81 x 1.20 x 0.71 metres.
   *
   * HOW THOSE SIZES WERE ARRIVED AT, since all four arrived normalised to 0.978
   * and so said nothing about how big the man was. The one standing upright was
   * read straight off a ruled post - 1.72 to the top of his cap, a man of about
   * 1.75 with his head down - and the other three were hung off him by standing
   * all four against the same post and matching them. Weighing them, which is
   * how the animals that used to be here were checked, does not work on these:
   * it puts the man in the leather flying jacket at four times the volume of
   * the man in a shirt, because a flying jacket is four times the coat.
   *
   * AND EVERY ONE OF THEM FACES +Z. Three of the four were authored looking the
   * other way, which is exactly the mix that once put a marshaller signalling
   * at nobody with his back to the aeroplane. The quarter turns are baked into
   * the files rather than carried as a note, so the scene that stands them up
   * has one rule instead of a table of exceptions.
   *
   * They arrive at ninety thousand triangles apiece with photographic maps.
   * Shipped, the maps and the UVs are gone entirely and the geometry is welded
   * on position and re-normalled - four of the five drawing surfaces are ink
   * and never sample a texture, the fifth is not improved by a photograph of
   * somebody's face, and a welded mesh is what the contour shader needs to draw
   * a clean edge. Each is about 1.6 MB.
   */
  { id: 'crew-clipboard', name: 'Ground crew, with a clipboard', url: '/meshes/crew-clipboard.glb' },
  { id: 'crew-standing', name: 'Ground crew, standing', url: '/meshes/crew-standing.glb' },
  { id: 'crew-kneeling', name: 'Ground crew, kneeling', url: '/meshes/crew-kneeling.glb' },
  { id: 'pilot-crouched', name: 'Pilot, crouched', url: '/meshes/pilot-crouched.glb' },
];

/**
 * What the tool stands up on the empty grid - when it opens, and again whenever
 * the scene is reset.
 *
 * THE RACER, always. It used to be whichever of them the dice picked, on the
 * reasoning that a different object each time is a different exercise, but
 * opening on something different every time is not a room you know - and they
 * are not equal for this.
 *
 * The H-1's fuselage is a solid of revolution tapering in two directions at
 * once, so the ellipse the cowling presents changes its openness continuously
 * from nose to tail rather than at the corners of a box; its wings are one
 * aerofoil section swept and stretched, so the section changes along the span
 * in a way no box construction predicts; and it stands on three points at a
 * nose-up angle, which puts its long axis off the ground plane as well as off
 * square. A box drawn round it is a box you have to think about.
 */
export const openingMesh = (): LibraryMesh => {
  if (import.meta.env.DEV) {
    // A browser test needs to be able to look at each of them in turn.
    const forced = (window as unknown as { __forceMesh?: string }).__forceMesh;
    const wanted = MESH_LIBRARY.find((mesh) => mesh.id === forced);
    if (wanted) return wanted;
  }
  return MESH_LIBRARY.find((mesh) => mesh.id === 'hughes-h1') ?? MESH_LIBRARY[0];
};
