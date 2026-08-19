import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useHeld, useStore } from '../store';
import { isSketch, LIT_FINISH, MESH_SURFACES, nearestSurface, SceneModel } from '../types';
import { authoredMaterial } from '../lib/modelMaterials';
import { constructionInk } from '../lib/inkMaterial';
import { useObjectMaterial } from '../lib/ownMaterial';
import { Line } from '@react-three/drei';
import { BOX_EDGES, usePen } from '../lib/pen';

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
  const held = useHeld(model.id);
  const theme = useStore((state) => state.theme);

  const sceneSurface = useStore((state) => state.surface);
  const construction = useStore((state) => state.construction);
  const isSelected = held;
  const dark = theme === 'dark';

  const surface = nearestSurface(model.surface ?? sceneSurface, MESH_SURFACES);
  const inked = isSketch(surface);
  const hardShadows = useStore((state) => state.sun.shadows) === 'hard';
  /**
   * The authored materials, flattened to the scene's own finish.
   *
   * WHY THEY ARE OVERRIDDEN AT ALL: a scanned figure arrives with photographed
   * skin and fabric on it, which is a great deal of information to draw past
   * when what the figure is doing here is standing among white boxes being read
   * for form and value. Flattening leaves the shape and takes away the
   * photograph - and it is the same finish the boxes are drawn with, so a
   * figure among them is lit by the same sun.
   *
   * Each copy is kept against the material it came from, so the twenty meshes a
   * scanned animal arrives in share one clone rather than carrying twenty.
   */
  const flattened = useMemo(() => {
    const adjusted = new WeakMap<THREE.Material, THREE.Material>();
    const materialFor = (material: THREE.Material) => {
      const held = adjusted.get(material);
      if (held) return held;
      const copy = material.clone();
      if ('roughness' in copy) (copy as THREE.MeshStandardMaterial).roughness = LIT_FINISH.roughness;
      if ('metalness' in copy) (copy as THREE.MeshStandardMaterial).metalness = LIT_FINISH.metalness;
      copy.needsUpdate = true;
      adjusted.set(material, copy);
      return copy;
    };
    return (material: THREE.Material | THREE.Material[]) =>
      Array.isArray(material) ? material.map(materialFor) : materialFor(material);
  }, []);

  /*
   * The cage goes round the one in your hands, and only that one.
   *
   * It is the box the thing blocks into, which is the first mark anyone makes
   * when they draw a figure - and the argument for drawing it round everything
   * standing in the scene was that you block in the whole scene before you
   * block in one object of it. True, and it does not survive contact with a
   * scene that has fifteen things in it: fifteen cages, fifteen footprints,
   * thirty dashed diagonals and fifteen plumb lines, over the drawing. It is
   * the red in the dark screenshot and it answers nothing, because a box round
   * everything at once is a box round nothing in particular.
   *
   * So it is the selection's, which is the moment you actually want it - and it
   * follows the page: green against the clay, ink against the ink.
   */
  const cageColor = inked ? constructionInk(true, dark) : dark ? '#4ade80' : '#16a34a';

  /**
   * Swap materials in place, keeping each mesh's own on the side so the switch
   * goes both ways without reloading the file.
   */
  /*
   * Its own material if it has settings of its own, the shared one for its rung
   * if not. See lib/ownMaterial.ts - the whole difference between setting the
   * hatch on this figure and setting it on every figure in the scene.
   */
  const drawn = useObjectMaterial(surface, model.material, false);

  useEffect(() => {
    const object = model.object;
    if (!object) return;

    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;

      /*
       * A figure standing in the sun has to throw a shadow like everything
       * else, or it reads as a sticker on the floor. Ink throws one only when
       * the shadow is hard: a soft boundary on a sheet you are going to trace
       * is indistinguishable from an edge of the object, and a hard one is a
       * shape you can lay a pen round.
       *
       * It never RECEIVES in ink, and that is not an oversight. The ink
       * material carries no lighting, so there is nothing in it for a shadow to
       * darken - and a drawing says which side is dark with its terminator,
       * not with a wash laid over the form.
       */
      mesh.castShadow = true;
      mesh.receiveShadow = surface === 'original';

      // Read the authored materials before swapping, so the first swap is what
      // records them rather than what loses them.
      const own = authoredMaterial(mesh);
      mesh.material = drawn ?? flattened(own);
    });
  }, [surface, hardShadows, model.object, drawn, flattened]);

  if (!model.object) return null;

  return (
    <group
      userData={{ selectableType: 'model', selectableId: model.id }}
      position={model.position}
      rotation={[0, model.rotationY, 0]}
      scale={model.scale}
    >
      <primitive object={model.object} />
      {(construction === 2 || (construction === 1 && isSelected)) && model.kind !== 'scene' && (
        <Construction model={model} color={cageColor} lit={isSelected || construction < 2} />
      )}
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
 *
 * `lit` is which voice it speaks in. At the ladder's top rung every model on
 * the page is blocked in at once, and a page of equal cages is a page with no
 * subject - so the selection keeps the full voice and the rest drop to an
 * underdrawing.
 */
const Construction: React.FC<{ model: SceneModel; color: string; lit: boolean }> = ({
  model,
  color,
  lit,
}) => {
  // One weight on the finished sheet - see lib/pen.ts.
  const pen = usePen();
  const [width, height, depth] = model.size;
  const x = width / 2;
  const z = depth / 2;
  const weight = lit ? 0.85 : 0.4;

  return (
    <group raycast={() => null}>
      {/* The box it blocks into: twelve segments rather than a wireframe, which
          would include every face's triangulation - and drawn with the same pen
          as everything else, which drei's <Edges> cannot be, its material's
          width being one WebGL ignores. */}
      <Line
        raycast={() => null}
        position={[0, height / 2, 0]}
        scale={[width, height, depth]}
        points={BOX_EDGES}
        segments
        color={color}
        lineWidth={pen}
        transparent
        opacity={lit ? 1 : 0.55}
      />

      {/* Where it stands, and the diagonals that find the middle of that.

          Drawn OVER the object, never through it. Depth-tested at the floor
          they were buried by anything opaque standing on them - which on a
          mesh is always, a mesh having no wire rung to fall back on - so the
          diagonals, the one mark here that derives geometry rather than
          confirming it, were permanently invisible on the chairs and the car.
          A construction line on a real sheet is drawn over the drawing; that
          is what makes it construction.

          None of it dashed. The dash was borrowed from a drafting convention
          where it means a hidden edge - and here every mark was dashed, so it
          distinguished nothing from nothing. Worse, drei dashes in world units
          along the line, so identical settings give a half-metre cube two
          dashes and a six-metre car dozens, and then the panorama resamples the
          pattern per pixel and bunches it unevenly across the frame. Weight
          says "construction" more quietly and more honestly. */}
      <Line
        raycast={() => null}
        points={[[-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z], [-x, 0, -z]]}
        color={color}
        lineWidth={pen}
        transparent
        depthTest={false}
        renderOrder={998}
        opacity={weight * 0.7}
      />
      <Line
        raycast={() => null}
        points={[[-x, 0, -z], [x, 0, z]]}
        color={color}
        lineWidth={pen}
        transparent
        depthTest={false}
        renderOrder={998}
        opacity={weight * 0.4}
      />
      <Line
        raycast={() => null}
        points={[[x, 0, -z], [-x, 0, z]]}
        color={color}
        lineWidth={pen}
        transparent
        depthTest={false}
        renderOrder={998}
        opacity={weight * 0.4}
      />

      {/* The answer those two diagonals compute.

          Every other mark here confirms geometry you already have. The
          diagonals derive geometry you do not: the true centre of a receding
          rectangle, which is not the middle of the drawn one and is how a row
          is halved and doubled without measuring. Ruling the working and
          leaving the crossing for the eye to find is stopping one step short. */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} renderOrder={999}>
        <circleGeometry args={[Math.max(0.02, Math.min(x, z) * 0.06), 16]} />
        <meshBasicMaterial color={color} transparent opacity={weight} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* The plumb line: up through the middle, and a little past the top,
          which is what you read a figure's height and balance against. */}
      <Line
        raycast={() => null}
        points={[[0, 0, 0], [0, height * 1.15, 0]]}
        color={color}
        lineWidth={pen}
        transparent
        depthTest={false}
        renderOrder={998}
        opacity={weight * 0.45}
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
