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
  /** True once the device is reporting orientation and the user allowed it. */
  useDeviceOrientation: false,
  /** Orientation of the phone, rebuilt on every deviceorientation event. */
  deviceQuaternion: new THREE.Quaternion(),
  /** Where the walker is standing. Y comes from the eye-level setting. */
  position: new THREE.Vector3(0, 0, 6),
  /** Metres per second. A comfortable indoor walking pace. */
  speed: 1.4,
};

/** Drop the walker at a spot, facing a heading, when entering walk mode. */
export const resetWalk = (x: number, z: number, yaw: number) => {
  walkInput.position.set(x, 0, z);
  walkInput.yaw = yaw;
  walkInput.pitch = 0;
  walkInput.forward = 0;
  walkInput.strafe = 0;
};

// ---------------------------------------------------------------------------
// Device orientation
// ---------------------------------------------------------------------------

const zee = new THREE.Vector3(0, 0, 1);
const euler = new THREE.Euler();
const q0 = new THREE.Quaternion();
// Camera looks down -Z, the phone reports its screen normal: -90 degrees about X.
const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

let alphaOffset = 0;
let hasAlphaOffset = false;
let listening = false;

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
  const orient = THREE.MathUtils.degToRad((screen.orientation?.angle ?? 0) as number);

  euler.set(beta, alpha, -gamma, 'YXZ');
  walkInput.deviceQuaternion.setFromEuler(euler);
  walkInput.deviceQuaternion.multiply(q1);
  walkInput.deviceQuaternion.multiply(q0.setFromAxisAngle(zee, -orient));

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

export const disableDeviceOrientation = () => {
  if (listening) {
    window.removeEventListener('deviceorientation', onDeviceOrientation, true);
    listening = false;
  }
  walkInput.useDeviceOrientation = false;
  hasAlphaOffset = false;
};
