import { useSyncExternalStore } from 'react';

/**
 * Whether the chrome is showing.
 *
 * The point of the tool is the view you set up and then draw from, so anything
 * that is not the view gets out of the way on its own: the dock fades a few
 * seconds after the last touch and comes back on the next one. The bar that
 * appears over a selection is the same kind of thing and wants the same
 * behaviour, and it is a different component in a different part of the tree -
 * so the timer lives out here rather than inside either of them.
 *
 * Deliberately not in the scene store. This is not part of a composition: it is
 * not saved, not undone, and changes on a schedule of its own. Putting it there
 * would put a repainting timer inside the thing every drag already writes to.
 */

type Listener = () => void;

/** How long the chrome stays up after the last touch. */
const LINGER = 6000;

const listeners = new Set<Listener>();
let visible = true;
let timer: number | undefined;
/**
 * WHO is holding it up, not whether somebody is.
 *
 * It was one boolean, and one boolean cannot survive two holders. The overlay
 * runs `if (showTools || showLights || showMaterial) holdRail(); else
 * releaseRail();` on every change of those three - INCLUDING once on mount,
 * with all three false - so anything else that had taken a hold had it dropped
 * out from under it by a panel it has nothing to do with. Nothing noticed while
 * the panels were the only holder; the second was a guided tour that took its
 * hold as the app opened, and that mount-time release landed squarely on it.
 *
 * A set, so the count only runs again when the last holder has let go.
 */
const holds = new Set<string>();

/**
 * ...and WHO is holding it DOWN, which is not the same thing at all.
 *
 * There was a `hideRail` here that put the chrome away NOW rather than in six
 * seconds, and it was not enough - it did not keep it away. Which is wrong for
 * the lesson, because of what the lesson ASKS FOR: the first card says drag on
 * the picture and turn all the way round. A drag is a touch, a touch is
 * `showRail`, and the whole dock came straight back up over the card telling
 * you to drag - which is the one moment the tool is meant to be showing you
 * something other than itself.
 *
 * So a performance can take the screen and keep it. Nothing here is a lock:
 * the two cards that are ABOUT a control let go for their turn, and the whole
 * thing is released when the lesson ends.
 */
const mutes = new Set<string>();

const publish = (next: boolean) => {
  if (visible === next) return;
  visible = next;
  listeners.forEach((listener) => listener());
};

/**
 * A touch anywhere: the chrome is wanted, and wanted for a while.
 *
 * Not past a hold, though. Every touch on the dock passes through here, and a
 * touch INSIDE an open panel used to re-arm the idle timer over the panel's
 * own hold - so working a knob for a while faded the whole column out from
 * under the open panel, with the dismiss layer still up over a chrome nobody
 * could see. Six seconds after your third tap in the tools row, the tools row
 * left.
 */
export const showRail = () => {
  if (mutes.size > 0) return;
  publish(true);
  if (holds.size > 0) return;
  if (timer !== undefined) clearTimeout(timer);
  timer = setTimeout(() => publish(false), LINGER) as unknown as number;
};

/**
 * Hold it up until told otherwise - what an open panel does, since a row of
 * controls fading out from under an open sheet leaves twelve things on screen
 * that can be seen and not pressed.
 */
export const holdRail = (who = 'panel') => {
  holds.add(who);
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  // The hold is recorded either way, so that letting go of a mute hands the
  // chrome back to whoever was holding it up underneath.
  if (mutes.size > 0) return;
  publish(true);
};

/**
 * That holder has let go: back to fading on the idle clock, but only once
 * every holder has. The default names the panels, so both existing call sites
 * read exactly as they did.
 */
export const releaseRail = (who = 'panel') => {
  holds.delete(who);
  if (holds.size === 0) showRail();
};

/**
 * Whether anything has a claim on the chrome, up OR down.
 *
 * Read by the page dealer, which is the one thing in the tool that changes
 * what you are looking at without being asked to. An open panel is somebody
 * mid-decision - see lib/autoDeal.ts for why that is a decision the deal has
 * to wait out rather than one it can talk over.
 *
 * A mute counts, and it has to: a lesson is the clearest case in the app of
 * somebody being shown something, and the dealer's only other guard is a few
 * seconds of stillness - which is exactly what reading a card looks like. A
 * page dealt in the middle of the third card changes the surface, the sheet
 * and the pen under a performance that chose them.
 */
export const railHeld = () => holds.size > 0 || mutes.size > 0;

/**
 * Down, and KEPT down until this holder lets go.
 *
 * While anything holds a mute, a touch does not bring the chrome back and an opening
 * panel does not either - the dock goes both invisible and inert, so a thumb
 * dragging across the bottom of the picture cannot press a button it can no
 * longer see.
 */
export const muteRail = (who = 'lesson') => {
  mutes.add(who);
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  publish(false);
};

/** That performance is over: back to whatever the holds and the clock say. */
export const unmuteRail = (who = 'lesson') => {
  if (!mutes.delete(who) || mutes.size > 0) return;
  if (holds.size > 0) publish(true);
  else showRail();
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const read = () => visible;

export const useRail = () => useSyncExternalStore(subscribe, read, read);
