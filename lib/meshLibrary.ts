/**
 * The library: four objects and one person, ten times over.
 *
 * The objects are true to life as authored - measured, they come in at the
 * sizes the real things are, so anything drawn against one is drawn against a
 * real chair. Nothing corrects for them, because nothing has to.
 *
 * The figures do have to be corrected, and this is the one place in the app
 * that admits it. They arrive from the scanner normalised: every one of them
 * fitted to a box exactly one metre on its longest side, whatever the pose was
 * doing. Placed as they come, a standing man is the height of the reference
 * cube and a man bent to the floor is the same height as the man standing next
 * to him - which is worse than useless in a tool whose whole claim is that
 * sizes are real.
 *
 * So each figure carries the height of its own pose, and the loader scales it
 * to that on the way in. The numbers are read off the poses rather than
 * measured - a stature of about 1.75 m standing, and less by however far the
 * pose folds him - so they are good to a few centimetres and no better. The
 * height scrub on a selected figure sets it exactly; double-tapping it comes
 * back to the number here.
 *
 * Meshes are fetched on demand rather than bundled, so opening the app pays
 * for one.
 */

export interface LibraryMesh {
  id: string;
  /** Never drawn: this is the accessible name, and the placed model's own. */
  name: string;
  url: string;
  /**
   * The real height of this pose, in metres. Absent for anything authored at
   * its true size, which is placed exactly as it comes.
   */
  height?: number;
}

export const MESH_LIBRARY: LibraryMesh[] = [
  { id: 'ekstrem', name: 'Ekstrem', url: '/meshes/ekstrem.glb' },
  { id: 'balans-variabel', name: 'Balans Variabel', url: '/meshes/balans-variabel.glb' },
  { id: 'il-tempo-gigante', name: 'Il Tempo Gigante', url: '/meshes/il-tempo-gigante.glb' },
  { id: 'tripp-trapp', name: 'Tripp Trapp', url: '/meshes/tripp-trapp.glb' },

  // Standing, at full stature.
  { id: 'iver-01', name: 'Standing', url: '/meshes/iver-01.glb', height: 1.75 },
  { id: 'iver-04', name: 'Standing, turned', url: '/meshes/iver-04.glb', height: 1.75 },
  { id: 'iver-06', name: 'Standing, side', url: '/meshes/iver-06.glb', height: 1.75 },
  { id: 'iver-08', name: 'Standing, back', url: '/meshes/iver-08.glb', height: 1.75 },
  { id: 'iver-09', name: 'Standing, hands down', url: '/meshes/iver-09.glb', height: 1.75 },
  // A raised knee takes nothing off the top.
  { id: 'iver-05', name: 'Stepping', url: '/meshes/iver-05.glb', height: 1.72 },
  // Reaching and leaning: still most of a stature, tipped off vertical.
  { id: 'iver-03', name: 'Reaching up', url: '/meshes/iver-03.glb', height: 1.62 },
  { id: 'iver-07', name: 'Lunging', url: '/meshes/iver-07.glb', height: 1.58 },
  // Folded: down to the floor, and down onto it.
  { id: 'iver-10', name: 'Bending to the floor', url: '/meshes/iver-10.glb', height: 1.18 },
  { id: 'iver-02', name: 'Sitting', url: '/meshes/iver-02.glb', height: 0.92 },
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
