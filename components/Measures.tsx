import React, { useEffect, useMemo, useReducer } from 'react';
import * as THREE from 'three';
import { isSketch } from '../types';
import { useStore } from '../store';
import { subtended, useMeasures, type Measure } from '../lib/measure';
import { eyeAt, project } from '../lib/pick';
import { constructionInk, pageHex } from '../lib/inkMaterial';

/**
 * The tape, drawn where it lies.
 *
 * Each mark is drawn TWICE, and the gap between the two drawings is a lesson no
 * amount of telling teaches:
 *
 * - the RUN, solid: the straight line in the room between the two places,
 *   sampled along its length and projected point by point. On a curved sheet it
 *   bows, because that is what a straight thing genuinely looks like across a
 *   wide field.
 * - the CHORD, faint: the ruler-straight line between the same two ends on the
 *   page - the line your flat-page schooling insists on believing in.
 *
 * Near the middle of a narrow view the two lie on top of each other, which is
 * why the belief survives; open the field and they part company. Watching them
 * part IS understanding curvilinear perspective - not as a distortion of the
 * real picture, but as the real picture of which the flat page was the local
 * approximation.
 *
 * THE NUMBERS SAY DIFFERENT KINDS OF THING and are written differently. The
 * metres are a fact about the room: they belong to the mark, they are the same
 * from everywhere, and every mark carries them. The degrees are a fact about
 * where you happen to be standing - so they are computed against the eye on
 * the frame they are drawn, and only while the tape is in your hand. Leaving a
 * degree reading lying in the scene would be leaving a number that is wrong
 * from everywhere except the one spot it was taken from.
 */

/**
 * How many pieces the run is broken into.
 *
 * It is a straight line in the room, so the samples are evenly spaced along it
 * and the bow comes entirely out of the projection. Thirty-two was enough for
 * the arc this replaced and is enough here: at a full-sphere field a two-metre
 * span crosses a few hundred pixels, which is six or seven pixels a segment.
 */
const SAMPLES = 32;

const Run: React.FC<{ measure: Measure; ink: string; halo: string; held: boolean; deg?: number }> = ({
  measure,
  ink,
  halo,
  held,
  deg,
}) => {
  const at = useMemo(() => new THREE.Vector3(), []);
  /*
   * Project the run, breaking the polyline wherever the sheet has no answer -
   * and wherever it wraps. The cylindrical sheet meets itself at the bearing
   * behind you, and a projection that wraps never returns null there: two
   * neighbouring samples land at opposite edges of the frame, and joining them
   * ruled a spurious streak across the whole picture. A jump wider than half
   * the frame is a seam, not a line.
   */
  const seam = window.innerWidth / 2;
  const runs: { x: number; y: number }[][] = [[]];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const point = project(
      at.set(
        measure.from[0] + (measure.to[0] - measure.from[0]) * t,
        measure.from[1] + (measure.to[1] - measure.from[1]) * t,
        measure.from[2] + (measure.to[2] - measure.from[2]) * t
      )
    );
    const run = runs[runs.length - 1];
    if (!point) {
      if (run.length) runs.push([]);
    } else if (run.length && Math.abs(point.x - run[run.length - 1].x) > seam) {
      runs.push([point]);
    } else {
      run.push(point);
    }
  }

  const ends = [
    project(at.set(...measure.from)),
    project(at.set(...measure.to)),
  ];
  const mid = project(
    at.set(
      (measure.from[0] + measure.to[0]) / 2,
      (measure.from[1] + measure.to[1]) / 2,
      (measure.from[2] + measure.to[2]) / 2
    )
  );
  const path = runs
    .filter((run) => run.length > 1)
    .map((run) => 'M' + run.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L'))
    .join(' ');

  return (
    <g>
      {/* The straight line schooling believes in... skipped when it would have
          to cross the seam, where no straight page line exists. */}
      {ends[0] && ends[1] && Math.abs(ends[0].x - ends[1].x) <= seam && (
        <line
          x1={ends[0].x}
          y1={ends[0].y}
          x2={ends[1].x}
          y2={ends[1].y}
          stroke={ink}
          strokeWidth={1}
          opacity={0.3}
        />
      )}
      {/* ...and the line the room actually draws. */}
      {path && <path d={path} fill="none" stroke={ink} strokeWidth={held ? 2 : 1.5} opacity={0.85} />}
      {/* Ends drawn as rings rather than dots: a measure is pinned BETWEEN two
          places, and a ring says which point of the drawing it is pinned to
          where a filled dot covers it. */}
      {ends.map(
        (end, i) =>
          end && (
            <circle
              key={i}
              cx={end.x}
              cy={end.y}
              r={held ? 4 : 3.2}
              fill="none"
              stroke={ink}
              strokeWidth={held ? 2 : 1.5}
              opacity={0.85}
            />
          )
      )}
      {mid && measure.metres >= 0.02 && (
        <text
          x={mid.x + 8}
          y={mid.y - 8}
          fill={ink}
          fontSize={13}
          fontWeight={700}
          fontFamily="system-ui, -apple-system, sans-serif"
          style={{ paintOrder: 'stroke', stroke: halo, strokeWidth: 3 }}
        >
          {measure.metres < 10 ? measure.metres.toFixed(2) : measure.metres.toFixed(1)} m
          {/*
            * And the angle, while the tape is still in your hand.
            *
            * Two different questions, and the instrument answers both from one
            * gesture. The metres are what the place is made of and stay with
            * the mark. The angle is what SIGHT reads - the pencil held up at a
            * straight arm, one eye shut - and it is true only from where you
            * are standing this second, which is why it goes when you let go.
            */}
          {deg !== undefined && deg >= 0.5 && (
            <tspan opacity={0.72}>
              {'  '}
              {deg >= 10 ? Math.round(deg) : deg.toFixed(1)}°
            </tspan>
          )}
        </text>
      )}
    </g>
  );
};

export const Measures: React.FC = () => {
  const { list, live } = useMeasures();
  const surface = useStore((s) => s.surface);
  const dark = useStore((s) => s.theme) === 'dark';
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const eye = useMemo(() => new THREE.Vector3(), []);

  /*
   * The marks are places in the room, so every step and every turn of the head
   * moves where they land on the glass: re-projected every frame while any
   * exist, exactly the vanishing points' own arrangement, and costing nothing
   * when the tape is empty.
   */
  const any = list.length > 0 || live !== null;
  useEffect(() => {
    if (!any) return;
    let running = true;
    const tick = () => {
      if (!running) return;
      redraw();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => {
      running = false;
    };
  }, [any]);

  if (!any) return null;
  const sketch = isSketch(surface);
  const ink = constructionInk(sketch, dark);
  // The halo is the page, not "white": on a dark board a white halo was the
  // brightest mark on the sheet.
  const halo = sketch ? pageHex() : dark ? 'rgba(16,16,16,0.75)' : 'rgba(255,255,255,0.75)';
  const from = live ? eyeAt(eye) : null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
      width={window.innerWidth}
      height={window.innerHeight}
    >
      {list.map((measure, i) => (
        <Run key={i} measure={measure} ink={ink} halo={halo} held={false} />
      ))}
      {live && (
        <Run
          measure={live}
          ink={ink}
          halo={halo}
          held
          deg={from ? subtended(live.from, live.to, from) : undefined}
        />
      )}
    </svg>
  );
};
