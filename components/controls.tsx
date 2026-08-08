import React, { useRef } from 'react';
import { Icon } from './icons';
import { useStore } from '../store';

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
export const useGrayThemeControl = (onDoubleTap?: () => void) => {
  const value = useStore((state) => state.backgroundGray);
  const setValue = useStore((state) => state.setBackgroundGray);
  const toggle = useStore((state) => state.toggleTheme);
  const drag = useRef<{ id: number; x: number; y: number; from: number; moved: boolean } | null>(null);
  const lastTap = useRef(0);
  const tapTimer = useRef<number | undefined>(undefined);

  return {
    onPointerDown: (event: React.PointerEvent) => {
      event.stopPropagation();
      try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); } catch { /* continue uncaptured */ }
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, from: value, moved: false };
    },
    onPointerMove: (event: React.PointerEvent) => {
      const held = drag.current;
      if (held?.id !== event.pointerId) return;
      const travel = event.clientX - held.x + (held.y - event.clientY);
      if (Math.abs(travel) > 3) held.moved = true;
      if (held.moved) setValue(held.from + travel);
    },
    onPointerUp: (event: React.PointerEvent) => {
      const held = drag.current;
      drag.current = null;
      if (held?.id !== event.pointerId || held.moved) return;
      const now = performance.now();
      if (onDoubleTap && now - lastTap.current < 300) {
        if (tapTimer.current !== undefined) window.clearTimeout(tapTimer.current);
        tapTimer.current = undefined;
        lastTap.current = 0;
        onDoubleTap();
        return;
      }
      lastTap.current = now;
      // Wait briefly before applying the single tap so a double tap changes
      // only the environment and does not flash the light/dark theme twice.
      tapTimer.current = window.setTimeout(() => {
        tapTimer.current = undefined;
        lastTap.current = 0;
        toggle();
      }, onDoubleTap ? 300 : 0);
    },
    onPointerCancel: () => { drag.current = null; },
  };
};

/**
 * The room's own control: tap to put it up or take it down, drag to size it.
 *
 * The same shape as the light/dark button, and for the same reason - there is
 * no toolbar room for a second control and no words to label one with, so the
 * mark that says whether a thing is there is also the mark that says how big.
 * Across is the floor, up and down is the ceiling, which is the arrangement of
 * the room itself: pulling the walls apart is a sideways movement and raising
 * the ceiling is not.
 *
 * Both at once on purpose. What a room teaches is the ratio between the two,
 * and finding a ratio by setting one number and then the other is a slower way
 * of doing what one diagonal drag does.
 */
const FLOOR_RATE = 0.06; // metres per pixel across
const CEILING_RATE = 0.02; // metres per pixel up

export const useRoomControl = () => {
  const room = useStore((state) => state.room);
  const setRoom = useStore((state) => state.setRoom);
  const toggleRoom = useStore((state) => state.toggleRoom);
  const showRoom = useStore((state) => state.showRoom);
  const drag = useRef<{ id: number; x: number; y: number; from: { floor: number; height: number }; moved: boolean } | null>(null);
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
        if (!held.moved && Math.hypot(across, up) < 4) return;
        if (!held.moved) {
          held.moved = true;
          setSizing(true);
          // Sizing a room you cannot see is a control with no feedback.
          if (!showRoom) toggleRoom();
        }
        setRoom({
          floor: held.from.floor + across * FLOOR_RATE,
          height: held.from.height + up * CEILING_RATE,
        });
      },
      onPointerUp: (event: React.PointerEvent) => {
        const held = drag.current;
        drag.current = null;
        setSizing(false);
        if (held?.id === event.pointerId && !held.moved) toggleRoom();
      },
      onPointerCancel: () => {
        drag.current = null;
        setSizing(false);
      },
    },
  };
};

const useScrub = (
  { value, min, max, step, cycle, wrap, sweep = SWEEP, onChange }: DraggableNumber,
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
      if (Math.abs(travel) > 3) held.moved = true;
      if (!held.moved) return;
      onChange(settle(held.from + (travel / sweep) * (max - min)));
    },
    onPointerUp: (e: React.PointerEvent) => {
      const held = drag.current;
      drag.current = null;
      if (held?.id !== e.pointerId || held.moved || !cycle?.length) return;
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
  const { skin, icon, label, reading } = props;
  const [active, setActive] = React.useState(false);

  const wrapHandlers = {
    onPointerDown: (e: React.PointerEvent) => { setActive(true); handlers.onPointerDown(e); },
    onPointerMove: handlers.onPointerMove,
    onPointerUp: (e: React.PointerEvent) => { setActive(false); handlers.onPointerUp(e); },
    onPointerCancel: () => { setActive(false); handlers.onPointerCancel(); },
  };

  return (
    <div className="relative flex justify-center items-center">
      <button
        className={`flex items-center justify-center w-11 h-11 rounded-full touch-none cursor-ew-resize border transition-colors ${surface(skin)}`}
        aria-label={label}
        {...wrapHandlers}
      >
        <span className={`${skin.dark ? 'text-white' : 'text-gray-900'} active:scale-95 transition-transform`}>
          <Icon path={icon} className="w-5 h-5" />
        </span>
      </button>
      {active && (
        <div className={`absolute -top-12 px-3 py-1 rounded-full text-xs font-bold tabular-nums border shadow-xl ${
          skin.dark ? 'bg-neutral-950/95 text-white border-white/20' : 'bg-white/95 text-black border-black/10'
        }`}>
          {reading}
        </div>
      )}
    </div>
  );
};
