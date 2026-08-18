import React, { useRef } from 'react';
import { Icon } from './icons';
import { useStore } from '../store';
import { ACTIVE, bubble } from './ui';
import { HOLD_MS, suppressing, useHinting } from './Hints';
import type { RoomSize } from '../types';

/**
 * The panel's controls.
 *
 * These live at module level, and that is not a matter of tidiness. Declared
 * inside the panel's own body - which is where they started - every store
 * change made React see a brand new component *type* and throw the existing
 * DOM away to build it again. Mid-drag that destroys the element holding the
 * pointer capture, so the moves stop arriving and the value lurches from
 * whatever did get through. That was the jitter: not the arithmetic, the
 * remounting.
 */

export interface Skin {
  dark: boolean;
  /** Bigger targets for fingers. */
  touch: boolean;
}

const surface = (skin: Skin) =>
  skin.dark ? 'bg-white/10 border-white/20' : 'bg-black/5 border-gray-300';

interface DraggableNumber {
  skin: Skin;
  icon: React.ReactNode;
  /**
   * Whether the glyph carries the app's one accent.
   *
   * For a state the number itself cannot say. The lens is the case it was
   * added for: 210 and 270 are two numbers a digit apart to look at, and the
   * difference between them is that one of them is a view a person could be
   * standing in and the other is a drawing convention. The colour says which,
   * at rest, without a word on screen.
   */
  accent?: boolean;
  label: string;
  reading: string;
  value: number;
  min: number;
  max: number;
  /**
   * What the value is rounded to. Keep it fine: this is a display decision,
   * and a coarse one shows up as the number hopping while the finger glides.
   */
  step: number;
  /** Values a tap steps through, in order. */
  cycle?: number[];
  /**
   * Called once, as a drag becomes a drag.
   *
   * For taking a single history step across a whole drag: the change itself is
   * written on every frame, and something that wants one step rather than two
   * hundred needs a moment that happens exactly once. Fired at the same
   * threshold that starts the change, so a tap that never moves takes no step.
   */
  onFirstChange?: () => void;
  /** True for an angle, where the top of the range meets the bottom. */
  wrap?: boolean;
  /**
   * How far the finger travels to cross the whole range, in pixels.
   *
   * A control whose range grows and whose sweep does not gets coarser, which is
   * a bad trade when the extra range is at one end and everything anyone does
   * lives at the other. Pointer capture means a sweep longer than the screen is
   * not a sweep you cannot make - it is two.
   */
  sweep?: number;
  onChange: (v: number) => void;
}

const SWEEP = 220;

/**
 * Pointer handling for every light/dark button. A tap still flips between the
 * endpoints; dragging right/up scrubs the scene background through all 256
 * neutral values. Keeping this on the existing toggle means it needs no extra
 * toolbar space, and pointer capture makes the full range available even from
 * a small icon button.
 */
/**
 * The page behind the drawing: tap to step it, drag to set its tone.
 *
 * Same shape as the sheet's own control below, and deliberately so - the two
 * decide the two halves of what you are looking at, so they are worked the
 * same way. Three taps round the presentations that matter (continuous with
 * the sheet, mounted on black, mounted on white); a drag reaches every tone
 * between.
 */
export const useBackdropControl = () => {
  const backdrop = useStore((state) => state.backdrop);
  const setBackdrop = useStore((state) => state.setBackdrop);
  const cycle = useStore((state) => state.cycleBackdrop);
  const drag = useRef<{ id: number; x: number; y: number; from: number; moved: boolean } | null>(null);

  return {
    onPointerDown: (event: React.PointerEvent) => {
      event.stopPropagation();
      try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); } catch { /* continue uncaptured */ }
      // Dragging from the sheet's own rung starts where the sheet is, so the
      // first pixel of travel does not jump the page somewhere else.
      const from = backdrop === 'paper' ? useStore.getState().backgroundGray : backdrop;
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, from, moved: false };
    },
    onPointerMove: (event: React.PointerEvent) => {
      const held = drag.current;
      if (held?.id !== event.pointerId) return;
      const travel = travelled(event, held);
      if (travel !== 0) held.moved = true;
      if (held.moved) setBackdrop(held.from + travel);
    },
    onPointerUp: (event: React.PointerEvent) => {
      const held = drag.current;
      drag.current = null;
      // A press long enough to have opened a hint was a question, not a tap.
      if (held?.id !== event.pointerId || held.moved || suppressing()) return;
      cycle();
    },
    onPointerCancel: () => {
      drag.current = null;
    },
  };
};

/**
 * The floor: tap it on and off, drag it from black through to white.
 *
 * The same one-control-two-gestures the page behind the drawing already uses,
 * for the same reason - a band with room for six things should not spend two of
 * them on whether a plane exists and what tone it is.
 */
/**
 * How far a tone drag has travelled, past the dead zone rather than including it.
 *
 * The three tone controls - the mount, the paper and the floor - all take one
 * unit per pixel in either of two directions, and all three ignored the first
 * few pixels so that a tap is a tap. They ignored them for the DECISION and
 * then applied them anyway: the moment travel passed three, the value jumped by
 * four. Dragging the floor down from 102 the reading went 102, 98, 97 - and 99,
 * 100 and 101 could not be landed on at all, from either side, by anyone.
 *
 * Subtracting the threshold back out makes the first applied change zero, so
 * the value comes off its starting point smoothly and every number in the range
 * is reachable. The dead zone still does its job; it just no longer charges for
 * itself.
 */
const DEAD_ZONE = 3;

const travelled = (event: React.PointerEvent, held: { x: number; y: number }) => {
  const raw = event.clientX - held.x + (held.y - event.clientY);
  if (Math.abs(raw) <= DEAD_ZONE) return 0;
  return raw - Math.sign(raw) * DEAD_ZONE;
};

export const useGroundControl = () => {
  const ground = useStore((state) => state.ground);
  const setTone = useStore((state) => state.setGroundTone);
  const toggle = useStore((state) => state.toggleGround);
  const drag = useRef<{ id: number; x: number; y: number; from: number; moved: boolean } | null>(null);

  return {
    onPointerDown: (event: React.PointerEvent) => {
      event.stopPropagation();
      try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); } catch { /* continue uncaptured */ }
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, from: ground.tone, moved: false };
    },
    onPointerMove: (event: React.PointerEvent) => {
      const held = drag.current;
      if (held?.id !== event.pointerId) return;
      const travel = travelled(event, held);
      if (travel !== 0) held.moved = true;
      if (held.moved) setTone(held.from + travel);
    },
    onPointerUp: (event: React.PointerEvent) => {
      const held = drag.current;
      drag.current = null;
      // A press long enough to have opened a hint was a question, not a tap.
      if (held?.id !== event.pointerId || held.moved || suppressing()) return;
      toggle();
    },
    onPointerCancel: () => {
      drag.current = null;
    },
  };
};

/**
 * The sheet: tap it between the ends of the tone ramp, drag it anywhere
 * between.
 *
 * IT USED TO CARRY A SECOND GESTURE. A double tap armed the sky - the whole
 * procedural atmosphere, on a hidden second press of a control about how light
 * the paper is. Two things were wrong with that and only one of them was
 * discoverability. The other was the delay it cost: a single tap could not be
 * acted on until 300 ms had passed without a second one, so the ONE gesture
 * this control is for was a third of a second late, every time, to leave room
 * for a gesture almost nobody made.
 *
 * The sky is in the light panel now, next to the sun, with the hour and the
 * weather that make it mean something. This is a tap again.
 */
export const useGrayThemeControl = () => {
  const value = useStore((state) => state.backgroundGray);
  const setValue = useStore((state) => state.setBackgroundGray);
  const toggle = useStore((state) => state.toggleTheme);
  const drag = useRef<{ id: number; x: number; y: number; from: number; moved: boolean } | null>(null);

  return {
    onPointerDown: (event: React.PointerEvent) => {
      event.stopPropagation();
      try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); } catch { /* continue uncaptured */ }
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, from: value, moved: false };
    },
    onPointerMove: (event: React.PointerEvent) => {
      const held = drag.current;
      if (held?.id !== event.pointerId) return;
      const travel = travelled(event, held);
      if (travel !== 0) held.moved = true;
      if (held.moved) setValue(held.from + travel);
    },
    onPointerUp: (event: React.PointerEvent) => {
      const held = drag.current;
      drag.current = null;
      // A press long enough to have opened a hint was a question, not a tap.
      if (held?.id !== event.pointerId || held.moved || suppressing()) return;
      toggle();
    },
    onPointerCancel: () => { drag.current = null; },
  };
};

/**
 * A seat with a drawer under it: tap to step it, hold to open what is inside.
 *
 * TWO SEATS BECAME ONE. The surface and the surface's own settings were a
 * button each, side by side, in the two places this app asks "what is this
 * drawn with" - the panel band for the page and the bar for the thing in your
 * hand. They read as two decisions and they are one: the second is a drawer in
 * the first, it only exists on the rungs that have anything to set, and a band
 * that vanishes and reappears a seat wider as you step through the ladder is a
 * band whose controls move under your thumb.
 *
 * So it is one seat. Tap steps the ladder as it always did; hold opens the
 * drawer. Which costs the hold this control used to answer a question with -
 * see components/Hints.tsx - and that is the right trade twice over: the
 * drawer is a better answer to "what is this" than two words in a bubble, and
 * a control whose hold does something must not also be a control whose hold
 * explains something. There is no hint on this label for exactly that reason.
 *
 * Everything is on the pointer rather than on click, because the hold has to
 * fire while the finger is still down - a drawer that opens on release is a
 * drawer you have to guess the length of.
 */
export const useHoldable = ({
  onTap,
  onHold,
}: {
  onTap: () => void;
  /** Absent on the rungs with nothing to set, where the hold is just a tap. */
  onHold?: () => void;
}) => {
  const held = useRef<{ id: number; x: number; y: number; timer: number; fired: boolean } | null>(
    null
  );

  const stop = () => {
    if (held.current) window.clearTimeout(held.current.timer);
    held.current = null;
  };

  return {
    onPointerDown: (event: React.PointerEvent) => {
      event.stopPropagation();
      try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); } catch { /* continue uncaptured */ }
      const timer = window.setTimeout(() => {
        const press = held.current;
        if (!press) return;
        press.fired = true;
        onHold?.();
      }, HOLD_MS);
      held.current = { id: event.pointerId, x: event.clientX, y: event.clientY, timer, fired: false };
    },
    onPointerMove: (event: React.PointerEvent) => {
      const press = held.current;
      if (press?.id !== event.pointerId || press.fired) return;
      // The same nine pixels of slop the scene's own tap allows: a finger
      // resting still is a hold, a finger that travels was going somewhere.
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 9) stop();
    },
    onPointerUp: (event: React.PointerEvent) => {
      const press = held.current;
      stop();
      if (press?.id !== event.pointerId || press.fired || suppressing()) return;
      onTap();
    },
    onPointerCancel: stop,
  };
};

/**
 * The room's own control: tap to put it up or take it down, drag to size it.
 *
 * The same shape as the light/dark button, and for the same reason - there is
 * no toolbar room for a second control and no words to label one with, so the
 * mark that says whether a thing is there is also the mark that says how big.
 *
 * It is the floor that is dragged, on both of its axes at once: across for the
 * length running away from you, up and down for the width running across. One
 * diagonal drag finds a proportion, which is the thing being set - a corridor,
 * a square studio and a wide shallow hall are three different exercises, and
 * setting one number and then the other is a slower way of arriving at the same
 * place. The ceiling stays where it is; three metres is a ceiling.
 *
 * Continuous, not stepped: a room is set by eye against what is standing in it,
 * and a control that jumps under the thumb is a control fighting the eye.
 */
const ROOM_RATE = 0.06; // metres per pixel, both ways

export const useRoomControl = () => {
  const room = useStore((state) => state.room);
  const setRoom = useStore((state) => state.setRoom);
  const cycleRoom = useStore((state) => state.cycleRoom);
  const roomLevel = useStore((state) => state.roomLevel);
  const drag = useRef<{ id: number; x: number; y: number; from: RoomSize; moved: boolean } | null>(null);
  const [sizing, setSizing] = React.useState(false);

  return {
    sizing,
    handlers: {
      onPointerDown: (event: React.PointerEvent) => {
        event.stopPropagation();
        try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); } catch { /* continue uncaptured */ }
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, from: { ...room }, moved: false };
      },
      onPointerMove: (event: React.PointerEvent) => {
        const held = drag.current;
        if (held?.id !== event.pointerId) return;
        const across = event.clientX - held.x;
        const up = held.y - event.clientY;
        // Nine pixels, the same as a tap on the scene. A four-pixel threshold
        // meant a wobble on a tap intended to put the room away instead kept
        // it up, forced it on if it was off, and resized it.
        if (!held.moved && Math.hypot(across, up) < 9) return;
        if (!held.moved) {
          held.moved = true;
          setSizing(true);
          // Sizing a room you cannot see is a control with no feedback.
          // Sizing a room you cannot see is sizing nothing. A drag from off
          // raises the LINES rather than the walls: it is what you need to see
          // to size it, and it is the rung nobody would otherwise find.
          if (roomLevel === 0) useStore.setState({ roomLevel: 1 });
        }
        setRoom({
          width: held.from.width + up * ROOM_RATE,
          depth: held.from.depth + across * ROOM_RATE,
        });
      },
      onPointerUp: (event: React.PointerEvent) => {
        const held = drag.current;
        drag.current = null;
        setSizing(false);
        if (held?.id === event.pointerId && !held.moved && !suppressing()) cycleRoom();
      },
      onPointerCancel: () => {
        drag.current = null;
        setSizing(false);
      },
    },
  };
};

const useScrub = (
  { value, min, max, step, cycle, wrap, sweep = SWEEP, onChange, onFirstChange }: DraggableNumber,
  axis: 'x' | 'both'
) => {
  const drag = useRef<{ id: number; x: number; y: number; from: number; moved: boolean } | null>(null);

  const settle = (v: number) => {
    const snapped = Math.round(v / step) * step;
    if (wrap) return ((snapped % max) + max) % max;
    return Math.min(max, Math.max(min, snapped));
  };

  return {
    onPointerDown: (e: React.PointerEvent) => {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* not capturable; the element still sees the moves */
      }
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: value, moved: false };
    },
    onPointerMove: (e: React.PointerEvent) => {
      const held = drag.current;
      if (held?.id !== e.pointerId) return;
      const travel =
        axis === 'x' ? e.clientX - held.x : e.clientX - held.x + (held.y - e.clientY);
      if (Math.abs(travel) > 3 && !held.moved) {
        held.moved = true;
        onFirstChange?.();
      }
      if (!held.moved) return;
      onChange(settle(held.from + (travel / sweep) * (max - min)));
    },
    onPointerUp: (e: React.PointerEvent) => {
      const held = drag.current;
      drag.current = null;
      if (held?.id !== e.pointerId || held.moved || !cycle?.length || suppressing()) return;
      // A tap steps to the next preset up, and round to the bottom again.
      onChange(cycle.find((v) => v > value + 0.001) ?? cycle[0]);
    },
    onPointerCancel: () => {
      drag.current = null;
    },
  };
};

/**
 * A number you drag.
 *
 * A row of preset buttons with a slider under it was two controls and a whole
 * row of chrome to say one thing. This is the thing itself: the reading is the
 * control. Drag it for any value, tap it to step round the presets - what the
 * buttons were for. A slider cannot land on 1.90 exactly; this cannot miss it.
 */
export const Scrub: React.FC<DraggableNumber> = (props) => {
  const handlers = useScrub(props, 'x');
  const { skin, icon, label, reading, accent } = props;
  const [active, setActive] = React.useState(false);
  // A hold over this control is a question about what it is, and the answer is
  // already in a bubble over it - see components/Hints.tsx.
  const hinting = useHinting();

  const wrapHandlers = {
    onPointerDown: (e: React.PointerEvent) => { setActive(true); handlers.onPointerDown(e); },
    onPointerMove: handlers.onPointerMove,
    onPointerUp: (e: React.PointerEvent) => { setActive(false); handlers.onPointerUp(e); },
    onPointerCancel: () => { setActive(false); handlers.onPointerCancel(); },
  };

  return (
    <div className="relative flex justify-center items-center">
      <button
        // Forty below 430 px, like ui.ts's iconButton and for its reason: the
        // dock carries eight controls again, and two knobs that refuse to
        // shrink with their six neighbours are the two that fold the row.
        className={`flex items-center justify-center w-11 max-[429px]:w-10 h-11 rounded-full touch-none cursor-ew-resize border transition-colors ${surface(skin)}`}
        aria-label={label}
        {...wrapHandlers}
      >
        <span
          className={`${
            accent ? ACTIVE : skin.dark ? 'text-white' : 'text-gray-900'
          } active:scale-95 transition-transform`}
        >
          <Icon path={icon} className="w-5 h-5" />
        </span>
      </button>
      {active && !hinting && (
        <div className={`absolute -top-12 ${bubble(skin.dark)}`}>
          {reading}
        </div>
      )}
    </div>
  );
};
