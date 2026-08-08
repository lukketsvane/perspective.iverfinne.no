import * as THREE from 'three';
import { project, viewNonce } from './pick';
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

/** Whether a projected point landed on the page at all. */
const onSheet = (at: { x: number; y: number }) =>
  at.x >= 0 && at.y >= 0 && at.x <= window.innerWidth && at.y <= window.innerHeight;

export const vanishing: {
  /** Bumped whenever the numbers change, so the overlay knows to redraw. */
  nonce: number;
  points: VanishingPoint[];
  curves: Curve[];
  /**
   * The room's own five, wherever they are off the sheet.
   *
   * The panorama draws these per-pixel, and structurally cannot draw one that
   * is not on its sheet - so at the ninety-degree field the tool now opens on,
   * the guides' first rung showed a horizon and one ring at dead centre, the
   * one point in the picture you never rule towards. The lateral pair needs a
   * 180 degree field to touch the frame edge and the zenith needs about 277.
   *
   * The overlay already knows how to pin a point it cannot show, and does it
   * for the selection's. These are the same kind of thing.
   */
  room: VanishingPoint[];
} = { nonce: 0, points: [], curves: [], room: [] };

/** The six directions a room's edges run along. */
const ROOM_AXES = [
  new THREE.Vector3(0, 0, -1),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
];

const towards = new THREE.Vector3();

/**
 * Where the room's five points land, kept only where the sheet cannot show them.
 *
 * Two constructions meaning the same thing, one of them pinned and one of them
 * dropped, was the state before this.
 */
export const updateRoomPoints = (camera: THREE.Camera, wanted: boolean) => {
  const found: VanishingPoint[] = [];
  if (wanted) {
    for (const axis of ROOM_AXES) {
      const at = project(towards.copy(camera.position).add(axis));
      // On the sheet is the shader's business; it draws a truer ring than an
      // overlay can, per pixel and in the right place.
      if (at && !onSheet(at)) found.push({ x: at.x, y: at.y, facing: true });
    }
  }
  if (found.length === vanishing.room.length && found.every((p, i) =>
    Math.abs(p.x - vanishing.room[i].x) < 0.5 && Math.abs(p.y - vanishing.room[i].y) < 0.5
  )) {
    return;
  }
  vanishing.room = found;
  vanishing.nonce += 1;
};

export interface VanishingBox {
  centre: THREE.Vector3;
  /** Full extents along the box's own x, y and z. */
  size: THREE.Vector3;
  rotationY: number;
}

const point = new THREE.Vector3();
const corner = new THREE.Vector3();
const axis = new THREE.Vector3();
const toEye = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** How many places each edge is asked about on its way out to the point. */
const SAMPLES = 20;

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
 * One edge, carried from its back end out to the point it runs to.
 *
 * It used to run both ways - the parameter over (-1, 1) and the distance along
 * the line over all of (-inf, +inf) - which draws the whole great circle the
 * edge lies on rather than the edge. Half of that is the half running away from
 * the point you are ruling towards, and it is the half that made the overlay a
 * net: every curve crossed the entire sheet, left it, and came back on the
 * other side.
 *
 * What you rule when you draw is a line from the thing to its point. So this
 * starts behind the object, comes through it, and stops at the point. The
 * samples still crowd where the picture does - closely near the box, sparsely
 * out towards the point, which is where a line has least to say.
 */
const carry = (from: THREE.Vector3, along: THREE.Vector3, scale: number): Curve[] => {
  const pieces: Curve[] = [];
  let run: Curve = [];

  const cut = () => {
    if (run.length > 1) pieces.push(run);
    run = [];
  };

  for (let i = 0; i <= SAMPLES; i++) {
    const u = i / SAMPLES;
    point.copy(from).addScaledVector(along, (u / (1 - u + 1e-6)) * scale);

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
    // Everything about the projection, in one number. This used to list the
    // mode and the window size, which is most of what `project` depends on and
    // not all of it: the field of view was missing, so dragging the field from
    // a standstill rescaled the whole picture while the overlay sat still on
    // top of it, pointing at where the points used to be.
    viewNonce.value,
    camera.position.x, camera.position.y, camera.position.z,
    camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w,
    box.centre.x, box.centre.y, box.centre.z,
    box.size.x, box.size.y, box.size.z,
    box.rotationY,
  ].join(',');
  if (key === drawnFor.key) return;
  drawnFor.key = key;

  const cos = Math.cos(box.rotationY);
  const sin = Math.sin(box.rotationY);

  /*
   * The box's two horizontal axes: the direction, the half-extent along it, and
   * the two directions across it with their half-extents.
   *
   * Two families, not three. The third was the verticals, and a vertical is a
   * vertical - its family is the world's, and both of its points are the ones
   * the construction sheet already marks: `Panorama.tsx:420` rings +Y and -Y at
   * the first rung of the guides, and `Panorama.tsx:394` rules the whole
   * meridian family they meet at, at the second. Every upright edge in the
   * world lies on one of those meridians, including these four, so drawing them
   * here drew the sheet's own fifth point a second time in a second ink - and
   * at ninety degrees, where the zenith is three and a half frames off the top
   * of the page, it drew it as two pins stuck to the top and bottom edges.
   *
   * What is left is the part that really is this thing's own: how *it* is
   * turned relative to you. Turn it off the grid and this pair moves off the
   * scene's. That is the lesson, and it is the only thing here the room does
   * not already say.
   */
  const families: [THREE.Vector3, number, THREE.Vector3, number, THREE.Vector3, number][] = [
    [new THREE.Vector3(cos, 0, -sin), box.size.x / 2, new THREE.Vector3(sin, 0, cos), box.size.z / 2, UP, box.size.y / 2],
    [new THREE.Vector3(sin, 0, cos), box.size.z / 2, new THREE.Vector3(cos, 0, -sin), box.size.x / 2, UP, box.size.y / 2],
  ];

  const points: VanishingPoint[] = [];
  const curves: Curve[] = [];
  const reach = Math.max(camera.position.distanceTo(box.centre), 1);
  toEye.subVectors(camera.position, box.centre);

  for (const [rawAxis, along, across, sideways, up, high] of families) {
    axis.copy(rawAxis);
    /*
     * Which way the edge recedes - not which way the camera happens to point.
     *
     * The two agree for anything near the middle of the frame and part company
     * for anything off to one side of a wide one, where an edge can run away
     * from you while pointing across your view. It is the receding direction
     * that decides which of the two points the edge actually runs to, and the
     * sign falls out of one dot product: the far end of an edge is the end with
     * the larger |base + a*h - eye|, and the difference between the two ends is
     * 4h times a.(base - eye).
     */
    if (axis.dot(toEye) > 0) axis.negate();

    /*
     * The point itself: where a place infinitely far along the axis is drawn.
     *
     * Both ways round, because a curved sheet has room for both - but the one
     * behind you is only kept where it actually lands on the page. Pinned to a
     * frame edge it was worse than absent: at ninety degrees the rear twin sits
     * three to seven frame-widths out, and a tick on the left edge saying "rule
     * towards this" is pointing at something behind your head.
     */
    for (const way of [1, -1]) {
      point.copy(camera.position).addScaledVector(axis, way);
      const at = project(point);
      if (!at) continue;
      if (way < 0 && !onSheet(at)) continue;
      points.push({ x: at.x, y: at.y, facing: way > 0 });
    }

    /*
     * Two edges, not four - and both of them at the corner nearest you.
     *
     * All four edges running along an axis meet at the same point, so four is
     * three more than the point needs. But one is fewer than the *lesson*
     * needs: a single line running through a thing to a mark is a pointer, and
     * what a perspective study is about is the closing of two lines. Take the
     * top and the bottom of the near vertical corner and the wedge between them
     * is the convergence itself - the thing you check your own drawing against.
     *
     * The near corner, in particular, because the four rays of the two families
     * then all pass through the same two points in space: family A's edge at
     * (side_B, lift, *) and family B's edge at (side_A, lift, *) meet exactly at
     * (side_A, lift, side_B). So they radiate from one place on the page and
     * read as one construction, rather than netting the object from four.
     */
    const side = toEye.dot(across) >= 0 ? 1 : -1;
    for (const lift of [-1, 1]) {
      corner
        .copy(box.centre)
        .addScaledVector(across, side * sideways)
        .addScaledVector(up, lift * high)
        // Start at the edge's back end, so the drawn line covers the edge
        // itself before it carries on past it.
        .addScaledVector(axis, -along);
      curves.push(...carry(corner, axis, reach));
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
    /*
     * Every vertex, not just the ends.
     *
     * It compared the first and last only, on the reasoning that the ends carry
     * the movement. They do not: the last vertex is a vanishing point, which
     * depends on the direction of the edge and not on where the edge is, so a
     * whole curve could swing about a fixed pair of ends and be called settled.
     * Twenty-one comparisons is free beside the twenty-one projections that
     * just produced them, and this only runs at all once the key above has
     * already said something moved.
     */
    for (let at = 0; at < before.length; at++) {
      if (Math.abs(before[at][0] - after[at][0]) > 0.5) return false;
      if (Math.abs(before[at][1] - after[at][1]) > 0.5) return false;
    }
  }
  return true;
};
