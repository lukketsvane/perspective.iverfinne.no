/**
 * Scene JSON — portable serialisation of all placed models.
 *
 * A scene snapshot encodes each model's source URL and every editable
 * transform so the composition can be saved to disk and reopened later, or
 * shared between devices.
 *
 * Only glTF/GLB assets sourced from a stable URL can be fully round-tripped;
 * `blob:` URLs created from local file uploads are valid for the lifetime of
 * the current page and are included as-is so the user is at least aware of
 * what was placed, even if the geometry cannot be re-fetched on reload.
 */

import { SceneModel } from '../types';
import { loadModelFromUrl } from './loadModel';

/** The on-disk representation of one placed instance. */
export interface SceneInstanceRecord {
  name: string;
  fileUrl: string;
  format: 'usdz' | 'gltf';
  position: [number, number, number];
  rotationY: number;
  scale: number;
  baseScale: number;
  size: [number, number, number];
}

export interface SceneJson {
  version: 1;
  exportedAt: string;
  instances: SceneInstanceRecord[];
}

/** Serialise the current model list to a plain JSON structure. */
export const exportSceneJson = (models: SceneModel[]): SceneJson => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  instances: models.map((m) => ({
    name: m.name,
    fileUrl: m.fileUrl,
    format: m.format,
    position: [...m.position] as [number, number, number],
    rotationY: m.rotationY,
    scale: m.scale,
    baseScale: m.baseScale,
    size: [...m.size] as [number, number, number],
  })),
});

/** Trigger a browser download for the scene JSON. */
export const downloadSceneJson = (models: SceneModel[], filename = 'scene.json') => {
  const json = exportSceneJson(models);
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/** Minimal validation of an imported JSON blob. */
const isSceneJson = (data: unknown): data is SceneJson =>
  typeof data === 'object' &&
  data !== null &&
  (data as SceneJson).version === 1 &&
  Array.isArray((data as SceneJson).instances);

export type ImportResult = {
  models: Omit<SceneModel, 'id'>[];
  skipped: string[];
};

/**
 * Parse and load models from a scene JSON file.
 *
 * Assets sourced from `blob:` URLs cannot be re-fetched and are skipped with a
 * warning rather than aborting the whole import. Each remaining instance is
 * loaded from its original URL and its saved transforms are applied on top.
 */
export const importSceneJson = async (file: File): Promise<ImportResult> => {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('The file is not valid JSON.');
  }

  if (!isSceneJson(data)) {
    throw new Error('The file does not look like a perspective scene (missing version or instances).');
  }

  const models: Omit<SceneModel, 'id'>[] = [];
  const skipped: string[] = [];

  for (const record of data.instances) {
    if (record.fileUrl.startsWith('blob:')) {
      skipped.push(`${record.name} (local blob — not available)`);
      continue;
    }
    try {
      const { model } = await loadModelFromUrl(record.fileUrl, record.name, [record.position[0], record.position[2]]);
      models.push({
        ...model,
        // Overwrite the auto-placed position and transforms with the saved ones.
        position: record.position,
        rotationY: record.rotationY,
        scale: record.scale,
        baseScale: record.baseScale,
        size: record.size,
      });
    } catch (error) {
      skipped.push(`${record.name} (could not load: ${error instanceof Error ? error.message : error})`);
    }
  }

  return { models, skipped };
};
