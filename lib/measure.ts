import { useSyncExternalStore } from 'react';

/**
 * The tape, laid on the scene and left there.
 *
 * A measure is TWO PLACES IN THE ROOM and the straight-line metres between
 * them. Drag from one thing to another and the mark stays where you put it -
 * walk round it, kneel to it, open the lens right out, and it is still lying
 * between the same two points, because that is what it is anchored to.
 *
 * IT USED TO BE TWO DIRECTIONS FROM THE EYE, and that is why it used to be
 * wiped every time the instrument went down. A direction from the eye is only
 * a fact about where you were standing: turn your head and the mark stays put,
 * take one step and it is a lie, pointing at nothing it was ever about. A
 * reading like that cannot be left lying in a scene, so it was not - and what
 * was lost with it was the whole use of measuring, which is to mark a distance
 * out and then draw against it.
 *
 * Anchoring at the two ENDS instead costs one thing and it is worth saying
 * plainly: a measure now needs both ends to land on something. Every direction
 * from the eye hits something, even if that something is the sky; a place does
 * not exist until the drag meets an object or the floor. A stroke that starts
 * in the air lays nothing.
 *
 * The visual angle is not gone - see components/Measures.tsx. It is asked of
 * the eye on the frame it is drawn rather than stored, because it is a
 * different number from every place you could stand, which is the same fact
 * that made it the wrong thing to anchor to.
 *
 * STILL OUT HERE rather than in the scene store, and for the same two reasons
 * the rail is: a drag writes sixty times a second and nothing about it belongs
 * in the thing every undo step snapshots, and these are marks you take to read
 * the place rather than part of the composition - not undone, not exported.
 * They last as long as the session or until the tape is reset, which is a
 * double tap with the instrument in your hand.
 */

type Vec3 = [number, number, number];

export interface Measure {
  /** Where the drag started, in metres. */
  from: Vec3;
  /** Where it ended. */
  to: Vec3;
  /** The straight line between them, in metres. */
  metres: number;
}

/** Under two centimetres it was a tap, or a slip, and not a measurement. */
const SHORTEST = 0.02;

type Listener = () => void;
const listeners = new Set<Listener>();

let list: Measure[] = [];
let live: Measure | null = null;
let snapshot = { list, live };

const publish = () => {
  snapshot = { list, live };
  listeners.forEach((l) => l());
};

const spanBetween = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * The angle two places subtend at a third - the reading the pencil at arm's
 * length takes, and the only unit sight has.
 *
 * Given rather than stored, because it belongs to where you are standing. Walk
 * towards a marked span and the number grows; that is not the mark changing,
 * it is the thing the pencil measures being what it is.
 */
export const subtended = (from: Vec3, to: Vec3, eye: { x: number; y: number; z: number }) => {
  const a = [from[0] - eye.x, from[1] - eye.y, from[2] - eye.z];
  const b = [to[0] - eye.x, to[1] - eye.y, to[2] - eye.z];
  const la = Math.hypot(a[0], a[1], a[2]);
  const lb = Math.hypot(b[0], b[1], b[2]);
  if (la < 1e-6 || lb < 1e-6) return 0;
  const cos = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
};

/**
 * Put the end of the tape down - if there is anything to put it down ON.
 *
 * Called for every stroke the instrument takes, including the ones that begin
 * on the sky: those lay nothing, and say so by leaving the live measure empty.
 * The stroke is still the instrument's, though, which is what makes a tap on
 * nothing a tap the double-tap can count.
 */
export const beginMeasure = (at?: Vec3) => {
  live = at ? { from: at, to: at, metres: 0 } : null;
  publish();
};

export const updateMeasure = (at?: Vec3) => {
  // Off the end of the world mid-drag - across the sky, or past the edge of
  // the floor - holds the last place the tape reached rather than snapping it
  // back to nothing.
  if (!live || !at) return;
  live = { ...live, to: at, metres: spanBetween(live.from, at) };
  publish();
};

/** Lift the tape. Says whether it left a mark, which a tap does not. */
export const endMeasure = (): boolean => {
  const kept = live !== null && live.metres >= SHORTEST;
  if (kept && live) list = [...list, live];
  live = null;
  publish();
  return kept;
};

/** Roll the tape up: every mark in the scene, gone. */
export const clearMeasures = () => {
  if (list.length === 0 && live === null) return;
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
