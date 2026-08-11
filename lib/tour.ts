import { useSyncExternalStore } from 'react';

/**
 * The five cards a first-time viewer is shown, and where they are up to.
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
const TOUR_GENERATION = 3;

/**
 * Its own key, not a field in the settings blob.
 *
 * That blob is allow-listed, shape-checked and thrown away wholesale when the
 * view generation moves. A tour flag riding in it would be dropped by a
 * migration about something else entirely, and every returning viewer would be
 * interrupted again by a tour they had already sat through.
 */
const KEY = 'kjg-perspective-tour';

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
  /** Step one draws the walk quadrant instead of ringing a control. */
  markWalkZone?: boolean;
  /** The last card lets the chrome go, and is about what happens next. */
  releasesRail?: boolean;
}

export const STEPS: TourStep[] = [
  {
    anchor: null,
    markWalkZone: true,
    headline: 'Du står i det',
    body: 'Dra kvar som helst for å sjå deg rundt. Dra inne i den stipla ruta for å gå.',
  },
  {
    // "Field of view" is read by the tour. Renaming it leaves this step with a
    // card and no ring.
    anchor: 'Field of view',
    headline: 'Opne linsa',
    body: 'Dra kjegla sidelengs — runde knappar blir dregne, ikkje trykte. Forbi 180° buar linjene seg.',
    // Two facts, and the second is the whole tool: that the sheet is curved.
    // Anything shorter drops one of them.
  },
  {
    // "Tools" is read by the tour.
    anchor: 'Tools',
    headline: 'Alt ligg bak éin knapp',
    body: 'Trykk dei tre skyvarane. Hjelpelinjer, flate, papir, projeksjon — alt er der inne.',
  },
  {
    /*
     * "Draw boxes on the ground" is read by the tour.
     *
     * It lives on the model shelf, beside the cube, so until the viewer's own
     * tap opens that shelf there is nothing on screen to ring - which is why
     * the ring falls back to the dock button that opens it rather than circling
     * nothing. The tour does not open the shelf itself: the tap is the lesson.
     * So the card has to name both buttons, in the order they are pressed.
     */
    anchor: 'Draw boxes on the ground',
    fallbackAnchor: 'Add model',
    headline: 'Teikn ein kasse',
    body: 'Trykk kuben. Ta blyanten ved sida av kuben på hylla, dra ut grunnflata på golvet, slepp, dra opp høgda.',
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
