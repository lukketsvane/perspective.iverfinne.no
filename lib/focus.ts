import * as THREE from 'three';

/**
 * Where the viewer is looking, on the ground.
 *
 * Double-tapping the floor is a mouse idea; on a phone the natural gesture is
 * "put one here", meaning in front of me. The scene keeps this point up to
 * date so any button can drop geometry where the camera is pointed, in orbit
 * and in walk mode alike.
 */
export const focusPoint = { x: 0, z: 0 };

const forward = new THREE.Vector3();
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ray = new THREE.Ray();
const hit = new THREE.Vector3();

/**
 * Nearest and furthest the drop point is allowed to be, in metres.
 *
 * Close enough to be within reach: a figure dropped fifteen metres out is a
 * smudge on the horizon that then has to be walked to. Two and a half metres is
 * about where you would stand something down to draw it - near enough to fill
 * the frame, far enough not to be inside your own eye level.
 */
const MIN_RANGE = 1.2;
const MAX_RANGE = 6;

/**
 * Where a drop lands when the gaze never meets the floor - looking level, or
 * up. Same reasoning as the range above: a pace or two ahead, not across the
 * room.
 */
const LEVEL_RANGE = 2.5;

export const updateFocus = (camera: THREE.Camera) => {
  camera.getWorldDirection(forward);
  ray.origin.copy(camera.position);
  ray.direction.copy(forward);

  // Looking level or up never meets the floor, so fall back to a point a few
  // paces ahead at the same height.
  if (forward.y > -0.05 || !ray.intersectPlane(ground, hit)) {
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
    forward.normalize();
    focusPoint.x = camera.position.x + forward.x * LEVEL_RANGE;
    focusPoint.z = camera.position.z + forward.z * LEVEL_RANGE;
    return;
  }

  const distance = Math.hypot(hit.x - camera.position.x, hit.z - camera.position.z);
  if (distance > MAX_RANGE || distance < MIN_RANGE) {
    const clamped = Math.min(MAX_RANGE, Math.max(MIN_RANGE, distance));
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
    forward.normalize();
    focusPoint.x = camera.position.x + forward.x * clamped;
    focusPoint.z = camera.position.z + forward.z * clamped;
    return;
  }

  focusPoint.x = hit.x;
  focusPoint.z = hit.z;
};

/**
 * How far away the selection is, on the floor.
 *
 * Perspective is a relation between three numbers - how big a thing is, how far
 * away it is, and how high your eye is - and the tool stated two of them and
 * computed the third silently. The bar says the height and the dock says the
 * eye level; this is the one that was missing.
 *
 * Written from the frame loop that already holds the camera and the selection,
 * and read by the bar, so nothing has to be threaded through the store or
 * re-derived. `nonce` is what tells the bar it has changed, the same way the
 * vanishing overlay knows to redraw.
 */
export const selectionRange = { metres: 0, nonce: 0 };

export const setSelectionRange = (metres: number) => {
  if (Math.abs(metres - selectionRange.metres) < 0.01) return;
  selectionRange.metres = metres;
  selectionRange.nonce += 1;
};
