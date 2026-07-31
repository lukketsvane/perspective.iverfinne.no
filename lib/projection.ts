import * as THREE from 'three';

/**
 * How wide the curvilinear field is.
 *
 * There are two ways to get a curved picture and they are not equivalent. The
 * cheap one warps a flat perspective render after the fact, which is what this
 * app used to do: it resamples an image that was never wider than about 120
 * degrees, so lines come out of the resampler stair-stepped and there is simply
 * no picture past the edge of the flat frame to bend into view.
 *
 * The honest one is to render the world onto a cube and read the picture off it
 * by direction, which is what `Panorama` does. Every pixel asks "what is along
 * this ray" and gets an answer, so a line stays a line all the way round, the
 * field can be the full 360, and nothing is stair-stepped because nothing was
 * stretched. The projection itself lives in that shader; all that is needed out
 * here is the size of the field it covers.
 *
 * In curvilinear mode the lens setting stops being a focal length and becomes
 * the width of the panorama, which is why it runs to 360. The vertical follows
 * the frame's shape, so a square on the horizon stays square.
 */
export const fieldOf = (degrees: number, width: number, height: number) => {
  const halfYaw = THREE.MathUtils.degToRad(Math.min(360, Math.max(20, degrees))) / 2;
  const halfPitch = Math.min(Math.PI / 2, (halfYaw * height) / Math.max(width, 1));
  return { halfYaw, halfPitch };
};
