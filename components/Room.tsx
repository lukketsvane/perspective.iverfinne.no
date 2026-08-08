import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useStore } from '../store';
import { constructionInk, paperHex } from '../lib/inkMaterial';
import type { RoomLevel } from '../types';

/**
 * Four walls and a ceiling, ruled, standing round the origin.
 *
 * This is the perspective exercise. A box on open ground gives you its own
 * twelve edges and a horizon somewhere past it; a room gives you edges that
 * reach the corners of the frame, which is where a curved projection does all
 * of its visible work. Standing in the middle of one on a five-point sheet, the
 * floor lines run to the point under your feet, the ceiling lines to the one
 * over your head, and the four wall corners out to the four around the horizon.
 * Five points, one picture, nothing left to imagine - which is what the whole
 * tool is for and what it could not draw until now.
 *
 * Three decisions are worth writing down.
 *
 * The floor sits four millimetres under the ground plane rather than on it.
 * Everything else in the tool that draws the floor - the ruled grid, the plane
 * the sun's shadows land on - is at exactly zero, and two surfaces at the same
 * height fight for every pixel between them. Four millimetres is under the
 * resolution of anything anyone will ever draw from this and settles the
 * argument outright.
 *
 * There is no lighting. One directional sun outside a closed box leaves the
 * ceiling and two of the four walls perfectly black, which is true and useless.
 * These are construction surfaces: flat tones, one value per orientation so the
 * room still reads as a box, and the ruling drawn straight into them.
 *
 * And the ruling is in world coordinates, not the plane's own. A line up the
 * wall is the continuation of a line across the floor, because both are asking
 * the same question of the same metre - which is the property that makes the
 * room a measuring device rather than wallpaper.
 */

/**
 * One flat, ruled surface.
 *
 * The two axes it is ruled along are passed in as world directions, so the
 * shader never has to know which wall it is on: it takes the world position,
 * measures it along those two, and rules that.
 */
const surfaceMaterial = (
  along: THREE.Vector3,
  up: THREE.Vector3,
  tint: string,
  ink: string,
  strength: number,
  /** 1 for a surface, 0 for the ruling alone hanging in the air. */
  tone: number,
  /** 0 to leave a face bare - what the floor gets, the ground already ruling it. */
  ruling: number
) =>
  new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    // A room with no surfaces still has to let you see the things standing
    // inside it. Without this the far wall's invisible face still writes depth
    // and sorts the whole scene away behind nothing.
    transparent: tone < 0.5,
    depthWrite: tone >= 0.5,
    uniforms: {
      along: { value: along },
      up: { value: up },
      tint: { value: new THREE.Color(tint) },
      ink: { value: new THREE.Color(ink) },
      strength: { value: strength },
      tone: { value: tone },
      ruling: { value: ruling },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 along;
      uniform vec3 up;
      uniform vec3 tint;
      uniform vec3 ink;
      uniform float strength;
      uniform float tone;
      uniform float ruling;
      varying vec3 vWorld;

      /**
       * One ruler's worth of lines, a pixel wide at any distance.
       *
       * The same trick the ground is ruled with: dividing the distance to a
       * line by that value's own screen-space derivative holds the width at a
       * pixel however far off the wall is, and fades the line out honestly once
       * the spacing falls below one rather than aliasing into moire.
       */
      float ruled(vec2 p, float spacing, float width) {
        vec2 f = p / spacing;
        vec2 d = abs(fract(f - 0.5) - 0.5) / max(fwidth(f), vec2(1e-5));
        return 1.0 - smoothstep(0.0, width, min(d.x, d.y));
      }

      void main() {
        vec2 p = vec2(dot(vWorld, along), dot(vWorld, up));
        float metre = ruled(p, 1.0, 1.0) * 0.30;
        float section = ruled(p, 5.0, 1.15) * 0.6;
        float pen = max(metre, section) * strength * ruling;

        /*
         * With no tone, the ruling is all there is: lines hanging in the air
         * where the wall would be. That is the rung worth having - the line
         * where a wall meets the floor is the single most useful mark in a
         * room, being the one that says how far away the wall is, and it is
         * exactly the mark you could not have without three flat greys.
         */
        gl_FragColor = tone > 0.5
          ? vec4(mix(tint, ink, pen), 1.0)
          : vec4(mix(tint, ink, pen), pen);
        if (gl_FragColor.a < 0.004) discard;
        #include <colorspace_fragment>
      }
    `,
  });

interface Face {
  key: string;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  /** The two world directions it is ruled along. */
  along: THREE.Vector3;
  up: THREE.Vector3;
  /** Which rung of the value ladder it takes. */
  value: 0 | 1 | 2 | 3;
}

/** How far under the ground plane the room's floor sits, in metres. */
const FLOOR_DROP = 0.004;

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

/**
 * The six surfaces, at whatever size the room currently is.
 *
 * Each orientation takes its own value, lightest at the ceiling and darkest
 * underfoot, which is the oldest trick there is for making a box read as a box:
 * planes at different angles are different values, and the eye does the rest. A
 * room lit by nothing still has to look like a room.
 *
 * Only the placements depend on the size. The materials do not: the ruling is
 * measured in world coordinates, so a wall moved two metres out is still ruled
 * at the same metres, which is the property that lets the room be resized
 * without rebuilding a single shader.
 */
const facesFor = (width: number, depth: number, height: number): Face[] => {
  const x = width / 2;
  const z = depth / 2;
  return [
    { key: 'back', position: [0, height / 2, -z], rotation: [0, 0, 0], size: [width, height], along: X, up: Y, value: 1 },
    { key: 'front', position: [0, height / 2, z], rotation: [0, Math.PI, 0], size: [width, height], along: X, up: Y, value: 1 },
    { key: 'left', position: [-x, height / 2, 0], rotation: [0, Math.PI / 2, 0], size: [depth, height], along: Z, up: Y, value: 2 },
    { key: 'right', position: [x, height / 2, 0], rotation: [0, -Math.PI / 2, 0], size: [depth, height], along: Z, up: Y, value: 2 },
    { key: 'ceiling', position: [0, height, 0], rotation: [Math.PI / 2, 0, 0], size: [width, depth], along: X, up: Z, value: 0 },
    { key: 'floor', position: [0, -FLOOR_DROP, 0], rotation: [-Math.PI / 2, 0, 0], size: [width, depth], along: X, up: Z, value: 3 },
  ];
};

/** Ceiling, the two end walls, the two side walls, the floor. Light, then dark. */
const TONES: Record<'light' | 'dark', [string, string, string, string]> = {
  // Warm neutrals on the light side, to sit with the paper the tool opens on;
  // flat greys on the dark, where any hue at all reads as a colour cast.
  light: ['#f1efec', '#e4e1dc', '#d5d1cb', '#c7c2bb'],
  dark: ['#2b2b2b', '#202020', '#171717', '#0f0f0f'],
};

export const Room: React.FC<{ level: RoomLevel; dark: boolean; inked: boolean }> = ({
  level,
  dark,
  inked,
}) => {
  const { width, depth, height } = useStore((state) => state.room);
  const faces = useMemo(() => facesFor(width, depth, height), [width, depth, height]);

  const materials = useMemo(() => {
    /*
     * Two rungs, three cases.
     *
     * At level 1 there are no surfaces at all: the ruling hangs in the air
     * where the walls would be, which is the room as a measuring device with
     * nothing in front of what you are drawing.
     *
     * At level 2 on the clay it is the flat value ladder it always was - a box
     * under no lighting has to read as a box, and one value per orientation is
     * what does that. At level 2 in ink there is no ladder: every face is the
     * paper. Ink has no tone in it anywhere else and it does not get one here;
     * what level 2 means on a sheet is "you cannot see through the walls",
     * which is the more useful distinction anyway.
     */
    const paper = paperHex();
    const tones: [string, string, string, string] = inked
      ? [paper, paper, paper, paper]
      : TONES[dark ? 'dark' : 'light'];
    const pen = inked ? constructionInk(true, dark) : dark ? '#9aa0a6' : '#6d6862';
    return facesFor(1, 1, 1).map((face) =>
      surfaceMaterial(
        face.along,
        face.up,
        tones[face.value],
        pen,
        inked ? 1 : dark ? 0.65 : 0.8,
        level === 2 ? 1 : 0,
        // The floor is left bare. The ground already rules that exact plane, at
        // the snap step as well as the metre, and fades honestly with distance
        // where this does not - so ruling it twice only doubles its darkness.
        face.key === 'floor' ? 0 : 1
      )
    );
  }, [dark, inked, level]);

  // Free the shaders when the room is put away, or the theme swapped under it.
  React.useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);

  /*
   * The twelve edges, in the construction red the rest of the sheet is ruled
   * in. The four along the floor are drawn as well as the four at the ceiling:
   * where the wall meets the ground is the single most useful line in the room,
   * being the one that says how far away the wall is.
   */
  // The room was the one construction in the tool that never got the one-ink
  // memo: a saturated red pen laid over a black drawing on a paper page.
  const edge = constructionInk(inked, dark);
  const x = width / 2;
  const z = depth / 2;
  const corners: [number, number][] = [
    [-x, -z],
    [x, -z],
    [x, z],
    [-x, z],
  ];
  const loop = (y: number) =>
    [...corners, corners[0]].map(([x, z]) => [x, y, z] as [number, number, number]);

  return (
    <group raycast={() => null}>
      {faces.map((face, index) => (
        <mesh
          key={face.key}
          // A wall is a thing you draw, never a thing you take hold of: a tap
          // that lands on one is a tap on nothing, which clears the selection.
          raycast={() => null}
          position={face.position}
          rotation={face.rotation}
          material={materials[index]}
        >
          <planeGeometry args={face.size} />
        </mesh>
      ))}

      <Line raycast={() => null} points={loop(0)} color={edge} lineWidth={1.5} transparent opacity={0.85} />
      <Line raycast={() => null} points={loop(height)} color={edge} lineWidth={1.5} transparent opacity={0.7} />
      {corners.map(([x, z]) => (
        <Line
          key={`${x},${z}`}
          raycast={() => null}
          points={[[x, 0, z], [x, height, z]]}
          color={edge}
          lineWidth={1.5}
          transparent
          opacity={0.7}
        />
      ))}
    </group>
  );
};
