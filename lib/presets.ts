import type { Backdrop, Surface } from '../types';

/**
 * Pages worth looking at, and a button that deals one.
 *
 * Everything in this tool is a knob, and a tool that is all knobs is a tool
 * nobody ever sees the range of. Most of what it can do lives in combinations:
 * the etched page wants a low raking sun, the toned sheet wants a wash under
 * the line, the marker wants a light mount. Any one of those is a minute of
 * fiddling to find and a second to lose.
 *
 * So these are not "themes". Each is a whole page that somebody would actually
 * draw from - the surface, the sheet, the mount, the light, the pen and the
 * floor, chosen together - and the control deals a different one each time it
 * is pressed. It is the fastest way to learn what the knobs are FOR: you land
 * somewhere good, and then you can see which knob put you there.
 *
 * NOTHING HERE TOUCHES THE VIEW. What you have built, where you are standing,
 * the lens, the projection, the guides, the grid, the cage and the walls are
 * all yours; a page changes only how the thing in front of you is DRAWN.
 *
 * They used to carry a lens and a projection each, and dealing one threw the
 * view away: you would set up a shot, press the button to see it in ink, and
 * get somebody else's 420 degree cylindrical frieze. Those went. The comparison
 * a shuffle is for is the same view drawn many ways, which is only a comparison
 * if the view holds still.
 *
 * FIVE CARDS, AND IT WAS TWENTY-FIVE.
 *
 * A deck that size was built by adding one every time a page turned out well,
 * and what it produced was a button you press four times to find the etched
 * page again: five plates that differ by a crossing angle, five marker pages
 * that differ by where they sit on the colour wheel, four lit rooms that
 * differ by the hour. Every one of them was a real page and none of them was a
 * different ANSWER - and a deal you have to press repeatedly to get back
 * somewhere is a deal nobody presses.
 *
 * These five are one apiece of the things this material can be, which is the
 * only thing a deck of pages is for:
 *
 *   Brush page on black   line and spotted black, white sheet, black mount
 *   Copperplate           the etched page: value built entirely out of crossing
 *   Chalk on slate        the sheet gone dark, and the whole page inverting
 *   Sanguine              one stain over the ink, on a toned sheet
 *   Long shadows          not a drawing at all - the objects, lit, on a floor
 *
 * That is every rung of the surface ladder except plain 'original', a sheet at
 * each end of the ramp and one in the middle, a mount that is the sheet itself
 * and mounts that are not, and the one page in the deck with a floor of its
 * own. The knobs walk anywhere else from here, which is what the panel is for;
 * a card is a place to start from rather than a place to arrive at.
 */
export interface Preset {
  /** Never shown - it names the control for a screen reader. */
  name: string;
  surface: Surface;
  /** The mount behind the sheet: a tone, or the sheet itself. */
  backdrop: Backdrop;
  /** The sheet the drawing is made on. */
  paper: number;
  sun: { azimuth: number; elevation: number; intensity: number; temperature: number; shadows: 'off' | 'hard' | 'soft' };
  fill: boolean;
  marker?: { hue: number; high: number; chroma: number };
  hatch?: { angle: number; spacing: number; width: number; length: number; cross: number };
  /** The hand it is drawn with. Every page that lands on a drawn rung names one. */
  pen?: {
    outline: number;
    formCount: number;
    formStrength: number;
    formWidth: number;
    terminator: number;
    terminatorWidth: number;
  };
  /**
   * The flat tone under the line, for the pages that have one.
   *
   * A page that does not name a wash is left alone, like the pen: it shows only
   * where the pen shows, and every page that lands there names its own.
   */
  wash?: { amount: number; steps: number };
  /**
   * The floor this page composed for itself. One of the five does.
   *
   * It is the light study - the page about a cast shadow, which has to land on
   * something - and its tone is chosen against its own paper and its own sun
   * rather than computed, which is a thing no formula produces.
   *
   * A PAGE WITHOUT ONE STILL STANDS ON A FLOOR. It used to stand on nothing,
   * on the argument that a study of forms in nothing is what the ruling is for
   * and a plane under it is a second value competing with the drawing. The
   * ruling is still there and the argument was not wrong; it was just answering
   * a different question than the one the deck now asks. See `floorFor` in
   * store.ts for the tone an unnamed page gets.
   */
  ground?: { on: boolean; tone: number };
}

export const PRESETS: Preset[] = [
  {
    // Where the tool opens: line, flat black, and nothing between, mounted so
    // the drawing is the only thing on the screen with a value.
    //
    // The two weights are the ones it has always been drawn at. They are
    // written down now because a page names its whole hand or it inherits
    // whatever the last drag left in the panel.
    name: 'Brush page on black',
    surface: 'brush',
    backdrop: 0,
    paper: 243,
    sun: { azimuth: 40, elevation: 48, intensity: 3.5, temperature: 5600, shadows: 'hard' },
    fill: false,
    pen: { outline: 2, formCount: 2, formStrength: 0.18, formWidth: 0.9, terminator: 1, terminatorWidth: 1.3 },
  },
  {
    /*
     * The reproductive plate: the page the crosshatch was rebuilt FOR.
     *
     * A copperplate engraver translating a painting has exactly one
     * instrument - parallel lines, crossed once through the shadows, crossed
     * again in the pits - and the whole tonal world has to come out of how
     * those three families share the paper. This page holds the middle of
     * every range: a hand's diagonal, a gap wide enough to see the weave at
     * arm's length, an unbroken line, and the crossing at the classical
     * seventy-five - open enough to read as lozenges, square enough to sit
     * still. If one page shows what the three-pass build does, it is this
     * one; the knobs walk to every other plate in the deck from here.
     *
     * The outline is present and light, which is what makes it a reproductive
     * plate rather than a tonal engraving: the drawing is stated first and the
     * ranks fill it, rather than the ranks finding every edge on their own by
     * stopping.
     */
    name: 'Copperplate',
    surface: 'hatch',
    backdrop: 'paper',
    paper: 249,
    // From behind the subject's right shoulder, which is the one bearing that
    // matters on this rung: it stands the whole visible side in the halftone
    // the ranks are built to carry. Lit from the viewer's side of the sky the
    // page is an outline drawing - everything the eye can see is squarer to
    // the sun than the first rank's entry, and the plate never shows.
    sun: { azimuth: 215, elevation: 28, intensity: 3.4, temperature: 5000, shadows: 'hard' },
    fill: false,
    hatch: { angle: 34, spacing: 8.5, width: 1.15, length: 0, cross: 75 },
    pen: { outline: 1.4, formCount: 0, formStrength: 0, formWidth: 0.9, terminator: 0.3, terminatorWidth: 1.3 },
  },
  {
    // Past the crossing at 0.179 the sheet stops being paper and becomes a
    // board, and the pen turns to chalk on its own. Everything inverts and
    // nothing had to be told to.
    //
    // A blunt stick on a rough board, which it said before and could not draw:
    // the wrap is two broad soft bands at 2.6 px, not the engraver's hairline
    // every other page in here was stuck with. Heavy and faint is a different
    // hand from fine and dark, and until formWidth existed only one of them
    // could be asked for.
    name: 'Chalk on slate',
    surface: 'brush',
    backdrop: 10,
    paper: 26,
    sun: { azimuth: 186, elevation: 26, intensity: 4.2, temperature: 5000, shadows: 'hard' },
    fill: false,
    pen: { outline: 2.8, formCount: 2, formStrength: 0.26, formWidth: 2.6, terminator: 1, terminatorWidth: 1.3 },
  },
  {
    // Red chalk on toned paper, lit late and low: the oldest way of drawing a
    // body there is, and the one the marker pass turns out to be very good at.
    //
    // On a TONED sheet, which is the whole of it: at 158 the stain sits under
    // the paper the way chalk sits on laid paper, and what the marker leaves
    // bare above accentHigh becomes a toned highlight rather than a hole
    // punched in the drawing. It sat on white for a while, which is not a
    // sheet anybody has ever drawn a sanguine on.
    name: 'Sanguine',
    surface: 'marker',
    backdrop: 196,
    paper: 158,
    sun: { azimuth: 5, elevation: 28, intensity: 3.0, temperature: 3200, shadows: 'hard' },
    fill: false,
    marker: { hue: 16, chroma: 0.72, high: 0.5 },
    // Chalk is form lines. It has almost no edge and a great deal of wrap.
    pen: { outline: 1.1, formCount: 5, formStrength: 0.34, formWidth: 0.9, terminator: 0.9, terminatorWidth: 1.3 },
  },
  {
    /*
     * A lit room: the objects as objects, standing on a floor, in a raking
     * afternoon light with a cool fill behind it.
     *
     * The one card that is not a drawing - what the other four are abstractions
     * OF. Late and low rather than overhead, so every form throws a long shadow
     * across the plane and what there is to be drawn from it is the light
     * itself: where it grazes, where it stops, and the shape it throws.
     */
    name: 'Long shadows',
    surface: 'original',
    backdrop: 208,
    paper: 208,
    sun: { azimuth: 286, elevation: 14, intensity: 4.8, temperature: 3400, shadows: 'hard' },
    fill: true,
    ground: { on: true, tone: 128 },
  },
];

/**
 * Deal a different one.
 *
 * Different, deliberately: a shuffle that can hand you back the page you are
 * already looking at is a shuffle that looks broken half the time it is
 * pressed.
 */
export const nextPreset = (current: string | null): Preset => {
  const pool = PRESETS.filter((p) => p.name !== current);
  return pool[Math.floor(Math.random() * pool.length)] ?? PRESETS[0];
};
