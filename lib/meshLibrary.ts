/**
 * The built-in meshes.
 *
 * Two batches, and they were authored differently, which is the whole reason
 * this file carries measurements.
 *
 * The first nine are normalised to exactly 1.70 m tall whatever the pose -
 * meaningless for anything that is not standing up. A figure kneeling face-down
 * is about a metre tall, not one-seven, and dropped in at face value it arrives
 * as a giant. Each of those carries the height its pose really has, and
 * placement scales the file to match.
 *
 * The twenty-one that follow are already true to life. Measured, they run from
 * a 0.65 m forward fold to a 2.07 m stretch, with the standing ones at
 * 1.62-1.67 m and body volumes of 63-75 litres - which is what a person
 * displaces. Those are placed exactly as authored.
 *
 * ORDER IS PART OF THE FORMAT. A shared link packs each figure's index in this
 * array, so entries may be appended but never reordered or removed, or every
 * link ever sent starts pointing at a different body.
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
  /**
   * Real height of this pose, in metres. Set only for the normalised files,
   * where the size in the file is a fiction and placement has to scale to it.
   * Left off when the file is already true to life.
   */
  height?: number;
}

export const MESH_LIBRARY: LibraryMesh[] = [
  // --- normalised to 1.70 m, so each pose's real height is given ----------
  { id: 'of_01', name: '01', url: '/meshes/of_01.glb', pose: 'crouch', height: 1.15 },
  { id: 'of_02', name: '02', url: '/meshes/of_02.glb', pose: 'stand', height: 1.7 },
  { id: 'of_03', name: '03', url: '/meshes/of_03.glb', pose: 'kneel', height: 1.0 },
  { id: 'of_04', name: '04', url: '/meshes/of_04.glb', pose: 'sit', height: 1.25 },
  { id: 'of_05', name: '05', url: '/meshes/of_05.glb', pose: 'kneel', height: 1.3 },
  { id: 'of_07', name: '07', url: '/meshes/of_07.glb', pose: 'stand', height: 1.7 },
  { id: 'of_08', name: '08', url: '/meshes/of_08.glb', pose: 'stand', height: 1.7 },
  { id: 'of_09', name: '09', url: '/meshes/of_09.glb', pose: 'stand', height: 1.7 },
  { id: 'of_10', name: '10', url: '/meshes/of_10.glb', pose: 'stand', height: 1.7 },

  // --- true to life as authored ------------------------------------------
  { id: 'artisan', name: '11', url: '/meshes/female_artisan.glb', pose: 'stand' },
  { id: 'military', name: '12', url: '/meshes/female_military.glb', pose: 'stand' },
  { id: 'photographer', name: '13', url: '/meshes/female_photographer.glb', pose: 'stand' },
  { id: 'soldier', name: '14', url: '/meshes/female_soldier.glb', pose: 'stand' },
  { id: 'standing', name: '15', url: '/meshes/female_standing.glb', pose: 'stand' },
  { id: 'surfer', name: '16', url: '/meshes/female_surfer.glb', pose: 'stand' },
  { id: 'porter', name: '17', url: '/meshes/female_porter.glb', pose: 'stand' },
  { id: 'stretch', name: '18', url: '/meshes/female_stretch.glb', pose: 'stand' },
  { id: 'surfer_lean', name: '19', url: '/meshes/female_surfer_lean.glb', pose: 'stand' },
  { id: 'dancer', name: '20', url: '/meshes/female_dancer.glb', pose: 'stand' },

  { id: 'scavenger_bend', name: '21', url: '/meshes/female_scavenger_bend.glb', pose: 'bend' },
  { id: 'yoga_fold', name: '22', url: '/meshes/female_yoga_fold.glb', pose: 'bend' },

  { id: 'artisan_kneel', name: '23', url: '/meshes/female_artisan_kneel.glb', pose: 'kneel' },
  { id: 'kneel_bend', name: '24', url: '/meshes/female_kneel_bend.glb', pose: 'kneel' },
  { id: 'soldier_kneel', name: '25', url: '/meshes/female_soldier_kneel.glb', pose: 'kneel' },

  { id: 'combat_crouch', name: '26', url: '/meshes/female_combat_crouch.glb', pose: 'crouch' },
  { id: 'surfer_crouch', name: '27', url: '/meshes/female_surfer_crouch.glb', pose: 'crouch' },
  { id: 'survivalist_squat', name: '28', url: '/meshes/female_survivalist_squat.glb', pose: 'crouch' },

  { id: 'seated', name: '29', url: '/meshes/female_seated.glb', pose: 'sit' },

  { id: 'gymnast', name: '30', url: '/meshes/female_gymnast.glb', pose: 'air' },
  { id: 'jump', name: '31', url: '/meshes/female_jump.glb', pose: 'air' },
];
