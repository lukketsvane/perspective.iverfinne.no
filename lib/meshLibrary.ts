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
  // Original 21 (indices preserved for shared-link compatibility)
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
  // Additional meshes from public/meshes
  { id: 'athlete_sprinting', name: '22', url: '/meshes/athlete sprinting 3d model.glb', pose: 'stand' },
  { id: 'athletic_female', name: '23', url: '/meshes/athletic female 3d model.glb', pose: 'stand' },
  { id: 'athletic_woman_2', name: '24', url: '/meshes/athletic woman 3d model 2.glb', pose: 'stand' },
  { id: 'athletic_woman', name: '25', url: '/meshes/athletic woman 3d model.glb', pose: 'stand' },
  { id: 'baby_stroller', name: '26', url: '/meshes/baby stroller 3d model.glb', pose: 'stand' },
  { id: 'bicycle_rider', name: '27', url: '/meshes/bicycle with rider 3d model.glb', pose: 'sit' },
  { id: 'denim_jacket_woman', name: '28', url: '/meshes/denim jacket woman 3d model.glb', pose: 'stand' },
  { id: 'dirty_man', name: '29', url: '/meshes/dirty man 3d model.glb', pose: 'stand' },
  { id: 'dj_mixer', name: '30', url: '/meshes/dj mixer 3d model.glb', pose: 'stand' },
  { id: 'dual_neck_guitar', name: '31', url: '/meshes/dual neck guitar 3d model.glb', pose: 'stand' },
  { id: 'dump_truck', name: '32', url: '/meshes/dump truck 3d model.glb', pose: 'stand' },
  { id: 'fantasy_girl', name: '33', url: '/meshes/fantasy girl 3d model.glb', pose: 'stand' },
  { id: 'female_action_char', name: '34', url: '/meshes/female action character 3d model.glb', pose: 'stand' },
  { id: 'female_adventurer', name: '35', url: '/meshes/female adventurer 3d model.glb', pose: 'stand' },
  { id: 'female_athlete_2', name: '36', url: '/meshes/female athlete 3d model 2.glb', pose: 'stand' },
  { id: 'female_athlete_3', name: '37', url: '/meshes/female athlete 3d model 3.glb', pose: 'stand' },
  { id: 'female_athlete', name: '38', url: '/meshes/female athlete 3d model.glb', pose: 'stand' },
  { id: 'female_char_2', name: '39', url: '/meshes/female character 3d model 2.glb', pose: 'stand' },
  { id: 'female_char_3', name: '40', url: '/meshes/female character 3d model 3.glb', pose: 'stand' },
  { id: 'female_char', name: '41', url: '/meshes/female character 3d model.glb', pose: 'stand' },
  { id: 'female_fighter', name: '42', url: '/meshes/female fighter 3d model.glb', pose: 'stand' },
  { id: 'female_figure_2', name: '43', url: '/meshes/female figure 3d model 2.glb', pose: 'stand' },
  { id: 'female_figure_3', name: '44', url: '/meshes/female figure 3d model 3.glb', pose: 'stand' },
  { id: 'female_sporty', name: '45', url: '/meshes/female sporty pose 3d model.glb', pose: 'stand' },
  { id: 'female_survivalist', name: '46', url: '/meshes/female survivalist 3d model.glb', pose: 'stand' },
  { id: 'fitness_model', name: '47', url: '/meshes/fitness model 3d model.glb', pose: 'stand' },
  { id: 'frisbee_girl', name: '48', url: '/meshes/frisbee girl 3d model.glb', pose: 'stand' },
  { id: 'guitar_amp', name: '49', url: '/meshes/guitar amplifier 3d model.glb', pose: 'stand' },
  { id: 'hooded_child', name: '50', url: '/meshes/hooded child 3d model.glb', pose: 'stand' },
  { id: 'human_figure_4', name: '51', url: '/meshes/human figure 3d model 4.glb', pose: 'stand' },
  { id: 'human_figure_5', name: '52', url: '/meshes/human figure 3d model 5.glb', pose: 'stand' },
  { id: 'person_sketching', name: '53', url: '/meshes/person sketching 3d model.glb', pose: 'sit' },
  { id: 'post_apocalyptic', name: '54', url: '/meshes/post-apocalyptic character 3d model.glb', pose: 'stand' },
  { id: 'realistic_female', name: '55', url: '/meshes/realistic female 3d model.glb', pose: 'stand' },
  { id: 'rubber_duck_float', name: '56', url: '/meshes/rubber duck float 3d model.glb', pose: 'stand' },
  { id: 'seated_weaving', name: '57', url: '/meshes/seated woman weaving 3d model.glb', pose: 'sit' },
  { id: 'sewing_toolbox', name: '58', url: '/meshes/sewing toolbox 3d model.glb', pose: 'stand' },
  { id: 'sewing_tools', name: '59', url: '/meshes/sewing tools 3d model.glb', pose: 'stand' },
  { id: 'stylized_human', name: '60', url: '/meshes/stylized human figure 3d model.glb', pose: 'stand' },
  { id: 'surfer_board', name: '61', url: '/meshes/surfer with board 3d model.glb', pose: 'stand' },
  { id: 'tattooed_female', name: '62', url: '/meshes/tattooed female 3d model.glb', pose: 'stand' },
  { id: 'trombone_player', name: '63', url: '/meshes/trombone player 3d model.glb', pose: 'stand' },
  { id: 'vintage_speaker', name: '64', url: '/meshes/vintage speaker rig 3d model.glb', pose: 'stand' },
  { id: 'weaving_loom', name: '65', url: '/meshes/weaving loom 3d model.glb', pose: 'stand' },
  { id: 'winter_man', name: '66', url: '/meshes/winter jacketed man 3d model.glb', pose: 'stand' },
  { id: 'woman', name: '67', url: '/meshes/woman 3d model.glb', pose: 'stand' },
  { id: 'stave_church_2', name: '68', url: '/meshes/wooden stave church 3d model 2.glb', pose: 'stand' },
  { id: 'stave_church_3', name: '69', url: '/meshes/wooden stave church 3d model 3.glb', pose: 'stand' },
  { id: 'stave_church', name: '70', url: '/meshes/wooden stave church 3d model.glb', pose: 'stand' },
  { id: 'wooden_stool', name: '71', url: '/meshes/wooden stool 3d model.glb', pose: 'stand' },
  { id: 'zombie_char', name: '72', url: '/meshes/zombie character 3d model.glb', pose: 'stand' },
];
