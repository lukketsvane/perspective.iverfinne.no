import * as THREE from 'three';
import type { BoxData, SceneModel } from '../types';
import { cloneModel } from './modelMaterials';

/**
 * The scene, handed to the phone's own augmented reality.
 *
 * Every other way of putting a drawing into a real room is a compromise: a
 * camera feed behind a canvas, a gyroscope pretending to be a tracker, a
 * six-degree pose guessed from one sensor. An iPhone already ships the good
 * version of this - open a `.usdz` and Quick Look drops it on the floor with
 * full ARKit tracking, so you walk round it, kneel to it and look along it, and
 * it stays exactly where you put it. That is the thing this tool wants: the
 * scene you composed, standing at true size in the room you are standing in,
 * to walk around and draw from.
 *
 * So the AR mode is not a renderer here. It is an export, and the tracking is
 * Apple's.
 */

/** Whether this browser can hand a `.usdz` to a system AR viewer. */
export const quickLookAvailable = () => {
  if (typeof document === 'undefined') return false;
  const anchor = document.createElement('a');
  // The canonical test, and the one Safari itself answers: a browser that
  // understands rel="ar" is a browser with Quick Look behind it.
  return !!anchor.relList?.supports?.('ar');
};

/**
 * Plain white, and lit by the real room.
 *
 * The ink shaders cannot go: they are unlit ShaderMaterials that draw a line
 * where a surface turns edge-on to a *virtual* eye, and there is no such eye
 * out there - the whole point of walking round the thing is that the eye is
 * yours. What belongs in a real room is the form, in a material that takes the
 * room's own light. Roughness high and metalness nil, so it reads as plaster
 * or paper rather than as a prop.
 */
const blockMaterial = () =>
  new THREE.MeshStandardMaterial({ color: 0xf2efe9, roughness: 0.85, metalness: 0 });

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);

/**
 * Everything standing on the grid, as one group at true size.
 *
 * The room is left out on purpose. You are already in a room; a second one
 * dropped over it would put walls through the walls. The lamps go too - Quick
 * Look lights the scene from an estimate of the real light, which is a better
 * answer than any lamp placed against a virtual sun.
 */
export interface ARAnchor {
  x: number;
  z: number;
}

export const sceneForAR = (
  boxes: BoxData[],
  models: SceneModel[],
  anchor: ARAnchor = { x: 0, z: 0 }
): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'PerspectiveScene';

  /*
   * Quick Look puts the USDZ origin on the plane it finds in front of the
   * phone. Make that origin the place at the centre of our canvas, rather
   * than the drawing's arbitrary world origin. Thus the form the viewer was
   * sighting when they pressed AR is the form that arrives straight ahead.
   * Y deliberately stays on the composed ground plane.
   */
  group.position.set(-anchor.x, 0, -anchor.z);

  boxes.forEach((box) => {
    const mesh = new THREE.Mesh(boxGeometry, blockMaterial());
    mesh.position.fromArray(box.position);
    mesh.rotation.fromArray(box.rotation as [number, number, number]);
    mesh.scale.fromArray(box.scale);
    mesh.name = box.name ?? 'block';
    group.add(mesh);
  });

  models.forEach((model) => {
    if (!model.object) return;
    const copy = cloneModel(model.object);
    copy.position.fromArray(model.position);
    copy.rotation.set(0, model.rotationY, 0);
    copy.scale.setScalar(model.scale);
    copy.name = model.name;
    group.add(copy);
  });

  group.updateMatrixWorld(true);
  return group;
};

/**
 * Write the scene out as USDZ.
 *
 * The exporter is fetched on the press rather than shipped in the opening
 * chunk: it is a zip writer and a USD serialiser for a path most sessions
 * never walk, and the tool has to be on screen in one download.
 */
export const sceneToUSDZ = async (
  boxes: BoxData[],
  models: SceneModel[],
  anchor?: ARAnchor
): Promise<Blob> => {
  const group = sceneForAR(boxes, models, anchor);
  if (group.children.length === 0) throw new Error('There is nothing standing on the grid to look at.');

  const { USDZExporter } = await import('three/examples/jsm/exporters/USDZExporter.js');
  /*
   * Both spellings, because the shipped exporter and its published types are
   * not the same vintage. three 0.160's exporter is `parse(scene, options) =>
   * Promise`; the `@types/three` in the tree describes a later one where
   * `parse` is a callback form and the promise is `parseAsync`. Asking for
   * whichever is actually there costs three lines and means a version bump
   * does not turn this path into a runtime type error nobody sees until an
   * iPhone presses the button.
   */
  const exporter = new USDZExporter() as unknown as {
    parseAsync?: (scene: THREE.Object3D, options?: object) => Promise<Uint8Array>;
    parse: (scene: THREE.Object3D, options?: object) => Promise<Uint8Array>;
  };
  const settings = {
    // Anchored to a horizontal plane, which is the floor - a scene composed on
    // a metric ground grid belongs on the ground, not floating at the height
    // the phone happened to be held at.
    ar: { anchoring: { type: 'plane' }, planeAnchoring: { alignment: 'horizontal' } },
    // Writes the materials in the older subset Quick Look reads reliably. The
    // newer form renders in some viewers and comes up untextured white in
    // Apple's, and Apple's is the one this whole path exists for.
    quickLookCompatible: true,
  };
  const written = exporter.parseAsync
    ? await exporter.parseAsync(group, settings)
    : await exporter.parse(group, settings);
  return new Blob([written as unknown as BlobPart], { type: 'model/vnd.usdz+zip' });
};

/**
 * Hand it to Quick Look, at the size it really is.
 *
 * `allowsContentScaling=0` is the important half. Left on, Quick Look lets a
 * pinch resize the model, and a perspective reference you can pinch is not a
 * reference any more - the entire value of standing a 2.1 m door in your
 * hallway is that it is 2.1 m. It is placed at true size and it stays there.
 *
 * Safari only intercepts an `<a rel="ar">` that contains an image child, which
 * is not a documented nicety so much as how the feature is implemented; an
 * anchor without one navigates to the file instead of opening the viewer.
 */
export const openInQuickLook = (file: Blob, name: string): void => {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.rel = 'ar';
  anchor.href = `${url}#allowsContentScaling=0`;
  anchor.appendChild(document.createElement('img'));
  anchor.style.display = 'none';
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Long enough for the viewer to have taken the bytes; the blob is a copy of
  // the whole scene and holding it forever is a leak per press.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
};

/** No system viewer: write the file out so it can be carried to a device. */
export const downloadUSDZ = (file: Blob, name: string): void => {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
};
