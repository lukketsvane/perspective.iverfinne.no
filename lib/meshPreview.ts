import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Generate a thumbnail preview of a GLB mesh file.
 *
 * Renders the mesh into a small offscreen canvas and returns a data URL.
 * The preview is cached so each mesh is only rendered once per session.
 */

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

const SIZE = 96;

export const getMeshPreview = (url: string): string | null => cache.get(url) ?? null;

export const generateMeshPreview = (url: string): Promise<string> => {
  const cached = cache.get(url);
  if (cached) return Promise.resolve(cached);

  const inflight = pending.get(url);
  if (inflight) return inflight;

  const promise = renderPreview(url).then((dataUrl) => {
    cache.set(url, dataUrl);
    pending.delete(url);
    return dataUrl;
  }).catch(() => {
    pending.delete(url);
    return '';
  });

  pending.set(url, promise);
  return promise;
};

const renderPreview = async (url: string): Promise<string> => {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;

  // Fit model in view
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  model.position.sub(center);

  // Setup scene
  const scene = new THREE.Scene();
  scene.add(model);

  // Lighting – bright enough to read the model's own materials clearly
  const ambient = new THREE.AmbientLight(0xffffff, 1.4);
  scene.add(ambient);
  const directional = new THREE.DirectionalLight(0xffffff, 2.0);
  directional.position.set(2, 3, 2);
  scene.add(directional);
  const fill = new THREE.DirectionalLight(0xffffff, 0.8);
  fill.position.set(-2, 1, -1);
  scene.add(fill);

  // Camera
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  const dist = maxDim / (2 * Math.tan((35 * Math.PI) / 360));
  camera.position.set(0, maxDim * 0.15, dist * 1.6);
  camera.lookAt(0, 0, 0);

  // Render
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(SIZE, SIZE);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.render(scene, camera);

  const dataUrl = renderer.domElement.toDataURL('image/png');

  // Cleanup
  renderer.dispose();
  model.traverse((child) => {
    if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
    if ((child as THREE.Mesh).material) {
      const mat = (child as THREE.Mesh).material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else (mat as THREE.Material).dispose();
    }
  });

  return dataUrl;
};
