import * as THREE from 'three';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';
import { BoxData, SceneModel } from '../types';

/**
 * AR Quick Look.
 *
 * Safari on iOS has no WebXR, so Quick Look is not a fallback here - it is the
 * AR. Everything else in the app is the composer; this is where you actually
 * stand inside the study. Two things make it a perspective tool rather than a
 * model viewer:
 *
 * 1. True scale. The exporter writes `metersPerUnit = 1` and the scene is
 *    modelled in metres, so a 1 m cube arrives one metre tall.
 * 2. Locked scale. Quick Look lets you pinch a model bigger or smaller by
 *    default, which would quietly destroy the only thing being taught.
 *    `#allowsContentScaling=0` takes that away.
 */

export type ARScale = 'room' | 'tabletop';

export const AR_SCALES: { id: ARScale; label: string; ratio: number; note: string }[] = [
  { id: 'room', label: 'Room', ratio: 1, note: '1:1 — walk through it at full size' },
  { id: 'tabletop', label: 'Tabletop', ratio: 0.1, note: '1:10 — the whole study on a desk' },
];

/** True when the browser can hand a USDZ to AR Quick Look (iOS Safari). */
export const supportsQuickLook = (): boolean => {
  if (typeof document === 'undefined') return false;
  const anchor = document.createElement('a');
  return Boolean(anchor.relList && anchor.relList.supports && anchor.relList.supports('ar'));
};

/** Rough iOS check, for wording rather than gating. */
export const isIOS = (): boolean =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/**
 * Build a clean export scene.
 *
 * Only the geometry belongs in AR: the grid, horizon and scale figure are
 * drawing aids for the screen, and the room brings its own floor and its own
 * human. Boxes go out opaque so they read as solids, and slightly off-white so
 * their faces separate under Quick Look's lighting.
 */
const buildExportScene = (boxes: BoxData[], models: SceneModel[], ratio: number): THREE.Scene => {
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  root.scale.setScalar(ratio);
  scene.add(root);

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0xd8d8d6,
    roughness: 0.65,
    metalness: 0.0,
  });

  boxes.forEach((box) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...box.position);
    mesh.rotation.set(...box.rotation);
    mesh.scale.set(...box.scale);
    root.add(mesh);
  });

  models.forEach((model) => {
    if (!model.object) return;
    const clone = model.object.clone(true);
    clone.position.set(...model.position);
    clone.rotation.set(0, model.rotationY, 0);
    root.add(clone);
  });

  return scene;
};

/**
 * Open a USDZ in AR Quick Look.
 *
 * Quick Look only intercepts a click on an <a rel="ar"> containing an <img>,
 * so the anchor is assembled rather than setting location.href.
 */
const openInQuickLook = (url: string, revokeAfter: boolean) => {
  const anchor = document.createElement('a');
  anchor.setAttribute('rel', 'ar');
  anchor.appendChild(document.createElement('img'));
  // Fragment options are read by Quick Look, not by the server, so they are
  // safe to append to a blob: URL.
  anchor.href = `${url}#allowsContentScaling=0`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  if (revokeAfter) {
    // Quick Look reads the blob during the click; give it room before releasing.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
};

/**
 * Exporting is the slow step, and going in and out of AR while adjusting a
 * study is the normal rhythm - so an unchanged scene reuses its last build.
 */
let cached: { key: string; url: string } | null = null;

const exportKey = (boxes: BoxData[], models: SceneModel[], scale: ARScale) =>
  JSON.stringify([
    scale,
    boxes.map((b) => [b.position, b.scale, b.rotation]),
    models.map((m) => [m.id, m.position, m.rotationY, m.previewSupported]),
  ]);

/** Export the current scene and hand it to AR Quick Look. */
export const walkSceneInAR = async (
  boxes: BoxData[],
  models: SceneModel[],
  scale: ARScale = 'room'
) => {
  const key = exportKey(boxes, models, scale);
  if (cached?.key === key) {
    openInQuickLook(cached.url, false);
    return;
  }

  const ratio = AR_SCALES.find((s) => s.id === scale)?.ratio ?? 1;
  const scene = buildExportScene(boxes, models, ratio);
  const exporter = new USDZExporter();
  // quickLookCompatible keeps the material spec to what Quick Look reads.
  const data = await exporter.parse(scene, { quickLookCompatible: true });
  const blob = new Blob([data], { type: 'model/vnd.usdz+zip' });

  if (cached) URL.revokeObjectURL(cached.url);
  cached = { key, url: URL.createObjectURL(blob) };
  openInQuickLook(cached.url, false);
};

/** Hand an uploaded file straight to Quick Look, untouched. */
export const openModelInAR = (model: SceneModel) => {
  openInQuickLook(model.fileUrl, false);
};

/** Metres across, for warning about a study that will not fit in a room. */
export const sceneFootprint = (boxes: BoxData[], models: SceneModel[]): number => {
  let min = Infinity;
  let max = -Infinity;
  const consider = (centre: number, extent: number) => {
    min = Math.min(min, centre - extent / 2);
    max = Math.max(max, centre + extent / 2);
  };
  boxes.forEach((b) => {
    consider(b.position[0], Math.abs(b.scale[0]) + Math.abs(b.scale[2]));
    consider(b.position[2], Math.abs(b.scale[0]) + Math.abs(b.scale[2]));
  });
  models.forEach((m) => {
    consider(m.position[0], m.size[0]);
    consider(m.position[2], m.size[2]);
  });
  return Number.isFinite(min) ? max - min : 0;
};
