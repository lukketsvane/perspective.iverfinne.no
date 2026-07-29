import * as THREE from 'three';
import { USDZLoader } from 'three/examples/jsm/loaders/USDZLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SceneModel } from '../types';

export const MODEL_ACCEPT = '.glb,.gltf,.usdz,model/gltf-binary,model/vnd.usdz+zip';

export interface LoadResult {
  model: Omit<SceneModel, 'id'>;
  /** Set when the file loaded but cannot be shown in the scene. */
  warning?: string;
}

/**
 * Sit an object on the ground with its footprint centred on the origin, and
 * measure it. glTF and USDZ are both authored in metres, so nothing is
 * rescaled on the way in - a model that comes in at the wrong size is a fact
 * about the file, and the scale handle is there to fix it.
 */
const groundAndMeasure = (object: THREE.Object3D): [number, number, number] => {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return [0, 0, 0];

  const size = new THREE.Vector3();
  const centre = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(centre);

  object.position.x -= centre.x;
  object.position.z -= centre.z;
  object.position.y -= box.min.y;

  return [size.x, size.y, size.z];
};

const readFile = (file: File): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });

/**
 * Somewhere clear to stand.
 *
 * Dropping several models at once, or one after another, used to pile them on
 * the same spot. Walk a widening ring around the wanted point until there is
 * room for this one's footprint next to everything already placed.
 */
export const findFreeSpot = (
  taken: { position: [number, number, number]; radius: number }[],
  wanted: [number, number],
  radius: number
): [number, number] => {
  const clashes = (x: number, z: number) =>
    taken.some((other) => {
      const gap = Math.hypot(x - other.position[0], z - other.position[2]);
      return gap < radius + other.radius + 0.5;
    });

  if (!clashes(wanted[0], wanted[1])) return wanted;

  const step = Math.max(0.6, radius * 2);
  for (let ring = 1; ring < 12; ring++) {
    const count = ring * 6;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = wanted[0] + Math.cos(angle) * ring * step;
      const z = wanted[1] + Math.sin(angle) * ring * step;
      if (!clashes(x, z)) return [x, z];
    }
  }
  return wanted;
};

/** Footprint radius of a placed model, for spacing. */
export const modelRadius = (model: { size: [number, number, number]; scale: number }) =>
  (Math.max(model.size[0], model.size[2]) * model.scale) / 2;

const buildModel = (
  object: THREE.Object3D | null,
  name: string,
  fileUrl: string,
  isUsdz: boolean,
  dropAt: [number, number]
): Omit<SceneModel, 'id'> => {
  const size = object ? groundAndMeasure(object) : ([0, 0, 0] as [number, number, number]);
  return {
    name,
    object,
    position: [dropAt[0], 0, dropAt[1]],
    rotationY: 0,
    scale: 1,
    size,
    fileUrl,
    format: isUsdz ? 'usdz' : 'gltf',
    previewSupported: object !== null,
  };
};

const parseBuffer = async (
  buffer: ArrayBuffer,
  isUsdz: boolean
): Promise<{ object: THREE.Object3D | null; warning?: string }> => {
  try {
    if (isUsdz) {
      const group = new USDZLoader().parse(buffer);
      // A binary crate archive parses to an empty group.
      if (group.children.length > 0) return { object: group };
      return { object: null, warning: 'binary USDZ — use glTF/GLB' };
    }
    const gltf = await new GLTFLoader().parseAsync(buffer, '');
    return { object: gltf.scene };
  } catch (error) {
    console.error('Failed to load model:', error);
    return { object: null, warning: 'could not be read' };
  }
};

/** Load a dropped file. */
export const loadModelFile = async (file: File, dropAt: [number, number]): Promise<LoadResult> => {
  const buffer = await readFile(file);
  const isUsdz = /\.usdz$/i.test(file.name);
  const fileUrl = URL.createObjectURL(
    new Blob([buffer], { type: isUsdz ? 'model/vnd.usdz+zip' : file.type })
  );
  const { object, warning } = await parseBuffer(buffer, isUsdz);

  return {
    model: buildModel(object, file.name.replace(/\.[^.]+$/, ''), fileUrl, isUsdz, dropAt),
    warning,
  };
};

/**
 * Load one of the built-in meshes, fetched on demand.
 *
 * `targetHeight` is the real height of the pose. The library files are all
 * normalised to the same box height whatever they are doing, so this is what
 * stops a kneeling figure arriving as tall as a standing one.
 */
export const loadModelFromUrl = async (
  url: string,
  name: string,
  dropAt: [number, number],
  targetHeight?: number
): Promise<LoadResult> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  const buffer = await response.arrayBuffer();
  const isUsdz = /\.usdz$/i.test(url);
  const { object, warning } = await parseBuffer(buffer, isUsdz);

  const model = buildModel(object, name, url, isUsdz, dropAt);
  if (targetHeight && model.size[1] > 0.001) {
    model.scale = targetHeight / model.size[1];
  }
  return { model, warning };
};
