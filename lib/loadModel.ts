import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SceneModel } from '../types';
import { getAsset, isAssetRef, putAsset } from './assets';

export const MODEL_ACCEPT = '.glb,.gltf,.usdz,model/gltf-binary,model/vnd.usdz+zip';

const isUsdzName = (name: string) => /\.usdz$/i.test(name);

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
 * How much air to leave between two things placed automatically.
 *
 * Six centimetres: enough that two chairs are not fused, little enough that
 * they read as a pair standing together. Half a metre - what this was - put
 * every copy its own arm's length away, so a row of chairs came out as a
 * scattering across the floor and every one had to be dragged back in.
 */
const CLEARANCE = 0.06;

/**
 * Somewhere clear to stand, as close in as it will go.
 *
 * Dropping several models at once, or one after another, would pile them on the
 * same spot. Walk a widening ring around the wanted point until there is room
 * for this one's footprint beside everything already placed - in steps of about
 * a radius, so the first ring that clears is the tight one rather than the next
 * one out.
 */
export const findFreeSpot = (
  taken: { position: [number, number, number]; radius: number }[],
  wanted: [number, number],
  radius: number
): [number, number] => {
  const clashes = (x: number, z: number) =>
    taken.some((other) => {
      const gap = Math.hypot(x - other.position[0], z - other.position[2]);
      return gap < radius + other.radius + CLEARANCE;
    });

  if (!clashes(wanted[0], wanted[1])) return wanted;

  const step = Math.max(0.12, radius * 0.9);
  for (let ring = 1; ring < 40; ring++) {
    // More places to try the further out it goes, so the ring is searched at
    // about the same spacing however big it is.
    const count = Math.max(8, Math.round(ring * 8));
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
interface ParsedSource {
  object: THREE.Object3D | null;
  warning?: string;
  /** Taken from the file, not the reference: an `asset:` key has no extension. */
  isUsdz: boolean;
}

const sources = new Map<string, Promise<ParsedSource>>();

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

const parseBuffer = async (buffer: ArrayBuffer, isUsdz: boolean): Promise<ParsedSource> => {
  // Fetched when a .usdz actually arrives - this loader alone drags the zip
  // machinery (fflate) into whatever chunk it lives in, and nothing the tool
  // ships is usdz. Fetched OUTSIDE the try, deliberately: the catch below
  // turns what it catches into a resolved "could not be read", which the
  // source cache then memoizes under the file's content hash - correct for a
  // parse failure, which is a property of the bytes, and wrong for a network
  // failure, which is a property of the moment. Thrown, it reaches the
  // cache's own rejection eviction and the next attempt fetches the loader
  // again.
  const usdz = isUsdz ? await import('three/examples/jsm/loaders/USDZLoader.js') : null;
  try {
    if (usdz) {
      const group = new usdz.USDZLoader().parse(buffer);
      // A binary crate archive parses to an empty group.
      if (group.children.length > 0) return { object: group, isUsdz };
      return { object: null, warning: 'binary USDZ — use glTF/GLB', isUsdz };
    }
    const gltf = await new GLTFLoader().parseAsync(buffer, '');
    shrinkTextures(gltf.scene);
    return { object: gltf.scene, isUsdz };
  } catch (error) {
    console.error('Failed to load model:', error);
    return { object: null, warning: 'could not be read', isUsdz };
  }
};

/** A fresh instance sharing the cached original's buffers. */
const instanceOf = (source: THREE.Object3D | null) => (source ? source.clone(true) : null);

/**
 * Load a dropped file.
 *
 * The bytes are kept in the browser's own store first, so what the scene holds
 * is a stable `asset:` reference rather than a `blob:` URL that dies with the
 * page. That is what lets a scene made of imported meshes be saved at all.
 */
export const loadModelFile = async (file: File, dropAt: [number, number]): Promise<LoadResult> => {
  const buffer = await readFile(file);
  const isUsdz = isUsdzName(file.name);
  const fileUrl = await putAsset(buffer, file.name);

  if (!sources.has(fileUrl)) sources.set(fileUrl, parseBuffer(buffer, isUsdz));
  let parsed: ParsedSource;
  try {
    parsed = await sources.get(fileUrl)!;
  } catch (error) {
    // A rejected promise left in the cache would fail every later attempt.
    sources.delete(fileUrl);
    throw error;
  }
  const { object, warning } = parsed;

  return {
    model: buildModel(instanceOf(object), file.name.replace(/\.[^.]+$/, ''), fileUrl, isUsdz, dropAt),
    warning,
  };
};

/** Read a source back, whether it is a bundled mesh or an earlier import. */
/**
 * The primitives the library can mint without a file.
 *
 * A cylinder is the ellipse lesson: a circle in perspective is an ellipse
 * whose degree follows how far it sits from the eye line, and no box can say
 * that. Generated here rather than shipped as a file - a metre-round drum has
 * nothing in it worth three hundred kilobytes of GLB - and addressed by a
 * primitive: URL so a saved scene re-mints it exactly like it re-fetches a
 * mesh.
 */
export const primitiveSource = (url: string): ParsedSource | null => {
  if (url !== 'primitive:cylinder') return null;
  /*
   * Lathed, not CylinderGeometry, and the difference is the drawing. A sharp
   * rim is a crease, and a crease never turns edge-on to the eye - the facing
   * ratio jumps across it without passing zero, so the ink shader has nothing
   * to draw and the top ellipse, the entire lesson, went missing. A small
   * chamfer is how every real drum answers: the rim is a fast-curving surface,
   * somewhere on it the normal is always square to the ray, and the ellipse
   * inks all the way round - exactly why the car's edges draw.
   */
  const bevel = 0.045;
  // Bottom to top, and the ORDER is load-bearing: LatheGeometry winds its
  // triangles and points its normals off the profile's direction of travel,
  // and the first cut of this ran top-down - a drum whose every face looked
  // inward, exterior culled, taps landing on the inside of the far wall.
  const points: THREE.Vector2[] = [new THREE.Vector2(0.001, 0)];
  const arc = (cx: number, cy: number, from: number, to: number) => {
    for (let i = 0; i <= 6; i++) {
      const a = from + ((to - from) * i) / 6;
      points.push(new THREE.Vector2(cx + Math.cos(a) * bevel, cy + Math.sin(a) * bevel));
    }
  };
  arc(0.5 - bevel, bevel, -Math.PI / 2, 0);
  points.push(new THREE.Vector2(0.5, bevel), new THREE.Vector2(0.5, 1 - bevel));
  arc(0.5 - bevel, 1 - bevel, 0, Math.PI / 2);
  points.push(new THREE.Vector2(0.001, 1));
  const drum = new THREE.Mesh(
    new THREE.LatheGeometry(points, 56),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.92, metalness: 0 })
  );
  const group = new THREE.Group();
  group.add(drum);
  return { object: group, isUsdz: false };
};

const fetchSource = async (url: string): Promise<ParsedSource> => {
  const primitive = primitiveSource(url);
  if (primitive) return primitive;
  if (isAssetRef(url)) {
    const asset = await getAsset(url);
    if (!asset) throw new Error('the imported file is no longer in this browser');
    return parseBuffer(asset.bytes, isUsdzName(asset.name));
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return parseBuffer(await response.arrayBuffer(), isUsdzName(url));
};

/**
 * Load a mesh by reference: a built-in library path, or an imported file.
 *
 * `targetHeight` is the real height of the thing IN THE POSE IT IS IN, and it
 * is applied to the whole box's Y. Scanned meshes arrive normalised to a unit
 * box on their LONGEST axis, which is only the height for something upright -
 * a couched foal comes in 0.91 tall because its length is the 1.0 - so
 * whatever a file happens to measure is not a size, and this is the number
 * that makes it one. Without it a lying foal stands as tall as a leaping one.
 */
export const loadModelFromUrl = async (
  url: string,
  name: string,
  dropAt: [number, number],
  targetHeight?: number
): Promise<LoadResult> => {
  if (!sources.has(url)) sources.set(url, fetchSource(url));

  let loaded: ParsedSource;
  try {
    loaded = await sources.get(url)!;
  } catch (error) {
    // A rejected promise left in the cache would fail every later attempt.
    sources.delete(url);
    throw error;
  }
  const { object, warning, isUsdz } = loaded;

  const model = buildModel(instanceOf(object), name, url, isUsdz, dropAt);
  if (targetHeight && model.size[1] > 0.001) {
    model.scale = targetHeight / model.size[1];
    // Resetting the slider should come back to the pose's real height, not to
    // the file's own - which for anything kneeling is the giant it shipped as.
    model.baseScale = model.scale;
  }
  return { model, warning };
};
