/**
 * A composition as a file.
 *
 * Saved scenes live in this browser. A file is how one leaves it: onto another
 * device, into a backup, next to the drawing it produced. It carries the boxes,
 * every placed mesh with its transforms, the viewpoint the scene was composed
 * from — and the geometry of every imported mesh, packed in after the manifest
 * by `sceneBundle`. A project that arrives without its furniture is not a
 * project.
 *
 * The four meshes the app ships with stay as `/meshes/...` references: both
 * ends have them already.
 */

import { BoxData, LampData, readSurface, SceneInstance, SceneModel, SceneView } from '../types';
import { loadModelFromUrl } from './loadModel';
import { gatherMeshes, isBundle, packBundle, readBundle } from './sceneBundle';

export interface SceneFile {
  version: 2;
  exportedAt: string;
  name?: string;
  boxes: BoxData[];
  /** Absent in files written before lamps existed. */
  lamps?: LampData[];
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
  lamps: LampData[],
  view?: SceneView,
  name?: string
): SceneFile => ({
  version: 2,
  exportedAt: new Date().toISOString(),
  name,
  boxes: boxes.map((box) => ({ ...box })),
  lamps: lamps.map((lamp) => ({ ...lamp })),
  instances: models.map((m) => ({
    name: m.name,
    fileUrl: m.fileUrl,
    format: m.format,
    position: [...m.position] as [number, number, number],
    rotationY: m.rotationY,
    scale: m.scale,
    baseScale: m.baseScale,
    size: [...m.size] as [number, number, number],
    surface: m.surface,
    kind: m.kind,
    lockedScale: m.lockedScale,
  })),
  view,
});

/** Named by the day it left, since scenes carry no name of their own. */
const fileNameFor = (name: string | undefined) => {
  const stem = (name ?? `perspective-${new Date().toISOString().slice(0, 10)}`)
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return `${stem || 'scene'}.perspective`;
};

/**
 * Write the whole project out: the arrangement, and the meshes it stands on.
 */
export const downloadSceneFile = async (file: SceneFile) => {
  const meshes = await gatherMeshes(file.instances.map((instance) => instance.fileUrl));
  const url = URL.createObjectURL(packBundle(file, meshes));
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
  lamps: LampData[];
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

  if (await isBundle(file)) {
    // The meshes are put back into storage on the way through, so the loader
    // below finds every `asset:` reference exactly where the scene expects it.
    data = await readBundle(file);
  } else {
    try {
      data = JSON.parse(await file.text());
    } catch {
      throw new Error('The file is not a perspective scene.');
    }
  }

  if (!isSceneFile(data)) {
    throw new Error('That does not look like a perspective scene.');
  }

  const models: Omit<SceneModel, 'id'>[] = [];
  const skipped: string[] = [];

  for (const record of data.instances) {
    // Inside the try, all of it. A record with no fileUrl at all threw on the
    // `.startsWith` from outside it, and took down the whole import - the
    // boxes, the viewpoint and every mesh that was perfectly fine - rather
    // than losing the one entry that was broken.
    try {
      if (record.fileUrl?.startsWith('blob:')) {
        // Written by a version that referred to imports by blob URL, which mean
        // nothing in a new page.
        skipped.push(`${record.name} (imported mesh from an older file)`);
        continue;
      }
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
        surface: record.surface === undefined ? undefined : readSurface(record.surface),
        kind: record.kind,
        lockedScale: record.lockedScale,
      });
    } catch (error) {
      skipped.push(`${record.name} (${error instanceof Error ? error.message : 'could not be loaded'})`);
    }
  }

  return {
    boxes: data.version === 2 ? (data.boxes ?? []) : [],
    models,
    lamps: data.version === 2 ? readLamps((data as { lamps?: unknown }).lamps) : [],
    view: data.version === 2 ? data.view : undefined,
    skipped,
  };
};

/** Lamps out of a file: each field the right kind of thing, or the default. */
const readLamps = (stored: unknown): LampData[] => {
  if (!Array.isArray(stored)) return [];
  const take = (value: unknown, low: number, high: number, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.min(high, Math.max(low, value))
      : fallback;
  return stored.map((entry) => {
    const lamp = (entry ?? {}) as Partial<LampData> & { position?: unknown };
    const at = Array.isArray(lamp.position) ? lamp.position : [];
    return {
      id: 'placeholder',
      position: [take(at[0], -500, 500, 0), take(at[1], 0.1, 50, 2.2), take(at[2], -500, 500, 0)] as [
        number,
        number,
        number,
      ],
      kind: lamp.kind === 'spot' ? ('spot' as const) : ('bulb' as const),
      aim: take(lamp.aim, -100, 100, 0),
      intensity: take(lamp.intensity, 0.2, 60, 8),
      temperature: take(lamp.temperature, 1800, 12000, 3600),
      enabled: lamp.enabled !== false,
    };
  });
};
