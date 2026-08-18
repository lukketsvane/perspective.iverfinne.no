import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { BOX_SURFACES, BoxData, isSketch, nearestSurface } from '../types';
import { useHeld, useStore } from '../store';
import { faceIsReachable, faceOutward } from '../lib/manipulate';
import { constructionInk, inkHex, paperHex } from '../lib/inkMaterial';
import { useObjectMaterial } from '../lib/ownMaterial';
import { pixelsPerMetreAt } from '../lib/pick';
import { BOX_EDGES, usePen } from '../lib/pen';

/**
 * A reference box, standing on the grid.
 *
 * It carries nothing but its own appearance and the marks that say what can be
 * done to it. Taking hold of it is the walk layer's business: that layer covers
 * the canvas and owns every pointer event on the glass, so a handler hung here
 * would never fire - which is exactly what used to happen, and why a box could
 * be selected but never moved.
 */

/**
 * The mark, and what you can hit: radius in pixels on the glass.
 *
 * They are not the same number and the gap between them is the whole design.
 * The dot is a MARK - it says a face can be pushed here, and at four and a half
 * pixels it says so without becoming a bead sitting on the drawing you are
 * trying to look at. The target around it is four times the area, because a
 * thumb is not a pixel, and it is invisible, because a target you can see is a
 * mark that is too big.
 *
 * Seven and sixteen before. The dot came down because six of them on a box the
 * size of a chair was a constellation over the very form they belong to; the
 * target went up because that is free - it costs nothing on screen and it is
 * what a finger actually meets.
 */
const DOT_PIXELS = 4.5;
const TARGET_PIXELS = 19;

/**
 * How much of a dot is left when its face is turned away.
 *
 * Every face is offered now, not just the three you can see - a box you have
 * walked round is a box whose far side you can want, and the near three are
 * exactly the three the box itself is in the way of your reaching past. So the
 * far dots are drawn through the box, as marks always were, and dimmed to say
 * which side of the form they are on. Not hidden: you cannot aim at what is not
 * drawn.
 */
const BEHIND = 0.4;

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
      /*
       * WHETHER IT IS OFFERED IS NOW ONE QUESTION, NOT TWO.
       *
       * It used to be "is this face turned towards you" AND "has it come clear
       * of the box on the glass". The first is gone: it hid the three faces you
       * most often want, since the way to want a far face is to have walked
       * round and looked at the box, and the reason given for hiding them - the
       * box is in the way of any ray that would reach them - was a fact about
       * the picker, which now prefers a handle to the body it is behind.
       *
       * The second does all the work on its own, and it is the honest test:
       * a face that has not separated itself from the middle of its own box on
       * screen cannot be pushed in any direction you could see, whichever way
       * it happens to be pointing. A face square-on to the eye fails it from
       * both sides.
       */
      mark.visible = faceIsReachable(centre, outward[index], half);
      // A handle that is not offered has no size either. Left at its own scale
      // it would still be a metre-wide sphere of nothing, sitting in front of
      // the box and catching every ray meant for it.
      const perMetre = mark.visible ? pixelsPerMetreAt(at.copy(mark.position)) : 0;
      mark.scale.setScalar(perMetre > 1e-3 ? TARGET_PIXELS / perMetre : 0);

      // Which side of the form it is on, said with paint rather than by
      // withholding it. The dot is the first child; the target is the second.
      eye.copy(camera.position).sub(mark.position);
      const dot = mark.children[0] as THREE.Mesh;
      const paint = dot?.material as THREE.MeshBasicMaterial | undefined;
      if (paint) paint.opacity = outward[index].dot(eye) > 0 ? 1 : BEHIND;
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
  const held = useHeld(data.id);
  const theme = useStore((state) => state.theme);
  const pbr = useStore((state) => state.pbr);
  const sceneSurface = useStore((state) => state.surface);

  const construction = useStore((state) => state.construction);
  // One weight on the finished sheet, whatever the field is doing and whatever
  // the picture is being rendered into - see lib/pen.ts.
  const pen = usePen();

  const isSelected = held;
  const isDark = theme === 'dark';

  /** Half the footprint, which every mark below is placed off. */
  const hx = data.scale[0] / 2;
  const hz = data.scale[2] / 2;

  /*
   * How solid this one is drawn.
   *
   * Opaque by default - a box you cannot see past is a box, and it is what the
   * sun models. The other two rungs are the ones a study reaches for: ink for
   * the twelve edges over paper, and wire to keep the construction and take the
   * object away, which is also how you check the corner you cannot see.
   */
  const surface = nearestSurface(data.surface ?? sceneSurface, BOX_SURFACES);
  const solid = surface === 'original';
  /**
   * A box in ink is the one rung that needs no shader of its own.
   *
   * Its faces are flat, so the facing ratio is constant across each and its
   * derivative is nothing - there is no contour to find and none is wanted. A
   * box's lines are its twelve edges, which it already carries as geometry.
   * Ink only lays the paper under them and turns the sun off.
   */
  const inked = isSketch(surface);
  /** Which of the three drawn pages this box is on. */
  /*
   * Which of the three drawn pages this box is on - and whether it is drawn
   * with the page's own pen or with one of its own. See lib/ownMaterial.ts.
   */
  const sketchBox = useObjectMaterial(surface, data.material, true);

  // Black boxes on a black ground: the edges and the sun do the describing.
  // In ink the page decides both, in both themes.
  const boxColor = inked
    ? paperHex()
    : isDark
      ? isSelected ? '#101010' : '#000000'
      : isSelected ? '#ffefef' : '#ffffff';
  const edgeColor = inked
    ? inkHex()
    : isDark
      ? isSelected ? '#ff5555' : '#ffffff'
      : isSelected ? '#ff3b30' : '#0a0a0a';

  /*
   * What you can take hold of, which is not a mark you would draw.
   *
   * In every other mode this is the same red as the construction and reads as
   * "grab here" against a lit grey scene. In ink it inherited the ink and
   * became three solid black discs - the heaviest marks on a page whose whole
   * argument is that every mark on it is one you could put a pen on. A handle
   * is furniture; it goes quieter than the drawing, not louder.
   */
  const handleColor = inked ? constructionInk(true, isDark) : edgeColor;

  /*
   * The construction is the PAGE's, not this box's.
   *
   * It took its colour from `edgeColor`, which is the box's own rung - so a
   * wire box standing on an ink sheet ruled its footprint and diagonals in
   * saturated red on paper, and that went into the export. Mixing rungs is a
   * documented feature, so it was reachable. The twelve edges stay on
   * edgeColor, where they belong: those are the box.
   */
  const guideColor = constructionInk(isSketch(sceneSurface), isDark);
  // At the top rung the whole scene is blocked in, and a page of equal cages
  // is a page with no subject: the selection keeps the full voice, the rest
  // drop to an underdrawing.
  const voice = construction === 2 && !isSelected ? 0.55 : 1;

  return (
    <group userData={{ selectableType: 'box', selectableId: data.id }}>
      {/* The same four marks a mesh gets, for the same job, on the same ladder.

          It used to draw two of its own regardless of that switch, and one of
          them was a tinted plane rather than a line - a tone, which is the one
          thing a line drawing cannot carry and the one thing you cannot trace.
          It was also 40 cm wider than the box in both directions, so lining it
          up against the grid lined up the wrong rectangle.

          At the top rung every box is blocked in, and the one in your hands
          speaks a little louder than the rest - the same weight rule a page
          being started actually follows. */}
      {(construction === 2 || (construction === 1 && isSelected)) && (
        <group
          raycast={() => null}
          position={[data.position[0], 0, data.position[2]]}
          rotation={[0, data.rotation[1], 0]}
        >
          <Line
            raycast={() => null}
            points={[[-hx, 0, -hz], [hx, 0, -hz], [hx, 0, hz], [-hx, 0, hz], [-hx, 0, -hz]]}
            color={guideColor}
            lineWidth={pen}
            transparent
            depthTest={false}
            renderOrder={998}
            opacity={0.6 * voice}
          />
          <Line
            raycast={() => null}
            points={[[-hx, 0, -hz], [hx, 0, hz]]}
            color={guideColor}
            lineWidth={pen}
            transparent
            depthTest={false}
            renderOrder={998}
            opacity={0.34 * voice}
          />
          <Line
            raycast={() => null}
            points={[[hx, 0, -hz], [-hx, 0, hz]]}
            color={guideColor}
            lineWidth={pen}
            transparent
            depthTest={false}
            renderOrder={998}
            opacity={0.34 * voice}
          />
          {/* The true centre of the footprint, in perspective. */}
          <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
            <circleGeometry args={[Math.max(0.02, Math.min(hx, hz) * 0.06), 16]} />
            <meshBasicMaterial color={guideColor} transparent opacity={0.75 * voice} depthWrite={false} toneMapped={false} />
          </mesh>
          {/* The plumb, for reading its height off the grid. A flat two metres
              past the top made a half-metre box carry a mark five times its
              own height; a share of the box is a mark that belongs to it. */}
          <Line
            raycast={() => null}
            points={[[0, 0, 0], [0, data.position[1] + data.scale[1] * 0.65, 0]]}
            color={guideColor}
            lineWidth={pen}
            transparent
            depthTest={false}
            renderOrder={998}
            opacity={0.45 * voice}
          />
        </group>
      )}

      <mesh
        position={data.position}
        rotation={data.rotation}
        scale={data.scale}
        // A box that throws no shadow is a box with no relationship to the
        // ground, which is half of what a perspective study is about - but only
        // a solid one has anything to cast.
        castShadow={solid || inked}
        receiveShadow={solid}
      >
        <boxGeometry args={[1, 1, 1]} />
        {/* The twelve edges below are the one constant: what changes across the
            rungs is how much of the box stands in front of them. At wire the
            faces go to nothing and write no depth, which is what puts the far
            three edges back on the page - drawing through, in one flag.

            Keyed on the rung, so stepping to the next one builds a new
            material rather than editing the live one. Whether a material is
            transparent decides which pass it is drawn in and which shader is
            compiled for it, and neither of those is re-decided by assigning to
            the flag: the box went on rendering solid while the store said
            otherwise. A fresh material is re-decided by definition. */}
        {inked ? (
          <primitive object={sketchBox} attach="material" />
        ) : (
          <meshStandardMaterial
            key={surface}
            color={boxColor}
            transparent={!solid}
            opacity={1}
            depthWrite={solid}
            roughness={pbr.roughness}
            metalness={pbr.metalness}
            polygonOffset
            polygonOffsetFactor={1}
          />
        )}
        <Line raycast={() => null} points={BOX_EDGES} segments color={edgeColor} lineWidth={pen} />
      </mesh>

      {isSelected && <FaceHandles data={data} color={handleColor} />}
    </group>
  );
};
