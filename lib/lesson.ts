import type { GuideLevel, PerspectiveMode, SelectionGuide } from '../types';

/**
 * THE LESSON.
 *
 * This tool exists because of a thing draughtsmen do: ruling a sphere on a blank
 * page and then drawing a room full of cubes onto it, freehand, in five point.
 * Everything else here was built to make that reachable. What was missing is
 * the thing a demonstration does not contain: WHY it works.
 *
 * ONE IDEA, EIGHTEEN CARDS.
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
 * So the director stages each card and then, on ten of the eighteen, LETS GO:
 * turn round and find the second point, walk and watch the point refuse to
 * move, look up, open the lens until the corners go. The card waits, and when
 * you have done it a sentence appears that was not there before - the one that
 * says what just happened. That sentence is the point of the card; everything
 * above it is the setup.
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
  | 'heights';

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
  figures?: Array<{ who: string; at: [number, number]; turn?: number }>;
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
  | { kind: 'field'; past: number };

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
 * The four acts, and why a lesson this long needs them.
 *
 * Eighteen cards in a row is a list, and a list has no shape: at card eleven
 * nobody knows whether they are near the end or a third of the way in, and a
 * viewer who cannot see the shape of a thing cannot tell whether it is going
 * anywhere. Four titles, held for two and a half seconds over the picture,
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

export const ACTS: Act[] = [
  { at: 0, title: 'Kula', line: 'Alt du kan sjå, som eit einaste kart' },
  { at: 4, title: 'Auget', line: 'Horisonten er ikkje ein stad. Han er høgda di' },
  { at: 7, title: 'Punkta', line: 'Kvar dei kjem frå, og kvifor dei står stille' },
  { at: 13, title: 'Arka', line: 'Fire flater å fange det same på' },
  { at: 18, title: 'Handa', line: 'Frå rutenettet til blyanten' },
];

export interface Card {
  /** Two or three words. The thing this card is about. */
  headline: string;
  /** What is happening, or what to do. Short: a card nobody finishes is a card. */
  body: string;
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
    body: 'Du står stille. Alt du kan sjå ligg i ei retning, og alle retningane til saman er ei kule rundt auget ditt. Eit bilete er eit kart over den kula, og ikkje noko meir enn det.',
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
    found: 'Det er ingen. Kula har ingen kant fordi ho ikkje er noko du ser PÅ. Ho er alle retningane frå der du står, og du er i midten av henne.',
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
    headline: 'Kva fangar du det på?',
    body: 'Kula er ikkje eit bilete enno. Eit bilete er ei flate med merke på, så strålane må fangast på noko. Sjå: same scene, same stad, tre ulike flater under.',
    stage: { cast: 'street', mode: 'rectilinear', fov: 100, guides: 1, selectionGuides: 0, stand: { x: 0, z: 6, yaw: 0, pitch: 0 } },
    sweep: { seconds: 21, surfaces: ['rectilinear', 'cylindrical', 'equidistant'] },
    travel: 2200,
  },
  {
    /*
     * The two marks every one of those surfaces carries, and the reason they
     * are the first two things anybody rules on a page.
     *
     * The principal point is the one place the tool has been drawing all along
     * without naming it: the little ring dead centre. It is not in the world.
     * Turn as far as you like and it does not move, because it is not a thing
     * you are looking AT - it is where you are looking, marked on the surface.
     *
     * And the horizon is not the edge of the ground. It is the set of
     * directions level with your eye, which on a flat sheet is a straight line
     * and on the sphere is a great circle - and it sits at your eye height
     * whether the ground is there or not.
     */
    headline: 'Hovudpunktet og horisonten',
    body: 'Ringen midt i biletet er hovudpunktet: der du ser, avmerkt på flata. Snu deg og sjå etter kva som flyttar seg og kva som ikkje gjer det.',
    found: 'Ringen står stille i midten fordi han ikkje er noko i verda. Og horisonten fylgjer auget ditt, ikkje bakken: han er alle retningane som ligg vassrett frå deg. Det er dei to fyrste merka nokon rular på ei side, og dei er dei einaste to som ikkje er noko du kan sjå på.',
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
    body: 'Fire stolpar, alle nøyaktig like høge som auget ditt. Den næraste står tre meter unna, den fjernaste førti. Snu deg og sjå etter kvar horisonten kryssar dei.',
    found: 'Han kryssar alle fire i toppen. Same kor langt unna dei står. Horisonten ligg i di eiga høgd, så alt som er like høgt som auget ditt blir kutta akkurat der - og det er den eine linja du kan måle med utan å måle.',
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
     * a desk comes to your thigh, a small child to your waist, a car to your
     * chest, a door goes over your head. Those are heights an illustrator
     * already knows in their body, and the line is where that knowledge gets
     * onto the paper. This is the card that makes the tool's metres worth
     * something - a scene is right when the sizes are right, and the sizes are
     * right when they are read off the horizon rather than guessed.
     */
    headline: 'Linja er ein målestokk',
    body: 'Ein pult på 75, astronauten på ein meter, ein bil på 150, ei dør på 210. Ingen av dei står i di høgd. Sjå kvar linja går på kvar av dei.',
    found: 'Ho går over dei tre fyrste og gjennom den fjerde, fordi ho ligg i 170 og døra er det eine som er høgare enn auget ditt. Og du kjenner alt desse høgdene frå kroppen din: pulten når deg til låret, astronauten til hofta, bilen til brystet. Set linja der auget er, og storleikane er ei avlesing i staden for ei gjetting.',
    stage: {
      cast: 'heights',
      mode: 'rectilinear',
      fov: 85,
      guides: 1,
      selectionGuides: 0,
      cameraHeight: EYE_HEIGHT,
      stand: { x: 0, z: 3, yaw: 0, pitch: 0 },
      figures: [{ who: 'astro-walking', at: [-1.1, -6] }],
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
    found: 'Linja fylgde deg. Ho er ikkje ein stad i verda, ho er høgda di - difor teiknar ein ho fyrst og bestemmer med det kvar den som ser står. Sjå òg kva som skjer med topp- og botnflatene på vegen: dei lukkar seg jo nærare linja dei kjem, og RETT på henne er dei borte. Ei flate du ser oppå er ei flate under auget ditt.',
    stage: {
      cast: 'heights',
      mode: 'rectilinear',
      fov: 85,
      guides: 1,
      selectionGuides: 0,
      cameraHeight: EYE_HEIGHT,
      stand: { x: 0, z: 3, yaw: 0, pitch: 0 },
    },
    hands: 'director',
    sweep: { seconds: 9, height: [0.55, 2.6] },
    travel: 1800,
  },
  {
    /*
     * Why a vanishing point exists at all, said as a limit rather than as a
     * rule. Most tutorials assert that parallels meet; the reason is one
     * sentence long, and it is the reason the point does not depend on where
     * the lines are - which is the next card, and the best one in the lesson.
     */
    headline: 'Parallelle linjer møtest',
    body: 'Ei rekkje kassar, alle med same retning. Jo lenger ut du fylgjer dei, jo nærare kjem retninga frå auget ditt den retninga linjene sjølve har, så alle saman peikar mot det same punktet.',
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
    body: 'Gå: dra i nedre venstre hjørne. Fylg med på punktet medan kassane glir forbi deg.',
    found: 'Kassane flytta seg. Punktet stod stille. Det høyrer til RETNINGA, ikkje til linjene og ikkje til staden. Difor kan du rule dei seks punkta éin gong og teikne heile sida mot dei.',
    stage: { cast: 'row', mode: 'rectilinear', fov: 80, selectionGuides: 1, stand: { x: 1.6, z: 6, yaw: -0.12, pitch: 0 } },
    hands: 'viewer',
    gate: { kind: 'walk', metres: 3.5 },
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
    found: 'Der er det. Eit knippe parallelle linjer forsvinn i dei TO punkta der retninga stikk gjennom kula: eitt framover, eitt bakover. Det flate arket kan berre vise deg det eine.',
    stage: { cast: 'row', mode: 'equidistant', fov: 300, guides: 1, selectionGuides: 1, stand: { x: 0, z: 5, yaw: 0, pitch: 0 } },
    hands: 'viewer',
    gate: { kind: 'turn', radians: 3.4 },
    travel: 2400,
  },
  {
    headline: 'Eitt punkt',
    body: 'Tilbake til det flate arket, med ei kasse rett på. To av dei tre knippa er parallelle med arket og blir liggjande parallelle på papiret òg; berre det tredje går innover. Eitt punkt, og det ligg midt i biletet fordi du ser rett langs retninga.',
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
    found: 'To punkt no, eitt til kvar side. Ingenting i verda har endra seg. Arket står vinkelrett på der du ser, så då du snudde deg slutta flatene å vere parallelle med det. «Eitt punkt» og «to punkt» er ikkje to slag kassar. Det er den same kassa, sett to stader frå.',
    stage: { cast: 'one', mode: 'rectilinear', fov: 65, turn: 0, selectionGuides: 1, stand: { x: 0, z: 4.5, yaw: 0, pitch: 0 } },
    hands: 'viewer',
    gate: { kind: 'turn', radians: 0.45 },
    travel: 1600,
  },
  {
    headline: 'Tre punkt',
    body: 'Same kasse igjen. Dra oppover og sjå opp på henne.',
    found: 'No er ikkje loddlinjene parallelle med arket heller, så dei samlar seg òg, i eit punkt over deg. Tre knippe, tre punkt, same kasse, same stad. Alt du gjorde var å løfte blikket.',
    stage: { cast: 'one', mode: 'rectilinear', fov: 88, turn: Math.PI / 5, selectionGuides: 1, stand: { x: 0, z: 3.4, yaw: 0, pitch: 0 } },
    hands: 'viewer',
    gate: { kind: 'pitch', radians: 0.45 },
    travel: 1800,
  },
  {
    /*
     * The card that collects the three before it. No stage change worth
     * mentioning and nothing to do: a page of the lesson that is a place to
     * stop and be told what just happened, which a lesson made only of
     * exercises never gives anybody.
     */
    headline: 'Ingenting av dette er kassa',
    body: 'Eitt, to og tre punkt er ikkje tre slag kassar og ikkje tre system. Det er kor mange av dei tre knippa som ikkje ligg parallelt med arket ditt, og det er ei opplysning om kvar DU står og kvar du ser, ikkje om det du teiknar.',
    stage: { cast: 'one', mode: 'rectilinear', fov: 88, turn: Math.PI / 5, selectionGuides: 1, stand: { x: 0, z: 3.4, yaw: 0.5, pitch: 0.4 } },
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
    found: 'Sjå hjørna. Ei rett linje held seg rett, og det er heile poenget med systemet. Prisen er at avstanden frå midten er TANGENTEN til vinkelen, og tangenten spring frå deg. Ved 180 grader er han uendeleg. Difor finst dei tre andre arka.',
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
    body: 'Same scene, fanga på sylinderen. Han held loddlinjene rette og lèt vassrette linjer bue, og no er horisonten ein heil sirkel, med begge punkta til eit knippe på arket samstundes.',
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
    body: 'Og fanga på kula sjølv. Alle retningar ligg på arket: fire punkt rundt horisonten, eitt rett opp, eitt rett ned. Avstand frå midten er vinkelen sjølv, jamt i alle retningar. Dette er arket ein rular når heile rommet skal med.',
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
     * The ruled sheet, and what it is FOR. Fifteen degrees is the spacing the
     * shader draws at and the spacing in the videos: close enough to sight an
     * angle against, open enough to draw between.
     */
    headline: 'Rul arket først',
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
    found: 'Han slepper aldri kurva si. Det er dette som gjer at ein kan teikne på fri hand i fem punkt: du treng ikkje rekne ut noko, du treng berre å vite kva for ei kurve kanten høyrer til.',
    stage: { cast: 'street', mode: 'equidistant', fov: 340, guides: 2, selectionGuides: 0, stand: { x: 0, z: 5, yaw: 0, pitch: 0.1 } },
    hands: 'viewer',
    gate: { kind: 'turn', radians: 2.6 },
    travel: 2200,
  },
  {
    /*
     * And the controls back, with the sheet ruled and the pencil where they
     * left it. A lesson that ends by putting everything back the way it was is
     * a lesson about somebody else's picture.
     */
    headline: 'Teikn ei sjølv',
    body: 'No har du arket. Blyanten teiknar grunnflata og dreg henne opp; hald ei kasse og slå på hennar eigne punkt for å sjå kvar kantane skal peike. Hylla har ei heil side med kassar å øve på. Resten er timar.',
    stage: { cast: 'one', mode: 'equidistant', fov: 210, guides: 2, selectionGuides: 1, turn: Math.PI / 5, stand: { x: 0, z: 3.6, yaw: 0, pitch: 0 }, figures: [{ who: 'astro-back', at: [-2.1, -1], turn: -0.35 }] },
    chrome: true,
    travel: 2400,
  },
];

/**
 * Where the cubes stand for each cast, in metres.
 *
 * Whole metres on the grid's own cells, because the ruling underneath is a
 * metre grid and a lesson about where things line up must line up. A unit cube
 * is a metre on a side, so these are centres and the cubes touch at exactly a
 * metre apart - which is what makes the rank in card three read as one form
 * repeated rather than as a scatter.
 */
/**
 * Where each cast stands, and how tall it is.
 *
 * Two numbers or three: x and z on the floor, and a height in metres that
 * defaults to the one-metre cube the rest of the lesson is built on. The third
 * is only there for the two eye-level casts, where the whole content of the
 * card is that the things are DIFFERENT heights - or all exactly one height.
 */
export const CAST: Record<Cast, Array<[number, number] | [number, number, number]>> = {
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
  /*
   * All four exactly EYE_HEIGHT, and deliberately scattered rather than ranked:
   * a row would let somebody read the effect as something about the row. Three
   * metres out and forty metres out, left and right, and the line still lands
   * on the top of each one.
   */
  level: [
    [-2.4, -3, EYE_HEIGHT],
    [2.8, -8, EYE_HEIGHT],
    [-4.5, -18, EYE_HEIGHT],
    [3.5, -40, EYE_HEIGHT],
  ],
  /* A desk, a car, a door - and between them the astronaut, who is a figure
     off the shelf rather than a box (see Stage.figures). Spread so the line
     crosses each at a visibly different place, and near enough to read. */
  heights: [
    [-3.2, -4, 0.75],
    [1.4, -8, 1.5],
    [3.9, -11, 2.1],
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
