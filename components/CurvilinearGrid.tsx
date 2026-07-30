import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { curvilinearView } from '../lib/curvilinearView';
import { screenFor, fieldOf } from '../lib/projection';

/**
 * The construction sheet, drawn live over the scene.
 *
 * This is the red scaffold Kim Jung Gi rules before a single object goes down:
 * the eye-level line, a fan of great circles running through the point over
 * your head and the point under your feet, and the rings of constant elevation
 * that cross them. On paper it is drawn once and everything is then built
 * inside it. Here it is the projection itself, so it stays true while you turn.
 *
 * What it teaches, which a flat grid cannot:
 *
 *  - every "vertical" in the world is a great circle through the zenith and the
 *    nadir, and only the one straight ahead of you looks straight
 *  - the eye-level line is the one ring that stays straight, always
 *  - the five points are all on screen at once: left, right, zenith, nadir, and
 *    the one you are looking at
 *
 * Sampled along each circle and joined, rather than approximated by an arc, so
 * it is right for both projections and everything between them.
 */
const STEP = THREE.MathUtils.degToRad(2.5);

/** How far apart the meridians and the rings are, in degrees. */
const SPACING = 15;

export const CurvilinearGrid: React.FC<{ color: string }> = ({ color }) => {
  const [, redraw] = useState(0);
  const seen = useRef(-1);

  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      if (curvilinearView.nonce !== seen.current) {
        seen.current = curvilinearView.nonce;
        redraw((n) => n + 1);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { running = false; };
  }, []);

  const view = curvilinearView;
  if (!view.active) return null;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const { halfYaw, halfPitch } = fieldOf(view.spread, width, height);

  const world = new THREE.Vector3();
  const local = new THREE.Vector3();
  const basis = new THREE.Matrix3().setFromMatrix4(view.cameraMatrix).transpose();

  /** Where a world direction lands, in pixels, or null if outside the field. */
  const project = (x: number, y: number, z: number): [number, number] | null => {
    local.set(x, y, z).applyMatrix3(basis);
    const clip = screenFor(local, halfYaw, halfPitch, view.blend);
    if (!clip) return null;
    return [((clip[0] + 1) / 2) * width, ((1 - clip[1]) / 2) * height];
  };

  /** Join samples into paths, breaking wherever the line leaves the field. */
  const pathFrom = (samples: (([number, number]) | null)[]) => {
    const runs: string[] = [];
    let open: string[] = [];
    let previous: [number, number] | null = null;

    for (const point of samples) {
      if (!point) {
        if (open.length > 1) runs.push(open.join(' '));
        open = [];
        previous = null;
        continue;
      }
      // A jump most of the way across the frame is the seam, not a line.
      if (previous && Math.hypot(point[0] - previous[0], point[1] - previous[1]) > width * 0.4) {
        if (open.length > 1) runs.push(open.join(' '));
        open = [];
      }
      open.push(`${open.length === 0 ? 'M' : 'L'}${point[0].toFixed(1)},${point[1].toFixed(1)}`);
      previous = point;
    }
    if (open.length > 1) runs.push(open.join(' '));
    return runs;
  };

  const meridians: string[] = [];
  const rings: string[] = [];

  // Great circles through the zenith and the nadir - the world's verticals.
  for (let bearing = 0; bearing < 360; bearing += SPACING) {
    const angle = THREE.MathUtils.degToRad(bearing);
    const samples: (([number, number]) | null)[] = [];
    for (let pitch = -Math.PI / 2; pitch <= Math.PI / 2 + 1e-6; pitch += STEP) {
      const cos = Math.cos(pitch);
      samples.push(project(Math.sin(angle) * cos, Math.sin(pitch), -Math.cos(angle) * cos));
    }
    meridians.push(...pathFrom(samples));
  }

  // Rings of constant elevation. The one at zero is the eye-level line.
  for (let elevation = -75; elevation <= 75; elevation += SPACING) {
    const pitch = THREE.MathUtils.degToRad(elevation);
    const cos = Math.cos(pitch);
    const sin = Math.sin(pitch);
    const samples: (([number, number]) | null)[] = [];
    for (let bearing = 0; bearing <= Math.PI * 2 + 1e-6; bearing += STEP) {
      samples.push(project(Math.sin(bearing) * cos, sin, -Math.cos(bearing) * cos));
    }
    const paths = pathFrom(samples);
    if (elevation === 0) meridians.push(...paths); // drawn stronger, below
    else rings.push(...paths);
  }

  // The five points: ahead, behind, left, right, zenith, nadir.
  const marks: [number, number][] = [];
  for (const [x, y, z] of [
    [0, 0, -1],
    [0, 0, 1],
    [-1, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
  ] as [number, number, number][]) {
    const point = project(x, y, z);
    if (point) marks.push(point);
  }

  const horizon = meridians.slice(-1);
  const verticals = meridians.slice(0, -1);

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" width={width} height={height}>
      <g fill="none" stroke={color}>
        {rings.map((d, i) => (
          <path key={`r${i}`} d={d} strokeWidth={0.8} opacity={0.3} />
        ))}
        {verticals.map((d, i) => (
          <path key={`m${i}`} d={d} strokeWidth={0.8} opacity={0.42} />
        ))}
        {horizon.map((d, i) => (
          <path key={`h${i}`} d={d} strokeWidth={1.5} opacity={0.85} />
        ))}
      </g>
      {marks.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill={color} opacity={0.9} />
      ))}
    </svg>
  );
};
