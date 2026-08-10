import type { Backdrop, FieldRange, GuideLevel, PerspectiveMode, Surface } from '../types';

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
 * Nothing here touches the scene or the camera. What you have built and where
 * you are standing are yours; this changes only how it is drawn.
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
  fov: number;
  projection: PerspectiveMode;
  fieldRange: FieldRange;
  guides: GuideLevel;
  gridX: boolean;
  gridZ: boolean;
  construction: 0 | 1 | 2;
  vanishing: boolean;
  room: 0 | 1 | 2;
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
    fov: 90,
    projection: 'equidistant',
    fieldRange: 'sphere',
    guides: 1,
    gridX: true,
    gridZ: true,
    construction: 0,
    vanishing: false,
    room: 0,
  },
  {
    // A plate: raking evening light, nothing on the floor, and the whole page
    // built out of the needle. The sun is low because an etched form is read
    // off the turn, and a high sun leaves nothing to turn through.
    name: 'Etched plate',
    surface: 'hatch',
    backdrop: 'paper',
    paper: 243,
    sun: { azimuth: 58, elevation: 22, intensity: 3.2, temperature: 4200, shadows: 'hard' },
    fill: false,
    fov: 62,
    projection: 'equidistant',
    fieldRange: 'human',
    guides: 0,
    gridX: false,
    gridZ: false,
    construction: 0,
    vanishing: false,
    room: 0,
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
    fov: 70,
    projection: 'equidistant',
    fieldRange: 'human',
    guides: 1,
    gridX: false,
    gridZ: true,
    construction: 0,
    vanishing: false,
    room: 0,
    hatch: { angle: 24, spacing: 17, width: 1.0, length: 300 },
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
    fov: 78,
    projection: 'equidistant',
    fieldRange: 'sphere',
    guides: 1,
    gridX: false,
    gridZ: true,
    construction: 0,
    vanishing: false,
    room: 0,
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
    fov: 92,
    projection: 'equidistant',
    fieldRange: 'sphere',
    guides: 2,
    gridX: true,
    gridZ: true,
    construction: 1,
    vanishing: false,
    room: 1,
    marker: { hue: 206, high: 0.55 },
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
    fov: 88,
    projection: 'equidistant',
    fieldRange: 'sphere',
    guides: 1,
    gridX: true,
    gridZ: true,
    construction: 0,
    vanishing: false,
    room: 0,
  },
  {
    // The sheet the whole projection exists for: the hemisphere, where the
    // four horizon points sit on the frame's edge and the fifth is at its
    // centre. Guides up, cage on, because this one is a lesson.
    name: 'Five-point sheet',
    surface: 'brush',
    backdrop: 0,
    paper: 243,
    sun: { azimuth: 40, elevation: 55, intensity: 3.5, temperature: 5600, shadows: 'hard' },
    fill: false,
    fov: 180,
    projection: 'equidistant',
    fieldRange: 'sphere',
    guides: 2,
    gridX: true,
    gridZ: true,
    construction: 1,
    vanishing: true,
    room: 0,
  },
  {
    // Four-point, opened past a full turn, where the cylindrical sheet repeats
    // instead of running out: the same room again and again along one band.
    name: 'The long frieze',
    surface: 'brush',
    backdrop: 22,
    paper: 240,
    sun: { azimuth: 96, elevation: 38, intensity: 3.4, temperature: 5200, shadows: 'hard' },
    fill: true,
    fov: 420,
    projection: 'cylindrical',
    fieldRange: 'endless',
    guides: 1,
    gridX: false,
    gridZ: true,
    construction: 0,
    vanishing: false,
    room: 0,
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
    fov: 66,
    projection: 'equidistant',
    fieldRange: 'human',
    guides: 1,
    gridX: true,
    gridZ: true,
    construction: 0,
    vanishing: false,
    room: 1,
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
    fov: 84,
    projection: 'stereographic',
    fieldRange: 'sphere',
    guides: 1,
    gridX: false,
    gridZ: false,
    construction: 0,
    vanishing: false,
    room: 0,
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
