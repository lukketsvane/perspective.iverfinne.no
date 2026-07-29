import { BoxData } from '../types';

/**
 * The drills.
 *
 * The tool had every mechanism and one scene, which makes it a sandbox rather
 * than a reference. These are the box exercises perspective is actually taught
 * with - the ones Kim Jung Gi runs through before anything curves - each set up
 * as a whole shot: the geometry, the eye level it reads from, the lens, and
 * where to stand. Every one is measured in metres, so any of them can be walked
 * at 1:1.
 */

export interface Study {
  id: string;
  name: string;
  /** One line on what the exercise is for. */
  hint: string;
  boxes: Omit<BoxData, 'id'>[];
  cameraHeight: number;
  fov: number;
  lockEyeLevel: boolean;
  /** Where to stand, and what to look at. */
  camera: { position: [number, number, number]; target: [number, number, number] };
  /** Marks the drills built to fit inside a real room at 1:1. */
  roomScale?: boolean;
}

const box = (
  position: [number, number, number],
  scale: [number, number, number],
  rotationY = 0
): Omit<BoxData, 'id'> => ({ position, scale, rotation: [0, rotationY, 0] });

/** A 1 m cube resting on the ground. */
const cube = (x: number, z: number, rotationY = 0) => box([x, 0.5, z], [1, 1, 1], rotationY);

/** A cube stacked at `level` (0 rests on the ground). */
const stack = (x: number, z: number, level: number) => box([x, 0.5 + level, z], [1, 1, 1]);

export const STUDIES: Study[] = [
  {
    id: 'horizon',
    name: 'The horizon',
    hint: 'A cube below, at and above eye level. Watch the top face close to a line as it reaches the horizon, then open again as the underside.',
    boxes: [
      cube(0, 0),
      cube(-2.5, -4),
      cube(2.5, -8),
      stack(-1.5, -12, 0), stack(-1.5, -12, 1), stack(-1.5, -12, 2), stack(-1.5, -12, 3),
      cube(3.5, -16),
    ],
    cameraHeight: 1.9,
    fov: 60,
    lockEyeLevel: true,
    camera: { position: [2.5, 1.9, 5], target: [0, 1.9, -6] },
  },
  {
    id: 'two-point',
    name: 'Two point street',
    hint: 'Every box shares one pair of vanishing points. Follow any two parallel edges and they meet on the horizon, left and right.',
    boxes: [
      box([-4, 2, -6], [3, 4, 8]),
      box([-4, 1.5, -16], [3, 3, 9]),
      box([-4.5, 3, -27], [4, 6, 10]),
      box([4, 2.5, -8], [3, 5, 10]),
      box([4, 1.75, -20], [3, 3.5, 11]),
      box([4.5, 3.5, -33], [4, 7, 12]),
      box([0, 0.075, -20], [6, 0.15, 40]),
    ],
    cameraHeight: 1.6,
    fov: 65,
    lockEyeLevel: true,
    camera: { position: [0.8, 1.6, 6], target: [0, 1.6, -20] },
  },
  {
    id: 'one-point',
    name: 'One point corridor',
    hint: 'Stand square to the boxes and one pair of edges stops converging altogether. Everything else runs to a single point straight ahead.',
    boxes: [
      box([-3, 1.5, -8], [2, 3, 16]),
      box([3, 1.5, -8], [2, 3, 16]),
      box([-3, 3.2, -8], [2.4, 0.4, 16]),
      box([3, 3.2, -8], [2.4, 0.4, 16]),
      box([0, 3.4, -16], [8, 0.4, 2]),
      cube(-1.2, -5),
      cube(1.4, -11),
    ],
    cameraHeight: 1.6,
    fov: 60,
    lockEyeLevel: true,
    camera: { position: [0, 1.6, 6], target: [0, 1.6, -14] },
  },
  {
    id: 'rotations',
    name: 'Every box its own pair',
    hint: 'Eight cubes, eight different headings. Each has its own two vanishing points, and every one of those points lands on the same horizon.',
    boxes: [
      cube(0, 0, 0),
      cube(-3, -2, 0.4),
      cube(3, -3, -0.55),
      cube(-5, -7, 0.9),
      cube(5, -8, -1.1),
      cube(-1.5, -12, 0.25),
      cube(2, -16, 0.7),
      cube(-4, -20, -0.3),
    ],
    cameraHeight: 1.9,
    fov: 60,
    lockEyeLevel: true,
    camera: { position: [2, 1.9, 6], target: [0, 1.9, -8] },
  },
  {
    id: 'three-point',
    name: 'Looking up',
    hint: 'Off eye level with the gaze tilted, verticals stop being vertical and run to a third point overhead.',
    boxes: [
      box([-4, 9, -10], [5, 18, 5]),
      box([5, 12, -14], [6, 24, 6]),
      box([-8, 7, -22], [5, 14, 5]),
      box([2, 15, -30], [7, 30, 7]),
      box([-2, 0.05, -16], [30, 0.1, 40]),
    ],
    cameraHeight: 1.7,
    fov: 75,
    lockEyeLevel: false,
    camera: { position: [0, 1.7, 8], target: [0, 14, -14] },
  },
  {
    id: 'foreshortening',
    name: 'Foreshortening ladder',
    hint: 'The same 1 m cube at 2, 4, 8, 16 and 32 metres. Doubling the distance halves the height on the page — that ratio is the whole of depth.',
    boxes: [cube(0, -2), cube(0, -4), cube(0, -8), cube(0, -16), cube(0, -32)],
    cameraHeight: 1.6,
    fov: 55,
    lockEyeLevel: true,
    camera: { position: [1.6, 1.6, 1.5], target: [0, 1.6, -12] },
  },
  {
    id: 'room',
    name: 'A room at 1:1',
    hint: 'Everyday sizes: a 0.75 m table, a 0.45 m seat, a 2.0 m door — the measurements you are supposed to already know by eye.',
    boxes: [
      box([0, 0.375, 0], [1.6, 0.75, 0.9]),          // table
      box([-1.2, 0.225, 0], [0.45, 0.45, 0.45]),      // seat
      box([1.2, 0.225, 0], [0.45, 0.45, 0.45]),       // seat
      box([-1.2, 0.65, -0.25], [0.45, 0.4, 0.05]),    // chair back
      box([1.2, 0.65, 0.25], [0.45, 0.4, 0.05]),      // chair back
      box([0, 1.0, -2.2], [0.9, 2.0, 0.06]),          // door
      box([2.2, 0.4, -1.4], [0.5, 0.8, 1.2]),         // cabinet
      box([-2.2, 1.1, -1.2], [0.4, 2.2, 0.4]),        // lamp post height
    ],
    cameraHeight: 1.6,
    fov: 60,
    lockEyeLevel: true,
    camera: { position: [1.8, 1.6, 3.2], target: [0, 1.6, -0.9] },
    roomScale: true,
  },
];

export const findStudy = (id: string | null) => STUDIES.find((s) => s.id === id) ?? null;
