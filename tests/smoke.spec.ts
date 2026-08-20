import { test, expect, fingerprint, hasContrast, open, same } from './harness';

/**
 * The suite's own dial tone.
 *
 * It asserts almost nothing about the app on purpose - it is here to prove
 * that the harness underneath it works end to end: that a real build got
 * built, that a server came up and is being torn down again, that chromium
 * found a WebGL context worth having, that the opening street stood up, that
 * the page was pinned before the app read its own storage, and that the canvas
 * can be read back at all. If this one goes red, nothing else in the suite is
 * worth reading.
 */

test('the app opens and draws, with nothing sitting over it', async ({ app }) => {
  /*
   * NOTHING TAKES THE SCREEN ON THE WAY IN. There was a guided tour here, armed
   * on every fresh visit and sitting over the top of the frame; every other
   * spec assumed it had been suppressed, and this is where that assumption was
   * checked. It is gone, and this is the guard on it staying gone.
   *
   * What a first visit gets instead is one line above the dock offering the
   * lesson - which is checked here too, because an offer nobody can find is
   * the failure the tour's removal could most easily have introduced. It is an
   * OFFER: the lesson itself must not be running.
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

/**
 * ...and what a first visit IS offered, which is one line and no more.
 *
 * Its own test because it needs a context that has never been offered the
 * lesson, and the harness suppresses that for every other spec - the offer
 * holds the chrome up and adds a row to the dock's column, which lifts every
 * block-out stroke off the floor. A second init script clears the key after the
 * prelude has set it, which is the only way to be a first-time visitor here.
 *
 * It is worth a test because an offer nobody can find is exactly the failure
 * removing the guided tour could most easily have introduced - and because the
 * first version of it faded out with the dock six seconds after load, which is
 * indistinguishable from not being there.
 */
test('a first visit is offered the lesson, and only offered it', async ({ context, page }) => {
  await context.addInitScript(() => localStorage.removeItem('kjg-perspective-lesson'));
  await open(page);

  const offer = page.getByText('Kva er perspektiv?');
  await expect(offer).toBeVisible();
  // An offer, not a performance: nothing has taken the screen.
  await expect(page.locator('[aria-label="Leave the lesson"]')).toHaveCount(0);

  /*
   * And it is still there after the chrome would have faded. Six seconds is the
   * idle timer; this waits past it, because the whole point of the offer is
   * that it survives somebody looking at the picture for a while.
   */
  await page.waitForTimeout(7500);
  await expect(offer).toBeVisible();

  /*
   * One tap on the cross spends it for good - and "for good" is checked as the
   * mark in storage rather than by reloading, because the init script that made
   * this a first visit at all runs again on every navigation and would make the
   * next load a first visit too. What is asserted is the two halves of the
   * promise: it leaves the screen now, and it has written down that it went.
   */
  await page.locator('[aria-label="Not now"]').click();
  await expect(offer).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem('kjg-perspective-lesson')),
    'The offer left the screen without writing down that it had been spent.'
  ).not.toBeNull();
});
