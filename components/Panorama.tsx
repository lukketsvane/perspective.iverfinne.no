import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { fieldOf } from '../lib/projection';
import { sceneRevision } from '../lib/sceneRevision';
import type { PerspectiveMode } from '../types';

/**
 * The curvilinear view: five-point, rendered rather than warped.
 *
 * The scene goes onto the six faces of a cube, and one full-screen pass asks,
 * for every pixel, "what is along this ray" and reads it off the cube. That is
 * what makes the difference between this and a post-process fisheye:
 *
 *  - lines stay smooth, because nothing is resampled from a stretched flat
 *    image
 *  - the field can be the entire 360, because there is a picture in every
 *    direction to read, not just what fitted in a flat frame
 *  - the zenith and the nadir are really there, which is what makes it five
 *    point rather than a bulged two point
 *
 * The projection is equidistant: distance from the centre of the frame is the
 * angle away from where you are looking, the same in every direction. Left,
 * right, up, down and straight ahead all reachable at once - which is the
 * construction Kim Jung Gi rules a page with before he draws a room.
 */
/** What each projection is, to the shader. Equidistant is zero. */
const PROJECTION_MODES: Partial<Record<PerspectiveMode, number>> = {
  equidistant: 0,
  stereographic: 1,
  cylindrical: 2,
  hyperbolic: 3,
  '5-point': 4,
  '720-noneuclidean': 5,
  mercator: 6,
  'little-planet': 7,
  'mirror-ball': 8,
  inversion: 9,
  vortex: 10,
};

export const Panorama: React.FC<{
  spread: number;
  mode: Exclude<PerspectiveMode, 'linear'>;
  /** The construction grid's colour, and 0 strength to leave it off. */
  gridColor: THREE.Color;
  gridStrength: number;
}> = ({ spread, mode, gridColor, gridStrength }) => {
  const { gl, scene, camera, size, viewport } = useThree();

  /**
   * How big each cube face has to be.
   *
   * The picture is read off the cube by angle, so what matters is how many
   * pixels of source there are per degree of view against how many pixels of
   * screen there are to fill. A face spans 90 degrees; the frame spans
   * `spread`. Match the two and the picture is sharp. Undershoot and you get
   * exactly what this looked like before the sum was done - a screen's worth of
   * detail smeared across a screen and a half.
   */
  const faceSize = useMemo(() => {
    const pixels = size.width * Math.min(viewport.dpr, 2);
    const wanted = (90 / Math.max(spread, 20)) * pixels;
    // A cube target is six faces: 2048 costs 100 MB of video memory, 4096
    // costs four hundred. The ceiling is what the device can hold, not what
    // the sum asks for.
    const capped = Math.min(size.width < 700 ? 1024 : 2048, Math.max(512, wanted));
    // Round up to a power of two: cube faces prefer it, and it stops the target
    // being rebuilt for every degree the field changes by.
    return 2 ** Math.ceil(Math.log2(capped));
  }, [size.width, viewport.dpr, spread]);

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
        orientation: { value: new THREE.Matrix3() },
        projectionMode: { value: 0 },
        gridColor: { value: new THREE.Color() },
        gridStrength: { value: 0 },
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
        uniform mat3 orientation;
        uniform int projectionMode;
        uniform vec3 gridColor;
        uniform float gridStrength;
        varying vec2 vUv;

        const float PI = 3.14159265359;
        const float HALF_PI = 1.57079632679;
        /** Fifteen degrees, the spacing Kim Jung Gi rules his sphere at. */
        const float SPACING = PI / 12.0;

        /**
         * A line of constant width in *pixels*, wherever the coordinate crosses
         * a multiple of the spacing.
         *
         * Dividing by the screen-space derivative is what keeps it one pixel
         * wide whether the meridians are splayed across the middle of the frame
         * or crowded at the edge of a 360 degree field. It is also what
         * antialiases it: no sampling, no polyline, no stair steps.
         */
        float ruled(float coord, float widthPx) {
          float f = coord / SPACING;
          float d = abs(fract(f - 0.5) - 0.5) / max(fwidth(f), 1e-5);
          return 1.0 - smoothstep(0.0, widthPx, d);
        }

        void main() {
          vec2 clip = vUv * 2.0 - 1.0;
          vec3 direction = vec3(0.0, 0.0, -1.0);

          if (projectionMode == 2) { // cylindrical
            float yaw = clip.x * halfYaw;
            float pitch = clip.y * halfPitch;
            direction = vec3(sin(yaw) * cos(pitch), sin(pitch), -cos(yaw) * cos(pitch));
          } else if (projectionMode == 6) {
            /*
             * Mercator.
             *
             * The map projection, used as a lens. Verticals stay vertical and
             * every angle is preserved locally, and the price is that the
             * zenith and the nadir are infinitely far up and down - so walking
             * under something makes it climb the frame forever without ever
             * arriving overhead.
             */
            float yaw = clip.x * halfYaw;
            float y = clip.y * halfPitch * 1.4;
            float pitch = 2.0 * atan(exp(y)) - PI * 0.5;
            direction = vec3(sin(yaw) * cos(pitch), sin(pitch), -cos(yaw) * cos(pitch));
          } else {
            vec2 radial = vec2(clip.x * halfYaw, clip.y * halfPitch);
            float radius = length(radial);
            float theta = radius; // 0 or 4 = equidistant / 5-point

            if (projectionMode == 1) { // stereographic
              theta = 2.0 * atan(radius);
            } else if (projectionMode == 3) { // hyperbolic
              theta = 2.0 * atan(radius / 2.0);
            } else if (projectionMode == 7) {
              /*
               * Little planet.
               *
               * Stereographic, but taken from the nadir: the ground curls into
               * a ball under your feet and the whole rest of the world - all
               * 360 degrees of it - stands around the rim. The floor you are
               * standing on becomes an object you are looking at.
               */
              theta = 2.0 * atan(radius * 0.55);
            } else if (projectionMode == 8) {
              /*
               * Mirror ball.
               *
               * Orthographic: the hemisphere as a solid disc, the way a chrome
               * sphere shows a room. Angle runs as the *sine* of the distance
               * from the centre, so everything crowds and flattens against the
               * rim, and the last few degrees before the edge hold half the
               * world.
               */
              theta = asin(clamp(radius / max(halfPitch, 1e-4) * 0.999, -1.0, 1.0));
            } else if (projectionMode == 9) {
              /*
               * Inversion. The world turned inside out.
               *
               * r goes to 1/r, so what is behind you sits in the middle of the
               * frame and what is in front is smeared round the outside. Every
               * straight line becomes a circle through the centre, which is
               * exactly what inversive geometry says should happen, and it is
               * genuinely hard to hold in your head while it moves.
               */
              float r = max(radius, 1e-3);
              theta = PI - 2.0 * atan(r * 0.7);
            } else if (projectionMode == 10) {
              /*
               * Vortex.
               *
               * Equidistant, with the picture rotated by an amount that grows
               * with distance from the centre. Straight lines become spirals;
               * the further out, the more twist, so the world winds itself up
               * around whatever you are looking at.
               */
              float twist = radius * 1.6;
              float c = cos(twist); float sn = sin(twist);
              radial = vec2(radial.x * c - radial.y * sn, radial.x * sn + radial.y * c);
            } else if (projectionMode == 5) { // 720-noneuclidean
              // Apply a non-Euclidean mapping (e.g. Poincare-like expansion mixed with spherical wrapping)
              // This creates a manifold where parallel lines diverge/converge based on distance
              float K = -0.5; // Negative curvature parameter
              float nonEuclideanR = log(1.0 + radius * sqrt(-K)) / sqrt(-K);
              theta = nonEuclideanR * 2.0; 
              
              // Add a Mobius spiral twist (space-time twisting)
              float twist = radius * 0.3;
              float c = cos(twist); float s = sin(twist);
              radial = vec2(radial.x * c - radial.y * s, radial.x * s + radial.y * c);
            }

            if (theta > PI && projectionMode != 4 && projectionMode != 5 && projectionMode != 9) {
              gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
              return;
            }

            if (radius > 1e-5) {
              direction = vec3(radial * (sin(theta) / radius), -cos(theta));
            }
          }

          if (projectionMode == 7) {
            // Tip the whole mapping over, so the centre of the frame is the
            // ground under the viewer rather than whatever is straight ahead.
            direction = vec3(direction.x, -direction.z, direction.y);
          }

          vec3 world = orientation * normalize(direction);
          gl_FragColor = textureCube(panorama, world);
          #include <colorspace_fragment>

          // The construction sheet, drawn where it belongs - on the sphere,
          // per pixel, rather than sampled into a polyline on top.
          if (gridStrength > 0.001) {
            float worldYaw = atan(world.x, -world.z);
            float worldPitch = asin(clamp(world.y, -1.0, 1.0));
            float worldSide = atan(world.y, world.x); // X-axis looking

            // Y-meridians (verticals, meeting at zenith/nadir)
            float polarY = 1.0 - smoothstep(0.82, 0.995, abs(world.y));
            float meridiansY = ruled(worldYaw, 1.0) * polarY * 0.42;

            // X-meridians (depth lines, meeting at left/right vanishing points)
            float polarX = 1.0 - smoothstep(0.82, 0.995, abs(world.x));
            float meridiansX = ruled(worldPitch, 1.0) * polarX * 0.42;

            // Z-meridians (front lines, meeting at center vanishing point)
            float polarZ = 1.0 - smoothstep(0.82, 0.995, abs(world.z));
            float meridiansZ = ruled(worldSide, 1.0) * polarZ * 0.42;

            // The eye-level ring is the one that matters most
            float horizon =
              (1.0 - smoothstep(0.0, 1.6, abs(worldPitch) / max(fwidth(worldPitch), 1e-5))) * 0.85;

            float ink = max(horizon, max(meridiansY, max(meridiansX, meridiansZ))) * gridStrength;
            
            // Color code the lines for clarity
            vec3 c_vert = vec3(0.0, 0.6, 1.0);  // Blue for vertical (Y)
            vec3 c_depth = vec3(1.0, 0.2, 0.2); // Red for depth (X)
            vec3 c_front = vec3(0.2, 0.8, 0.2); // Green for front (Z)
            
            vec3 overlayColor = gridColor;
            if (horizon > max(meridiansY, max(meridiansX, meridiansZ))) {
              overlayColor = gridColor;
            } else if (meridiansY > max(meridiansX, meridiansZ)) {
              overlayColor = mix(gridColor, c_vert, 0.75);
            } else if (meridiansX > meridiansZ) {
              overlayColor = mix(gridColor, c_depth, 0.75);
            } else {
              overlayColor = mix(gridColor, c_front, 0.75);
            }

            gl_FragColor.rgb = mix(gl_FragColor.rgb, overlayColor, ink);
          }
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    const quadScene = new THREE.Scene();
    quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

    return { target, cubeCamera, material, quadScene, quadCamera: new THREE.Camera() };
  }, [faceSize]);

  useEffect(
    () => () => {
      rig.target.dispose();
      rig.material.dispose();
    },
    [rig]
  );

  /**
   * What the cube was last drawn for.
   *
   * A cube map is indexed by direction, so turning your head does not
   * invalidate it - only moving does, or the scene itself changing. That is six
   * renders saved on every frame spent looking around, or dragging the sun, or
   * doing anything at all that leaves you standing where you were.
   */
  const drawnAt = useRef({ x: NaN, y: NaN, z: NaN, revision: -1, faceSize: 0 });

  // Priority above zero, so react-three-fiber hands the frame over instead of
  // drawing the flat view underneath this one.
  useFrame(() => {
    const { halfYaw, halfPitch } = fieldOf(spread, size.width, size.height);
    rig.material.uniforms.halfYaw.value = halfYaw;
    rig.material.uniforms.halfPitch.value = halfPitch;
    rig.material.uniforms.orientation.value.setFromMatrix4(camera.matrixWorld);
    rig.material.uniforms.projectionMode.value = PROJECTION_MODES[mode] ?? 0;
    rig.material.uniforms.gridColor.value.copy(gridColor);
    rig.material.uniforms.gridStrength.value = gridStrength;

    const was = drawnAt.current;
    const moved =
      Math.abs(was.x - camera.position.x) > 1e-4 ||
      Math.abs(was.y - camera.position.y) > 1e-4 ||
      Math.abs(was.z - camera.position.z) > 1e-4;

    if (moved || was.revision !== sceneRevision.value || was.faceSize !== faceSize) {
      rig.cubeCamera.position.copy(camera.position);
      rig.cubeCamera.update(gl, scene);
      drawnAt.current = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        revision: sceneRevision.value,
        faceSize,
      };
    }

    gl.setRenderTarget(null);
    gl.render(rig.quadScene, rig.quadCamera);
  }, 1);

  return null;
};
