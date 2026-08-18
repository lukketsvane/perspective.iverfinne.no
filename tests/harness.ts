import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { BundledMesh } from '../lib/sceneBundle';
import type { SceneFile } from '../lib/sceneJson';

/**
 * Everything the specs need to touch this app without lying to themselves.
 *
 * The app is one canvas, a dock that fades, four panels sharing one slot, and
 * a store that saves itself to localStorage. None of that is hostile to being
 * tested, but all of it is easy to test WRONGLY - to click a control that is
 * there but not live, to read a value that only exists while a finger is down,
 * to assert on a scene that has not stood up yet, or to pass because the
 * previous test left a setting behind. Every helper in here exists because a
 * throwaway driver got one of those wrong first and cost a run.
 *
 * The rule for anything added here: a helper either leaves the app in the
 * state it found it, or says in its own comment what it leaves behind.
 *
 * AND THE ONE THING TO KNOW BEFORE WRITING A SPEC: this runs against a
 * production build, served from dist. `window.__store`, `window.__pick`,
 * `window.__walk` and `window.__forceMesh` are dev-only and are not there -
 * which is deliberate, since the built app is the thing that ships, and it is
 * the whole reason fingerprint() and readSceneBundle() exist. Reach for those
 * two rather than for a handle that will be undefined.
 */

export { expect };

/*
 * Written before the app's first line of script runs, on every page in the
 * context - which is the only place it CAN be written from, since localStorage
 * needs an origin and the app reads both of these keys as it mounts.
 *
 * THE TOUR: nine cards, armed on every fresh visit as soon as models or boxes
 * appear, and every one of them covers the top of the frame and rings a control
 * somewhere else. A test that does not set this flag is a test of the tour, and
 * a badly behaved one: the cards WAIT for real gestures now, so an unsuppressed
 * tour does not simply sit there - it reads every drag the spec makes. The
 * shape is tour.ts's own - a
 * generation number, so that bumping the tour re-offers it to real viewers.
 * If that number moves, this line has to move with it, or the tour comes back
 * and every spec starts failing in the same baffling way.
 *
 * THE SETTINGS: store.ts persists the surface, the page, the guides, the eye
 * level and a dozen other knobs. A fresh context has none of it, so this clear
 * is belt and braces - but it is guarded by a sessionStorage marker so that it
 * only happens on the FIRST load of the tab. A spec that reloads to prove a
 * setting survived the reload must find its own settings still there, and an
 * unguarded init script would quietly wipe them and make that spec a fraud.
 *
 * THE PAGE, WHICH IS THE ONE THAT WOULD OTHERWISE BE RANDOM. The tool deals a
 * page off the deck every time it opens - a different surface,
 * sheet, mount, light and pen on every load. Unpinned, that is a random input
 * to every spec in this suite: the fingerprint smoke test would be comparing a
 * different picture each run, and a material spec would start from whichever
 * knobs the deal happened to leave. Pinned here to the page the tool used to
 * open on fixed, so the suite sees exactly the setup it was written against.
 * A spec that is ABOUT the deal clears this key itself.
 *
 * AND THE DEALER, which is the same input arriving on a timer. The tool deals
 * itself a new page in the gaps between working - see lib/autoDeal.ts - which
 * for a spec means the page can change under it while it waits for anything at
 * all. Stood down here for every spec, and stepped one deal at a time by the
 * ones that are about the deck. That key is also the only way in: there is no
 * button any more, and no store handle in a production build.
 */
const PRELUDE = () => {
  localStorage.setItem('kjg-perspective-tour', JSON.stringify({ seen: 6 }));
  localStorage.setItem('kjg-perspective-page', 'Brush page on black');
  localStorage.setItem('kjg-perspective-deal', 'off');
  if (!sessionStorage.getItem('harness-cleared')) {
    localStorage.removeItem('kjg-perspective-settings');
    sessionStorage.setItem('harness-cleared', '1');
  }
};

export const test = base.extend<{ app: Page }>({
  /*
   * Every test gets its own context, and every context gets the prelude - so a
   * spec that wants to drive the load itself (a reload, a second tab, a scene
   * seeded into storage before the app sees it) still gets the tour
   * suppressed. Isolation is not a thing a spec has to remember here.
   */
  context: async ({ context }, use) => {
    await context.addInitScript(PRELUDE);
    await use(context);
  },

  /** The app, loaded, with the opening car standing up and the frame still. */
  app: async ({ page }, use) => {
    await open(page);
    await use(page);
  },
});

/**
 * The hairline along the top edge: up while the app is fetching, parsing or
 * writing anything, and gone when it is not. Two pixels is all the app will
 * spend on saying so, and it is the only thing it says out loud - which makes
 * it the one honest "am I finished" signal on the page.
 */
const BUSY = 'div[class*="z-[60]"]';

/** Load the app and wait until there is something to look at. */
export const open = async (page: Page) => {
  /*
   * Three gates, and each of them catches something the one before it cannot.
   *
   * The response listener goes on before the navigation, because the opening
   * mesh is fetched by the first effect that runs - the Hughes H-1, always,
   * see meshLibrary.ts on why the racer is the object worth opening on.
   *
   * But its bytes arriving is not the aircraft standing up: twenty megabytes
   * still have to be parsed and framed, and until that happens the frame is an
   * empty grid that is perfectly still - so a settle check alone would call it ready
   * and hand a spec a scene with nothing in it. The hairline is still up at
   * that point (the activity is cleared in a finally, after the stand-up), so
   * waiting for it to go is what closes that window.
   *
   * Then, and only then, wait for the drawing itself to stop moving.
   */
  const mesh = page.waitForResponse(/\/meshes\/.*\.glb/, { timeout: 30_000 });
  await page.goto('/');
  await page.waitForSelector('canvas');
  await mesh;
  await page.waitForSelector(BUSY, { state: 'detached', timeout: 30_000 });
  await settled(page);
};

/**
 * Wait until the drawing stops changing.
 *
 * Every wait in a suite like this is otherwise a sleep, and a sleep is a guess
 * that is too short on a loaded machine and wasted on a quiet one. Two
 * identical fingerprints a beat apart is the thing those sleeps were all
 * trying to say.
 *
 * It cannot tell "finished" from "has not started": a scene that is about to
 * change is as still as one that has finished changing. So it is a settle
 * check and not a readiness check - `open` gates on the app's own busy
 * hairline first, and anything else that waits for a slow thing should gate on
 * something real before calling this.
 */
export const settled = async (page: Page, { every = 250, tries = 40 } = {}) => {
  let previous: Fingerprint | null = null;
  for (let i = 0; i < tries; i++) {
    const now = await fingerprint(page);
    if (previous && same(previous, now)) return;
    previous = now;
    await page.waitForTimeout(every);
  }
  throw new Error('The view never stopped changing - is something animating, or is the frame rate on the floor?');
};

/* ------------------------------------------------------------------- chrome */

/**
 * Bring the chrome back, without touching the scene.
 *
 * The dock fades six seconds after the last touch and takes [inert] with it
 * (lib/rail.ts). Playwright still calls an opacity-0 element visible, so a
 * click aimed at a faded control does not fail - it lands on the gesture layer
 * at z-30 and TURNS THE VIEW instead, and the test carries on against a scene
 * nobody asked to move. Six seconds is not long, either: a single scrub drag
 * under software WebGL can outlast it on its own, so this is not just about
 * tests that sit and think.
 *
 * A synthetic pointerdown on the dock's own column is what a real touch does
 * to the rail - and unlike a tap on the scene it selects nothing, deselects
 * nothing and turns nothing.
 */
export const wake = (page: Page) =>
  page.evaluate(() => {
    const column = document
      .querySelector('[aria-label="Tools"]')
      ?.closest('div[class*="transition-opacity"]');
    column?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
  });

/**
 * Where a control lives, for when its label is not enough to say which one it
 * is.
 *
 * The tools band and the selection bar both hold a button labelled "The pen
 * this page is drawn with" - types.ts hands the same string to both - and a
 * plain lookup takes the first in DOM order, which is the tools one, whichever
 * you meant. What separates them is that the selection bar's row scrolls
 * sideways and the tools panel's does not.
 */
export type Where = 'anywhere' | 'tools' | 'selection';

/** Exact label, or the start of one. */
type Match = 'is' | 'starts';

const BAND = 'div[class*="overflow-x-auto"]';

const selector = (where: Where, value: string, match: Match): string => {
  if (where === 'tools') {
    const named =
      match === 'is'
        ? `@aria-label=${xpathString(value)}`
        : `starts-with(@aria-label,${xpathString(value)})`;
    // XPath rather than CSS because the rule is "NOT inside the scrolling
    // band", and CSS cannot say that about an ancestor.
    return `xpath=//*[${named}][not(ancestor::div[contains(@class,"overflow-x-auto")])]`;
  }
  const css = `[aria-label${match === 'is' ? '' : '^'}="${value.replace(/"/g, '\\"')}"]`;
  return where === 'selection' ? `${BAND} ${css}` : css;
};

/** XPath has no escape character, so a label containing a quote needs concat(). */
const xpathString = (value: string) =>
  value.includes('"') ? `concat("${value.split('"').join(`",'"',"`)}")` : `"${value}"`;

/** A control by its exact label. */
export const find = (page: Page, where: Where, value: string): Locator =>
  page.locator(selector(where, value, 'is'));

/**
 * A control by the START of its label.
 *
 * Half the labels in the dock are sentences with the value in them - `Snap to
 * 0.25 m`, `Floor: 128 of 255 - drag to change`, `Surface of everything:
 * brush`. Anchoring on the whole string names the control only while it is at
 * that value, which is exactly the moment before a test changes it.
 */
export const findByPrefix = (page: Page, prefix: string, where: Where = 'anywhere'): Locator =>
  page.locator(selector(where, prefix, 'starts'));

/** Press a control, having first made sure it is one that can be pressed. */
export const clickIn = async (page: Page, where: Where, value: string) => {
  await wake(page);
  await find(page, where, value).click();
};

/** What the app currently calls a control - for the labels with the reading in them. */
export const labelOf = async (page: Page, where: Where, prefix: string) =>
  (await findByPrefix(page, prefix, where).getAttribute('aria-label')) ?? '';

/**
 * Open the tools panel, and leave it open.
 *
 * IDEMPOTENT, because the button is a toggle: called twice by two helpers that
 * each thought they needed it, a naive version shuts the panel again, and the
 * drag the spec makes next lands on the scene and turns the view. More than
 * one driver died of exactly that. The button publishes aria-expanded, so we
 * can ask rather than guess.
 */
export const openTools = async (page: Page) => {
  const tools = page.locator('[aria-label="Tools"]');
  await wake(page);
  if ((await tools.getAttribute('aria-expanded')) !== 'true') await tools.click();
  await expect(tools).toHaveAttribute('aria-expanded', 'true');
};

/**
 * Empty the scene, through the two taps the app itself asks for.
 *
 * FOR THE SPECS THAT ARE ABOUT PLACEMENT AND NOTHING ELSE. The tool opens on a
 * yard now - an aircraft and five things standing round it - and the eye stands
 * seven metres off it, while "put one here" drops things two and a half metres
 * in front of the eye. So the drop point is INSIDE the arrangement, and a spec
 * asking "did this step around the box I just made" cannot tell that from "did
 * it step around the stores rack".
 *
 * Those specs used to get their clear floor by luck: the tool opened at a
 * ninety degree field, which stood the eye sixteen metres back, which put the
 * drop point on empty ground beyond everything. It opens at 210 now and stands
 * close, so the luck ran out - and the specs said so, loudly, through the
 * precondition they were already asserting. That is the guard working.
 *
 * Clearing is the honest answer rather than a bigger clearance: what those
 * specs test is `findFreeSpot`, and `findFreeSpot` is best examined in a room
 * with nothing in it but what the spec put there.
 *
 * It goes through the interface rather than the store because the store is not
 * reachable from a production build - and it is deliberately two taps in the
 * app itself, which is a property worth exercising anyway.
 */
export const clearTheScene = async (page: Page) => {
  await openScenes(page);
  const clear = page.locator('[aria-label="Clear the scene"]');
  await expect(clear).toBeVisible();
  await clear.click();
  // Armed, then done: the label is the state, so this waits for the arming
  // rather than guessing at it.
  const confirm = page.locator('[aria-label="Clear the scene for good"]');
  await expect(confirm).toBeVisible();
  await confirm.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('[aria-label="Export scene file"]')).toBeHidden();
  await settled(page);
};

/** Put the tools panel away, if it is up. */
export const closeTools = async (page: Page) => {
  const tools = page.locator('[aria-label="Tools"]');
  await wake(page);
  if ((await tools.getAttribute('aria-expanded')) === 'true') await tools.click();
  await expect(tools).toHaveAttribute('aria-expanded', 'false');
};

/**
 * Open the model shelf, and leave it open.
 *
 * Idempotent for the same reason openTools is: "Add model" is a toggle with no
 * aria-expanded to ask, so this asks the shelf itself whether it is there. A
 * second blind click would put it away and send the next tap into the scene.
 *
 * It stays open across placements by design - see MeshSheet.tsx: building a
 * scene is placing several things, so the shelf behaves like a shelf. The one
 * thing on it that does close it is the block-out pencil, which hands you an
 * instrument rather than finishing a job.
 */
export const openShelf = async (page: Page) => {
  const cube = find(page, 'anywhere', 'Add cube');
  if ((await cube.count()) === 0) await clickIn(page, 'anywhere', 'Add model');
  await expect(cube).toBeVisible();
};

/**
 * Open the scene library, and leave it open.
 *
 * "Scenes" is on the dock now, beside "Add model" - it used to be inside the
 * tools panel, so reaching it meant opening a menu first, and these helpers
 * all did. Idempotent the same way openShelf is: the button is a toggle with
 * no aria-expanded to ask, so this asks the shelf itself - the export button
 * only exists while the shelf does.
 */
export const openScenes = async (page: Page) => {
  const exported = page.locator('[aria-label="Export scene file"]');
  if ((await exported.count()) === 0) await clickIn(page, 'anywhere', 'Scenes');
  await expect(exported).toBeVisible();
};

/* -------------------------------------------------------------------- knobs */

/**
 * Work a Scrub: the round controls in the dock and in the panels.
 *
 * They are DRAGGED. Never typed, and a tap is a different gesture with a
 * different result - it steps round the preset values. The reading appears in
 * a bubble above the control and ONLY while the pointer is down, so it is read
 * here mid-drag and handed back; there is nowhere to read it from afterwards.
 *
 * Three steps rather than twenty: every intermediate move is a full re-render
 * of the scene, and at a wide field of view under software WebGL that is most
 * of a second each. The control reads absolute travel from where the drag
 * began, so more steps buy nothing but time.
 */
export const drag = async (
  page: Page,
  label: string,
  dx: number,
  { where = 'anywhere' as Where, dy = 0, steps = 3 } = {}
): Promise<string> => {
  await wake(page);
  const knob = find(page, where, label);
  const box = await knob.boundingBox();
  if (!box) throw new Error(`No control labelled "${label}" to drag.`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps });
  /*
   * The bubble is a sibling of the button inside the Scrub's own wrapper, so
   * it is read from there rather than from the page: the block-out readout is
   * another bubble in the same style, and a spec dragging while a box is being
   * pulled up would otherwise read that one.
   */
  const reading = await knob.locator('xpath=..').locator('div[class*="-top-12"]').textContent();
  await page.mouse.up();
  return (reading ?? '').trim();
};

/* --------------------------------------------------------------- the render */

/** Mean R, G and B per cell of a coarse grid over the canvas. */
export type Fingerprint = number[];

/**
 * What the canvas is actually drawing, small enough to compare.
 *
 * This is the only assertion that covers the shader, the ink, the wash and the
 * page - the things this whole tool is for, and the things no DOM assertion
 * can see at all. It works because the renderer is created with
 * preserveDrawingBuffer, so the last frame is still readable whenever we ask.
 *
 * Coarse on purpose. A per-pixel comparison would fail on a dithered edge
 * moving by one pixel between two runs; a 6x6 average changes when the DRAWING
 * changes and holds still when it does not.
 */
export const fingerprint = (page: Page, cells = 6): Promise<Fingerprint> =>
  page.evaluate((n) => {
    const source = document.querySelector('canvas');
    if (!source) throw new Error('No canvas on the page.');
    const small = document.createElement('canvas');
    small.width = n;
    small.height = n;
    const ctx = small.getContext('2d');
    if (!ctx) throw new Error('No 2D context to fingerprint into.');
    /*
     * Onto a known ground first. The scene's canvas is alpha: true, so that an
     * AR session can show the room through it, and compositing a partly
     * transparent frame onto an empty canvas would leave the result depending
     * on what the 2D canvas happened to start as.
     */
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, n, n);
    ctx.drawImage(source, 0, 0, n, n);
    const { data } = ctx.getImageData(0, 0, n, n);
    const out: number[] = [];
    for (let i = 0; i < data.length; i += 4) out.push(data[i], data[i + 1], data[i + 2]);
    return out;
  }, cells);

/**
 * Whether two fingerprints are the same picture.
 *
 * The tolerance is per channel and deliberately small: two frames of the same
 * still scene come back bit-identical here, and the slack is only for the last
 * bit of a dithered gradient. If a test needs a bigger number to pass, the
 * answer is a better assertion, not a bigger number.
 */
export const same = (a: Fingerprint, b: Fingerprint, tolerance = 2) =>
  a.length === b.length && a.every((value, i) => Math.abs(value - b[i]) <= tolerance);

/** How far apart two fingerprints are - so a failure can say by how much. */
export const distance = (a: Fingerprint, b: Fingerprint) =>
  Math.max(...a.map((value, i) => Math.abs(value - b[i])));

/** True if the canvas is drawing something rather than sitting on one flat colour. */
export const hasContrast = (print: Fingerprint) => Math.max(...print) - Math.min(...print) > 8;

/* --------------------------------------------------------- the scene, exactly */

/** The manifest at the head of a .perspective file: the scene, as data. */
export interface SceneManifest extends SceneFile {
  meshes: BundledMesh[];
}

/**
 * Export the scene and read it back - the exact assertion, where a fingerprint
 * is only ever an approximate one.
 *
 * The file is the PSPV container sceneBundle.ts writes: "PSPV", a uint32
 * version, a uint32 manifest length, then the manifest JSON, then the mesh
 * bytes. Everything a spec wants to be exact about is in that JSON - a box's
 * metres, a model's bearing, which surface a thing carries, where the camera
 * was standing.
 *
 * It puts the shelf away afterwards with Escape, which is the app's own way
 * out. Escape peels the topmost thing, though: a spec that calls this with the
 * block-out pencil armed will find the pencil is what went down.
 */
export const readSceneBundle = async (page: Page): Promise<SceneManifest> => {
  await openScenes(page);

  const exported = page.locator('[aria-label="Export scene file"]');
  await expect(exported).toBeEnabled();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    (async () => {
      await wake(page);
      await exported.click();
    })(),
  ]);

  const bytes = await readFile(await download.path());
  const magic = bytes.subarray(0, 4).toString('latin1');
  if (magic !== 'PSPV') throw new Error(`That export is not a scene bundle - it starts "${magic}".`);
  const version = bytes.readUInt32LE(4);
  if (version !== 1) throw new Error(`Scene bundle version ${version}, and this harness reads 1.`);
  const manifest = JSON.parse(
    bytes.subarray(12, 12 + bytes.readUInt32LE(8)).toString('utf8')
  ) as SceneManifest;

  /*
   * PUT THE SHELF AWAY, AND WAIT FOR IT.
   *
   * There used to be two panels to wait out here - the shelf, and the tools
   * row it could only be opened through, each with a 300 ms transition - and
   * returning after only the first had gone handed every caller the same
   * race: their next tap "in the scene" landed on a tools row that had not
   * finished leaving, and selected nothing. It cost four tests three sessions
   * on the quarantine list before the wait was written.
   *
   * The Scenes button is on the dock now, so no menu is opened on the way in
   * and there is no second panel on the way out. The wait on the shelf itself
   * stays, for the reason it was added.
   */
  await page.keyboard.press('Escape');
  await expect(exported).toBeHidden();
  return manifest;
};

/* ----------------------------------------------------------------- blocking */

/**
 * Block a box out on the floor the way a viewer does: two drags.
 *
 * The pencil is armed from the tools panel - which CLOSES the panel as it
 * arms, by design, so there is nothing to put away afterwards. Then a drag on
 * the ground for the footprint, let go, and a second drag upwards for the
 * height.
 *
 * WHERE IT DRAWS MATTERS, AND THE SHELF IS NOW PART OF WHERE. pickGround
 * returns nothing on the sky or past the edge of the sheet, and a stroke that
 * starts on nothing starts no box at all, silently. The app opens framed on an
 * eight-metre aircraft in the middle of the frame, so the default footprint is
 * low and off to the right: below the horizon, clear of the racer, and out of
 * the walk quadrant in the bottom left.
 *
 * AND ABOVE THE SHELF, WHICH IS MEASURED RATHER THAN GUESSED. Taking the pencil
 * used to put the model shelf away, so the whole lower frame was free; it stays
 * open now and occupies the bottom of it. Worse for a fixed number: the first
 * stroke STANDS A BOX UP, the box lands selected, the selection bar appears,
 * and the whole panel slot slides up by its height - so a second stroke aimed
 * at a spot the first one cleared by fifty pixels lands inside the shelf.
 *
 * So each stroke asks where the panel actually is, right then, and is held
 * above it. Nothing here has to know what a selection bar is worth in pixels,
 * and the day a safe-area inset or a row height changes, this still draws on
 * the floor.
 *
 * The pencil puts ITSELF down once a box is finished, so the instrument going
 * cold afterwards is the proof that both strokes landed. Failing here beats
 * failing three assertions later with an empty scene and no clue why.
 */
export const blockOutABox = async (
  page: Page,
  {
    from = { x: 0.55, y: 0.64 },
    to = { x: 0.78, y: 0.74 },
    lift = 0.14,
    steps = 3,
  } = {}
) => {
  const frame = page.viewportSize();
  if (!frame) throw new Error('No viewport to place a box in.');

  /**
   * The lowest line a stroke may touch: thirty pixels clear of whatever the
   * panel slot is currently holding, or the dock if the slot is empty.
   */
  const ceiling = async () =>
    (await page.evaluate(() => {
      const anchor =
        document.querySelector('[aria-label="Add cube"]') ??
        document.querySelector('[aria-label="Tools"]');
      const panel = anchor?.closest('div[class*="rounded-"]');
      return panel ? panel.getBoundingClientRect().top - 30 : window.innerHeight;
    })) as number;

  /**
   * The stroke, lifted clear of the panel WITHOUT CHANGING ITS SHAPE.
   *
   * Clamping each end to the ceiling separately is the obvious thing and it is
   * wrong: a caller that asks for a footprint running from 0.72 to 0.81 down
   * the frame, with the ceiling at 0.72, gets both ends on one line and a box
   * with no depth - and the spec that asked for two boxes a hand apart quietly
   * got two slivers on top of each other. The whole stroke moves up by however
   * much its lowest end overshoots, so what the caller drew is what lands, a
   * little further off across the floor.
   */
  const stroke = async (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const drop = Math.max(0, Math.max(a.y, b.y) * frame.height - (await ceiling()));
    return [a, b].map((spot) => ({
      x: spot.x * frame.width,
      y: spot.y * frame.height - drop,
    })) as [{ x: number; y: number }, { x: number; y: number }];
  };

  // The pencil is on the model shelf, beside the cube it is the by-eye version
  // of, and taking it leaves the shelf where it is - so unlike before, the
  // button is still on screen for the whole gesture and can be asked about at
  // either end of it.
  await openShelf(page);
  const pencil = page.locator('[aria-label="Draw boxes on the ground"]');
  await expect(pencil).toHaveAttribute('aria-pressed', 'false');
  await pencil.click();
  await expect(pencil, 'The pencil did not arm.').toHaveAttribute('aria-pressed', 'true');

  // One: the footprint, on the floor.
  const [start, end] = await stroke(from, to);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps });
  await page.mouse.up();

  // Two: the height, pulled up from where the first stroke ended - re-measured,
  // because the box the first stroke just stood up is now selected and the bar
  // that says so has pushed the shelf up over where that stroke ended. Only the
  // vertical travel is read, so beginning a little higher costs nothing.
  const [pull] = await stroke(to, to);
  await page.mouse.move(pull.x, pull.y);
  await page.mouse.down();
  await page.mouse.move(pull.x, pull.y - lift * frame.height, { steps });
  await page.mouse.up();

  /*
   * The proof that both strokes landed: the pencil put itself down, which it
   * only does once a box stands.
   *
   * Asked of the button now that the shelf stays open through the gesture. It
   * used to be asked of the armed-instrument line at the top of the frame,
   * because arming unmounted the button along with the shelf it sits on -
   * which was a true signal about a state read off the wrong element.
   */
  await expect(
    pencil,
    'The pencil is still armed, so a stroke missed the floor: the footprint or the pull landed on sky, on the racer, or past the edge of the sheet.'
  ).toHaveAttribute('aria-pressed', 'false');
};
