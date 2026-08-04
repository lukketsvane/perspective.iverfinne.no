import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getPreview, putPreview } from './assets';

/**
 * The picture on a library tile.
 *
 * Seventy meshes want seventy pictures, and the obvious way to get them - ask
 * for all of them at once, each in its own renderer - is three separate
 * mistakes. Seventy parallel fetches saturate the connection, so the mesh you
 * actually tapped queues behind sixty-nine you did not. Seventy renderers pass
 * the browser's live-WebGL-context limit, and the context it drops to make room
 * may be the one the scene itself is drawn in. And all of it is redone from
 * scratch on the next visit.
 *
 * So: one renderer, reused; one preview at a time; and the result kept in the
 * browser, which makes the library instant from the second visit on.
 */

const SIZE = 96;

const memory = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

/** A preview already in hand, for the first paint of a tile. */
export const getMeshPreview = (url: string): string | null => memory.get(url) ?? null;

let renderer: THREE.WebGLRenderer | null = null;

const sharedRenderer = () => {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(SIZE, SIZE);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
  }
  return renderer;
};

/**
 * How many previews may be in flight at once.
 *
 * Enough to keep the connection busy while one file is being parsed, few enough
 * that a tap on a tile is never queued behind a screenful of pictures. Drawing
 * itself cannot overlap - it is one synchronous render on one renderer - so
 * this only governs fetching and parsing.
 */
const LANES = 4;

let running = 0;
const waiting: (() => void)[] = [];

/**
 * A hold on the queue, for while the tool is fetching something that was
 * actually asked for.
 *
 * Parsing a mesh and drawing a preview both happen on the one thread the scene
 * is drawn on. Tapping a tile in a library that is still filling itself in used
 * to put your figure behind a screenful of pictures nobody had asked for; this
 * stands the pictures down until the figure is standing.
 */
let gate: Promise<void> = Promise.resolve();
let open: (() => void) | null = null;

export const holdPreviews = () => {
  if (open) return;
  gate = new Promise<void>((resume) => {
    open = resume;
  });
};

export const resumePreviews = () => {
  open?.();
  open = null;
};

const enqueue = async <T>(work: () => Promise<T>): Promise<T> => {
  if (running >= LANES) await new Promise<void>((resume) => waiting.push(resume));
  running++;
  try {
    await gate;
    return await work();
  } finally {
    running--;
    waiting.shift()?.();
  }
};

export const generateMeshPreview = (url: string): Promise<string> => {
  const held = memory.get(url);
  if (held) return Promise.resolve(held);

  const inflight = pending.get(url);
  if (inflight) return inflight;

  const promise = (async () => {
    const stored = await getPreview(url);
    if (stored) return stored;
    const drawn = await enqueue(() => renderPreview(url));
    void putPreview(url, drawn);
    return drawn;
  })()
    .then((dataUrl) => {
      memory.set(url, dataUrl);
      pending.delete(url);
      return dataUrl;
    })
    .catch(() => {
      pending.delete(url);
      return '';
    });

  pending.set(url, promise);
  return promise;
};

const renderPreview = async (url: string): Promise<string> => {
  const gltf = await new GLTFLoader().loadAsync(url);
  const model = gltf.scene;

  // Sit the model in the middle of the frame, and back off by its bounding
  // sphere rather than its longest edge: a six metre car seen three-quarters on
  // is a low, wide silhouette, and framing it by its length leaves it a smudge
  // in a tile that a chair fills.
  const box = new THREE.Box3().setFromObject(model);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  model.position.sub(sphere.center);

  const scene = new THREE.Scene();
  scene.add(model);

  // Bright enough to read the model's own materials, from three sides so a
  // silhouette does not come out as one flat shape.
  scene.add(new THREE.AmbientLight(0xffffff, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(2, 3, 2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.8);
  fill.position.set(-2, 1, -1);
  scene.add(fill);

  const FIELD = 35;
  const camera = new THREE.PerspectiveCamera(FIELD, 1, 0.01, 1000);
  // A little over the exact fit, so nothing grazes the edge of the tile.
  const distance = (sphere.radius / Math.sin((FIELD * Math.PI) / 360)) * 1.08;
  camera.position.set(distance * 0.42, distance * 0.34, distance * 0.84);
  camera.lookAt(0, 0, 0);

  const gl = sharedRenderer();
  gl.render(scene, camera);
  const dataUrl = gl.domElement.toDataURL('image/png');

  // The picture is all that was wanted; geometry, materials and the maps they
  // hold all go straight back.
  model.traverse((child) => {
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

  return dataUrl;
};
