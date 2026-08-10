import React, { useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { isSketch } from '../types';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { ContactShadows, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, DEFAULT_CAMERA_HEIGHT } from '../store';
import { Lamps } from './Lamps';
import { GroundGrid } from './GroundGrid';
import { KimBox } from './KimBox';
import { Room } from './Room';
import { SceneModels } from './SceneModels';
import { WalkControls } from './WalkControls';
import { updateFocus, focusPoint, setSelectionRange } from '../lib/focus';
import { updateVanishing, clearVanishing, updateRoomPoints } from '../lib/vanishing';
import { markSceneBuilt, sceneRevision } from '../lib/sceneRevision';
import { Panorama } from './Panorama';
import { forgetView, registerView } from '../lib/pick';
import { fieldOf } from '../lib/projection';
import {
  brushShadowAlpha,
  constructionInk,
  inkShadowAlpha,
  pageHex,
  pageInkHex,
  setInkLight,
  setInkScale,
  HATCH_SHADOW,
} from '../lib/inkMaterial';

/** Keeps the "put one here" point under the middle of the view. */
const FocusTracker = () => {
  const { camera } = useThree();
  useFrame(() => updateFocus(camera));
  return null;
};

/**
 * Feeds the vanishing-point overlay.
 *
 * Runs every frame because the points move with the camera, not with the box -
 * which is itself the lesson: turn your head and the box's pair slides along
 * the horizon, but never off it.
 */
const VanishingTracker = () => {
  const { camera } = useThree();
  const boxes = useStore((state) => state.boxes);
  const models = useStore((state) => state.models);
  const selectedId = useStore((state) => state.selectedId);
  const selectedModelId = useStore((state) => state.selectedModelId);
  const perspectiveMode = useStore((state) => state.perspectiveMode);
  // Its own switch, not a rung of the guides: the room's construction and the
  // selection's construction are wanted at different moments.
  const showVanishing = useStore((state) => state.showVanishing);
  const guides = useStore((state) => state.guides);

  const box = selectedId ? boxes.find((b) => b.id === selectedId) : null;
  const model = selectedModelId ? models.find((m) => m.id === selectedModelId) : null;

  useFrame(() => {
    // How far away the thing in your hands is, measured on the floor.
    const standing = box?.position ?? model?.position;
    setSelectionRange(
      standing
        ? Math.hypot(standing[0] - camera.position.x, standing[2] - camera.position.z)
        : 0
    );

    // The room's five, wherever the sheet cannot reach them. Independent of the
    // selection: they belong to the world, and they are the first rung of the
    // guides rather than anything to do with what you are holding.
    updateRoomPoints(camera, guides >= 1);

    // A scene has no points of its own worth drawing: its box is the room's box
    // and its three axes are the world's, which the construction sheet already
    // marks. Ruling them again round the whole room is fifteen figures' worth
    // of red over the drawing, saying what the horizon said.
    if (!showVanishing || (!box && !model) || model?.kind === 'scene') {
      clearVanishing();
      return;
    }

    if (box) {
      updateVanishing(camera, perspectiveMode, {
        centre: new THREE.Vector3(...box.position),
        size: new THREE.Vector3(...box.scale),
        rotationY: box.rotation[1],
      });
      return;
    }

    const height = model!.size[1] * model!.scale;
    updateVanishing(camera, perspectiveMode, {
      // A mesh's position is its footprint and it can be lifted off the floor,
      // so the middle of it is the lift plus half the height. Left out, the
      // rays detached from the cage the moment anything was raised - and the
      // cage is right, being drawn inside the model's own group.
      centre: new THREE.Vector3(model!.position[0], model!.position[1] + height / 2, model!.position[2]),
      size: new THREE.Vector3(
        model!.size[0] * model!.scale,
        height,
        model!.size[2] * model!.scale
      ),
      rotationY: model!.rotationY,
    });
  });

  useEffect(() => clearVanishing, []);
  return null;
};

/**
 * Says the scene is built, every time React finishes building it.
 *
 * Subscribed to the whole store deliberately: what matters is not which field
 * changed but that a commit has just happened, and every commit inside the
 * canvas follows one.
 */
const SceneSettled = () => {
  useStore();
  useLayoutEffect(markSceneBuilt);
  return null;
};

const SUN_DISTANCE = 60;

/** Where a bearing and a height above the horizon put the sun. */
export const sunPosition = (azimuth: number, elevation: number): [number, number, number] => {
  const a = THREE.MathUtils.degToRad(azimuth);
  const e = THREE.MathUtils.degToRad(elevation);
  const flat = Math.cos(e) * SUN_DISTANCE;
  return [Math.sin(a) * flat, Math.sin(e) * SUN_DISTANCE, Math.cos(a) * flat];
};

/** Approximate a black-body temperature as an sRGB lamp colour. */
const temperatureColor = (kelvin: number) => {
  const t = THREE.MathUtils.clamp(kelvin, 1000, 12000) / 100;
  const red = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const green = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const blue = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.044792731;
  return new THREE.Color(red / 255, green / 255, blue / 255);
};

/**
 * A clear, physically-modelled atmosphere driven by the directional sun.
 * This is deliberately only air and sunlight: no clouds or image backdrop.
 */
const SunEnvironment = () => {
  const sun = useStore((state) => state.sun);
  const position = useMemo(() => sunPosition(sun.azimuth, sun.elevation), [sun.azimuth, sun.elevation]);
  // Warm light scatters through a denser-looking atmosphere; stronger light
  // produces a cleaner blue sky and a tighter solar halo.
  const warmth = THREE.MathUtils.clamp((6500 - sun.temperature) / 4700, 0, 1);
  const energy = THREE.MathUtils.clamp(sun.intensity / 8, 0.05, 1);
  return (
    <Sky
      distance={450}
      sunPosition={position}
      turbidity={2 + warmth * 7 + (1 - energy) * 2}
      rayleigh={0.8 + energy * 2.2}
      mieCoefficient={0.003 + warmth * 0.012}
      mieDirectionalG={0.82 + energy * 0.12}
    />
  );
};

/** How far the shadow camera reaches either side of where you are looking. */
const SHADOW_REACH = 10;

/**
 * How far you have to move before the shadow camera follows.
 *
 * Following continuously would invalidate the map every frame and undo the
 * whole point of drawing it on demand. Snapping to a grid means it only moves
 * when you have actually gone somewhere.
 */
const SHADOW_STEP = 8;

/**
 * The scene's only light.
 *
 * Three things decide how good the shadows look, and the map size is only one.
 *
 * The second is how much of that map is spent on the part of the scene you can
 * see. It used to be an 80 m box fixed on the origin, so a 1 m cube got a few
 * dozen texels of it. It is a 28 m box now - about eight times the detail on
 * the same memory - and it follows the point you are looking at, so walking to
 * the far end of a study does not walk out of the shadows.
 *
 * The third is how often it is redrawn. It was redrawn every frame, for a sun
 * and a set of boxes that had not moved since the last one, which is most of
 * what made dragging the sun feel like wading. Now it is redrawn when the scene
 * changes, the sun moves, or you cross into a new cell - and not otherwise.
 */
/**
 * The fill.
 *
 * A directional lamp like the sun and nothing else: no shadow map, no follow,
 * no cache to invalidate. That is the whole point of a fill - it lifts the dark
 * side of everything at once, and a shadow from it would be a second story
 * about where the light comes from.
 */
const Fill: React.FC = () => {
  const fill = useStore((state) => state.fill);
  const colour = useMemo(() => temperatureColor(fill.temperature), [fill.temperature]);
  const position = useMemo(() => sunPosition(fill.azimuth, fill.elevation), [fill.azimuth, fill.elevation]);
  if (!fill.enabled) return null;
  return <directionalLight position={position} color={colour} intensity={fill.intensity} />;
};

const Sun: React.FC = () => {
  const sun = useStore((state) => state.sun);
  const light = useRef<THREE.DirectionalLight>(null);
  const anchor = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => temperatureColor(sun.temperature), [sun.temperature]);

  const offset = useMemo(
    () => sunPosition(sun.azimuth, sun.elevation),
    [sun.azimuth, sun.elevation]
  );
  const mapSize = useMemo(
    () =>
      typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 900
        ? 3072
        : 4096,
    []
  );

  useEffect(() => {
    const shadow = light.current?.shadow;
    if (!shadow) return;
    shadow.autoUpdate = false;
    shadow.needsUpdate = true;
  }, []);

  const drawn = useRef({ revision: -1, x: NaN, z: NaN });

  // A direction change must move the lamp and invalidate its cached shadow
  // even when neither the geometry nor the viewer has moved.
  useEffect(() => {
    drawn.current.revision = -1;
  }, [sun.azimuth, sun.elevation, sun.shadows]);

  useFrame(() => {
    const lamp = light.current;
    if (!lamp) return;

    const cellX = Math.round(focusPoint.x / SHADOW_STEP) * SHADOW_STEP;
    const cellZ = Math.round(focusPoint.z / SHADOW_STEP) * SHADOW_STEP;
    const was = drawn.current;
    if (was.revision === sceneRevision.value && was.x === cellX && was.z === cellZ) return;

    // The lamp keeps its bearing on the sun and slides over the scene with you.
    anchor.position.set(cellX, 0, cellZ);
    anchor.updateMatrixWorld();
    lamp.position.set(cellX + offset[0], offset[1], cellZ + offset[2]);

    drawn.current = { revision: sceneRevision.value, x: cellX, z: cellZ };
    lamp.shadow.needsUpdate = true;
  });

  return (
    <>
      <primitive object={anchor} />
      <directionalLight
        ref={light}
        target={anchor}
        position={offset}
        color={color}
        intensity={sun.intensity}
        castShadow={sun.shadows !== 'off'}
        shadow-mapSize-width={mapSize}
        shadow-mapSize-height={mapSize}
        // A room at 1:1 puts big flat surfaces almost edge-on to the sun, which
        // is where a shadow map self-shadows into stripes. Offsetting along the
        // normal costs a couple of centimetres of contact and kills the banding.
        shadow-bias={-0.00015}
        shadow-normalBias={0.025}
        shadow-camera-near={SUN_DISTANCE - SHADOW_REACH * 3}
        shadow-camera-far={SUN_DISTANCE + SHADOW_REACH * 3}
        shadow-camera-left={-SHADOW_REACH}
        shadow-camera-right={SHADOW_REACH}
        shadow-camera-top={SHADOW_REACH}
        shadow-camera-bottom={-SHADOW_REACH}
      />
    </>
  );
};

const SceneContent = () => {
  const { camera, gl, scene, size } = useThree();
  const boxes = useStore((state) => state.boxes);

  const fov = useStore((state) => state.fov);
  const perspectiveMode = useStore((state) => state.perspectiveMode);
  const guides = useStore((state) => state.guides);
  const gridX = useStore((state) => state.gridX);
  const gridZ = useStore((state) => state.gridZ);
  const snapStep = useStore((state) => state.snapStep);
  const theme = useStore((state) => state.theme);
  const backgroundGray = useStore((state) => state.backgroundGray);
  const shadowKind = useStore((state) => state.sun.shadows);
  const hardShadows = shadowKind === 'hard';
  const roomLevel = useStore((state) => state.roomLevel);
  const sunEnvironment = useStore((state) => state.sunEnvironment);
  const sun = useStore((state) => state.sun);
  /**
   * Whether the whole scene is being drawn as a line drawing.
   *
   * The surface is per object, but a cast shadow and a background are not: they
   * belong to the page. So the page follows the scene-wide setting, which is
   * also the one the control on the dock sets - and that control stamps every
   * object as it goes, so the two only disagree while somebody is deliberately
   * mixing rungs.
   */
  const sceneSurface = useStore((state) => state.surface);
  const fieldRange = useStore((state) => state.fieldRange);
  const backdrop = useStore((state) => state.backdrop);
  // Both sketch rungs draw on the paper; brush also spots its blacks in, so
  // its cast shadow goes down as a near-solid shape rather than a wash.
  const inkMode = isSketch(sceneSurface);
  const brushMode = sceneSurface === 'brush';

  /*
   * Hand the walk layer what it needs to aim with.
   *
   * The full-screen gesture layer owns every pointer event on the glass, so
   * react-three-fiber's own picking never sees one. Rather than a second, flatter
   * copy of the projection living out there - which is what made meshes plainly
   * in view untappable in a curved frame, and what made dragging one impossible
   * at all - the scene says what it is drawing with and the picker does the rest.
   */
  useEffect(() => {
    registerView({
      camera,
      element: gl.domElement,
      root: scene,
      width: size.width,
      height: size.height,
      fov,
      mode: perspectiveMode,
    });
    return forgetView;
  }, [camera, gl, scene, size.width, size.height, fov, perspectiveMode]);

  const isDark = theme === 'dark';
  /*
   * Ink is on paper in both themes, and that is not an oversight.
   *
   * The theme is for the chrome, which sits in the room you are in. This is the
   * drawing, and the drawing is what the export writes out at three times the
   * frame to be printed or dropped into a tablet layer and traced over. A white
   * line on a black field cannot be used that way, and a study you cannot put a
   * sheet of paper beside is not what the mode is for.
   */
  /*
   * The light control sweeps the page, and in ink the page is the sheet.
   *
   * Written before the colour is read, not in a passive effect: `useEffect` is
   * flushed on a scheduler task with no ordering against the animation frame,
   * so a frame landing in the gap draws the source with the OLD uniform, writes
   * down the new scene revision, and then has no reason ever to redraw. During
   * a drag that self-heals; the last frame of a drag does not. (That was a live
   * bug for the sun as well - drop it at the end of a sweep and the terminator
   * lagged - so both writes moved.)
   */
  /*
   * The sheet and the page are set from the store's own subscription, not from
   * here - see `syncTones` in store.ts. Both are read during render by half
   * the tree, and a layout effect runs after that render, so writing them
   * there left every colour on the page one change behind.
   */
  const pageGray = backdrop === 'paper' ? backgroundGray : backdrop;
  // One tone for the page, worked out in the store and pushed by the same
  // subscription that sets the sheet - so the canvas, the chrome behind it
  // and the phone's status bar cannot disagree about what is back there.

  /*
   * Hard or soft, at runtime.
   *
   * three folds the shadow map's type into a program's compile key but does not
   * list it among the things that make a material need a new program - so
   * setting it and re-rendering gives back a pixel-identical frame. Every
   * material has to be told itself. Once per switch, which is a stall you can
   * see once and not a cost you pay per frame.
   *
   * PCF rather than Basic for the hard rung. Both give the same SHAPE; the
   * difference is one shadow-map texel, about 5 mm on the floor here - PCF
   * spreads it into a line, Basic steps it into a staircase. A line is what you
   * would have drawn.
   */
  useLayoutEffect(() => {
    const wanted = hardShadows ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    if (gl.shadowMap.type === wanted) return;
    gl.shadowMap.type = wanted;
    gl.shadowMap.needsUpdate = true;
    scene.traverse((node) => {
      const material = (node as THREE.Mesh).material;
      if (!material) return;
      for (const one of Array.isArray(material) ? material : [material]) one.needsUpdate = true;
    });
  }, [hardShadows, gl, scene]);

  // The page, not the sheet: a drawing mounted on black stands on black.
  const bgColor = pageHex();

  /**
   * How wide a line is, and which way the light comes from.
   *
   * Not in a frame loop: neither changes per frame, and the panorama already
   * redraws its source when the scene revision moves. The field is here because
   * the pen is specified in pixels of the finished sheet and has to be said in
   * radians for a shader that has never heard of the sheet.
   */
  useLayoutEffect(() => {
    const { halfYaw } = fieldOf(fov, size.width, size.height);
    setInkScale(halfYaw, size.width);
  }, [fov, size.width, size.height]);

  useLayoutEffect(() => {
    const [x, y, z] = sunPosition(sun.azimuth, sun.elevation);
    setInkLight(x, y, z);
  }, [sun.azimuth, sun.elevation]);

  /** One metre, or whatever finer step is being snapped to. */
  const cellSize = Math.max(0.05, snapStep || 1);

  /**
   * What the construction is ruled in.
   *
   * Red on the clay, where it has to carry across a lit grey scene. In ink it
   * is a lighter weight of the same ink the drawing is in - a builder rules his
   * sheet in one pencil and presses harder for the lines that matter.
   */
  const gridColor = useMemo(
    () => new THREE.Color(constructionInk(inkMode, isDark)),
    [inkMode, isDark]
  );

  /*
   * What is outside the sheet, once the field is wide enough to see round it.
   *
   * The same colour the frame is cleared to, so the disc sits on the page
   * rather than in a hole cut out of it. In sky mode that is black, which is
   * what the scene's own background is set to there.
   */
  const surround = useMemo(
    () => new THREE.Color(sunEnvironment ? '#000000' : bgColor),
    [sunEnvironment, bgColor]
  );

  // Sync FOV with the store.
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      // A perspective camera goes singular at 180: the frustum turns inside
      // out. Past that the curvilinear pass is what carries the extra field.
      camera.fov = Math.min(fov, 179);
      camera.updateProjectionMatrix();
    }
  }, [fov, camera]);


  return (
    <>
      <color attach="background" args={[sunEnvironment ? '#000000' : bgColor]} />
      {sunEnvironment && <SunEnvironment />}
      {/* One sun, and nothing else.

          No ambient term and no environment map: a face turned away from the
          sun is unlit, exactly as it would be under a hard key with no bounce.
          That is the point - value separation between the three faces of a box
          is what you are reading when you draw one, and a fill light is what
          washes it out - until it is asked for, which is what the fill is. */}
      <Sun />
      <Fill />

      {/* Four walls and a ceiling round the origin. */}
      {roomLevel > 0 && <Room level={roomLevel} dark={isDark} inked={inkMode} />}

      <group>
        {boxes.map((box) => (
          <KimBox key={box.id} data={box} />
        ))}
      </group>

      {/* Uploaded models, standing at their real size */}
      <SceneModels />
      <Lamps />

      {/* The eye level is not drawn here. It is drawn by the panorama shader,
          per pixel, on the sphere - which is a truer place for it: this was a
          500 m circle of geometry that went into the cube source and got
          resampled by the reprojection on the way out, so it was the one line
          on the sheet whose weight depended on where it landed. */}

      {/*
        * The ground, ruled at whatever dragging snaps to.
        *
        * A grid in metres and a snap in centimetres are two different rulers,
        * and lining an object up against a line it cannot land on is the sort
        * of small lie that costs half an hour.
        */}
      {(gridX || gridZ) && (
        <GroundGrid
          cell={cellSize}
          dark={isDark}
          ink={inkMode ? pageInkHex() : undefined}
          along={{ x: gridX, z: gridZ }}
        />
      )}

      {/* The floor catches the sun's shadows and nothing else. It is far wider
          than it needs to be for the shadows themselves: a 200 m plane has an
          edge, and a 210 degree lens can see it.

          In ink, only when the shadow is hard. The objection was never to
          shadows - it was to soft boundaries: a penumbra is resampled by the
          reprojection and again by the export, so on a sheet you are about to
          trace there is no telling which line is an edge of the object and
          which is an edge of its shadow. A hard shadow has no penumbra to
          confuse. It is a shape, and a shape is a thing you can lay a pen
          round and fill.

          Light, when it is ink. The object's own contour is a full-ink line,
          and a fill anywhere near that value would put two drawings on the
          page; at about 1.4:1 against the paper it reads unambiguously as a
          plane and can never be mistaken for a line. It fades out as the sheet
          darkens - on a blackboard you draw the lit parts, and the shadow is
          bare board. */}
      {shadowKind !== 'off' && (!inkMode || hardShadows || brushMode) && (
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} raycast={() => null}>
          <planeGeometry args={[2000, 2000]} />
          {/* On the etched page the shadow is cut, not washed: a rank of
              strokes running along the ground, ruled by the same hand and at
              the same angle as the flat faces of anything standing in it. A
              wash under a drawing made entirely of line is the one thing on
              the page that is not a line, and it shows. */}
          {sceneSurface === 'hatch' ? (
            <primitive object={HATCH_SHADOW} attach="material" />
          ) : (
            <shadowMaterial
              transparent
              color={inkMode ? pageInkHex() : '#000000'}
              opacity={
                brushMode
                  ? brushShadowAlpha()
                  : inkMode
                    ? inkShadowAlpha(pageGray)
                    : isDark
                      ? 0.55
                      : 0.42
              }
            />
          )}
        </mesh>
      )}

      {/* With the sun's shadows off, boxes need something to sit on. */}
      {shadowKind === 'off' && !inkMode && (
        <ContactShadows
          position={[0, 0, 0]}
          opacity={isDark ? 0.8 : 0.6}
          scale={60}
          blur={2}
          far={4}
          color="#000000"
        />
      )}

      {/* The curvilinear frame is a different projection, not a filter over the
          flat one, so it takes the frame over entirely. */}
      {(
        <Panorama
          spread={fov}
          mode={perspectiveMode}
          repeat={fieldRange === 'endless'}
          gridColor={gridColor}
          pointStrength={guides >= 1 ? 1 : 0}
          sheetStrength={guides >= 2 ? 1 : 0}
          surround={surround}
        />
      )}

      <WalkControls />

      <FocusTracker />
      <VanishingTracker />
      <SceneSettled />
    </>
  );
};

/**
 * Where to stand at the start.
 *
 * Square on to the origin, looking down -Z, because that is where the opening
 * object stands - App moves in to frame it properly once it knows how big it
 * is, and starting off the axis would make that a swing rather than a step.
 *
 * three's fov is vertical, so a portrait phone sees a much narrower slice of
 * the world than a laptop does at the same setting. The honest fix for a
 * perspective tool is not to widen the lens - that would falsify the very thing
 * being taught, and the cone of vision with it - but to step back, exactly as
 * you would in a room.
 */
const initialCameraPosition = (): [number, number, number] => {
  const aspect = typeof window === 'undefined' ? 1.5 : window.innerWidth / window.innerHeight;
  const backOff = Math.min(1.5, Math.max(1, 1.5 / Math.max(aspect, 0.3)));
  return [0, DEFAULT_CAMERA_HEIGHT, 3 * backOff];
};

export const Scene = () => {
  return (
    <Canvas
      // Start standing at eye level, a few metres back, looking level.
      camera={{ position: initialCameraPosition(), fov: 60, near: 0.05, far: 2000 }}
      dpr={[1, 1.5]}
      // preserveDrawingBuffer keeps the last frame readable so the view can be
      // saved as a PNG at any time.
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        // Transparent, so an AR session can show the room through it. The
        // scene's own background colour is drawn as a scene background, so
        // nothing changes outside a session.
        alpha: true,
        preserveDrawingBuffer: true,
      }}
      // Percentage-closer soft shadows: the edge of a cube's shadow should
      // read as an edge, not as a staircase.
      // Read once, at creation: a returning viewer who left it hard should not
      // get one soft frame and a whole-scene recompile before it corrects.
      shadows={{
        type:
          useStore.getState().sun.shadows === 'hard'
            ? THREE.PCFShadowMap
            : THREE.PCFSoftShadowMap,
      }}
      className="transition-colors duration-500"
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    >
      <SceneContent />
    </Canvas>
  );
};
