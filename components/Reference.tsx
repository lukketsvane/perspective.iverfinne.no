import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

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
    <lineLoop raycast={() => null} ref={ref} geometry={geometry} renderOrder={998} frustumCulled={false}>
      <lineBasicMaterial color={color} transparent opacity={0.55} depthTest={false} depthWrite={false} />
    </lineLoop>
  );
};
