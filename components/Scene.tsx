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
// True spherical/equirectangular projection that curves ALL lines toward 5 vanishing points
// This creates the characteristic "bending" effect where horizontal and vertical lines
// curve toward their respective vanishing points (4 cardinal + zenith/nadir)
const fisheyeFragment = `
uniform float strength;
uniform vec3 bgColor;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // Center UVs to -1 to 1 range
    vec2 coord = uv * 2.0 - 1.0;
    
    // Apply aspect ratio correction for proper spherical mapping
    float aspect = resolution.x / resolution.y;
    coord.x *= aspect;
    
    float r = length(coord);
    
    // Skip processing for center pixels when no distortion
    if (strength < 0.001) {
        outputColor = texture2D(inputBuffer, uv);
        return;
    }
    
    // Kim Jung Gi 5-Point Curvilinear Perspective:
    // Uses spherical projection (equidistant azimuthal) which bends ALL straight lines
    // into curves, creating the characteristic "fisheye drawing" look where:
    // - Horizontal lines curve toward left/right vanishing points
    // - Vertical lines curve toward top/bottom vanishing points  
    // - The center vanishing point remains at the center
    
    // Field of view control - higher strength = wider apparent FOV
    float fov = 1.0 + strength * 1.5; // Range from 1.0 to 2.5 (up to ~140° equivalent)
    
    // Spherical projection: Convert 2D screen coords to angles, then back
    // This is the key to true 5-point perspective - it treats the image as if
    // projected onto the inside of a sphere
    float theta = atan(r * fov); // Angle from center
    float r_spherical = theta / PI_HALF; // Normalize to 0-1 for 90° FOV hemisphere
    
    // Apply the spherical distortion
    vec2 coord_dist;
    if (r > 0.0001) {
        coord_dist = coord * (r_spherical / r);
    } else {
        coord_dist = coord;
    }
    
    // Undo aspect ratio correction
    coord_dist.x /= aspect;
    
    // Zoom compensation to keep the scene roughly the same size
    float zoom = 1.0 / (1.0 + strength * 0.4);
    coord_dist *= zoom;
    
    // Convert back to 0..1 UV space
    vec2 uv_src = coord_dist * 0.5 + 0.5;
    
    // Smooth edge fadeout instead of hard cutoff for artistic look
    float edgeDist = max(abs(uv_src.x - 0.5), abs(uv_src.y - 0.5)) * 2.0;
    float edgeFade = smoothstep(1.0, 0.95, edgeDist);
    
    // Check bounds - Output transparent if out of bounds
    if (uv_src.x < 0.0 || uv_src.x > 1.0 || uv_src.y < 0.0 || uv_src.y > 1.0) {
       outputColor = vec4(bgColor, 0.0);
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
    >
      <SceneContent />
    </Canvas>
  );
};