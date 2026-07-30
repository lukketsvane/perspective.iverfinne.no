import * as THREE from 'three';

/**
 * The curvilinear projection, in one place.
 *
 * There are two ways to get a curved picture and they are not equivalent. The
 * cheap one warps a flat perspective render after the fact, which is what this
 * app did: it resamples an image that was never wider than about 120 degrees,
 * so the lines come out of the resampler as stair-stepped polylines and there
 * is simply no picture past the edge of the flat frame to bend into view.
 *
 * The honest one is to render the world onto a cube and read the picture off it
 * by direction, which is what happens now. Every pixel asks "what is along this
 * ray" and gets an answer, so a line stays a line all the way round, the field
 * can be the full 360, and nothing is stair-stepped because nothing was
 * stretched.
 *
 * Two projections, blended:
 *
 * - EQUIRECTANGULAR (blend 0). Screen x is bearing, screen y is elevation, both
 *   linear. This is the panorama Kim Jung Gi fills a spread with: the eye-level
 *   line stays straight and every vertical bows away from the centre. Roll a
 *   scene through 360 degrees of it and it tiles - the infinite panorama.
 *
 * - EQUIDISTANT FISHEYE (blend 1). Distance from the centre of the frame is the
 *   angle away from where you are looking, in every direction equally. This is
 *   the five-point construction: left, right, zenith, nadir and the point you
 *   are looking at, all in frame at once.
 *
 * Both are shared with the shader that draws them, so the guide grid and the
 * picture cannot drift apart.
 */

/** Camera-space direction for a point on screen, in -1..1 clip coordinates. */
export const directionFor = (
  clipX: number,
  clipY: number,
  halfYaw: number,
  halfPitch: number,
  blend: number,
  into: THREE.Vector3
): THREE.Vector3 => {
  // --- equirectangular ---
  const yaw = clipX * halfYaw;
  const pitch = clipY * halfPitch;
  const cosPitch = Math.cos(pitch);
  const ex = Math.sin(yaw) * cosPitch;
  const ey = Math.sin(pitch);
  const ez = -Math.cos(yaw) * cosPitch;

  // --- equidistant fisheye ---
  const rx = clipX * halfYaw;
  const ry = clipY * halfPitch;
  const radius = Math.hypot(rx, ry);
  let fx = 0;
  let fy = 0;
  let fz = -1;
  if (radius > 1e-6) {
    const s = Math.sin(radius) / radius;
    fx = rx * s;
    fy = ry * s;
    fz = -Math.cos(radius);
  }

  return into
    .set(ex + (fx - ex) * blend, ey + (fy - ey) * blend, ez + (fz - ez) * blend)
    .normalize();
};

/**
 * The inverse: where a camera-space direction lands on screen, in clip
 * coordinates, or null when it is outside the field.
 *
 * Only exact for the two ends of the blend; in between it is solved by a short
 * bisection on the radius, which is enough for drawing a guide grid.
 */
export const screenFor = (
  direction: THREE.Vector3,
  halfYaw: number,
  halfPitch: number,
  blend: number
): [number, number] | null => {
  const d = direction;

  // Equirectangular is closed form.
  const yaw = Math.atan2(d.x, -d.z);
  const pitch = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
  const equi: [number, number] = [yaw / halfYaw, pitch / halfPitch];

  // So is the fisheye: the angle from straight ahead, spread radially.
  const angle = Math.acos(THREE.MathUtils.clamp(-d.z, -1, 1));
  const flat = Math.hypot(d.x, d.y);
  let fish: [number, number];
  if (flat < 1e-6) {
    fish = [0, 0];
  } else {
    fish = [(d.x / flat) * (angle / halfYaw), (d.y / flat) * (angle / halfPitch)];
  }

  if (blend <= 0) return inField(equi) ? equi : null;
  if (blend >= 1) return inField(fish) ? fish : null;

  // In between, walk the blend the same way the shader does and keep the
  // screen point whose direction matches. Twelve steps is well under a pixel.
  let low = 0;
  let high = 1;
  const probe = new THREE.Vector3();
  let best: [number, number] = equi;
  for (let i = 0; i < 12; i++) {
    const mid = (low + high) / 2;
    const guess: [number, number] = [
      equi[0] + (fish[0] - equi[0]) * mid,
      equi[1] + (fish[1] - equi[1]) * mid,
    ];
    directionFor(guess[0], guess[1], halfYaw, halfPitch, blend, probe);
    best = guess;
    if (probe.dot(d) > 0.99999) break;
    // Which side of the guess the true point is on: compare bearings.
    if (Math.atan2(probe.x, -probe.z) * Math.sign(yaw || 1) > yaw * Math.sign(yaw || 1)) high = mid;
    else low = mid;
  }
  return inField(best) ? best : null;
};

const inField = (point: [number, number]) =>
  Math.abs(point[0]) <= 1.02 && Math.abs(point[1]) <= 1.02;

/**
 * How wide the field is, in radians, for a given setting.
 *
 * In curvilinear mode the lens setting stops being a focal length and becomes
 * the width of the panorama, which is why it runs to 360. The vertical follows
 * the frame's shape so that a square on the equator stays square.
 */
export const fieldOf = (degrees: number, width: number, height: number) => {
  const halfYaw = THREE.MathUtils.degToRad(Math.min(360, Math.max(20, degrees))) / 2;
  const halfPitch = Math.min(Math.PI / 2, (halfYaw * height) / Math.max(width, 1));
  return { halfYaw, halfPitch };
};
