import type { GuideLevel, PerspectiveMode, SelectionGuide } from '../types';

/**
 * THE LESSON.
 *
 * This tool exists because of videos of Kim Jung Gi ruling a sphere on a blank
 * page and then drawing a room full of cubes onto it, freehand, in five point.
 * Everything else here - the measured shelf, the four projections, the ruled
 * construction, the ink - was built to make that reachable. What was missing
 * was the thing the videos do not contain: WHY it works.
 *
 * ONE IDEA, TWELVE CARDS.
 *
 * Almost every perspective tutorial teaches one, two and three point as three
 * separate recipes, then presents four and five point as exotica. That is not
 * what they are, and teaching it that way is why so few people can draw the
 * later ones. They are one system:
 *
 *   Stand still. Everything you can see is a DIRECTION. The set of all
 *   directions is a sphere around your eye, and a picture is a map of that
 *   sphere onto paper. A family of parallel lines shares one direction, so it
 *   vanishes at the two points where that direction pierces the sphere. A cube
 *   has three families, so it has six points, always, whichever way you are
 *   facing.
 *
 * Then "one point", "two point", "three point", "four point", "five point" are
 * not five systems. They are ONE system seen through five different amounts of
 * paper - and the number in the name is simply how many of the six a given
 * sheet happens to be able to show you.
 *
 * That is the whole lesson, and every card below is a consequence of it.
 *
 * IT IS PERFORMED RATHER THAN ILLUSTRATED. No diagrams, because the app is
 * already the diagram: it has the four projections, the ruled sphere, a family
 * of parallels you can watch converge, and a cube whose own points it will draw
 * for you. So the lesson takes the controls - the field, the sheet, where you
 * stand, which way you look, what is standing on the floor - and works them,
 * while the card says what is happening. See components/Lesson.tsx for the hand
 * on the controls; this file is only the score.
 *
 * THE CARDS ARE IN NYNORSK, like the tour's and the hints', and for the same
 * reason: this is the one place in the app where a human is being told
 * something in words rather than shown a mark.
 */

/** What is standing on the floor while a card is up. */
export type Cast =
  /** Bare ground. */
  | 'nothing'
  /** One metre cube, square to the world, a little way off. */
  | 'one'
  /** A rank of them running away from you: one family of parallels, drawn. */
  | 'row'
  /** Four of them in a ring about where you stand, so a point is behind you. */
  | 'around'
  /** A street: two rows facing each other, which is the classical exercise. */
  | 'street';

/** Where the app is put while a card is up. */
export interface Stage {
  fov: number;
  mode: PerspectiveMode;
  guides: GuideLevel;
  /** The selection's own construction: 1 rules to ITS vanishing points. */
  selectionGuides: SelectionGuide;
  cameraHeight: number;
  /** Where to stand, and which way to look, in metres and radians. */
  stand: { x: number; z: number; yaw: number; pitch: number };
  cast: Cast;
  gridX: boolean;
  gridZ: boolean;
  /** The cube's own turn about its upright, in radians. */
  turn: number;
}

/**
 * A slow change made while the card is up.
 *
 * This is what separates the lesson from a slideshow. Three of the twelve
 * cards are about a TRANSFORMATION rather than a state - the corners of a flat
 * sheet stretching as the lens opens, the second vanishing point walking onto
 * the page as you turn, the verticals gathering as you look up - and none of
 * those can be shown by a picture of the end of it. The card sits still and
 * the world moves under it, back and forth, for as long as you leave it there.
 */
export interface Sweep {
  seconds: number;
  field?: [number, number];
  yaw?: [number, number];
  pitch?: [number, number];
  turn?: [number, number];
  /** There and back, rather than round and round. Nearly always what is meant. */
  once?: boolean;
}

export interface Card {
  /** Two or three words. The thing this card is about. */
  headline: string;
  /** Two or three sentences. Never more: a card nobody finishes is a card. */
  body: string;
  stage: Partial<Stage>;
  sweep?: Sweep;
  /** How long the move into this card's stage takes. */
  travel?: number;
}

const HALF_PI = Math.PI / 2;

/** Where every card starts from, so a card only has to say what it changes. */
export const OPENING: Stage = {
  fov: 210,
  mode: 'equidistant',
  guides: 1,
  selectionGuides: 0,
  cameraHeight: 1.6,
  stand: { x: 0, z: 0, yaw: 0, pitch: 0 },
  cast: 'nothing',
  gridX: true,
  gridZ: true,
  turn: 0,
};

export const CARDS: Card[] = [
  {
    /*
     * The one fact everything else is a consequence of, and the one nobody is
     * ever told. A picture is not a window and it is not a projection onto a
     * plane - a plane is one choice of paper among several, and this tool has
     * four. What a picture IS, before any paper is chosen, is a map of the
     * sphere of directions around one point.
     */
    headline: 'Ei kule av retningar',
    body: 'Du står stille. Alt du kan sjå ligg i ei retning, og alle retningane til saman er ei kule rundt auget ditt. Eit bilete er eit kart over den kula — ikkje noko meir enn det.',
    stage: { cast: 'nothing', guides: 2, fov: 260, mode: 'equidistant' },
    sweep: { seconds: 26, yaw: [-0.5, 0.5] },
    travel: 1200,
  },
  {
    /*
     * Why a vanishing point exists at all, said as a limit rather than as a
     * rule. Most tutorials assert that parallels meet; the reason is one
     * sentence long and it is the reason the point does not depend on where
     * the lines are.
     */
    headline: 'Parallelle linjer møtest',
    body: 'Ei rekkje kassar, alle med same retning. Jo lenger ut du fylgjer dei, jo nærare kjem retninga frå auget ditt den retninga linjene sjølve har — så alle saman peikar mot det same punktet.',
    stage: { cast: 'row', mode: 'rectilinear', fov: 70, selectionGuides: 1, stand: { x: 0, z: 5, yaw: 0, pitch: 0 } },
    travel: 1100,
  },
  {
    /*
     * The correction that makes the rest of the lesson possible. A flat sheet
     * shows one point per family and hides the other, which is why every
     * beginner learns "one family, one point" and is then baffled by the
     * curvilinear systems - where both are on the page at once.
     */
    headline: 'Kvart knippe har to punkt',
    body: 'Snu deg heilt rundt. Der er det andre. Eit knippe parallelle linjer forsvinn i dei to punkta der retninga stikk gjennom kula — eitt framover, eitt bakover. Det flate arket kan berre vise deg det eine.',
    stage: { cast: 'row', mode: 'equidistant', fov: 300, guides: 1, selectionGuides: 1, stand: { x: 0, z: 5, yaw: 0, pitch: 0 } },
    sweep: { seconds: 22, yaw: [0, Math.PI] },
    travel: 1400,
  },
  {
    headline: 'Eitt punkt',
    body: 'Ei kasse rett på. To av dei tre knippa er parallelle med arket og blir liggjande parallelle på papiret òg; berre det tredje går innover. Eitt punkt — og det ligg midt i biletet fordi du ser rett langs retninga.',
    stage: { cast: 'one', mode: 'rectilinear', fov: 55, turn: 0, selectionGuides: 1, stand: { x: 0, z: 4.5, yaw: 0, pitch: 0 } },
    travel: 1200,
  },
  {
    /*
     * The second big idea: the number in the name is a fact about the PICTURE,
     * not about the box. Nothing in the world changes across cards four, five
     * and six - only where you stand and which way you look.
     */
    headline: 'To punkt',
    body: 'Snu kassa. No går to knippe innover, kvart til sitt punkt ute på horisonten, og loddlinjene står framleis rett opp. Ingenting i verda har endra seg. Det er du som har flytta deg.',
    stage: { cast: 'one', mode: 'rectilinear', fov: 65, selectionGuides: 1, stand: { x: 0, z: 4.5, yaw: 0, pitch: 0 } },
    sweep: { seconds: 16, turn: [0, Math.PI / 4] },
    travel: 1000,
  },
  {
    headline: 'Tre punkt',
    body: 'Sjå opp. No er ikkje loddlinjene parallelle med arket lenger heller, så dei samlar seg òg — i eit punkt over deg. Tre knippe, tre punkt. Same kasse, same stad.',
    stage: { cast: 'one', mode: 'rectilinear', fov: 85, turn: Math.PI / 5, selectionGuides: 1, cameraHeight: 1.6, stand: { x: 0, z: 3.2, yaw: 0, pitch: 0 } },
    sweep: { seconds: 15, pitch: [0, 0.75] },
    travel: 1100,
  },
  {
    /*
     * Where the flat sheet is shown to fail, rather than asserted to. The
     * tangent runs away and the corners go with it - and the card sits there
     * while it happens, twice, which is the only way anybody believes it.
     */
    headline: 'Det flate arket tek slutt',
    body: 'Opne linsa på det flate arket og sjå hjørna strekkje seg. Ei rett linje held seg rett — det er heile poenget med systemet — men prisen er at avstanden frå midten er tangenten til vinkelen, og tangenten spring frå deg. Ved 180 grader er han uendeleg.',
    stage: { cast: 'street', mode: 'rectilinear', fov: 50, guides: 1, selectionGuides: 0, stand: { x: 0, z: 6, yaw: 0, pitch: 0 } },
    sweep: { seconds: 14, field: [50, 130] },
    travel: 1200,
  },
  {
    headline: 'Fire punkt',
    body: 'Så bøyer vi det. Sylinderen held loddlinjene rette og lèt vassrette linjer bue — og no er horisonten ein heil sirkel, med begge punkta til eit knippe på arket samstundes.',
    stage: { cast: 'street', mode: 'cylindrical', fov: 300, guides: 1, stand: { x: 0, z: 6, yaw: 0, pitch: 0 } },
    sweep: { seconds: 24, yaw: [0, Math.PI] },
    travel: 1500,
  },
  {
    /*
     * The arrival. Both axes bent, the whole sphere on a disc, and the zenith
     * and nadir on the page - which is exactly the sheet the videos this tool
     * came from are drawn on.
     */
    headline: 'Fem punkt',
    body: 'Bøy den andre vegen òg, og heile kula ligg på arket: fire punkt rundt horisonten, eitt rett opp, eitt rett ned. Avstand frå midten er vinkelen sjølv, jamt i alle retningar. Dette er arket Kim Jung Gi rular.',
    stage: { cast: 'street', mode: 'equidistant', fov: 360, guides: 2, stand: { x: 0, z: 6, yaw: 0, pitch: 0 } },
    travel: 1600,
  },
  {
    headline: 'Ei kasse har seks',
    body: 'Tre knippe, to punkt kvar. På det flate arket såg du eitt, to eller tre av dei — resten låg bak deg. Her er alle seks samstundes, og dei har vore der heile tida.',
    stage: { cast: 'one', mode: 'equidistant', fov: 360, guides: 1, selectionGuides: 1, turn: Math.PI / 5, stand: { x: 0, z: 3.4, yaw: 0, pitch: 0 } },
    sweep: { seconds: 20, yaw: [-0.4, 0.4] },
    travel: 1400,
  },
  {
    /*
     * The ruled sheet, and what it is FOR. Fifteen degrees is the spacing the
     * shader draws at and the spacing in the videos: close enough to sight an
     * angle against, open enough to draw between.
     */
    headline: 'Rul arket først',
    body: 'Meridianane står femten grader frå kvarandre og møtest i dei same seks punkta. Det er dette rutenettet du siktar mot: kvar oppreiste kant i verda fylgjer ei av kurvene, og kvar vassrett kant kryssar dei jamt.',
    stage: { cast: 'street', mode: 'equidistant', fov: 360, guides: 2, selectionGuides: 0, stand: { x: 0, z: 6, yaw: 0, pitch: 0 } },
    sweep: { seconds: 30, pitch: [-0.35, 0.35] },
    travel: 1200,
  },
  {
    /*
     * And the controls back, with the sheet ruled and the pencil where they
     * left it. A lesson that ends by putting everything back the way it was is
     * a lesson about somebody else's picture.
     */
    headline: 'Teikn ei sjølv',
    body: 'No har du arket. Blyanten teiknar grunnflata og dreg henne opp; hald ei kasse og slå på hennar eigne punkt for å sjå kvar kantane skal peike. Resten er timar.',
    stage: { cast: 'one', mode: 'equidistant', fov: 210, guides: 2, selectionGuides: 1, turn: Math.PI / 5, stand: { x: 0, z: 3.6, yaw: 0, pitch: 0 } },
    travel: 1400,
  },
];

/**
 * Where the cubes stand for each cast, in metres.
 *
 * Whole metres on the grid's own cells, because the ruling underneath is a
 * metre grid and a lesson about where things line up must line up. A unit cube
 * is a metre on a side, so these are centres and the cubes touch at exactly a
 * metre apart - which is what makes the rank in card two read as one form
 * repeated rather than as a scatter.
 */
export const CAST: Record<Cast, Array<[number, number]>> = {
  nothing: [],
  one: [[0, 0]],
  row: [
    [0, 0],
    [0, -2],
    [0, -4],
    [0, -6],
    [0, -9],
    [0, -13],
  ],
  around: [
    [0, -3],
    [3, 0],
    [0, 3],
    [-3, 0],
  ],
  street: [
    [-2, 0],
    [-2, -3],
    [-2, -6],
    [-2, -10],
    [2, 0],
    [2, -3],
    [2, -6],
    [2, -10],
  ],
};

/** The angle a sweep is at, for a phase running 0 to 1. */
export const sweepAt = ([from, to]: [number, number], phase: number) =>
  from + (to - from) * phase;

/**
 * There and back, smoothly, and never a jerk at either end.
 *
 * A linear ping-pong reverses instantly at the turn, which reads as a bounce
 * off a wall - and this is meant to read as somebody slowly turning their
 * head. A raised cosine is the same trip with the speed going to nothing at
 * both ends, which is what a head does.
 */
export const pingPong = (phase: number) => (1 - Math.cos(phase * Math.PI * 2)) / 2;

export const HALF_TURN = HALF_PI * 2;
