/**
 * The built-in meshes.
 *
 * Every one of these files is normalised to exactly 1.70 m tall, whatever the
 * pose - which is meaningless for anything that is not standing up. A figure
 * kneeling face-down is about a metre tall, not one-seven, and dropped in at
 * face value it arrives as a giant.
 *
 * So each entry carries the height that pose really has, measured head-to-floor
 * on a person of about 1.7 m, and placement scales the file to match. The scale
 * slider is still there for when you want something else.
 *
 * Meshes are fetched on demand rather than bundled, so opening the app never
 * pays for them.
 */
export interface LibraryMesh {
  id: string;
  name: string;
  url: string;
  /** Real height of this pose, in metres. Placement scales the file to it. */
  height: number;
}

export const MESH_LIBRARY: LibraryMesh[] = [
  { id: 'of_01', name: '01', url: '/meshes/of_01.glb', height: 1.15 }, // squatting, arms on knees
  { id: 'of_02', name: '02', url: '/meshes/of_02.glb', height: 1.7 },  // standing
  { id: 'of_03', name: '03', url: '/meshes/of_03.glb', height: 1.0 },  // kneeling, folded forward
  { id: 'of_04', name: '04', url: '/meshes/of_04.glb', height: 1.25 }, // two figures, seated
  { id: 'of_05', name: '05', url: '/meshes/of_05.glb', height: 1.3 },  // kneeling upright
  { id: 'of_07', name: '07', url: '/meshes/of_07.glb', height: 1.7 },  // standing
  { id: 'of_08', name: '08', url: '/meshes/of_08.glb', height: 1.7 },  // standing
  { id: 'of_09', name: '09', url: '/meshes/of_09.glb', height: 1.7 },  // standing, walking
  { id: 'of_10', name: '10', url: '/meshes/of_10.glb', height: 1.7 },  // standing
];
