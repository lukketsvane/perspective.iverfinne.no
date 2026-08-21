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
/**
 * Turn the deck with a thumb, which is the only way backwards there is.
 *
 * On the words, not on the picture: the handler lives on the card block, the
 * picture above it belongs to the look-and-walk input, and a spec that dragged
 * the wrong half would pass by turning the camera. Well past the threshold and
 * in several steps, because a pointer that teleports is a pointer that never
 * crossed the six-pixel slack the handler waits for before it takes the drag.
 */
const swipe = async (page: Parameters<typeof open>[0], way: 'left' | 'right') => {
  const words = page.locator('[aria-label="Next card of the lesson"], [aria-label="Finish the lesson"]').first();
  const box = await words.boundingBox();
  if (!box) throw new Error('The lesson has no words to drag.');
  const y = box.y + Math.min(24, box.height / 2);
  const from = way === 'right' ? box.x + 40 : box.x + box.width - 40;
  await page.mouse.move(from, y);
  await page.mouse.down();
  await page.mouse.move(from + (way === 'right' ? 140 : -140), y, { steps: 12 });
  await page.mouse.up();
};

const vidareTo = async (page: Parameters<typeof open>[0], words: string, laps = 24) => {
  for (let lap = 0; lap < laps; lap++) {
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
  // Nothing behind card one, so there is nothing to go back to and nothing
  // offering it - absent rather than disabled. (What this counts is the
  // screen-reader control; the visible arrow that used to sit beside the cross
  // is gone entirely, and going back is a drag on the words now.)
  await expect(page.locator('[aria-label="Back one card of the lesson"]')).toHaveCount(0);

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
   * AND THE QUESTION STEPS ASIDE. Both halves on screen at once is more paper
   * than an upright phone has, and what it covers is the picture the card is
   * about - so the body collapses as the found arrives.
   *
   * MEASURED AS A HEIGHT, and not with `toBeVisible`, which was the first
   * thing tried and is the wrong question. The body is clipped by an ancestor
   * whose grid row has gone to nothing, and an element clipped by somebody
   * else's overflow still reports its own full box - which is precisely what
   * "visible" means to a locator. The box that actually closes is the one
   * doing the clipping, so that is the one to ask.
   */
  await expect
    .poll(() =>
      page.evaluate(() => {
        const body = Array.from(document.querySelectorAll('div')).find(
          (node) => node.children.length === 0 && node.textContent?.startsWith('Fire stolpar')
        );
        return body?.parentElement ? Math.round(body.parentElement.getBoundingClientRect().height) : -1;
      })
    )
    .toBe(0);

  /*
   * THE GATELESS REVEAL. The ruler card has no question to pass - it is a
   * director card - so its answer arrives on the reading clock instead: two
   * seconds of travel, seven of looking. Immediately after the card's words
   * arrive the answer must NOT be up (that it arrives instantly is the other
   * way this machinery could quietly break), and then it must come on its own
   * with nothing pressed and nothing dragged.
   */
  await page.locator('[aria-label="Next card of the lesson"]').click();
  /*
   * CAUGHT IN ONE LOOK AT THE PAGE, and that is not fussiness.
   *
   * What is being measured is a nine-second gap - two seconds of travel and
   * seven of looking - between the card arriving and its answer arriving. Two
   * auto-retrying assertions in a row can quietly eat all nine of it on a
   * loaded machine, and then the second one reports that the answer was up
   * from the start when what really happened is that the test was slow. So
   * the wait for the words and the reading of the answer happen in the same
   * evaluate, a tenth of a second apart at most.
   */
  const arrived = await page.evaluate(async () => {
    const says = (words: string) => (document.body.textContent ?? '').includes(words);
    for (let tick = 0; tick < 150; tick++) {
      if (says('ei dør på 210')) return { words: true, answer: says('pulten til låret') };
      await new Promise((wake) => setTimeout(wake, 100));
    }
    return { words: false, answer: false };
  });
  expect(arrived.words, 'The ruler card never came up.').toBe(true);
  expect(arrived.answer, 'The ruler card had its answer up before anybody had looked.').toBe(false);
  await expect(page.getByText('same kutt')).toHaveCount(0);
  await expect(page.getByText('pulten til låret')).toBeVisible({ timeout: 16_000 });

  /*
   * AND BOTH KINDS STAY ANSWERED WHEN YOU COME BACK TO THEM.
   *
   * Dragging the words to the right is the only way backwards through the deck
   * - the arrow that used to sit beside the cross is gone, and the reason the
   * gesture exists is somebody tapping through an answer half-read. A card
   * dragged back into with its found sentence stripped off would be a gesture
   * that cannot do the one job it was added for: the reveal is earned once,
   * not once per visit, and that holds for the card you turned for as much as
   * for the one that answered on its own clock.
   *
   * It also guards the other half of that: the act titles must not perform
   * themselves again on the way back. Card 5 is the top of an act, so stepping
   * off it and back onto it is exactly the case that would replay a
   * full-screen title over a card the viewer has already read.
   *
   * DRAGGED WITH REAL POINTER EVENTS, on the words themselves, because that is
   * now the whole of the control. Nothing about this passes if the handler is
   * listening on the wrong element or the threshold is out of a thumb's reach.
   */
  await swipe(page, 'right');
  await page.waitForTimeout(2800);
  await expect(page.getByText('Alt i di eiga høgd')).toBeVisible();
  await expect(page.getByText('same kutt')).toBeVisible();
  await expect(page.getByText('Eit bilete er eit kart over alt du ser')).toHaveCount(0);

  // ...and the same gesture the other way is the tap the words already were.
  await swipe(page, 'left');
  await page.waitForTimeout(2800);
  await expect(page.getByText('Linja er ein målestokk')).toBeVisible();
  await expect(page.getByText('pulten til låret')).toBeVisible();
});


/**
 * The third reveal mechanism, and the one that is a TAP rather than a sweep of
 * the arm.
 *
 * The card about a floor of boxes all turned differently cannot be gated on
 * turning or walking: what it is about is that every box has its own pair of
 * points, and the only way to see that is to put a finger on one and then on
 * another and watch the pair jump along the horizon. So its gate counts how
 * many DIFFERENT things have been taken hold of - which means it depends on
 * selection still reaching the picture while the lesson holds the screen, and
 * that is a thing the deck could quietly lose the day anything else claims a
 * tap.
 *
 * Walking this far also guards the half of the deck that arrived with the
 * hares: seventeen cards in, the flock cards have been staged, their figures
 * fetched off the shelf and lifted onto a platform, and a card whose figures
 * failed to arrive is a thinner stage rather than a failure - so nothing else
 * in the suite would say a word about it.
 */
test('a floor of boxes is gated on taking hold of them, one after another', async ({ context, page }) => {
  /*
   * SLOW ON PURPOSE, and it is the deck's own weather that made it so.
   *
   * This walks eighteen cards to reach the one it is about, and the lesson now
   * takes the sky down to a low sun and DRAWS it for as long as it runs - so
   * every one of those eighteen frames is a scattering dome and a sampled
   * environment on top of the scene, on a software renderer, with another
   * worker doing the same thing beside it. Measured alone it walks the
   * eighteen in about seventy seconds against a hundred and eighty-second
   * budget; measured against a second worker it does not, and a test that
   * fails on contention rather than on behaviour is a test that teaches people
   * red means nothing. Nothing here is skipped or loosened - it is given the
   * clock the walk actually takes.
   */
  test.slow();
  await context.addInitScript(() => localStorage.removeItem('kjg-perspective-lesson'));
  await open(page);
  await page.getByText('Kva er perspektiv?').click();

  // Seventeen cards and three act titles deep, so it needs a longer budget than
  // the default: the curtain swallows a tap for two and a half seconds at each
  // act, and the walk gate on the flock card is passed by advancing rather than
  // by answering, which is allowed and is what somebody in a hurry does.
  await vidareTo(page, 'Trykk på ei av dei', 48);
  await expect(page.getByText('Punkta hoppa')).toHaveCount(0);

  /*
   * Tap around the floor until the pair has been moved. Where the boxes land on
   * screen is the projection's business and not this spec's, so it prods a
   * spread of the lower half rather than asserting a pixel - the same argument
   * the drag above makes about sensitivity.
   */
  const band = [450, 500, 550, 600];
  const across = [70, 130, 195, 260, 320];
  for (const y of band) {
    for (const x of across) {
      if ((await page.getByText('Punkta hoppa').count()) > 0) break;
      await page.mouse.click(x, y);
      await page.waitForTimeout(320);
    }
  }
  await expect(page.getByText('Punkta hoppa')).toBeVisible();
});
