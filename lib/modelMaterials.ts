import * as THREE from 'three';

/**
 * What a mesh looked like when it arrived, and the wire cage drawn over it.
 *
 * Both used to be parked on `mesh.userData`, which is a trap: `Object3D.copy`
 * serialises userData through JSON, so a material stored there comes out of a
 * clone as a plain descriptor object - truthy, so nothing re-reads the real
 * one, and useless as a material, so the copy renders as an empty selection
 * cage. That is exactly what duplicating a model did.
 *
 * They live here instead, keyed weakly by the mesh, where nothing serialises
 * them and they go away with it.
 */

const authored = new WeakMap<THREE.Mesh, THREE.Material | THREE.Material[]>();
const overlays = new WeakMap<THREE.Mesh, THREE.LineSegments>();

/** The materials the file was authored with, remembered on first sight. */
export const authoredMaterial = (mesh: THREE.Mesh): THREE.Material | THREE.Material[] => {
  const held = authored.get(mesh);
  if (held) return held;
  authored.set(mesh, mesh.material);
  return mesh.material;
};

/**
 * The edge cage for the transparent view.
 *
 * This was the most expensive thing in the app by a wide margin, for three
 * reasons at once. It was built per *mesh*, and every placement of a model is a
 * clone, so six copies of a chair paid for six identical cages - about a third
 * of a second of frozen main thread each. It was cut at 15 degrees, which on a
 * smooth-shaded car is fifty thousand segments where ten thousand describe the
 * same form. And the curvilinear projection draws the whole scene six times per
 * frame, onto the faces of a cube, so every one of those segments is drawn six
 * times over.
 *
 * So: one cage per *geometry*, which every clone of a model shares; cut at an
 * angle that keeps the edges you would draw and drops the ones you would not;
 * and built when the browser is next idle rather than inside the frame that
 * asked for it, so switching modes never stalls the view.
 */

/** Shared by every cage: one material, one set of GPU state changes. */
const EDGE_MATERIAL = new THREE.LineBasicMaterial({
  color: 0x888888,
  transparent: true,
  opacity: 0.5,
});

/**
 * How sharp a fold has to be to count as an edge.
 *
 * At 15 degrees the tessellation of a curved surface comes through as a net of
 * lines over it. At 40 the cage is the form: the seat, the runners, the frame.
 */
const EDGE_ANGLE = 40;

/**
 * Past this, no cage at all.
 *
 * Nothing in the library comes near it, but an imported scan can be millions of
 * triangles, and there is no amount of waiting that makes a cage of it useful -
 * it would be a solid grey mass, built over several frozen seconds.
 */
const MAX_TRIANGLES = 400_000;

const cages = new WeakMap<THREE.BufferGeometry, Promise<THREE.BufferGeometry | null>>();

const triangleCount = (geometry: THREE.BufferGeometry) =>
  (geometry.index ? geometry.index.count : (geometry.attributes.position?.count ?? 0)) / 3;

/** Run the work when the browser has a gap, and never on the current frame. */
const whenIdle = (work: () => void) => {
  const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: object) => void })
    .requestIdleCallback;
  if (idle) idle(work, { timeout: 600 });
  else setTimeout(work, 0);
};

const edgeGeometry = (source: THREE.BufferGeometry): Promise<THREE.BufferGeometry | null> => {
  const held = cages.get(source);
  if (held) return held;

  const building = new Promise<THREE.BufferGeometry | null>((resolve) => {
    if (triangleCount(source) > MAX_TRIANGLES) {
      resolve(null);
      return;
    }
    whenIdle(() => {
      try {
        resolve(new THREE.EdgesGeometry(source, EDGE_ANGLE));
      } catch (error) {
        console.error('Could not build an edge cage:', error);
        resolve(null);
      }
    });
  });

  cages.set(source, building);
  return building;
};

/**
 * The cage over one mesh, once it exists.
 *
 * Resolves to null for geometry too heavy to be worth caging. Callers should
 * assume time has passed and re-check whether the mode is still wanted.
 */
export const edgeOverlay = async (mesh: THREE.Mesh): Promise<THREE.LineSegments | null> => {
  const held = overlays.get(mesh);
  if (held) return held;

  const geometry = await edgeGeometry(mesh.geometry);
  if (!geometry) return null;

  // Two meshes sharing one geometry can arrive here together.
  const raced = overlays.get(mesh);
  if (raced) return raced;

  const line = new THREE.LineSegments(geometry, EDGE_MATERIAL);
  // A boolean survives the JSON round trip a clone puts userData through, so a
  // copy can still recognise the cages it inherited and drop them.
  line.userData.edgeOverlay = true;
  line.raycast = () => null;
  mesh.add(line);
  overlays.set(mesh, line);
  return line;
};

const isEdgeOverlay = (object: THREE.Object3D) => object.userData.edgeOverlay === true;

/**
 * A second copy of a placed model.
 *
 * Geometry and textures are shared with the original by reference, as with any
 * three clone - what has to be put right is everything the scene hung on it
 * since it was loaded: the material it may currently be masquerading in, and
 * any edge cage. The copy starts as the file authored it.
 */
export const cloneModel = (source: THREE.Object3D): THREE.Object3D => {
  const copy = source.clone(true);

  // clone(true) walks the tree in the same order it was built, so the two
  // traversals line up node for node.
  const originals: THREE.Object3D[] = [];
  source.traverse((node) => originals.push(node));
  const copies: THREE.Object3D[] = [];
  copy.traverse((node) => copies.push(node));

  copies.forEach((node, index) => {
    if (isEdgeOverlay(node)) {
      node.removeFromParent();
      return;
    }
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const twin = originals[index] as THREE.Mesh | undefined;
    // Take the authored materials, not whatever the viewing mode swapped in.
    if (twin?.isMesh) authored.set(mesh, authoredMaterial(twin));
    mesh.material = authoredMaterial(mesh);
  });

  return copy;
};
