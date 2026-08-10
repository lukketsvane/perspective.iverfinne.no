import React, { useEffect, useReducer } from 'react';
import { isSketch } from '../types';
import { useStore } from '../store';
import { useMeasures, type Measure } from '../lib/measure';
import { projectDirection } from '../lib/pick';
import { constructionInk, pageHex } from '../lib/inkMaterial';

/**
 * The measures, drawn on the glass.
 *
 * Each is drawn TWICE, and the gap between the two drawings is a lesson no
 * amount of telling teaches:
 *
 * - the GEODESIC, solid: the image of the straight line in the world between
 *   the two marks. On a curved sheet it bows, because that is what straight
 *   things genuinely look like across a wide field.
 * - the CHORD, faint: the ruler-straight line between the same two marks -
 *   the line your flat-page schooling insists on believing in.
 *
 * Near the middle of a narrow view the two lie on top of each other, which
 * is why the belief survives; open the field and they part company. Watching
 * them part IS understanding curvilinear perspective - not as a distortion
 * of the real picture, but as the real picture of which the flat page was
 * the local approximation.
 *
 * The angle is written at the line: degrees of visual angle, the unit the
 * pencil at arm's length reads and the only unit sight has.
 */

/** A point along the great arc between two directions from the eye. */
const along = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const omega = Math.acos(dot);
  if (omega < 1e-5) return a;
  const sa = Math.sin((1 - t) * omega) / Math.sin(omega);
  const sb = Math.sin(t * omega) / Math.sin(omega);
  return [a[0] * sa + b[0] * sb, a[1] * sa + b[1] * sb, a[2] * sa + b[2] * sb];
};

const SAMPLES = 32;

const Arc: React.FC<{ measure: Measure; ink: string; halo: string; held: boolean }> = ({
  measure,
  ink,
  halo,
  held,
}) => {
  /*
   * Project the arc, breaking the polyline wherever the sheet has no answer -
   * and wherever it wraps. The cylindrical sheet meets itself at the bearing
   * behind you, and a projection that wraps never returns null there: two
   * neighbouring samples land at opposite edges of the frame, and joining
   * them ruled a spurious streak across the whole picture. A jump wider than
   * half the frame is a seam, not a line.
   */
  const seam = window.innerWidth / 2;
  const runs: { x: number; y: number }[][] = [[]];
  for (let i = 0; i <= SAMPLES; i++) {
    const at = projectDirection(along(measure.a, measure.b, i / SAMPLES));
    const run = runs[runs.length - 1];
    if (!at) {
      if (run.length) runs.push([]);
    } else if (run.length && Math.abs(at.x - run[run.length - 1].x) > seam) {
      runs.push([at]);
    } else {
      run.push(at);
    }
  }
  const ends = [projectDirection(measure.a), projectDirection(measure.b)];
  const mid = projectDirection(along(measure.a, measure.b, 0.5));
  const path = runs
    .filter((run) => run.length > 1)
    .map((run) => 'M' + run.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L'))
    .join(' ');

  return (
    <g>
      {/* The straight line schooling believes in... skipped when it would
          have to cross the seam, where no straight page line exists. */}
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
      {/* ...and the line sight actually draws. */}
      {path && <path d={path} fill="none" stroke={ink} strokeWidth={held ? 2 : 1.5} opacity={0.85} />}
      {ends.map(
        (end, i) => end && <circle key={i} cx={end.x} cy={end.y} r={held ? 3 : 2.3} fill={ink} opacity={0.85} />
      )}
      {mid && measure.deg >= 0.5 && (
        <text
          x={mid.x + 8}
          y={mid.y - 8}
          fill={ink}
          fontSize={13}
          fontWeight={700}
          fontFamily="system-ui, -apple-system, sans-serif"
          style={{ paintOrder: 'stroke', stroke: halo, strokeWidth: 3 }}
        >
          {measure.deg >= 10 ? Math.round(measure.deg) : measure.deg.toFixed(1)}°
          {/*
            * And the metres, when both ends of the drag landed on something.
            *
            * Two different questions, and the instrument can answer both from
            * one gesture. The angle is what sight reads and what a drawing is
            * made of - it is first, and it is always there. The distance is
            * what the place is actually made of, and it only exists when both
            * ends met an object or the floor: a line taken across the sky has
            * an angle and no length, and inventing one would be worse than
            * leaving it out.
            */}
          {measure.metres !== undefined && measure.metres >= 0.02 && (
            <tspan opacity={0.72}>
              {'  '}
              {measure.metres < 10 ? measure.metres.toFixed(2) : measure.metres.toFixed(1)} m
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

  /*
   * The marks are directions in the world, so every turn of the head moves
   * where they land on the glass: re-projected every frame while any exist,
   * exactly the vanishing points' own arrangement, and costing nothing when
   * the instrument is empty.
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

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
      width={window.innerWidth}
      height={window.innerHeight}
    >
      {list.map((measure, i) => (
        <Arc key={i} measure={measure} ink={ink} halo={halo} held={false} />
      ))}
      {live && <Arc measure={live} ink={ink} halo={halo} held />}
    </svg>
  );
};
