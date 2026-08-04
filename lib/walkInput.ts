import * as THREE from 'three';

/**
 * Shared, mutable input state for walk mode.
 *
 * The joystick and the look-drag live in the DOM overlay, the camera lives in
 * the canvas. Both run every frame, so this is a plain module-level object
 * rather than store state - pushing a stick vector through React 60 times a
 * second would re-render the whole tree for nothing.
 */
export const walkInput = {
  /** -1..1, forward positive. */
  forward: 0,
  /** -1..1, right positive. */
  strafe: 0,
  /** Look angles in radians, used when device orientation is unavailable. */
  yaw: 0,
  pitch: 0,
  /**
   * Drag-to-look on top of the sensor.
   *
   * Holding a device up tells it which way you are facing, but it cannot tell
   * you have turned round in your chair - and on a tablet you often cannot turn
   * round at all. These turn you on the spot: yaw about world up, pitch about
   * the camera's own axis, both applied over whatever the sensor reports.
   */
  lookYaw: 0,
  lookPitch: 0,
  /** True once the device is reporting orientation and the user allowed it. */
  useDeviceOrientation: false,
  /** Orientation of the phone, rebuilt on every deviceorientation event. */
  deviceQuaternion: new THREE.Quaternion(),
  /** Where the walker is standing. Y comes from the eye-level setting. */
  position: new THREE.Vector3(0, 0, 6),
  /** Metres per second. A comfortable indoor walking pace. */
  speed: 1.4,
};

// ---------------------------------------------------------------------------
// Device orientation
// ---------------------------------------------------------------------------

const zee = new THREE.Vector3(0, 0, 1);
const euler = new THREE.Euler();
const q0 = new THREE.Quaternion();
// Camera looks down -Z, the phone reports its screen normal: -90 degrees about X.
const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

const raw = new THREE.Quaternion();
const rightAxis = new THREE.Vector3();
const upAxis = new THREE.Vector3();

const QUARTER = Math.PI / 2;

/**
 * Below this, the view axis is close enough to vertical - device flat on a
 * table, or held overhead - that the roll measurement is noise.
 */
const ROLL_CONFIDENCE = 0.35;

/**
 * How far past the current quarter turn the device has to be rolled before the
 * screen is treated as having rotated. Snaps are 90 degrees apart, so 55 leaves
 * a 35 degree run-up on the far side and no flapping at the boundary.
 */
const ROLL_HYSTERESIS = THREE.MathUtils.degToRad(55);

/**
 * The orientation the sensor reports, before any correction for how the screen
 * is turned. Exported for the roll measurement below and for testing.
 */
export const sensorQuaternion = (
  alpha: number,
  beta: number,
  gamma: number,
  into: THREE.Quaternion
): THREE.Quaternion => {
  euler.set(beta, alpha, -gamma, 'YXZ');
  return into.setFromEuler(euler).multiply(q1);
};

/**
 * Which way up the screen is, measured from gravity rather than asked for.
 *
 * `screen.orientation.angle` is supposed to say this, and on an iPad held in
 * landscape it can report zero - which left the whole scene lying on its side,
 * ground plane running up the left edge. The sensor already knows: with the
 * device level, the camera's own right axis is horizontal, so however far that
 * axis is lifted out of horizontal *is* the screen's rotation. Reading it this
 * way needs no cooperation from the platform and cannot disagree with the
 * orientation the same event stream is reporting.
 *
 * Returns radians, or null when the device is pointing too close to straight up
 * or straight down for the measurement to mean anything.
 */
export const measureScreenRoll = (alpha: number, beta: number, gamma: number): number | null => {
  sensorQuaternion(alpha, beta, gamma, raw);
  rightAxis.set(1, 0, 0).applyQuaternion(raw);
  upAxis.set(0, 1, 0).applyQuaternion(raw);
  if (Math.hypot(rightAxis.y, upAxis.y) < ROLL_CONFIDENCE) return null;
  return Math.atan2(rightAxis.y, upAxis.y);
};

/** Signed distance between two angles, in (-pi, pi]. */
const wrap = (angle: number) => {
  const turned = (angle + Math.PI) % (Math.PI * 2);
  return (turned < 0 ? turned + Math.PI * 2 : turned) - Math.PI;
};

let alphaOffset = 0;
let hasAlphaOffset = false;
let listening = false;
/** The quarter turn currently being taken out, in radians. */
let screenRoll = 0;
let hasScreenRoll = false;

/**
 * Follow the screen's rotation, in quarter turns, with a dead zone.
 *
 * Only the quarter turns are removed: a device tilted 20 degrees still shows a
 * horizon tilted 20 degrees, which is what holding a camera crooked does.
 */
const trackScreenRoll = (alpha: number, beta: number, gamma: number) => {
  const measured = measureScreenRoll(alpha, beta, gamma);
  if (measured === null) return;

  if (!hasScreenRoll) {
    screenRoll = Math.round(measured / QUARTER) * QUARTER;
    hasScreenRoll = true;
    return;
  }

  if (Math.abs(wrap(measured - screenRoll)) > ROLL_HYSTERESIS) {
    screenRoll = Math.round(measured / QUARTER) * QUARTER;
  }
};

const onDeviceOrientation = (event: DeviceOrientationEvent) => {
  if (event.alpha === null || event.beta === null || event.gamma === null) return;

  // First reading defines "straight ahead", so entering walk mode keeps the
  // heading the viewer already had instead of snapping to magnetic north.
  if (!hasAlphaOffset) {
    alphaOffset = THREE.MathUtils.degToRad(event.alpha) - walkInput.yaw;
    hasAlphaOffset = true;
  }

  const alpha = THREE.MathUtils.degToRad(event.alpha) - alphaOffset;
  const beta = THREE.MathUtils.degToRad(event.beta);
  const gamma = THREE.MathUtils.degToRad(event.gamma);

  trackScreenRoll(alpha, beta, gamma);

  sensorQuaternion(alpha, beta, gamma, walkInput.deviceQuaternion);
  walkInput.deviceQuaternion.multiply(q0.setFromAxisAngle(zee, -screenRoll));

  walkInput.useDeviceOrientation = true;
};

type PermissionCapableDOE = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

/**
 * Start listening for device orientation.
 *
 * iOS requires an explicit permission request made from a user gesture, which
 * is why this is called straight out of the AR toggle's click handler.
 * Resolves false when there is no sensor or the user said no - walk mode then
 * falls back to drag-to-look, which is also what desktop gets.
 */
export const enableDeviceOrientation = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') return false;

  const DOE = DeviceOrientationEvent as PermissionCapableDOE;

  if (typeof DOE.requestPermission === 'function') {
    try {
      const response = await DOE.requestPermission();
      if (response !== 'granted') return false;
    } catch {
      return false;
    }
  }

  if (!listening) {
    window.addEventListener('deviceorientation', onDeviceOrientation, true);
    listening = true;
  }
  return true;
};

/**
 * Put the scene where you are standing, facing where you are pointing.
 *
 * The compass drifts, and the study's origin is wherever you happened to be
 * when you entered - neither of which you want when lining the grid up with a
 * real floor. This drops the walker back on the origin and re-zeros the heading
 * against the next sensor reading, which is the whole of the alignment work
 * that can be done without positional tracking.
 */
export const recentre = () => {
  walkInput.position.set(0, 0, 0);
  walkInput.pitch = 0;
  walkInput.yaw = 0;
  hasAlphaOffset = false;
  walkInput.lookYaw = 0;
  walkInput.lookPitch = 0;
  // Re-measure which way up the screen is, rather than carrying over a reading
  // taken while the device happened to be flat.
  hasScreenRoll = false;
};

export const disableDeviceOrientation = () => {
  if (listening) {
    window.removeEventListener('deviceorientation', onDeviceOrientation, true);
    listening = false;
  }
  walkInput.useDeviceOrientation = false;
  hasAlphaOffset = false;
  hasScreenRoll = false;
};
