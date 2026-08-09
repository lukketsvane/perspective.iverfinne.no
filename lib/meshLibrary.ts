/**
 * The three objects the tool ships with.
 *
 * They are true to life as authored - measured, they come in at the sizes the
 * real things are, so anything drawn against one is drawn against a real chair.
 * Nothing corrects for them, because nothing has to. Two chairs and a car: a
 * knee-high thing, a seat-high thing and a six-metre thing, which between them
 * cover the range a study needs something known to be measured against.
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
   */
  { id: 'cylinder', name: 'Cylinder', url: 'primitive:cylinder' },
  { id: 'ekstrem', name: 'Ekstrem', url: '/meshes/ekstrem.glb' },
  { id: 'balans-variabel', name: 'Balans Variabel', url: '/meshes/balans-variabel.glb' },
  { id: 'il-tempo-gigante', name: 'Il Tempo Gigante', url: '/meshes/il-tempo-gigante.glb' },

  /*
   * Three studies, reconstructed from Kim Jung Gi pages.
   *
   * Each is a single sculpted mesh - the figures, the furniture they are on and
   * the animals among them, welded into one - so there is nothing in them to
   * take apart and nothing to select inside. That is the point: they are not a
   * kit, they are a piece of a room at the density of incident he actually
   * drew at.
   *
   * Placed exactly as authored, like everything else here. Measured, they are
   * 1.77 x 1.69 x 1.68, 3.00 x 2.22 x 3.01 and 1.70 x 1.05 x 1.33 metres - so
   * they are objects by this library's own definition, things you stand a known
   * distance from and draw, and they carry the cage and their own vanishing
   * points like anything else. A group of figures at arm's length is the best
   * subject here for a blocking box, a footprint and a pair of points; marking
   * them as rooms was telling the only figures in the tool that the tool's own
   * construction did not apply to them.
   */
  { id: 'kjg-18', name: 'Study 18', url: '/meshes/kjg-18.glb' },
  { id: 'kjg-25', name: 'Study 25', url: '/meshes/kjg-25.glb' },
  { id: 'kjg-27', name: 'Study 27', url: '/meshes/kjg-27.glb' },
];

/**
 * What the tool stands up on the empty grid - when it opens, and again whenever
 * the scene is reset.
 *
 * The car, always. It used to be whichever of them the dice picked, on the
 * reasoning that a different object each time is a different exercise, but
 * opening on something different every time is not a room you know - and the
 * three are not equal for this. A chair is a box with legs. The car is curved
 * where the box is flat, six metres long so its far end is visibly smaller than
 * its near one, and turned enough that all three of its axes run off to three
 * separate points. It is the object here with the most perspective in it, which
 * makes it the one worth finding on the grid.
 */
export const openingMesh = (): LibraryMesh => {
  if (import.meta.env.DEV) {
    // A browser test needs to be able to look at each of them in turn.
    const forced = (window as unknown as { __forceMesh?: string }).__forceMesh;
    const wanted = MESH_LIBRARY.find((mesh) => mesh.id === forced);
    if (wanted) return wanted;
  }
  return MESH_LIBRARY.find((mesh) => mesh.id === 'il-tempo-gigante') ?? MESH_LIBRARY[0];
};
