/**
 * The built-in meshes.
 *
 * All twenty-one are true to life as authored. Measured, they run from a 0.65 m
 * forward fold to a 2.07 m stretch, with the standing ones at 1.62-1.67 m and
 * body volumes of 63 to 75 litres - which is what a person displaces. So they
 * are placed exactly as they come, and nothing here has to correct for a file
 * that lies about its size.
 *
 * ORDER IS PART OF THE FORMAT. A shared link packs each figure's index in this
 * array, so entries may be appended but not reordered, or a link starts
 * pointing at a different body. (The nine figures that shipped before these
 * were removed outright, which does break links sent before that.)
 *
 * Meshes are fetched on demand rather than bundled, so opening the app never
 * pays for them.
 */

/** Roughly what the body is doing. Decides the tile's glyph, nothing else. */
export type Pose = 'stand' | 'bend' | 'kneel' | 'crouch' | 'sit' | 'air';

export interface LibraryMesh {
  id: string;
  name: string;
  url: string;
  pose: Pose;
}

export const MESH_LIBRARY: LibraryMesh[] = [
  { id: 'artisan', name: '01', url: '/meshes/female_artisan.glb', pose: 'stand' },
  { id: 'military', name: '02', url: '/meshes/female_military.glb', pose: 'stand' },
  { id: 'photographer', name: '03', url: '/meshes/female_photographer.glb', pose: 'stand' },
  { id: 'soldier', name: '04', url: '/meshes/female_soldier.glb', pose: 'stand' },
  { id: 'standing', name: '05', url: '/meshes/female_standing.glb', pose: 'stand' },
  { id: 'surfer', name: '06', url: '/meshes/female_surfer.glb', pose: 'stand' },
  { id: 'porter', name: '07', url: '/meshes/female_porter.glb', pose: 'stand' },
  { id: 'stretch', name: '08', url: '/meshes/female_stretch.glb', pose: 'stand' },
  { id: 'surfer_lean', name: '09', url: '/meshes/female_surfer_lean.glb', pose: 'stand' },
  { id: 'dancer', name: '10', url: '/meshes/female_dancer.glb', pose: 'stand' },
  { id: 'scavenger_bend', name: '11', url: '/meshes/female_scavenger_bend.glb', pose: 'bend' },
  { id: 'yoga_fold', name: '12', url: '/meshes/female_yoga_fold.glb', pose: 'bend' },
  { id: 'artisan_kneel', name: '13', url: '/meshes/female_artisan_kneel.glb', pose: 'kneel' },
  { id: 'kneel_bend', name: '14', url: '/meshes/female_kneel_bend.glb', pose: 'kneel' },
  { id: 'soldier_kneel', name: '15', url: '/meshes/female_soldier_kneel.glb', pose: 'kneel' },
  { id: 'combat_crouch', name: '16', url: '/meshes/female_combat_crouch.glb', pose: 'crouch' },
  { id: 'surfer_crouch', name: '17', url: '/meshes/female_surfer_crouch.glb', pose: 'crouch' },
  { id: 'survivalist_squat', name: '18', url: '/meshes/female_survivalist_squat.glb', pose: 'crouch' },
  { id: 'seated', name: '19', url: '/meshes/female_seated.glb', pose: 'sit' },
  { id: 'gymnast', name: '20', url: '/meshes/female_gymnast.glb', pose: 'air' },
  { id: 'jump', name: '21', url: '/meshes/female_jump.glb', pose: 'air' },
];
