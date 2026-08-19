/**
 * FIELDS OF CUBES, TO DRAW.
 *
 * The exercise this whole tool grew out of is a page of unit cubes hanging in
 * space, all square to the same three axes, ruled to the same six vanishing
 * points. It is the scales of perspective drawing: everything harder is a cube
 * with something wrapped round it, and anybody who can put a convincing cube
 * anywhere on a curved sheet can put anything anywhere.
 *
 * What makes it an exercise rather than a doodle is that EVERY CUBE SHARES THE
 * SAME POINTS. One cube drawn well is a lucky guess; twenty drawn to the same
 * six points is a construction you either understand or do not, and the page
 * tells you which within about four cubes. That is why nine of the ten fields
 * below hand every cube the same turn, and why the tenth - which does not - is
 * labelled as the hard one rather than presented as more of the same.
 *
 * TEN ARRANGEMENTS, NOT TEN RANDOM SEEDS.
 *
 * A truly random scatter is a worse exercise than any of these, and it is worse
 * in a specific way: it has no PROPERTY to check your drawing against. A rank
 * has one direction and every cube in it must line up along it. A lattice has
 * three, and a cube in the wrong place is visibly in the wrong place. A ladder
 * halves its size at each doubling of distance, so you can catch a rate error
 * with a thumbnail. Each of these is a different question, and the scatter -
 * which is the classic page, and is here - is the one that asks all of them at
 * once and is therefore the last one worth doing rather than the first.
 *
 * The positions are worked out rather than written down, but they are worked
 * out the same way every time: the jitter below is a hash of the cube's own
 * index, so a field looks scattered and IS fixed. Deal the swarm twice and it
 * is the same swarm, which is what makes it possible to draw it, put it away,
 * and come back to see whether you have got better.
 */

/** A cube in a field: where its centre is, relative to where you are standing. */
export type Cube = [x: number, y: number, z: number];

export interface CubeField {
  /** Never shown; it names the control for a screen reader. */
  name: string;
  /** What this one is for, in two or three words. Shown as the field is dealt. */
  note: string;
  /**
   * The turn every cube in the field shares, in radians.
   *
   * A field square to the world is a one-point exercise and a dull one - two of
   * the three families run straight across the page. Every field here is turned
   * off-square by an amount of its own, so the two horizontal points land in a
   * different place each time and the page has to be read rather than
   * remembered.
   */
  turn: number;
  cubes: Cube[];
}

/**
 * Scatter that is the same scatter every time.
 *
 * A hash rather than a random: the same index always gives the same number, so
 * a field is fixed the moment it is written and a viewer can come back to it.
 * The constants are the usual shader ones and mean nothing in particular; what
 * matters is that the output is even over 0 to 1 and that neighbouring indices
 * land nowhere near each other.
 */
const jitter = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};

/** The same, over a range, and centred rather than positive. */
const spread = (seed: number, reach: number) => (jitter(seed) - 0.5) * 2 * reach;

/**
 * How high a floating cube may hang.
 *
 * Never below half a metre, so a cube is never buried in a floor that may or
 * may not be down. The eye is at about 1.6, so this range puts roughly a third
 * of any field below eye level - which is the third whose TOPS you can see, and
 * the half of the exercise a page of cubes all overhead never teaches.
 */
const height = (seed: number, low = 0.5, high = 6) => low + jitter(seed) * (high - low);

/**
 * HOW FAR OUT A PRACTICE FIELD BELONGS, and it is nearer than it looks.
 *
 * The tool opens at two hundred and ten degrees, which is the whole of human
 * sight on one page - so a metre cube at ten metres subtends about six degrees
 * and lands as a thumbnail. The first draft of these fields ran from three to
 * twenty-six metres and produced a page of specks along the horizon: correct
 * arithmetic, useless exercise.
 *
 * A cube worth drawing is a cube whose three visible faces you can see the
 * proportions of, which on this sheet means roughly two to twelve metres -
 * near enough that the nearest are a third of the page and far enough that the
 * furthest still crowd. The same range the tool already uses for putting an
 * object down, which is not a coincidence: it is the distance you stand at to
 * draw something.
 */
const NEAR = 1.8;
const FAR = 12;

/**
 * A cloud of cubes, dense in the middle distance and open at the edges.
 *
 * Which is not a stylistic choice: it is what a field of evenly spaced things
 * LOOKS like from inside it. The far ones crowd together on the page because
 * they are far, and any generator that spaces them evenly ON THE PAGE has drawn
 * a scatter nobody standing anywhere could see. So they are spaced evenly in
 * the world and allowed to crowd where they will.
 */
const cloud = (count: number, near: number, far: number, seed = 0): Cube[] =>
  Array.from({ length: count }, (_, at) => {
    const step = at + seed * 97;
    // Round the viewer rather than in front, so a curved sheet has something to
    // show at its rim and a flat one has something to turn towards.
    const bearing = jitter(step * 3 + 1) * Math.PI * 2;
    const range = near + (far - near) * Math.pow(jitter(step * 5 + 2), 0.6);
    return [
      Math.sin(bearing) * range,
      height(step * 7 + 3),
      Math.cos(bearing) * range,
    ] as Cube;
  });

export const FIELDS: CubeField[] = [
  {
    /*
     * The page the whole exercise is named after, and the last one worth doing
     * rather than the first: it asks every question at once.
     */
    name: 'Swarm',
    note: 'Ein sverm — heile øvinga på éi side',
    turn: 0.42,
    cubes: cloud(32, NEAR, FAR, 1),
  },
  {
    /*
     * One direction, and nothing else to think about. Every cube must line up
     * along one family, and an error is a cube visibly out of the queue.
     */
    name: 'Rank',
    note: 'Ei rekkje — eitt knippe å sikte langs',
    turn: 0.32,
    cubes: Array.from({ length: 12 }, (_, at) => [
      spread(at * 11, 0.3),
      0.5,
      -1.8 - at * 1.9,
    ] as Cube),
  },
  {
    /*
     * Two ranks facing each other with a gap: the classical street, and the
     * first arrangement in which the two horizontal points are both being used
     * at once.
     */
    name: 'Street',
    note: 'Ei gate — to knippe, begge i bruk',
    turn: 0.18,
    cubes: Array.from({ length: 20 }, (_, at) => {
      const side = at % 2 === 0 ? -2.1 : 2.1;
      const along = Math.floor(at / 2);
      return [side, 0.5 + (along % 3 === 0 ? 1.25 : 0), -1.2 - along * 2.3] as Cube;
    }),
  },
  {
    /*
     * Straight up, past the zenith. The one family a flat sheet keeps parallel
     * and every curved sheet bends - so this arrangement is impossible to draw
     * wrongly in one point and impossible to draw at all without the vertical
     * point once the field is open.
     */
    name: 'Tower',
    note: 'Eit tårn — den loddrette famnen',
    turn: 0.55,
    cubes: [
      /*
       * A GAP BETWEEN THEM, and it is not a detail.
       *
       * Stacked at exactly a metre the cubes touch, and a column of touching
       * cubes is not a column of cubes - it is a prism with lines drawn on it,
       * which is a different and much easier thing to draw. A quarter of a
       * metre of air is enough to make every one of them a separate form with
       * its own six edges to find.
       */
      ...Array.from({ length: 7 }, (_, at) => [0, 0.5 + at * 1.3, -4.2] as Cube),
      ...Array.from({ length: 5 }, (_, at) => [2.8, 0.5 + at * 1.3, -6.2] as Cube),
      ...Array.from({ length: 4 }, (_, at) => [-3, 0.5 + at * 1.3, -3.4] as Cube),
    ],
  },
  {
    /*
     * A regular lattice with holes in it. The strictest field here: three
     * families, all of them evenly spaced, so a cube in the wrong place is
     * visibly in the wrong place and there is nothing to argue with.
     */
    name: 'Lattice',
    note: 'Eit gitter — tre knippe, jamt delt',
    turn: 0.26,
    cubes: (() => {
      const built: Cube[] = [];
      for (let x = -2; x <= 2; x++) {
        for (let y = 0; y <= 3; y++) {
          for (let z = 0; z <= 4; z++) {
            // Every third one left out, so the lattice is read rather than
            // mistaken for a solid block with a surface.
            if ((x + y * 2 + z * 3) % 3 === 0) continue;
            // Pushed well back and spaced wide: a lattice is the one field
            // whose near corner is a WALL if it starts where the others do,
            // and a wall two metres from your face is not an exercise.
            built.push([x * 2.3, 0.5 + y * 2.1, -5 - z * 2.4]);
          }
        }
      }
      return built;
    })(),
  },
  {
    /*
     * A staircase: one unit along and one unit up, over and over. The diagonal
     * it makes is not a family of the cube at all - it is the sum of two - and
     * seeing that is most of what "constructing" a perspective means.
     */
    name: 'Steps',
    note: 'Ei trapp — diagonalen som ikkje er eit knippe',
    turn: 0.38,
    cubes: [
      ...Array.from({ length: 9 }, (_, at) => [at * 1.05 - 3, 0.5 + at * 1.05, -2.6 - at * 1.05] as Cube),
      ...Array.from({ length: 6 }, (_, at) => [-at * 1.05 + 1.6, 0.5 + at * 1.05, -5.2 - at * 0.55] as Cube),
    ],
  },
  {
    /*
     * A ring at eye level, which puts a third of the field BEHIND you.
     *
     * The one arrangement in this list that cannot be drawn on a flat sheet at
     * all - not badly, at all - because half of it is past ninety degrees off
     * the axis. It is the exercise the curved sheets exist for, and the fastest
     * way to feel why both ends of a family's direction are points.
     */
    name: 'Ring',
    note: 'Ein ring — halve feltet ligg bak deg',
    turn: 0.5,
    cubes: Array.from({ length: 16 }, (_, at) => {
      const bearing = (at / 16) * Math.PI * 2;
      return [Math.sin(bearing) * 3.8, 1.4 + (at % 3) * 0.9, Math.cos(bearing) * 3.8] as Cube;
    }),
  },
  {
    /*
     * Nothing touching anything. Every cube in the other fields has a floor or
     * a neighbour to be measured against; these have only the six points, which
     * is the condition the exercise is really about.
     */
    name: 'Shoal',
    note: 'Ei stim — ingenting rører bakken',
    turn: 0.62,
    cubes: cloud(22, NEAR + 0.8, FAR, 7).map(([x, , z], at) => [x, 1.8 + jitter(at * 13) * 4.6, z] as Cube),
  },
  {
    /*
     * The same cube, along one line, at doubling distances - so it halves on
     * the page each time. A rate you can check with a thumbnail, and the one
     * error every beginner makes: the far half of a receding row drawn too
     * large.
     */
    name: 'Ladder',
    note: 'Ein stige — halv storleik for kvar dobling',
    turn: 0.28,
    cubes: Array.from({ length: 8 }, (_, at) => [
      0.5,
      0.5,
      -1.7 * Math.pow(1.5, at),
    ] as Cube),
  },
  {
    /*
     * AND THE HARD ONE, which is here to be labelled as hard.
     *
     * Every other field hands each cube the same turn, so all of them rule to
     * the same six points and the page is one construction. These are turned
     * individually: the verticals still share a point, and NOTHING ELSE DOES.
     * Six points become forty, none of them marked, and each cube has to be
     * built from its own footprint.
     *
     * Written as a field rather than left out because it is where the exercise
     * actually goes - a real scene is this, not a lattice - and because a page
     * of it after a page of the swarm is the clearest possible statement of
     * what the shared points were doing for you.
     */
    name: 'Loose',
    note: 'Laust — kvar kasse har sine eigne punkt',
    turn: 0,
    cubes: cloud(22, NEAR + 0.4, FAR - 1, 3),
  },
];

/**
 * Which cube in a loose field is turned how.
 *
 * Only the last field uses this, and it is a function rather than a column in
 * the data because the turn is the whole content of that field: a per-cube
 * bearing, even over half a turn, fixed by the cube's own index.
 */
export const looseTurn = (at: number) => jitter(at * 17 + 5) * Math.PI;

/**
 * Deal a different one.
 *
 * Different, deliberately, for the same reason the page deck is: a shuffle that
 * can hand back the field you are already drawing is a shuffle that looks
 * broken half the time it is pressed.
 */
export const nextField = (current: string | null): CubeField => {
  const pool = FIELDS.filter((field) => field.name !== current);
  return pool[Math.floor(Math.random() * pool.length)] ?? FIELDS[0];
};
