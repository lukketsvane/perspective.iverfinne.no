import React, { useEffect, useRef, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, DEFAULT_CAMERA_HEIGHT } from '../store';
import { KimBox } from './KimBox';
import { HorizonLine, ScaleFigure } from './Reference';
import { SceneModels } from './SceneModels';
import { WalkControls, resumeOrbitView } from './WalkControls';
import { updateFocus } from '../lib/focus';
import { updateVanishing, clearVanishing } from '../lib/vanishing';
import { Panorama } from './Panorama';
import { dragJustEnded } from '../lib/dragGuard';
import { useGesture } from '@use-gesture/react';

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
  const { camera, size } = useThree();
  const boxes = useStore((state) => state.boxes);
  const models = useStore((state) => state.models);
  const selectedId = useStore((state) => state.selectedId);
  const selectedModelId = useStore((state) => state.selectedModelId);
  const perspectiveMode = useStore((state) => state.perspectiveMode);
  const showGuides = useStore((state) => state.showGuides);

  const box = selectedId ? boxes.find((b) => b.id === selectedId) : null;
  const model = selectedModelId ? models.find((m) => m.id === selectedModelId) : null;

  useFrame(() => {
    // Curvilinear bends every one of these lines somewhere else, so the flat
    // construction would be a lie there.
    if (!showGuides || perspectiveMode !== 'linear' || (!box && !model)) {
      clearVanishing();
      return;
    }

    if (box) {
      updateVanishing(camera, size.width, size.height, {
        centre: new THREE.Vector3(...box.position),
        size: new THREE.Vector3(...box.scale),
        rotationY: box.rotation[1],
      });
      return;
    }

    const height = model!.size[1] * model!.scale;
    updateVanishing(camera, size.width, size.height, {
      centre: new THREE.Vector3(model!.position[0], height / 2, model!.position[2]),
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

/** Orbit target on mount: straight ahead, at standing eye level. */
const INITIAL_TARGET: [number, number, number] = [0, DEFAULT_CAMERA_HEIGHT, 0];

/** Closest the orbit camera may get to the floor, in metres. */
const GROUND_CLEARANCE = 0.25;

/** Set once the opening shot has been framed, so it is never re-framed. */
let orbitPlaced = false;

/** Where the scale figure stands - clear of the default cubes, near the camera. */
const FIGURE_POSITION: [number, number, number] = [-1.5, 0, 1.5];

/**
 * Keeps the camera at a human eye height.
 *
 * With the lock on, the camera and its orbit target sit at exactly the same
 * height, so the line of sight is horizontal: verticals stay vertical and the
 * scene reads as clean 2-point perspective with the horizon dead centre. This
 * is the standing-observer setup Kim Jung Gi draws from almost all the time.
 *
 * Unlock it to climb off eye level and pick up the third (zenith/nadir)
 * vanishing point.
 */
const EyeLevelRig = () => {
  const { camera, controls } = useThree();
  const cameraHeight = useStore((state) => state.cameraHeight);
  const lockEyeLevel = useStore((state) => state.lockEyeLevel);
  const cameraPose = useStore((state) => state.cameraPose);
  const boxes = useStore((state) => state.boxes);
  const models = useStore((state) => state.models);
  const selectedId = useStore((state) => state.selectedId);
  const selectedModelId = useStore((state) => state.selectedModelId);

  /**
   * Where the orbit pivot goes when the rig appears.
   *
   * The very first time, straight ahead at standing eye level - the opening
   * shot. Every time after that the rig is remounting because walk mode just
   * handed the camera back, so the pivot goes six metres out along whatever
   * heading the walk ended on and the frame does not move.
   *
   * This used to be a `target` prop on OrbitControls, which looked like it only
   * applied on mount and did not: drei re-asserts its props, so any later
   * render snapped the pivot back to the origin and swung the camera round to
   * face it. That was the jump on leaving walk mode.
   *
   * It has to run before the eye-level effect below, which would otherwise see
   * a camera sitting on top of the stale pivot and shove it three metres back.
   */
  useEffect(() => {
    const orbit = controls as any;
    if (!orbit?.target) return;

    if (!orbitPlaced) {
      orbitPlaced = true;
      orbit.target.set(...INITIAL_TARGET);
      orbit.update();
      return;
    }

    if (!resumeOrbitView.pending) return;
    resumeOrbitView.pending = false;

    // Put the frame back before working out where to pivot: by now the fresh
    // controls have already aimed the camera at the origin.
    camera.position.copy(resumeOrbitView.position);
    camera.quaternion.copy(resumeOrbitView.quaternion);

    const heading = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    if (heading.lengthSq() < 1e-6) heading.set(0, 0, -1);
    // Far enough out that orbiting feels like turning your head rather than
    // spinning on a pin, and near enough to stay inside the scene. Being
    // exactly along the heading is what makes the controls' own lookAt a no-op.
    orbit.target.copy(camera.position).addScaledVector(heading.normalize(), 6);
    orbit.update();
  }, [camera, controls]);

  /**
   * A study says where to stand, not just what to look at - one-point only
   * looks like one-point from square on. The nonce lets the same drill be
   * re-applied after the view has been moved around.
   */
  useEffect(() => {
    const orbit = controls as any;
    if (!cameraPose || !orbit?.target) return;

    camera.position.set(...cameraPose.position);
    orbit.target.set(...cameraPose.target);
    // A drill may look up at something tall, which puts the camera below its
    // own target - open the limit before update() gets a chance to clamp it.
    if (!lockEyeLevel) orbit.maxPolarAngle = Math.PI - 0.05;
    orbit.update();
  }, [cameraPose, camera, controls, lockEyeLevel]);

  // Move the camera and the orbit target to the new eye level, keeping the
  // horizontal distance and bearing the viewer had already framed up.
  useEffect(() => {
    const orbit = controls as any;
    if (!orbit?.target) return;

    // Coming back from a walk, the camera can be standing on the orbit target,
    // which leaves OrbitControls with nothing to orbit. Step back along the
    // current heading first.
    const dx = camera.position.x - orbit.target.x;
    const dz = camera.position.z - orbit.target.z;
    if (Math.hypot(dx, dz) < 0.5) {
      const heading = new THREE.Vector3();
      camera.getWorldDirection(heading);
      heading.y = 0;
      if (heading.lengthSq() < 1e-6) heading.set(0, 0, -1);
      heading.normalize();
      camera.position.x = orbit.target.x - heading.x * 3;
      camera.position.z = orbit.target.z - heading.z * 3;
    }

    camera.position.y = cameraHeight;
    if (lockEyeLevel) orbit.target.y = cameraHeight;
    orbit.update();
  }, [cameraHeight, lockEyeLevel, camera, controls]);

  // OrbitControls updates at priority -1, so this runs after it each frame.
  useFrame(() => {
    const orbit = controls as any;
    if (!orbit?.target) return;

    if (lockEyeLevel) {
      if (Math.abs(camera.position.y - cameraHeight) > 1e-5) camera.position.y = cameraHeight;
      if (Math.abs(orbit.target.y - cameraHeight) > 1e-5) orbit.target.y = cameraHeight;
      return;
    }

    /**
     * Unlocked, the camera has to be free to drop below its target and look up
     * at something tall - that is the whole third-vanishing-point case. A fixed
     * polar limit cannot express that and "stay above the ground" at the same
     * time, so the limit is recomputed from the geometry instead: the angle at
     * which the orbit would put the camera on the floor.
     */
    const radius = camera.position.distanceTo(orbit.target);
    const cosLimit = THREE.MathUtils.clamp(
      (GROUND_CLEARANCE - orbit.target.y) / Math.max(radius, 0.001),
      -1,
      1
    );
    orbit.maxPolarAngle = Math.min(Math.PI - 0.05, Math.acos(cosLimit));
  });

  return null;
};

/** How far off the sun is placed. Only its direction matters. */
const SUN_DISTANCE = 60;

/** Where a bearing and a height above the horizon put the sun. */
export const sunPosition = (azimuth: number, elevation: number): [number, number, number] => {
  const a = THREE.MathUtils.degToRad(azimuth);
  const e = THREE.MathUtils.degToRad(elevation);
  const flat = Math.cos(e) * SUN_DISTANCE;
  return [Math.sin(a) * flat, Math.sin(e) * SUN_DISTANCE, Math.cos(a) * flat];
};

/**
 * The scene's only light.
 *
 * The shadow camera is a fixed 80 m box around the origin: big enough for a
 * study you can walk, small enough that a 2048 map still resolves the edge of a
 * cube's shadow. A phone gets half that map - it is the one number here that
 * costs real memory.
 */
const Sun: React.FC = () => {
  const sun = useStore((state) => state.sun);
  const position = useMemo(() => sunPosition(sun.azimuth, sun.elevation), [sun.azimuth, sun.elevation]);
  const mapSize = useMemo(
    () =>
      typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 900
        ? 1024
        : 2048,
    []
  );

  return (
    <directionalLight
      position={position}
      intensity={sun.intensity}
      castShadow={sun.shadows}
      shadow-mapSize-width={mapSize}
      shadow-mapSize-height={mapSize}
      // A room at 1:1 puts big flat surfaces almost edge-on to the sun, which
      // is where a shadow map self-shadows into stripes. Offsetting along the
      // normal costs a couple of centimetres of contact and kills the banding.
      shadow-bias={-0.0004}
      shadow-normalBias={0.05}
      shadow-camera-near={1}
      shadow-camera-far={SUN_DISTANCE * 2.5}
      shadow-camera-left={-40}
      shadow-camera-right={40}
      shadow-camera-top={40}
      shadow-camera-bottom={-40}
    />
  );
};

const SceneContent = () => {
  const { camera } = useThree();
  const boxes = useStore((state) => state.boxes);
  const addBox = useStore((state) => state.addBox);
  const selectBox = useStore((state) => state.selectBox);
  const isDragging = useStore((state) => state.isDragging);
  const isViewMode = useStore((state) => state.isViewMode);

  const fov = useStore((state) => state.fov);
  const distortion = useStore((state) => state.distortion);
  const perspectiveMode = useStore((state) => state.perspectiveMode);
  const lockEyeLevel = useStore((state) => state.lockEyeLevel);
  const showFigure = useStore((state) => state.showFigure);
  const showGuides = useStore((state) => state.showGuides);
  const setLens = useStore((state) => state.setLens);
  const theme = useStore((state) => state.theme);
  const viewMode = useStore((state) => state.viewMode);
  const cameraFeed = useStore((state) => state.cameraFeed);
  const sunShadows = useStore((state) => state.sun.shadows);

  const controlsRef = useRef<any>(null);
  const isDark = theme === 'dark';
  const isWalking = viewMode === 'walk';
  const bgColor = isDark ? '#000000' : '#f3f3f1';
  const horizonColor = isDark ? '#5cc8ff' : '#1f6feb';
  const figureColor = isDark ? '#7a7a80' : '#5a5a60';

  // Curvilinear is a mode, not an amount: at a blend of zero it is still a
  // panorama, just the equirectangular one.
  const curvilinear = perspectiveMode === 'curvilinear';

  /** The construction sheet is ruled in red, on paper and here. */
  const gridColor = useMemo(
    () => new THREE.Color(isDark || cameraFeed ? '#ff6a5e' : '#e0342a'),
    [isDark, cameraFeed]
  );

  // Sync FOV with Store. While walking with the room showing through, the lens
  // is matched to the real camera instead - WalkControls owns it there.
  useEffect(() => {
    if (isWalking && cameraFeed) return;
    if (camera instanceof THREE.PerspectiveCamera) {
      // A perspective camera goes singular at 180: the frustum turns inside
      // out. Past that the curvilinear pass is what carries the extra field.
      camera.fov = Math.min(fov, 179);
      camera.updateProjectionMatrix();
    }
  }, [fov, camera, isWalking, cameraFeed]);

  /**
   * Three fingers dragged up and down set the focal length.
   *
   * `movement` is measured from where the gesture started, not from the last
   * event, so applying it to the *current* fov re-applied the whole travel on
   * every frame and the lens shot to one end of its range the moment you moved.
   * It is anchored to the fov the gesture began at instead, and at a fifth of
   * the old rate - three fingers on glass is not a precision instrument.
   */
  const lensGesture = useRef<{ from: number; origin: number } | null>(null);
  useGesture(
    {
      onDrag: ({ movement: [, my], touches, last }) => {
        // A third finger can land part-way through a drag, so the anchor is
        // taken when the count reaches three rather than when the drag began.
        if (last || touches !== 3) { lensGesture.current = null; return; }
        if (!lensGesture.current) lensGesture.current = { from: fov, origin: my };
        setLens(lensGesture.current.from - (my - lensGesture.current.origin) * 0.04);
      },
    },
    {
      target: window,
      eventOptions: { passive: false },
    }
  );

  return (
    <>
      {/* With the camera feed on the canvas has to stay transparent so the room
          shows through; otherwise the paper/ink field is the background. */}
      {!cameraFeed && <color attach="background" args={[bgColor]} />}
      {/* One sun, and nothing else.

          No ambient term and no environment map: a face turned away from the
          sun is unlit, exactly as it would be under a hard key with no bounce.
          That is the point - value separation between the three faces of a box
          is what you are reading when you draw one, and a fill light is what
          washes it out. */}
      <Sun />

      <group>
        {boxes.map((box) => (
          <KimBox key={box.id} data={box} />
        ))}
      </group>

      {/* Uploaded models, standing at their real size */}
      <SceneModels />

      {/* Eye level / horizon line - every horizontal VP in the scene sits on it */}
      {showGuides && <HorizonLine color={horizonColor} />}

      {/* 1.75 m human, for reading the 1 m cubes against a real body */}
      {showFigure && <ScaleFigure position={FIGURE_POSITION} color={figureColor} />}

      {/* Ground plane in metres: 1 m cells, 5 m sections */}
      {showGuides && (
        <Grid
          position={[0, 0.01, 0]}
          args={[100, 100]}
          cellSize={1}
          cellThickness={0.5}
          cellColor={isDark ? "#444444" : "#999999"}
          sectionSize={5}
          sectionThickness={1.0}
          sectionColor={isDark ? "#666666" : "#333333"}
          // At grazing angles the lines converge into a solid sheet, which over
          // a live camera reads as haze on the floor. Keep it to a pool of grid
          // around your feet when the room is showing.
          fadeDistance={cameraFeed ? 10 : 60}
          fadeStrength={cameraFeed ? 3 : 1.5}
          infiniteGrid
          onDoubleClick={(e) => {
              if (isViewMode) return;
              e.stopPropagation();
              addBox([e.point.x, e.point.y, e.point.z]);
          }}
          onClick={(e) => {
              if (isViewMode || dragJustEnded()) return;
              e.stopPropagation();
              selectBox(null);
          }}
        />
      )}

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        onDoubleClick={(e) => {
            if (isViewMode) return;
            e.stopPropagation();
            addBox([e.point.x, e.point.y, e.point.z]);
        }}
        onClick={(e) => {
            if (isViewMode || dragJustEnded()) return;
            e.stopPropagation();
            selectBox(null);
        }}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* The floor catches the sun's shadows and nothing else, so it works over
          the camera feed too - there a cast shadow on the real floor is the
          only thing tying the scene to the room. */}
      {sunShadows && (
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} raycast={() => null}>
          <planeGeometry args={[200, 200]} />
          <shadowMaterial transparent opacity={isDark ? 0.55 : 0.42} />
        </mesh>
      )}

      {/* With the sun's shadows off, boxes need something to sit on. */}
      {!sunShadows && !cameraFeed && (
        <ContactShadows
          position={[0, 0, 0]}
          opacity={isDark ? 0.8 : 0.6}
          scale={60}
          blur={2}
          far={4}
          color="#000000"
        />
      )}

      {/* The curvilinear view is a different projection, not a filter over the
          flat one, so it takes the frame over entirely while it is on. */}
      {curvilinear && (
        <Panorama
          spread={fov}
          blend={distortion}
          gridColor={gridColor}
          gridStrength={showGuides ? 1 : 0}
        />
      )}

      {/* Orbit is the drawing board; walk mode drives the camera itself. */}
      {!isWalking ? (
        <>
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enabled={!isDragging} // Disable controls when dragging an object
            // Locked: the gaze stays level, so verticals stay vertical (2-point).
            // Unlocked: climb up to pick up the third vanishing point.
            minPolarAngle={lockEyeLevel ? Math.PI / 2 : 0}
            // Unlocked, the floor limit is computed per frame in EyeLevelRig.
            maxPolarAngle={lockEyeLevel ? Math.PI / 2 : Math.PI - 0.05}
            screenSpacePanning={!lockEyeLevel}
            enableDamping
            dampingFactor={0.05}
            rotateSpeed={0.6}
            zoomSpeed={0.8}
          />
          <EyeLevelRig />
        </>
      ) : (
        <WalkControls />
      )}

      <FocusTracker />
      <VanishingTracker />
    </>
  );
};

/**
 * Where to stand at the start.
 *
 * three's fov is vertical, so a portrait phone sees a much narrower slice of
 * the world than a laptop does at the same setting. The honest fix for a
 * perspective tool is not to widen the lens - that would falsify the very thing
 * being taught, and the cone of vision with it - but to step back, exactly as
 * you would in a room.
 */
const initialCameraPosition = (): [number, number, number] => {
  const aspect = typeof window === 'undefined' ? 1.5 : window.innerWidth / window.innerHeight;
  const backOff = Math.min(2, Math.max(1, 1.5 / Math.max(aspect, 0.3)));
  return [3 * backOff, DEFAULT_CAMERA_HEIGHT, 5 * backOff];
};

export const Scene = () => {
  return (
    <Canvas
      shadows
      // Start standing at eye level, a few metres back, looking level.
      camera={{ position: initialCameraPosition(), fov: 60, near: 0.05, far: 2000 }}
      dpr={[1, 1.5]}
      // alpha lets the camera feed show through; preserveDrawingBuffer keeps
      // the last frame readable so the view can be saved as a PNG at any time.
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        alpha: true,
        preserveDrawingBuffer: true,
      }}
      className="transition-colors duration-500"
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    >
      <SceneContent />
    </Canvas>
  );
};
