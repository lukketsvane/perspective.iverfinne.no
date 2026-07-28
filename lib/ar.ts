import * as THREE from 'three';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';
import { BoxData, SceneModel } from '../types';

/**
 * AR Quick Look.
 *
 * Safari on iOS has no WebXR, so the only way to physically walk around the
 * scene on an iPhone is Apple's AR Quick Look: hand it a USDZ and it drops the
 * model on a detected floor plane at true scale. The exporter writes
 * `metersPerUnit = 1`, and the whole scene is modelled in metres, so a 1 m cube
 * comes out one metre tall in the room.
 */

/** True when the browser can hand a USDZ to AR Quick Look (iOS Safari). */
export const supportsQuickLook = (): boolean => {
  if (typeof document === 'undefined') return false;
  const anchor = document.createElement('a');
  return Boolean(anchor.relList && anchor.relList.supports && anchor.relList.supports('ar'));
};

/**
 * Build a clean export scene.
 *
 * Only the geometry belongs in AR: the grid, horizon and scale figure are
 * drawing aids for the screen, and the room supplies its own floor and its own
 * human. Boxes are exported opaque so they read as solids in Quick Look.
 */
const buildExportScene = (boxes: BoxData[], models: SceneModel[]): THREE.Scene => {
  const scene = new THREE.Scene();

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0xdedede,
    roughness: 0.75,
    metalness: 0.0,
  });

  boxes.forEach((box) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...box.position);
    mesh.rotation.set(...box.rotation);
    mesh.scale.set(...box.scale);
    scene.add(mesh);
  });

  models.forEach((model) => {
    if (!model.object) return;
    const clone = model.object.clone(true);
    clone.position.set(...model.position);
    clone.rotation.set(0, model.rotationY, 0);
    scene.add(clone);
  });

  return scene;
};

/**
 * Open a USDZ in AR Quick Look.
 *
 * Quick Look only intercepts a click on an <a rel="ar"> that contains an
 * <img>, so the anchor is assembled rather than using location.href.
 */
const openInQuickLook = (url: string, revokeAfter: boolean) => {
  const anchor = document.createElement('a');
  anchor.setAttribute('rel', 'ar');
  anchor.appendChild(document.createElement('img'));
  anchor.href = url;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  if (revokeAfter) {
    // Quick Look reads the blob during the click; give it room before releasing.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
};

/** Export the current scene and hand it to AR Quick Look. */
export const walkSceneInAR = async (boxes: BoxData[], models: SceneModel[]) => {
  const scene = buildExportScene(boxes, models);
  const exporter = new USDZExporter();
  const data = await exporter.parse(scene);
  const blob = new Blob([data], { type: 'model/vnd.usdz+zip' });
  openInQuickLook(URL.createObjectURL(blob), true);
};

/** Hand an uploaded file straight to Quick Look, untouched. */
export const openModelInAR = (model: SceneModel) => {
  openInQuickLook(model.fileUrl, false);
};
