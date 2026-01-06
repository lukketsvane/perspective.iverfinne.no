import React, { useEffect, useRef, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, ContactShadows } from '@react-three/drei';
import { EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
// @ts-ignore
import { Effect } from 'postprocessing';
import { useStore } from '../store';
import { KimBox } from './KimBox';
import { useGesture } from '@use-gesture/react';

// Custom Shader for Kim Jung Gi 5-Point Curvilinear Perspective
// 
// Kim Jung Gi's legendary drawing technique uses 5-point curvilinear perspective:
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

const SceneContent = () => {
  const { camera } = useThree();
  const boxes = useStore((state) => state.boxes);
  const addBox = useStore((state) => state.addBox);
  const selectBox = useStore((state) => state.selectBox);
  const isDragging = useStore((state) => state.isDragging);
  const isViewMode = useStore((state) => state.isViewMode);
  
  const fov = useStore((state) => state.fov);
  const distortion = useStore((state) => state.distortion);
  const setLens = useStore((state) => state.setLens);
  const theme = useStore((state) => state.theme);

  const controlsRef = useRef<any>(null);
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#0c0c0e' : '#f3f3f1';

  // Sync FOV with Store
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [fov, camera]);

  // Global Gestures
  useGesture(
    {
      onDrag: ({ args: [originalEvent], movement: [mx, my], touches }) => {
        // 3-Finger Vertical Drag for Lens (FOV + Distortion)
        if (touches === 3) {
          const sensitivity = 0.2;
          const delta = my * -1 * sensitivity;
          const newFov = fov + delta;
          // Curve distortion based on FOV to simulate lens physics
          const distortionFactor = Math.max(0, (newFov - 30) / 200);
          setLens(newFov, distortionFactor);
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
      <color attach="background" args={[bgColor]} />
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

      {/* Grid and Ground Plane Interactions */}
      <Grid
        position={[0, 0.01, 0]}
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor={isDark ? "#444444" : "#999999"}
        sectionSize={5}
        sectionThickness={1.0}
        sectionColor={isDark ? "#666666" : "#333333"}
        fadeDistance={80}
        fadeStrength={1.5}
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

      <ContactShadows 
        position={[0, 0, 0]} 
        opacity={isDark ? 0.8 : 0.6} 
        scale={100} 
        blur={2} 
        far={4} 
        color="#000000"
      />

      <EffectComposer enableNormalPass={false}>
         <Fisheye strength={distortion} bgColorHex={bgColor} />
      </EffectComposer>

      <OrbitControls 
        ref={controlsRef}
        makeDefault 
        enabled={!isDragging} // Disable controls when dragging an object
        minPolarAngle={0} 
        maxPolarAngle={Math.PI / 2 - 0.05} // Don't go below ground
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
      />
    </>
  );
};

export const Scene = () => {
  return (
    <Canvas
      shadows
      camera={{ position: [8, 6, 8], fov: 85 }}
      dpr={[1, 1.5]}
      // Enable alpha to allow transparency in canvas if shader outputs 0 alpha
      gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, alpha: true }}
      className="transition-colors duration-500"
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    >
      <SceneContent />
    </Canvas>
  );
};