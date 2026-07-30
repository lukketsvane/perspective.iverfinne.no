import * as THREE from 'three';

/**
 * Where the selected box's own vanishing points land on screen.
 *
 * This is what a perspective reference is for. Every box in a scene has its own
 * pair of horizontal vanishing points, both sitting on the eye-level line, and
 * where they fall is decided by how that box is turned relative to you - not by
 * the scene being "in two-point perspective". Turn one box off the grid and it
 * gets its own pair. That is the whole lesson, and it is invisible until
 * somebody draws the points.
 *
 * The maths is one line: a direction d vanishes at the projection of a point
 * infinitely far along d, which is the projection of (camera position + d). The
 * only care needed is the degenerate case - a direction square to the line of
 * sight vanishes at infinity, off the side of every screen - caught by watching
 * how close d comes to parallel with the image plane.
 */
export interface VanishingPoint {
  /** Screen position in CSS pixels, origin top left. */
  x: number;
  y: number;
  /** Screen positions of the four box corners whose edges run to this point. */
  rays: [number, number][];
}

export const vanishing: {
  /** Bumped whenever the numbers change, so the overlay knows to redraw. */
  nonce: number;
  points: VanishingPoint[];
} = { nonce: 0, points: [] };

export interface VanishingBox {
  centre: THREE.Vector3;
  /** Full extents along the box's own x, y and z. */
  size: THREE.Vector3;
  rotationY: number;
}

const point = new THREE.Vector3();
const projected = new THREE.Vector3();
const forward = new THREE.Vector3();
const corner = new THREE.Vector3();
const axis = new THREE.Vector3();
const across = new THREE.Vector3();

/**
 * How near to parallel with the image plane a direction may get before its
 * vanishing point is too far off screen to mean anything. cos 84 degrees.
 */
const MIN_ALIGNMENT = 0.105;

/** Screen position of a world point, or null when it is behind the camera. */
const toScreen = (
  world: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number
): [number, number] | null => {
  projected.copy(world).project(camera);
  if (projected.z > 1) return null;
  return [((projected.x + 1) / 2) * width, ((1 - projected.y) / 2) * height];
};

export const clearVanishing = () => {
  if (vanishing.points.length === 0) return;
  vanishing.points = [];
  vanishing.nonce += 1;
};

/** Recompute the overlay for one box. */
export const updateVanishing = (
  camera: THREE.Camera,
  width: number,
  height: number,
  box: VanishingBox
) => {
  camera.getWorldDirection(forward);

  const cos = Math.cos(box.rotationY);
  const sin = Math.sin(box.rotationY);
  const halfY = box.size.y / 2;

  // The box's two horizontal axes and the half-extent along each.
  const pairs: [THREE.Vector3, number, THREE.Vector3, number][] = [
    [new THREE.Vector3(cos, 0, -sin), box.size.x / 2, new THREE.Vector3(sin, 0, cos), box.size.z / 2],
    [new THREE.Vector3(sin, 0, cos), box.size.z / 2, new THREE.Vector3(cos, 0, -sin), box.size.x / 2],
  ];

  const points: VanishingPoint[] = [];

  for (const [rawAxis, along, rawAcross, sideways] of pairs) {
    axis.copy(rawAxis);
    across.copy(rawAcross);

    // Only one of d and -d is in front of the camera, and they share a
    // vanishing point. Take the one that projects.
    if (axis.dot(forward) < 0) axis.negate();
    if (Math.abs(axis.dot(forward)) < MIN_ALIGNMENT) continue;

    point.copy(camera.position).add(axis);
    const vp = toScreen(point, camera, width, height);
    if (!vp) continue;

    // One ray per edge running along this axis, started at the far end so the
    // drawn line runs the length of the edge and on out to the point.
    const rays: [number, number][] = [];
    for (const side of [-1, 1]) {
      for (const up of [-1, 1]) {
        corner
          .copy(box.centre)
          .addScaledVector(axis, -along)
          .addScaledVector(across, side * sideways);
        corner.y += up * halfY;

        const screen = toScreen(corner, camera, width, height);
        if (screen) rays.push(screen);
      }
    }

    points.push({ x: vp[0], y: vp[1], rays });
  }

  vanishing.points = points;
  vanishing.nonce += 1;
};
