import * as THREE from 'three';
import { USDZLoader } from 'three/examples/jsm/loaders/USDZLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SceneModel } from '../types';

export const MODEL_ACCEPT = '.usdz,.glb,.gltf,model/vnd.usdz+zip,model/gltf-binary';

export interface LoadResult {
  model: Omit<SceneModel, 'id'>;
  /** Set when the file loaded but cannot be shown in the scene. */
  warning?: string;
}

/**
 * Sit an object on the ground with its footprint centred on the origin, and
 * measure it. USDZ and glTF both use metres, so no scaling is applied - a chair
 * that is 0.9 m tall stays 0.9 m tall next to the 1 m cubes.
 */
const groundAndMeasure = (object: THREE.Object3D): [number, number, number] => {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return [0, 0, 0];

  const size = new THREE.Vector3();
  const centre = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(centre);

  // Re-origin the object: centred in X/Z, resting on y = 0.
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
 * Load a dropped model file.
 *
 * USDZ is the format Apple's tools produce, so it is what people have on an
 * iPhone - but three's USDZ loader only reads the ASCII (.usda) flavour, and
 * most real-world USDZ files are binary crate archives. Those still load into
 * the app, they just cannot be drawn in the scene: the file is kept so it can
 * be opened in AR Quick Look, which reads crate files natively. glTF/GLB is
 * the reliable path for in-scene placement.
 */
export const loadModelFile = async (file: File, dropAt: [number, number]): Promise<LoadResult> => {
  const buffer = await readFile(file);
  const fileUrl = URL.createObjectURL(
    new Blob([buffer], {
      type: file.name.toLowerCase().endsWith('.usdz') ? 'model/vnd.usdz+zip' : file.type,
    })
  );
  const name = file.name.replace(/\.[^.]+$/, '');
  const isUsdz = /\.usdz$/i.test(file.name);

  let object: THREE.Object3D | null = null;
  let warning: string | undefined;

  try {
    if (isUsdz) {
      const group = new USDZLoader().parse(buffer);
      // A crate archive parses to an empty group (the loader warns and skips).
      if (group.children.length > 0) {
        object = group;
      } else {
        warning = `${file.name} is a binary USDZ, which cannot be drawn in the scene. Open it in AR instead.`;
      }
    } else {
      const gltf = await new GLTFLoader().parseAsync(buffer, '');
      object = gltf.scene;
    }
  } catch (error) {
    console.error('Failed to load model:', error);
    warning = isUsdz
      ? `${file.name} could not be read in the browser. Open it in AR instead.`
      : `${file.name} could not be read.`;
  }

  const size = object ? groundAndMeasure(object) : ([0, 0, 0] as [number, number, number]);

  return {
    model: {
      name,
      object,
      position: [dropAt[0], 0, dropAt[1]],
      rotationY: 0,
      size,
      fileUrl,
      format: isUsdz ? 'usdz' : 'gltf',
      previewSupported: object !== null,
    },
    warning,
  };
};
