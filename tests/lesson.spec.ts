import { test, expect, open } from './harness';

/**
 * The lesson's machinery, walked rather than assumed.
 *
 * The rest of the suite never enters the deck: the smoke spec checks that a
 * first visit is OFFERED the lesson and stops at the door. Everything behind
 * the door - the deck advancing, a gate opening to the viewer's own hand, an
 * answer arriving - had no guard at all, and the cost of that showed up in
 * review rather than in red: every found used to be revealed only by a gate,
 * so the two director cards that carry one held sentences no viewer could
 * ever reach. A suite that had walked one gated card and one gateless card
 * would have caught it the day it was written.
 *
 * So this walks exactly that: one journey, four cards deep, through the two
 * reveal mechanisms the deck has. It drives the gate with real drags on the
 * picture, because the dist build this suite runs against has no dev handles
 * to reach around the input path with - which is the point: the gate is only
 * worth guarding as a thing a thumb can actually open.
 */

/**
 * Ask for the next card until the wanted words arrive.
 *
 * One click is not enough to bet on: Vidare ignores taps while an act title
 * holds the screen (the curtain guard in Lesson.tsx), and the move into a card
 * takes a couple of seconds of travel besides. Asking again until the card's
 * own words are up is also exactly what a person does.
 */
const vidareTo = async (page: Parameters<typeof open>[0], words: string) => {
  for (let lap = 0; lap < 24; lap++) {
    if ((await page.getByText(words).count()) > 0) return;
    // By its label, not its word: the button SAYS Vidare but is named for the
    // screen reader, and the last card renames the word to Teikn besides.
    await page.locator('[aria-label="Next card of the lesson"]').click();
    await page.waitForTimeout(900);
  }
  expect((await page.getByText(words).count()) > 0, `Never reached the card that says "${words}".`).toBe(true);
};

test('a gate opens to the hand, and the gateless card answers on the reading clock', async ({ context, page }) => {
  // The harness marks the lesson as already offered so the pill stays out of
  // every other spec's frame; this one needs the door back.
  await context.addInitScript(() => localStorage.removeItem('kjg-perspective-lesson'));
  await open(page);
  await page.getByText('Kva er perspektiv?').click();

  /*
   * THE GATED REVEAL. The posts card asks for the smallest turn in the deck,
   * and its answer must not be on the card before the turning: the whole
   * design is that the sentence below the rule is earned.
   */
  await vidareTo(page, 'Fire stolpar');
  await expect(page.getByText('same kutt')).toHaveCount(0);

  /*
   * Turn by dragging the picture, as a thumb would - out is enough, since the
   * gate reads accumulated yaw, not displacement. The drag lands mid-picture,
   * well above the card's glass; how many pixels make a radian is the input
   * mapping's business, so this keeps dragging until the answer shows rather
   * than asserting a sensitivity.
   */
  for (let drag = 0; drag < 10; drag++) {
    if ((await page.getByText('same kutt').count()) > 0) break;
    await page.mouse.move(320, 330);
    await page.mouse.down();
    await page.mouse.move(70, 330, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(350);
  }
  await expect(page.getByText('same kutt')).toBeVisible();

  /*
   * THE GATELESS REVEAL. The ruler card has no question to pass - it is a
   * director card - so its answer arrives on the reading clock instead: two
   * seconds of travel, seven of looking. Immediately after the card's words
   * arrive the answer must NOT be up (that it arrives instantly is the other
   * way this machinery could quietly break), and then it must come on its own
   * with nothing pressed and nothing dragged.
   */
  await vidareTo(page, 'astronauten på 180');
  await expect(page.getByText('pulten til låret')).toHaveCount(0);
  await expect(page.getByText('pulten til låret')).toBeVisible({ timeout: 16_000 });
});
