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

/** One of them, for the scene the tool opens with. */
export const randomMesh = (): LibraryMesh => {
  if (import.meta.env.DEV) {
    // A browser test needs to be able to look at each of them in turn.
    const forced = (window as unknown as { __forceMesh?: string }).__forceMesh;
    const wanted = MESH_LIBRARY.find((mesh) => mesh.id === forced);
    if (wanted) return wanted;
  }
  return MESH_LIBRARY[Math.floor(Math.random() * MESH_LIBRARY.length)];
};
