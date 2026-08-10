import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { primitiveSource } from './loadModel';
import { getAsset, getPreview, isAssetRef, putPreview } from './assets';

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

/**
 * Which way the pictures are drawn.
 *
 * They are kept in the browser and never looked at again, which is the whole
 * point of them - so a change to how they are drawn reaches nobody who has
 * already opened the library unless the key changes with it. Bump this when
 * the render changes.
 *
 * 2: clay rather than the mesh's own materials.
 */
const RENDER = 2;
const cacheKey = (url: string) => `${RENDER}:${url}`;

const memory = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

/** A preview already in hand, for the first paint of a tile. */
export const getMeshPreview = (url: string): string | null => memory.get(cacheKey(url)) ?? null;

/** What every tile is made of. One of it, for every mesh, forever. */
const CLAY = new THREE.MeshStandardMaterial({ color: 0xe6e3dd, roughness: 0.76, metalness: 0 });

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
  const key = cacheKey(url);
  const held = memory.get(key);
  if (held) return Promise.resolve(held);

  const inflight = pending.get(key);
  if (inflight) return inflight;

  const promise = (async () => {
    const stored = await getPreview(key);
    if (stored) return stored;
    const drawn = await enqueue(() => renderPreview(url));
    void putPreview(key, drawn);
    return drawn;
  })()
    .then((dataUrl) => {
      memory.set(key, dataUrl);
      pending.delete(key);
      return dataUrl;
    })
    .catch(() => {
      pending.delete(key);
      return '';
    });

  pending.set(key, promise);
  return promise;
};

/**
 * The file itself, wherever it lives.
 *
 * A bundled mesh is a path and the loader fetches it. One of the viewer's own
 * is a hash naming bytes in this browser, which the loader has never heard of,
 * so those are read out and parsed directly - otherwise every imported mesh
 * sits in the library as a glyph.
 */
const loadForPreview = async (url: string): Promise<THREE.Object3D> => {
  // A minted primitive has no file to fetch - it is its own source.
  const primitive = primitiveSource(url);
  if (primitive?.object) return primitive.object;
  if (!isAssetRef(url)) return (await new GLTFLoader().loadAsync(url)).scene;
  const asset = await getAsset(url);
  if (!asset) throw new Error('the imported file is no longer in this browser');
  return (await new GLTFLoader().parseAsync(asset.bytes, '')).scene;
};

const renderPreview = async (url: string): Promise<string> => {
  const model = await loadForPreview(url);

  // Sit the model in the middle of the frame, and back off by its bounding
  // sphere rather than its longest edge: a six metre car seen three-quarters on
  // is a low, wide silhouette, and framing it by its length leaves it a smudge
  // in a tile that a chair fills.
  const box = new THREE.Box3().setFromObject(model);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  model.position.sub(sphere.center);

  const scene = new THREE.Scene();
  scene.add(model);

  /*
   * EVERY TILE IS CLAY. The mesh's own materials do not come to the shelf.
   *
   * A tile is 96 pixels of near-black glass in the dark, near-white in the
   * light, and one preview has to read on both - it is drawn once and kept.
   * The horses arrive bay brown, which on the dark tile is a brown shape on a
   * black square: correctly framed, correctly sized, and invisible. A blue
   * chair beside it reads perfectly, so the shelf looked half broken rather
   * than consistently wrong, which is worse.
   *
   * One material for all of them settles it by construction, including for
   * every mesh the viewer imports - which is the case nobody can go and fix.
   * It is also the truer picture of what is on the shelf: colour appears
   * nowhere else in this tool, which draws in line and value, and a library of
   * forms should look like one.
   *
   * The ambient is low so the shadow side goes genuinely dark. That is what
   * makes one picture work on two backgrounds: the lit side carries it on the
   * dark tile, the shadow side on the light one.
   */
  const authored: THREE.Material[] = [];
  model.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => {
      if (material) authored.push(material);
    });
    mesh.material = CLAY;
  });

  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(2, 3, 2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.7);
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
  // hold all go straight back. The materials are the ones the file came with,
  // collected on the way in - what is hanging off the meshes now is the shared
  // clay, and that one stays.
  model.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) mesh.geometry?.dispose();
  });
  authored.forEach((material) => {
    Object.values(material).forEach((value) => {
      if ((value as THREE.Texture)?.isTexture) (value as THREE.Texture).dispose();
    });
    material.dispose();
  });

  return dataUrl;
};
