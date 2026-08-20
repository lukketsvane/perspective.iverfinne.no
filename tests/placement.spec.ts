import type { Page } from '@playwright/test';
import type { SceneInstance } from '../types';
import { test, expect, blockOutABox, clearTheScene, clickIn, find, openShelf, readSceneBundle } from './harness';

// Placing needs the floor the opening street occupies, and every count below
// is a count of what the spec itself made - so this file walks in bare.
test.use({ bare: true });

/**
 * NOTHING STANDS INSIDE ANYTHING ELSE.
 *
 * This is the one part of the app where a bug is invisible by definition. Three
 * cubes at one point look exactly like one cube; three lamps at one point look
 * like one lamp that is three times too bright; a chair through a box reads as a
 * chair in front of a box until you walk round it. All of that shipped, and it
 * shipped because `findFreeSpot` was only ever handed the meshes and the two
 * calls that put a cube or a lamp down did not ask it anything at all - see the
 * header of lib/placement.ts, which is the confession.
 *
 * So every assertion here is a number out of the exported scene, not a picture.
 * A fingerprint cannot tell one cube from three in the same cell, which is the
 * exact failure this file is for; and metres are what the fix is written in.
 *
 * The numbers the clearances are checked against are lib/placement.ts's own -
 * LAMP_RADIUS 0.35, CLEARANCE 0.06, and the cube's deliberate zero - written
 * out here rather than imported, because importing that module into the test
 * process drags three.js in behind it, and because a spec that reads its
 * expectations out of the code under test agrees with that code by
 * construction. If one of these moves, this file should have to be edited.
 */

/** A finger's width, the gap left between two things that had to step apart. */
const CLEARANCE = 0.06;

/** Half a metre cube, and the mark a lamp is drawn as. */
const CUBE_RADIUS = 0.5;
const LAMP_RADIUS = 0.35;

/** Metres, and rounding: everything here is computed from trig, not typed in. */
const EPSILON = 1e-6;

type Spot = [number, number, number];

/** How far apart two things are ON THE FLOOR, which is the only distance placement cares about. */
const gap = (a: Spot, b: Spot) => Math.hypot(a[0] - b[0], a[2] - b[2]);

/** What a placed mesh takes up, exactly as lib/loadModel.ts's modelRadius measures it. */
const footprint = (instance: SceneInstance) =>
  (Math.max(instance.size[0], instance.size[2]) * instance.scale) / 2;

/** store.ts's snapToCell: the centre of the cell a point falls in. */
const cell = (v: number) => Math.floor(v) + 0.5;

/** True if a coordinate is a cell centre - i.e. the thing is square on the metre ruling. */
const onTheRuling = (v: number) => Math.abs(Math.abs(v - Math.round(v)) - 0.5) < EPSILON;

const pairs = <T,>(items: T[]): [T, T][] =>
  items.flatMap((a, i) => items.slice(i + 1).map((b) => [a, b] as [T, T]));

/*
 * The shelf opener these all lean on lives in the harness now - it grew a
 * second caller when the block-out pencil moved onto the shelf.
 */

/**
 * Put a cylinder down and wait until it is actually in the scene.
 *
 * The tiles disable themselves while anything is loading, so "clicked" is not
 * "placed" and the next tap would be swallowed. A placed mesh selects itself,
 * and the size lock on the selection bar is mounted only when a MODEL is
 * selected - a box gets an axis stepper in that slot instead - not merely
 * faded, mounted, so its presence is a real gate rather than the sleep it
 * replaces.
 *
 * It used to be the scaled-mesh export that stood here, for the same reason.
 * That control has gone: it was the one seat on that bar that was not about
 * the drawing at all, and the scene file already carries every mesh at its
 * placed size.
 *
 * The cylinder rather than one of the meshes on the shelf because it is built
 * in code (primitive:cylinder) instead of fetched: a metre round, a metre tall,
 * no three megabytes over the wire, and a footprint of exactly 0.5 that the
 * arithmetic below can be read against.
 */
const placeCylinder = async (page: Page) => {
  await clickIn(page, 'anywhere', 'Cylinder');
  await expect(page.locator('[aria-label="Lock the size"]')).toBeAttached();
  await expect(find(page, 'anywhere', 'Add cube')).toBeEnabled();
};

/**
 * Where the viewer is looking, on the floor, read out of the scene itself.
 *
 * Every one of these placements starts from the gaze point, and a test that
 * cannot say where that is can only assert that things ended up apart - never
 * that the one that moved had a reason to. A lamp is the probe: `addLamp` holds
 * a new lamp off the OTHER LAMPS and nothing else, so the first lamp in an
 * empty scene lands on the gaze point untouched, whatever is standing there.
 * That is a documented property of the app, and it is asserted below wherever
 * it is leaned on.
 */
const dropTheProbe = (page: Page) => clickIn(page, 'anywhere', 'Add light');

test('the selection bar duplicates the selected object beside its original', async ({ app }) => {
  await openShelf(app);
  await clickIn(app, 'anywhere', 'Add cube');

  const before = await readSceneBundle(app);
  expect(before.boxes).toHaveLength(1);
  await clickIn(app, 'anywhere', 'Duplicate selection');

  const after = await readSceneBundle(app);
  expect(after.boxes).toHaveLength(2);
  expect(after.boxes[1].scale).toEqual(after.boxes[0].scale);
  expect(after.boxes[1].rotation).toEqual(after.boxes[0].rotation);
  expect(after.boxes[1].position[0] - after.boxes[0].position[0]).toBeCloseTo(0.5, 6);
  expect(after.boxes[1].position[2] - after.boxes[0].position[2]).toBeCloseTo(0.5, 6);

  await clickIn(app, 'anywhere', 'Undo');
  expect((await readSceneBundle(app)).boxes).toHaveLength(1);
});

/* The block-out pencil is a primary dock action: it needs no shelf and leaves
 * the drawing unobstructed while the two-stroke gesture is in progress. */
test('the pencil is on the toolbar and blocks a box without opening a shelf', async ({
  app,
}) => {
  const pencil = find(app, 'anywhere', 'Draw boxes on the ground');
  await expect(pencil, 'The block-out pencil is not on the toolbar.').toBeVisible();

  await blockOutABox(app);

  await expect(
    find(app, 'anywhere', 'Add cube'),
    'The model shelf opened while using the toolbar pencil.'
  ).toBeHidden();

  const scene = await readSceneBundle(app);
  expect(scene.boxes, 'Two strokes on the floor and no box stood up.').toHaveLength(1);
  // Sized by eye, so the numbers are whatever the drag said - but whatever it
  // said, the box stands ON the floor, with its centre at half its height.
  const [box] = scene.boxes;
  expect(box.position[1]).toBeCloseTo(box.scale[1] / 2, 6);
  expect(box.scale.every((metres) => metres > 0)).toBe(true);
});

test('three taps on the cube give three cubes, square on the ruling and a metre apart', async ({
  app,
}) => {
  await openShelf(app);
  for (let i = 0; i < 3; i++) await clickIn(app, 'anywhere', 'Add cube');

  const scene = await readSceneBundle(app);
  expect(scene.boxes, 'Three taps, three cubes - the shelf stays up so the second tap is one tap away.').toHaveLength(3);

  for (const box of scene.boxes) {
    expect(box.scale).toEqual([1, 1, 1]);
    // Still sitting ON the floor after stepping aside: the search moves a cube
    // in x and z, and a cube that came back at any other height would mean it
    // had been moved by something other than the search.
    expect(box.position[1]).toBeCloseTo(0.5, 6);
    /*
     * On the ruling, all three. The search snaps every candidate BEFORE it
     * tests it, so the cell it settles on is a cell centre; snapping the answer
     * afterwards instead would be free to round it straight back on top of the
     * thing it had just stepped around. A row of cubes tapped out by hand is
     * only square with the floor because of that ordering.
     */
    expect(onTheRuling(box.position[0]), `x = ${box.position[0]} is not a cell centre`).toBe(true);
    expect(onTheRuling(box.position[2]), `z = ${box.position[2]} is not a cell centre`).toBe(true);
  }

  /*
   * THE BUG ITSELF: three taps used to give three cubes at one point - same
   * gaze, same snap, same answer - one visible and two hidden inside it. Two
   * metre cubes clear each other at exactly a metre, so anything less than that
   * is one cube inside another.
   */
  const spacings = pairs(scene.boxes).map(([a, b]) => gap(a.position, b.position));
  for (const spacing of spacings) {
    expect(spacing, 'Two cubes are overlapping.').toBeGreaterThanOrEqual(1 - EPSILON);
  }

  /*
   * ...and no further than a metre either, which is the other half of the fix.
   * The cube search asks for zero clearance on purpose: neighbouring cells are
   * exactly a metre apart and two metre cubes are exactly a metre wide between
   * them, so any gap at all would make the tight cell "clash", skip it, and
   * leave a hole in the row. This is the assertion that a well-meaning
   * clearance would break.
   */
  expect(
    Math.min(...spacings),
    'The nearest two cubes are further apart than the ruling - a clearance has crept in and the row has a hole in it.'
  ).toBeCloseTo(1, 6);

  // And clear of what was already standing there. The opening car is six metres
  // of mesh on the origin, and it is in the same list as the boxes now.
  for (const box of scene.boxes) {
    for (const standing of scene.instances) {
      expect(gap(box.position, standing.position)).toBeGreaterThanOrEqual(
        CUBE_RADIUS + footprint(standing) - EPSILON
      );
    }
  }
});

test('three taps on the light give three lamps that can each be taken hold of', async ({ app }) => {
  await openShelf(app);
  for (let i = 0; i < 3; i++) await dropTheProbe(app);

  const scene = await readSceneBundle(app);
  const lamps = scene.lamps ?? [];
  expect(lamps).toHaveLength(3);

  // All three at head height and a touch above, which is where addLamp hangs
  // them: the search moves a lamp sideways, never up or down.
  for (const lamp of lamps) expect(lamp.position[1]).toBeCloseTo(2.2, 6);

  /*
   * This one was worse than the cubes, because two lamps inside each other are
   * not hidden - they are twice the light, out of what looks like one source,
   * with only the top one grabbable. So the test is not "they are apart", it is
   * "they are far enough apart to be told apart and taken hold of separately":
   * two lamp radii and the clearance between them.
   */
  const clear = LAMP_RADIUS * 2 + CLEARANCE;
  for (const [a, b] of pairs(lamps)) {
    expect(
      gap(a.position, b.position),
      'Two lamps are close enough that only the top one can be taken hold of.'
    ).toBeGreaterThanOrEqual(clear - EPSILON);
  }
});

test('a mesh placed where a box stands steps around it', async ({ app }) => {
  // Nothing standing but what this spec stands up - see clearTheScene.
  await clearTheScene(app);
  await openShelf(app);
  await dropTheProbe(app);
  await clickIn(app, 'anywhere', 'Add cube');
  await placeCylinder(app);

  const scene = await readSceneBundle(app);
  const gaze = scene.lamps![0].position;
  const [box] = scene.boxes;
  const cylinder = scene.instances.at(-1)!;
  const alreadyStanding = scene.instances.slice(0, -1);
  expect(cylinder.name).toBe('Cylinder');
  expect(scene.boxes).toHaveLength(1);

  /*
   * The precondition, asserted rather than assumed - otherwise this test passes
   * for the happy reason that nothing was ever in the way.
   *
   * A cylinder dropped on the gaze point would be standing INSIDE the cube: the
   * cube is snapped to its cell and the gaze point is not, so the two are half a
   * metre apart where they need 1.06. That is the moment the shipped bug went
   * wrong, and the cylinder was drawn through the box.
   */
  const needs = footprint(cylinder) + CUBE_RADIUS + CLEARANCE;
  expect(
    gap(gaze, box.position),
    'The cube is not standing where the mesh was about to be put, so this test proves nothing.'
  ).toBeLessThan(needs);

  // ...and nothing ELSE was in the way, so the step it took is the box's doing
  // and not the car's.
  for (const standing of alreadyStanding) {
    expect(
      gap(gaze, standing.position),
      'Something else is standing on the gaze point, so a step around the box cannot be told from a step around that.'
    ).toBeGreaterThanOrEqual(footprint(cylinder) + footprint(standing) + CLEARANCE);
  }

  // The fix: the cell a box is standing in is not an empty cell.
  expect(
    gap(cylinder.position, box.position),
    'The mesh is standing inside the box - findFreeSpot has stopped being told about the boxes.'
  ).toBeGreaterThanOrEqual(needs - EPSILON);
});

test('a cube placed where a mesh stands steps around it, and stays on the ruling', async ({
  app,
}) => {
  await clearTheScene(app);
  await openShelf(app);
  await dropTheProbe(app);
  await placeCylinder(app);
  await clickIn(app, 'anywhere', 'Add cube');

  const scene = await readSceneBundle(app);
  const gaze = scene.lamps![0].position;
  const cylinder = scene.instances.at(-1)!;
  const [box] = scene.boxes;
  expect(cylinder.name).toBe('Cylinder');

  /*
   * Nothing was near the gaze point when the cylinder went down, so it is
   * standing exactly on it - which is worth pinning in its own right: the
   * search returns the point you asked for, untouched, when there is room
   * there. A version that always stepped "just to be safe" would put every
   * first placement somewhere you did not tap.
   */
  expect(
    gap(cylinder.position, gaze),
    'The mesh moved off the gaze point with nothing in the way.'
  ).toBeCloseTo(0, 6);

  // The precondition: the cell this cube wanted is the cell the cylinder is
  // standing in. Two half-metre footprints need a metre between them and this
  // is nothing like a metre.
  const wanted: Spot = [cell(gaze[0]), 0.5, cell(gaze[2])];
  expect(
    gap(wanted, cylinder.position),
    'The mesh is not in the cell the cube wanted, so this test proves nothing.'
  ).toBeLessThan(CUBE_RADIUS + footprint(cylinder));

  expect(
    gap(box.position, cylinder.position),
    'The cube is standing inside the mesh.'
  ).toBeGreaterThanOrEqual(CUBE_RADIUS + footprint(cylinder) - EPSILON);

  // Stepped aside, and STILL on the ruling. This is the half of the cube search
  // that a fix could easily get wrong: step around the mesh by an arbitrary
  // amount and the cube comes to rest off the grid the whole tool is drawn on.
  expect(onTheRuling(box.position[0])).toBe(true);
  expect(onTheRuling(box.position[2])).toBe(true);
  expect(box.position[1]).toBeCloseTo(0.5, 6);
});
