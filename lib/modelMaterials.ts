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

/** The edge cage for the transparent view, built once per mesh. */
export const edgeOverlay = (mesh: THREE.Mesh): THREE.LineSegments => {
  const held = overlays.get(mesh);
  if (held) return held;

  const line = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 15),
    new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.5 })
  );
  // A boolean survives the JSON round trip a clone puts userData through, so a
  // copy can still recognise the cages it inherited and drop them.
  line.userData.edgeOverlay = true;
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
