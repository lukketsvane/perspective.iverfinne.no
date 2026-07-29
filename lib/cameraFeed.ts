/**
 * What the live camera is actually showing.
 *
 * The video is painted object-cover, so the screen shows a *crop* of the
 * sensor, not the whole frame. Matching the virtual lens to the real one means
 * knowing the crop as well as the sensor's own angle - otherwise the scene
 * slides against the room every time you turn.
 */
export const feedState = {
  /** Native size of the stream, 0 until metadata arrives. */
  videoWidth: 0,
  videoHeight: 0,
};

/**
 * Horizontal angle the sensor covers across its full frame, in degrees.
 *
 * There is no browser API for this - getCapabilities() does not report focal
 * length - so it starts at the main-camera figure for a modern phone and is
 * adjustable by hand, which is what makes the match exact rather than close.
 */
export const DEFAULT_SENSOR_FOV = 63;

/**
 * Vertical field of view for the virtual camera, in degrees.
 *
 * Takes the sensor's horizontal angle, narrows it by however much of the frame
 * the object-cover crop is throwing away, then converts to the vertical angle
 * three.js wants for the canvas as it actually is.
 */
export const matchedVerticalFov = (
  sensorFovDegrees: number,
  canvasWidth: number,
  canvasHeight: number
): number => {
  const aspect = canvasWidth / Math.max(canvasHeight, 1);
  const sensorHalf = (sensorFovDegrees * Math.PI) / 360;

  let visibleFraction = 1;
  if (feedState.videoWidth > 0 && feedState.videoHeight > 0) {
    // object-cover: whichever axis needs more magnification sets the scale.
    const scale = Math.max(canvasWidth / feedState.videoWidth, canvasHeight / feedState.videoHeight);
    visibleFraction = Math.min(1, canvasWidth / scale / feedState.videoWidth);
  }

  const horizontalHalf = Math.atan(Math.tan(sensorHalf) * visibleFraction);
  const verticalHalf = Math.atan(Math.tan(horizontalHalf) / Math.max(aspect, 0.0001));
  return Math.min(150, Math.max(20, (verticalHalf * 360) / Math.PI));
};
