import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { SceneModel } from '../types';
import { authoredMaterial, cloneModel } from './modelMaterials';

/** Turn a display name into a safe, recognisable download name. */
const exportFileName = (name: string) => {
  const stem = name
    .replace(/\.[^.]+$/, '')
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return `${stem || 'model'}-scaled.glb`;
};

/**
 * Download a model as GLB with its scene scale folded into the exported root.
 *
 * Placement and rotation belong to the perspective scene, so they are not
 * included. The size adjustment does belong to the asset: importing this GLB
 * again therefore starts at the corrected size with a scale of 1.
 */
export const exportScaledModel = async (model: SceneModel): Promise<void> => {
  if (!model.object) throw new Error('This model has no exportable preview.');

  // Matte mode and the edge cage are viewing aids: cloneModel hands back the
  // asset as its file authored it, which is what should leave.
  const root = cloneModel(model.object);
  root.name = model.name;
  root.scale.multiplyScalar(model.scale);
  root.updateMatrixWorld(true);

  const output = await new GLTFExporter().parseAsync(root, {
    binary: true,
    onlyVisible: false,
  });
  if (!(output instanceof ArrayBuffer)) throw new Error('GLB export did not produce binary data.');

  const url = URL.createObjectURL(new Blob([output], { type: 'model/gltf-binary' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName(model.name);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
