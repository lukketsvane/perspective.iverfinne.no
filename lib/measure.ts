import { useSyncExternalStore } from 'react';

/**
 * The pencil at arm's length.
 *
 * Every artist measures the world the same way: a pencil held up, one eye
 * shut, thumb slid down the shaft - and what that gesture actually reads is
 * VISUAL ANGLE, the one measure sight has. "The car is three of its own
 * heights long" is a statement about angles, and learning to take it by eye
 * is the skill under every other perspective skill.
 *
 * A measure here is two directions from the eye, laid down by a drag; the
 * span between them is the angle, in degrees, written at the line. Measures
 * are directions in the WORLD, so they stay pinned to what they measured
 * while you look around - and they are a reading of the view, not part of
 * the composition: never saved, never undone, cleared when the instrument
 * is put down.
 *
 * Kept out here rather than in the scene store for the same reason the rail
 * is: a drag writes sixty times a second, and nothing about a measurement
 * belongs in the thing every undo step snapshots.
 */

export interface Measure {
  a: [number, number, number];
  b: [number, number, number];
  deg: number;
  /**
   * The two ends as places, when the drag actually landed on something.
   *
   * The angle is the reading this instrument is for, and it is available
   * everywhere - every direction from the eye hits something, even if that
   * something is the sky. A distance is not: it needs both ends to be *at*
   * a point in the world, which means both had to meet an object or the
   * floor. When they did, the straight-line metres between them is worth
   * having - blocking a real place out is a conversation about how far one
   * thing is from another - and when they did not, there is no number to
   * make up and the measure is the angle alone.
   */
  from?: [number, number, number];
  to?: [number, number, number];
  metres?: number;
}

type Listener = () => void;
const listeners = new Set<Listener>();

let list: Measure[] = [];
let live: Measure | null = null;
let snapshot = { list, live };

const publish = () => {
  snapshot = { list, live };
  listeners.forEach((l) => l());
};

const degBetween = (a: [number, number, number], b: [number, number, number]) => {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  return (Math.acos(dot) * 180) / Math.PI;
};

const spanBetween = (
  a: [number, number, number] | undefined,
  b: [number, number, number] | undefined
) =>
  a && b ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) : undefined;

export const beginMeasure = (dir: [number, number, number], at?: [number, number, number]) => {
  live = { a: dir, b: dir, deg: 0, from: at, to: at, metres: 0 };
  publish();
};

export const updateMeasure = (dir: [number, number, number], at?: [number, number, number]) => {
  if (!live) return;
  live = {
    ...live,
    b: dir,
    deg: degBetween(live.a, dir),
    to: at,
    metres: spanBetween(live.from, at),
  };
  publish();
};

/** Lift the pencil: below half a degree it was a tap, not a measurement. */
export const endMeasure = () => {
  if (live && live.deg >= 0.5) list = [...list, live];
  live = null;
  publish();
};

export const clearMeasures = () => {
  list = [];
  live = null;
  publish();
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const read = () => snapshot;

export const useMeasures = () => useSyncExternalStore(subscribe, read, read);
