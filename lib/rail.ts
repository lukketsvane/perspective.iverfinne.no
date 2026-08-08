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

const publish = (next: boolean) => {
  if (visible === next) return;
  visible = next;
  listeners.forEach((listener) => listener());
};

/** A touch anywhere: the chrome is wanted, and wanted for a while. */
export const showRail = () => {
  publish(true);
  if (timer !== undefined) clearTimeout(timer);
  timer = setTimeout(() => publish(false), LINGER) as unknown as number;
};

/**
 * Hold it up until told otherwise - what an open panel does, since a row of
 * controls fading out from under an open sheet leaves twelve things on screen
 * that can be seen and not pressed.
 */
export const holdRail = () => {
  publish(true);
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const read = () => visible;

export const useRail = () => useSyncExternalStore(subscribe, read, read);
