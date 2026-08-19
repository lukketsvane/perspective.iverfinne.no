import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useStore } from '../store';
import { hintFor } from '../lib/hints';
import { bubble } from './ui';

/**
 * Hold a control, and it says what it is.
 *
 * ONE LISTENER FOR FORTY BUTTONS. The alternative is a prop on every control
 * in the app, and there are four toolbars' worth of them in six files - which
 * is forty places to forget. What every one of them already has is an
 * aria-label, so this listens once at the window, finds the labelled thing
 * under the finger, and looks the label up. A control added tomorrow gets a
 * hint by being named, which is a thing it has to be anyway.
 *
 * IT CANCELS THE PRESS IT RODE IN ON. Reading what a button is must never be
 * the same gesture as pressing it - holding "deal a page" to remember what it
 * does and getting a new page is the exact opposite of an answer. Clicks are
 * swallowed in the capture phase, which is ahead of React's own root handler;
 * the controls that act on pointerup rather than click ask `suppressing()`
 * themselves, since nothing outside them can intercept a handler they run
 * directly.
 *
 * NOT ONLY DURING THE TOUR. It was asked for as something the tutorial turns
 * on, and it is always on instead: a guided tour is cards you see once on your
 * first visit, and the question this answers - "which of these two is the
 * sphere" - is one you have three weeks later. A gesture that only works
 * inside a mode you have already left is a gesture nobody finds.
 */

/**
 * The same hold the scene uses to take a second thing into the hand - and now
 * the same hold that opens a control's own settings, which is why it is
 * exported. A control that does something on a hold must not also answer a
 * question on one, and the two have to agree about how long a hold is.
 */
export const HOLD_MS = 450;

/**
 * Whether a hint has just fired, so the control under it does not also act.
 *
 * Module state rather than React state: `useScrub` and the tone controls read
 * this inside a pointer handler, where a re-render is both too late and too
 * expensive. Cleared a beat after the release, because the click that has to
 * be swallowed arrives after the pointerup that ends the hold.
 */
let armed = false;
const watching = new Set<() => void>();

export const suppressing = () => armed;

const setArmed = (next: boolean) => {
  if (armed === next) return;
  armed = next;
  watching.forEach((tell) => tell());
};

/**
 * The same fact, for anything that has to RE-RENDER on it rather than read it
 * inside a handler.
 *
 * The Scrub is the case: it puts its own reading in a bubble over the control
 * while a thumb is down, and a hold puts a name in a bubble over the same
 * control - two labels stacked on one button, both true, neither readable. The
 * hint is the one that was asked for, so the reading stands down while it is
 * up. Same shape as lib/rail.ts, and for the same reason: module state that
 * React has to see.
 */
export const useHinting = () =>
  useSyncExternalStore(
    (tell: () => void) => {
      watching.add(tell);
      return () => watching.delete(tell);
    },
    suppressing,
    suppressing
  );

interface Showing {
  text: string;
  /** Where the control is, so the bubble can sit over the middle of it. */
  x: number;
  y: number;
}

export const Hints: React.FC = () => {
  const dark = useStore((s) => s.theme) === 'dark';
  const [showing, setShowing] = useState<Showing | null>(null);
  const timer = useRef<number | null>(null);
  /** Where the finger landed, so movement can call the press a drag. */
  const from = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const drop = () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };

    const down = (event: PointerEvent) => {
      drop();
      const target = (event.target as HTMLElement | null)?.closest?.('[aria-label]');
      if (!target) return;
      const text = hintFor(target.getAttribute('aria-label'));
      if (!text) return;
      from.current = { x: event.clientX, y: event.clientY };
      timer.current = window.setTimeout(() => {
        timer.current = null;
        const rect = target.getBoundingClientRect();
        // Above the control and centred on it: the thumb is on the control,
        // and a label under the thumb is a label nobody can read.
        setShowing({ text, x: rect.left + rect.width / 2, y: rect.top - 10 });
        setArmed(true);
      }, HOLD_MS);
    };

    /*
     * A press that moves is a drag, and a drag is not a question.
     *
     * Half the controls in this app are dragged rather than tapped - the lens,
     * the eye level, every tone - and a slow one starts with a finger sitting
     * still on the glass for a beat. Without this, taking the lens gently from
     * 210 to 90 would put a label over the control you are in the middle of
     * using. Nine pixels is the same slop the scene's own tap uses.
     */
    const move = (event: PointerEvent) => {
      if (timer.current === null) return;
      if (Math.hypot(event.clientX - from.current.x, event.clientY - from.current.y) > 9) drop();
    };

    const up = () => {
      drop();
      if (!armed) return;
      setShowing(null);
      // After the click that this press is about to produce, not before it.
      window.setTimeout(() => setArmed(false), 0);
    };

    /** The press that opened a hint does nothing else. */
    const swallow = (event: MouseEvent) => {
      if (!armed) return;
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener('pointerdown', down, true);
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
    window.addEventListener('click', swallow, true);
    return () => {
      drop();
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
      window.removeEventListener('click', swallow, true);
    };
  }, []);

  if (!showing) return null;

  return (
    <div
      role="status"
      className={`fixed z-[70] -translate-x-1/2 -translate-y-full pointer-events-none max-w-[15rem] text-center !whitespace-normal ${bubble(dark)}`}
      style={{ left: Math.round(showing.x), top: Math.round(showing.y) }}
    >
      {showing.text}
    </div>
  );
};
