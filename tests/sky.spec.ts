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
 * Put the sky in charge of the one light, and get at its controls.
 *
 * The sky used to be a seat of its own on the light rail, beside a key and a
 * fill. There is one light now and the sky is a MODE of it: the toggle hands
 * the light's four numbers to a real place and hour, and the air, the weather
 * and the dome's own switch come up in their place. So this presses one thing
 * where it used to press two, and it presses it IDEMPOTENTLY - the toggle is a
 * toggle, and a suite that assumed it was off would turn it off the day
 * anything opens with it on.
 *
 * The dome's switch is asserted rather than pressed for the same reason it is
 * still there at all: the toggle turns it on with the simulation, and the one
 * case worth keeping it for is a real sun over a page with no sky drawn.
 */
const openTheSky = async (page: Parameters<typeof openTools>[0]) => {
  await openTools(page);
  await find(page, 'tools', 'Lights').click();
  const sky = find(page, 'anywhere', 'The sky lights the scene and is drawn behind it');
  await expect(sky).toBeVisible();
  if ((await sky.getAttribute('aria-pressed')) !== 'true') await sky.click();
  await expect(sky).toHaveAttribute('aria-pressed', 'true');
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

/**
 * Turn the eye up until the frame is sky rather than floor.
 *
 * Two drags, because one is not enough of a pitch from a standing eye, and up
 * the screen rather than down it: dragging the picture is dragging the WORLD,
 * so pulling it towards you tips the view back.
 */
const lookUp = async (page: Parameters<typeof openTools>[0]) => {
  for (const _ of [0, 1]) {
    await page.mouse.move(195, 420);
    await page.mouse.down();
    await page.mouse.move(195, 200, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(400);
  }
};

/**
 * What the top of the frame holds: how many pixels are lit, and where.
 *
 * Deliberately NOT the harness's fingerprint, which averages the canvas into
 * thirty-six cells: eight thousand stars are eight thousand marks a pixel and a
 * half across, and a cell average cannot tell that from nothing - measured, the
 * whole catalogue moves it by a tenth of a value out of two hundred and
 * fifty-five. An assertion that fine is one that passes by luck, and it did,
 * twice, before it failed for no reason at all.
 *
 * Counting lit pixels is the honest measurement, and it is only available
 * because of what the claim IS: with the air turned off there is no sky, so
 * above the horizon the frame is pure black and every lit pixel up there is a
 * star. The positions are folded into a hash as well, because the second claim
 * is about where they stand.
 */
const starPrint = (page: Parameters<typeof openTools>[0]) =>
  page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const paper = copy.getContext('2d');
    if (!paper) return { lit: 0, hash: 0 };
    paper.drawImage(canvas, 0, 0);
    const band = paper.getImageData(0, 0, copy.width, Math.floor(copy.height * 0.4)).data;
    let lit = 0;
    let hash = 0;
    for (let at = 0; at < band.length; at += 4) {
      if (Math.max(band[at], band[at + 1], band[at + 2]) > 8) {
        lit++;
        hash = (hash * 31 + at) >>> 0;
      }
    }
    return { lit, hash };
  });

test('with no air the stars are out at midday, and they turn with the clock', async ({ app }) => {
  await putALongLensOn(app);
  await openTheSky(app);
  expect(await nudge(app, 'Air:', -400)).toContain('vacuum');
  await lookUp(app);
  await settled(app);

  const before = await starPrint(app);
  expect(before.lit, 'Nothing at all was drawn above the horizon.').toBeGreaterThan(20);

  /*
   * And they are the CATALOGUE, which is proved by turning the clock: the sky
   * is aimed by the hour, so hours move every star at once, along circles
   * round the pole. There used to be a knob that turned the stars off and the
   * proof was that the sky went empty; the knob went in the great cull of
   * settings, and this is the stronger claim anyway - an artefact that
   * happens to put light in the top of the frame does not also rotate it
   * about the celestial pole on demand.
   *
   * The simulation is already up - openTheSky put it there, which is what
   * makes the hour scrub exist to be dragged. It used to be switched on HERE,
   * on a separate seat, and pressing that seat now would switch it off and
   * take the scrub off the screen with it.
   */
  /*
   * 110 PIXELS, NOT 220. A Scrub sweeps its whole range in SWEEP pixels, SWEEP
   * is 220, and the clock WRAPS - so a 220-pixel drag is one full lap of the
   * day and the hour lands exactly where it began. Two runs passed that way
   * anyway, because the old default time carried Date.now()'s seconds and
   * withHour zeroes them: the "rotation" those runs measured was the
   * sub-minute accident of snapping to the minute grid, and the moment the
   * default became noon exactly, it vanished. Half a sweep is twelve hours,
   * which turns the sky as far as it can be turned.
   *
   * Both star prints are taken under a simulated sun now rather than only the
   * second, so the difference between them rests on the twelve hours alone.
   */
  await drag(app, 'Time of day', 110, { steps: 3 });
  await settled(app);

  const after = await starPrint(app);
  expect(after.lit, 'The sky emptied when the clock moved.').toBeGreaterThan(20);
  expect(after.hash, 'Hours passed and no star moved: the catalogue is not turning.').not.toBe(
    before.hash
  );
});
