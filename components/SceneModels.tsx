import React, { useCallback, useEffect } from 'react';
import { ThreeEvent, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { noteDragEnd } from '../lib/dragGuard';
import { createGroundPicker } from '../lib/groundDrag';
import { SceneModel } from '../types';
import { Edges } from '@react-three/drei';

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

const TRANSPARENT_MATTE = new THREE.MeshStandardMaterial({
  color: 0xf2f2f0,
  roughness: 0.92,
  metalness: 0,
  transparent: true,
  opacity: 0.25,
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
  const theme = useStore((state) => state.theme);

  const modelMaterial = useStore((state) => state.modelMaterial);
  const { camera, gl } = useThree();
  const isSelected = selectedModelId === model.id;
  const outlineColor = theme === 'dark' ? '#ff5555' : '#ff3b30';

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

      // A figure standing in the sun has to throw a shadow like everything
      // else, or it reads as a sticker on the floor.
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (!mesh.userData.originalMaterial) {
        mesh.userData.originalMaterial = mesh.material;
      }

      if (modelMaterial === 'matte') {
        mesh.material = MATTE;
      } else if (modelMaterial === 'transparent-outline') {
        mesh.material = TRANSPARENT_MATTE;
        if (!mesh.userData.edgesLine) {
           const edges = new THREE.EdgesGeometry(mesh.geometry, 15);
           const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.5 }));
           mesh.add(line);
           mesh.userData.edgesLine = line;
        }
      } else {
        mesh.material = mesh.userData.originalMaterial as THREE.Material;
      }

      if (mesh.userData.edgesLine) {
         mesh.userData.edgesLine.visible = modelMaterial === 'transparent-outline';
      }
    });
  }, [modelMaterial, model.object]);

  /**
   * Slide the model along the floor.
   *
   * A tap on an unselected model selects it and stops there: the second grab is
   * what moves it, so brushing past a figure while looking around never shoves
   * it across the room. Holding shift lifts it instead, for anything that is
   * meant to be off the ground.
   */
  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();

      if (!isSelected) {
        selectModel(model.id);
        return;
      }

      setIsDragging(true);
      document.body.style.cursor = 'grabbing';

      const start: [number, number, number] = [...model.position];
      const pointOnGround = createGroundPicker(camera, gl.domElement);
      const grabbed = pointOnGround(e.clientX, e.clientY) ?? new THREE.Vector3(start[0], 0, start[2]);
      const startClientY = e.clientY;

      const onMove = (moveEvent: PointerEvent) => {
        // Same snap as the boxes, so a figure can be lined up on the grid.
        const snap = useStore.getState().snapStep;
        const place = (v: number) => (snap > 0 ? Math.round(v / snap) * snap : v);

        if (moveEvent.shiftKey) {
          // Each pixel of upward drag raises the model by a fraction of a
          // metre; the scale is loose so a quick swipe covers the useful range.
          const dy = startClientY - moveEvent.clientY;
          updateModel(model.id, { position: [start[0], Math.max(0, place(start[1] + dy * 0.02)), start[2]] });
          return;
        }

        const now = pointOnGround(moveEvent.clientX, moveEvent.clientY);
        if (!now) return;
        updateModel(model.id, {
          position: [place(start[0] + (now.x - grabbed.x)), start[1], place(start[2] + (now.z - grabbed.z))],
        });
      };

      const onUp = () => {
        noteDragEnd();
        setIsDragging(false);
        document.body.style.cursor = 'auto';
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [isSelected, model.id, model.position, selectModel, updateModel, setIsDragging, camera, gl]
  );

  if (!model.object) return null;

  return (
    <group
      userData={{ selectableType: 'model', selectableId: model.id }}
      position={model.position}
      rotation={[0, model.rotationY, 0]}
      scale={model.scale}
      onPointerDown={handlePointerDown}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <primitive object={model.object} />

      {isSelected && (
        <mesh position={[0, model.size[1] / 2, 0]} raycast={() => null}>
          <boxGeometry args={[model.size[0], model.size[1], model.size[2]]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          {/* Geometry wireframes include each face's triangulation. Edges keeps
              only the twelve outside cage segments. */}
          <Edges raycast={() => null} threshold={15} color={outlineColor} />
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
