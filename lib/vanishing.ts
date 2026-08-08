import * as THREE from 'three';
import { project } from './pick';
import type { PerspectiveMode } from '../types';

/**
 * Where the selected box's own edges converge, and the lines that run there.
 *
 * This is what a perspective reference is for. Every box in a scene has its own
 * vanishing points, and where they fall is decided by how that box is turned
 * relative to you - not by the scene being "in two-point perspective". Turn one
 * box off the grid and it gets its own set. That is the whole lesson, and it is
 * invisible until somebody draws the points.
 *
 * The maths is one line and it is the same in every projection: a direction d
 * vanishes at the image of a point infinitely far along d, and every point on
 * the ray from the eye along d lands on the same pixel - so the vanishing point
 * is simply where `eye + d` is drawn. Ask the projection that question and the
 * answer is right whether the sheet is flat or curved.
 *
 * What does change is everything else about it.
 *
 * On a flat sheet only one of d and -d is in front of you, the other being
 * behind the frame, so a family of parallel edges has one point and the lines
 * to it are straight. On a curved sheet both are on the page - a hemisphere
 * sees the whole horizon - and the edge between them is not a straight line but
 * a great circle. So the edges are carried out to the points by sampling the
 * line itself and asking the projection where each sample lands, which draws a
 * straight line straight and a bent one bent, without either case knowing about
 * the other.
 *
 * That is the thing a five-point sheet is for: the ruled circles on it are the
 * two-point construction anyone already knows, bent round the viewer.
 */

export interface VanishingPoint {
  /** Screen position in CSS pixels, origin top left. */
  x: number;
  y: number;
  /**
   * True for the point you are facing, false for its opposite behind you.
   * Only a curved sheet ever shows both.
   */
  facing: boolean;
}

/** One edge of the box, carried out to the points, in CSS pixels. */
export type Curve = [number, number][];

export const vanishing: {
  /** Bumped whenever the numbers change, so the overlay knows to redraw. */
  nonce: number;
  points: VanishingPoint[];
  curves: Curve[];
} = { nonce: 0, points: [], curves: [] };

export interface VanishingBox {
  centre: THREE.Vector3;
  /** Full extents along the box's own x, y and z. */
  size: THREE.Vector3;
  rotationY: number;
}

const point = new THREE.Vector3();
const forward = new THREE.Vector3();
const corner = new THREE.Vector3();
const axis = new THREE.Vector3();

/**
 * How near to parallel with the image plane a direction may get before its
 * vanishing point is too far off screen to mean anything. cos 84 degrees.
 *
 * A flat frame only: on a curved one, a direction square to the line of sight
 * vanishes ninety degrees out, which is on the page and is exactly the point
 * worth seeing.
 */
const MIN_ALIGNMENT = 0.105;

/** How many places each edge is asked about between one point and the other. */
const SAMPLES = 26;

/**
 * How far apart two samples may land before they are taken to be two pieces of
 * the same line rather than one - which is what happens where a great circle
 * leaves one edge of the sheet and comes back on the other.
 */
const BREAK = 400; // pixels

/**
 * What the overlay was last worked out for.
 *
 * Every curve is a couple of dozen questions put to the projection, and the
 * answers only change when the viewer or the box does - which, in a tool whose
 * whole purpose is to set a view up and then stand still drawing from it, is
 * hardly ever. Standing still, this stops at a string comparison rather than
 * building three hundred points and throwing them away sixty times a second.
 */
const drawnFor = { key: '' };

export const clearVanishing = () => {
  drawnFor.key = '';
  if (vanishing.points.length === 0 && vanishing.curves.length === 0) return;
  vanishing.points = [];
  vanishing.curves = [];
  vanishing.nonce += 1;
};

/**
 * One edge, carried out to infinity in both directions.
 *
 * The parameter runs over (-1, 1) and the distance along the line over all of
 * (-inf, inf), so the samples crowd where the picture does: closely near the
 * box, sparsely out towards the points, which is where a line has least to say.
 */
const carry = (from: THREE.Vector3, along: THREE.Vector3, scale: number): Curve[] => {
  const pieces: Curve[] = [];
  let run: Curve = [];

  const cut = () => {
    if (run.length > 1) pieces.push(run);
    run = [];
  };

  for (let i = 0; i <= SAMPLES; i++) {
    const u = (i / SAMPLES) * 2 - 1;
    point.copy(from).addScaledVector(along, (u / (1 - Math.abs(u) + 1e-6)) * scale);

    const at = project(point);
    if (!at) {
      cut();
      continue;
    }
    const last = run[run.length - 1];
    if (last && Math.hypot(at.x - last[0], at.y - last[1]) > BREAK) cut();
    run.push([at.x, at.y]);
  }

  cut();
  return pieces;
};

/** Recompute the overlay for one box. */
export const updateVanishing = (camera: THREE.Camera, mode: PerspectiveMode, box: VanishingBox) => {
  const key = [
    mode,
    camera.position.x, camera.position.y, camera.position.z,
    camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w,
    box.centre.x, box.centre.y, box.centre.z,
    box.size.x, box.size.y, box.size.z,
    box.rotationY,
    window.innerWidth, window.innerHeight,
  ].join(',');
  if (key === drawnFor.key) return;
  drawnFor.key = key;

  camera.getWorldDirection(forward);
  // Every system on offer is curved now; the flat one went with the room.
  const curved = true;

  const cos = Math.cos(box.rotationY);
  const sin = Math.sin(box.rotationY);

  /*
   * The box's own three axes, and the half-extents across the other two - which
   * is what places the four edges running along each.
   *
   * A flat sheet is left with the two horizontal families, as it always was:
   * that is the one and two point construction, and the vertical one vanishes
   * so far off the page that drawing it would be drawing nothing. A curved
   * sheet takes all three, because the third is the fifth point.
   */
  const families: [THREE.Vector3, THREE.Vector3, number, THREE.Vector3, number][] = [
    [new THREE.Vector3(cos, 0, -sin), new THREE.Vector3(sin, 0, cos), box.size.z / 2, new THREE.Vector3(0, 1, 0), box.size.y / 2],
    [new THREE.Vector3(sin, 0, cos), new THREE.Vector3(cos, 0, -sin), box.size.x / 2, new THREE.Vector3(0, 1, 0), box.size.y / 2],
  ];
  if (curved) {
    families.push([
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(cos, 0, -sin),
      box.size.x / 2,
      new THREE.Vector3(sin, 0, cos),
      box.size.z / 2,
    ]);
  }

  const points: VanishingPoint[] = [];
  const curves: Curve[] = [];
  const reach = Math.max(camera.position.distanceTo(box.centre), 1);

  for (const [rawAxis, across, sideways, up, high] of families) {
    axis.copy(rawAxis);

    if (!curved) {
      // Only one of d and -d is in front of the camera, and they share a
      // vanishing point. Take the one that projects.
      if (axis.dot(forward) < 0) axis.negate();
      if (Math.abs(axis.dot(forward)) < MIN_ALIGNMENT) continue;
    }

    // The point itself: where a place infinitely far along the axis is drawn.
    for (const way of curved ? [1, -1] : [1]) {
      point.copy(camera.position).addScaledVector(axis, way);
      const at = project(point);
      if (at) points.push({ x: at.x, y: at.y, facing: way * axis.dot(forward) > 0 });
    }

    // One curve per edge running along this axis, drawn the whole way across.
    for (const side of [-1, 1]) {
      for (const lift of [-1, 1]) {
        corner
          .copy(box.centre)
          .addScaledVector(across, side * sideways)
          .addScaledVector(up, lift * high);
        curves.push(...carry(corner, axis, reach));
      }
    }
  }

  // Only wake the overlay when something actually moved. Bumping the nonce
  // every frame re-rendered the whole SVG sixty times a second for points that
  // had not shifted a pixel, and that showed up as everything else stuttering.
  if (settled(points, curves)) return;
  vanishing.points = points;
  vanishing.curves = curves;
  vanishing.nonce += 1;
};

/** True when the overlay is the same as the one already on screen. */
const settled = (points: VanishingPoint[], curves: Curve[]) => {
  if (vanishing.points.length !== points.length) return false;
  if (vanishing.curves.length !== curves.length) return false;

  for (let i = 0; i < points.length; i++) {
    if (Math.abs(vanishing.points[i].x - points[i].x) > 0.5) return false;
    if (Math.abs(vanishing.points[i].y - points[i].y) > 0.5) return false;
  }
  for (let i = 0; i < curves.length; i++) {
    const before = vanishing.curves[i];
    const after = curves[i];
    if (before.length !== after.length) return false;
    // The ends carry the movement; a curve whose ends have not shifted has not.
    for (const at of [0, before.length - 1]) {
      if (Math.abs(before[at][0] - after[at][0]) > 0.5) return false;
      if (Math.abs(before[at][1] - after[at][1]) > 0.5) return false;
    }
  }
  return true;
};
