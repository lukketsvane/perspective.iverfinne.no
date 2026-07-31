import React, { useRef } from 'react';
import { Icon } from './icons';

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
  skin.dark ? 'bg-black/40 border-white/15' : 'bg-black/5 border-black/10';

const filled = (skin: Skin) =>
  skin.dark ? 'bg-white text-black border-white' : 'bg-gray-900 text-white border-gray-900';

const idle = (skin: Skin) =>
  skin.dark ? 'bg-black/40 text-gray-400 border-white/15' : 'bg-black/5 text-gray-500 border-transparent';

/** A square icon control, filled in when it is on. */
export const Toggle: React.FC<{
  skin: Skin;
  on: boolean;
  onClick: () => void;
  path: React.ReactNode;
  label: string;
  className?: string;
}> = ({ skin, on, onClick, path, label, className = '' }) => (
  <button
    onClick={onClick}
    aria-label={label}
    aria-pressed={on}
    title={label}
    className={`flex items-center justify-center ${
      skin.touch ? 'w-10 h-10' : 'w-8 h-8'
    } rounded-lg border transition-colors ${on ? filled(skin) : idle(skin)} ${className}`}
  >
    <Icon path={path} className={skin.touch ? 'w-5 h-5' : 'w-[18px] h-[18px]'} />
  </button>
);

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
  onChange: (v: number) => void;
}

/** How far the finger travels to cross the whole range. */
const SWEEP = 220;

const useScrub = (
  { value, min, max, step, cycle, wrap, onChange }: DraggableNumber,
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
      onChange(settle(held.from + (travel / SWEEP) * (max - min)));
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

  return (
    <button
      // Over a black panel a black fill is invisible, so the affordance is a
      // hairline instead: it has to read as something you can take hold of.
      className={`flex-1 min-w-0 flex items-center gap-1.5 ${
        skin.touch ? 'h-10' : 'h-8'
      } px-2 rounded-lg touch-none cursor-ew-resize border ${surface(skin)}`}
      aria-label={label}
      title={label}
      {...handlers}
    >
      <span className={`shrink-0 ${skin.dark ? 'text-gray-500' : 'text-gray-400'}`}>
        <Icon path={icon} className="w-4 h-4" />
      </span>
      <span
        className={`flex-1 text-right text-[12px] font-black tabular-nums ${
          skin.dark ? 'text-white' : 'text-gray-900'
        }`}
      >
        {reading}
      </span>
    </button>
  );
};

/**
 * A square that reads a number and takes a drag.
 *
 * The grid version of Scrub: icon over value, sized like every other cell so a
 * column of them lines up. Drag in any direction - right and up raise it -
 * because in a grid there is no obvious axis.
 */
export const Cell: React.FC<DraggableNumber> = (props) => {
  const handlers = useScrub(props, 'both');
  const { skin, icon, label, reading } = props;

  return (
    <button
      className={`w-12 h-12 shrink-0 flex flex-col items-center justify-center gap-0.5 rounded-xl border touch-none ${
        skin.dark ? 'bg-black/40 border-white/15 text-white' : 'bg-black/5 border-black/10 text-gray-900'
      }`}
      aria-label={label}
      title={label}
      {...handlers}
    >
      <Icon path={icon} className="w-4 h-4 opacity-50" />
      <span className="text-[10px] font-black tabular-nums leading-none">{reading}</span>
    </button>
  );
};
