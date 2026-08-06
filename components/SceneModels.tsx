import React, { useEffect } from 'react';
import * as THREE from 'three';
import { useStore } from '../store';
import { SceneModel } from '../types';
import { authoredMaterial } from '../lib/modelMaterials';
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

/**
 * An uploaded model standing in the scene.
 *
 * Uploaded models are placed rather than resized: they arrive at their real
 * size (USDZ and glTF are both in metres) and the only handling is sliding them
 * around the floor, so they can be lined up against the cubes and the grid.
 *
 * Taking hold of one is the walk layer's business - that layer covers the
 * canvas and owns every pointer event on the glass, so a handler hung here would
 * never fire. What this draws is the model, its shadows and the cage around it
 * when it is the selection.
 */
const PlacedModel: React.FC<{ model: SceneModel }> = ({ model }) => {
  const selectedModelId = useStore((state) => state.selectedModelId);
  const theme = useStore((state) => state.theme);

  const modelMaterial = useStore((state) => state.modelMaterial);
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

      // Read the authored materials before swapping, so the first swap is what
      // records them rather than what loses them.
      const own = authoredMaterial(mesh);
      mesh.material = modelMaterial === 'matte' ? MATTE : own;
    });
  }, [modelMaterial, model.object]);

  if (!model.object) return null;

  return (
    <group
      userData={{ selectableType: 'model', selectableId: model.id }}
      position={model.position}
      rotation={[0, model.rotationY, 0]}
      scale={model.scale}
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
