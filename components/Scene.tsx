import React, { useEffect, useRef, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, ContactShadows } from '@react-three/drei';
import { EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
// @ts-ignore
import { Effect } from 'postprocessing';
import { useStore, DEFAULT_CAMERA_HEIGHT } from '../store';
import { KimBox } from './KimBox';
import { HorizonLine, ScaleFigure } from './Reference';
import { SceneModels } from './SceneModels';
import { WalkControls } from './WalkControls';
import { updateFocus } from '../lib/focus';
import { useGesture } from '@use-gesture/react';

// Custom Shader for Kim Jung Gi 5-Point Curvilinear Perspective
//
// OPT-IN ONLY. The default view is straight-line (rectilinear) perspective,
// because that is what you are practising when you rule a horizon and two
// vanishing points on paper. Curvilinear is a mode you switch into.
//
// Kim Jung Gi's drawing technique uses 5-point curvilinear perspective:
// - 5 vanishing points: Left, Right, Top (Zenith), Bottom (Nadir), Center
// - All straight lines become CURVES that bend toward their respective vanishing points
// - Horizontal lines curve upward at the top of the image, downward at the bottom
// - Vertical lines curve leftward on the left side, rightward on the right side
// - This mimics how we actually see the world through our spherical eye lenses
//
// Mathematical basis: Stereographic/Equidistant Azimuthal projection
// We project the scene onto a sphere, then unwrap it to create the curved line effect
const fisheyeFragment = `
uniform float strength;
uniform vec3 bgColor;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // Early exit for no distortion
    if (strength < 0.001) {
        outputColor = texture2D(inputBuffer, uv);
        return;
    }

    // Center UVs to -1 to 1 range
    vec2 coord = uv * 2.0 - 1.0;

    // Apply aspect ratio correction
    float aspect = resolution.x / resolution.y;
    coord.x *= aspect;

    // =========================================================
    // KIM JUNG GI 5-POINT CURVILINEAR PERSPECTIVE
    // =========================================================
    //
    // The key insight: We're mapping a flat image onto a sphere's surface,
    // then viewing that sphere from inside. This causes:
    // - Lines parallel to X-axis to curve toward Left/Right vanishing points
    // - Lines parallel to Y-axis to curve toward Zenith/Nadir vanishing points
    // - The center (5th vanishing point) remains the focal point
    //
    // We use an inverse stereographic projection which naturally creates
    // the curved grid lines characteristic of Kim Jung Gi's work.
    // =========================================================

    // Control the field of view / curvature intensity
    // Higher values = more extreme curvature (wider apparent FOV)
    float curvature = strength * 2.0;

    // Distance from center
    float r = length(coord);

    // Stereographic projection formula for 5-point perspective
    // This maps planar coordinates to spherical coordinates and back
    // creating the characteristic line curvature
    //
    // For true 5-point perspective, we need different behavior on X and Y:
    // - X coordinate determines curvature toward Left/Right VP
    // - Y coordinate determines curvature toward Zenith/Nadir VP

    // Apply spherical distortion using atan for natural curve falloff
    // The atan function naturally creates the "fisheye" bending effect
    float angle = atan(r * curvature);

    // Normalize based on maximum expected angle
    // PI/2 gives us a hemisphere (180° FOV equivalent)
    float scale = angle / (r * curvature + 0.0001);

    // Alternative: Use stereographic projection for even more pronounced curves
    // Stereographic: r' = 2 * tan(θ/2) where θ = atan(r * curvature)
    // This creates even more dramatic curve toward the edges
    float stereographicScale = 2.0 * tan(angle * 0.5) / (r + 0.0001);

    // Blend between pure radial and stereographic based on strength
    // Lower strength = more subtle, higher = more dramatic curvilinear effect
    float blendedScale = mix(scale, stereographicScale, strength * 0.5);

    // Apply the distortion
    vec2 coord_dist = coord * blendedScale;

    // Add additional Y-axis dependent horizontal curvature
    // This makes horizontal lines curve more at top/bottom (toward zenith/nadir)
    // and vertical lines curve more at left/right (toward L/R vanishing points)
    float yInfluence = coord.y * coord.y * curvature * 0.15;
    float xInfluence = coord.x * coord.x * curvature * 0.15;

    // Apply the 5-point specific curvature
    // Horizontal position is influenced by vertical distance from center
    // Vertical position is influenced by horizontal distance from center
    coord_dist.x += coord.x * yInfluence;
    coord_dist.y += coord.y * xInfluence;

    // Undo aspect ratio correction
    coord_dist.x /= aspect;

    // Zoom compensation to keep the scene roughly the same size
    float zoom = 1.0 / (1.0 + strength * 0.3);
    coord_dist *= zoom;

    // Convert back to 0..1 UV space
    vec2 uv_src = coord_dist * 0.5 + 0.5;

    // Smooth edge fadeout for artistic vignette
    float edgeDist = max(abs(uv_src.x - 0.5), abs(uv_src.y - 0.5)) * 2.0;
    float edgeFade = smoothstep(1.0, 0.92, edgeDist);

    // Check bounds
    if (uv_src.x < 0.0 || uv_src.x > 1.0 || uv_src.y < 0.0 || uv_src.y > 1.0) {
       outputColor = vec4(bgColor, 1.0);
       return;
    }

    vec4 color = texture2D(inputBuffer, uv_src);
    outputColor = vec4(color.rgb, color.a * edgeFade);
}
`;

// Define the Effect Class
class FisheyeEffectImpl extends Effect {
  constructor({ strength = 0, bgColor = new THREE.Vector3(0.95, 0.95, 0.94) } = {}) {
    super('Fisheye', fisheyeFragment, {
      uniforms: new Map<string, THREE.Uniform<any>>([
          ['strength', new THREE.Uniform(strength)],
          ['bgColor', new THREE.Uniform(bgColor)]
      ]),
    });
  }
}

// React Wrapper
const Fisheye = ({ strength, bgColorHex }: { strength: number, bgColorHex: string }) => {
  const { size } = useThree();
  const bgColorVector = useMemo(() => {
    const c = new THREE.Color(bgColorHex);
    return new THREE.Vector3(c.r, c.g, c.b);
  }, [bgColorHex]);

  const effect = useMemo(() => new FisheyeEffectImpl({ strength, bgColor: bgColorVector }), [strength, bgColorVector]);

  useEffect(() => {
    effect.uniforms.get('strength').value = strength;
    effect.uniforms.get('bgColor').value = bgColorVector;
  }, [strength, bgColorVector, effect]);

  return <primitive object={effect} dispose={null} />;
};

/** Keeps the "put one here" point under the middle of the view. */
const FocusTracker = () => {
  const { camera } = useThree();
  useFrame(() => updateFocus(camera));
  return null;
};

/** Orbit target on mount: straight ahead, at standing eye level. */
const INITIAL_TARGET: [number, number, number] = [0, DEFAULT_CAMERA_HEIGHT, 0];

/** Closest the orbit camera may get to the floor, in metres. */
const GROUND_CLEARANCE = 0.25;

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

  const controlsRef = useRef<any>(null);
  const isDark = theme === 'dark';
  const isWalking = viewMode === 'walk';
  const bgColor = isDark ? '#0c0c0e' : '#f3f3f1';
  const horizonColor = isDark ? '#5cc8ff' : '#1f6feb';
  const figureColor = isDark ? '#7a7a80' : '#5a5a60';

  const curvilinear = perspectiveMode === 'curvilinear' && distortion > 0.001;

  // Sync FOV with Store. While walking with the room showing through, the lens
  // is matched to the real camera instead - WalkControls owns it there.
  useEffect(() => {
    if (isWalking && cameraFeed) return;
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [fov, camera, isWalking, cameraFeed]);

  // Global Gestures
  useGesture(
    {
      onDrag: ({ movement: [, my], touches }) => {
        // 3-Finger Vertical Drag adjusts the lens (focal length only).
        // Curvature is a deliberate mode switch, never a side effect.
        if (touches === 3) {
          const sensitivity = 0.2;
          setLens(fov + my * -1 * sensitivity);
        }
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
      {/* Dynamic Lighting for better form reading */}
      <ambientLight intensity={isDark ? 0.3 : 0.6} />
      <directionalLight position={[15, 25, 10]} intensity={isDark ? 0.8 : 1.2} castShadow />
      <directionalLight position={[-15, 10, -10]} intensity={0.4} color={isDark ? "#445" : "#ccf"} />

      {/* Rim light for edges */}
      <pointLight position={[0, 5, 0]} intensity={0.2} color="#ffffff" />

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
              if (isViewMode) return;
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
            if (isViewMode) return;
            e.stopPropagation();
            selectBox(null);
        }}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Grounding shadows read as a dark disc once there is a real room
          behind the scene, so they come off with the feed on. */}
      {!cameraFeed && (
        <ContactShadows
          position={[0, 0, 0]}
          opacity={isDark ? 0.8 : 0.6}
          scale={60}
          blur={2}
          far={4}
          color="#000000"
        />
      )}

      {/* The curvilinear pass only exists while that mode is on */}
      {curvilinear && (
        <EffectComposer enableNormalPass={false}>
          <Fisheye strength={distortion} bgColorHex={bgColor} />
        </EffectComposer>
      )}

      {/* Orbit is the drawing board; walk mode drives the camera itself. */}
      {!isWalking ? (
        <>
          <OrbitControls
            ref={controlsRef}
            makeDefault
            // Constant, so it is only applied on mount: after that EyeLevelRig owns
            // the height and panning owns the ground position.
            target={INITIAL_TARGET}
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
