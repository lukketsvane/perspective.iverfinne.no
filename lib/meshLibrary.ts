/**
 * The library.
 *
 * Four Norwegian objects, true to life as authored: measured, they come in at
 * the sizes the real things are, so anything drawn against one is drawn against
 * a real chair. Nothing here corrects for a file that lies about its size.
 *
 * They are also the opening scene - one of them, picked at random, is standing
 * on the grid when the tool opens. A perspective study is easier to start from
 * something whose size you already know.
 *
 * Fetched on demand rather than bundled, so opening the app pays for one.
 */

export interface LibraryMesh {
  id: string;
  /** Never drawn: this is the accessible name, and the placed model's own. */
  name: string;
  url: string;
}

export const MESH_LIBRARY: LibraryMesh[] = [
  { id: 'ekstrem', name: 'Ekstrem', url: '/meshes/ekstrem.glb' },
  { id: 'balans-variabel', name: 'Balans Variabel', url: '/meshes/balans-variabel.glb' },
  { id: 'il-tempo-gigante', name: 'Il Tempo Gigante', url: '/meshes/il-tempo-gigante.glb' },
  { id: 'tripp-trapp', name: 'Tripp Trapp', url: '/meshes/tripp-trapp.glb' },
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
