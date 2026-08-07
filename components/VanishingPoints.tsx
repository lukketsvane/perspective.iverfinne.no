import React, { useEffect, useRef, useState } from 'react';
import { vanishing } from '../lib/vanishing';

/**
 * The selected box's own vanishing points, drawn over the scene.
 *
 * On a flat sheet both points sit on the eye-level line - they always do, for
 * anything horizontal - and the faint lines are the box's own edges carried on
 * out to them. Select a box that is square to the grid and the pair is the
 * scene's; select one that is turned and the pair moves, which is the point.
 *
 * On a curved sheet the same construction comes back bent: each family of
 * edges has *two* points, opposite each other, both on the page, and the edge
 * between them is a great circle rather than a straight line. The third family
 * is drawn there too - the verticals, running to the point overhead - because
 * that is the fifth point, and a five-point sheet with nothing ruled towards
 * the fifth point is a sheet with the lesson left out.
 *
 * A point can land a long way outside the frame. Rather than clipping it away,
 * it is pinned to the edge with a marker, because "the vanishing point is off
 * to the left, roughly level with here" is exactly what you need to know when
 * you are ruling the line by hand.
 */
export const VanishingPoints: React.FC<{ color: string }> = ({ color }) => {
  const [, redraw] = useState(0);
  const seen = useRef(-1);

  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      if (vanishing.nonce !== seen.current) {
        seen.current = vanishing.nonce;
        redraw((n) => n + 1);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { running = false; };
  }, []);

  const { points, curves } = vanishing;
  if (points.length === 0) return null;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const margin = 14;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" width={width} height={height}>
      {curves.map((curve, index) => (
        <polyline
          key={`c${index}`}
          points={curve.map(([x, y]) => `${x},${y}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={1}
          opacity={0.45}
          strokeDasharray="5 6"
        />
      ))}

      {points.map((vp, index) => {
        const pinnedX = Math.min(width - margin, Math.max(margin, vp.x));
        const pinnedY = Math.min(height - margin, Math.max(margin, vp.y));
        const onScreen = vp.x === pinnedX && vp.y === pinnedY;

        return (
          <g key={`p${index}`}>
            {onScreen ? (
              <>
                {/* The one behind you is drawn lighter: it is the same point,
                    and it is not the one you are ruling towards. */}
                <circle
                  cx={vp.x}
                  cy={vp.y}
                  r={5}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  opacity={vp.facing ? 0.9 : 0.45}
                />
                <circle cx={vp.x} cy={vp.y} r={1.5} fill={color} opacity={vp.facing ? 0.9 : 0.45} />
              </>
            ) : (
              // Off the edge: a tick on the frame at the height the point sits
              // at, so you still know where to rule towards.
              <g opacity={vp.facing ? 0.75 : 0.4}>
                <circle cx={pinnedX} cy={pinnedY} r={3.5} fill={color} />
                <line
                  x1={pinnedX - 9}
                  y1={pinnedY}
                  x2={pinnedX + 9}
                  y2={pinnedY}
                  stroke={color}
                  strokeWidth={1}
                  opacity={0.5}
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};
