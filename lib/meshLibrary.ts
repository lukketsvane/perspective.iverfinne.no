/**
 * The built-in meshes.
 *
 * Figures to put in the scene and draw against. They are fetched on demand
 * rather than bundled, so opening the app never pays for them.
 */
export interface LibraryMesh {
  id: string;
  name: string;
  url: string;
}

export const MESH_LIBRARY: LibraryMesh[] = [
  { id: 'of_02', name: 'Figure 02', url: '/meshes/of_02.glb' },
  { id: 'of_03', name: 'Figure 03', url: '/meshes/of_03.glb' },
  { id: 'of_07', name: 'Figure 07', url: '/meshes/of_07.glb' },
  { id: 'of_08', name: 'Figure 08', url: '/meshes/of_08.glb' },
  { id: 'of_10', name: 'Figure 10', url: '/meshes/of_10.glb' },
];
