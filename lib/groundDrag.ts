import * as THREE from 'three';

/**
 * Pointer to a point on the floor.
 *
 * Dragging along the ground plane is how both boxes and models are moved, and
 * it has one sharp edge: as the ray flattens out towards the horizon its
 * intersection with the floor runs away to infinity, so a drag that strays a
 * few pixels too high flings the object out of the world. Rays that graze, or
 * that land absurdly far off, are refused instead - the drag simply stops
 * following rather than teleporting.
 */
const MAX_REACH = 60; // metres from the camera
const MIN_SLOPE = 0.08; // ~4.6 degrees below horizontal

export const createGroundPicker = (camera: THREE.Camera, element: HTMLElement) => {
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const hit = new THREE.Vector3();
  const rect = element.getBoundingClientRect();

  return (clientX: number, clientY: number): THREE.Vector3 | null => {
    pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(pointer, camera);

    if (Math.abs(raycaster.ray.direction.y) < MIN_SLOPE) return null;
    if (!raycaster.ray.intersectPlane(plane, hit)) return null;
    if (hit.distanceTo(camera.position) > MAX_REACH) return null;

    return hit.clone();
  };
};
