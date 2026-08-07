import React, { useEffect, useRef, useState } from 'react';
import { projectView } from '../lib/pick';

/**
 * The 60 degree cone of vision.
 *
 * Inside this circle a rectilinear projection matches what an eye actually
 * sees; outside it, squares stretch and spheres go oval - the classic
 * perspective-drawing error is placing the subject beyond it.
 *
 * It matters at least as much on a curved sheet, where it is the line between
 * the two systems: inside it, straight-line perspective is honest and you can
 * rule with a straight edge; outside it, the bend is not a stylisation but the
 * only truthful answer. Drawing it only on the flat side left the student
 * unable to see, on the sheet they were actually drawing on, where one stops
 * being the other.
 *
 * So it is not worked out from a focal length any more. It is thirty degrees
 * off the view axis, all the way round, asked of whichever projection is in
 * front of you: a circle on a flat frame, a circle of a different size on an
 * equidistant one, and an oval on the unrolled cylinder, each because that is
 * what that projection does to a cone.
 */

/** Half the cone: thirty degrees off the axis. */
const HALF = Math.PI / 6;

/** How many places round it are asked about. */
const AROUND = 96;

const outline = (): string | null => {
  const points: string[] = [];
  const sin = Math.sin(HALF);
  const cos = Math.cos(HALF);

  for (let i = 0; i < AROUND; i++) {
    const turn = (i / AROUND) * Math.PI * 2;
    const at = projectView(sin * Math.cos(turn), sin * Math.sin(turn), -cos);
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
