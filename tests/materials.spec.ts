import type { Page } from '@playwright/test';
import {
  blockOutABox,
  clickIn,
  drag,
  expect,
  find,
  findByPrefix,
  fingerprint,
  labelOf,
  openTools,
  readSceneBundle,
  same,
  settled,
  test,
  wake,
  type Where,
} from './harness';
import { PRESETS } from '../lib/presets';

/**
 * Whose settings are whose.
 *
 * There are two answers to "what is this drawn with" in this app and they are
 * deliberately different questions: the PAGE, which every object follows until
 * it is told otherwise, and the OBJECT, which can step off the page and be
 * ruled on its own. Almost everything in here is a boundary between those two,
 * and three of the five things this file checks are bugs that shipped:
 *
 *   - a knob on the selection bar wrote to the page, so setting the hatch angle
 *     on one figure set it on every figure in the scene drawn that way;
 *   - dealing a page stamped its rung onto every object, so the hatched box
 *     standing on a brush page - the whole reason an object can have a rung of
 *     its own - was wiped by the button next to it, three presses from gone;
 *   - and a floor that one page brought with it stayed under every page dealt
 *     after it, nineteen deals out of twenty-two standing on a plane only two
 *     pages had asked for.
 *
 * All three are invisible in the moment. You only find them later, in a scene
 * that has quietly become uniform, which is exactly the kind of bug a suite is
 * worth having for.
 *
 * The assertions are on DATA wherever the question is "what does the scene say"
 * - the exported bundle for what an object carries, the live aria-label for
 * what a control reads - because a picture can only ever say "something
 * changed". There is one fingerprint here, in the one place where the question
 * genuinely is whether the drawing followed the number.
 */

/* --------------------------------------------------------------- the labels */

/** The page's own rung, in the tools band. Interpolated, so read by prefix. */
const PAGE_RUNG = 'Surface of everything: ';
/** This one's rung, on the selection bar. Likewise. */
const OWN_RUNG = 'Surface of this one: ';
/** The two the deck's floor is read and written through. */
const FLOOR = 'Floor: ';
const PAPER = 'Paper tone, ';
const MOUNT = 'Page behind the drawing: ';

/**
 * The hatch knob these tests turn, and why it is this one.
 *
 * It is a number with a wide range and a reading to one decimal, so a drag
 * lands somewhere unmistakable and nowhere near either clamp - and it belongs
 * to the etched page rather than to the pen, so it is one of the settings that
 * genuinely differ between two rungs rather than one shared across all three.
 */
const SPACING = 'How far apart the strokes are';
/** The knobs of the etched page, as the button that opens them is labelled. */
const HATCH_SETTINGS = 'How the hatching is ruled';
/** The one control that exists only while the selection has stepped off. */
const REJOIN = "Draw this with the page's own settings again";

/* -------------------------------------------------------------- the reading */

/** Press a control whose own label carries its value. */
const press = async (page: Page, where: Where, prefix: string) => {
  await wake(page);
  await findByPrefix(page, prefix, where).click();
};

/** What a label says after its prefix - the rung, the tone, the page. */
const readingIn = async (page: Page, where: Where, prefix: string) =>
  (await labelOf(page, where, prefix)).slice(prefix.length);

const pageRung = (page: Page) => readingIn(page, 'tools', PAGE_RUNG);
const ownRung = (page: Page) => readingIn(page, 'selection', OWN_RUNG);

/**
 * What a Scrub currently reads, without moving it.
 *
 * The reading lives in a bubble that exists only while the pointer is down, so
 * the only way to see it is to hold the control - and holding it without
 * travelling changes nothing, because a Scrub ignores travel under three pixels
 * and a tap only does something on the knobs that carry a `cycle` of preset
 * values. The hatch knobs carry none, so this is a look and not a touch. Every
 * test that uses it proves as much afterwards, by finding the object still has
 * nothing of its own.
 */
const readingOf = (page: Page, label: string) => drag(page, label, 0, { steps: 1 });

/* --------------------------------------------------------------- the panels */

/**
 * The knobs for the thing in your hand, from its own bar.
 *
 * Idempotent through aria-expanded, for the same reason openTools is: this
 * button toggles, and a helper that assumes the panel is shut closes it for the
 * spec that had just opened it.
 */
const openOwnSettings = async (page: Page, label = HATCH_SETTINGS) => {
  await wake(page);
  const button = find(page, 'selection', label);
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
};

/**
 * The same knobs, for the page - which is a different question and, in this
 * app, a different panel state. Opening it closes the tools panel it was
 * reached from, by design, so anything wanting the tools band again must ask
 * for it again.
 */
// Exported rather than deleted: the page's own knobs are the other half of this
// file's subject, and the spec that reaches for them next should not have to
// write this again.
export const openPageSettings = async (page: Page, label = HATCH_SETTINGS) => {
  await openTools(page);
  await wake(page);
  const button = find(page, 'tools', label);
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
};

/**
 * Put the page on the etched rung.
 *
 * BEFORE anything is blocked out, always: this control is the one place that is
 * supposed to overrule every object at once, and it says so - so calling it
 * after a box has been set apart by hand would wipe the very thing under test.
 *
 * Counted off the label rather than off the ladder, because the ladder has lost
 * three rungs over this tool's life and a test that knows it is two presses is
 * a test that breaks on the fourth.
 */
const toTheEtchedPage = async (page: Page) => {
  await openTools(page);
  for (let step = 0; step < 6 && (await pageRung(page)) !== 'hatch'; step++) {
    await press(page, 'tools', PAGE_RUNG);
  }
  expect(await pageRung(page), 'The page never reached the etched rung.').toBe('hatch');
};

/**
 * Tap something in the scene to take hold of it.
 *
 * The walk layer covers the canvas, so this is the only route into selection.
 * It is also the one gesture here that can silently do the wrong thing - a tap
 * that meets nothing puts away whatever panel is open instead - so nothing is
 * open when it is used, and every caller proves what it caught afterwards by
 * the one label on the bar that tells two boxes apart: how far away it is.
 */
const HOW_FAR = '[aria-label$=" metres away"]';
const rangeOfSelection = (page: Page) => page.locator(HOW_FAR).getAttribute('aria-label');

const tapInScene = async (page: Page, at: { x: number; y: number }) => {
  const frame = page.viewportSize();
  if (!frame) throw new Error('No viewport to tap in.');
  await page.mouse.click(at.x * frame.width, at.y * frame.height);
};

/* --------------------------------------------------------------- the deck */

/**
 * Which page the deck just dealt, worked out from what the page itself says.
 *
 * The deal is random by design - a shuffle that can hand back the page you are
 * already looking at looks broken - so a test cannot know in advance what it is
 * about to get. It can know exactly what it got: the rung, the sheet and the
 * mount are all on labels, and no two of the twenty-three pages share all
 * three. That turns "what should the floor be now" from a guess into the
 * dealt page's own answer.
 */
const dealtPage = async (page: Page) => {
  const rung = await pageRung(page);
  const paper = Number((await readingIn(page, 'tools', PAPER)).replace(' of 255 - drag to change', ''));
  const mountText = (await readingIn(page, 'tools', MOUNT)).replace(' - drag to change', '');
  const mount = mountText === 'the sheet itself' ? 'paper' : Number(mountText.replace(' of 255', ''));

  const candidates = PRESETS.filter(
    (preset) => preset.surface === rung && preset.paper === paper && preset.backdrop === mount
  );
  expect(
    candidates,
    `No page in the deck is ${rung} on ${paper} mounted on ${mountText} - has the deck changed under this test?`
  ).toHaveLength(1);
  return candidates[0];
};

/** What the floor control says right now: a tone, or none at all. */
const floorReads = async (page: Page) =>
  (await readingIn(page, 'tools', FLOOR)).replace(' - drag to change', '');

const deal = (page: Page) => press(page, 'tools', 'Deal a different page');

/* ===================================================================== (a) */

test.fixme('a knob turned on one box is not turned on its twin', async ({ app }) => {
  await toTheEtchedPage(app);

  // Two boxes, side by side and both plainly on the floor: the twin first, so
  // that it is boxes[0] in everything read back, and the one to be edited
  // second, since blocking a box leaves it in your hand.
  await blockOutABox(app, { from: { x: 0.5, y: 0.72 }, to: { x: 0.63, y: 0.81 }, steps: 1 });
  const twinRange = await rangeOfSelection(app);
  await blockOutABox(app, { from: { x: 0.72, y: 0.72 }, to: { x: 0.86, y: 0.81 }, steps: 1 });
  const subjectRange = await rangeOfSelection(app);

  // The bar carries one number that tells these two apart, and every claim
  // below about which box is in hand rests on it.
  expect(
    subjectRange,
    'Both boxes are the same distance away, so nothing in the interface can say which one is selected.'
  ).not.toBe(twinRange);

  await openOwnSettings(app);
  const pageSpacing = await readingOf(app, SPACING);

  await settled(app);
  const stillFrame = await fingerprint(app);
  const ownSpacing = await drag(app, SPACING, -55);
  expect(
    ownSpacing,
    'The drag did not move the strokes far enough apart to tell it did anything.'
  ).not.toBe(pageSpacing);

  /*
   * The one pixel assertion in this file, and it is here because the store
   * holding a number is not the same claim as the object being DRAWN with it.
   * An object with settings of its own is handed a material built for it alone
   * (lib/ownMaterial.ts); the failure worth catching is the one where that
   * material is never written to and the box carries on being drawn with the
   * page's, with the scene data reading perfectly correct all the while.
   */
  await settled(app);
  expect(
    same(stillFrame, await fingerprint(app)),
    'The scene data changed but the drawing did not - is the object still on the page\'s shared material?'
  ).toBe(false);

  const scene = await readSceneBundle(app);
  expect(scene.boxes).toHaveLength(2);
  const [twin, subject] = scene.boxes;
  expect(subject.material?.hatch.spacing, 'The box in hand did not take the new spacing.').toBeCloseTo(
    Number(ownSpacing),
    3
  );
  /*
   * The shipped bug, exactly: the twin must carry NOTHING. Absent is what
   * "drawn with the page's own" is - one material for the whole scene, which is
   * what keeps forty boxes from becoming forty materials - so a twin that has
   * grown a `material` of its own has been dragged off the page by a knob that
   * was never aimed at it.
   */
  expect(
    twin.material,
    'Turning a knob on one box gave its twin settings of its own as well.'
  ).toBeUndefined();

  /*
   * And the twin is not merely unrecorded: taken in hand, its own bar still
   * reads the page's number rather than the one its neighbour was dragged to.
   *
   * Reading the scene put every panel away on its way out - the export sits in
   * the shelf and Escape closes the shelf and the tools row with it - so the
   * tap below meets glass rather than a row of knobs.
   */
  await tapInScene(app, { x: 0.56, y: 0.76 });
  expect(
    await rangeOfSelection(app),
    'The tap did not land on the twin, so what follows would be about the wrong box.'
  ).toBe(twinRange);

  await openOwnSettings(app);
  expect(await readingOf(app, SPACING), 'The twin moved with its neighbour.').toBe(pageSpacing);

  /*
   * And it still has nothing of its own - which is both the second half of the
   * claim above and the proof that reading a value by holding the control that
   * carries it did not quietly write one. The way back is only drawn for an
   * object that has stepped off the page, so its absence is that statement in
   * the interface's own terms, and it costs nothing to ask.
   */
  await expect(find(app, 'anywhere', REJOIN)).toHaveCount(0);
});

/* ===================================================================== (b) */

test.fixme('one drag is one step back', async ({ app }) => {
  await toTheEtchedPage(app);
  await blockOutABox(app);
  await openOwnSettings(app);

  const moved = await drag(app, SPACING, -55);
  const stepped = await readSceneBundle(app);
  expect(stepped.boxes).toHaveLength(1);
  expect(stepped.boxes[0].material?.hatch.spacing).toBeCloseTo(Number(moved), 3);

  await clickIn(app, 'anywhere', 'Undo');

  /*
   * ONE step, not two hundred and not zero.
   *
   * A knob writes on every frame of the drag, so a history step taken inside
   * the write would put a step in the stack per frame and one press of undo
   * would move the spacing back by a pixel's worth. The panel takes its step as
   * the drag STARTS instead, which is why the settings should be gone entirely
   * rather than merely smaller: back to nothing of its own, in one press.
   */
  const back = await readSceneBundle(app);
  expect(
    back.boxes[0].material,
    'One press of undo did not take the whole drag back - is a step being written per frame?'
  ).toBeUndefined();
  // And it took back the drag only. The box itself was a separate gesture and
  // a separate step, and undo reaching past its target is the other half of
  // this bug.
  expect(back.boxes, 'Undo went back further than the drag and took the box with it.').toHaveLength(1);
});

/* ===================================================================== (c) */

test.fixme('a box that has stepped off the page can be handed back to it', async ({ app }) => {
  await toTheEtchedPage(app);
  await blockOutABox(app);
  await openOwnSettings(app);

  /*
   * The way back does not exist until there is something to come back from,
   * which is also how the panel SAYS that a drag has set this object apart -
   * the knobs look identical either way, so this button appearing is the only
   * difference on screen between editing the page and editing one box.
   */
  await expect(find(app, 'anywhere', REJOIN)).toHaveCount(0);

  await drag(app, SPACING, -55);
  await expect(
    find(app, 'anywhere', REJOIN),
    'Nothing on screen says this box has stepped off the page.'
  ).toHaveCount(1);

  await clickIn(app, 'anywhere', REJOIN);

  const scene = await readSceneBundle(app);
  expect(
    scene.boxes[0].material,
    'The box was handed back to the page but is still carrying settings of its own.'
  ).toBeUndefined();
  // Without this the only way back would be matching the page's numbers by
  // eye, so a way back that leaves the button up has not gone all the way back.
  await expect(find(app, 'anywhere', REJOIN)).toHaveCount(0);
});

/* ===================================================================== (d) */

test.fixme('dealing a page leaves a rung set by hand alone, and moves one that was following', async ({
  app,
}) => {
  // Two boxes on the page the tool opens on. Both are born carrying the scene's
  // rung, which is what "following the page" is here - there is no other way to
  // read it, since a box is never born with an empty one.
  await blockOutABox(app, { from: { x: 0.5, y: 0.72 }, to: { x: 0.63, y: 0.81 } });
  await blockOutABox(app, { from: { x: 0.72, y: 0.72 }, to: { x: 0.86, y: 0.81 } });

  await openTools(app);
  // The second box is the one in hand, so it is the one set apart: one press of
  // its own rung control, which is the deliberate act the page is not allowed
  // to undo.
  let apart = await ownRung(app);
  expect(apart).toBe(await pageRung(app));
  await press(app, 'selection', OWN_RUNG);
  apart = await ownRung(app);
  expect(apart, 'The box did not step off the page.').not.toBe(await pageRung(app));

  /*
   * Deal until the page's rung actually moves.
   *
   * The deck is shuffled, not stepped, so the next page can perfectly well land
   * on the rung we are already on - and a deal that does not change the rung
   * proves nothing about a box that was following it. This deals until it gets
   * one that does, which is a page or two in practice.
   *
   * If the deck deals the very rung this box was set apart onto, the box is
   * following the page again by the app's own definition of following, and the
   * run would be measuring nothing. So it is stepped off again and the dealing
   * carries on.
   */
  let before = await pageRung(app);
  let dealt = '';
  for (let deals = 0; deals < 10 && !dealt; deals++) {
    await deal(app);
    const now = await pageRung(app);
    if (now === apart) {
      await press(app, 'selection', OWN_RUNG);
      apart = await ownRung(app);
      before = now;
      continue;
    }
    if (now !== before) dealt = now;
    before = now;
  }
  expect(dealt, 'Ten deals and the page never landed on a different rung.').not.toBe('');

  const scene = await readSceneBundle(app);
  expect(scene.boxes).toHaveLength(2);
  const [following, byHand] = scene.boxes;

  /*
   * The half that shipped broken: dealing a page stamped its rung onto every
   * object in the scene, exactly like the control beside it - which IS supposed
   * to overrule everything and says so and is undoable because of it. Dealing
   * pages is a comparison you press over and over, so three presses took the
   * arrangement with them.
   */
  expect(
    byHand.surface,
    'Dealing a page wiped a rung that had been set on one box by hand.'
  ).toBe(apart);

  // And the other half, which is the reason the first half is not simply "leave
  // everything alone": what looked like the page moves with the page.
  expect(
    following.surface,
    'A box that was following the page did not move with it.'
  ).toBe(dealt);
});

/* ===================================================================== (e) */

test('the floor a page brought with it does not follow the next page in', async ({ app }) => {
  await openTools(app);

  // A floor put down by hand, so that the very first deal is already being
  // asked to clear one. The tone it comes up at does not matter here; that it
  // is THERE does.
  expect(await floorReads(app)).toBe('none');
  await press(app, 'tools', FLOOR);
  expect(await floorReads(app), 'The floor did not come on.').not.toBe('none');

  /*
   * Deal, and hold every deal to the dealt page's own answer.
   *
   * Six of the twenty-three pages stand on a floor and seventeen do not, and
   * the floor is the one thing in a page that is set by EVERY deal rather than
   * left alone when unnamed - because it shows on every page there is, so a
   * page that does not ask for it must not get it. That is what leaked: a floor
   * from one page stayed under all the pages dealt after it.
   *
   * The loop runs until it has seen the case that catches that - a page with no
   * floor dealt while a floor was standing - which the first deal supplies
   * better than three times out of four, and every deal along the way is held
   * to the same exact standard either way.
   */
  let standing = true;
  let leakTested = false;
  for (let deals = 0; deals < 12 && !leakTested; deals++) {
    const before = standing;
    await deal(app);
    const page = await dealtPage(app);
    const floor = await floorReads(app);

    expect(
      floor,
      `"${page.name}" ${page.ground ? `asks for a floor at ${page.ground.tone}` : 'asks for no floor'}, and the control reads ${floor}.`
    ).toBe(page.ground ? `${page.ground.tone} of 255` : 'none');

    standing = Boolean(page.ground);
    if (before && !standing) leakTested = true;
  }

  expect(
    leakTested,
    'Twelve deals and never once a floorless page after a floor - the leak this guards was not exercised.'
  ).toBe(true);
});
