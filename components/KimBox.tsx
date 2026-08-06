import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Edges, Line } from '@react-three/drei';
import * as THREE from 'three';
import { BoxData } from '../types';
import { useStore } from '../store';
import { faceIsReachable, faceOutward } from '../lib/manipulate';
import { pixelsPerMetreAt } from '../lib/pick';

/**
 * A reference box, standing on the grid.
 *
 * It carries nothing but its own appearance and the marks that say what can be
 * done to it. Taking hold of it is the walk layer's business: that layer covers
 * the canvas and owns every pointer event on the glass, so a handler hung here
 * would never fire - which is exactly what used to happen, and why a box could
 * be selected but never moved.
 */

/** The mark, and what you can hit: radius in pixels on the glass. */
const DOT_PIXELS = 7;
const TARGET_PIXELS = 16;

/** All six faces. Which of them are offered is the viewer's business. */
const FACES = ([0, 1, 2] as const).flatMap((axis) =>
  ([1, -1] as const).map((sign) => ({ axis, sign, key: `${axis}${sign}` }))
);

/**
 * The faces you push and pull, marked with a dot at the centre of each.
 *
 * Three things about a face are decided by where the viewer is standing rather
 * than by the box, so all three are worked out every frame.
 *
 * Whether you are looking at it. Only the faces turned towards the eye are
 * offered - the ones behind are marks you could see and not touch, since the
 * box itself is in the way of any ray that would reach them.
 *
 * Whether it has come clear of the box. Meet a box square on and the face
 * pointing at you lands over the middle of it, so the mark goes and the middle
 * of the box goes back to being the middle of the box - which is what you want,
 * because that face cannot be pushed in any direction you could see anyway.
 *
 * And how big the mark is. A handle a fixed size in metres is a thirty-pixel
 * target on a box at arm's length, swallowing the middle of the very box it
 * belongs to, and two pixels on one across the room. Held to a size on the
 * glass, it is the same target wherever the box is standing.
 */
const FaceHandles: React.FC<{ data: BoxData; color: string }> = ({ data, color }) => {
  const { camera } = useThree();
  const marks = useRef<(THREE.Group | null)[]>([]);
  const centre = useMemo(() => new THREE.Vector3(...data.position), [data.position]);
  const outward = useMemo(
    () => FACES.map((face) => faceOutward(data.rotation, face.axis, face.sign)),
    [data.rotation]
  );
  const at = useMemo(() => new THREE.Vector3(), []);
  const eye = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    marks.current.forEach((mark, index) => {
      if (!mark) return;
      const half = data.scale[FACES[index].axis] / 2;
      eye.copy(camera.position).sub(mark.position);
      mark.visible = outward[index].dot(eye) > 0 && faceIsReachable(centre, outward[index], half);
      // A handle that is not offered has no size either. Left at its own scale
      // it would still be a metre-wide sphere of nothing, sitting in front of
      // the box and catching every ray meant for it.
      const perMetre = mark.visible ? pixelsPerMetreAt(at.copy(mark.position)) : 0;
      mark.scale.setScalar(perMetre > 1e-3 ? TARGET_PIXELS / perMetre : 0);
    });
  });

  return (
    <>
      {FACES.map((face, index) => {
        const out = outward[index].clone().multiplyScalar(data.scale[face.axis] / 2);

        return (
          <group
            key={face.key}
            ref={(node) => { marks.current[index] = node; }}
            userData={{ handleAxis: face.axis, handleSign: face.sign }}
            position={[data.position[0] + out.x, data.position[1] + out.y, data.position[2] + out.z]}
            // Sized on the first frame, by the viewer. Until then it is nothing.
            scale={0}
          >
            {/* Drawn last and without depth, so the mark stays a mark rather
                than something seen through the box's own glass. */}
            <mesh raycast={() => null} renderOrder={999}>
              <sphereGeometry args={[DOT_PIXELS / TARGET_PIXELS, 16, 12]} />
              <meshBasicMaterial color={color} toneMapped={false} depthTest={false} transparent />
            </mesh>
            {/* The target, which is bigger than the mark. */}
            <mesh>
              <sphereGeometry args={[1, 8, 6]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </>
  );
};

export const KimBox: React.FC<{ data: BoxData }> = ({ data }) => {
  const selectedId = useStore((state) => state.selectedId);
  const theme = useStore((state) => state.theme);

  const isSelected = selectedId === data.id;
  const isDark = theme === 'dark';

  // Black boxes on a black ground: the edges and the sun do the describing.
  const boxColor = isDark ? (isSelected ? '#101010' : '#000000') : (isSelected ? '#ffefef' : '#ffffff');
  const edgeColor = isDark ? (isSelected ? '#ff5555' : '#ffffff') : (isSelected ? '#ff3b30' : '#0a0a0a');

  return (
    <group userData={{ selectableType: 'box', selectableId: data.id }}>
      {/* Helper lines, drawn only around the selection. */}
      {isSelected && (
        <group>
          {/* The vertical through it, for reading its height off the grid. */}
          <Line
            raycast={() => null}
            points={[
              [data.position[0], 0, data.position[2]],
              [data.position[0], data.position[1] + data.scale[1] / 2 + 2, data.position[2]],
            ]}
            color={edgeColor}
            lineWidth={1}
            dashed
            dashScale={2}
            gapSize={0.5}
            opacity={0.5}
            transparent
          />
          {/* Where it stands. */}
          <mesh
            raycast={() => null}
            position={[data.position[0], 0.02, data.position[2]]}
            rotation={[-Math.PI / 2, 0, data.rotation[1]]}
          >
            <planeGeometry args={[data.scale[0] + 0.4, data.scale[2] + 0.4]} />
            <meshBasicMaterial color={edgeColor} transparent opacity={0.1} />
          </mesh>
        </group>
      )}

      <mesh
        position={data.position}
        rotation={data.rotation}
        scale={data.scale}
        // A box that throws no shadow is a box with no relationship to the
        // ground, which is half of what a perspective study is about.
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={boxColor}
          transparent
          opacity={0.8}
          roughness={0.8}
          metalness={0.1}
          polygonOffset
          polygonOffsetFactor={1}
        />
        <Edges raycast={() => null} scale={1} threshold={15} color={edgeColor} />
      </mesh>

      {isSelected && <FaceHandles data={data} color={edgeColor} />}
    </group>
  );
};
