/**
 * Standing the scene on the real floor.
 *
 * What the AR button did before was ask for an immersive session, put it on a
 * global, and never hand it to the renderer - so "AR" was the phone's compass
 * turning the view and nothing else. No tracking, no floor, no passthrough.
 *
 * What it should be is what the Measure app does: the device knows where it is
 * in the room to a centimetre, the floor of the model is the floor you are
 * standing on, and walking around the scene means walking around the room.
 * WebXR gives all three, in this order:
 *
 *  - a `local-floor` reference space, whose origin sits on the real floor, so
 *    the ground grid needs no aligning - y = 0 already is the ground;
 *  - the renderer's own XR camera, which is driven by the device's tracked
 *    pose every frame, so six degrees of freedom come for free and the walk
 *    controls must get out of the way;
 *  - a hit test along the view ray, which is how a plane is found and how a
 *    tap decides where the scene should stand.
 *
 * Moving the scene is done by offsetting the reference space rather than by
 * moving the scene: the room is what is fixed.
 */

import type * as THREE from 'three';

export interface ARSession {
  session: XRSession;
  /** The floor-aligned space the camera is tracked in. */
  space: XRReferenceSpace;
  /** Along the view ray, for finding a surface. Absent if unsupported. */
  hitTest?: XRHitTestSource;
}

export const arSupported = async (): Promise<boolean> => {
  if (typeof navigator === 'undefined' || !navigator.xr) return false;
  try {
    return await navigator.xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
};

/**
 * Start a session and hand it to the renderer.
 *
 * `local-floor` is required rather than optional: without it the origin is
 * wherever the phone happened to be when the session started, which puts the
 * model's floor at chest height.
 */
export const startAR = async (gl: THREE.WebGLRenderer): Promise<ARSession | null> => {
  if (!(await arSupported())) return null;

  const session = await navigator.xr!.requestSession('immersive-ar', {
    requiredFeatures: ['local-floor'],
    optionalFeatures: ['hit-test', 'dom-overlay', 'anchors'],
  });

  gl.xr.enabled = true;
  gl.xr.setReferenceSpaceType('local-floor');
  await gl.xr.setSession(session);

  const space = (gl.xr.getReferenceSpace() ?? (await session.requestReferenceSpace('local-floor'))) as XRReferenceSpace;

  let hitTest: XRHitTestSource | undefined;
  try {
    const viewer = await session.requestReferenceSpace('viewer');
    hitTest = await session.requestHitTestSource?.({ space: viewer });
  } catch {
    // A device without hit test still tracks; it just cannot be told where to
    // put the scene, which is what the floor-aligned origin is for.
  }

  return { session, space, hitTest };
};

/**
 * Move the room under the viewer.
 *
 * Offsetting the reference space by the inverse of where the scene should
 * stand is the sanctioned way to do this: the tracked pose stays honest and
 * nothing in the scene graph has to be told it has moved.
 */
export const placeSceneAt = (gl: THREE.WebGLRenderer, base: XRReferenceSpace, x: number, y: number, z: number) => {
  const offset = new XRRigidTransform({ x: -x, y: -y, z: -z, w: 1 });
  gl.xr.setReferenceSpace(base.getOffsetReferenceSpace(offset));
};

export const endAR = (gl: THREE.WebGLRenderer, active: ARSession | null) => {
  gl.xr.enabled = false;
  active?.hitTest?.cancel();
  void active?.session.end().catch(() => undefined);
};
