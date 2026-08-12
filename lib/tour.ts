import { useSyncExternalStore } from 'react';

/**
 * The nine cards a first-time viewer is shown, and where they are up to.
 *
 * Out here rather than in the scene store, for the same reasons rail.ts gives:
 * this is not part of a composition. It is not saved with a scene, not undone,
 * not exported, and it changes on a schedule of its own. Putting it in the
 * store would put a repainting timer inside the thing every drag writes to.
 *
 * WHAT THE TOUR MAY DO: read the app, and wait. It opens no panel, closes no
 * panel, arms no instrument and writes nothing to the scene. Every step ends
 * because the viewer did something or pressed Next. That is the whole of its
 * agreement with the one-panel-in-the-slot rule, and it is why nothing here can
 * leave the tool in a state nobody asked for.
 *
 * THE CARDS ARE IN NYNORSK. The comments and every aria-label in this app are
 * English - the labels are machine-facing names that the tour, the harness and
 * `document.querySelector` all anchor on, and they are named as such in the
 * comments beside them. What a first-time viewer READS is a different thing,
 * and it is the viewer's own language.
 *
 * AND EACH CARD NAMES THE CONTROL, by the shape drawn on it: the cone, the cube,
 * the three sliders. Not by where it sits - the dock is one row in portrait and
 * two corner clusters in landscape, so "bottom right" is true half the time -
 * and not by its label, because none of these buttons carries visible text. The
 * ring points; the sentence has to point too, for anyone reading the card after
 * the ring has scrolled out from under their thumb.
 */

type Listener = () => void;

/**
 * Bumped when the tour is rewritten, so a viewer who has seen the old one is
 * offered the new one - the same trick VIEW_GENERATION plays in store.ts.
 */
const TOUR_GENERATION = 5;

/**
 * Its own key, not a field in the settings blob.
 *
 * That blob is allow-listed, shape-checked and thrown away wholesale when the
 * view generation moves. A tour flag riding in it would be dropped by a
 * migration about something else entirely, and every returning viewer would be
 * interrupted again by a tour they had already sat through.
 */
const KEY = 'kjg-perspective-tour';

/**
 * WHAT THE CARD IS WAITING FOR.
 *
 * Every step but the last names one, and the step does not pass until the
 * viewer has done it. That is the whole difference between a tour and a stack
 * of captions: a card that says "trykk kuben" and then advances on a timer has
 * taught nobody anything, and a card that advances on Next alone is a slide.
 *
 * The gates are deliberately coarse - "the panel is open", "a box exists",
 * "the lens moved a long way" - because a gate that is finicky about HOW is a
 * gate that strands somebody who did the right thing slightly differently.
 * They are all evaluated in components/Tour.tsx, which is the one place that
 * can see both the store and the live DOM.
 */
export type Gate =
  /** The view was turned by a drag. */
  | 'look'
  /** The stick in the corner was pushed. */
  | 'walk'
  /** The field of view moved a long way from where the card found it. */
  | 'lens'
  /** The tools panel is open. */
  | 'tools'
  /** A different page was dealt. */
  | 'page'
  /** The model shelf is open. */
  | 'shelf'
  /** The block-out pencil is in hand. */
  | 'pencil'
  /** A box that was not there when the card opened is standing now. */
  | 'box';

/**
 * The gesture drawn over the anchor, which is the other half of "trykk".
 *
 * Nothing in this tool carries visible text, and half of its controls are
 * dragged rather than tapped - a distinction no ring can make. So the ring
 * says WHICH and the glyph says HOW: a tap ripple, an arrow along the axis the
 * control actually reads, or the two strokes a box is drawn with.
 */
export type Gesture = 'tap' | 'dragX' | 'dragFree' | 'blockOut';

export interface TourStep {
  /**
   * The exact aria-label of the control to ring, or null for a step that rings
   * nothing.
   *
   * Exact, static strings only. An interpolated label - `Snap to 0.25 m`,
   * `Floor: 128 of 255 - drag to change` - names a control only while it is at
   * that value, and nothing in SelectionBar may be named at all: two adjacent
   * controls there carry one identical label.
   */
  anchor: string | null;
  /** Used when the anchor is out of reach, rather than ringing nothing. */
  fallbackAnchor?: string;
  headline: string;
  body: string;
  /** What the viewer must do. Absent on the card that ends the tour. */
  gate?: Gate;
  /** How they do it, drawn over the anchor. */
  gesture?: Gesture;
  /** The walk step draws the stick quadrant instead of ringing a control. */
  markWalkZone?: boolean;
  /** The last card lets the chrome go, and is about what happens next. */
  releasesRail?: boolean;
}

/*
 * NINE CARDS, AND EVERY ONE OF THEM IS ONE ACTION.
 *
 * There were five, and three of those were a paragraph each: the fourth asked
 * for two taps and two drags in one breath, which is a card you read twice and
 * then do the first half of. Nine short ones that each wait for their own tap
 * is more cards and less reading, and at no point is there a card on screen
 * describing something that is not in front of you - the menu steps wait for
 * the menu to be OPEN before the card about what is inside it appears.
 */
export const STEPS: TourStep[] = [
  {
    /*
     * The first thing anyone reads, and it has one job: say that the eye is
     * INSIDE this, not in front of it. Everything else the tool does follows
     * from that and nothing else on the screen says it.
     *
     * "Du står i det" said it and said it badly - a headline whose subject is
     * "det" is a headline that has not decided what it is about.
     */
    anchor: null,
    gate: 'look',
    gesture: 'dragFree',
    headline: 'Du står i scena',
    body: 'Dra på biletet for å snu deg.',
  },
  {
    anchor: null,
    gate: 'walk',
    markWalkZone: true,
    headline: 'Gå',
    body: 'Dra inne i den stipla ruta. Du kan sjå og gå samstundes, ein tommel på kvar.',
  },
  {
    // "Field of view" is read by the tour. Renaming it leaves this step with a
    // card and no ring.
    anchor: 'Field of view',
    gate: 'lens',
    gesture: 'dragX',
    headline: 'Linsa',
    body: 'Dra kjegla sidelengs — runde knappar blir dregne, ikkje trykte. Smalare, og linjene rettar seg ut.',
    // Two facts, and the second is the whole tool: that the sheet is curved,
    // and that the flat perspective you were taught is the narrow end of it.
    // It used to say "forbi 180° buar linjene seg", which was the same fact
    // told from the other end - correct while the tool opened at 90 and
    // backwards now that it opens at 210 with everything already bowed.
  },
  {
    // "Tools" is read by the tour.
    anchor: 'Tools',
    gate: 'tools',
    gesture: 'tap',
    headline: 'Alt ligg bak éin knapp',
    body: 'Trykk dei tre skyvarane.',
  },
  {
    /*
     * The first card that can only be written because the one before it waited.
     * This control is inside the panel, so a tour that advanced on a timer would
     * be ringing a button behind a closed menu by now.
     */
    anchor: 'Deal a different page',
    fallbackAnchor: 'Tools',
    gate: 'page',
    gesture: 'tap',
    headline: 'Del ut ei side',
    body: 'Trykk terningen. Flate, papir, lys og penn skifter under eitt — trykk igjen for ei ny.',
  },
  {
    anchor: 'Add model',
    gate: 'shelf',
    gesture: 'tap',
    headline: 'Hylla',
    body: 'Trykk kuben. Stolar, hestar, eit fly — alt er målt, så du teiknar mot verkelege storleikar.',
  },
  {
    /*
     * "Draw boxes on the ground" is read by the tour.
     *
     * It lives on the model shelf, beside the cube, so until the step before
     * this one has been done there is nothing on screen to ring - which is why
     * the ring falls back to the dock button that opens it rather than circling
     * nothing. The tour opens no shelf itself: the tap is the lesson.
     */
    anchor: 'Draw boxes on the ground',
    fallbackAnchor: 'Add model',
    gate: 'pencil',
    gesture: 'tap',
    headline: 'Ta blyanten',
    body: 'Trykk blyanten ved sida av kuben. Hylla legg seg bort med det same.',
  },
  {
    anchor: null,
    gate: 'box',
    gesture: 'blockOut',
    headline: 'Teikn ein kasse',
    body: 'Dra ut grunnflata på golvet, slepp, og dra opp høgda.',
  },
  {
    anchor: null,
    releasesRail: true,
    headline: 'No forsvinn alt',
    body: 'Slepp skjermen. Etter seks sekund er verktøylinja borte. Rør skjermen, så kjem ho att.',
  },
];

const listeners = new Set<Listener>();
/** -1 is "not running". */
let step = -1;

const publish = (next: number) => {
  if (step === next) return;
  step = next;
  listeners.forEach((listener) => listener());
};

/** Whether this browser has been offered the tour already. */
export const tourSeen = (): boolean => {
  if (typeof localStorage === 'undefined') return true;
  try {
    const stored = localStorage.getItem(KEY);
    if (!stored) return false;
    return (JSON.parse(stored) as { seen?: number }).seen === TOUR_GENERATION;
  } catch {
    // Unreadable is the same as seen: a browser that cannot answer is not a
    // browser to interrupt on every load.
    return true;
  }
};

/**
 * Written the moment it is first SHOWN, not when it is finished.
 *
 * Being interrupted twice is a worse failure than seeing four fifths of it
 * once, and there is a seat in the panel for anyone who wants the rest.
 */
const markSeen = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ seen: TOUR_GENERATION }));
  } catch {
    /* a full or blocked store is not worth interrupting a drawing for */
  }
};

export const beginTour = () => {
  markSeen();
  publish(0);
};

export const nextStep = () => {
  if (step < 0) return;
  if (step >= STEPS.length - 1) publish(-1);
  else publish(step + 1);
};

export const endTour = () => publish(-1);

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const read = () => step;

/** The step showing, or -1. */
export const useTourStep = () => useSyncExternalStore(subscribe, read, read);
