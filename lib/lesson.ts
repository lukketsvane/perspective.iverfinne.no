import type { GuideLevel, PerspectiveMode, SelectionGuide } from '../types';

/**
 * THE LESSON.
 *
 * This tool exists because of a thing draughtsmen do: ruling a sphere on a blank
 * page and then drawing a room full of cubes onto it, freehand, in five point.
 * Everything else here was built to make that reachable. What was missing is
 * the thing a demonstration does not contain: WHY it works.
 *
 * ONE IDEA, THIRTY-TWO CARDS.
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
 * HALF OF IT IS DONE BY THE VIEWER, and that is the second draft's whole
 * change. The first ran as a performance: every card staged itself, swept, and
 * waited to be advanced. It was correct and it was a film, and a film about
 * perspective is a thing you watch agreeing with. You do not learn that the
 * verticals gather by watching them gather. You learn it by looking up
 * yourself, with your own thumb on the glass, and seeing it happen because you
 * did it.
 *
 * So the director stages each card and then, on fifteen of the thirty-two, LETS
 * GO: turn round and find the second point, walk and watch the point refuse to
 * move, walk into a crowd and watch the line hold every head, put a finger on
 * one box and then another and watch the pair jump, look up, open the lens
 * until the corners go. The card waits, and when you have done it a sentence
 * appears that was not there before - the one that says what just happened.
 * That sentence is the point of the card; everything above it is the setup.
 *
 * AND THE SECOND HALF OF THE DECK IS ABOUT BODIES, NOT BOXES. The first
 * twenty-two cards could be taught with cubes because every one of them was
 * about where an edge points. The ones added after are about the two things
 * cubes cannot say: what the horizon does to a crowd of people at a dozen
 * depths and on two different floors, and what happens to all of it the moment
 * something LEANS - a ramp being the only form in the deck whose family is not
 * level and therefore the only one whose pair leaves the eye line. That second
 * one was a hole in the app as well as in the deck: the construction was built
 * from one bearing and an assumed upright, and drew a tilted box a confident,
 * wrong pair on the horizon.
 *
 * AND IT IS SLOW. Every sweep that is still automatic runs about twice as long
 * as it first did, and every move between cards takes nearly two seconds. A
 * transformation you can follow is worth four you can only notice.
 *
 * THE CARDS ARE IN NYNORSK, like the hints', and for the same
 * reason: this is the one place in the app where a human is being told
 * something in words rather than shown a mark.
 */

/**
 * Whether this viewer has been offered the lesson yet.
 *
 * ONE INVITATION, ONCE, AND IT IS NOT A TOUR. There was a guided tour here and
 * it went, because a thing that arrives on your first visit and rings buttons
 * at you is a thing you dismiss before you know what it was. But the lesson is
 * the reason this app exists, and it was two taps down a menu of settings -
 * which for a first-time viewer is the same as not being there.
 *
 * So a first visit gets one line above the dock offering it, and that is all:
 * tap it and the lesson starts, tap the cross and it never appears again, and
 * either way the offer is spent. It covers nothing, it waits for nothing, and
 * it does not come back.
 */
const OFFERED = 'kjg-perspective-lesson';

export const lessonOffered = (): boolean => {
  try {
    return localStorage.getItem(OFFERED) !== null;
  } catch {
    // No storage is not a reason to nag: a browser that cannot remember this
    // would otherwise offer the lesson on every single load.
    return true;
  }
};

/** The offer is spent - taken or waved away, it makes no difference. */
export const markLessonOffered = () => {
  try {
    localStorage.setItem(OFFERED, 'yes');
  } catch {
    /* a full or blocked store is not worth interrupting a drawing for */
  }
};

/**
 * Something standing on the floor while a card is up.
 *
 * IT WAS TWO NUMBERS AND SOMETIMES A THIRD - x, z, and a height for the two
 * eye-level casts - which described every arrangement the first deck needed,
 * because every one of them was metre cubes and posts sitting square on a
 * floor. The cards that came after ask for four things that shape cannot say: a
 * box that is not a cube, a box turned differently from its neighbours, a box
 * that is off the ground, and a box that LEANS. So it is a shape with names on
 * it, and everything unsaid falls back to the metre cube the rest of the lesson
 * is built on.
 */
export interface Stood {
  /** Where it stands on the floor, in metres. */
  at: [number, number];
  /** Its three full sides. A metre cube unless it says otherwise. */
  size?: [number, number, number];
  /** Its own turn about the upright, in radians, on top of the stage's. */
  turn?: number;
  /**
   * How far its underside is off the floor.
   *
   * Only one card asks: the pair that shows a cube and a long box drawn
   * identically, which needs both of them centred exactly on the eye line so
   * that neither shows a top or a bottom face. That is the one place in a room
   * where a form cannot be read, and it has to be stood in to be believed.
   */
  lift?: number;
  /**
   * A lean, in radians, about the world's X axis - so a positive one lifts the
   * far end and the thing becomes a ramp.
   *
   * The one arrangement in the deck whose edges are not level, and therefore
   * the one whose vanishing points do not land on the horizon. Note that a lean
   * and a turn do not compose here: the resting height below is worked out for
   * a lean alone, and the one card that leans anything does not turn it.
   */
  tilt?: number;
}

/** What is standing on the floor while a card is up. */
export type Cast =
  /** Bare ground. */
  | 'nothing'
  /** One metre cube, square to the world, a little way off. */
  | 'one'
  /** A rank of them running away from you: one family of parallels, drawn. */
  | 'row'
  /** A street: two rows facing each other, which is the classical exercise. */
  | 'street'
  /**
   * Four posts, all exactly eye height, scattered from three metres to forty.
   *
   * The whole of the eye-level lesson in one arrangement: the horizon cuts
   * every one of them at the top, and it does it at three metres and at forty
   * alike. Nothing else in this tool makes that as plain, and it is a thing
   * nobody believes until they have seen it happen to something near AND
   * something far in the same frame.
   */
  | 'level'
  /**
   * The everyday heights, standing in the open: a desk, a small child, a car,
   * a door.
   *
   * Real numbers rather than nice ones, because the point of the card is that
   * you already know these and can therefore read them straight off the line.
   */
  | 'heights'
  /**
   * Nothing on the floor at all: the flock cards are carried by figures.
   *
   * A separate name from `nothing` because it is not the same emptiness. The
   * sphere card wants a floor with nothing on it; these want a floor whose
   * whole content arrives from the mesh shelf, and reading `cast: 'nothing'`
   * over a card about a crowd would be reading a lie.
   */
  | 'flock'
  /**
   * A raised platform, for the exception: the horizon is about what a thing
   * stands ON, not about how tall it is.
   */
  | 'stage'
  /** Two boxes of one size, one near and one far: a height read off the line. */
  | 'pair'
  /** A floor of boxes, every one of them turned its own way. */
  | 'turned'
  /** A ramp, and a level slab of the same size beside it to be read against. */
  | 'ramp'
  /** Two equal cubes at one distance, one straight ahead and one out to the side. */
  | 'faces'
  /** A cube and a long box, both centred exactly on the eye line. */
  | 'mistake'
  /** A rank of uprights, evenly spaced: depth measured by repetition. */
  | 'colonnade';

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
  /**
   * Who else is standing on the stage: figures off the mesh shelf, by id.
   *
   * The lesson is cubes on a bare floor on purpose - every card is about
   * where EDGES point, and a scanned aircraft has no straight edge on it. The
   * astronaut is the one exception, and earns it twice over: a body built
   * openly out of spheres and capsules is construction rather than scenery,
   * and a character whose height you have met is a measuring stick in a way
   * no labelled box can be. Loaded on demand and gone with the card; a figure
   * that fails to arrive is a thinner stage, never a broken lesson.
   */
  figures?: Array<{
    who: string;
    at: [number, number];
    turn?: number;
    /**
     * What it is standing on, in metres above the floor.
     *
     * The exception card is built entirely out of this: a figure on a raised
     * platform is cut by the horizon somewhere quite different from its
     * neighbour on the ground, and the difference is exactly the height of the
     * platform. Nothing else in the deck lifts anybody.
     */
    lift?: number;
  }>;
}

/**
 * What the viewer has to do before a card is answered.
 *
 * Deliberately coarse - "turned most of the way round", "walked a few paces",
 * "opened the lens past a hundred and ten" - because a gate that is finicky
 * about HOW is a gate that strands somebody who did the right thing slightly
 * differently. Every one of them is also reachable with a thumb on the glass,
 * which rules out anything living two taps down a menu: the one control this
 * lesson asks for that is not the picture itself is the lens, which is on the
 * dock and says its own name if you hold it.
 */
export type Gate =
  /** Yaw, accumulated, so turning right round counts however you got there. */
  | { kind: 'turn'; radians: number }
  /** Pitch, likewise. */
  | { kind: 'pitch'; radians: number }
  /** Distance travelled on the floor. */
  | { kind: 'walk'; metres: number }
  /** The field opened past a number. */
  | { kind: 'field'; past: number }
  /**
   * How many different things have been taken hold of.
   *
   * The one gate that is a TAP rather than a sweep of the arm, and the one card
   * that needs it could not be built any other way: what it is about is that
   * every box on the floor has its own pair of points, and the only way to see
   * that is to put your finger on one box and then on another and watch the
   * pair jump. A gate counting how far you turned would pass without you having
   * chosen anything.
   *
   * The count includes whatever the card started on, since that is a thing the
   * viewer can see the construction of before they have touched the glass.
   */
  | { kind: 'pick'; boxes: number };

/**
 * A slow change the DIRECTOR makes while the card is up.
 *
 * Only on the cards where the viewer cannot make it themselves - a projection
 * cannot be dragged, and the sheet arriving is the whole content of two of
 * these. Everything else was turned over to the viewer in the second draft.
 */
export interface Sweep {
  seconds: number;
  field?: [number, number];
  yaw?: [number, number];
  pitch?: [number, number];
  /**
   * The eye itself, up and down.
   *
   * The one card that needs it is the one about posture, and it needs it swept
   * rather than stepped: what is being shown is that the horizon is not a
   * place in the world but a height, and a line that JUMPS between two heights
   * is two lines. Sliding, it is plainly the same line following you down.
   */
  height?: [number, number];
  /**
   * The surfaces, stepped rather than swept.
   *
   * A projection cannot be half-changed, so this is a slideshow of three and
   * not a tween between them. It is also the one thing in the lesson that
   * genuinely cannot be shown any other way: the SAME scene, from the SAME
   * spot, caught on a plane, then a cylinder, then a sphere, with nothing else
   * moving. Everything the viewer has been told about four systems is that one
   * animation.
   */
  surfaces?: PerspectiveMode[];
}

/**
 * The five acts, and why a lesson this long needs them.
 *
 * Twenty-two cards in a row is a list, and a list has no shape: at card eleven
 * nobody knows whether they are near the end or a third of the way in, and a
 * viewer who cannot see the shape of a thing cannot tell whether it is going
 * anywhere. Five titles, held for two and a half seconds over the picture,
 * turn it into a piece with movements - and each of them names the one thing
 * its cards are about, so the answer to "why am I being shown this" is on
 * screen before the showing starts.
 *
 * They are also the only full-screen moment in the app, which is what makes
 * them worth the seconds they cost.
 */
export interface Act {
  /** The card this act opens on. */
  at: number;
  /** One or two words, held large over the picture. */
  title: string;
  /** The line under it. One sentence: this is a title card, not a card. */
  line: string;
}

/*
 * The indices are raw positions in CARDS and there is nothing to catch them if
 * they drift: an act whose `at` no longer points at the card it names opens its
 * title over the wrong picture, silently, with no type error and no failing
 * test. Anything inserted into the deck has to move every number below it.
 */
export const ACTS: Act[] = [
  { at: 0, title: 'Kula', line: 'Eit bilete er eit kart over alt du ser' },
  { at: 4, title: 'Auget', line: 'Horisonten er ikkje ein stad. Han er høgda di' },
  { at: 10, title: 'Punkta', line: 'Kvar dei kjem frå, og kvifor dei ikkje rører seg' },
  { at: 18, title: 'Arka', line: 'Same verd, fire flater å fange henne på' },
  { at: 26, title: 'Handa', line: 'Frå rutenettet til blyanten' },
];

export interface Card {
  /** Two or three words. The thing this card is about. */
  headline: string;
  /** What is happening, or what to do. Short: a card nobody finishes is a card. */
  body: string;
  /**
   * Pairs of words, for the one card that is a glossary.
   *
   * THE DECK TEACHES A VOCABULARY IT MADE UP. `arket`, `knippet`, `hovudpunktet`
   * - plain Norwegian for things the trade has Latin and German names for, and
   * they were chosen on purpose, because "the sheet" is a thing anybody can
   * picture and "the picture plane" is a thing you have to be told. The cost is
   * that somebody who finishes this and opens a book does not recognise a word
   * in it. One card pays that off: the same ideas, under the names everybody
   * else uses.
   *
   * Rendered as a list rather than folded into the body, because a paragraph of
   * six equivalences is a paragraph nobody reads twice and a list is a thing you
   * can come back to.
   */
  terms?: Array<[ours: string, theirs: string]>;
  /**
   * The sentence that is not there until you have done it.
   *
   * The reward, and the actual content. A card that says the answer up front
   * is a card you read instead of doing, so the setup asks and this one tells -
   * and it tells you about the thing you have just watched happen under your
   * own hand, which is the only moment it means anything.
   */
  found?: string;
  stage: Partial<Stage>;
  /** Who has the controls once the move into this card is over. */
  hands?: 'director' | 'viewer';
  gate?: Gate;
  /** The dock, for the one task that needs a control that lives on it. */
  chrome?: boolean;
  sweep?: Sweep;
  /** How long the move into this card's stage takes. */
  travel?: number;
}

/**
 * How high the lesson's eye is, in metres.
 *
 * Named because two casts are built out of it: the whole eye-level card is
 * that four posts of exactly this height are cut by the horizon at their tops,
 * and a number typed twice is a number that will one day disagree with itself.
 */
export const EYE_HEIGHT = 1.7;

/** Where every card starts from, so a card only has to say what it changes. */
export const OPENING: Stage = {
  fov: 210,
  mode: 'equidistant',
  guides: 1,
  selectionGuides: 0,
  cameraHeight: EYE_HEIGHT,
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
    body: 'Stå stille. Alt du ser, ser du i ei retning, og retningane til saman er ei kule rundt auget ditt. Eit bilete er eit kart over den kula. Ikkje noko meir.',
    stage: { cast: 'nothing', guides: 2, fov: 260, mode: 'equidistant' },
    sweep: { seconds: 44, yaw: [-0.5, 0.5] },
    travel: 2000,
  },
  {
    /*
     * The first thing the viewer does, and it is deliberately the easiest: one
     * drag, no control to find, and a fact you cannot be told - that the sphere
     * has no edge and you are inside it - arriving because you went and looked.
     */
    headline: 'Snu deg heilt rundt',
    body: 'Dra på biletet og snu deg heile vegen rundt. Sjå etter ein kant på kula.',
    found: 'Det finst ingen. Kula har ingen kant, for ho er ikkje noko du ser PÅ: ho er alle retningane frå deg, og du står i midten av henne.',
    stage: { cast: 'nothing', guides: 2, fov: 260, mode: 'equidistant' },
    hands: 'viewer',
    gate: { kind: 'turn', radians: 5.6 },
    travel: 1400,
  },
  {
    /*
     * THE CARD THE WHOLE MIDDLE OF THE LESSON HANGS OFF, and the one the first
     * draft did not have at all.
     *
     * A sphere of directions is not a picture yet. A picture is a surface with
     * marks on it, so somewhere between the eye and the paper the rays have to
     * be CAUGHT on something - and the something is a choice. Catch them on a
     * flat sheet and you have one, two or three point. Catch them on a
     * cylinder and you have four. Catch them on the sphere itself and you have
     * five.
     *
     * That is the entire relationship between the four systems in this tool,
     * and without it they are four buttons that make the picture look
     * different. It is shown rather than said: the same scene, from the same
     * spot, stepping through the three surfaces with nothing else moving.
     */
    headline: 'Kva fangar du kula på?',
    body: 'Kula er ikkje eit bilete enno. Eit bilete er ei flate med merke på, så kula må leggjast ut på noko flatt. Sjå: same scene, same stad, tre ulike ark etter tur.',
    // The answer lands as the slideshow closes its first full cycle: the dwell
    // for a sweep card is one cycle, and the cycle here is all three sheets.
    found: 'Same verd i alle tre; berre arket skifte. Det flate heldt kvar kant rett og sleit i hjørna. Sylinderen heldt loddlinjene og bøygde resten. Kula bøygde alt, jamt. Å velje ark er å velje kva som får vere rett.',
    stage: { cast: 'street', mode: 'rectilinear', fov: 100, guides: 1, selectionGuides: 0, stand: { x: 0, z: 6, yaw: 0, pitch: 0 } },
    sweep: { seconds: 21, surfaces: ['rectilinear', 'cylindrical', 'equidistant'] },
    travel: 2200,
  },
  {
    /*
     * The two marks every one of those surfaces carries, and the reason they
     * are the first two things anybody rules on a page.
     *
     * The principal point is where you are looking, marked on the surface. It is
     * not in the world: turn as far as you like and it does not move, because
     * it is not a thing you are looking AT.
     *
     * IT USED TO POINT AT THE WRONG MARK, and the card asked the viewer to
     * prove it. "The ring in the middle of the picture is the principal point;
     * turn, and watch what does not move." The ring in the middle of the
     * picture is the panorama's -Z axis point - a vanishing point, fixed to the
     * ROOM - so the one thing it does when you turn is slide off centre, which
     * is precisely what the card told you to look for it not doing. The idea
     * was right and there was nothing on the sheet that was it. So there is a
     * mark now, a cross rather than a ring, and the card names the difference
     * instead of walking past it - see `vanishing.sight`.
     *
     * And the horizon is not the edge of the ground. It is the set of
     * directions level with your eye, which on a flat sheet is a straight line
     * and on the sphere is a great circle - and it sits at your eye height
     * whether the ground is there or not.
     */
    headline: 'Hovudpunktet og horisonten',
    body: 'Krysset midt i biletet er hovudpunktet: der du ser, avmerkt på flata. Ringane er noko anna. Snu deg og sjå etter kva som flyttar seg og kva som ikkje gjer det.',
    found: 'Ringane gleid; krysset stod. Ringane er punkt i verda - dei viser kvar retningane i rommet går, så dei fylgjer rommet. Krysset er ikkje ein ting i verda i det heile: det er retninga DU ser i, avmerkt på arket, og difor kan det ikkje flytte seg. Horisonten er det same slaget merke - alle retningane som ligg vassrett frå deg - og difor fylgjer han auget ditt og ikkje bakken. Dei to er dei fyrste merka nokon rular på ei side.',
    stage: { cast: 'street', mode: 'equidistant', fov: 240, guides: 1, selectionGuides: 0, stand: { x: 0, z: 6, yaw: 0, pitch: 0 } },
    hands: 'viewer',
    gate: { kind: 'turn', radians: 1.9 },
    travel: 2200,
  },
  {
    /*
     * THE MOST USEFUL SENTENCE IN PERSPECTIVE, and one that takes ten seconds
     * to prove and is almost never proved.
     *
     * The horizon sits at your own eye height. So anything in the world that
     * is ALSO that height is cut by it - and cut at exactly the same place,
     * three metres away or forty, because both the thing and the line shrink
     * towards each other at the same rate. It is not a trick and it is not
     * approximate: it is what "the horizon is the set of level directions"
     * means, said in metres.
     *
     * Four posts rather than a row, and scattered left and right at wildly
     * different distances, because a rank invites the answer "well, they are
     * all the same, of course they line up". These are plainly not all the
     * same distance and the line still lands on every top.
     */
    headline: 'Alt i di eiga høgd',
    body: 'Fire stolpar, alle nøyaktig like høge som auget ditt. Den næraste står fem meter unna, den fjernaste over førti. Snu deg og sjå etter kvar horisonten kryssar dei.',
    found: 'Han kryssar alle fire i toppen. Fem meter unna og førti meter unna: same kutt. Horisonten ligg i di eiga høgd, så alt som rekk deg til auga, endar nøyaktig på han - kor langt unna det enn står.',
    stage: {
      cast: 'level',
      mode: 'rectilinear',
      fov: 85,
      guides: 1,
      selectionGuides: 0,
      cameraHeight: EYE_HEIGHT,
      stand: { x: 0, z: 2, yaw: 0, pitch: 0 },
    },
    hands: 'viewer',
    gate: { kind: 'turn', radians: 0.9 },
    travel: 2200,
  },
  {
    /*
     * ...and the same fact turned into a ruler.
     *
     * Once the line is a known height, everything else can be read against it:
     * a desk comes to your thigh, a car to your chest, a door goes over your
     * head. Those are heights an illustrator already knows in their body, and
     * the line is where that knowledge gets onto the paper. This is the card
     * that makes the tool's metres worth something - a scene is right when the
     * sizes are right, and the sizes are right when they are read off the
     * horizon rather than guessed.
     *
     * AND THE HARE IS THE ONE THAT IS EXACTLY THE LINE. She is 1.70 to the
     * crown and the eye is at 1.70, so the horizon lands on the top of her head
     * - not through her face, which is where it would cut a taller figure, and
     * not over her, which is where it goes on everything else in the frame.
     * The card before this proved that with four posts nobody has met; this one
     * says it with the body standing in the doorway when the tool opened, and
     * two cards later a whole flock of her is walked into on the strength of
     * it.
     */
    headline: 'Linja er ein målestokk',
    body: 'Ein pult på 75, ein bil på 150, ei dør på 210 - og haren, som er 170 til issa. Sjå kvar linja går på kvar av dei.',
    found: 'Over pulten, over bilen, og gjennom døra eit stykke under karmen - og tvers i issa på haren, som er nøyaktig så høg som auget ditt sit. Kroppen din kan desse høgdene alt: pulten til låret, bilen til brystet, døra over hovudet. Set linja der auget er, og kvar storleik er ei avlesing, ikkje ei gjetting.',
    stage: {
      cast: 'heights',
      mode: 'rectilinear',
      fov: 85,
      guides: 1,
      selectionGuides: 0,
      cameraHeight: EYE_HEIGHT,
      stand: { x: 0, z: 3, yaw: 0, pitch: 0 },
      figures: [{ who: 'hare-standing-2', at: [-0.6, -6] }],
    },
    travel: 2000,
  },
  {
    /*
     * The last of the three, and the one that stops the line being a fixture.
     *
     * A viewer who has met the horizon as "the line in the middle of the page"
     * will put it in the middle of every page they ever draw. It is not a place
     * in the world: sit down and it comes down with you, stand on a chair and
     * it goes up. The cast does not move at all while it happens, which is what
     * makes it unarguable.
     *
     * And it carries the third of the three rules on its back, because you
     * cannot watch this without watching it happen: a top face closes up as it
     * rises towards the line and a bottom face closes up as it falls to it,
     * until at the line itself there is no face left and the thing is an edge.
     */
    headline: 'Auget flyttar seg med deg',
    body: 'Ingenting på golvet rører seg no. Berre du - ned på huk, og opp igjen.',
    found: 'Linja fylgde deg. Ho er ikkje ein stad i verda; ho er høgda di, og difor er ho det fyrste merket på eit ark: å setje henne er å velje kvar den som ser, står - og å finne henne i ei framand teikning er å finne att auget som såg. Og sjå toppflatene på vegen: dei lukkar seg di nærare linja dei kjem, og RETT på henne er dei borte. Ei flate du ser oppå, ligg under auget ditt.',
    stage: {
      cast: 'heights',
      mode: 'rectilinear',
      fov: 85,
      guides: 1,
      selectionGuides: 0,
      cameraHeight: EYE_HEIGHT,
      stand: { x: 0, z: 3, yaw: 0, pitch: 0 },
      // The same scene as the card before, so the same company: a figure that
      // vanished between two cards of one act would read as a broken prop.
      figures: [{ who: 'hare-standing-2', at: [-0.6, -6] }],
    },
    hands: 'director',
    sweep: { seconds: 9, height: [0.55, 2.6] },
    travel: 1800,
  },
  {
    /*
     * THE SAME FACT, SAID WITH BODIES - and the reason the hare is on the shelf.
     *
     * The posts card proves the rule and the ruler card puts numbers on it, and
     * between them they have made a claim about METRES. This one makes it about
     * people, which is the form an illustrator actually uses it in: a crowd at
     * a dozen depths, every one of them cut by the line at the same place, so
     * that placing the twentieth figure in a drawing is a reading rather than a
     * guess.
     *
     * IT IS WALKED, not watched. Told, "distance makes no difference to where
     * the line crosses them" sounds like a thing about the picture being
     * cleverly arranged. Walked - with the near ones sweeping past your
     * shoulder and the far ones barely growing - it is unarguable, and it is
     * the same gesture that made the vanishing point card the best one in the
     * deck.
     *
     * Eight figures out of five files, because a flock built from one mesh is
     * not a flock: the eye reads the repetition and stops reading the rule.
     */
    headline: 'Heile flokken på ein gong',
    body: 'Ein flokk, alle 170 høge, frå fem meter unna til nesten tretti. Gå: hald tommelen på venstre sida av biletet, ovanfor desse orda, og dra. Hald auga på kvar linja kryssar dei.',
    found: 'Ho skjer dei i issa, kvar einaste ein, og ho slapp ikkje taket medan du gjekk. Den næraste og den fjernaste er kutta i nøyaktig same høgd på kroppen, for linja ligg i DI høgd og dei er den høgda - avstand kjem ikkje inn i det. Set deg på huk, og ho fell til livet på heile flokken på ein gong. Det er slik ein flokk vert teikna: linja fyrst, så føtene, og hovuda fylgjer av seg sjølve.',
    stage: {
      cast: 'flock',
      mode: 'rectilinear',
      fov: 92,
      guides: 1,
      selectionGuides: 0,
      cameraHeight: EYE_HEIGHT,
      stand: { x: 0, z: 2, yaw: 0, pitch: 0 },
      figures: [
        { who: 'hare-standing-2', at: [-1.0, -3.4], turn: 0.25 },
        { who: 'hare-standing-4', at: [1.6, -5.2], turn: -0.4 },
        { who: 'hare-standing-1', at: [-2.4, -7.8], turn: 0.1 },
        { who: 'hare-standing-5', at: [0.8, -10.5], turn: 0.5 },
        { who: 'hare-standing-3', at: [3.4, -13.0], turn: -0.2 },
        { who: 'hare-standing-2', at: [-4.2, -16.0], turn: 0.6 },
        { who: 'hare-standing-4', at: [1.6, -21.0], turn: -0.1 },
        { who: 'hare-standing-1', at: [-2.2, -27.0], turn: 0.3 },
      ],
    },
    hands: 'viewer',
    gate: { kind: 'walk', metres: 4 },
    travel: 2400,
  },
  {
    /*
     * THE EXCEPTION, and it is the half of the rule that gets left out.
     *
     * "The horizon cuts everything your own height" is true and incomplete, and
     * the missing clause is what wrecks drawings: it cuts everything your own
     * height STANDING ON THE SAME FLOOR AS YOU. A figure on a step, a kerb, a
     * stage or a first-floor balcony is not exempt from the rule, it is
     * obeying it from a different floor - and the line falls on them exactly
     * the height of the step lower.
     *
     * The card is the last one in the deck a beginner can get away with not
     * having, because the moment a drawing has a single step in it the naive
     * version of the rule starts producing figures that float.
     */
    headline: 'Dei som står høgare',
    body: 'Same flokken. Tre av dei har gått opp på ei opphøgd flate. Sjå kvar linja tek dei no - og kvar ho framleis tek dei andre.',
    found: 'I knea. Flata er 1,2 meter høg, og linja fell nøyaktig 1,2 meter lenger ned på kroppane deira - ikkje eit hår meir. Regelen har ikkje brote saman; han handlar berre ikkje om folk. Han handlar om GOLV: horisonten kryssar alt som er i di høgd rekna frå det same golvet du står på. Kvar gong du teiknar eit trappetrinn, ein fortauskant eller ein scenekant, deler du biletet i to slike golv, og figurane på kvar av dei skal lesast mot linja kvar for seg.',
    stage: {
      cast: 'stage',
      mode: 'rectilinear',
      fov: 92,
      guides: 1,
      selectionGuides: 0,
      cameraHeight: EYE_HEIGHT,
      stand: { x: 0, z: 2, yaw: 0.14, pitch: 0 },
      figures: [
        { who: 'hare-standing-2', at: [-1.0, -3.4], turn: 0.25 },
        { who: 'hare-standing-1', at: [-2.4, -7.8], turn: 0.1 },
        { who: 'hare-standing-4', at: [1.6, -21.0], turn: -0.1 },
        // The three on the platform, standing on its top at 1.2.
        { who: 'hare-standing-5', at: [1.4, -8.2], turn: 0.6, lift: 1.2 },
        { who: 'hare-standing-3', at: [3.5, -9.6], turn: -0.3, lift: 1.2 },
        { who: 'hare-standing-2', at: [2.6, -10.4], turn: 0.2, lift: 1.2 },
      ],
    },
    travel: 2000,
  },
  {
    /*
     * AND THE RULE RUN BACKWARDS, which is the version you actually draw with.
     *
     * Forwards it answers "where does the line cross this?" and is a check.
     * Backwards it answers "how tall do I draw this, here?" and is a
     * construction: the fraction of a thing's height that the horizon cuts is
     * the SAME wherever the thing stands, so one measurement taken once gives
     * every copy of it at every depth on the page. That is the whole of
     * measuring by the horizon, and it is two boxes and one ratio.
     *
     * Two and a half metres rather than one, because a metre cube sits wholly
     * under the eye line and there is no crossing to read. At 2.4 the line
     * lands at 1.70/2.40 on both of them, near one and far one, which is a
     * fraction somebody can see is the same without being told a number.
     */
    headline: 'Storleik ut av staden',
    body: 'To like kassar, begge 2,4 meter høge: ei fem meter unna, ei atten. Sjå kvar horisonten skjer kvar av dei.',
    found: 'Same brøkdelen av høgda på begge - sju tiandedelar oppe. Det er linja brukt baklengs. Du veit kvar føtene står, du veit kvar linja går, og forholdet mellom dei to ER høgda: mål frå golvet opp til linja, del på den same brøken, og du har toppen. Difor kan du setje ei kasse på 2,4 kvar som helst på arket og vite nøyaktig kor høg ho skal teiknast - utan å gjette, og utan å måle noko i verda.',
    stage: {
      cast: 'pair',
      mode: 'rectilinear',
      fov: 88,
      guides: 1,
      selectionGuides: 0,
      cameraHeight: EYE_HEIGHT,
      stand: { x: 0, z: 2, yaw: 0, pitch: 0 },
      turn: 0.3,
    },
    travel: 2000,
  },
  {
    /*
     * Why a vanishing point exists at all, said as a limit rather than as a
     * rule. Most tutorials assert that parallels meet; the reason is one
     * sentence long, and it is the reason the point does not depend on where
     * the lines are - which is the next card, and the best one in the lesson.
     */
    headline: 'Parallelle linjer møtest',
    body: 'Ei rekkje kassar, alle med same retning. Fylg ein kant utover: di lenger ut du ser, di meir ser du LANGS han og di mindre PÅ han. Til slutt ser du reint langs - det er punktet.',
    stage: { cast: 'row', mode: 'rectilinear', fov: 70, selectionGuides: 1, stand: { x: 0, z: 5, yaw: 0, pitch: 0 } },
    travel: 2200,
  },
  {
    /*
     * THE BEST CARD IN THE LESSON, and one almost nobody is taught.
     *
     * A vanishing point belongs to a DIRECTION, not to a set of lines and not
     * to a place. Walk, and every cube in the rank slides across the page while
     * the point they aim at does not move at all. That is not a curiosity: it
     * is the whole reason a vanishing point is a usable tool, because it means
     * the six points of a scene are fixed by which way you are FACING and
     * nothing else - so you can rule them once and draw the whole page to them.
     *
     * It has to be walked rather than watched. Told, it is a sentence that
     * sounds obvious and is not believed; done, it is startling.
     */
    headline: 'Punktet flyttar seg ikkje',
    // Not 'the lower-left corner': on a phone the corner itself is this very
    // card's tap-to-advance block, and a thumb aimed there walks nothing.
    // The stick zone is the whole lower-left QUARTER of the picture, and the
    // words now point at the part of it that is picture.
    body: 'Gå: hald tommelen på venstre sida av biletet, ovanfor desse orda, og dra. Hald auga på punktet medan kassane glid forbi.',
    found: 'Kassane flytta seg. Punktet stod stille. Det høyrer til RETNINGA, ikkje til kassane og ikkje til staden du står på - difor kan du rule punkta éin gong og teikne heile sida mot dei.',
    stage: { cast: 'row', mode: 'rectilinear', fov: 80, selectionGuides: 1, stand: { x: 1.6, z: 6, yaw: -0.12, pitch: 0 } },
    hands: 'viewer',
    gate: { kind: 'walk', metres: 3.5 },
    travel: 2000,
  },
  {
    /*
     * The one drawing-quality rule in the deck, straight out of the book this
     * tool grew from: depth compresses. Equal metre steps in the world render
     * as shrinking steps on the sheet, and the face nearest the point is a
     * sliver - which beginners reliably draw several times too deep, because
     * the hand wants the world's intervals rather than the picture's. The rank
     * of metre-spaced cubes has been on stage twice already; this card finally
     * points at the GAPS instead of the edges. No gate: the whole task is
     * looking, so the answer arrives on the reading clock.
     */
    headline: 'Djupna kryp saman',
    body: 'Same rekkje, nærare. Kvar kasse står nøyaktig ein meter frå den neste. Sjå på stega mellom dei - kva gjer dei på vegen inn mot punktet?',
    found: 'Dei kryp saman. Like steg i verda vert krympande steg på arket, og flata nærast punktet vert ei smal strimle - å teikne henne for djup er eit av dei vanlegaste feilgrepa i faget. Lit difor på det som gjentek seg: vindauge, master, heller. Alt som står jamt i verda, målar djupna for deg på arket.',
    stage: { cast: 'row', mode: 'rectilinear', fov: 80, selectionGuides: 1, stand: { x: 0.9, z: 3.0, yaw: -0.17, pitch: -0.08 } },
    travel: 2000,
  },
  {
    /*
     * The correction that makes the rest of the lesson possible. A flat sheet
     * shows one point per family and hides the other, which is why every
     * beginner learns "one family, one point" and is then baffled by the
     * curvilinear systems, where both are on the page at once.
     */
    headline: 'Kvart knippe har to punkt',
    body: 'Same rekkje, men på det bøygde arket. Snu deg heilt rundt og finn det andre punktet.',
    found: 'Der er det. Ei retning stikk gjennom kula to stader, så eit knippe parallelle kantar har TO punkt: eitt framover, eitt bakover. Det flate arket kan berre vise deg det eine av dei.',
    stage: { cast: 'row', mode: 'equidistant', fov: 300, guides: 1, selectionGuides: 1, stand: { x: 0, z: 5, yaw: 0, pitch: 0 } },
    hands: 'viewer',
    gate: { kind: 'turn', radians: 3.4 },
    travel: 2400,
  },
  {
    headline: 'Eitt punkt',
    body: 'Tilbake til det flate arket, med ei kasse rett på. To av dei tre knippa ligg parallelt med arket og held seg parallelle på papiret òg; berre det tredje går innover. Eitt punkt - og det ligg midt i biletet, for du ser rett langs retninga.',
    stage: { cast: 'one', mode: 'rectilinear', fov: 55, turn: 0, selectionGuides: 1, stand: { x: 0, z: 4.5, yaw: 0, pitch: 0 } },
    travel: 2400,
  },
  {
    /*
     * The second big idea, and the viewer does it: the number in the name is a
     * fact about the PICTURE, not about the box.
     *
     * Turning your head is enough. The sheet is perpendicular to where you are
     * looking, so the moment you turn, the cube's faces stop being parallel to
     * it and the second family gets a point. Nothing was touched, nothing was
     * rotated, and one point became two.
     */
    headline: 'To punkt',
    body: 'Ikkje rør kassa. Snu deg litt til sides og sjå kva som skjer med kantane som gjekk rett på.',
    found: 'To punkt no, eitt til kvar side - og ingenting i verda har endra seg. Arket står vinkelrett på blikket ditt, så då du snudde deg, slutta kantane å liggje parallelt med det. «Eitt punkt» og «to punkt» er ikkje to slag kassar. Det er same kassa, sett frå to stader.',
    stage: { cast: 'one', mode: 'rectilinear', fov: 65, turn: 0, selectionGuides: 1, stand: { x: 0, z: 4.5, yaw: 0, pitch: 0 } },
    hands: 'viewer',
    gate: { kind: 'turn', radians: 0.45 },
    travel: 1600,
  },
  {
    headline: 'Tre punkt',
    body: 'Same kasse igjen. Dra oppover og sjå opp på henne.',
    found: 'No ligg ikkje loddlinjene parallelt med arket heller, så dei samlar seg òg, i eit punkt over deg. Tre knippe, tre punkt, same kasse, same stad. Du løfta berre blikket.',
    stage: { cast: 'one', mode: 'rectilinear', fov: 88, turn: Math.PI / 5, selectionGuides: 1, stand: { x: 0, z: 3.4, yaw: 0, pitch: 0 } },
    hands: 'viewer',
    gate: { kind: 'pitch', radians: 0.45 },
    travel: 1800,
  },
  {
    /*
     * THE CARD THAT SHOWS WHAT THE NEXT ONE ONLY SAYS.
     *
     * "One, two and three point are a fact about you and not about the box" is
     * the deck's second big idea, and until now it has been argued with a
     * single cube: turn your head and it gains a point. That proves the claim
     * about the SHEET and leaves the other half untouched - that each thing in
     * a scene has its own pair, all of them on the one line, and a scene is
     * therefore never "in two-point" at all.
     *
     * A floor of boxes turned every which way says it in one picture, and the
     * viewer says it themselves by choosing: put a finger on one box, then on
     * another, and the pair leaps along the horizon while every box on the
     * floor stands perfectly still. Nothing moved. The construction did.
     *
     * The first box is left square to the world, so the first pair the card
     * shows is the scene's own - the one the last four cards have been ruling
     * to - and every other choice is visibly a departure from something rather
     * than one of seven equal strangers.
     */
    headline: 'Kvar kasse sitt eige par',
    body: 'Eit golv med kassar snudde kvar sin veg. Trykk på ei av dei, så på ei anna, og fylg punkta medan du byter.',
    found: 'Punkta hoppa; kassane rørte seg ikkje. Kvar einaste ting i ei scene har sitt eige par, og alle para ligg på den same linja - for kvar vassrett retning i verda eig sine to punkt på horisonten, og å snu ei kasse er berre å skyve paret hennar langs han. Det finst ikkje ei scene som er «i topunkts». Det finst ein ståstad, og så mange par som det er retningar i det du teiknar.',
    stage: {
      cast: 'turned',
      mode: 'rectilinear',
      fov: 95,
      guides: 1,
      selectionGuides: 1,
      stand: { x: 0, z: 0.4, yaw: 0, pitch: 0 },
    },
    hands: 'viewer',
    gate: { kind: 'pick', boxes: 3 },
    travel: 2200,
  },
  {
    /*
     * The card that collects the three before it. No stage change worth
     * mentioning and nothing to do: a page of the lesson that is a place to
     * stop and be told what just happened, which a lesson made only of
     * exercises never gives anybody.
     */
    headline: 'Ingenting av dette er kassa',
    body: 'Eitt, to og tre punkt er ikkje tre slag kassar, og ikkje tre system. Talet seier berre kor mange av dei tre knippa som ikkje ligg parallelt med arket ditt - og det er ei opplysning om DEG, kvar du står og kvar du ser, ikkje om det du teiknar. Snu kassa i staden, og punkta hennar glid berre langs horisonten: kvar vassrett retning i verda eig sitt eige par på den linja.',
    stage: { cast: 'one', mode: 'rectilinear', fov: 88, turn: Math.PI / 5, selectionGuides: 1, stand: { x: 0, z: 3.4, yaw: 0.5, pitch: 0.4 } },
    travel: 2200,
  },
  {
    /*
     * THE HOLE IN EVERYTHING SO FAR, and it is a hole this tool had too.
     *
     * Every arrangement in the deck up to here sits square on a floor, so every
     * family in it is level, so every pair it has drawn has landed on the
     * horizon - and after twenty cards of that, a viewer has quietly learned a
     * rule nobody stated and which is false: that vanishing points live on the
     * eye line. They do not. They live wherever their family points. A family
     * that CLIMBS has its pair as far above and below the line as it climbs,
     * and the moment a drawing contains a roof, a staircase, a lid, a ladder or
     * a hill, that is the fact it needs.
     *
     * The app could not draw this until the card was written. The selection's
     * construction was built from one bearing and an assumed upright, which is
     * exact for everything that stands on a floor and quietly false for
     * anything that leans - it drew two confident rays to two points sitting
     * neatly on the line, and they were the points of a box that was not there.
     * See `VanishingBox.rotation` in lib/vanishing.ts.
     *
     * The flat slab beside the ramp is the control, and it is the same box: same
     * sides, same turn, laid down. Its pair is on the line. Theirs is the only
     * difference between the two constructions, and it is worth more than any
     * sentence.
     */
    headline: 'Rampa har sine eigne',
    body: 'Ei rampe, og ei flat helle av same storleik ved sida av. Kantane oppover rampa er eit knippe som alle andre - men dei ligg ikkje vassrett. Snu deg heilt rundt og finn dei to punkta deira.',
    found: 'Over og under horisonten, akkurat så mykje som rampa stig. Hella ved sida har paret sitt på linja, slik alt anna du har sett har hatt det - og det var aldri ein regel om punkt. Det var ein regel om GOLV. Eit knippe har paret sitt på horisonten viss og berre viss det ligg vassrett; alt som skrår, har sitt eige par over og under han. Tak, trapper, stigar, bakkar, opne lokk: kvar av dei tek med seg to punkt til inn i teikninga di.',
    stage: {
      cast: 'ramp',
      mode: 'equidistant',
      fov: 300,
      guides: 1,
      selectionGuides: 1,
      stand: { x: 2.3, z: -0.6, yaw: -0.34, pitch: 0.02 },
    },
    hands: 'viewer',
    gate: { kind: 'turn', radians: 2.2 },
    travel: 2600,
  },
  {
    /*
     * The last thing the points have to say, and the one that is about the
     * PICTURE rather than about the room.
     *
     * A face closes as it approaches the point its own edges run to. That is
     * the same sentence as the one the posture card slipped in about top faces
     * closing towards the horizon, said sideways - but the posture card could
     * be read as a fact about height, and this one cannot be read as a fact
     * about distance, because the two cubes are at exactly the same distance
     * and the only thing that differs is where each lands on the sheet.
     *
     * Which is what makes it a composition card as much as a construction one:
     * a form parked on its own vanishing point has no side to draw, and moving
     * it two metres sideways in the world gives it one.
     */
    headline: 'Sideflata krympar',
    body: 'To like kassar, nøyaktig like langt unna. Den eine ligg rett på punktet sitt; den andre langt frå det. Sjå på sideflatene.',
    found: 'Den som ligg på punktet, viser nesten inga side - berre ei rein framside. Den andre viser ei brei ei. Dei står like langt unna, så avstand er ikkje det som gjer det: ei flate lukkar seg etter kor nær punktet SITT ho ligg på arket, og er heilt borte når ho når det. Same regelen som toppflatene fylgde inn mot horisonten, lagt på sida. Difor får ein ting du plasserer midt på punktet ditt inga form, og difor flyttar teiknarar ting til sides.',
    stage: {
      cast: 'faces',
      mode: 'equidistant',
      fov: 210,
      guides: 1,
      selectionGuides: 1,
      stand: { x: 0, z: 0, yaw: -0.25, pitch: 0 },
    },
    travel: 2200,
  },
  {
    /*
     * Where the flat sheet is shown to fail rather than asserted to - and by
     * the viewer's own hand, on the one control in this lesson that is not the
     * picture itself. The dock comes back for this card and goes away again
     * afterwards.
     */
    headline: 'Det flate arket tek slutt',
    body: 'Verktøylinja er tilbake. Dra i kjegla nede og opne linsa så langt ho går.',
    found: 'Sjå hjørna. Ei rett linje held seg rett på dette arket, og det er heile verdien av det. Prisen: avstanden frå midten veks som TANGENTEN til vinkelen, og tangenten spring frå deg - ved 180 grader er han uendeleg. Ingen linjal fiksar strekken i hjørna; han er arket sitt, ikkje handa di. Difor finst dei tre andre arka.',
    stage: { cast: 'street', mode: 'rectilinear', fov: 55, guides: 1, selectionGuides: 0, stand: { x: 0, z: 6, yaw: 0, pitch: 0 } },
    hands: 'viewer',
    chrome: true,
    /*
     * A hundred and five, not the ceiling.
     *
     * The card says to open it as far as it goes and the ceiling is 130 - but
     * the corners have plainly gone by a hundred, and a gate set at the very
     * end of a drag is a gate that fails somebody whose thumb stopped a
     * millimetre short of a thing they had already seen.
     */
    gate: { kind: 'field', past: 105 },
    travel: 2200,
  },
  {
    headline: 'Fire punkt',
    body: 'Same scene, fanga på sylinderen. Han held loddlinjene rette og lèt dei vassrette bue - og no går horisonten heile vegen rundt, så begge punkta til eit knippe står på arket samstundes.',
    stage: { cast: 'street', mode: 'cylindrical', fov: 300, guides: 1, stand: { x: 0, z: 6, yaw: 0, pitch: 0 } },
    sweep: { seconds: 40, yaw: [0, Math.PI] },
    // The two arrivals are the crescendo of the whole lesson, and a crescendo
    // taken at the same pace as a scene change is not one.
    travel: 3400,
  },
  {
    /*
     * The arrival. Both axes bent, the whole sphere on a disc, and the zenith
     * and nadir on the page - which is exactly the sheet the videos this tool
     * came from are drawn on.
     */
    headline: 'Fem punkt',
    body: 'Og til slutt: fanga på kula sjølv. Alle retningar ligg på arket - fire punkt rundt horisonten, eitt rett opp, eitt rett ned - og avstanden frå midten er vinkelen sjølv, jamt heile vegen. Dette er arket ein rular når alt ikring deg skal med.',
    stage: { cast: 'street', mode: 'equidistant', fov: 360, guides: 2, stand: { x: 0, z: 6, yaw: 0, pitch: 0 } },
    travel: 4200,
  },
  {
    /*
     * Count them. The whole lesson in one frame, and the viewer turns to do the
     * counting rather than being handed the total.
     */
    headline: 'Ei kasse har seks',
    body: 'Éi kasse, heile kula. Snu deg sakte rundt og tel dei ringa punkta.',
    found: 'Seks: fire rundt horisonten, eitt rett opp, eitt rett ned. Tre knippe, to punkt kvar. På det flate arket såg du eitt, to eller tre av dei, og resten låg bak deg. Dei har vore der heile tida.',
    stage: { cast: 'one', mode: 'equidistant', fov: 360, guides: 1, selectionGuides: 1, turn: Math.PI / 5, stand: { x: 0, z: 3.4, yaw: 0, pitch: 0 } },
    hands: 'viewer',
    gate: { kind: 'turn', radians: 2.2 },
    travel: 2400,
  },
  {
    /*
     * THE BILL FOR THE PLAIN WORDS, and it comes due here.
     *
     * Every name in this deck was chosen to be picturable rather than correct.
     * A sheet, a bundle, a point, a line: a viewer who has never opened a
     * perspective book can hold all four in their head on the first card, which
     * is worth a great deal and costs exactly one thing - that the same viewer,
     * opening a book afterwards, does not recognise a single word in it and
     * concludes the book is about something else.
     *
     * So the ideas get their other names once, together, at the point where all
     * of them have been met and none of them is new. It is deliberately the
     * flattest card in the deck: no gesture, no sweep, the last picture still
     * standing behind it. A page of words in a deck that is otherwise a
     * performance, and it is short enough to be read twice.
     */
    headline: 'Namna dei andre brukar',
    body: 'Same sakene, andre ord. Slik står dei i bøkene:',
    terms: [
      ['Arket', 'Biletplanet'],
      ['Knippet', 'Parallellknippe'],
      ['Punktet', 'Forsvinningspunkt'],
      ['Hovudpunktet', 'Sentralpunktet, augepunktet'],
      ['Linja', 'Horisontlinja'],
      ['Talet på punkt', 'Sentral-, to- og trepunktsperspektiv'],
    ],
    found: 'Orda her er valde fordi du kan sjå dei for deg; orda der er valde fordi dei er presise. Begge duger, og no kan du lese begge. Berre eitt av dei er verdt å krangle om: «trepunktsperspektiv» ser ut som eit system og er det ikkje. Det er talet på knippe som ikkje låg parallelt med arket ditt, og det er ei opplysning om kvar du stod.',
    stage: { cast: 'one', mode: 'equidistant', fov: 300, guides: 1, selectionGuides: 1, turn: Math.PI / 5, stand: { x: 0, z: 3.6, yaw: 0.2, pitch: 0.08 } },
    travel: 1800,
  },
  {
    /*
     * The ruled sheet, and what it is FOR. Fifteen degrees is the spacing the
     * shader draws at and the spacing in the videos: close enough to sight an
     * angle against, open enough to draw between.
     */
    headline: 'Rul arket fyrst',
    body: 'Meridianane står femten grader frå kvarandre og møtest i dei same seks punkta. Det er dette rutenettet du siktar mot: kvar oppreist kant i verda fylgjer ei av kurvene, og kvar vassrett kant kryssar dei jamt.',
    stage: { cast: 'street', mode: 'equidistant', fov: 360, guides: 2, selectionGuides: 0, stand: { x: 0, z: 6, yaw: 0, pitch: 0 } },
    sweep: { seconds: 48, pitch: [-0.35, 0.35] },
    travel: 2200,
  },
  {
    /*
     * The last exercise before the pencil: sight along the ruling and watch a
     * real edge stay on a real meridian all the way round. This is the actual
     * skill - everything before it was why the skill works.
     */
    headline: 'Sikt langs kurvene',
    body: 'Snu deg og sjå deg omkring. Vel éin oppreist kant på ei kasse og fylg han medan du snur.',
    found: 'Han slepp aldri kurva si. Det er dette som gjer fem punkt teiknbart på fri hand: ingenting skal reknast ut, du skal berre vite kva for ei kurve kanten høyrer til.',
    stage: { cast: 'street', mode: 'equidistant', fov: 340, guides: 2, selectionGuides: 0, stand: { x: 0, z: 5, yaw: 0, pitch: 0.1 } },
    hands: 'viewer',
    gate: { kind: 'turn', radians: 2.6 },
    travel: 2200,
  },
  /*
   * TWO CARDS BACK ON THE FLAT SHEET, and the excursion is deliberate.
   *
   * The act has just been ruled on the sphere and will be handed over on it,
   * and these two step off it for a moment because both are flat-sheet
   * problems: a form parked exactly on the eye line draws as a rectangle, and a
   * subject shoved away from the principal point pays the tangent's price at
   * the corner. Neither is a curiosity of the curved sheets - they are the two
   * ways an otherwise correct flat drawing goes wrong - and they belong where
   * the pencil is about to be handed over rather than filed with the sheets.
   */
  {
    /*
     * THE ONE PLACE IN A ROOM WHERE A FORM CANNOT BE READ.
     *
     * A cube whose middle sits exactly on the eye line, seen very nearly square
     * on, shows no top face (there is none at the line), no bottom face (same),
     * and no side worth the name (it is sitting on its own point). What is left
     * is a rectangle - and a box two and a half times as deep, in the same
     * place, is the SAME rectangle. The information is not in the picture, and
     * no amount of care with the pencil puts it there.
     *
     * The deck's one wrong-and-right pair, and both halves are on stage at
     * once rather than swapped by a control. A drawing book prints the mistake
     * beside the correct version because a comparison you make with your eyes
     * in one glance is worth more than one you make from memory across a
     * toggle - and because the alternative here is a button, and this deck's
     * whole argument is that there are no buttons.
     */
    headline: 'Kubus eller langkasse?',
    body: 'To former, begge med midten nøyaktig på augehøgda og begge rett på. Éi av dei er ein kubus. Sjå bort frå skuggane, snu deg til sides, og finn ut kva for ei.',
    found: 'Rett framanfrå teikna dei seg som det same rektangelet, og det var ikkje handa di det stod på. Ein kubus midt på linja har inga toppflate - på linja finst det inga - inga botnflate av same grunn, og inga sideflate, fordi han ligg på punktet sitt. Att står eit reint rektangel, og ei kasse to og ein halv gong så djup teiknar seg som nøyaktig det same rektangelet. Opplysninga finst ikkje i teikninga. Det einaste som røpte det, var skuggen på golvet - og ei rein blyantteikning har ingen skugge å lene seg på. Difor: legg aldri hovudmotivet ditt midt på augehøgda og rett på. Eit hakk til sides eller eit hakk opp, og forma er lesbar att.',
    stage: {
      cast: 'mistake',
      mode: 'rectilinear',
      fov: 72,
      guides: 1,
      selectionGuides: 0,
      stand: { x: 0, z: 0, yaw: 0, pitch: 0 },
    },
    hands: 'viewer',
    gate: { kind: 'turn', radians: 0.7 },
    travel: 2400,
  },
  {
    /*
     * WHERE THE CROSS GOES, which is the one composition decision this whole
     * apparatus hands you and the one the deck has never mentioned.
     *
     * The flat sheet's price was established fifteen cards ago: distance from
     * the middle grows as the tangent, and the tangent runs away. What was left
     * unsaid is that the middle is not fixed by the world - it is where the
     * person holding the pencil decided to look. Centre the subject on it and
     * the stretch is shared out evenly and nothing in the frame is strained.
     * Push the subject to one side and the far corner pays for all of it.
     *
     * Neither is wrong. That is the point of putting it here, in the hand's
     * act, rather than back among the sheets: it is a choice with two known
     * outcomes, which is what a composition decision is.
     */
    headline: 'Kvar krysset står',
    body: 'Det flate arket att, og krysset midt i biletet er hovudpunktet. Snu deg sakte, så gata glir ut til sida av det, og hald auge med hjørna.',
    found: 'Med krysset midt i motivet ligg strekket jamt fordelt og ingen kant er verre enn ein annan. Skyv motivet ut til sida, og hjørnet lengst frå krysset dreg seg - same prisen som før, for avstanden frå midten veks som tangenten. Skilnaden er at det er DU som vel kor mykje av han biletet skal betale, og kvar. Midt i: ro, symmetri, og eit motiv som ser ut som det står stille. Ute til sida: spenning, og eit hjørne du må halde auge med heile vegen.',
    stage: {
      cast: 'street',
      mode: 'rectilinear',
      fov: 108,
      guides: 1,
      selectionGuides: 0,
      stand: { x: 0, z: 6, yaw: 0, pitch: 0 },
    },
    hands: 'viewer',
    gate: { kind: 'turn', radians: 0.8 },
    travel: 2400,
  },
  {
    /*
     * THE BRIDGE FROM THE RULING TO A DRAWING, and the last thing said before
     * the pencil.
     *
     * Everything in the deck so far has been about getting ONE form right. What
     * makes a picture deep is not one form: it is the same form, repeated at a
     * known interval, because a repeated interval is a ruler that is part of the
     * subject. You know the posts are equally spaced in the world, so how fast
     * they close up on the page IS the depth, and any error in it is visible
     * without measuring anything.
     *
     * It is also the sentence that explains why the practice field on the shelf
     * is a PAGE of cubes rather than a cube: one cube drawn well is a lucky
     * guess and twenty drawn to the same six points is a construction.
     */
    headline: 'Det same, om att',
    body: 'Ei rekkje like stolpar, jamt sette, på det rula arket - og ein flokk mellom dei. Ingenting nytt i konstruksjonen. Berre den same forma om og om att.',
    found: 'Dette er korleis djupn faktisk vert teikna. Eitt einsleg motiv gjev deg ingenting å måle med; ei rekkje av det same gjev deg målestokken innebygd i biletet, for du VEIT at stega er like store i verda og kan sjå kor fort dei krympar på arket. Vindauge, heller, master, stolpar, bord i eit golv - og hovuda i ein flokk, som alle ligg på den same linja. Brua frå rutenettet til motivet går gjennom det som gjentek seg.',
    stage: {
      cast: 'colonnade',
      mode: 'equidistant',
      fov: 205,
      guides: 2,
      selectionGuides: 0,
      stand: { x: 0.9, z: 0.4, yaw: -0.18, pitch: 0.04 },
      figures: [
        { who: 'hare-standing-3', at: [1.4, -3.4], turn: 0.2 },
        { who: 'hare-standing-1', at: [-0.2, -7.0], turn: -0.3 },
        { who: 'hare-standing-5', at: [1.9, -11.5], turn: 0.4 },
      ],
    },
    travel: 2400,
  },
  {
    /*
     * And the controls back, with the sheet ruled and the pencil where they
     * left it. A lesson that ends by putting everything back the way it was is
     * a lesson about somebody else's picture.
     *
     * AND IT SETS A TASK, which the first version did not. "Now the sheet is
     * yours" is a true and useless thing to say to somebody who has just been
     * shown thirty-one pictures and has never made one: the honest end of a
     * lesson is not an empty page, it is a page with a question on it. So the
     * answer names the five arrangements the shelf will deal - each of which
     * asks one thing rather than being a scatter - and the photograph, for the
     * one exercise that has to be your own room rather than anybody's cubes.
     *
     * It arrives on the reading clock rather than through a gate: there is
     * nothing left to do, and holding the last sentence of the deck back for
     * seven seconds is the difference between being handed a sheet and being
     * handed a sheet and told what to draw on it.
     */
    headline: 'Teikn ei sjølv',
    body: 'No er arket ditt. Blyanten teiknar grunnflata og dreg henne opp; hald på ei kasse og slå på hennar eigne punkt, så ser du kvar kanten skal peike.',
    found: 'Og du treng ikkje finne på motivet. På hylla ligg ei side med kassar å øve på, og ho er fem oppgåver og ikkje ein tilfeldig haug: ei gate, ei trapp, ein stige som halverer seg for kvar dobling, ein flokk i di eiga høgd, og svermen, som spør om alt på ein gong. Vil du teikne rommet du faktisk sit i, legg eit foto bak rutenettet og finn augehøgda i det. Resten er timar.',
    // The hare sits down beside the drawing with a cube in its lap, which is
    // both the joke and the last measuring stick: the thing you are about to
    // draw, held by somebody whose height you now know.
    stage: { cast: 'one', mode: 'equidistant', fov: 210, guides: 2, selectionGuides: 1, turn: Math.PI / 5, stand: { x: 0, z: 3.6, yaw: 0, pitch: 0 }, figures: [{ who: 'hare-sitting-1', at: [-2.2, -1], turn: -0.5 }] },
    chrome: true,
    travel: 2400,
  },
];

/**
 * Where everything stands for each cast, in metres.
 *
 * Whole metres on the grid's own cells wherever it can be, because the ruling
 * underneath is a metre grid and a lesson about where things line up must line
 * up. A unit cube is a metre on a side, so these are footprint centres and the
 * cubes in a rank touch at exactly a metre apart - which is what makes it read
 * as one form repeated rather than as a scatter.
 *
 * EVERY DISTANCE A CARD SAYS OUT LOUD IS MEASURED FROM THE STAND, NOT FROM
 * HERE. These are world coordinates and the origin is not where anybody is
 * standing - most cards put the eye at z = 2, so a thing written down here at
 * z = -3 is five metres from the viewer and not three. That has been got wrong
 * twice: once on the posts card, which said three metres for five, and again
 * on the flock and the pair when they were written. If a card's body quotes a
 * number, work it out from the card's own `stand`.
 *
 * AND EVERYTHING IS KEPT INSIDE AN UPRIGHT PHONE'S FRAME. At eighty-five
 * degrees of diagonal the horizontal half-field in portrait is about
 * twenty-four degrees, so anything more than four tenths of its own distance
 * off the axis is outside the very frame the card is teaching from. That is not
 * a style rule, it is arithmetic, and it is why the near members of every
 * arrangement below hug the middle.
 */
export const CAST: Record<Cast, Stood[]> = {
  nothing: [],
  one: [{ at: [0, 0] }],
  row: [
    { at: [0, 0] },
    { at: [0, -2] },
    { at: [0, -4] },
    { at: [0, -6] },
    { at: [0, -9] },
    { at: [0, -13] },
  ],
  street: [
    { at: [-2, 0] },
    { at: [-2, -3] },
    { at: [-2, -6] },
    { at: [-2, -10] },
    { at: [2, 0] },
    { at: [2, -3] },
    { at: [2, -6] },
    { at: [2, -10] },
  ],
  /*
   * All four exactly EYE_HEIGHT, and deliberately scattered rather than ranked:
   * a row would let somebody read the effect as something about the row. Five
   * metres out and forty metres out, left and right, and the line still lands
   * on the top of each one.
   */
  level: [
    { at: [-2.4, -3], size: [1, EYE_HEIGHT, 1] },
    { at: [2.8, -8], size: [1, EYE_HEIGHT, 1] },
    { at: [-4.5, -18], size: [1, EYE_HEIGHT, 1] },
    { at: [3.5, -40], size: [1, EYE_HEIGHT, 1] },
  ],
  /* A desk, a car, a door - and between them the astronaut, who is a figure
     off the shelf rather than a box (see Stage.figures). Spread so the line
     crosses each at a visibly different place, and near enough to read. */
  heights: [
    { at: [-1.7, -4], size: [1, 0.75, 1] },
    { at: [1.3, -8], size: [1, 1.5, 1] },
    { at: [3.0, -11], size: [1, 2.1, 1] },
  ],
  /*
   * Nothing. The two flock cards put a dozen bodies on this floor and not one
   * box: the whole subject is where a line crosses a PERSON, and a cube
   * standing among them would be the one thing in frame nobody has a height for
   * in their body already.
   */
  flock: [],
  /*
   * The platform, and it is 1.2 m high for a reason that is arithmetic rather
   * than taste.
   *
   * The eye is at 1.70 and the hares are 1.70 to the crown, so the line grazes
   * every head on the floor. Raise somebody by h and the line crosses them at
   * 1.70 - h up their own body. At 1.2 that is 0.5, which on a 1.70 body is
   * just above the knee - low enough to be unmistakably different from a head
   * and high enough that nobody reads it as the figure having sunk.
   */
  stage: [{ at: [2.6, -9], size: [5, 1.2, 3.4] }],
  /*
   * Two of one size, near and far, and the size is 2.4 rather than a metre.
   *
   * A metre cube is entirely below the eye line, so the horizon misses it and
   * there is nothing to read a fraction off. At 2.4 the line crosses both of
   * them at 1.70/2.40 - seven tenths of the way up - and that is the number the
   * card is about: the same fraction near and far, which is what turns the
   * horizon into a ruler you can measure an unknown height with.
   */
  pair: [
    { at: [-1.2, -2.9], size: [1.6, 2.4, 1.6] },
    { at: [1.4, -16], size: [1.6, 2.4, 1.6] },
  ],
  /*
   * Seven, every one of them turned its own way - which is the arrangement the
   * card about "none of this is the box" describes and cannot show, because it
   * has one box on stage.
   *
   * The first is left square to the world on purpose: it is the one whose pair
   * is the scene's own, so the others are visibly departures from something
   * rather than seven equal strangers.
   */
  turned: [
    { at: [-2.2, -5.0], turn: 0 },
    { at: [1.6, -4.2], turn: 0.62 },
    { at: [-3.4, -8.5], turn: 1.1 },
    { at: [2.4, -9.0], turn: -0.45 },
    { at: [-1.2, -12.0], turn: 0.28 },
    { at: [3.2, -14.0], turn: -0.9 },
    { at: [0.4, -17.0], turn: 0.75 },
  ],
  /*
   * A ramp and a level slab of exactly the same size beside it.
   *
   * The ramp is first, because the selection's own construction is ruled to
   * whatever stands at the head of the cast - so the card can ask for one thing
   * and get the rays it means. Fifteen degrees over six and a half metres is a
   * climb of about 1.7: steep enough that its pair leaves the horizon
   * unmistakably, shallow enough to still read as a ramp somebody would walk up.
   *
   * The slab beside it is the control. Same box, same size, same turn, laid
   * flat - and its pair sits on the line where every pair in the deck so far
   * has sat.
   */
  ramp: [
    { at: [0.4, -6], size: [2.4, 0.3, 6.5], tilt: 0.26 },
    { at: [-3.1, -6], size: [2.4, 0.3, 6.5] },
  ],
  /*
   * Two equal cubes at exactly the same distance, one straight ahead and one
   * well round to the side.
   *
   * The equal distance is the whole argument. A near cube and a far cube would
   * let the effect be read as something about depth; these two are both six
   * metres away, and the only thing that differs is how far each one lands from
   * the point its own faces run to.
   */
  faces: [
    { at: [0, -6] },
    { at: [-4.6, -3.86] },
  ],
  /*
   * THE ONE ARRANGEMENT IN THE DECK THAT IS A TRICK, and it is a trick with a
   * lesson in it.
   *
   * A cube and a box two and a half times as deep, both floated so their
   * middles sit exactly on the eye line and both seen very nearly square on.
   * Neither shows a top face or a bottom face - at the line there is none to
   * show - and neither shows more than a sliver of side. So they draw as the
   * same rectangle, and no amount of care with the pencil can tell them apart,
   * because the information is not in the picture.
   *
   * Lifted to 1.20 so that a metre cube's middle lands at 1.70. The long one
   * gets the same lift and not the same middle, which is the point: its extra
   * length runs away from you, where a square-on view cannot see it.
   */
  mistake: [
    { at: [-0.9, -7], lift: 1.2 },
    { at: [0.9, -7], size: [1, 1, 2.4], lift: 1.2 },
  ],
  /*
   * A colonnade: ten uprights, evenly spaced, and nothing else.
   *
   * Slimmer and taller than a cube - a third of a metre square and two and a
   * half high - because a rank of cubes reads as a wall and a rank of posts
   * reads as a rhythm, and the rhythm is the whole content. Every one of them
   * is the same, so what the page shows is not ten objects but one interval,
   * measured ten times, closing up as it goes.
   */
  colonnade: Array.from({ length: 10 }, (_, at) => ({
    at: [-1.9, -2.2 - at * 1.9] as [number, number],
    size: [0.34, 2.5, 0.34] as [number, number, number],
  })),
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
