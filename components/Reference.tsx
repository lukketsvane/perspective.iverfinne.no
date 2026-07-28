import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FIGURE_HEIGHT } from '../store';

/**
 * The horizon / eye-level line.
 *
 * Drawn as a very large circle laid flat at the camera's own height and
 * re-centred on the camera every frame. Projected, that circle *is* the
 * vanishing line of the ground plane: every horizontal vanishing point in the
 * scene sits on it, whatever the camera is doing. It is drawn without depth
 * testing so it stays readable on top of the geometry, exactly like a horizon
 * ruled on paper before the drawing goes down.
 */
export const HorizonLine: React.FC<{ color: string }> = ({ color }) => {
  const ref = useRef<THREE.LineLoop>(null);

  const geometry = useMemo(() => {
    const radius = 500;
    const segments = 256;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  useFrame(({ camera }) => {
    if (ref.current) {
      // Eye level is wherever the camera actually is, so the line stays true
      // even when the eye-level lock is off.
      ref.current.position.copy(camera.position);
    }
  });

  return (
    <lineLoop ref={ref} geometry={geometry} renderOrder={998} frustumCulled={false}>
      <lineBasicMaterial color={color} transparent opacity={0.55} depthTest={false} depthWrite={false} />
    </lineLoop>
  );
};

/**
 * A 1.75 m stick figure used to read box sizes against a human.
 * Stays turned towards the camera about the Y axis so it is always legible,
 * but keeps its real height and real position on the ground plane.
 */
export const ScaleFigure: React.FC<{ position: [number, number, number]; color: string }> = ({ position, color }) => {
  const ref = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    // Proportions of a 1.75 m adult, in metres, in the XY plane.
    const headRadius = 0.1;
    const headCentre = 1.65;
    const neck = 1.5;
    const shoulder = 1.44;
    const hip = 0.92;

    const segments: [number, number, number, number][] = [
      // spine + neck
      [0, hip, 0, neck],
      [0, neck, 0, headCentre - headRadius],
      // shoulders and arms
      [-0.21, shoulder, 0.21, shoulder],
      [-0.21, shoulder, -0.27, 0.95],
      [0.21, shoulder, 0.27, 0.95],
      // hips and legs
      [-0.14, hip, 0.14, hip],
      [-0.14, hip, -0.16, 0],
      [0.14, hip, 0.16, 0],
    ];

    const points: THREE.Vector3[] = [];
    segments.forEach(([x1, y1, x2, y2]) => {
      points.push(new THREE.Vector3(x1, y1, 0), new THREE.Vector3(x2, y2, 0));
    });

    // Head, as a ring of short segments.
    const headSegments = 24;
    for (let i = 0; i < headSegments; i++) {
      const a1 = (i / headSegments) * Math.PI * 2;
      const a2 = ((i + 1) / headSegments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(Math.cos(a1) * headRadius, headCentre + Math.sin(a1) * headRadius, 0),
        new THREE.Vector3(Math.cos(a2) * headRadius, headCentre + Math.sin(a2) * headRadius, 0)
      );
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  // Scale the proportions (authored at 1.75 m) if the constant ever changes.
  const scale = FIGURE_HEIGHT / 1.75;

  useFrame(({ camera }) => {
    if (ref.current) {
      ref.current.rotation.y = Math.atan2(
        camera.position.x - position[0],
        camera.position.z - position[2]
      );
    }
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color={color} transparent opacity={0.95} />
      </lineSegments>
    </group>
  );
};
