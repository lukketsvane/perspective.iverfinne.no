import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useStore } from '../store';
import { constructionInk } from '../lib/inkMaterial';
import { usePen } from '../lib/pen';
import type { LampData } from '../types';

/**
 * The lamps standing in the composition.
 *
 * Each is two things at once: a light, which is what it does to the scene in
 * the lit modes, and a mark, which is what says where it hangs in every mode.
 * The mark stays when the light is off or the scene is in ink - a lamp you
 * cannot see is a lamp you cannot move - and it is deliberately furniture
 * rather than drawing: quiet, small, and hanging from a plumb line so its
 * height off the floor can be read against the grid like everything else.
 */

/** Approximate a black-body temperature as an sRGB lamp colour. */
const temperatureColor = (kelvin: number) => {
  const t = THREE.MathUtils.clamp(kelvin, 1000, 12000) / 100;
  const red = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332);
  const green = t <= 66 ? 99.47 * Math.log(t) - 161.12 : 288.12 * Math.pow(t - 60, -0.0755);
  const blue = t >= 66 ? 255 : t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
  return new THREE.Color(
    THREE.MathUtils.clamp(red / 255, 0, 1),
    THREE.MathUtils.clamp(green / 255, 0, 1),
    THREE.MathUtils.clamp(blue / 255, 0, 1)
  );
};

/** How far below level a spot is tipped: aimed at the floor a stride away. */
const SPOT_TILT = 0.9;

/** The cone a spot throws, in radians of half-angle. */
const SPOT_ANGLE = 0.55;

const Lamp: React.FC<{ lamp: LampData }> = ({ lamp }) => {
  const selectedLampId = useStore((state) => state.selectedLampId);
  const theme = useStore((state) => state.theme);
  const sceneSurface = useStore((state) => state.surface);
  const pen = usePen();

  const isSelected = selectedLampId === lamp.id;
  const dark = theme === 'dark';
  const sketch = sceneSurface === 'ink' || sceneSurface === 'brush';

  const colour = useMemo(() => temperatureColor(lamp.temperature), [lamp.temperature]);
  const guide = constructionInk(sketch, dark);

  /*
   * A spot light aims at a target OBJECT, not along a rotation - so the
   * target is a real node standing where the aim says: a stride out, tipped
   * at the floor, never below it. LOCAL coordinates, because it hangs inside
   * the lamp's own group, which already carries the position - written in
   * world coordinates it stood at twice the lamp's offset, so every spot off
   * the origin lit the wrong patch of floor. And it is bound as a prop on
   * the light, not poked in from an effect: the light remounts every time
   * the kind or the switch changes, and an effect keyed on position and aim
   * has no reason to run again for that - the freshly mounted light aimed at
   * the world origin until the lamp next moved.
   */
  const target = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    target.position.set(
      Math.sin(lamp.aim) * 3,
      Math.max(-lamp.position[1], -Math.tan(SPOT_TILT) * 3),
      -Math.cos(lamp.aim) * 3
    );
    target.updateMatrixWorld();
  }, [lamp.position, lamp.aim, target]);

  /*
   * The mark reads against every page: the disc is the lamp's own light when
   * it is on, and goes hollow when it is off - a drawn bulb, not a rendered
   * one, so it neither vanishes in ink nor blows out in the lit modes.
   */
  const markColour = lamp.enabled ? colour : undefined;

  return (
    <group userData={{ selectableType: 'lamp', selectableId: lamp.id }} position={lamp.position}>
      {/* The light itself. Physical falloff, so near things are genuinely
          brighter - which is the whole lesson a placed light teaches. */}
      {lamp.enabled && lamp.kind === 'bulb' && (
        <pointLight color={colour} intensity={lamp.intensity} decay={2} castShadow={false} />
      )}
      {lamp.enabled && lamp.kind === 'spot' && (
        <>
          <spotLight
            target={target}
            color={colour}
            intensity={lamp.intensity * 2}
            angle={SPOT_ANGLE}
            penumbra={0.35}
            decay={2}
            castShadow
            shadow-mapSize-width={512}
            shadow-mapSize-height={512}
            shadow-bias={-0.0002}
          />
          <primitive object={target} />
        </>
      )}

      {/* The bulb: a disc of its own light, ringed. */}
      <mesh raycast={() => null} renderOrder={997}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshBasicMaterial
          color={markColour ?? (dark ? '#1a1a1a' : '#f4f2ee')}
          toneMapped={false}
        />
      </mesh>
      <mesh raycast={() => null} renderOrder={997}>
        <sphereGeometry args={[0.085, 16, 12]} />
        <meshBasicMaterial
          color={isSelected ? (sketch ? guide : dark ? '#4ade80' : '#16a34a') : guide}
          wireframe
          transparent
          opacity={isSelected ? 0.9 : 0.35}
          toneMapped={false}
        />
      </mesh>

      {/* Which way a spot faces: a short aim line out of the bulb. */}
      {lamp.kind === 'spot' && (
        <Line
          raycast={() => null}
          points={[
            [0, 0, 0],
            [Math.sin(lamp.aim) * 0.5, -Math.tan(SPOT_TILT) * 0.5, -Math.cos(lamp.aim) * 0.5],
          ]}
          color={markColour ? `#${colour.getHexString()}` : guide}
          lineWidth={pen}
          transparent
          opacity={0.8}
        />
      )}

      {/* The plumb to the floor, and a tick where it lands: how high a lamp
          hangs is read off the grid, like every other height here. */}
      <Line
        raycast={() => null}
        points={[[0, -0.09, 0], [0, -lamp.position[1], 0]]}
        color={guide}
        lineWidth={pen}
        transparent
        opacity={isSelected ? 0.5 : 0.22}
      />
      <mesh
        position={[0, -lamp.position[1] + 0.002, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        raycast={() => null}
      >
        <ringGeometry args={[0.05, 0.07, 20]} />
        <meshBasicMaterial color={guide} transparent opacity={isSelected ? 0.6 : 0.25} toneMapped={false} />
      </mesh>

      {/* The target, which is bigger than the mark - a 7 cm bulb across the
          room is a two-pixel tap. */}
      <mesh>
        <sphereGeometry args={[0.22, 8, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
};

export const Lamps = () => {
  const lamps = useStore((state) => state.lamps);
  return (
    <>
      {lamps.map((lamp) => (
        <Lamp key={lamp.id} lamp={lamp} />
      ))}
    </>
  );
};
