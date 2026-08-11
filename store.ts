import { create } from 'zustand';
import { Backdrop, BOX_SURFACES, BoxData, ConstructionLevel, FIELD_RANGES, FieldRange, FillState, GuideLevel, HatchState, isSketch, LampData, MarkerState, MaterialSettings, MESH_SURFACES, PenState, WashState, nearestSurface, PerspectiveMode, readRoomLevel, readShadows, readSurface, ROOM_LIMITS, RoomLevel, RoomSize, SavedScene, SceneModel, SceneState, SceneView, SNAP_STEPS, SunState, Surface, SURFACES, ThemeMode } from './types';
import { releaseSource, cachedSourceUrls, loadModelFromUrl } from './lib/loadModel';
import { boxRadius, findFreeSpot, lampsStanding, LAMP_RADIUS, onTheFloor } from './lib/placement';
import { addToLibrary, eraseScene, pruneAssets, readLibrary, readScenes, removeFromLibrary, writeScene } from './lib/assets';
import { captureThumbnail } from './lib/capture';
import { MAX_FIELD, wholeSheetField } from './lib/projection';
import {
  luminance,
  mountFor,
  paperFor,
  setHatch as setHatchRule,
  setPen as setPenNib,
  setWash as setWashTone,
  setInkPaper,
  setMarker as setMarkerInk,
  pageInkHex,
  setPageTone,
  setShadowInk,
} from './lib/inkMaterial';
import { nextPreset, PRESETS, type Preset } from './lib/presets';
import { walkInput } from './lib/walkInput';

// ---------------------------------------------------------------------------
// PRACTICE DEFAULTS
// ---------------------------------------------------------------------------
// The tool is a reference guide for perspective practice, built around the way
// Kim Jung Gi teaches it: everything is measured in metres, everything starts
// as a 1 m cube, and the camera sits at a believable human eye level so the
// horizon never drifts. Anything fancier (curvilinear projection, imported
// meshes) is opt-in.
// ---------------------------------------------------------------------------

/** One metre. The whole scene is measured in real-world units. */
export const UNIT = 1;

/** Standing eye level of a tall adult - the everyday KJG viewpoint. */
export const DEFAULT_CAMERA_HEIGHT = 1.9;

/**
 * The field the tool opens on.
 *
 * It used to open at 180, the whole hemisphere, where the four horizon points
 * land exactly on the edge of the frame and the fifth is at its centre - the
 * five-point sheet itself rather than an approximation of it. That is still
 * what the projection is for and it is still one drag of the field away.
 *
 * It is not what to open on. At 180 every straight edge in the world is
 * visibly bowed, so there is nothing on the page you can lay a straightedge
 * against and nothing that looks like the perspective anyone was taught first.
 * Someone opening this to learn perspective is handed the hardest case in the
 * subject before the ordinary one. At 90 the equidistant sheet is within a
 * pencil-width of straight-line perspective, and - because the corner of a
 * 16:9 frame then reaches about 52 degrees, inside FLAT_LIMIT - it also drops
 * onto the single flat pass instead of the six-face cube, so it is sharper and
 * a sixth of the cost. Widen it and you watch the straight lines bend, which is
 * the lesson, in the order it can be learned.
 */
export const DEFAULT_FOV = 90;

/**
 * The sun, as it stands when the tool opens.
 *
 * Mid-morning and off to one side: high enough that the ground reads, low
 * enough that a 1 m cube throws a shadow about its own length, and swung off
 * the view axis so the two visible vertical faces take different values. That
 * difference is the whole reason for having a light at all.
 */
/**
 * The marker, as the reference sheet has it: a yellow-green, flooding
 * everything but the highlights.
 *
 * 88 degrees round the wheel is the colour a green Copic lays over black ink -
 * far enough off pure green to read as a marker and not as a fill.
 */
export const DEFAULT_MARKER: MarkerState = { hue: 88, high: 0.62, chroma: 0.72 };

/**
 * The etched page's default rule.
 *
 * Thirty-five degrees off the horizontal for the first layer and seventy
 * across it for the second, which is the pair an etcher reaches for because a
 * shallower crossing moires and a square one reads as a net rather than as
 * tone. Six pixels apart at a hair under one wide, in strokes of forty-odd
 * pixels: close enough that the darks read as tone at arm's length, open
 * enough that every stroke is still a stroke.
 */
/**
 * The pen the tool opens with.
 *
 * Two sheet pixels of contour, which is what `lib/pen.ts` measures its own line
 * against and what every page in the tool was drawn with while this was a
 * constant. Two form lines, faintly - at three the steps land a few pixels
 * inside the silhouette on a curved form and every edge reads as a tube - and
 * the terminator at its full weight, being the one mark that says where the
 * light is.
 */
/**
 * The floor: present, a step under the sheet the tool opens on.
 *
 * It was off, on the reasoning that the tool opens on bare paper and the ruling
 * already says where the ground is, so painting it there as well is a decision
 * rather than a default. That held while the opening page was one fixed page;
 * the tool deals one now, every page stands on a floor, and the floor is part
 * of what a page IS rather than an extra laid over it.
 *
 * 150 is `floorFor(243)`, the opening sheet taken down the same step every
 * unnamed page takes it down. This value is only ever seen before the deal
 * lands and by a stored setup that predates the floor existing at all, so what
 * matters about it is that it agrees with what the deal is about to do.
 */
export const DEFAULT_GROUND = { on: true, tone: 150 };

export const DEFAULT_PEN: PenState = {
  outline: 2,
  formCount: 2,
  formStrength: 0.18,
  formWidth: 0.9,
  terminator: 1,
  terminatorWidth: 1.3,
};

/** Bare paper, in three plateaus for when a page asks for any. */
export const DEFAULT_WASH: WashState = { amount: 0, steps: 3 };

export const DEFAULT_HATCH: HatchState = {
  // Zero: strokes running square across the form, which is the cross-contour
  // an etcher reaches for first. The knob swings them round towards running
  // along it.
  angle: 0,
  spacing: 11,
  width: 1.05,
  length: 420,
};

export const DEFAULT_SUN: SunState = {
  // Over the viewer's left shoulder, so both faces of a cube you can see are
  // lit - but at different angles, which is the value separation you draw.
  // Swung round behind the scene it would put every visible face in the dark,
  // and with no fill light there is nothing to lift them back out.
  azimuth: 55,
  elevation: 48,
  intensity: 3.5,
  temperature: 5600,
  shadows: 'hard',
};

/**
 * The fill, as it stands when first switched on.
 *
 * Opposite the sun and low, so it lifts the faces the sun has left black
 * without pretending to be a second sun; cool, because a real fill is sky
 * bounce or open shade, both of which are blue; and a third of the strength,
 * which is about the ratio a studio would set.
 */
export const DEFAULT_FILL: FillState = {
  enabled: false,
  azimuth: 235,
  elevation: 22,
  intensity: 1.1,
  temperature: 8200,
  shadows: 'off',
};

/** Eye-level presets, in metres. */
export const EYE_LEVEL_PRESETS: { label: string; note: string; height: number }[] = [
  { label: '1.2', note: 'Seated', height: 1.2 },
  { label: '1.6', note: 'Average standing eye level', height: 1.6 },
  { label: '1.9', note: 'Tall standing eye level', height: DEFAULT_CAMERA_HEIGHT },
  { label: '2.5', note: 'Raised - the wide establishing view', height: 2.5 },
];

/**
 * The room, as it stands when first switched on.
 *
 * A studio rather than a hall: ten metres each way is far enough to walk about
 * in and to stand the six-metre car in with room at both ends, and a three metre
 * ceiling is close enough over your head - a metre above a standing eye - that
 * its convergence is something you can see rather than something you have to
 * measure. All three are whole metres, so every edge of the room lands on a
 * ruled line instead of a hand's width off one.
 */
export const DEFAULT_ROOM: RoomSize = { width: 10, depth: 10, height: 3 };

/**
 * The furthest back anything should stand the viewer from the middle of it.
 *
 * A metre and a bit inside the wall, so a framing worked out from an object's
 * size cannot put you through it.
 *
 * It bounds the framing only when the walls are actually up: with them down
 * there is nothing to be inside of, and clamping to an imaginary room was half
 * of why the tool used to open with the car running off both edges. The other
 * half was that with the walls up it clamped and stopped - so the room grows
 * to the view instead now, and this is the floor it grows from rather than a
 * ceiling on how far back the framing may stand. See App.tsx.
 */
export const standingRoom = (room: RoomSize) =>
  Math.max(1.6, (Number.isFinite(room.depth) ? room.depth : DEFAULT_ROOM.depth) / 2 - 1.2);

/** Snap a spawned cube to the centre of a 1 m grid cell, so stacks line up. */
const snapToCell = (v: number) => Math.floor(v) + 0.5;

const clampTo = (value: number, [low, high]: readonly [number, number]) =>
  Math.max(low, Math.min(high, value));

/**
 * The tone actually behind everything: the sheet's own, or the page's.
 *
 * One question with one answer, asked by the renderer, the chrome and the
 * status bar alike - so a page set to black is black in all three rather
 * than in whichever of them remembered to look.
 */
export const pageGrayOf = (state: { backdrop: Backdrop; backgroundGray: number }) =>
  state.backdrop === 'paper' ? state.backgroundGray : state.backdrop;

/**
 * The colour actually behind everything - the one page tone, worked out once.
 *
 * Three cases and only three. The page IS the sheet and the sheet is a sketch:
 * the warm ramp, so the world is made of the paper the object is drawn on. The
 * page is the sheet and the surface is clay: a flat grey, which is what a lit
 * scene wants behind it. Or the page is a mount of its own, which is neutral
 * whatever the sheet is doing - a mount is not a sheet, and running it through
 * a ramp built to be warm is why a page set to zero came out a cool dark blue
 * instead of black.
 */
export const pageToneOf = (state: {
  backdrop: Backdrop;
  backgroundGray: number;
  surface: Surface;
}) =>
  state.backdrop === 'paper' && isSketch(state.surface)
    ? paperFor(state.backgroundGray)
    : mountFor(pageGrayOf(state));

/**
 * Light chrome or dark, decided by what the chrome floats over.
 *
 * One rule for all three pages, asked of the tone rather than the number: a
 * relative luminance of 0.18, which is the crossing where a sheet stops being
 * paper and becomes a board. On a neutral page that lands at 118 of 255, which
 * is the middle to within a rounding error - so the flat grey keeps behaving
 * exactly as it did without needing to be a second rule.
 */
const themeFor = (state: { backdrop: Backdrop; backgroundGray: number; surface: Surface }): ThemeMode =>
  luminance(pageToneOf(state)) >= 0.18 ? 'light' : 'dark';

const pageTheme = (backdrop: Backdrop, backgroundGray: number, surface: Surface) => ({
  theme: themeFor({ backdrop, backgroundGray, surface }),
});

/**
 * A page pinned by name, which is how the deal is made to hold still.
 *
 * `window.__forceMesh` does this job for the opening object and is stripped
 * from the production bundle, which is exactly where it cannot be used from:
 * the regression suite runs against a real build. This is a key in storage
 * instead, written before the app's first line of script the same way the
 * tour's flag is, and it survives minification because it is a string rather
 * than a global.
 *
 * IT IS NOT A DEBUG HATCH ONLY. A deck of twenty-three pages is a thing you
 * iterate on, and iterating on one page means opening the tool on that page
 * over and over rather than nine times out of ten on some other one.
 *
 * An unknown name is not an error and not a crash: it deals, which is what the
 * tool does when nobody has said otherwise.
 */
const PAGE_KEY = 'kjg-perspective-page';

const pinnedPage = (): Preset | null => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const name = localStorage.getItem(PAGE_KEY);
    return PRESETS.find((p) => p.name === name) ?? null;
  } catch {
    return null;
  }
};

/**
 * WHAT THE TOOL OPENS ON: A PAGE OFF THE DECK, DEALT.
 *
 * It opened on one fixed page - the finished brush page: line, spotted black,
 * hard shadow, warm sheet mounted on flat black - and that page is still in the
 * deck and still the best single answer if only one were allowed. One is not.
 * There are twenty-three of them, each a whole page somebody would draw from,
 * and a viewer who opens the tool a hundred times had seen exactly one of them
 * unless they went looking for the die.
 *
 * THIS IS NOT THE ARGUMENT THE OPENING MESH LOST. lib/meshLibrary.ts used to
 * pick its object at random and was made to stand the racer up every time,
 * because opening on something different every time is not a room you know -
 * and that is right, about the OBJECT. The object is what you are drawing; you
 * need it to hold still to have any idea whether you are getting better. The
 * page is how it is drawn, and a different one each time is a different lesson
 * in what the material can do, over a subject that has not moved. The two
 * decisions look alike and are opposite for the same reason.
 *
 * AND IT OVERRULES WHAT WAS REMEMBERED, which is the price and is worth
 * stating plainly: the page you tuned by hand lasts the session and not the
 * reload. Everything that is not the page - the guides, the lens, the eye
 * level, the room, the snap, the floor's tone - is remembered as it always
 * was, and so is the scene. What you lose on a reload is the deal, and there
 * is a button that deals another.
 */
const OPENING_PAGE = pinnedPage() ?? nextPreset(null);

/**
 * THE FLOOR A PAGE STANDS ON WHEN IT DID NOT COMPOSE ONE.
 *
 * Six of the twenty-three pages name a floor and seventeen do not, and the
 * seventeen used to stand on nothing. They stand on this instead: the page's
 * own sheet, taken down a fixed step.
 *
 * A FRACTION OF THE PAPER RATHER THAN A NUMBER, because one number cannot
 * serve a deck whose sheets run from 18 to 252. A fixed mid-grey is a floor
 * lighter than the sheet on the dark pages and a hole in the bright ones; a
 * floor a fixed step under the sheet is in the page's own key wherever the
 * page happens to sit, and leaves the drawn object the lightest thing standing
 * on it - which is the whole reason the paper is the value it is.
 *
 * 0.62 is the middle of what the six composed pages chose for themselves,
 * measured against their own paper: 0.66, 0.30, 0.65, 0.62, 0.93, 0.95. It is
 * a wide spread and that is the argument for those six naming their own rather
 * than taking this - a floor under a strong raking sun is a different decision
 * from a floor under an overcast sky, and no ratio knows which it is looking
 * at. This is for the pages that never thought about it.
 *
 * NOTE WHAT IS GIVEN UP. The tone used to survive a deal, so a floor dragged
 * to a value you liked came back at that value. It cannot both survive and be
 * in the dealt page's key, and being in the page's key is what makes it
 * bearable on all seventeen. A drag lasts as long as the page it was made on.
 */
const floorFor = (paper: number) => ({ on: true, tone: Math.round(paper * 0.62) });

/**
 * Every field a page sets, written once.
 *
 * The die and the opening deal are the same act and were two copies of this
 * list - which is how the wash gets added to one of them and not the other.
 * `from` is what the page is landing on: a page names a pen or a wash or it
 * does not, and what it does not name is left standing.
 */
const pageOf = (
  p: Preset,
  from: { sun: SunState; fill: FillState; marker: MarkerState; hatch: HatchState; pen: PenState; wash: WashState; ground: { on: boolean; tone: number } }
) => ({
  presetName: p.name,
  surface: p.surface,
  backdrop: p.backdrop,
  backgroundGray: p.paper,
  ...pageTheme(p.backdrop, p.paper, p.surface),
  sun: { ...from.sun, ...p.sun },
  fill: { ...from.fill, enabled: p.fill },
  marker: p.marker ? { ...from.marker, ...p.marker } : from.marker,
  hatch: p.hatch ? { ...from.hatch, ...p.hatch } : from.hatch,
  // The two the pages could not say until the knobs existed.
  //
  // The pen is left alone when a page does not name one, like the stain and
  // the rule above: it shows only on the three drawn rungs, and every page
  // that lands on one names its own.
  //
  // THE FLOOR IS NOT LEFT ALONE, and never was: it shows on every page there
  // is, so a floor left standing is a floor under pages composed with nothing
  // under them. It used to be cleared for the seventeen pages that name none.
  // Now it is DERIVED for them - see floorFor - which fixes the same leak by
  // the same means, since what an unnamed page gets is a function of that page
  // and not of the one before it.
  pen: p.pen ? { ...from.pen, ...p.pen } : from.pen,
  wash: p.wash ? { ...from.wash, ...p.wash } : from.wash,
  ground: p.ground ?? floorFor(p.paper),
});

// ---------------------------------------------------------------------------
// Remembered settings
// ---------------------------------------------------------------------------
// How you have the tool set up is worth keeping between sessions; what you are
// looking at is not. So the eye level, the guides and the theme come back on
// reload, while the scene and projection return to their defaults and the app
// opens directly into the first-person walk view. A whole composition is kept
// deliberately, by name, and lives in IndexedDB with its meshes.
// ---------------------------------------------------------------------------

/**
 * A fresh id for a thing in the scene.
 *
 * This was a dependency. All ten call sites want an opaque unique string and
 * nothing else, which the platform provides - except that crypto.randomUUID
 * only exists in a secure context, and the dev server is reachable over plain
 * http from a phone on the same network. So the one line has its fallback
 * spelled out rather than a package carried for it.
 */
const newId = (): string =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
        b.toString(16).padStart(2, '0')
      ).join('');

const SETTINGS_KEY = 'kjg-perspective-settings';

const SETTING_KEYS = [
  'theme',
  'backgroundGray',
  'cameraHeight',
  'guides',
  'gridX',
  'gridZ',
  'construction',
  'fieldRange',
  'backdrop',
  'marker',
  'hatch',
  'pen',
  'wash',
  'ground',
  'roomLevel',
  'room',
  'showVanishing',
  'fov',
  'snapStep',
  'surface',
  'sunEnvironment',
  'sun',
  'fill',
] as const;

type PersistedSettings = Pick<SceneState, (typeof SETTING_KEYS)[number]>;

/**
 * What each remembered setting has to look like to be taken back.
 *
 * The allow-list on the key alone was half the job: it kept fields from removed
 * features out, and let a field whose *shape* had changed straight back in - a
 * room written as one square number, read by a version that wants two, and every
 * sum downstream holding a NaN. Nothing throws on a NaN. The camera simply goes
 * to a place that is not a place and the frame comes up empty.
 *
 * So the key has to be known and the value has to be the right kind of thing.
 * Anything else is dropped and the default stands, which is a setting lost -
 * the smallest possible price, and the only one that cannot take the tool down
 * with it.
 */
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
const boolean = (value: unknown) => typeof value === 'boolean';
const object = (value: unknown) => typeof value === 'object' && value !== null && !Array.isArray(value);

const SETTING_SHAPE: Record<(typeof SETTING_KEYS)[number], (value: unknown) => boolean> = {
  theme: (v) => v === 'light' || v === 'dark',
  backgroundGray: (v: unknown) => number(v) && (v as number) >= 0 && (v as number) <= 255,
  cameraHeight: number,
  guides: number,
  gridX: boolean,
  gridZ: boolean,
  construction: (v) => v === 0 || v === 1 || v === 2,
  fieldRange: (v) => FIELD_RANGES.includes(v as FieldRange),
  backdrop: (v) => v === 'paper' || (number(v) && (v as number) >= 0 && (v as number) <= 255),
  marker: object,
  hatch: object,
  pen: object,
  wash: object,
  ground: object,
  roomLevel: number,
  room: object,
  showVanishing: boolean,
  fov: number,
  snapStep: number,
  surface: (v) => SURFACES.includes(v as Surface),
  sunEnvironment: boolean,
  sun: object,
  fill: object,
};

/**
 * Which opening view a stored setup was written against.
 *
 * A remembered setting is normally sacred: you chose it, so it wins over any
 * default. That breaks exactly once - when the *opening view itself* changes,
 * because then everyone who has ever opened the tool is pinned to the old one
 * and the change reaches nobody who has used it before.
 *
 * That is what happened here. The field moved from the whole hemisphere to 90
 * degrees, the construction sheet lost two of its three families, the cage came
 * off everything but the selection, and the surface ladder gained the rung the
 * tool now opens on. Anyone returning with the old values stored would see none
 * of it and would reasonably conclude nothing had been done.
 *
 * So these four are taken back to the new defaults once, and once only. Nothing
 * else in the setup is touched: the theme, the room, the sun, the fill, the eye
 * level and the snap are all still yours.
 */
const VIEW_GENERATION = 4;

/** The keys the reset above drops. Everything else survives it. */
const VIEW_KEYS = ['fov', 'guides', 'construction', 'surface', 'roomLevel', 'backdrop'] as const;

/**
 * Whether the stored setup predates the current opening view.
 *
 * Read once and shared, because the drop below is only half the job: the
 * migrations further down reach past `loadedSettings` into a second raw parse
 * of the same blob, and a legacy alias that the reset never saw would hand back
 * exactly the value the reset had just dropped. Which is what happened - the
 * ink rung and the trimmed guide level reached nobody who had used the tool
 * before, because both have a legacy alias and `fov` does not.
 */
const staleView = (() => {
  if (typeof localStorage === 'undefined') return false;
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return false;
    return (JSON.parse(stored) as Record<string, unknown>).viewGeneration !== VIEW_GENERATION;
  } catch {
    return false;
  }
})();

const loadSettings = (): Partial<PersistedSettings> => {
  if (typeof localStorage === 'undefined') return {};
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    if (!object(parsed)) return {};
    const stale = parsed.viewGeneration !== VIEW_GENERATION;
    return Object.fromEntries(
      SETTING_KEYS.filter(
        (key) =>
          Object.prototype.hasOwnProperty.call(parsed, key) &&
          SETTING_SHAPE[key](parsed[key]) &&
          !(stale && (VIEW_KEYS as readonly string[]).includes(key))
      ).map((key) => [key, parsed[key]])
    ) as Partial<PersistedSettings>;
  } catch {
    return {};
  }
};

let saveTimer: number | undefined;

/**
 * Write the setup to storage, coalesced.
 *
 * This is wired to every store change, and a face drag commits on every frame,
 * so an immediate write would serialise and store on each one.
 */
export const saveSettings = (state: SceneState) => {
  if (typeof localStorage === 'undefined') return;
  if (saveTimer !== undefined) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          ...Object.fromEntries(SETTING_KEYS.map((key) => [key, state[key]])),
          viewGeneration: VIEW_GENERATION,
        })
      );
    } catch {
      // A full or blocked store is not worth interrupting a drawing session for.
    }
  }, 400) as unknown as number;
};

const loadedSettings = loadSettings();
const legacy = (() => {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as {
      showGuides?: boolean;
      modelMaterial?: Surface;
      /** Written by the version whose room floor was one square number. */
      room?: { floor?: number };
      /** Written by the version that had one switch for the room. */
      showRoom?: boolean;
      /** Written by the version whose cage was a switch, not a ladder. */
      showConstruction?: boolean;
    };
  } catch {
    return {};
  }
})();

/**
 * A room read back out of storage, whatever shape it was written in.
 *
 * The floor was one number for a square room before it was two, and a stored
 * `{ floor, height }` came back through the allow-list intact - which left the
 * room with no width and no depth at all, and every sum that touched it holding
 * a NaN. The one that mattered was where to stand: a NaN reached the walker,
 * and a camera at NaN draws an empty frame. Nothing threw and nothing logged;
 * the app simply came up white for anybody who had used the previous version.
 *
 * Which is why this is not a `??` in a spread but a function that starts from
 * the defaults and only takes numbers.
 */
const readRoom = (stored: Partial<RoomSize> | undefined): RoomSize => {
  const square = legacy.room?.floor;
  const take = (value: unknown, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return {
    width: take(stored?.width, take(square, DEFAULT_ROOM.width)),
    depth: take(stored?.depth, take(square, DEFAULT_ROOM.depth)),
    height: take(stored?.height, DEFAULT_ROOM.height),
  };
};

/** The same for the projection: two of them are not on offer any more. */
const readMode = (stored: unknown): PerspectiveMode =>
  stored === 'cylindrical' || stored === 'equidistant' || stored === 'stereographic'
    ? stored
    : 'equidistant';

/**
 * Drop the keys that came back undefined.
 *
 * This whole object is spread over the defaults, and a spread copies a key
 * whose value is `undefined` just as willingly as one with a value in it - so a
 * migration that answers "nothing stored, use the default" by returning
 * undefined would instead overwrite the default with undefined. Which is how
 * you get a field that is neither what was saved nor what was meant.
 */
const kept = <T extends object>(source: T): Partial<T> =>
  Object.fromEntries(Object.entries(source).filter(([, value]) => value !== undefined)) as Partial<T>;

/**
 * A sun read back from something written earlier.
 *
 * `sun` is stored as one object and the settings check only asks that it IS an
 * object, so every field inside it is whatever the last version wrote. Only one
 * of them has changed shape so far, and that one is enough to stop the sun
 * casting entirely without a word.
 */
const readSun = (stored: Partial<SunState> | undefined): SunState => ({
  ...DEFAULT_SUN,
  ...(stored ?? {}),
  // Nothing stored falls back to the opening sun's own rung, not to a rung
  // named here - the tool opens hard, and a fresh visitor was getting soft
  // from a default written into the reader instead of into the sun.
  shadows: readShadows(stored?.shadows, DEFAULT_SUN.shadows),
});

const remembered = kept({
  ...loadedSettings,
  // Migrate settings written before the continuous background control existed.
  backgroundGray: loadedSettings.backgroundGray ?? (loadedSettings.theme === 'dark' ? 0 : 243),
  /*
   * ...and before the guides were levels rather than on and off - and again
   * before the ground grid came out of the ladder and onto two switches of its
   * own. Anything written by the four-rung version says "grid" at 2 and above,
   * so that is where the switches come from, and every rung above the grid
   * slides down one.
   *
   * `undefined` when there is nothing stored either way, so a browser that has
   * never opened this takes the opening default rather than the top of the
   * ladder. It read `legacy.showGuides ?? true` before, which is a sensible
   * migration and a bad default: it meant a first visitor was migrated from a
   * setting they had never had, and the store's own value never applied.
   */
  guides: (loadedSettings.guides ?? (staleView ? undefined : legacy.showGuides)) === undefined
    ? undefined
    : (Math.min(2, loadedSettings.guides ?? (legacy.showGuides ? 3 : 0)) as GuideLevel),
  gridX: loadedSettings.gridX ?? (loadedSettings.guides ?? 3) >= 2,
  gridZ: loadedSettings.gridZ ?? (loadedSettings.guides ?? 3) >= 2,
  // ...and before the cage was a ladder: the old switch's "on" is the middle
  // rung, the selection's own construction. Same shape as `guides` above -
  // undefined when nothing was ever stored, so a first visit takes the default.
  construction:
    loadedSettings.construction ??
    (staleView || legacy.showConstruction === undefined
      ? undefined
      : ((legacy.showConstruction ? 1 : 0) as ConstructionLevel)),
  // ...and before the surface was a property of each thing rather than one
  // switch over every mesh in the scene.
  surface: loadedSettings.surface ?? (staleView ? undefined : legacy.modelMaterial),
  // ...and before the room was a ladder rather than a switch.
  roomLevel: loadedSettings.roomLevel ?? (staleView || !legacy.showRoom ? undefined : 2),
  // ...and before the room's floor was two numbers rather than one.
  room: readRoom(loadedSettings.room),
  // Through the defaults, so a page written by a version with fewer knobs
  // does not come back with an undefined angle and rule nothing.
  marker: loadedSettings.marker === undefined ? undefined : { ...DEFAULT_MARKER, ...loadedSettings.marker },
  hatch: loadedSettings.hatch === undefined ? undefined : { ...DEFAULT_HATCH, ...loadedSettings.hatch },
  pen: loadedSettings.pen === undefined ? undefined : { ...DEFAULT_PEN, ...loadedSettings.pen },
  wash: loadedSettings.wash === undefined ? undefined : { ...DEFAULT_WASH, ...loadedSettings.wash },
  ground: loadedSettings.ground === undefined ? undefined : { ...DEFAULT_GROUND, ...loadedSettings.ground },
  /*
   * The sun is the viewer's - bearing, height, strength and warmth all
   * survive - but which shadow the tool OPENS on is the tool's, and it moved
   * to hard with the page. So the one field is taken back with the rest of
   * the opening view, and the other four are left alone.
   */
  sun:
    loadedSettings.sun === undefined
      ? undefined
      : staleView
        ? { ...readSun(loadedSettings.sun), shadows: 'hard' as const }
        : readSun(loadedSettings.sun),
});

/**
 * Whether the scene history in the store is the real one.
 *
 * Pruning deletes every imported mesh no scene refers to, so it has to be sure
 * it knows every scene. It cannot be, if the read that filled the history
 * failed - so it does not prune at all until one has succeeded. Deleting
 * nothing is a cost measured in bytes; deleting a viewer's meshes is measured
 * in their work.
 */
const historyTrusted = { value: false };

/** Prune, but only ever against a list that is known to be complete. */
const pruneSafely = async (keep: Iterable<string>) => {
  if (!historyTrusted.value) return;
  await pruneAssets(keep);
};

/** How many steps back you can take. */
const UNDO_DEPTH = 25;

/**
 * Every imported mesh something still stands on.
 *
 * A saved scene, the scene on screen, a step back through the history that
 * would put it there again - and now the viewer's own shelf, which is a reason
 * to keep a file whether or not anything is currently standing on it.
 */
const referenced = (state: SceneState): string[] => [
  ...state.sceneHistory.flatMap((scene) => scene.models.map((m) => m.fileUrl)),
  ...state.models.map((m) => m.fileUrl),
  ...state.undoStack.flatMap((entry) => entry.models.map((m) => m.fileUrl)),
  ...state.redoStack.flatMap((entry) => entry.models.map((m) => m.fileUrl)),
  ...state.ownMeshes.map((m) => m.url),
];

/**
 * Drop any parsed mesh that nothing references any more - not the live scene,
 * and not anything still sitting in either history, since stepping back or
 * forward has to be able to put it on screen again.
 */
const releaseUnreferenced = (
  state: Partial<Pick<SceneState, 'models' | 'undoStack' | 'redoStack'>>
) => {
  const live = new Set<string>();
  state.models?.forEach((m) => live.add(m.fileUrl));
  state.undoStack?.forEach((entry) => entry.models.forEach((m) => live.add(m.fileUrl)));
  state.redoStack?.forEach((entry) => entry.models.forEach((m) => live.add(m.fileUrl)));

  cachedSourceUrls().forEach((url) => {
    if (!live.has(url)) releaseSource(url);
  });
};

/** The scene as it stands, pushed onto the undo stack. */
const snapshot = (state: Pick<SceneState, 'boxes' | 'models' | 'lamps' | 'surface' | 'undoStack'>) =>
  [
    ...state.undoStack,
    { boxes: state.boxes, models: state.models, lamps: state.lamps, surface: state.surface },
  ].slice(-UNDO_DEPTH);

/** One step's worth of scene, for the stack going the other way. */
const snapshotOf = (state: SceneState) => ({
  boxes: state.boxes,
  models: state.models,
  lamps: state.lamps,
  surface: state.surface,
});

/** The selection, if what it names is still standing after the step. */
const heldOn = (
  step: { boxes: BoxData[]; models: SceneModel[]; lamps: LampData[] },
  state: SceneState
) => ({
  selectedId: step.boxes.some((b) => b.id === state.selectedId) ? state.selectedId : null,
  selectedModelId: step.models.some((m) => m.id === state.selectedModelId)
    ? state.selectedModelId
    : null,
  selectedLampId: step.lamps.some((l) => l.id === state.selectedLampId)
    ? state.selectedLampId
    : null,
});

/**
 * A move worth being able to take back.
 *
 * Every change to the scene goes through here, and going forward again is a
 * dead end the moment a new one is made - which is what everything that has
 * ever had an undo does, and the only behaviour that cannot surprise anyone.
 */
const remember = (state: Pick<SceneState, 'boxes' | 'models' | 'lamps' | 'surface' | 'undoStack'>) => ({
  undoStack: snapshot(state),
  redoStack: [] as SceneState['redoStack'],
});

/** Everything about how the scene is being looked at, ready to be written down. */
export const currentView = (state: SceneState): SceneView => ({
  cameraHeight: state.cameraHeight,
  fov: state.fov,
  perspectiveMode: state.perspectiveMode,
  backgroundGray: state.backgroundGray,
  backdrop: state.backdrop,
  theme: state.theme,
  sun: { ...state.sun },
  fill: { ...state.fill },
  sunEnvironment: state.sunEnvironment,
  guides: state.guides,
  gridX: state.gridX,
  gridZ: state.gridZ,
  surface: state.surface,
  // How that surface is ruled, which a scene never carried - see SceneView.
  marker: { ...state.marker },
  hatch: { ...state.hatch },
  pen: { ...state.pen },
  wash: { ...state.wash },
  ground: { ...state.ground },
  roomLevel: state.roomLevel,
  room: { ...state.room },
  showVanishing: state.showVanishing,
  snapStep: state.snapStep,
  camera: {
    x: walkInput.position.x,
    z: walkInput.position.z,
    yaw: walkInput.yaw,
    pitch: walkInput.pitch,
  },
});

/**
 * Put the viewer back where the scene was saved from.
 *
 * A composition is a viewpoint as much as an arrangement, so this moves the
 * walker as well as the settings - otherwise a scene comes back correct and
 * seen from the wrong side of the room.
 */
/**
 * A number out of a file, clamped to what the control that sets it allows.
 *
 * Every one of these has a setter that already clamps - the eye level to
 * 0.2..12, the field to 10..MAX_FIELD, the page to 0..255 - and a scene file
 * walked straight past all three. `JSON.stringify` writes `null` for a NaN, so
 * one composition saved from a session that had already gone wrong is enough:
 * the view comes back holding null, something downstream calls `.toFixed` on
 * it, React unmounts the whole tree, and everything unsaved goes with it. Then
 * the store holds the null and the next save writes another poisoned file.
 */
const take = (value: unknown, low: number, high: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(low, Math.min(high, value))
    : fallback;

/** The narrowest rung a given field still fits inside. */
const rangeFor = (range: FieldRange, fov: number): FieldRange => {
  if (fov <= 210) return range;
  const sheet =
    typeof window === 'undefined' ? 540 : wholeSheetField(window.innerWidth, window.innerHeight);
  if (fov <= sheet) return range === 'human' ? 'sphere' : range;
  return 'endless';
};

const restoreView = (view: SceneView | undefined, range: FieldRange): Partial<SceneState> => {
  if (!view) return {};
  // A file with no camera at all used to throw here, inside the updater, which
  // took the import down with it rather than losing one field.
  const at = view.camera ?? { x: 0, z: 0, yaw: 0, pitch: 0 };
  walkInput.position.set(take(at.x, -500, 500, 0), 0, take(at.z, -500, 500, 0));
  walkInput.yaw = take(at.yaw, -100, 100, 0);
  walkInput.pitch = take(at.pitch, -Math.PI, Math.PI, 0);
  walkInput.lookYaw = 0;
  walkInput.lookPitch = 0;
  walkInput.forward = 0;
  walkInput.strafe = 0;
  walkInput.seeded = true;

  /*
   * The page, the sheet and the chrome are one decision, so the file is only
   * asked for the first two.
   *
   * A scene written before the page could differ from the sheet has no
   * backdrop in it, and `'paper'` - the page IS the sheet - is precisely the
   * arrangement it was composed against. The theme is then derived rather
   * than taken: in the live store it is a pure function of the page and the
   * surface, every setter keeps it that way, and a file that says otherwise
   * is a file describing a state the tool cannot be in. Trusting it gave dark
   * chrome over a white page for every scene saved on a black mount.
   */
  const surface = readSurface(view.surface ?? view.modelMaterial);
  const backgroundGray = take(view.backgroundGray, 0, 255, 243);
  const backdrop: Backdrop =
    view.backdrop === undefined || view.backdrop === 'paper'
      ? 'paper'
      : take(view.backdrop, 0, 255, 0);

  return {
    cameraHeight: take(view.cameraHeight, 0.2, 12, DEFAULT_CAMERA_HEIGHT),
    fov: take(view.fov, 10, MAX_FIELD, DEFAULT_FOV),
    // A saved scene is a viewpoint; a viewpoint wider than the current reach
    // opens the reach rather than being clipped by it.
    fieldRange: rangeFor(range, take(view.fov, 10, MAX_FIELD, DEFAULT_FOV)),
    perspectiveMode: readMode(view.perspectiveMode),
    backgroundGray,
    backdrop,
    ...pageTheme(backdrop, backgroundGray, surface),
    sun: readSun(view.sun),
    fill: { ...DEFAULT_FILL, ...(view.fill ?? {}) },
    sunEnvironment: view.sunEnvironment,
    guides: (Math.min(2, view.guides ?? ((view.showGuides ?? true) ? 3 : 0)) as GuideLevel),
    gridX: view.gridX ?? (view.guides ?? 3) >= 2,
    gridZ: view.gridZ ?? (view.guides ?? 3) >= 2,
    surface,
    // Through the defaults, so a scene written by a version with fewer knobs
    // does not come back with an undefined outline and rule nothing.
    marker: { ...DEFAULT_MARKER, ...(view.marker ?? {}) },
    hatch: { ...DEFAULT_HATCH, ...(view.hatch ?? {}) },
    pen: { ...DEFAULT_PEN, ...(view.pen ?? {}) },
    wash: { ...DEFAULT_WASH, ...(view.wash ?? {}) },
    ground: { ...DEFAULT_GROUND, ...(view.ground ?? {}) },
    roomLevel: readRoomLevel(view.roomLevel ?? view.showRoom),
    room: readRoom(view.room),
    showVanishing: view.showVanishing ?? true,
    snapStep: view.snapStep ?? 0.25,
  };
};

/** The next rung round, from wherever this thing currently sits. */
const stepSurface = (rungs: Surface[], from: Surface) =>
  rungs[(rungs.indexOf(nearestSurface(from, rungs)) + 1) % rungs.length];

export const useStore = create<SceneState>((set, get) => ({
  // Empty ground. One of the library objects is stood on it as the app opens -
  // which is asynchronous, so it cannot happen here.
  boxes: [],
  selectedId: null,
  fov: DEFAULT_FOV,
  perspectiveMode: 'equidistant',
  cameraHeight: DEFAULT_CAMERA_HEIGHT,
  // The eye level and the points, not the ruled sphere behind them: what you
  // set a drawing up with, rather than the lesson in what the projection does.
  guides: 1,
  gridX: true,
  gridZ: true,
  construction: 0,
  fieldRange: 'sphere',
  roomLevel: 0,
  room: DEFAULT_ROOM,
  showVanishing: true,
  snapStep: 0.25, // Quarter metre, so sizes stay readable against the grid
  models: [],
  selectedModelId: null,
  lamps: [],
  selectedLampId: null,
  surface: OPENING_PAGE.surface,
  backdrop: OPENING_PAGE.backdrop,
  marker: DEFAULT_MARKER,
  hatch: DEFAULT_HATCH,
  pen: DEFAULT_PEN,
  wash: DEFAULT_WASH,
  ground: DEFAULT_GROUND,
  sunEnvironment: false,
  instrument: 'none',
  undoStack: [],
  redoStack: [],
  // `theme` is not here: it is derived from whatever survives the migration
  // below, since the page it floats over is what decides it.
  backgroundGray: OPENING_PAGE.paper,
  presetName: null,
  currentSceneId: null,
  sceneHistory: [],
  ownMeshes: [],

  // Anything remembered from last time overrides the defaults above. Only the
  // setup is remembered - never the scene, the projection or the camera.
  ...remembered,
  // A setup stored before the sun existed, or by a version that knew fewer of
  // its fields, must not leave the scene with no light in it.
  sun: readSun(remembered.sun),
  fill: { ...DEFAULT_FILL, ...(remembered.fill ?? {}) },

  /*
   * ...AND THE DEAL OVER THE TOP OF ALL OF IT, last, because it has to be.
   *
   * It cannot go with the defaults above: `...remembered` is right there
   * underneath, and a stored surface would take the page's rung straight back
   * off again - which is the whole of what a viewer sees, so the deal would
   * have been a no-op for everybody who had ever opened the tool before.
   *
   * It lands on what the two lines above settled rather than on the raw stored
   * blob, so a page that names no pen keeps the pen that was migrated in, and
   * a page that names no wash keeps that. This is the same call the die makes.
   *
   * `theme` comes out of it too - it is derived from the page, and the page is
   * now this one. Reading it off `remembered` here was the old code's way of
   * saying "derived from whatever we ended up with"; what we end up with is
   * the deal.
   */
  ...pageOf(OPENING_PAGE, {
    sun: readSun(remembered.sun),
    fill: { ...DEFAULT_FILL, ...(remembered.fill ?? {}) },
    marker: { ...DEFAULT_MARKER, ...(remembered.marker ?? {}) },
    hatch: { ...DEFAULT_HATCH, ...(remembered.hatch ?? {}) },
    pen: { ...DEFAULT_PEN, ...(remembered.pen ?? {}) },
    wash: { ...DEFAULT_WASH, ...(remembered.wash ?? {}) },
    ground: { ...DEFAULT_GROUND, ...(remembered.ground ?? {}) },
  }),

  /**
   * The line under everything about to change.
   *
   * A drag commits on every frame, so the scene cannot snapshot itself on each
   * write - twenty-five steps back would be a quarter of a second of one
   * gesture. The gesture says when it starts instead, and one step back undoes
   * the whole of it.
   */
  beginChange: () => set((state) => remember(state)),

  // The always-visible cube button is the reliable 1 m ruler: it lands on the
  // grid so a new box shares the scene's vanishing points.

  /**
   * Start a drawn box: the block-out gesture's first frame.
   *
   * One remember() here covers the whole gesture - the footprint drag and
   * the height pull both write through updateBox, which takes no steps of
   * its own, so a drawn box is one undo step however long it took to draw.
   */
  beginBlock: (at) =>
    set((state) => {
      const id = newId();
      return {
        ...remember(state),
        boxes: [
          ...state.boxes,
          {
            id,
            position: [at[0], 0.05, at[1]],
            scale: [0.1, 0.1, 0.1],
            rotation: [0, 0, 0],
            surface: state.surface,
          },
        ],
        selectedId: id,
        selectedModelId: null,
        selectedLampId: null,
      };
    }),

  /**
   * A cube, in the nearest cell that has not got one in it.
   *
   * It used to take the cell under the gaze point and stop there, so a second
   * tap put a second cube inside the first: same point, same snap, same answer.
   * One visible cube and two hidden ones, and the only way to find them was to
   * drag the top one off and see what was underneath.
   *
   * The search runs on the ruling rather than beside it - every place it tries
   * is a cell centre - so a row built by tapping comes out square with the
   * floor, which is what the snap was for. And it steps around the meshes too:
   * the cell a chair is standing in is not an empty cell.
   */
  addCube: (position) =>
    set((state) => {
      const id = newId();
      const [x, z] = findFreeSpot(
        onTheFloor(state),
        [position[0], position[2]],
        boxRadius({ scale: [UNIT, UNIT, UNIT] }),
        // No gap: neighbouring cells are exactly a metre apart and two metre
        // cubes are exactly a metre wide between them, so any clearance at all
        // would skip a cell and leave a hole in the row.
        { snap: snapToCell, clearance: 0 }
      );
      return {
        ...remember(state),
        boxes: [
          ...state.boxes,
          {
            id,
            position: [x, UNIT / 2, z],
            scale: [UNIT, UNIT, UNIT],
            rotation: [0, 0, 0],
            surface: state.surface,
          },
        ],
        selectedId: id,
        selectedModelId: null,
      };
    }),

  updateBox: (id, updates) =>
    set((state) => ({
      boxes: state.boxes.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),

  removeBox: (id) =>
    set((state) => ({
      ...remember(state),
      boxes: state.boxes.filter((b) => b.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  /**
   * Empty ground.
   *
   * Leaving models behind meant "clear" put you on a clean grid with
   * yesterday's furniture still standing on it. Undoable, like every other
   * destructive action.
   *
   * Nothing in the interface calls this. There was a control that did, sitting
   * a thumb-width from the ones you reach for constantly, with a single undo
   * between a mis-tap and an hour's work - and a tool you draw from should not
   * carry a button that empties it.
   *
   * It has a control again, and where it has one is the whole point: inside
   * the scene library, next to save and export, where every neighbouring
   * control is also about the composition as a whole, and behind the same two
   * taps that deleting a saved scene asks for. Far from the pencil.
   */
  resetScene: () =>
    set((state) => {
      const next = {
        ...remember(state),
        boxes: [],
        models: [],
        lamps: [],
        selectedId: null,
        selectedModelId: null,
        selectedLampId: null,
        currentSceneId: null,
      };
      releaseUnreferenced(next);
      return next;
    }),

  /**
   * Put something on the ground that the viewer did not ask for.
   *
   * The same as `addModel` in every way except the two that matter here: it
   * writes no undo step and it selects nothing. What the tool opens with is
   * where the history begins, not a first move to be taken back - and a
   * selection you did not make is a set of handles under your thumb the moment
   * you touch the screen.
   */
  standObject: (model) =>
    set((state) => ({ models: [...state.models, { id: newId(), surface: state.surface, ...model }] })),

  selectBox: (id) => set({ selectedId: id, selectedModelId: null, selectedLampId: null }),

  selectLamp: (id) => set({ selectedLampId: id, selectedId: null, selectedModelId: null }),

  /**
   * Hang a lamp where the viewer is looking.
   *
   * At head height and a touch above: low enough to read against the room,
   * high enough to light a figure from above, which is what a lamp is for.
   * A spot from the start would demand an aim before it did anything visible;
   * a bulb simply glows, so the first tap always shows something working.
   *
   * CLEAR OF THE OTHER LAMPS. This took the point raw, so a second tap hung a
   * second lamp inside the first - two lights doing the work of what looked
   * like one, and only the top one able to be taken hold of. Off the lamps
   * only, not off the furniture: these hang at head height and above, so a lamp
   * over a box is a lamp lighting a box.
   */
  addLamp: ([x, z]) =>
    set((state) => {
      const [clearX, clearZ] = findFreeSpot(lampsStanding(state.lamps), [x, z], LAMP_RADIUS);
      return {
        ...remember(state),
        lamps: [
          ...state.lamps,
          {
            id: newId(),
            position: [clearX, 2.2, clearZ] as [number, number, number],
            kind: 'bulb' as const,
            aim: 0,
            intensity: 8,
            temperature: 3600,
            enabled: true,
          },
        ],
        selectedLampId: null,
        selectedId: null,
        selectedModelId: null,
      };
    }),

  // Like updateBox: the undo step is the caller's business (beginChange, or
  // the grab's own first-move commit), so a drag is one step however many
  // frames it wrote.
  updateLamp: (id, updates) =>
    set((state) => ({
      lamps: state.lamps.map((lamp) => (lamp.id === id ? { ...lamp, ...updates } : lamp)),
    })),

  removeLamp: (id) =>
    set((state) => ({
      ...remember(state),
      lamps: state.lamps.filter((lamp) => lamp.id !== id),
      selectedLampId: state.selectedLampId === id ? null : state.selectedLampId,
    })),

  /**
   * @param quiet Take no history step of its own.
   *
   * For a run of placements that is really one act - dropping twenty files in
   * at once - where a step per file is both wrong to undo through and, on a
   * phone, the thing that runs it out of memory: a source stays parsed while
   * ANY history entry still names it, so twenty steps pin twenty meshes for
   * twenty-five actions afterwards, whether or not they are still in the scene.
   * The importer takes one step before the loop instead. See App.tsx.
   */
  addModel: (model, quiet) =>
    set((state) => {
      // Select what was just placed: the next thing anyone does to a new figure
      // is size it or move it, and both need it selected.
      const placed = { id: newId(), surface: state.surface, ...model };
      return {
        ...(quiet ? {} : remember(state)),
        models: [...state.models, placed],
        selectedModelId: placed.id,
        selectedId: null,
      };
    }),

  /**
   * Scale a placed model about its feet, so it stays on the ground.
   *
   * The lock is enforced here and in `updateModel` rather than at the controls,
   * because there are three ways to resize a mesh - the reading on the bar, a
   * double tap on it, and two fingers on the mesh itself - and a rule kept at
   * the controls is a rule that holds until somebody adds a fourth.
   */
  // A size that is not a number leaves the mesh at the one it had. Every
  // clamp in the app passes NaN straight through - Math.max(0.02, NaN) is NaN
  // - and a mesh scaled by NaN has no vertices anywhere, so it does not error,
  // it just stops being on screen.
  scaleModel: (id, scale) =>
    set((state) => ({
      models: state.models.map((m) =>
        m.id === id && !m.lockedScale && Number.isFinite(scale)
          ? { ...m, scale: Math.max(0.02, Math.min(50, scale)) }
          : m
      ),
    })),

  toggleModelLock: (id) =>
    set((state) => ({
      models: state.models.map((m) => (m.id === id ? { ...m, lockedScale: !m.lockedScale } : m)),
    })),

  removeModel: (id) =>
    set((state) => {
      const next = {
        ...remember(state),
        models: state.models.filter((m) => m.id !== id),
        selectedModelId: state.selectedModelId === id ? null : state.selectedModelId,
      };
      // Instances share their buffers with the parsed original, so the GPU side
      // only goes back when nothing live - and nothing undoable - needs it.
      releaseUnreferenced(next);
      return next;
    }),

  selectModel: (id) => set({ selectedModelId: id, selectedId: null, selectedLampId: null }),

  updateModel: (id, updates) =>
    set((state) => ({
      models: state.models.map((m) => {
        if (m.id !== id) return m;
        // A pinned size survives a gesture that would have changed it while
        // everything else in that same gesture goes through: two fingers on a
        // locked mesh still turn it and still slide it.
        const { scale, ...rest } = updates;
        return m.lockedScale ? { ...m, ...rest } : { ...m, ...updates };
      }),
    })),

  // The setting goes all the way round, and then past it: a full turn is
  // everything there is to see, and more than a full turn is that whole sphere
  // shrunk onto the page with paper round it, which is the sheet itself. A
  // straight-line camera can do neither - Scene clamps the actual lens just
  // short of 180, where a rectilinear projection stops meaning anything - but
  // the curvilinear pass can.
  setLens: (fov) => set({ fov: Math.max(10, Math.min(MAX_FIELD, fov)) }),

  setPerspectiveMode: (mode) =>
    set((state) => ({
      perspectiveMode: mode,
      /*
       * The field is kept.
       *
       * It used to be thrown away below a hundred degrees and reset to the
       * default, on the reasoning that a field means a focal length in one
       * system and the width of the sheet in another. That was true when one of
       * the systems was flat, and that system is gone: all three now state the
       * field as the angle across the frame, so the number means the same thing
       * in each. Comparing the same view through all three IS what the button
       * is for, and it was impossible anywhere in the ordinary working range.
       */
      fov: Math.min(state.fov, MAX_FIELD),
    })),

  setCameraHeight: (height) => set({ cameraHeight: Math.max(0.2, Math.min(12, height)) }),

  cycleGuides: () => set((state) => ({ guides: (((state.guides + 2) % 3) as GuideLevel) })),


  /**
   * The floor's two rulings, on one seat.
   *
   * They were a switch each, and the reasoning was sound: ruling only the lines
   * running away from you, or only the ones that cross them, is how a floor is
   * actually drawn, and the guides LADDER could not say it - a monotone
   * how-much-construction sequence has one place for the grid and no way to
   * separate its two halves.
   *
   * A cycle of its own says all four. Nothing that argument created is lost -
   * the states are identical - and what it costs is direct addressability:
   * flipping one family alone can take up to three taps instead of one. What it
   * buys is a seat off the widest band in the panel, which is the band that
   * sets the panel's whole width.
   *
   * Ordered none, away, BOTH, across, so that the sequence the original
   * reasoning describes - lay the receding lines to their point, then cross
   * them - is two consecutive taps, and the working default is one tap from
   * nothing.
   */
  cycleFloorRuling: () =>
    set((state) => {
      const order: [boolean, boolean][] = [
        [false, false],
        [false, true],
        [true, true],
        [true, false],
      ];
      const at = order.findIndex(([x, z]) => x === state.gridX && z === state.gridZ);
      const [gridX, gridZ] = order[(at + 1) % order.length];
      return { gridX, gridZ };
    }),

  cycleSnap: () =>
    set((state) => {
      const index = SNAP_STEPS.indexOf(state.snapStep as (typeof SNAP_STEPS)[number]);
      return { snapStep: SNAP_STEPS[(index + 1) % SNAP_STEPS.length] };
    }),

  cycleConstruction: () =>
    set((state) => ({ construction: ((state.construction + 1) % 3) as ConstructionLevel })),

  /**
   * Step the lens's reach. Stepping DOWN pulls an open lens back inside the
   * new range, so the control never reads one thing while the view does
   * another.
   */
  /**
   * Step the page: the sheet itself, then black, then white.
   *
   * Three rungs because they are the three presentations - continuous with
   * the drawing, mounted on black, mounted on white - and the tone in
   * between is a drag on the same control for anyone who wants it.
   */
  cycleBackdrop: () =>
    set((state) => {
      const next = state.backdrop === 'paper' ? 0 : state.backdrop === 0 ? 255 : 'paper';
      return { backdrop: next, ...pageTheme(next, state.backgroundGray, state.surface) };
    }),

  setBackdrop: (value) =>
    set((state) => {
      const gray = Math.max(0, Math.min(255, Math.round(value)));
      return { backdrop: gray, ...pageTheme(gray, state.backgroundGray, state.surface) };
    }),

  /**
   * Deal a whole page at once.
   *
   * One set(), so the whole look lands on the same frame rather than arriving
   * as nine separate changes the renderer has to chase. No undo step and
   * nothing touched in the scene: what you have built and where you are
   * standing are yours, and this changes only how it is drawn.
   */
  shufflePreset: () =>
    set((state) => {
      const p = nextPreset(state.presetName);
      /*
       * WHAT WAS FOLLOWING THE PAGE FOLLOWS IT. WHAT WAS SET BY HAND STAYS.
       *
       * This said so and did the opposite: it stamped the page's rung onto
       * every box and every mesh, exactly like the surface control next to it -
       * which is the one place that is SUPPOSED to overrule everything, says so,
       * and is undoable because of it. So a hatched object standing on a brush
       * page, which is the whole reason a thing can have a rung of its own, was
       * wiped by the button beside it. Dealing pages is a comparison and the
       * button is meant to be pressed over and over; three presses and the
       * arrangement was gone with nothing to press to get it back.
       *
       * Following is read as standing on the rung the page is leaving. There is
       * nothing else to read it from - a box is born carrying the scene's
       * surface rather than an empty one, so "unset" and "set to what the page
       * happened to be" are the same row - but it is the right guess either
       * way: what looked like the page moves with the page, and what looked
       * different from it keeps looking different.
       */
      const following = (surface?: Surface) => surface === undefined || surface === state.surface;
      return {
        // Undoable, now that it rewrites scene rows at all - every other thing
        // in here that writes to boxes or models does this, and skipping it did
        // not merely fail to record the shuffle: undo went looking for the last
        // step that HAD been recorded and threw that away instead, so one press
        // lost the deal and the surface change before it.
        //
        // It puts the rungs back, not the paper: the page's own settings are
        // not in a history step here any more than the backdrop or the lamps
        // are. Press for another page to change the page.
        ...remember(state),
        // Every field a page sets lives in pageOf, which the opening deal calls
        // too - see it for what is overwritten and what is left standing.
        ...pageOf(p, state),
        boxes: state.boxes.map((b) => (following(b.surface) ? { ...b, surface: p.surface } : b)),
        models: state.models.map((m) => (following(m.surface) ? { ...m, surface: p.surface } : m)),
      };
    }),

  setMarker: (marker) => set((state) => ({ marker: { ...state.marker, ...marker } })),
  setHatch: (hatch) => set((state) => ({ hatch: { ...state.hatch, ...hatch } })),
  setPen: (pen) => set((state) => ({ pen: { ...state.pen, ...pen } })),
  setWash: (wash) => set((state) => ({ wash: { ...state.wash, ...wash } })),

  toggleGround: () => set((state) => ({ ground: { ...state.ground, on: !state.ground.on } })),
  // Turning it up from black is also turning it on: dragging a floor into view
  // and then having to find the tap that admits it exists is one step too many.
  setGroundTone: (tone) =>
    set((state) => ({
      ground: { on: true, tone: Math.max(0, Math.min(255, Math.round(tone))) },
    })),

  /*
   * The same knobs, aimed at the thing in your hand instead of the page.
   *
   * The panel is opened from two places and they mean two different questions -
   * the tools band asks what the page is made of, the selection bar asks about
   * this one - and until now both wrote to the page, so setting the hatch angle
   * on one object set it on every object in the scene drawn that way. That is
   * the same mistake the material BUTTON made before it learnt to read the
   * thing's own rung, one level down.
   *
   * The first turn of a knob copies the page's settings onto the object whole
   * and edits the copy; every turn after that edits the copy. So the object
   * does not jump when it steps off - the page's values are exactly what it was
   * already being drawn with - and nothing else in the scene moves with it.
   *
   * No `remember` here: this is written on every frame of a drag, like moving
   * or sizing anything else, and the panel takes one history step as the drag
   * starts. See `beginChange`.
   */
  setSelectionMaterial: (patch) =>
    set((state) => {
      const page: MaterialSettings = {
        pen: state.pen,
        marker: state.marker,
        hatch: state.hatch,
        wash: state.wash,
      };
      const merge = (own: MaterialSettings | undefined): MaterialSettings => {
        const from = own ?? page;
        return {
          pen: { ...from.pen, ...patch.pen },
          marker: { ...from.marker, ...patch.marker },
          hatch: { ...from.hatch, ...patch.hatch },
          wash: { ...from.wash, ...patch.wash },
        };
      };
      if (state.selectedModelId)
        return {
          models: state.models.map((m) =>
            m.id === state.selectedModelId ? { ...m, material: merge(m.material) } : m
          ),
        };
      if (state.selectedId)
        return {
          boxes: state.boxes.map((b) =>
            b.id === state.selectedId ? { ...b, material: merge(b.material) } : b
          ),
        };
      return {};
    }),

  /*
   * Hand it back to the page.
   *
   * Without this an object that has been touched once is set apart for good,
   * and the only way back would be to match the page's numbers by eye. It is
   * undoable in its own right rather than through a drag, being one press.
   */
  followPageMaterial: () =>
    set((state) => {
      if (state.selectedModelId)
        return {
          ...remember(state),
          models: state.models.map((m) =>
            m.id === state.selectedModelId ? { ...m, material: undefined } : m
          ),
        };
      if (state.selectedId)
        return {
          ...remember(state),
          boxes: state.boxes.map((b) =>
            b.id === state.selectedId ? { ...b, material: undefined } : b
          ),
        };
      return {};
    }),

  cycleFieldRange: () =>
    set((state) => {
      const range = FIELD_RANGES[(FIELD_RANGES.indexOf(state.fieldRange) + 1) % FIELD_RANGES.length];
      return { fieldRange: range, fov: range === 'human' ? Math.min(state.fov, 210) : state.fov };
    }),

  // -------------------------------------------------------------------------
  // The viewer's own shelf
  // -------------------------------------------------------------------------

  loadOwnMeshes: async () => {
    const own = await readLibrary();
    if (own.length) set({ ownMeshes: own });
  },

  /**
   * Put an imported file on the shelf.
   *
   * The bytes are already kept, under a hash of themselves, so importing the
   * same file twice lands on the same reference and this is a no-op - which is
   * what you want: one entry, however many times it is dropped in.
   */
  rememberMesh: async (url, name) => {
    const mesh = await addToLibrary(url, name);
    set((state) =>
      // Onto the front, matching the order they are read back in: what you
      // just imported is what you are about to place.
      state.ownMeshes.some((m) => m.url === url) ? {} : { ownMeshes: [mesh, ...state.ownMeshes] }
    );
  },

  forgetMesh: async (url) => {
    await removeFromLibrary(url);
    set((state) => ({ ownMeshes: state.ownMeshes.filter((m) => m.url !== url) }));
    // The bytes go too, unless a scene or the scene on screen still stands on
    // them - which is the same question `deleteScene` asks.
    const after = get();
    await pruneSafely(referenced(after));
  },

  /**
   * Copy the selection.
   *
   * A crowd is one figure placed nine times, and a colonnade is one box copied
   * along a line - both of which meant going back to the library or the spawn
   * button and re-sizing from scratch. The copy lands clear of its original and
   * becomes the selection, so it can be dragged straight into place.
   */
  /**
   * The whole scene to the next rung.
   *
   * This both moves the default - so what is placed next matches what is
   * already standing there - and stamps every box and mesh, since a scene-wide
   * control that quietly skipped everything you had set by hand would read as
   * broken. Undoable, because it rewrites the scene: one step back and every
   * object is as it was, whatever mixture that was.
   */
  cycleSurface: () =>
    set((state) => {
      const next = SURFACES[(SURFACES.indexOf(state.surface) + 1) % SURFACES.length];
      return {
        ...remember(state),
        surface: next,
        boxes: state.boxes.map((box) => ({ ...box, surface: next })),
        models: state.models.map((model) => ({ ...model, surface: next })),
      };
    }),

  /** Just this one, through the rungs its own kind has. */
  cycleSelectionSurface: () =>
    set((state) => {
      if (state.selectedModelId) {
        const model = state.models.find((m) => m.id === state.selectedModelId);
        if (!model) return {};
        const next = stepSurface(MESH_SURFACES, model.surface ?? state.surface);
        return {
          ...remember(state),
          models: state.models.map((m) => (m.id === model.id ? { ...m, surface: next } : m)),
        };
      }
      if (state.selectedId) {
        const box = state.boxes.find((b) => b.id === state.selectedId);
        if (!box) return {};
        const next = stepSurface(BOX_SURFACES, box.surface ?? state.surface);
        return {
          ...remember(state),
          boxes: state.boxes.map((b) => (b.id === box.id ? { ...b, surface: next } : b)),
        };
      }
      return {};
    }),

  cycleRoom: () => set((state) => ({ roomLevel: ((state.roomLevel + 1) % 3) as RoomLevel })),

  toggleVanishing: () => set((state) => ({ showVanishing: !state.showVanishing })),

  /**
   * Size it.
   *
   * Continuous, not stepped. A wall that lands on a whole metre lines up with
   * the ruling on its own floor, which is tidy - and getting there by having
   * the control jump under the thumb is not worth it, because a room is set by
   * eye against what is standing in it rather than by reading a number off a
   * dial. Every value between is reachable, and the whole ones are still there
   * to be stopped on.
   */
  setRoom: (room) =>
    set((state) => {
      const next = { ...state.room, ...room };
      const sized = {
        width: clampTo(next.width, ROOM_LIMITS.width),
        depth: clampTo(next.depth, ROOM_LIMITS.depth),
        height: clampTo(next.height, ROOM_LIMITS.height),
      };

      /*
       * If the walls have gone past you, come in with them.
       *
       * Shrinking a room you are standing in the middle of eventually puts the
       * wall behind your back, and what you are then looking at is the outside
       * of a box - which is not the thing being sized and not a view anybody
       * asked for. Half a metre inside, keeping the bearing: the walls close on
       * you rather than pass you, which is the whole point of dragging the
       * control while watching. Only while the room is up; with it down there is
       * nothing to be outside of.
       */
      if (state.roomLevel > 0) {
        const across = Math.max(0.3, sized.width / 2 - 0.5);
        const along = Math.max(0.3, sized.depth / 2 - 0.5);
        walkInput.position.x = Math.max(-across, Math.min(across, walkInput.position.x));
        walkInput.position.z = Math.max(-along, Math.min(along, walkInput.position.z));
      }

      return { room: sized };
    }),

  toggleSunEnvironment: () => set((state) => ({ sunEnvironment: !state.sunEnvironment })),

  setSun: (sun) => set((state) => ({ sun: { ...state.sun, ...sun } })),

  setFill: (fill) => set((state) => ({ fill: { ...state.fill, ...fill } })),

  setInstrument: (instrument) => set({ instrument }),

  /**
   * Step back one scene, and forward again.
   *
   * Boxes and models are restored together, because most of what is worth
   * taking back moves both: a delete, a clear, loading a saved scene over your
   * work - and now every placement, slide, turn and resize as well, one entry
   * per gesture rather than one per frame of it.
   *
   * Nothing here is released while the other stack still names it. Undoing a
   * delete and then redoing it has to be able to put the same mesh back on
   * screen, and the geometry it shares is only handed to the GPU once.
   */
  /*
   * Keeping hold of what you were holding.
   *
   * Both of these used to put the selection down. Undo is what you press in the
   * middle of adjusting something - a size dragged too far, a lift overshot -
   * and having to find the thing again afterwards is the tool taking a second
   * thing away for one mistake. The selection only goes when the object it
   * names is genuinely no longer there.
   */
  undo: () =>
    set((state) => {
      const previous = state.undoStack[state.undoStack.length - 1];
      if (!previous) return {};
      const next = {
        boxes: previous.boxes,
        models: previous.models,
        lamps: previous.lamps ?? state.lamps,
        surface: previous.surface ?? state.surface,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, snapshotOf(state)].slice(-UNDO_DEPTH),
        ...heldOn(previous, state),
      };
      releaseUnreferenced(next);
      return next;
    }),

  redo: () =>
    set((state) => {
      const ahead = state.redoStack[state.redoStack.length - 1];
      if (!ahead) return {};
      const next = {
        boxes: ahead.boxes,
        models: ahead.models,
        lamps: ahead.lamps ?? state.lamps,
        surface: ahead.surface ?? state.surface,
        undoStack: [...state.undoStack, snapshotOf(state)].slice(-UNDO_DEPTH),
        redoStack: state.redoStack.slice(0, -1),
        ...heldOn(ahead, state),
      };
      releaseUnreferenced(next);
      return next;
    }),

  /*
   * Over to the other side of the page, keeping the tone you dialled.
   *
   * It used to snap to 0 or 243, so one tap on the control you set the tone
   * WITH threw the tone away - unrecoverable except by dragging it back by
   * eye, and not even undoable. It matters more now that number is the paper.
   *
   * The tone carried across is its mirror, which keeps how far off the extreme
   * you were: a sheet dialled ten units down from white comes back ten units
   * up from black. Then it lands on whichever side of the crossing it is
   * actually on, so the answer is never a light page under dark chrome.
   */
  toggleTheme: () =>
    set((state) => {
      const wanted = state.theme === 'light' ? 'dark' : 'light';
      // Whichever tone the page is actually made of is the one that flips: the
      // sheet while the page IS the sheet, otherwise the mount. Flipping the
      // sheet under a black mount would change nothing anybody can see and
      // leave the chrome claiming otherwise.
      const onSheet = state.backdrop === 'paper';
      const of = onSheet ? state.backgroundGray : (state.backdrop as number);
      const mirrored = 255 - of;
      // Asked of the page the flip would actually produce, which is the mount
      // when there is one and the sheet when the page is the sheet.
      const would = (gray: number) =>
        themeFor({
          backdrop: onSheet ? 'paper' : gray,
          backgroundGray: onSheet ? gray : state.backgroundGray,
          surface: state.surface,
        });
      const landed = would(mirrored) === wanted ? mirrored : wanted === 'dark' ? 0 : 243;
      return onSheet
        ? { theme: wanted, backgroundGray: landed }
        : { theme: wanted, backdrop: landed };
    }),

  /*
   * How light the page is - and which page depends on the surface.
   *
   * The chrome has to flip when the page actually crosses from light to dark,
   * and that is not the same number on both. On the clay the page IS the value,
   * so it crosses at the middle. In ink the value runs through a warm ramp with
   * a deliberately steep run in it, and it crosses at about 78 - a plain
   * midpoint rule would leave a light tan sheet under dark chrome for fifty
   * units of sweep. Asking the ramp is the same rule for both: it just happens
   * to answer 118 for the grey one, which is within a hair of the midpoint.
   */
  setBackgroundGray: (value) =>
    set((state) => {
      const gray = Math.max(0, Math.min(255, Math.round(value)));
      // The chrome floats over the PAGE, so dragging the sheet only moves it
      // while the page is the sheet. Sweep the paper under a black mount and
      // the chrome has no business following it.
      return { backgroundGray: gray, ...pageTheme(state.backdrop, gray, state.surface) };
    }),

  // -------------------------------------------------------------------------
  // Saved scenes
  // -------------------------------------------------------------------------

  /**
   * Write the composition down.
   *
   * Every save is a new one. Naming and overwriting both want words on screen
   * and a decision before the thing is safe; a roll of views wants neither -
   * the thumbnail says which is which, and nothing is ever lost by saving.
   */
  saveCurrentScene: async () => {
    const state = get();
    const saved = Date.now();

    const scene: SavedScene = {
      id: newId(),
      // Never drawn: it names the exported file and the accessible control.
      name: new Date(saved).toISOString().slice(0, 16).replace('T', ' '),
      createdAt: saved,
      updatedAt: saved,
      boxes: state.boxes.map((box) => ({ ...box })),
      lamps: state.lamps.map((lamp) => ({ ...lamp })),
      models: state.models.map((model) => ({
        name: model.name,
        fileUrl: model.fileUrl,
        format: model.format,
        position: [...model.position] as [number, number, number],
        rotationY: model.rotationY,
        scale: model.scale,
        baseScale: model.baseScale,
        size: [...model.size] as [number, number, number],
        surface: model.surface,
        material: model.material,
        kind: model.kind,
        lockedScale: model.lockedScale,
      })),
      view: currentView(state),
      thumbnail: captureThumbnail(),
    };

    await writeScene(scene);
    set((current) => ({
      sceneHistory: [scene, ...current.sceneHistory],
      currentSceneId: scene.id,
    }));
  },

  /**
   * Open a saved composition.
   *
   * Every mesh is re-read from its source - a bundled path over the network, an
   * import out of this browser's own store - so the scene comes back whole
   * rather than as a list of names. Whatever cannot be found is returned to the
   * caller instead of being dropped in silence.
   */
  loadScene: async (id) => {
    const scene = get().sceneHistory.find((s) => s.id === id);
    if (!scene) return ['That scene is no longer in this browser.'];

    const missing: string[] = [];
    const restored: SceneModel[] = [];

    for (const instance of scene.models) {
      try {
        const { model } = await loadModelFromUrl(instance.fileUrl, instance.name, [
          instance.position[0],
          instance.position[2],
        ]);
        restored.push({
          ...model,
          id: newId(),
          // The saved transforms win over anything the loader worked out.
          position: [...instance.position] as [number, number, number],
          rotationY: instance.rotationY,
          scale: instance.scale,
          // Falling back to the saved scale, because a scene written before
          // the size a mesh ARRIVED at was recorded has no such number - and
          // taking it undefined made "back to how it came" set the scale to
          // NaN, which is a mesh that silently disappears. The size it was
          // saved at is the best answer that file has.
          baseScale: instance.baseScale ?? instance.scale,
          size: [...instance.size] as [number, number, number],
          surface: instance.surface === undefined ? undefined : readSurface(instance.surface),
          material: instance.material,
          kind: instance.kind,
          lockedScale: instance.lockedScale,
        });
      } catch (error) {
        missing.push(`${instance.name} (${error instanceof Error ? error.message : 'could not be loaded'})`);
      }
    }

    set((state) => {
      const next = {
        ...remember(state),
        boxes: scene.boxes.map((box) => ({ ...box, id: newId() })),
        models: restored,
        lamps: (scene.lamps ?? []).map((lamp) => ({ ...lamp, id: newId() })),
        selectedId: null,
        selectedModelId: null,
        selectedLampId: null,
        currentSceneId: scene.id,
        ...restoreView(scene.view, state.fieldRange),
      };
      releaseUnreferenced(next);
      return next;
    });

    return missing;
  },

  deleteScene: async (id) => {
    await eraseScene(id);
    set((state) => ({
      sceneHistory: state.sceneHistory.filter((s) => s.id !== id),
      currentSceneId: state.currentSceneId === id ? null : state.currentSceneId,
    }));
    // An imported file is only worth keeping while something still stands on
    // it: a saved scene, the scene on screen, or a step back through the undo
    // stack that would put it there again.
    await pruneSafely(referenced(get()));
  },

  loadSceneHistory: async () => {
    const { scenes, trusted } = await readScenes();
    if (scenes.length) set({ sceneHistory: scenes });
    // Whether the shelf can be pruned against turns on whether this read
    // actually reached storage. An empty list from a failed read looks exactly
    // like an empty list from a viewer who has saved nothing.
    historyTrusted.value = trusted;
  },

  applyScene: ({ boxes, models, lamps, view }) =>
    set((state) => {
      const next = {
        ...remember(state),
        boxes: boxes.map((box) => ({
          ...box,
          id: newId(),
          surface: box.surface === undefined ? undefined : readSurface(box.surface),
        })),
        models: models.map((model) => ({
          ...model,
          id: newId(),
          surface: model.surface === undefined ? undefined : readSurface(model.surface),
        })),
        lamps: (lamps ?? []).map((lamp) => ({ ...lamp, id: newId() })),
        selectedId: null,
        selectedModelId: null,
        selectedLampId: null,
        currentSceneId: null,
        ...restoreView(view, state.fieldRange),
      };
      releaseUnreferenced(next);
      return next;
    }),

}));

/*
 * The sheet and the page, kept in step with the store.
 *
 * Both are module state that React READS DURING RENDER - the box's own paper,
 * the background, the grid's ink, every construction colour - and both used to
 * be written from a layout effect, which runs after that render. So every
 * consumer was one change behind: sweep the page to white and the frame stayed
 * black until the next unrelated change, and the last frame of a drag kept the
 * second-to-last value for good.
 *
 * A store subscription is synchronous on the write and strictly earlier than
 * any render that could read it, which is the only placement that cannot be
 * stale.
 */
const syncTones = (state: SceneState) => {
  setInkPaper(state.backgroundGray);
  setPageTone(pageToneOf(state));
  // The cut shadow is one shared material rather than a React-managed one, so
  // its two tones are pushed here with everything else's.
  setShadowInk(pageInkHex(), state.surface === 'hatch' ? 0.92 : 0.6);
  setMarkerInk(state.marker);
  setWashTone(state.wash);
  setHatchRule(state.hatch);
  setPenNib(state.pen);
};
syncTones(useStore.getState());
useStore.subscribe(syncTones);
