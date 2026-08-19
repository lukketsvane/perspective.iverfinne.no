import { test, expect, fingerprint, hasContrast, same } from './harness';

/**
 * The suite's own dial tone.
 *
 * It asserts almost nothing about the app on purpose - it is here to prove
 * that the harness underneath it works end to end: that a real build got
 * built, that a server came up and is being torn down again, that chromium
 * found a WebGL context worth having, that the opening car stood up, that the
 * page was pinned before the app read its own storage, and that the canvas can
 * be read back at all. If this one goes red, nothing else in the suite is worth
 * reading.
 */

test('the app opens and draws, with nothing sitting over it', async ({ app }) => {
  /*
   * NOTHING IS OFFERED ON THE WAY IN. There was a guided tour here, armed on
   * every fresh visit and sitting over the top of the frame; every other spec
   * assumed it had been suppressed and this is where that assumption was
   * checked. It is gone, and this is now the guard on it STAYING gone - the
   * lesson is a thing you ask for, not a thing that arrives.
   */
  await expect(app.locator('[aria-label="Skip the tour"]')).toHaveCount(0);
  await expect(app.locator('[aria-label="Leave the lesson"]')).toHaveCount(0);

  await expect(app.locator('canvas')).toBeVisible();
  await expect(app.locator('[aria-label="Tools"]')).toBeVisible();

  /*
   * Something is drawn, and it is a drawing rather than a wash of one colour.
   * A canvas that failed to get a GL context, or got one and rendered nothing,
   * comes back flat - and flat is the failure this catches, because every
   * fingerprint assertion in every other spec would still "pass" against it by
   * comparing one blank frame to the next.
   */
  const print = await fingerprint(app);
  expect(hasContrast(print), 'The canvas is one flat colour - no context, or nothing in the scene.').toBe(true);

  // And it is a still frame, not a loop: two reads a beat apart are the same
  // picture. This is the property `settled` leans on, so it is worth pinning
  // down here rather than discovering it is false halfway through a spec.
  await app.waitForTimeout(400);
  expect(same(print, await fingerprint(app))).toBe(true);
});
