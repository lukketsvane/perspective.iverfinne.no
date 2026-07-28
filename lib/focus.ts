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

/** Nearest and furthest the drop point is allowed to be, in metres. */
const MIN_RANGE = 1.5;
const MAX_RANGE = 15;

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
    focusPoint.x = camera.position.x + forward.x * 4;
    focusPoint.z = camera.position.z + forward.z * 4;
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
