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

/**
 * How far the sheet reaches. Beyond this the lines are gone entirely.
 *
 * Fifty rather than ninety: past about thirty metres the metre ruling is
 * sub-pixel too, and a floor that fades out before it interferes reads as a
 * floor going away from you rather than as a grey haze at the horizon.
 */
const REACH = 50;

export const GroundGrid: React.FC<{
  /** Metres between the finest lines - whatever dragging currently snaps to. */
  cell: number;
  dark: boolean;
  /**
   * Whether the scene is being drawn as a line drawing.
   *
   * With the construction sheet cut to one ink, the two coloured axes on the
   * floor are the only hue left on the page. In a line drawing they go to the
   * same ink as everything else: a red line and a green line running through a
   * pen drawing are two things you did not draw.
   */
  inked?: boolean;
  /**
   * Which of the two families to rule.
   *
   * A grid is two rulings crossed, and drawing a floor is not one gesture: you
   * lay the lines running away from you to their point, and then you cross them.
   * Being able to see one family without the other is the difference between a
   * ruler and a tablecloth.
   */
  along: { x: boolean; z: boolean };
}> = ({ cell, dark, along, inked = false }) => {
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
          families: { value: new THREE.Vector2(1, 1) },
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
          /** Which families are ruled: x for the lines along X, y for along Z. */
          uniform vec2 families;
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
            /*
             * The two families, kept apart.
             *
             * A line of constant X is a member of the family running *along* Z,
             * and the other way about - so the switch for the lines that run
             * away from you is the one measured across X. Taking the smaller
             * distance of the two, as this used to, welds them into a single
             * grid that can only be had whole.
             */
            float alongX = families.x > 0.5 ? 1.0 - smoothstep(0.0, width, d.y) : 0.0;
            float alongZ = families.y > 0.5 ? 1.0 - smoothstep(0.0, width, d.x) : 0.0;
            return max(alongX, alongZ);
          }

          /** The same, for a single line along one axis. */
          float axisLine(float coord, float scale, float width) {
            float f = coord / scale;
            return 1.0 - smoothstep(0.0, width, abs(f) / max(fwidth(f), 1e-5));
          }

          void main() {
            vec2 p = vWorld.xz;
            float distance = length(p - cameraPosition.xz);

            /*
             * The finest ruler is a near ruler.
             *
             * It is spaced at whatever dragging snaps to - a quarter of a metre
             * by default - and at twelve metres out that spacing has fallen
             * below a pixel. Past there it is not a ruler at all, it is a band
             * of interference, and it was the densest thing on the screen after
             * the construction sheet. You measure with it at your feet; from
             * across the room the metre and the five do the work.
             */
            float near = 1.0 - smoothstep(4.0, 12.0, distance);

            float fine = ruled(p, cell, 1.0) * 0.20 * near;
            float metre = ruled(p, 1.0, 1.0) * 0.34;
            float section = ruled(p, 5.0, 1.15) * 0.55;

            // The heavier ruler always wins, so a metre line does not read as a
            // pile of three lines drawn on top of one another.
            float grey = max(fine, max(metre, section));

            // The two coloured axes belong to the same families as the ruling
            // they lead, and go with them.
            float alongX = families.x > 0.5 ? axisLine(p.y, 1.0, 1.3) : 0.0;
            float alongZ = families.y > 0.5 ? axisLine(p.x, 1.0, 1.3) : 0.0;

            vec3 colour = ink;
            float amount = grey;
            if (alongX > 0.01 || alongZ > 0.01) {
              // Sitting on an axis: take its colour, and its full strength.
              colour = alongX > alongZ ? axisX : axisZ;
              amount = max(grey, max(alongX, alongZ) * 0.8);
            }

            // Out of range, and edge-on. Both ends of the fade matter: without
            // the second, the sheet turns to a solid wash at the horizon.
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
  material.uniforms.ink.value.set(inked ? '#16130f' : dark ? '#c8c8c8' : '#111111');
  material.uniforms.axisX.value.set(inked ? '#16130f' : dark ? '#ff6a5e' : '#e0342a');
  material.uniforms.axisZ.value.set(inked ? '#16130f' : dark ? '#5fd08a' : '#2e9e4f');
  material.uniforms.strength.value = inked ? 0.62 : dark ? 0.75 : 1;
  material.uniforms.families.value.set(along.x ? 1 : 0, along.z ? 1 : 0);

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
      // The sheet is a drawing over the floor, never something to take hold of:
      // a tap that lands on it is a tap on nothing, which is what clears the
      // selection.
      raycast={() => null}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.008, 0]}
      material={material}
      frustumCulled={false}
    >
      <planeGeometry args={[REACH * 2.4, REACH * 2.4]} />
    </mesh>
  );
};
