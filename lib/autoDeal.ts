import { useEffect } from 'react';
import { useStore } from '../store';
import { railHeld } from './rail';

/**
 * The deck deals itself, once in a while, when nobody is watching the panel.
 *
 * THERE WAS A BUTTON FOR THIS AND IT WAS THE WRONG SHAPE FOR WHAT IT DID.
 *
 * The argument for the deck is in lib/presets.ts and it has not changed:
 * everything in this tool is a knob, a tool that is all knobs is a tool nobody
 * sees the range of, and most of what this material can do lives in
 * combinations that take a minute to find and a second to lose. A dealt page
 * is the fastest way to learn what the knobs are FOR.
 *
 * But that argument is about somebody who does not yet know the knobs exist,
 * and it was answered with a control in the fourth row of a menu two taps
 * down - which is to say, with a control that only somebody who already knew
 * the knobs would ever find. Everybody it was for pressed it zero times, and
 * everybody it was not for pressed it once, wondered what had happened to
 * their page, and did not press it again.
 *
 * So it deals itself. Not while you are working - that would be the tool
 * changing the drawing under your hand, which is the one thing it must never
 * do - but in the gaps: put the phone down, look at the model, come back, and
 * it is the same scene from the same place drawn a different way. Which is
 * exactly the comparison the deck was always for, arriving when it is a
 * comparison rather than an interruption.
 *
 * WHAT IT WILL NOT TOUCH. Nothing in the scene and nothing about where you are
 * standing: the deal is only how the thing in front of you is DRAWN. It takes
 * a history step like any other page change, so one press of undo puts back
 * the rungs it moved.
 */

/** How long between deals, and how still it has to be before one lands. */
const EVERY = 4 * 60 * 1000;
const IDLE = 45 * 1000;

/**
 * The seam that keeps the deck under test now that there is no button.
 *
 * The same shape as the opening page's own pin in store.ts, and there for the
 * same reason: the suite runs against a production build with no handle on the
 * store, so anything it needs to drive has to be drivable from outside. Four
 * settings, and the app's own behaviour is the one with nothing written here.
 *
 *   (absent)  deal on the cadence above
 *   'off'     never deal
 *   'now'     deal on the next beat, then go quiet - one step, on demand
 *   a number  that many milliseconds between deals
 */
const TUNING_KEY = 'kjg-perspective-deal';

/** How often the conditions above are checked. Cheap: two numbers and a read. */
const BEAT = 500;

const tuning = (): string | null => {
  try {
    return localStorage.getItem(TUNING_KEY);
  } catch {
    return null;
  }
};

export const useAutoDeal = () => {
  useEffect(() => {
    let touched = Date.now();
    let dealt = Date.now();

    const stir = () => {
      touched = Date.now();
    };

    // Capture, so a press inside a panel that stops the event still counts as
    // somebody being here - which is the whole of what this is measuring.
    const options = { capture: true, passive: true } as const;
    window.addEventListener('pointerdown', stir, options);
    window.addEventListener('pointermove', stir, options);
    window.addEventListener('wheel', stir, options);
    window.addEventListener('keydown', stir, options);

    const beat = window.setInterval(() => {
      const setting = tuning();
      if (setting === 'off') return;

      const asked = setting === 'now';
      if (!asked) {
        const every = Number(setting);
        const wait = Number.isFinite(every) && every > 0 ? every : EVERY;
        // Every reason not to deal, in the order they are cheapest to check.
        if (document.visibilityState !== 'visible') return;
        if (Date.now() - dealt < wait) return;
        if (Date.now() - touched < IDLE) return;
        // A panel is open or a lesson is running: somebody is mid-decision,
        // and a page dealt over an open panel changes every reading in it.
        if (railHeld()) return;
      }

      dealt = Date.now();
      useStore.getState().shufflePreset();
      if (asked) {
        try {
          localStorage.setItem(TUNING_KEY, 'off');
        } catch {
          // Nothing to do: the caller asked for one deal and got one.
        }
      }
    }, BEAT);

    return () => {
      window.removeEventListener('pointerdown', stir, options);
      window.removeEventListener('pointermove', stir, options);
      window.removeEventListener('wheel', stir, options);
      window.removeEventListener('keydown', stir, options);
      window.clearInterval(beat);
    };
  }, []);
};
