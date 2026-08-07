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
   * its true size, which is placed exactly as it comes - which is all three of
   * these.
   */
  height?: number;
}

export const MESH_LIBRARY: LibraryMesh[] = [
  { id: 'ekstrem', name: 'Ekstrem', url: '/meshes/ekstrem.glb' },
  { id: 'balans-variabel', name: 'Balans Variabel', url: '/meshes/balans-variabel.glb' },
  { id: 'il-tempo-gigante', name: 'Il Tempo Gigante', url: '/meshes/il-tempo-gigante.glb' },
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
