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
 * the angular diameter of the drawing. That diameter follows the longest edge
 * of the frame. Most importantly, both axes use the same pixels-per-radian
 * scale: changing orientation crops/reveals the sphere, but can never squeeze
 * a cube into a tall sliver.
 */
export const fieldOf = (degrees: number, width: number, height: number) => {
  const angularRadius = (Math.min(360, Math.max(20, degrees)) * Math.PI / 180) / 2;
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);
  const longestEdge = Math.max(safeWidth, safeHeight);
  const halfYaw = angularRadius * (safeWidth / longestEdge);
  const halfPitch = angularRadius * (safeHeight / longestEdge);
  return { halfYaw, halfPitch };
};
