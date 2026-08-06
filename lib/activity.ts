import { useSyncExternalStore } from 'react';

/**
 * Whether the tool is waiting on something, and whether the last thing it
 * waited on failed.
 *
 * A library mesh is three megabytes over the network and a second or two of
 * parsing. Tapping one closed the sheet and then did nothing at all until the
 * figure appeared - and a tool that does nothing for two seconds after being
 * asked has, as far as anyone watching can tell, not heard. Every failure was
 * the same silence: a mesh that could not be fetched, a scene file that would
 * not read, went to the console and nowhere else.
 *
 * So there is one mark for both, and it is a mark rather than a word: a
 * hairline along the top edge, running while the work runs, going red when the
 * work does not come back. It is deliberately the least the tool can say.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let outstanding = 0;
let failedAt = 0;
let snapshot = { busy: false, failedAt: 0 };

const publish = () => {
  snapshot = { busy: outstanding > 0, failedAt };
  listeners.forEach((listener) => listener());
};

/**
 * Something has been asked for. The returned function says it is over, and is
 * safe to call twice - a `finally` and an error path both reaching for it is
 * the normal shape of this.
 */
export const beginActivity = (): (() => void) => {
  outstanding += 1;
  publish();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    outstanding = Math.max(0, outstanding - 1);
    publish();
  };
};

/** It did not come back. */
export const reportFailure = () => {
  failedAt = Date.now();
  publish();
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const read = () => snapshot;

export const useActivity = () => useSyncExternalStore(subscribe, read, read);

/**
 * Run something with the mark up, and mark it if it throws.
 *
 * The error is swallowed on purpose: every caller of this was already writing
 * it to the console and carrying on, and now the screen says so too.
 */
export const whileWorking = async <T>(work: () => Promise<T>): Promise<T | undefined> => {
  const done = beginActivity();
  try {
    return await work();
  } catch (error) {
    console.error(error);
    reportFailure();
    return undefined;
  } finally {
    done();
  }
};
