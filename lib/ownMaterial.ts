import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  BRUSH,
  BRUSH_BOX,
  HATCH,
  HATCH_BOX,
  MARKER,
  MARKER_BOX,
  ownInkMaterial,
  writeOwnInk,
} from './inkMaterial';
import type { MaterialSettings, Surface } from '../types';

/** The one material per rung that everything not set apart is drawn with. */
const SHARED: Record<'brush' | 'marker' | 'hatch', [THREE.ShaderMaterial, THREE.ShaderMaterial]> = {
  // [mesh, box]
  brush: [BRUSH, BRUSH_BOX],
  marker: [MARKER, MARKER_BOX],
  hatch: [HATCH, HATCH_BOX],
};

/**
 * The material one object should actually be drawn with.
 *
 * Two answers, and which one you get is the whole of this feature:
 *
 *   - Nothing of its own -> the shared material for its rung, the very object
 *     every other untouched thing in the scene is pointing at. Forty boxes on
 *     one material, one uniform write reaching all of them, which is what the
 *     page's own knobs do and why they are free.
 *   - Its own settings -> a material made for it alone, holding its own copies
 *     of the eleven uniforms that can be set. Writing to it reaches nothing
 *     else, which is the point.
 *
 * The instance is made once per object that needs one and mutated afterwards -
 * not remade per change - because a drag writes on every frame and a material
 * per frame is a material per frame to dispose of. It is disposed when the
 * object goes, or when it is handed back to the page.
 *
 * `null` for the rungs that are not drawn: those are the authored material or
 * the plain white one, and neither is this shader's business.
 */
export const useObjectMaterial = (
  surface: Surface,
  own: MaterialSettings | undefined,
  isBox: boolean
): THREE.ShaderMaterial | null => {
  const rung = surface === 'brush' || surface === 'marker' || surface === 'hatch' ? surface : null;

  // Made for this object and this rung. A rung change makes a new one, because
  // the style flags are baked in at build; the settings then land on it below.
  const mine = useMemo(
    () => (rung && own ? ownInkMaterial(rung, isBox) : null),
    // Deliberately not `own`: this is about WHETHER it has settings, not what
    // they are. Rebuilding on every turn of a knob is the material-per-frame
    // this exists to avoid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rung, isBox, own === undefined]
  );

  useEffect(() => () => mine?.dispose(), [mine]);

  useEffect(() => {
    if (mine && own) writeOwnInk(mine, own);
  }, [mine, own]);

  if (!rung) return null;
  return mine ?? SHARED[rung][isBox ? 1 : 0];
};
