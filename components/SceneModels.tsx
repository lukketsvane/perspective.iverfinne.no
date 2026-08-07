import React, { useEffect } from 'react';
import * as THREE from 'three';
import { useStore } from '../store';
import { SceneModel } from '../types';
import { authoredMaterial } from '../lib/modelMaterials';
import { Edges, Line } from '@react-three/drei';

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
  const showConstruction = useStore((state) => state.showConstruction);
  const isSelected = selectedModelId === model.id;
  const dark = theme === 'dark';

  /*
   * Red for the construction, green for the one in your hands.
   *
   * The cage is not a selection highlight - it is the box the thing blocks into,
   * which is the first mark anyone makes when they draw a figure, and it is
   * wanted around everything standing in the scene rather than around whichever
   * one was last tapped. So it is drawn in the construction red like the rest of
   * the sheet, and goes green only to say which one a drag would move.
   */
  const cageColor = isSelected ? (dark ? '#4ade80' : '#16a34a') : dark ? '#ff5555' : '#ff3b30';

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
      {showConstruction && <Construction model={model} color={cageColor} lit={isSelected} />}
    </group>
  );
};

/**
 * What is drawn around a thing so it can be drawn.
 *
 * The box it blocks into, the ground it stands on, the diagonals of that ground
 * and the plumb line up through the middle of it. Between them they answer the
 * four questions anyone asks of an object in a perspective study: how big is it,
 * where is it standing, where is its centre, and is it upright.
 *
 * The diagonals are the one that earns its place twice. Crossed, they mark the
 * true centre of the footprint *in perspective* - which is not the middle of the
 * drawn rectangle, and which is how a receding row is halved and doubled without
 * measuring anything.
 *
 * Everything here is inside the model's own group, so it turns and scales with
 * it and needs no arithmetic of its own.
 */
const Construction: React.FC<{ model: SceneModel; color: string; lit: boolean }> = ({
  model,
  color,
  lit,
}) => {
  const [width, height, depth] = model.size;
  const x = width / 2;
  const z = depth / 2;
  const weight = lit ? 0.85 : 0.4;

  return (
    <group raycast={() => null}>
      {/* The box it blocks into. */}
      <mesh position={[0, height / 2, 0]} raycast={() => null}>
        <boxGeometry args={[width, height, depth]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        {/* Geometry wireframes include each face's triangulation. Edges keeps
            only the twelve outside cage segments. */}
        <Edges raycast={() => null} threshold={15} color={color} />
      </mesh>

      {/* Where it stands, and the diagonals that find the middle of that. */}
      <Line
        raycast={() => null}
        points={[[-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z], [-x, 0, -z]]}
        color={color}
        lineWidth={1}
        transparent
        opacity={weight * 0.8}
      />
      <Line
        raycast={() => null}
        points={[[-x, 0, -z], [x, 0, z]]}
        color={color}
        lineWidth={1}
        dashed
        dashScale={3}
        gapSize={0.4}
        transparent
        opacity={weight * 0.55}
      />
      <Line
        raycast={() => null}
        points={[[x, 0, -z], [-x, 0, z]]}
        color={color}
        lineWidth={1}
        dashed
        dashScale={3}
        gapSize={0.4}
        transparent
        opacity={weight * 0.55}
      />

      {/* The plumb line: up through the middle, and on past the top, which is
          what you read a figure's height and balance against. */}
      <Line
        raycast={() => null}
        points={[[0, 0, 0], [0, height * 1.25, 0]]}
        color={color}
        lineWidth={1}
        dashed
        dashScale={4}
        gapSize={0.5}
        transparent
        opacity={weight * 0.5}
      />
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
