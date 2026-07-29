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
    baseScale: 1,
    size,
    fileUrl,
    format: isUsdz ? 'usdz' : 'gltf',
    previewSupported: object !== null,
  };
};

/**
 * Parsed sources, kept by URL.
 *
 * Placing the same figure three times used to fetch it three times - fifteen
 * megabytes for five megabytes of content - and hand the GPU three copies of
 * the same geometry and textures. Now the file is parsed once and every
 * placement is a clone of it, which shares the buffers by reference. The
 * library meshes are static single-mesh exports with no skinning, so a plain
 * clone is faithful.
 */
const sources = new Map<string, Promise<{ object: THREE.Object3D | null; warning?: string }>>();

/** URLs with a parsed source in memory. */
export const cachedSourceUrls = (): string[] => Array.from(sources.keys());

/**
 * Let go of a source once nothing is standing on it any more.
 *
 * Clones share their geometry and textures with the cached original, so this
 * has to wait until the last instance is gone - the caller owns that check.
 */
export const releaseSource = (url: string) => {
  const pending = sources.get(url);
  if (!pending) return;
  sources.delete(url);
  pending
    .then(({ object }) => {
      object?.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          if (!material) return;
          Object.values(material).forEach((value) => {
            if ((value as THREE.Texture)?.isTexture) (value as THREE.Texture).dispose();
          });
          material.dispose();
        });
      });
    })
    .catch(() => undefined);
};

/**
 * The largest texture worth keeping, in pixels on the long edge.
 *
 * The library figures ship 2048 and 4096 square maps - three of them each on
 * most files. Uploaded as they are, nine figures come to roughly 650 MB of
 * texture memory, which is well past what Safari on a phone will hand out
 * before it drops the tab. Downscaling to 1024 on a phone cuts that by four to
 * sixteen times, and at the size a figure occupies on screen in a perspective
 * study - usually a few hundred pixels tall, often in flat matte white - the
 * difference is not visible.
 */
const textureCap = () => {
  if (typeof window === 'undefined') return 2048;
  return Math.min(window.innerWidth, window.innerHeight) < 900 ? 1024 : 2048;
};

/** Redraw an oversized texture at the cap, in place, before it is ever uploaded. */
const shrinkTextures = (root: THREE.Object3D) => {
  const cap = textureCap();
  const done = new Set<THREE.Texture>();

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    materials.forEach((material) => {
      if (!material) return;
      Object.values(material).forEach((value) => {
        const texture = value as THREE.Texture;
        if (!texture?.isTexture || done.has(texture)) return;
        done.add(texture);

        const image = texture.image as (ImageBitmap | HTMLImageElement | null);
        const width = image?.width ?? 0;
        const height = image?.height ?? 0;
        const longest = Math.max(width, height);
        if (!image || longest <= cap) return;

        const ratio = cap / longest;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * ratio));
        canvas.height = Math.max(1, Math.round(height * ratio));
        const context = canvas.getContext('2d');
        if (!context) return;

        context.drawImage(image as CanvasImageSource, 0, 0, canvas.width, canvas.height);
        texture.image = canvas;
        texture.needsUpdate = true;
        // The decoded original is no use to anyone now.
        (image as ImageBitmap).close?.();
      });
    });
  });
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
    shrinkTextures(gltf.scene);
    return { object: gltf.scene };
  } catch (error) {
    console.error('Failed to load model:', error);
    return { object: null, warning: 'could not be read' };
  }
};

/** A fresh instance sharing the cached original's buffers. */
const instanceOf = (source: THREE.Object3D | null) => (source ? source.clone(true) : null);

/** Load a dropped file. */
export const loadModelFile = async (file: File, dropAt: [number, number]): Promise<LoadResult> => {
  const buffer = await readFile(file);
  const isUsdz = /\.usdz$/i.test(file.name);
  const fileUrl = URL.createObjectURL(
    new Blob([buffer], { type: isUsdz ? 'model/vnd.usdz+zip' : file.type })
  );

  const pending = parseBuffer(buffer, isUsdz);
  sources.set(fileUrl, pending);
  const { object, warning } = await pending;

  return {
    model: buildModel(instanceOf(object), file.name.replace(/\.[^.]+$/, ''), fileUrl, isUsdz, dropAt),
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
  if (!sources.has(url)) {
    sources.set(
      url,
      (async () => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}`);
        return parseBuffer(await response.arrayBuffer(), /\.usdz$/i.test(url));
      })()
    );
  }
  const { object, warning } = await sources.get(url)!;

  const model = buildModel(instanceOf(object), name, url, /\.usdz$/i.test(url), dropAt);
  if (targetHeight && model.size[1] > 0.001) {
    model.scale = targetHeight / model.size[1];
    // Resetting the slider should come back to the pose's real height, not to
    // the file's own - which for anything kneeling is the giant it shipped as.
    model.baseScale = model.scale;
  }
  return { model, warning };
};
