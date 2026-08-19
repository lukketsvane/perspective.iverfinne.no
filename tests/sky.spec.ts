import { test, expect, drag, find, findByPrefix, fingerprint, hasContrast, labelOf, openTools, same, settled } from './harness';

/**
 * The sky, and the two claims about it that are worth a test.
 *
 * Everything else in here is a picture, and a picture is checked by looking at
 * it. These two are ARITHMETIC, which is exactly the kind of thing that goes
 * quietly wrong: a sign flipped in a rotation, a sidereal rate that is the
 * solar one, a latitude that is really a co-latitude. All of those still draw
 * a handsome sky, and all of them draw the wrong one.
 *
 * So the suite asks the sky a question it cannot fake, and the question is the
 * midnight sun. Above the arctic circle in June the sun does not set - not
 * "barely sets", does not set - and there is no way to get that right by
 * accident. Get the pole wrong and it sets. Get the date wrong and it sets.
 * Get the hour angle running the wrong way and it sets at the wrong time.
 */

/**
 * Switch it on the way the app asks: two taps on the tone control.
 *
 * BOTH TAPS IN ONE TASK, dispatched from inside the page, and that is not
 * fastidiousness - it is the only way this gesture can be driven here. The
 * control measures the gap between the taps against a three hundred
 * millisecond window in real time, and a driver's taps are three round trips
 * each, every one of them queued behind a frame that a software renderer is
 * taking a fifth of a second to draw. Sent through the mouse, the second tap
 * routinely lands after the window has shut, and what the test then reports is
 * the speed of the machine it ran on.
 *
 * The same idiom the harness's own `wake` uses, and for a cousin of the same
 * reason. What is being tested here is the sky, not the double tap.
 */
const switchTheSkyOn = async (page: Parameters<typeof openTools>[0]) => {
  await openTools(page);
  await expect(findByPrefix(page, 'Paper tone', 'tools')).toBeVisible();
  await page.evaluate(() => {
    const tone = document.querySelector('[aria-label^="Paper tone"]');
    if (!tone) throw new Error('No paper-tone control to double-tap.');
    const box = tone.getBoundingClientRect();
    const how = {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: box.x + box.width / 2,
      clientY: box.y + box.height / 2,
    };
    for (const _ of [0, 1]) {
      tone.dispatchEvent(new PointerEvent('pointerdown', how));
      tone.dispatchEvent(new PointerEvent('pointerup', how));
    }
  });
  await expect(findByPrefix(page, 'Paper tone', 'tools')).toHaveAttribute('aria-pressed', 'true');
};

/**
 * Put a long lens on before doing anything else.
 *
 * The tool opens at two hundred and ten degrees, which is wide enough that the
 * picture is read off six cube faces - so every frame draws the whole scene,
 * the sky included, six times. That is a fine trade on a real graphics card
 * and a catastrophe on the software renderer this suite runs on, where one
 * drag of a knob then takes minutes. Nothing in these three tests is about the
 * field, so they narrow it to where one flat pass will do.
 */
const putALongLensOn = async (page: Parameters<typeof openTools>[0]) => {
  await drag(page, 'Field of view', -600, { steps: 1 });
  await expect(findByPrefix(page, 'Field of view')).toBeVisible();
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

/** However far up the sun is, at whatever the panel currently says. */
const sunHeight = async (page: Parameters<typeof openTools>[0]) => {
  const said = await labelOf(page, 'anywhere', 'The sun stands');
  const degrees = /stands (-?\d+) degrees/.exec(said);
  if (!degrees) throw new Error(`The sun read-out said "${said}".`);
  return Number(degrees[1]);
};

test('the sky brings its own knobs, and only while there is a sky', async ({ app }) => {
  await openTools(app);
  // Absent, not disabled: there is nothing to set until there is a sky.
  await expect(find(app, 'tools', 'Air, weather and the night sky')).toHaveCount(0);

  await putALongLensOn(app);
  await settled(app);
  const before = await fingerprint(app);
  await switchTheSkyOn(app);
  await settled(app);

  const settings = find(app, 'tools', 'Air, weather and the night sky');
  await expect(settings).toHaveCount(1);

  // ...and it is a different picture, not just a different setting.
  const after = await fingerprint(app);
  expect(same(before, after), 'Switching the sky on drew the same frame.').toBe(false);
  expect(hasContrast(after)).toBe(true);

  await settings.click();
  await expect(findByPrefix(app, 'Air:')).toBeVisible();
  await expect(findByPrefix(app, 'Latitude:')).toBeVisible();
  await expect(findByPrefix(app, 'The sun stands')).toBeVisible();
});

test('at the pole in June the sun does not set, whatever the hour', async ({ app }) => {
  await putALongLensOn(app);
  await switchTheSkyOn(app);
  await find(app, 'tools', 'Air, weather and the night sky').click();
  await expect(findByPrefix(app, 'Latitude:')).toBeVisible();

  // The tool opens the sky on midsummer's day; walk north to the pole.
  await expect(findByPrefix(app, 'Date:')).toHaveAttribute('aria-label', 'Date: day 172 of the year');
  expect(await nudge(app, 'Latitude:', 400)).toContain('90 degrees north');

  /*
   * Round the clock. The hour wraps, so each drag lands somewhere real; what
   * is being checked is that the answer never goes negative, which at ninety
   * north on the twenty-first of June it cannot.
   */
  const hours = new Set<string>();
  for (const travel of [40, 70, 55, 85]) {
    hours.add(await nudge(app, 'Hour:', travel));
    expect(
      await sunHeight(app),
      'The sun set at the pole in June, which it does not do.'
    ).toBeGreaterThan(0);
  }
  expect(hours.size, 'The hour never moved, so the loop proved nothing.').toBeGreaterThan(2);
});

test('with the air turned off the sky is black and the sun still burns', async ({ app }) => {
  await putALongLensOn(app);
  await switchTheSkyOn(app);
  await find(app, 'tools', 'Air, weather and the night sky').click();
  await expect(findByPrefix(app, 'Air:')).toBeVisible();

  // The catalogue comes out the moment the sky goes black, and eight thousand
  // of them are eight thousand quads a frame on a renderer with no card under
  // it. They are not what this test is about.
  expect(await nudge(app, 'Stars:', -400)).toContain('off');

  expect(await nudge(app, 'Air:', -400)).toContain('vacuum');
  await settled(app);

  /*
   * A vacuum is not an off switch. The sky loses its blue because there is
   * nothing left to scatter it, and everything the sun can see goes on being
   * lit - harder, if anything, since nothing is taking the beam apart on the
   * way in. So the frame still has to have a range in it.
   */
  expect(hasContrast(await fingerprint(app)), 'The vacuum drew a flat frame.').toBe(true);
});
