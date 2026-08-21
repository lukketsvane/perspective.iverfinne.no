import * as THREE from 'three';
import { project, projectView, viewNonce } from './pick';
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
 * AND THEY ARE NOT ALWAYS ON THE HORIZON. A family of parallel edges vanishes
 * on the eye-level line only when the family is LEVEL, which is true of every
 * edge of every box that sits square on a floor and false of a ramp, a roof, a
 * staircase's nosings or a leaning ladder. Their pair sits as far above and
 * below the line as the family leans, and it is the one fact about vanishing
 * points that a room full of upright boxes can never demonstrate. So the two
 * families below are built out of the thing's own three axes rather than out of
 * one bearing and an assumed upright - see `VanishingBox.rotation`.
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
  /**
   * THE PRINCIPAL POINT: where you are looking, marked on the sheet.
   *
   * The one mark on a ruled page that is not in the world. Every other point
   * here is the image of a direction things run along, so it slides when you
   * turn and stays where the room says it is; this one is the image of the
   * direction you are LOOKING along, which by construction is the middle of the
   * frame in all four of this tool's projections. Turn as far as you like and it
   * does not move, because it is not a thing you are looking at - it is where
   * you are looking.
   *
   * IT WAS MISSING, AND THE LESSON ALREADY TOLD PEOPLE IT WAS THERE. A card in
   * the second act named "the ring in the middle of the picture" as the
   * principal point and asked the viewer to turn and watch it stay put. The
   * ring in the middle of the picture is the -Z axis point the panorama draws,
   * which is world-fixed and therefore slides straight off centre the moment
   * anybody does what the card asks. The card was right about the idea and
   * pointing at the wrong mark, and the honest fix is the mark.
   *
   * Drawn as a CROSS rather than a ring, and that is the whole of why it is
   * safe to have here: a ring on this sheet means "a family of parallels goes
   * there", and this is the one point in the picture nothing is ever ruled
   * towards. Two marks that mean opposite things must not look alike.
   */
  sight: { x: number; y: number } | null;
  /**
   * The construction ON the thing rather than the rays off it: the rectangle
   * it stands on, its diagonals, and the lines that quarter it.
   *
   * Kept apart from `curves` because they are a different kind of mark and are
   * drawn as one - a ray is a straight edge carried to a point half a screen
   * away and fades as it goes, while these are short lines lying on a surface
   * and want one even weight. Same sampling either way: a straight line on a
   * curved sheet is not straight, and the only honest way to draw one is to
   * ask the projection about it in a dozen places.
   */
  divisions: Curve[];
} = { nonce: 0, points: [], curves: [], room: [], divisions: [], sight: null };

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
  /*
   * And where you are looking, which is asked of the projection rather than
   * assumed to be half the window: the four sheets put it in the same place,
   * but they put it there for four different reasons, and a mark drawn at
   * `width / 2` is a mark that is right by coincidence.
   */
  const sight = wanted ? projectView(0, 0, -1) : null;
  const still =
    (sight === null && vanishing.sight === null) ||
    (sight !== null && vanishing.sight !== null &&
      Math.abs(sight.x - vanishing.sight.x) < 0.5 &&
      Math.abs(sight.y - vanishing.sight.y) < 0.5);
  if (still && found.length === vanishing.room.length && found.every((p, i) =>
    Math.abs(p.x - vanishing.room[i].x) < 0.5 && Math.abs(p.y - vanishing.room[i].y) < 0.5
  )) {
    return;
  }
  vanishing.room = found;
  vanishing.sight = sight;
  vanishing.nonce += 1;
};

export interface VanishingBox {
  centre: THREE.Vector3;
  /** Full extents along the box's own x, y and z. */
  size: THREE.Vector3;
  /**
   * How the thing is turned, as a full three-axis Euler in radians.
   *
   * IT USED TO BE ONE ANGLE, and that was a hole rather than a simplification.
   * Everything in this tool stands square on the floor, so a single Y turn
   * described every object it had - until a RAMP, which is the one form whose
   * edges do not run level. With only a Y turn to work from, the code below
   * built its two families out of `cos`, `sin` and a hard-coded world upright,
   * which for a tilted box does not fail: it draws two confident rays to two
   * points sitting neatly on the eye-level line, and they are the points of a
   * box that is not there. A blank overlay is a gap; a plausible wrong answer
   * is a lie, and this tool exists to be checked against.
   *
   * A mesh has no Euler of its own and never will - it turns on one bearing -
   * so the mesh path hands over `[0, rotationY, 0]` and gets exactly what it
   * got before.
   */
  rotation: [number, number, number];
}

const point = new THREE.Vector3();
const corner = new THREE.Vector3();
const axis = new THREE.Vector3();
const toEye = new THREE.Vector3();

/*
 * The thing's own three axes, worked out once per recompute.
 *
 * Kept as module scratch like everything else here: this runs inside the frame
 * loop, and three vectors and a quaternion allocated sixty times a second is
 * three vectors and a quaternion for the collector to find sixty times a
 * second.
 */
const spin = new THREE.Quaternion();
const facing = new THREE.Euler();
const own = { x: new THREE.Vector3(), y: new THREE.Vector3(), z: new THREE.Vector3() };
const alongA = new THREE.Vector3();
const alongB = new THREE.Vector3();
const base = new THREE.Vector3();

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
  if (
    vanishing.points.length === 0 &&
    vanishing.curves.length === 0 &&
    vanishing.divisions.length === 0
  ) {
    return;
  }
  vanishing.points = [];
  vanishing.curves = [];
  vanishing.divisions = [];
  vanishing.nonce += 1;
};

/**
 * A straight line in the WORLD, between two places, drawn as it really lands.
 *
 * `carry` above runs a ray out to a vanishing point; this is its finite
 * cousin, and it exists for the same reason the ray is sampled rather than
 * drawn as a segment between two projected ends: on any of the curved sheets
 * here, the image of a straight line is an arc. Two ends and a straight stroke
 * between them would be a chord across it, and at the fields this tool opens on
 * that chord can miss the middle of the line by a third of the frame.
 *
 * Eight samples. These are short - a side or a diagonal of one object's
 * footprint - so the arc across one of them is gentle, and every sample is a
 * projection on the main thread.
 */
const SPAN_SAMPLES = 8;

const spanPoint = new THREE.Vector3();

const span = (from: THREE.Vector3, to: THREE.Vector3): Curve[] => {
  const pieces: Curve[] = [];
  let run: Curve = [];
  const cut = () => {
    if (run.length > 1) pieces.push(run);
    run = [];
  };
  for (let i = 0; i <= SPAN_SAMPLES; i++) {
    spanPoint.lerpVectors(from, to, i / SPAN_SAMPLES);
    const at = project(spanPoint);
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

/**
 * Recompute the overlay for one box.
 *
 * `level` is the rung of the selection's own construction: 1 is the rays to
 * its points, 2 adds the rectangle it stands on and the diagonals that FIND
 * the centre of that rectangle in perspective, and 3 adds the two lines
 * through that centre - the floor under the thing, divided in four.
 *
 * The diagonals are the whole reason the rungs are in that order. Halving a
 * receding rectangle by eye is guesswork and the answer is always too far
 * away; halving it by its own diagonals is exact, needs no measurement, and
 * works at any angle on any sheet. It is the first construction anybody is
 * taught and the one this tool can show being true rather than assert.
 */
export const updateVanishing = (
  camera: THREE.Camera,
  mode: PerspectiveMode,
  box: VanishingBox,
  level: 1 | 2 | 3 = 1
) => {
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
    box.rotation[0], box.rotation[1], box.rotation[2],
    level,
  ].join(',');
  if (key === drawnFor.key) return;
  drawnFor.key = key;

  /*
   * THE THING'S OWN THREE DIRECTIONS, taken from its own turn.
   *
   * This was `cos` and `sin` of a single angle, with the world's upright
   * standing in for the third - which is exact for everything that sits square
   * on a floor and quietly false for anything that does not. A quaternion
   * costs one allocation-free multiply and is right for any attitude, so the
   * special case is gone rather than guarded.
   */
  spin.setFromEuler(facing.set(box.rotation[0], box.rotation[1], box.rotation[2]));
  own.x.set(1, 0, 0).applyQuaternion(spin);
  own.y.set(0, 1, 0).applyQuaternion(spin);
  own.z.set(0, 0, 1).applyQuaternion(spin);

  /*
   * Two of the box's three axes: the direction, the half-extent along it, and
   * the two directions across it with their half-extents.
   *
   * Two families, not three, and the third is still the one left out - but the
   * reason has moved. It used to be that the third family WAS the world's
   * verticals, so drawing it drew the sheet's own fifth point a second time in
   * a second ink: `Panorama.tsx` rings +Y and -Y at the first rung of the
   * guides and rules the whole meridian family they meet at, at the second, and
   * at ninety degrees - where the zenith is three and a half frames off the top
   * of the page - the duplicate landed as two pins stuck to the top and bottom
   * edges.
   *
   * Tilt the box and its third axis is no longer the world's upright, so that
   * argument no longer covers it. It is still left out, and now for a plainer
   * reason: a ramp leans by a fifth of a radian, so its third family's points
   * sit a fifth of a radian off the zenith - which is to say, a couple of
   * frames off the top of the page, beside the mark that is already there,
   * saying a thing nobody is drawing. What a ramp is FOR is the family that
   * runs up the slope, and that one is here.
   *
   * The two that are drawn are the part that really is this thing's own: how
   * *it* is turned relative to you. Turn it off the grid and the pair moves off
   * the scene's; tilt it, and the pair leaves the horizon altogether, which is
   * the one thing in perspective a floor full of boxes cannot show you.
   */
  const families: [THREE.Vector3, number, THREE.Vector3, number, THREE.Vector3, number][] = [
    [own.x, box.size.x / 2, own.z, box.size.z / 2, own.y, box.size.y / 2],
    [own.z, box.size.z / 2, own.x, box.size.x / 2, own.y, box.size.y / 2],
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

  /*
   * THE FOOTPRINT, AND WHAT IS DRAWN ON IT.
   *
   * The rectangle the thing stands on, taken at its base rather than through
   * its middle: a floor is what you divide when you are placing things at
   * halves and quarters of a span, and it is the one face of a box that is
   * always there to be divided whether the object is a box, a chair or a
   * figure.
   *
   * Corners in the order round the rectangle, so consecutive pairs are sides
   * and the two crossings are the diagonals.
   */
  const divisions: Curve[] = [];
  if (level >= 2) {
    // The face it rests on, which for anything tilted is not a floor and not
    // level - so it is measured down the box's OWN upright rather than the
    // world's, and comes out lying on the slope the way the box does.
    const A = alongA.copy(own.x).multiplyScalar(box.size.x / 2);
    const B = alongB.copy(own.z).multiplyScalar(box.size.z / 2);
    base.copy(box.centre).addScaledVector(own.y, -box.size.y / 2);
    const at = (a: number, b: number) =>
      new THREE.Vector3().copy(base).addScaledVector(A, a).addScaledVector(B, b);

    const round = [at(-1, -1), at(1, -1), at(1, 1), at(-1, 1)];
    for (let i = 0; i < 4; i++) divisions.push(...span(round[i], round[(i + 1) % 4]));
    // The two diagonals: where they cross IS the centre, on any sheet and at
    // any angle, without a measurement anywhere in it.
    divisions.push(...span(round[0], round[2]), ...span(round[1], round[3]));

    if (level >= 3) {
      // ...and the halving lines through that crossing, which is the rectangle
      // divided in four. Drawn from side midpoint to side midpoint, which is
      // exactly what the diagonals just located.
      divisions.push(...span(at(0, -1), at(0, 1)), ...span(at(-1, 0), at(1, 0)));
    }
  }

  // Only wake the overlay when something actually moved. Bumping the nonce
  // every frame re-rendered the whole SVG sixty times a second for points that
  // had not shifted a pixel, and that showed up as everything else stuttering.
  if (settled(points, curves, divisions)) return;
  vanishing.points = points;
  vanishing.curves = curves;
  vanishing.divisions = divisions;
  vanishing.nonce += 1;
};

/** True when the overlay is the same as the one already on screen. */
const settled = (points: VanishingPoint[], curves: Curve[], divisions: Curve[]) => {
  if (vanishing.points.length !== points.length) return false;
  if (vanishing.curves.length !== curves.length) return false;
  if (vanishing.divisions.length !== divisions.length) return false;

  for (let i = 0; i < points.length; i++) {
    if (Math.abs(vanishing.points[i].x - points[i].x) > 0.5) return false;
    if (Math.abs(vanishing.points[i].y - points[i].y) > 0.5) return false;
  }
  return sameLines(vanishing.curves, curves) && sameLines(vanishing.divisions, divisions);
};

/** Whether two lists of polylines are the same picture, vertex for vertex. */
const sameLines = (before: Curve[], after: Curve[]) => {
  for (let i = 0; i < after.length; i++) {
    const was = before[i];
    const now = after[i];
    if (!was || was.length !== now.length) return false;
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
    for (let at = 0; at < was.length; at++) {
      if (Math.abs(was[at][0] - now[at][0]) > 0.5) return false;
      if (Math.abs(was[at][1] - now[at][1]) > 0.5) return false;
    }
  }
  return true;
};
