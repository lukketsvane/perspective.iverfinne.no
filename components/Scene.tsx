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

// Custom Shader for Strong 5-Point Perspective / Fisheye
// Modified to have transparent edges
const fisheyeFragment = `
uniform float strength;
uniform vec3 bgColor;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // Center UVs
    vec2 coord = uv * 2.0 - 1.0;
    float r = length(coord);
    
    // 5-Point / Fisheye Distortion Formula
    float k = strength * 2.0; 
    float r_dist = r * (1.0 + k * r * r);
    
    // Zoom correction
    float zoom = 1.0 + strength * 0.8;
    vec2 coord_dist = coord * (r_dist / r) / zoom;
    
    // Convert back to 0..1 UV space
    vec2 uv_src = coord_dist * 0.5 + 0.5;
    
    // Check bounds - Output transparent if out of bounds to avoid hard frame
    if (uv_src.x < 0.0 || uv_src.x > 1.0 || uv_src.y < 0.0 || uv_src.y > 1.0) {
       outputColor = vec4(0.0, 0.0, 0.0, 0.0); // Transparent
       return;
    }

    outputColor = texture2D(inputBuffer, uv_src);
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