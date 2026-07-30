import * as THREE from 'three';

/**
 * What the curvilinear overlay needs to know, updated in the render loop.
 *
 * The grid is SVG and the picture is WebGL, so the two live in different trees.
 * Rather than push camera state through React sixty times a second, the scene
 * writes it here and the overlay reads it on the next animation frame - the
 * same arrangement the focus point and the vanishing points use.
 */
export const curvilinearView = {
  /** Bumped whenever anything below changes. */
  nonce: 0,
  active: false,
  /** Width of the panorama in degrees. */
  spread: 120,
  /** 0 equirectangular, 1 equidistant fisheye. */
  blend: 0,
  cameraMatrix: new THREE.Matrix4(),
};

const lastMatrix = new THREE.Matrix4();

export const updateCurvilinearView = (
  active: boolean,
  spread: number,
  blend: number,
  cameraMatrix: THREE.Matrix4
) => {
  const moved =
    !lastMatrix.equals(cameraMatrix) ||
    curvilinearView.active !== active ||
    curvilinearView.spread !== spread ||
    curvilinearView.blend !== blend;
  if (!moved) return;

  lastMatrix.copy(cameraMatrix);
  curvilinearView.active = active;
  curvilinearView.spread = spread;
  curvilinearView.blend = blend;
  curvilinearView.cameraMatrix.copy(cameraMatrix);
  curvilinearView.nonce += 1;
};
