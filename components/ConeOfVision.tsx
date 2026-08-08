import React, { useEffect, useRef, useState } from 'react';
import { projectView } from '../lib/pick';

/**
 * The field of view - the shape a pair of eyes actually has.
 *
 * Inside it a rectilinear projection matches what you see; outside it, squares
 * stretch and spheres go oval, and the classic perspective-drawing error is
 * placing the subject beyond it. It matters at least as much on a curved sheet,
 * where it is the line between the two systems: inside it, straight-line
 * perspective is honest and you can rule with a straight edge; outside it, the
 * bend is not a stylisation but the only truthful answer.
 *
 * It used to be a circle, thirty degrees off the axis all the way round, which
 * is what "the sixty degree cone" says and is not what anyone has. Two eyes are
 * side by side in a head with brows over them and cheeks under them, so the
 * field they share is a wide, slightly low oval: something over two hundred
 * degrees across, about a hundred and thirty from top to bottom, and more of
 * that below the line of sight than above it. That is why you notice movement
 * beside you and not above you, and it is the shape everything you have ever
 * seen arrived in.
 *
 * So it keeps the sixty degrees across, which is the number the drawing
 * convention is about and the one worth knowing, and takes its height and its
 * offset from the eyes. The result is not a cone at all - a cone would have to
 * come from one eye at the middle of a face - which is the point.
 *
 * Whatever the shape, it is asked of the projection in front of you rather than
 * worked out from a focal length: an oval on a flat frame, an oval of a
 * different size on an equidistant one, a fatter one on the unrolled cylinder,
 * each because that is what that projection does to this solid angle.
 */

/** Thirty degrees to either side: the sixty degree field, kept. */
const SIDE = Math.PI / 6;

/**
 * And what a face allows above and below it, in the same proportion the real
 * field has: about sixty degrees up against seventy-three down, over roughly
 * two hundred and ten across.
 */
const UP = SIDE * (2 * 0.64 * (60 / 133));
const DOWN = SIDE * (2 * 0.64 * (73 / 133));

/** How many places round it are asked about. */
const AROUND = 96;

/**
 * How far off the axis the edge lies in one direction round the frame.
 *
 * The polar form of an ellipse, with a different half-height above the line of
 * sight and below it. The two halves meet where the vertical term vanishes, so
 * the join is on the widest point of the oval and there is no corner in it.
 */
const halfAngleAt = (turn: number) => {
  const across = Math.cos(turn);
  const upward = Math.sin(turn);
  const vertical = upward > 0 ? UP : DOWN;
  return 1 / Math.hypot(across / SIDE, upward / vertical);
};

const outline = (): string | null => {
  const points: string[] = [];

  for (let i = 0; i < AROUND; i++) {
    const turn = (i / AROUND) * Math.PI * 2;
    const half = halfAngleAt(turn);
    const sin = Math.sin(half);
    const at = projectView(sin * Math.cos(turn), sin * Math.sin(turn), -Math.cos(half));
    if (!at) return null;
    points.push(`${at.x.toFixed(1)},${at.y.toFixed(1)}`);
  }

  return points.join(' ');
};

export const ConeOfVision: React.FC<{ color: string }> = ({ color }) => {
  const [shape, setShape] = useState<string | null>(null);
  const drawn = useRef<string | null>(null);

  /*
   * Watched rather than computed once: the cone is fixed to the frame, so it
   * does not move when you look around, but it does change with the lens, the
   * projection and the shape of the window - and none of those announce
   * themselves here. Ninety-six directions a frame is nothing, and the state is
   * only touched when the answer is different, so nothing re-renders while it
   * is standing still.
   */
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      const next = outline();
      if (next !== drawn.current) {
        drawn.current = next;
        setShape(next);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { running = false; };
  }, []);

  if (!shape) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
      width={window.innerWidth}
      height={window.innerHeight}
    >
      <polygon
        points={shape}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeDasharray="6 6"
        opacity={0.5}
      />
    </svg>
  );
};
