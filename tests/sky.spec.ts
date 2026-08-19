import { test, expect, drag, find, findByPrefix, fingerprint, hasContrast, labelOf, openTools, same, settled } from './harness';

/**
 * The air, and what happens to the sky when you take it away.
 *
 * The rest of the sky is a picture, and a picture is checked by looking at it.
 * These two are not: they are the two claims the air knob makes that a
 * screenshot cannot settle, and both of them are the kind of thing that goes
 * quietly wrong - a fog that reaches nothing, a star pass that never runs.
 *
 * The bottom of the knob is the interesting end. It is not an off switch: with
 * no air there is nothing to scatter the sunlight, so the sky goes black and
 * everything the sun can see goes on being lit, harder if anything. And with
 * no sky to drown them the whole catalogue comes out AT MIDDAY, which is what
 * standing on the moon looks like and is a thing no amount of tuning would
 * produce by accident.
 */

/**
 * The sky is one of the seats in the light panel, beside the key and the fill.
 */
const openTheSky = async (page: Parameters<typeof openTools>[0]) => {
  await openTools(page);
  await find(page, 'tools', 'Lights').click();
  await find(page, 'anywhere', 'The sky, the hour and the weather').click();
  const draw = find(page, 'anywhere', 'Draw the sky');
  await expect(draw).toBeVisible();
  if ((await draw.getAttribute('aria-pressed')) !== 'true') await draw.click();
  await expect(draw).toHaveAttribute('aria-pressed', 'true');
};

/**
 * Drag a knob named by the start of its label, and wait for it to have moved.
 *
 * The reading is IN the label, so a knob cannot be named by its whole label
 * twice running - and a one-shot read straight after the mouse comes up can
 * land in the gap between the store changing and React committing. Waiting on
 * the label to stop being what it was closes both at once.
 */
const nudge = async (page: Parameters<typeof openTools>[0], prefix: string, dx: number) => {
  const before = await labelOf(page, 'anywhere', prefix);
  await drag(page, before, dx, { steps: 1 });
  await expect(findByPrefix(page, prefix)).not.toHaveAttribute('aria-label', before);
  return labelOf(page, 'anywhere', prefix);
};

/**
 * Put a long lens on before doing anything else.
 *
 * The tool opens wide enough that the picture is read off six cube faces, so
 * every frame draws the whole scene - the sky and eight thousand stars
 * included - six times over. That is a fine trade on a real graphics card and
 * a catastrophe on the software renderer this suite runs on. Nothing in here
 * is about the field.
 */
const putALongLensOn = async (page: Parameters<typeof openTools>[0]) => {
  await drag(page, 'Field of view', -600, { steps: 1 });
};

test('the air can be taken away, and what the sun lights stays lit', async ({ app }) => {
  await putALongLensOn(app);
  await openTheSky(app);
  await settled(app);

  const withAir = await fingerprint(app);
  expect(hasContrast(withAir)).toBe(true);

  expect(await nudge(app, 'Air:', -400)).toContain('vacuum');
  await settled(app);

  const airless = await fingerprint(app);
  expect(same(withAir, airless), 'Taking the air away drew the same frame.').toBe(false);
  /*
   * A vacuum is not an off switch. The sky loses its blue because there is
   * nothing left to scatter it, and everything the sun can see goes on being
   * lit - harder, if anything, since nothing is taking the beam apart on the
   * way in. So the frame still has to have a range in it.
   */
  expect(hasContrast(airless), 'The vacuum drew a flat frame.').toBe(true);
});

test('with no air the stars are out at midday', async ({ app }) => {
  await putALongLensOn(app);
  await openTheSky(app);
  expect(await nudge(app, 'Air:', -400)).toContain('vacuum');
  await settled(app);

  const lit = await fingerprint(app);
  // Nothing about the light changes here - only whether the catalogue is drawn.
  expect(await nudge(app, 'Stars:', -400)).toContain('off');
  await settled(app);
  const empty = await fingerprint(app);

  expect(
    same(lit, empty),
    'Turning the catalogue off changed nothing, so it was never being drawn.'
  ).toBe(false);
});
