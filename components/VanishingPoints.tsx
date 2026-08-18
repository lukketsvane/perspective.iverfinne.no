import React, { useEffect, useRef, useState } from 'react';
import { vanishing } from '../lib/vanishing';

/**
 * The selected object's own vanishing points, drawn over the scene.
 *
 * Two points and four rays. Both points sit on the eye-level line - they always
 * do, for anything horizontal - and the rays are two of the object's own edges,
 * the top and the bottom of the corner nearest you, carried out to them. Select
 * a box square to the grid and the pair is the scene's; select one turned off it
 * and the pair moves, which is the whole lesson and is invisible until somebody
 * draws it.
 *
 * On a curved sheet the same construction comes back bent: the ray is a great
 * circle rather than a straight line, so it is sampled and asked where each
 * sample lands, which draws a straight line straight and a bent one bent without
 * either case knowing about the other.
 *
 * What is deliberately NOT here: the verticals. They have a real point overhead
 * on a curved sheet, and it is the room's, not this object's - the construction
 * sheet already rings it and rules the whole family that meets there. Drawing it
 * again in a second ink was drawing the fifth point twice.
 *
 * A point off the frame is pinned to the edge with a tick, because "off to the
 * left, roughly level with here" is what you need when you are ruling by hand -
 * but only out to one frame. Past that it is not off to the left, it is behind
 * your head, and the tick is telling you to rule the wrong way.
 */
/**
 * How hard the pencil presses, along the run of the line.
 *
 * Fractions of the curve, and the opacity over each. The near third is the edge
 * itself and is what you place; the rest is where it is going.
 */
const BANDS: [number, number, number][] = [
  [0, 0.34, 0.62],
  [0.34, 0.68, 0.42],
  [0.68, 1, 0.24],
];

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

  const { points, curves, room, divisions } = vanishing;
  if (points.length === 0 && room.length === 0 && divisions.length === 0) return null;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const margin = 14;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" width={width} height={height}>
      {/*
        * Solid, and drawn in three bands so it dies away as it leaves the thing
        * it belongs to.
        *
        * These used to be dashed. The dash was meant to say "this is
        * construction, not the drawing" - but every mark on this sheet is
        * construction, so the distinction was being made against nothing. And
        * on a curved sheet a dash is actively worse than a line: a curve that
        * turns through ninety degrees across the frame, chopped at five on and
        * six off, stops reading as one line and starts reading as a row of
        * ticks pointing in slightly different directions. A dash is a
        * convention for straight lines on flat paper, and this sheet has
        * neither.
        *
        * The fade is what the dash was reaching for and failing to do. A pencil
        * held to a straightedge presses hardest where the edge is and lifts as
        * the arm extends: darkest where you place it, faintest out in the
        * middle of the page where it would otherwise cross the drawing.
        */}
      {curves.flatMap((curve, index) =>
        BANDS.map(([from, to, weight], band) => {
          // One vertex of overlap, or the bands would show their joins.
          const piece = curve.slice(
            Math.floor(from * (curve.length - 1)),
            Math.ceil(to * (curve.length - 1)) + 1
          );
          if (piece.length < 2) return null;
          return (
            <polyline
              key={`c${index}-${band}`}
              points={piece.map(([x, y]) => `${x},${y}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={1}
              strokeLinecap="round"
              opacity={weight}
            />
          );
        })
      )}

      {/*
        * THE CONSTRUCTION ON THE THING: the rectangle it stands on, the
        * diagonals that find the centre of that rectangle, and the two lines
        * through the centre that divide it in four.
        *
        * One even weight, unlike the rays. A ray fades as it leaves because
        * most of its length is a statement about somewhere else on the page;
        * these lie on one surface, every part of them is about that surface,
        * and a fade along them would read as one end mattering more than the
        * other. Lighter than the rays overall, because they are the answer and
        * the rays are the question.
        */}
      {divisions.map((line, index) => (
        <polyline
          key={`d${index}`}
          points={line.map(([x, y]) => `${x},${y}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={1}
          strokeLinecap="round"
          opacity={0.5}
        />
      ))}

      {/*
        * The room's own points, pinned where the sheet runs out.
        *
        * Lighter than the selection's and without a ring, so the two never read
        * as one family: these say where the world's axes go, and the ones with
        * rings say where the thing in your hands does.
        */}
      {room.map((vp, index) => {
        const x = Math.min(width - margin, Math.max(margin, vp.x));
        const y = Math.min(height - margin, Math.max(margin, vp.y));
        if (Math.abs(vp.x - x) > width || Math.abs(vp.y - y) > height) return null;
        return (
          <g key={`r${index}`} opacity={0.4}>
            <circle cx={x} cy={y} r={2.4} fill={color} />
            <line
              x1={x - 7}
              y1={y}
              x2={x + 7}
              y2={y}
              stroke={color}
              strokeWidth={1}
              opacity={0.55}
            />
          </g>
        );
      })}

      {points.map((vp, index) => {
        const pinnedX = Math.min(width - margin, Math.max(margin, vp.x));
        const pinnedY = Math.min(height - margin, Math.max(margin, vp.y));
        const onScreen = vp.x === pinnedX && vp.y === pinnedY;

        /*
         * "Off to the left, roughly level with here" is what you want when you
         * are ruling by hand, and somewhere out there it stops being true. One
         * frame out is that somewhere: past it the point is not off to the
         * left, it is behind your head, and a tick on the left edge is telling
         * you to rule the wrong way. At ninety degrees on a phone every one of
         * these was two to seven frames out.
         */
        if (!onScreen && (Math.abs(vp.x - pinnedX) > width || Math.abs(vp.y - pinnedY) > height)) {
          return null;
        }

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
