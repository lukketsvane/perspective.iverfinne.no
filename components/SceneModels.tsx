import React, { useCallback, useEffect, useMemo } from 'react';
import { ThreeEvent, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { SceneModel } from '../types';

/**
 * One matte white material, shared by every model that is switched to it.
 *
 * Photographed skin and fabric is a lot of information to draw past. Swapped
 * for plain white, a figure reads as form and value only - which is what it is
 * doing in a perspective scene full of white boxes.
 */
const MATTE = new THREE.MeshStandardMaterial({
  color: 0xf2f2f0,
  roughness: 0.92,
  metalness: 0,
});

/**
 * An uploaded model standing in the scene.
 *
 * Uploaded models are placed rather than resized: they arrive at their real
 * size (USDZ and glTF are both in metres) and the only handling is sliding them
 * around the floor, so they can be lined up against the cubes and the grid.
 */
const PlacedModel: React.FC<{ model: SceneModel }> = ({ model }) => {
  const selectedModelId = useStore((state) => state.selectedModelId);
  const selectModel = useStore((state) => state.selectModel);
  const updateModel = useStore((state) => state.updateModel);
  const setIsDragging = useStore((state) => state.setIsDragging);
  const isViewMode = useStore((state) => state.isViewMode);
  const theme = useStore((state) => state.theme);

  const matteModels = useStore((state) => state.matteModels);
  const { camera, gl, controls } = useThree();
  const isSelected = selectedModelId === model.id;

  /**
   * Swap materials in place, keeping each mesh's own on the side so the switch
   * goes both ways without reloading the file.
   */
  useEffect(() => {
    const object = model.object;
    if (!object) return;
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (matteModels) {
        if (!mesh.userData.originalMaterial) mesh.userData.originalMaterial = mesh.material;
        mesh.material = MATTE;
      } else if (mesh.userData.originalMaterial) {
        mesh.material = mesh.userData.originalMaterial as THREE.Material;
      }
    });
  }, [matteModels, model.object]);
  const outlineColor = theme === 'dark' ? '#ff5555' : '#ff3b30';

  const ground = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);
  const hit = useMemo(() => new THREE.Vector3(), []);

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (isViewMode) return;
      e.stopPropagation();

      if (!isSelected) {
        selectModel(model.id);
        return;
      }

      // --- SLIDE ALONG THE GROUND ---
      setIsDragging(true);
      if (controls) (controls as any).enabled = false;
      document.body.style.cursor = 'grabbing';

      const rect = gl.domElement.getBoundingClientRect();
      const start: [number, number, number] = [...model.position];

      const pointOnGround = (clientX: number, clientY: number) => {
        pointer.set(
          ((clientX - rect.left) / rect.width) * 2 - 1,
          -((clientY - rect.top) / rect.height) * 2 + 1
        );
        raycaster.setFromCamera(pointer, camera);
        return raycaster.ray.intersectPlane(ground, hit) ? hit.clone() : null;
      };

      const grabbed = pointOnGround(e.clientX, e.clientY);

      const onMove = (moveEvent: PointerEvent) => {
        const now = pointOnGround(moveEvent.clientX, moveEvent.clientY);
        if (!now || !grabbed) return;
        updateModel(model.id, {
          position: [start[0] + (now.x - grabbed.x), 0, start[2] + (now.z - grabbed.z)],
        });
      };

      const onUp = () => {
        setIsDragging(false);
        if (controls) (controls as any).enabled = true;
        document.body.style.cursor = 'auto';
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [
      isSelected, isViewMode, model.id, model.position, selectModel, updateModel,
      setIsDragging, controls, camera, gl, ground, raycaster, pointer, hit,
    ]
  );

  if (!model.object) return null;

  return (
    <group
      position={model.position}
      rotation={[0, model.rotationY, 0]}
      scale={model.scale}
      onPointerDown={handlePointerDown}
      onClick={(e) => { if (!isViewMode) e.stopPropagation(); }}
      onDoubleClick={(e) => { if (!isViewMode) e.stopPropagation(); }}
    >
      <primitive object={model.object} />

      {isSelected && !isViewMode && (
        <mesh position={[0, model.size[1] / 2, 0]} raycast={() => null}>
          <boxGeometry args={[model.size[0], model.size[1], model.size[2]]} />
          <meshBasicMaterial color={outlineColor} wireframe transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
};

export const SceneModels = () => {
  const models = useStore((state) => state.models);
  return (
    <>
      {models.map((model) => (
        <PlacedModel key={model.id} model={model} />
      ))}
    </>
  );
};
