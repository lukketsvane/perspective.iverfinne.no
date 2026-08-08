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
/**
 * The widest field the projection will take.
 *
 * It used to stop at 360, on the reasoning that a full turn is everything there
 * is to see - which is true, and is not the same as everything there is to
 * *draw*. At 360 the sphere spans the longest edge of the frame exactly, so the
 * shorter edge cuts the top and bottom off it and the sheet is something you
 * are inside rather than something you are looking at. Past 360 the sphere
 * shrinks away from the edges until the whole disc is on the page with paper
 * round it, which is the drawing itself: the ruled oval a curvilinear study is
 * set out on before a line goes down. Three turns is far more than any frame
 * needs to fit it, whatever shape the window is.
 */
export const MAX_FIELD = 1080;

export const fieldOf = (degrees: number, width: number, height: number) => {
  const angularRadius = (Math.min(MAX_FIELD, Math.max(20, degrees)) * Math.PI / 180) / 2;
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);
  const longestEdge = Math.max(safeWidth, safeHeight);
  const halfYaw = angularRadius * (safeWidth / longestEdge);
  const halfPitch = angularRadius * (safeHeight / longestEdge);
  return { halfYaw, halfPitch };
};

/**
 * The field at which the whole sphere is on the page, just touching the
 * shorter edge of the frame.
 *
 * The scale follows the longest edge, so a full turn spans that edge and the
 * shorter one crops it: how much depends entirely on the shape of the window,
 * which is why this is a sum rather than a number. A laptop needs about 500
 * degrees to bring the disc inside; a phone held upright needs nearer 800.
 * Rounded up to ten so the reading is a round one.
 */
export const wholeSheetField = (width: number, height: number) => {
  const long = Math.max(width, height, 1);
  const short = Math.max(Math.min(width, height), 1);
  return Math.min(MAX_FIELD, Math.ceil((360 * long) / short / 10) * 10);
};

/**
 * The stereographic sheet.
 *
 * Every projection here maps an angle away from the view axis to a distance
 * from the middle of the frame, and the whole character of a system is that one
 * function. Equidistant is the identity - the angle *is* the distance - which is
 * why it rules so evenly and why it is the sheet to measure on. Stereographic is
 * the tangent of the half angle, and that one change buys the property no other
 * azimuthal projection has: it is **conformal**. Angles are preserved
 * everywhere. A small square anywhere on the page is still a square, a sphere is
 * still drawn as a circle, and two lines that cross at sixty degrees in the
 * world cross at sixty degrees on the paper - at the very edge of a full-turn
 * field as much as at the centre.
 *
 * That is bought by giving up on scale: the periphery is expanded enormously,
 * which is exactly the "little planet" picture, and at a full turn the point
 * directly behind you is at infinity and can never be drawn. The sphere minus
 * one point onto the whole plane - which is the map that makes the Riemann
 * sphere a sphere, and the same one the Poincare disk is built from. It is the
 * closest thing to a straight edge that survives a curved sheet: what stays
 * true is not the length of anything but the angle between everything.
 *
 * Normalised so the frame's own edge still sits at the field it says it does -
 * `at(A, A) === A` - so the number on the lens control means the same thing in
 * every system.
 */

/** As far as the tangent may be pushed before it runs away entirely. */
const STEREO_LIMIT = 3.1; // radians, a shade under half a turn

/** Angle away from the axis, given a distance from the middle of the frame. */
export const stereographicAngle = (radius: number, field: number) => {
  const half = Math.min(field, STEREO_LIMIT) / 2;
  return 2 * Math.atan((Math.tan(half) / Math.max(field, 1e-6)) * radius);
};

/** And back: distance from the middle, given an angle away from the axis. */
export const stereographicRadius = (angle: number, field: number) => {
  const half = Math.min(field, STEREO_LIMIT) / 2;
  return (Math.tan(angle / 2) / Math.tan(half)) * Math.max(field, 1e-6);
};
