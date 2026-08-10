import type { Backdrop, Surface } from '../types';

/**
 * Sixteen pages worth looking at, and a button that deals one.
 *
 * Everything in this tool is a knob, and a tool that is all knobs is a tool
 * nobody ever sees the range of. Most of what it can do lives in combinations:
 * the etched page wants a low raking sun and no floor grid, the five-point
 * sheet wants a wide field and the guides up, the marker wants a light mount.
 * Any one of those is a minute of fiddling to find and a second to lose.
 *
 * So these are not "themes". Each is a whole page that somebody would actually
 * draw from - the surface, the sheet, the mount, the light, the lens, the
 * projection and the furniture, chosen together - and the control deals a
 * different one each time it is pressed. It is the fastest way to learn what
 * the knobs are FOR: you land somewhere good, and then you can see which knob
 * put you there.
 *
 * NOTHING HERE TOUCHES THE VIEW. What you have built, where you are standing,
 * the lens, the projection, the guides, the grid, the cage and the walls are
 * all yours; a page changes only how the thing in front of you is DRAWN - the
 * surface, the sheet, the mount and the light on it.
 *
 * They used to carry a lens and a projection each, and dealing one threw the
 * view away: you would set up a shot, press the button to see it in ink, and
 * get somebody else's 420 degree cylindrical frieze. Two of the ten existed
 * only for their lens - a five-point hemisphere and that frieze - and those
 * are lessons about the projection, which is a control on the panel with its
 * own name on it, not a thing to be handed a page at a time. In their place
 * are two more pages: red chalk on cream, and a fine steel ruling on black.
 * The comparison a shuffle is for is the same view drawn ten ways, which is
 * only a comparison if the view holds still.
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
  marker?: { hue: number; high: number };
  hatch?: { angle: number; spacing: number; width: number; length: number };
  /**
   * The pen the page is drawn with.
   *
   * The one axis these all used to share, because it was a constant: ten pages
   * with ten sheets, ten suns and ten stains, every one of them outlined at
   * two pixels with the same two form lines inside it. Half of what separates
   * a silverpoint from a bande dessinée is the weight of the edge, and none of
   * these could say it. Now each does, and three of the pages below exist only
   * because it can be taken to nothing.
   */
  pen?: { outline: number; formCount: number; formStrength: number; terminator: number };
  /**
   * A floor, for the pages that stand on one.
   *
   * Most do not: a study of forms in nothing is what the ruling is for, and a
   * plane under it is a second value competing with the drawing. It earns its
   * place where the page is about the LIGHT - a lit floor is what a cast
   * shadow is read against.
   */
  ground?: { on: boolean; tone: number };
}

export const PRESETS: Preset[] = [
  {
    // Where the tool opens: line, flat black, and nothing between, mounted so
    // the drawing is the only thing on the screen with a value.
    name: 'Brush page on black',
    surface: 'brush',
    backdrop: 0,
    paper: 243,
    sun: { azimuth: 40, elevation: 48, intensity: 3.5, temperature: 5600, shadows: 'hard' },
    fill: false,
    pen: { outline: 2, formCount: 2, formStrength: 0.18, terminator: 1 },
  },
  {
    // A plate: raking evening light and the whole page built out of the needle.
    // The sun is low because an etched form is read off the turn, and a high
    // sun leaves nothing to turn through.
    name: 'Etched plate',
    surface: 'hatch',
    backdrop: 'paper',
    paper: 243,
    sun: { azimuth: 58, elevation: 22, intensity: 3.2, temperature: 4200, shadows: 'hard' },
    fill: false,
    hatch: { angle: 0, spacing: 11, width: 1.05, length: 420 },
    // Light, because a plate is engraved rather than outlined - the needle
    // makes the edge by stopping.
    pen: { outline: 1.2, formCount: 0, formStrength: 0, terminator: 0.35 },
  },
  {
    // The same needle held much lighter, on a sheet barely off white: a study
    // where the line is a whisper and the form does all the talking.
    name: 'Silverpoint',
    surface: 'hatch',
    backdrop: 236,
    paper: 252,
    sun: { azimuth: 120, elevation: 42, intensity: 2.6, temperature: 6200, shadows: 'off' },
    fill: true,
    hatch: { angle: 24, spacing: 17, width: 1.0, length: 300 },
    // A whisper, and the form lines carry it: silverpoint cannot make a heavy
    // mark at all, which is why it is drawn with so many light ones.
    pen: { outline: 0.8, formCount: 3, formStrength: 0.12, terminator: 0.5 },
  },
  {
    // ...and the needle held hard and close: a bank-note ruling, fine enough
    // that the strokes read as tone until you put your eye to them, which is
    // the whole trick an engraver is doing.
    name: 'Steel engraving',
    surface: 'hatch',
    backdrop: 0,
    paper: 240,
    sun: { azimuth: 214, elevation: 36, intensity: 3.8, temperature: 5200, shadows: 'hard' },
    fill: false,
    hatch: { angle: 62, spacing: 6, width: 0.8, length: 900 },
    // Almost nothing but the ruling. An engraver's edge is where the strokes
    // stop, not a line laid round them.
    pen: { outline: 0.55, formCount: 0, formStrength: 0, terminator: 0.2 },
  },
  {
    // Ink first, then the marker: the sheet everybody who has seen a Kim Jung
    // Gi page recognises.
    name: 'Green marker',
    surface: 'marker',
    backdrop: 'paper',
    paper: 243,
    sun: { azimuth: 34, elevation: 40, intensity: 3.6, temperature: 5400, shadows: 'hard' },
    fill: false,
    marker: { hue: 88, high: 0.62 },
    // The ink under the marker is the drawing, so it is drawn firmly.
    pen: { outline: 2.4, formCount: 2, formStrength: 0.22, terminator: 1 },
  },
  {
    // The drawing-office version: a cold blue wash on white paper, mounted on
    // near-black so it reads as a print rather than as a screen.
    name: 'Blue print',
    surface: 'marker',
    backdrop: 16,
    paper: 246,
    sun: { azimuth: 300, elevation: 34, intensity: 3.4, temperature: 7200, shadows: 'hard' },
    fill: false,
    marker: { hue: 206, high: 0.55 },
    // A drafting hand: one even line, nothing modelled inside it.
    pen: { outline: 1.6, formCount: 0, formStrength: 0, terminator: 0.8 },
  },
  {
    // Red chalk on cream, lit late and low: the oldest way of drawing a body
    // there is, and the one the marker pass turns out to be very good at.
    name: 'Sanguine',
    surface: 'marker',
    backdrop: 224,
    paper: 250,
    sun: { azimuth: 5, elevation: 28, intensity: 3.0, temperature: 3200, shadows: 'hard' },
    fill: true,
    marker: { hue: 16, high: 0.5 },
    // Chalk is form lines. It has almost no edge and a great deal of wrap.
    pen: { outline: 1.1, formCount: 5, formStrength: 0.34, terminator: 0.9 },
  },
  {
    // Past the crossing at 0.179 the sheet stops being paper and becomes a
    // board, and the pen turns to chalk on its own. Everything inverts and
    // nothing had to be told to.
    name: 'Chalk on slate',
    surface: 'brush',
    backdrop: 10,
    paper: 26,
    sun: { azimuth: 210, elevation: 30, intensity: 4.2, temperature: 5000, shadows: 'hard' },
    fill: false,
    // A blunt stick on a rough board: a broad edge and little inside it.
    pen: { outline: 2.8, formCount: 1, formStrength: 0.26, terminator: 1 },
  },
  {
    // Not a drawing at all: the objects as objects, lit hard from overhead
    // with a second light to keep the shadow side readable. What the other
    // nine are abstractions OF.
    name: 'Noon clay',
    surface: 'original',
    backdrop: 232,
    paper: 232,
    sun: { azimuth: 24, elevation: 72, intensity: 4.4, temperature: 5800, shadows: 'hard' },
    fill: true,
    // The only one of the ten standing on anything. It is the page about
    // LIGHT rather than about line, and a cast shadow wants a plane to fall
    // across - on bare paper it is a grey shape attached to nothing.
    ground: { on: true, tone: 150 },
  },
  {
    // Late, low and warm, with the mount almost black: most of the page is
    // spotted ink and what is left of the light does all the drawing.
    name: 'Night study',
    surface: 'brush',
    backdrop: 4,
    paper: 214,
    sun: { azimuth: 296, elevation: 13, intensity: 4.6, temperature: 2700, shadows: 'hard' },
    fill: false,
    // The blacks are doing the drawing; the edge only has to hold them in.
    pen: { outline: 3.2, formCount: 0, formStrength: 0, terminator: 1 },
  },
  {
    /*
     * NO OUTLINE AT ALL, and the strokes find every edge by stopping.
     *
     * The page the outline knob exists for. An engraver working in pure tone
     * lays no contour anywhere - the silhouette is simply where the ruling
     * runs out - and it is the one thing this tool could not do while two
     * pixels of contour were welded on. Ruled fine and close so the ranks read
     * as value rather than as marks.
     */
    name: 'Tonal engraving',
    surface: 'hatch',
    backdrop: 'paper',
    paper: 248,
    sun: { azimuth: 96, elevation: 26, intensity: 3.4, temperature: 4800, shadows: 'hard' },
    fill: false,
    hatch: { angle: 14, spacing: 7, width: 0.9, length: 620 },
    pen: { outline: 0, formCount: 0, formStrength: 0, terminator: 0 },
  },
  {
    /*
     * NOTAN: the shapes, and nothing else whatsoever.
     *
     * No contour, no form lines, no terminator - only the spotted blacks the
     * brush page lays under its line. What is left is the oldest exercise
     * there is, and the one every composition is judged by: two values, and
     * whether the arrangement reads before anything is described. Take the
     * pen off a brush page entirely and this is what is underneath it.
     */
    name: 'Notan',
    surface: 'brush',
    backdrop: 250,
    paper: 250,
    sun: { azimuth: 148, elevation: 34, intensity: 4.0, temperature: 5200, shadows: 'off' },
    fill: false,
    pen: { outline: 0, formCount: 0, formStrength: 0, terminator: 0 },
  },
  {
    /*
     * The clear line: one heavy even contour and nothing modelled inside it.
     *
     * Hergé's discipline and every animation model sheet since - the whole
     * form carried by an edge of constant weight, with no hatching, no
     * terminator and no interior line to say which way the light is. It is the
     * hardest test of a construction there is, because a wrong box has nothing
     * to hide behind.
     */
    name: 'Clear line',
    surface: 'brush',
    backdrop: 236,
    paper: 250,
    sun: { azimuth: 66, elevation: 52, intensity: 3.2, temperature: 5600, shadows: 'off' },
    fill: false,
    pen: { outline: 5.5, formCount: 0, formStrength: 0, terminator: 0.12 },
  },
  {
    /*
     * Cross-contour: the wrap, turned all the way up.
     *
     * Form lines are ruled at even steps of how squarely the surface meets the
     * eye, so their iso-lines are the curves an engraver actually cuts - rings
     * round a rim, bands wrapping a cylinder. At two, faintly, they are a
     * seasoning. At six and a third dark they are the drawing, and the
     * crowding where the form swings away IS the foreshortening.
     */
    name: 'Cross-contour',
    surface: 'brush',
    backdrop: 18,
    paper: 246,
    sun: { azimuth: 250, elevation: 44, intensity: 3.0, temperature: 6000, shadows: 'off' },
    fill: false,
    pen: { outline: 1.4, formCount: 6, formStrength: 0.42, terminator: 0.5 },
  },
  {
    /*
     * A lit room: the objects as objects, standing on a floor, in a raking
     * afternoon light with a cool fill behind it.
     *
     * The clay page's opposite number. That one is overhead noon on a bright
     * floor and reads as a photograph; this is late and low, so every form
     * throws a long shadow across the plane and the drawing to be made from it
     * is a drawing of the light.
     */
    name: 'Long shadows',
    surface: 'matte',
    backdrop: 208,
    paper: 208,
    sun: { azimuth: 286, elevation: 14, intensity: 4.8, temperature: 3400, shadows: 'hard' },
    fill: true,
    ground: { on: true, tone: 128 },
  },
  {
    /*
     * A marker page standing on its own floor, mounted dark.
     *
     * Every other marker page here floats on bare paper, which is right for a
     * study and wrong for a scene: a stain describing an object and no stain
     * under it puts the object nowhere. A middle floor gives the shadow
     * somewhere to land without competing with the colour.
     */
    name: 'Marker on a floor',
    surface: 'marker',
    backdrop: 12,
    paper: 244,
    sun: { azimuth: 158, elevation: 30, intensity: 3.6, temperature: 4600, shadows: 'hard' },
    fill: false,
    marker: { hue: 32, high: 0.58 },
    pen: { outline: 2.2, formCount: 1, formStrength: 0.2, terminator: 0.9 },
    ground: { on: true, tone: 74 },
  },
];

/**
 * Deal a different one.
 *
 * Different, deliberately: a shuffle that can hand you back the page you are
 * already looking at is a shuffle that looks broken half the time it is
 * pressed on a list this short.
 */
export const nextPreset = (current: string | null): Preset => {
  const pool = PRESETS.filter((p) => p.name !== current);
  return pool[Math.floor(Math.random() * pool.length)] ?? PRESETS[0];
};
