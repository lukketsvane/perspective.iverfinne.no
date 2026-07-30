import React, { useEffect, useRef, useState } from 'react';
import { vanishing } from '../lib/vanishing';

/**
 * The selected box's own vanishing points, drawn over the scene.
 *
 * Both points sit on the eye-level line - they always do, for anything
 * horizontal - and the faint rays are the box's own edges carried on out to
 * them. Select a box that is square to the grid and the pair is the scene's;
 * select one that is turned and the pair moves, which is the point.
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

  const points = vanishing.points;
  if (points.length === 0) return null;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const margin = 14;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" width={width} height={height}>
      {points.map((vp, index) => {
        const inside = vp.x > -width && vp.x < width * 2 && vp.y > -height && vp.y < height * 2;
        const pinnedX = Math.min(width - margin, Math.max(margin, vp.x));
        const pinnedY = Math.min(height - margin, Math.max(margin, vp.y));
        const onScreen = vp.x === pinnedX && vp.y === pinnedY;

        return (
          <g key={index}>
            {vp.rays.map((ray, at) => (
              <line
                key={at}
                x1={ray[0]}
                y1={ray[1]}
                x2={vp.x}
                y2={vp.y}
                stroke={color}
                strokeWidth={1}
                opacity={inside ? 0.35 : 0.2}
                strokeDasharray="5 6"
              />
            ))}

            {onScreen ? (
              <>
                <circle cx={vp.x} cy={vp.y} r={5} fill="none" stroke={color} strokeWidth={1.5} opacity={0.9} />
                <circle cx={vp.x} cy={vp.y} r={1.5} fill={color} opacity={0.9} />
              </>
            ) : (
              // Off the edge: a tick on the frame at the height the point sits
              // at, so you still know where to rule towards.
              <g opacity={0.75}>
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
