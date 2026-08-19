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
 * the panels were the only holder; the guided tour is the second, it takes its
 * hold as the app opens, and that mount-time release landed squarely on it.
 *
 * A set, so the count only runs again when the last holder has let go.
 */
const holds = new Set<string>();

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
  publish(true);
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
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
 * Whether anything is deliberately keeping the chrome up.
 *
 * Read by the page dealer, which is the one thing in the tool that changes
 * what you are looking at without being asked to. An open panel or a running
 * tour is somebody mid-decision - see lib/autoDeal.ts for why that is a
 * decision the deal has to wait out rather than one it can talk over.
 */
export const railHeld = () => holds.size > 0;

/**
 * Put the chrome away NOW, rather than in six seconds.
 *
 * One caller: the lesson, which takes the whole tool over and is a
 * performance. Six seconds of dock over the first card is six seconds of the
 * wrong thing being looked at, and there was no way to say "down" - only "up",
 * and "up until I let go".
 *
 * It does not hold it down. A touch brings it straight back, which is right:
 * the tool is still there and still yours, it is simply not what is being
 * shown.
 */
export const hideRail = () => {
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  publish(false);
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const read = () => visible;

export const useRail = () => useSyncExternalStore(subscribe, read, read);
