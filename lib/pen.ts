import { useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import { useStore } from '../store';
import { penScale } from '../components/Panorama';

/**
 * One pen, for the lines that are geometry rather than shader.
 *
 * Everything drawn by a shader in this tool - the ground, the room's ruling,
 * the ink itself - already states its width in pixels of the finished sheet and
 * converts per fragment. The lines that are geometry could not: drei measures
 * them against the canvas, and nothing here is ever drawn to the canvas. So a
 * box's twelve edges were ruled in pixels of an intermediate the viewer never
 * sees, and the box got THINNER the wider the field went, because a wide field
 * samples that intermediate down harder.
 *
 * Measured across 60 to 270 degrees of field, each alone on the page: the box
 * went 1.54 px down to 1.28 while the mesh contour beside it went 1.85 up to
 * 2.11 - so the box fell from 0.83 of its neighbour's weight to 0.61, and the
 * two marks that are the same mark drifted a quarter apart over the range.
 * Corrected, the box runs 0.85 to 0.95 of the contour and does not trend.
 *
 * Two sheet pixels is not a number tuned to those readings: it is `contourPx`
 * from the ink material, which is what a silhouette is drawn at. A box's twelve
 * edges ARE its silhouette and its creases, so they are that mark and should be
 * indistinguishable from it. See `penScale` for the conversion.
 */
export const usePen = (sheetPixels = 2): number => {
  const { size, viewport } = useThree();
  const fov = useStore((state) => state.fov);
  const mode = useStore((state) => state.perspectiveMode);
  return useMemo(
    () => sheetPixels * penScale(mode, fov, size.width, size.height, viewport.dpr),
    [sheetPixels, mode, fov, size.width, size.height, viewport.dpr]
  );
};

/**
 * The twelve edges of a unit box, as pairs of ends.
 *
 * drei's `<Edges>` draws them with a `lineBasicMaterial`, whose width WebGL
 * ignores outright - so a box's edges were always one pixel of whatever the
 * picture happened to be rendered into, and no correction could reach them.
 * `<Line segments>` uses Line2, which honours a width.
 */
export const BOX_EDGES: [number, number, number][] = (() => {
  const corners: [number, number, number][] = [];
  for (const x of [-0.5, 0.5]) {
    for (const y of [-0.5, 0.5]) {
      for (const z of [-0.5, 0.5]) corners.push([x, y, z]);
    }
  }
  const pairs: [number, number, number][] = [];
  for (let a = 0; a < corners.length; a++) {
    for (let b = a + 1; b < corners.length; b++) {
      // Two corners share an edge when exactly one coordinate differs.
      const apart = corners[a].reduce((n, v, i) => n + (v === corners[b][i] ? 0 : 1), 0);
      if (apart === 1) pairs.push(corners[a], corners[b]);
    }
  }
  return pairs;
})();
