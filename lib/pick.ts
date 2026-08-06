import * as THREE from 'three';
import { fieldOf } from './projection';
import type { PerspectiveMode } from '../types';

/**
 * Where a point on the glass is in the world, and where a point in the world is
 * on the glass.
 *
 * Every gesture in the app is one of those two questions. Tapping a chair,
 * sliding it along the floor, pushing a face of a box out - all of them need the
 * ray through the pixel under the finger, and the resize needs the answer the
 * other way round as well, to know which way the finger has to travel.
 *
 * It has to live outside the canvas. The walk layer owns every pointer event on
 * the glass, so react-three-fiber's own picking never sees a single one; the
 * scene registers what it is drawing with, and the overlay asks from out here.
 *
 * The projection is the whole difficulty. In straight-line perspective the ray
 * is the camera's own, and three does it. In the curvilinear modes the picture
 * on the screen was not made by that camera at all - it was read off a cube map
 * by angle - so the flat ray points somewhere the viewer is not looking, which
 * is why meshes plainly in view used to be untappable. The mapping below is the
 * same equidistant one the panorama shader uses, inverted.
 */

export interface SceneHit {
  type: 'box' | 'model';
  id: string;
  /**
   * Set when the thing taken hold of was one of a selected box's face handles:
   * which of the box's own three axes it sits on, and at which end.
   */
  handle?: { axis: 0 | 1 | 2; sign: 1 | -1 };
  /** Where the ray met it, in world space. */
  point: THREE.Vector3;
}

interface ViewSource {
  camera: THREE.Camera;
  /** The canvas, for turning client pixels into frame coordinates. */
  element: HTMLElement;
  root: THREE.Object3D;
  width: number;
  height: number;
  fov: number;
  mode: PerspectiveMode;
}

type RegisteredView = ViewSource & { rect: { left: number; top: number; width: number; height: number } };

let view: RegisteredView | null = null;

/**
 * Where the canvas sits is measured once, here, rather than on every question
 * asked of it. A drag asks several times a frame, and each measurement is a
 * layout read; the canvas cannot move without the size or the camera changing,
 * both of which come back through this.
 */
export const registerView = (next: ViewSource) => {
  const box = next.element.getBoundingClientRect();
  view = { ...next, rect: { left: box.left, top: box.top, width: box.width, height: box.height } };
};

export const forgetView = () => {
  view = null;
};

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const direction = new THREE.Vector3();
const local = new THREE.Vector3();
const inverse = new THREE.Quaternion();

/**
 * Point the shared raycaster down the ray through a point on the glass.
 *
 * False when there is nothing to aim with, or when the point is outside the
 * sphere the curvilinear frame is drawn on - the dead paper in the corners of a
 * wide five-point sheet, where there is no world to hit.
 */
const aim = (clientX: number, clientY: number): boolean => {
  if (!view) return false;

  const { rect } = view;
  if (!rect.width || !rect.height) return false;
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = 1 - ((clientY - rect.top) / rect.height) * 2;

  raycaster.camera = view.camera;

  if (view.mode === 'linear') {
    raycaster.setFromCamera(ndc.set(x, y), view.camera);
    return true;
  }

  const { halfYaw, halfPitch } = fieldOf(view.fov, view.width, view.height);
  const rx = x * halfYaw;
  const ry = y * halfPitch;

  if (view.mode === 'cylindrical') {
    // Four point: the frame is a cylinder unrolled, so across is a bearing and
    // up is a pitch, each read straight off its own edge. Not the same mapping
    // as the other two, and picking it as though it were leaves everything away
    // from the middle of the frame slightly beside itself.
    if (Math.abs(ry) > Math.PI / 2) return false;
    direction
      .set(Math.sin(rx) * Math.cos(ry), Math.sin(ry), -Math.cos(rx) * Math.cos(ry))
      .applyQuaternion(view.camera.quaternion)
      .normalize();
    raycaster.set(view.camera.position, direction);
    return true;
  }

  const radius = Math.hypot(rx, ry);
  if (radius > Math.PI) return false;

  // Equidistant: distance from the centre of the frame is the angle away from
  // where you are looking, evenly, in every direction.
  const spread = radius > 1e-5 ? Math.sin(radius) / radius : 1;
  direction
    .set(rx * spread, ry * spread, -Math.cos(radius))
    .applyQuaternion(view.camera.quaternion)
    .normalize();
  raycaster.set(view.camera.position, direction);
  return true;
};

/** The nearest thing under a point on the glass that can be selected. */
export const pickObject = (clientX: number, clientY: number): SceneHit | null => {
  if (!aim(clientX, clientY) || !view) return null;

  for (const hit of raycaster.intersectObjects(view.root.children, true)) {
    let handle: SceneHit['handle'];
    let node: THREE.Object3D | null = hit.object;

    // A handle is a child of the thing it belongs to, so both are found on the
    // same walk up: the handle on the way past, the box at the top.
    while (node && !node.userData.selectableType) {
      if (!handle && node.visible && node.userData.handleAxis !== undefined) {
        handle = { axis: node.userData.handleAxis, sign: node.userData.handleSign };
      }
      node = node.parent;
    }
    if (!node) continue;

    return {
      type: node.userData.selectableType as 'box' | 'model',
      id: node.userData.selectableId as string,
      handle,
      point: hit.point.clone(),
    };
  }

  return null;
};

const level = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/**
 * Where a ray meets the floor - or a level plane at any height above it, which
 * is what something already lifted has to be carried along.
 *
 * As the ray flattens out towards the horizon its intersection with the plane
 * runs away to infinity, so a drag that strays a few pixels too high would fling
 * whatever is being carried out of the world. A grazing ray, or one landing
 * absurdly far off, returns nothing instead - the drag stops following rather
 * than teleporting.
 */
const MAX_REACH = 60; // metres from the eye
const MIN_SLOPE = 0.08; // about 4.6 degrees below horizontal

export const pickGround = (clientX: number, clientY: number, height = 0): THREE.Vector3 | null => {
  if (!aim(clientX, clientY) || !view) return null;

  const ray = raycaster.ray;
  if (Math.abs(ray.direction.y) < MIN_SLOPE) return null;

  level.constant = -height;
  const hit = new THREE.Vector3();
  if (!ray.intersectPlane(level, hit)) return null;
  if (hit.distanceTo(view.camera.position) > MAX_REACH) return null;

  return hit;
};

const reachFrom = new THREE.Vector3();
const reachTo = new THREE.Vector3();

/**
 * How many pixels a metre along a direction covers, at a place in the world.
 *
 * This is what decides whether a face of a box can be pushed at all. A face
 * turned to point straight at the eye covers no screen distance however far it
 * travels, and its handle sits exactly over the middle of the box it belongs to
 * - so offering it would mean that meeting a box square on, which is the most
 * ordinary thing anyone does with one, the middle of it resized instead of
 * moved. Below a few pixels a metre, the face is not a handle.
 */
export const screenReach = (at: THREE.Vector3, along: THREE.Vector3): number => {
  const here = project(reachFrom.copy(at));
  const there = project(reachTo.copy(at).add(along));
  if (!here || !there) return 0;
  return Math.hypot(there.x - here.x, there.y - here.y);
};

const across = new THREE.Vector3();

/**
 * How many pixels a metre covers at a place in the world, measured across the
 * view - which is what anything that wants to be a constant size on screen,
 * wherever it stands, has to divide by.
 */
export const pixelsPerMetreAt = (at: THREE.Vector3): number => {
  if (!view) return 0;
  across.set(1, 0, 0).applyQuaternion(view.camera.quaternion);
  return screenReach(at, across);
};

/**
 * Where a world point lands on the glass, in client pixels.
 *
 * The inverse of `aim`, and it has to be, or a face pushed under the finger
 * would travel at the wrong rate everywhere except the centre of a flat frame.
 * Null when the point is behind the eye, or - in a curvilinear frame narrower
 * than the hemisphere - outside the sheet entirely.
 */
export const project = (point: THREE.Vector3): { x: number; y: number } | null => {
  if (!view) return null;

  const { rect } = view;
  const toClient = (ndcX: number, ndcY: number) => ({
    x: rect.left + ((ndcX + 1) / 2) * rect.width,
    y: rect.top + ((1 - ndcY) / 2) * rect.height,
  });

  if (view.mode === 'linear') {
    local.copy(point).project(view.camera);
    if (local.z > 1) return null;
    return toClient(local.x, local.y);
  }

  local.copy(point).sub(view.camera.position);
  if (local.lengthSq() < 1e-12) return null;
  local.applyQuaternion(inverse.copy(view.camera.quaternion).invert()).normalize();

  const { halfYaw, halfPitch } = fieldOf(view.fov, view.width, view.height);

  if (view.mode === 'cylindrical') {
    return toClient(
      Math.atan2(local.x, -local.z) / halfYaw,
      Math.asin(THREE.MathUtils.clamp(local.y, -1, 1)) / halfPitch
    );
  }

  // The camera looks down its own -Z, so the angle away from straight ahead is
  // measured against that; the direction out from the centre of the frame is
  // whatever is left in the other two.
  const theta = Math.acos(THREE.MathUtils.clamp(-local.z, -1, 1));
  const outward = Math.hypot(local.x, local.y);
  const rx = outward > 1e-6 ? (local.x / outward) * theta : 0;
  const ry = outward > 1e-6 ? (local.y / outward) * theta : 0;

  return toClient(rx / halfYaw, ry / halfPitch);
};
