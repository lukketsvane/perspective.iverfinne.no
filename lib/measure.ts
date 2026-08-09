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

export const beginMeasure = (dir: [number, number, number]) => {
  live = { a: dir, b: dir, deg: 0 };
  publish();
};

export const updateMeasure = (dir: [number, number, number]) => {
  if (!live) return;
  live = { ...live, b: dir, deg: degBetween(live.a, dir) };
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
