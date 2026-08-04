/**
 * Scene JSON — a composition as a file.
 *
 * Saved scenes live in this browser. A file is how one leaves it: onto another
 * device, into a backup, next to the drawing it produced. It carries the boxes,
 * every placed mesh with its transforms, and the viewpoint the scene was
 * composed from.
 *
 * What a file cannot carry is the geometry of an imported mesh. Those are
 * recorded as `asset:` references — the bytes stay in the browser they were
 * imported into — so a scene of imported meshes reopens on that device and
 * reports the missing pieces anywhere else. Bundled library meshes travel
 * everywhere, since both ends fetch them from the same path.
 */

import { BoxData, SceneInstance, SceneModel, SceneView } from '../types';
import { loadModelFromUrl } from './loadModel';

export interface SceneFile {
  version: 2;
  exportedAt: string;
  name?: string;
  boxes: BoxData[];
  instances: SceneInstance[];
  view?: SceneView;
}

/** The v1 format: placed meshes only, no boxes and no viewpoint. */
interface SceneFileV1 {
  version: 1;
  instances: SceneInstance[];
}

export const toSceneFile = (
  boxes: BoxData[],
  models: SceneModel[],
  view?: SceneView,
  name?: string
): SceneFile => ({
  version: 2,
  exportedAt: new Date().toISOString(),
  name,
  boxes: boxes.map((box) => ({ ...box })),
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
  view,
});

/** Named by the day it left, since scenes carry no name of their own. */
const fileNameFor = (name: string | undefined) => {
  const stem = (name ?? `perspective-${new Date().toISOString().slice(0, 10)}`)
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return `${stem || 'scene'}.json`;
};

export const downloadSceneFile = (file: SceneFile) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileNameFor(file.name);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

const isSceneFile = (data: unknown): data is SceneFile | SceneFileV1 =>
  typeof data === 'object' &&
  data !== null &&
  ((data as SceneFile).version === 2 || (data as SceneFileV1).version === 1) &&
  Array.isArray((data as SceneFile).instances);

export interface ImportedScene {
  boxes: BoxData[];
  models: Omit<SceneModel, 'id'>[];
  view?: SceneView;
  /** Anything named in the file that could not be loaded here. */
  skipped: string[];
}

/**
 * Read a scene file back.
 *
 * Each instance is loaded from the source it names and the saved transforms are
 * applied over whatever the loader worked out, so a figure comes back at the
 * size and bearing it was left at.
 */
export const readSceneFile = async (file: File): Promise<ImportedScene> => {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('The file is not valid JSON.');
  }

  if (!isSceneFile(data)) {
    throw new Error('That does not look like a perspective scene.');
  }

  const models: Omit<SceneModel, 'id'>[] = [];
  const skipped: string[] = [];

  for (const record of data.instances) {
    if (record.fileUrl.startsWith('blob:')) {
      // Written by a version that referred to imports by blob URL, which mean
      // nothing in a new page.
      skipped.push(`${record.name} (imported mesh from an older file)`);
      continue;
    }
    try {
      const { model } = await loadModelFromUrl(record.fileUrl, record.name, [
        record.position[0],
        record.position[2],
      ]);
      models.push({
        ...model,
        position: [...record.position] as [number, number, number],
        rotationY: record.rotationY,
        scale: record.scale,
        baseScale: record.baseScale,
        size: [...record.size] as [number, number, number],
      });
    } catch (error) {
      skipped.push(`${record.name} (${error instanceof Error ? error.message : 'could not be loaded'})`);
    }
  }

  return {
    boxes: data.version === 2 ? (data.boxes ?? []) : [],
    models,
    view: data.version === 2 ? data.view : undefined,
    skipped,
  };
};
