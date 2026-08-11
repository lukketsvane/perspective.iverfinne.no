import * as THREE from 'three';
import { fieldOf, stereographicAngle, stereographicRadius } from './projection';
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
 * The projection is the whole difficulty. The picture on the screen was not made
 * by the camera three thinks it has - it was read off a cube map, or off one
 * flat pass, by angle - so a flat ray through the pixel points somewhere the
 * viewer is not looking, which is why meshes plainly in view used to be
 * untappable. The mappings below are the same ones the panorama shader uses,
 * inverted.
 */

export interface SceneHit {
  type: 'box' | 'model' | 'lamp';
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
  viewNonce.value += 1;
};

/**
 * Bumped whenever anything about the projection changes.
 *
 * Anyone caching an answer that came out of `project` needs to know when to
 * throw it away, and the alternative is copying this module's inputs into their
 * own cache key - which is how the vanishing overlay came to key on the mode
 * and the window size but not the field of view, and froze while the field was
 * dragged. One number, bumped in the one place every one of those inputs
 * arrives through.
 */
export const viewNonce = { value: 0 };

export const forgetView = () => {
  view = null;
};

/**
 * Where the eye is, in metres.
 *
 * Everything else in here answers questions about the glass; this answers the
 * one question about the room that only the view can settle. A mark laid
 * between two places in the world subtends an angle at the eye, and the angle
 * is a different number from every place you could stand - so it cannot be
 * stored with the mark and has to be asked, from here, on the frame it is
 * drawn. Written into the caller's vector rather than handed a new one: this
 * is asked once per mark per frame.
 */
export const eyeAt = (into: THREE.Vector3): THREE.Vector3 | null =>
  view ? into.copy(view.camera.position) : null;

const raycaster = new THREE.Raycaster();
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

  /*
   * Both radial systems, which differ in one line: how far off the axis a given
   * distance from the middle of the frame is.
   *
   * Equidistant reads the distance as the angle itself. Stereographic reads it
   * as the tangent of the half angle, which never reaches half a turn however
   * far out the pixel is - so a stereographic frame has no dead paper in its
   * corners, where an equidistant one past the hemisphere does.
   */
  const field = Math.max(halfYaw, halfPitch);
  const theta = view.mode === 'stereographic' ? stereographicAngle(radius, field) : radius;
  if (theta > Math.PI) return false;

  const spread = radius > 1e-5 ? Math.sin(theta) / radius : 1;
  direction
    .set(rx * spread, ry * spread, -Math.cos(theta))
    .applyQuaternion(view.camera.quaternion)
    .normalize();
  raycaster.set(view.camera.position, direction);
  return true;
};

/**
 * The nearest thing under a point on the glass that can be selected - except
 * that A HANDLE ANYWHERE ALONG THE RAY BEATS THE NEAREST BODY.
 *
 * The face handles are drawn with depthTest off, on purpose and from the
 * beginning: a mark that says "this face can be pushed" is no use hidden inside
 * the form it belongs to. So all six of them are visible, including the three
 * on the far side - and a picker that took the nearest hit made half of what it
 * had drawn untouchable. You could see the dot, aim at the dot, press the dot,
 * and move the box.
 *
 * Preferring the handle costs nothing anywhere else. Handles exist only on the
 * current selection and only where the face has come clear of the middle of its
 * own box, so the zone in question is a nineteen-pixel circle over a mark that
 * is already drawn on top of everything. If you can see it, it takes the press:
 * which is the rule the rest of this app is built on.
 */
export const pickObject = (clientX: number, clientY: number): SceneHit | null => {
  if (!aim(clientX, clientY) || !view) return null;

  let nearest: SceneHit | null = null;

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

    const found: SceneHit = {
      type: node.userData.selectableType as 'box' | 'model' | 'lamp',
      id: node.userData.selectableId as string,
      handle,
      point: hit.point.clone(),
    };
    // Hits arrive nearest first, so the first handle found is the nearest one.
    if (handle) return found;
    if (!nearest) nearest = found;
  }

  return nearest;
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

const heading = new THREE.Vector3();

/**
 * Where a direction *relative to where you are looking* lands on the glass.
 *
 * Given in the camera's own frame: -Z straight ahead, +X to the right, +Y up.
 * Everything drawn about the frame rather than about the room is this question
 * - the cone of vision, for one, which is a fixed angle off the view axis and
 * has to be asked of whichever projection is on rather than assumed round.
 */
export const projectView = (x: number, y: number, z: number): { x: number; y: number } | null => {
  if (!view) return null;
  heading.set(x, y, z).applyQuaternion(view.camera.quaternion).add(view.camera.position);
  return project(heading);
};

/*
 * `directionAt` and `projectDirection` used to live here: a mark on the glass
 * turned into a direction from the eye, and a direction turned back into a
 * mark. They were the measure's whole arithmetic while a measure was two
 * directions, and nothing else ever asked - a tape anchored at two PLACES asks
 * `project` like everything else in the app. Removed rather than left as two
 * exports with no callers.
 */

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
  const field = Math.max(halfYaw, halfPitch);
  const radius = view.mode === 'stereographic' ? stereographicRadius(theta, field) : theta;

  /*
   * Which way out from the middle of the frame.
   *
   * Undefined for the two directions where there is no "out": straight ahead,
   * and straight behind. Straight ahead is the middle of the frame and zero is
   * the right answer. Straight behind is the *rim* - theta is pi - and zero was
   * putting it in the middle of the frame, which is as wrong as an answer can
   * be and is exactly the ordinary case: look down a box's own axis, which is
   * one-point perspective, and the point behind you was drawn on top of the
   * point in front of you. Any bearing will do out there, so it takes the one
   * to the right, and lands where it belongs: off the page.
   */
  const outward = Math.hypot(local.x, local.y);
  const settled = outward > 1e-6;
  const rx = settled ? (local.x / outward) * radius : local.z > 0 ? radius : 0;
  const ry = settled ? (local.y / outward) * radius : 0;

  return toClient(rx / halfYaw, ry / halfPitch);
};
