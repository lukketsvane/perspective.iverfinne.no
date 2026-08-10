import type { Backdrop, Surface } from '../types';

/**
 * Ten pages worth looking at, and a button that deals one.
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
