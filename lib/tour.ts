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
 */

type Listener = () => void;

/**
 * Bumped when the tour is rewritten, so a viewer who has seen the old one is
 * offered the new one - the same trick VIEW_GENERATION plays in store.ts.
 */
const TOUR_GENERATION = 1;

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
    headline: 'You are standing in it',
    body: 'Drag anywhere to look around. Drag inside the marked corner to walk — the two run at once, one thumb each.',
  },
  {
    // "Field of view" is read by the tour. Renaming it leaves this step with a
    // card and no ring.
    anchor: 'Field of view',
    headline: 'Open the lens right out',
    body: 'Drag it sideways — every round control here is dragged, not tapped. Past 180° the lines start to bow: that is the sheet this tool draws on.',
  },
  {
    // "Tools" is read by the tour.
    anchor: 'Tools',
    headline: 'The dock is verbs only',
    body: 'Every setting — the guides, the surface, the page, the projection — is behind this one button. Open it.',
  },
  {
    /*
     * "Draw boxes on the ground" is read by the tour.
     *
     * It lives inside the tools panel, so until the viewer's own tap opens that
     * panel there is nothing on screen to ring - which is why the step before
     * this one exists and why the tour does not simply open the panel itself.
     * If the panel is shut when this card is reached, the ring falls back to the
     * button that opens it rather than circling nothing.
     */
    anchor: 'Draw boxes on the ground',
    fallbackAnchor: 'Tools',
    headline: 'Block one in by eye',
    body: 'The first control in Tools is the block-out pencil. Take it — the panel stands itself down — then drag a footprint on the floor beside the car, let go, and drag up for the height. It puts itself down after each box.',
  },
  {
    anchor: null,
    releasesRail: true,
    headline: 'Now it gets out of your way',
    body: 'Take your hands off. Six seconds and the whole bar dissolves, leaving the drawing on the sheet. Any touch brings it back.',
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
