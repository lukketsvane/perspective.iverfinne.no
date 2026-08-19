import type { GuideLevel, PerspectiveMode, SelectionGuide } from '../types';

/**
 * THE LESSON.
 *
 * This tool exists because of videos of Kim Jung Gi ruling a sphere on a blank
 * page and then drawing a room full of cubes onto it, freehand, in five point.
 * Everything else here was built to make that reachable. What was missing is
 * the thing the videos do not contain: WHY it works.
 *
 * ONE IDEA, SIXTEEN CARDS.
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
 * So the director stages each card and then, on nine of the sixteen, LETS GO:
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
 * What the viewer has to do before a card is answered.
 *
 * Deliberately coarse - "turned most of the way round", "walked a few paces",
 * "opened the lens past a hundred and ten" - because a gate that is finicky
 * about HOW is a gate that strands somebody who did the right thing slightly
 * differently. Every one of them is also reachable with a thumb on the glass,
 * which rules out anything living two taps down a menu: the one control this
 * lesson asks for that is not the picture itself is the lens, which is on the
 * dock and which the tour already teaches.
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
}

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
    found: 'Det er ingen. Kula har ingen kant fordi ho ikkje er noko du ser PÅ — ho er alle retningane frå der du står, og du er i midten av henne.',
    stage: { cast: 'nothing', guides: 2, fov: 260, mode: 'equidistant' },
    hands: 'viewer',
    gate: { kind: 'turn', radians: 5.6 },
    travel: 1400,
  },
  {
    /*
     * Why a vanishing point exists at all, said as a limit rather than as a
     * rule. Most tutorials assert that parallels meet; the reason is one
     * sentence long, and it is the reason the point does not depend on where
     * the lines are - which is the next card, and the best one in the lesson.
     */
    headline: 'Parallelle linjer møtest',
    body: 'Ei rekkje kassar, alle med same retning. Jo lenger ut du fylgjer dei, jo nærare kjem retninga frå auget ditt den retninga linjene sjølve har — så alle saman peikar mot det same punktet.',
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
    body: 'Gå — dra i nedre venstre hjørne. Fylg med på punktet medan kassane glir forbi deg.',
    found: 'Kassane flytta seg. Punktet stod stille. Det høyrer til RETNINGA, ikkje til linjene og ikkje til staden — difor kan du rule dei seks punkta éin gong og teikne heile sida mot dei.',
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
    found: 'Der er det. Eit knippe parallelle linjer forsvinn i dei TO punkta der retninga stikk gjennom kula — eitt framover, eitt bakover. Det flate arket kan berre vise deg det eine.',
    stage: { cast: 'row', mode: 'equidistant', fov: 300, guides: 1, selectionGuides: 1, stand: { x: 0, z: 5, yaw: 0, pitch: 0 } },
    hands: 'viewer',
    gate: { kind: 'turn', radians: 3.4 },
    travel: 2400,
  },
  {
    headline: 'Eitt punkt',
    body: 'Tilbake til det flate arket, med ei kasse rett på. To av dei tre knippa er parallelle med arket og blir liggjande parallelle på papiret òg; berre det tredje går innover. Eitt punkt — midt i biletet, fordi du ser rett langs retninga.',
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
    found: 'To punkt no, eitt til kvar side. Ingenting i verda har endra seg — arket står vinkelrett på der du ser, så då du snudde deg slutta flatene å vere parallelle med det. «Eitt punkt» og «to punkt» er ikkje to slag kassar. Det er den same kassa, sett to stader frå.',
    stage: { cast: 'one', mode: 'rectilinear', fov: 65, turn: 0, selectionGuides: 1, stand: { x: 0, z: 4.5, yaw: 0, pitch: 0 } },
    hands: 'viewer',
    gate: { kind: 'turn', radians: 0.45 },
    travel: 1600,
  },
  {
    headline: 'Tre punkt',
    body: 'Same kasse igjen. Dra oppover og sjå opp på henne.',
    found: 'No er ikkje loddlinjene parallelle med arket heller, så dei samlar seg òg — i eit punkt over deg. Tre knippe, tre punkt, same kasse, same stad. Alt du gjorde var å løfte blikket.',
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
    body: 'Eitt, to og tre punkt er ikkje tre slag kassar og ikkje tre system. Det er kor mange av dei tre knippa som ikkje ligg parallelt med arket ditt — og det er ei opplysning om kvar DU står og kvar du ser, ikkje om det du teiknar.',
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
    found: 'Sjå hjørna. Ei rett linje held seg rett — det er heile poenget med systemet — men prisen er at avstanden frå midten er TANGENTEN til vinkelen, og tangenten spring frå deg. Ved 180 grader er han uendeleg. Difor finst dei tre andre arka.',
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
    body: 'Så bøyer vi det. Sylinderen held loddlinjene rette og lèt vassrette linjer bue — og no er horisonten ein heil sirkel, med begge punkta til eit knippe på arket samstundes.',
    stage: { cast: 'street', mode: 'cylindrical', fov: 300, guides: 1, stand: { x: 0, z: 6, yaw: 0, pitch: 0 } },
    sweep: { seconds: 40, yaw: [0, Math.PI] },
    travel: 2600,
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
    travel: 2800,
  },
  {
    /*
     * Count them. The whole lesson in one frame, and the viewer turns to do the
     * counting rather than being handed the total.
     */
    headline: 'Ei kasse har seks',
    body: 'Éi kasse, heile kula. Snu deg sakte rundt og tel dei ringa punkta.',
    found: 'Seks: fire rundt horisonten, eitt rett opp, eitt rett ned. Tre knippe, to punkt kvar. På det flate arket såg du eitt, to eller tre av dei — resten låg bak deg. Dei har vore der heile tida.',
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
    stage: { cast: 'one', mode: 'equidistant', fov: 210, guides: 2, selectionGuides: 1, turn: Math.PI / 5, stand: { x: 0, z: 3.6, yaw: 0, pitch: 0 } },
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
