import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * The ground, ruled.
 *
 * The generic grid this replaces drew one size of cell in one colour, which
 * makes a floor but not a ruler: at three metres out you cannot tell the fourth
 * line from the fortieth, and nothing says which way the scene is facing.
 *
 * This draws three rulers at once - the step you snap to, the metre, and the
 * five - each heavier than the last, so distance is read the way it is read off
 * a tape measure. The two axes through the origin are coloured, and coloured to
 * match the curvilinear construction sheet: red runs along X, green along Z. So
 * turning the projection inside out does not change what the colours mean.
 *
 * Every line is one pixel wide wherever it lands, because the width is divided
 * by the screen-space derivative rather than being a fixed thickness in metres.
 * That is also what antialiases it: no sampling, no polylines, no stair steps,
 * and no moiré where the lines crowd towards the horizon - the fade takes them
 * out before they can interfere.
 */

/** How far the sheet reaches. Beyond this the lines are gone entirely. */
const REACH = 90;

export const GroundGrid: React.FC<{
  /** Metres between the finest lines - whatever dragging currently snaps to. */
  cell: number;
  dark: boolean;
  onClick?: (event: { stopPropagation: () => void }) => void;
}> = ({ cell, dark, onClick }) => {
  const mesh = useRef<THREE.Mesh>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          cell: { value: cell },
          reach: { value: REACH },
          ink: { value: new THREE.Color('#000000') },
          axisX: { value: new THREE.Color('#e0342a') },
          axisZ: { value: new THREE.Color('#2e9e4f') },
          strength: { value: 1 },
        },
        vertexShader: `
          varying vec3 vWorld;
          void main() {
            vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float cell;
          uniform float reach;
          uniform vec3 ink;
          uniform vec3 axisX;
          uniform vec3 axisZ;
          uniform float strength;
          varying vec3 vWorld;

          /**
           * One ruler's worth of lines, a pixel wide at any distance.
           *
           * Dividing the distance-to-a-line by that value's own screen-space
           * derivative is what keeps the width constant in pixels rather than
           * in metres, and what makes the line fade out honestly instead of
           * aliasing once the spacing falls below a pixel.
           */
          float ruled(vec2 p, float spacing, float width) {
            vec2 f = p / spacing;
            vec2 d = abs(fract(f - 0.5) - 0.5) / max(fwidth(f), vec2(1e-5));
            return 1.0 - smoothstep(0.0, width, min(d.x, d.y));
          }

          /** The same, for a single line along one axis. */
          float axisLine(float coord, float scale, float width) {
            float f = coord / scale;
            return 1.0 - smoothstep(0.0, width, abs(f) / max(fwidth(f), 1e-5));
          }

          void main() {
            vec2 p = vWorld.xz;

            float fine = ruled(p, cell, 1.0) * 0.20;
            float metre = ruled(p, 1.0, 1.0) * 0.34;
            float section = ruled(p, 5.0, 1.15) * 0.55;

            // The heavier ruler always wins, so a metre line does not read as a
            // pile of three lines drawn on top of one another.
            float grey = max(fine, max(metre, section));

            float alongX = axisLine(p.y, 1.0, 1.3);
            float alongZ = axisLine(p.x, 1.0, 1.3);

            vec3 colour = ink;
            float amount = grey;
            if (alongX > 0.01 || alongZ > 0.01) {
              // Sitting on an axis: take its colour, and its full strength.
              colour = alongX > alongZ ? axisX : axisZ;
              amount = max(grey, max(alongX, alongZ) * 0.8);
            }

            // Out of range, and edge-on. Both ends of the fade matter: without
            // the second, the sheet turns to a solid wash at the horizon.
            float distance = length(p - cameraPosition.xz);
            float far = 1.0 - smoothstep(reach * 0.35, reach, distance);
            float grazing = smoothstep(0.0, 0.16, abs(normalize(cameraPosition - vWorld).y));

            float alpha = amount * far * grazing * strength;
            if (alpha < 0.002) discard;
            gl_FragColor = vec4(colour, alpha);
            #include <colorspace_fragment>
          }
        `,
      }),
    []
  );

  material.uniforms.cell.value = cell;
  material.uniforms.ink.value.set(dark ? '#c8c8c8' : '#111111');
  material.uniforms.axisX.value.set(dark ? '#ff6a5e' : '#e0342a');
  material.uniforms.axisZ.value.set(dark ? '#5fd08a' : '#2e9e4f');
  material.uniforms.strength.value = dark ? 0.75 : 1;

  /**
   * The sheet follows the viewer, snapped to its own coarsest ruler.
   *
   * A plane big enough to cover the ground everywhere would spend most of its
   * pixels out of sight; one that follows continuously would swim underfoot.
   * Snapping to five metres means it only ever moves by a whole cell, which is
   * a move you cannot see.
   */
  useFrame(({ camera }) => {
    if (!mesh.current) return;
    mesh.current.position.x = Math.round(camera.position.x / 5) * 5;
    mesh.current.position.z = Math.round(camera.position.z / 5) * 5;
  });

  return (
    <mesh
      ref={mesh}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.008, 0]}
      material={material}
      onClick={onClick}
      frustumCulled={false}
    >
      <planeGeometry args={[REACH * 2.4, REACH * 2.4]} />
    </mesh>
  );
};
