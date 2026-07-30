import React, { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { fieldOf } from '../lib/projection';

/**
 * The curvilinear view, rendered rather than warped.
 *
 * The scene goes onto the six faces of a cube once per frame, and then one
 * full-screen pass asks, for every pixel, "what is along this ray" and reads it
 * off the cube. That is the whole trick, and it is what makes the difference
 * between this and a post-process fisheye:
 *
 *  - lines stay smooth, because nothing is being resampled from a stretched
 *    flat image
 *  - the field can be the entire 360, because there is a picture in every
 *    direction to read, not just what fitted in a flat frame
 *  - the zenith and the nadir are really there, which is what makes it five
 *    point rather than a bulged two point
 *
 * The cost is six renders instead of one. The scene is boxes and a handful of
 * figures, and the faces are kept small on a phone.
 */
export const Panorama: React.FC<{ spread: number; blend: number }> = ({ spread, blend }) => {
  const { gl, scene, camera, size } = useThree();

  const faceSize = useMemo(
    () => (Math.min(size.width, size.height) < 700 ? 512 : 1024),
    [size.width, size.height]
  );

  const rig = useMemo(() => {
    const target = new THREE.WebGLCubeRenderTarget(faceSize, {
      generateMipmaps: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    const cubeCamera = new THREE.CubeCamera(0.05, 2000, target);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        panorama: { value: target.texture },
        halfYaw: { value: 1 },
        halfPitch: { value: 1 },
        blend: { value: 0 },
        orientation: { value: new THREE.Matrix3() },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform samplerCube panorama;
        uniform float halfYaw;
        uniform float halfPitch;
        uniform float blend;
        uniform mat3 orientation;
        varying vec2 vUv;

        void main() {
          vec2 clip = vUv * 2.0 - 1.0;

          // Equirectangular: across is bearing, up is elevation, both linear.
          float yaw = clip.x * halfYaw;
          float pitch = clip.y * halfPitch;
          float cosPitch = cos(pitch);
          vec3 equi = vec3(sin(yaw) * cosPitch, sin(pitch), -cos(yaw) * cosPitch);

          // Equidistant fisheye: distance from centre is angle from centre.
          vec2 radial = vec2(clip.x * halfYaw, clip.y * halfPitch);
          float radius = length(radial);
          vec3 fish = vec3(0.0, 0.0, -1.0);
          if (radius > 1e-5) {
            fish = vec3(radial * (sin(radius) / radius), -cos(radius));
          }

          vec3 direction = normalize(mix(equi, fish, blend));
          gl_FragColor = textureCube(panorama, orientation * direction);
          #include <colorspace_fragment>
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    const quadScene = new THREE.Scene();
    quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

    return { target, cubeCamera, material, quadScene, quadCamera: new THREE.Camera() };
  }, [faceSize]);

  useEffect(() => () => {
    rig.target.dispose();
    rig.material.dispose();
  }, [rig]);

  // Priority above zero, so react-three-fiber hands the frame over instead of
  // drawing the flat view underneath this one.
  useFrame(() => {
    const { halfYaw, halfPitch } = fieldOf(spread, size.width, size.height);
    rig.material.uniforms.halfYaw.value = halfYaw;
    rig.material.uniforms.halfPitch.value = halfPitch;
    rig.material.uniforms.blend.value = blend;
    rig.material.uniforms.orientation.value.setFromMatrix4(camera.matrixWorld);

    rig.cubeCamera.position.copy(camera.position);
    rig.cubeCamera.update(gl, scene);

    gl.setRenderTarget(null);
    gl.render(rig.quadScene, rig.quadCamera);
  }, 1);

  return null;
};
