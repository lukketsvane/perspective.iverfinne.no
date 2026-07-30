import React, { useRef, useCallback } from 'react';
import { useThree, ThreeEvent } from '@react-three/fiber';
import { Edges, Line } from '@react-three/drei';
import * as THREE from 'three';
import { BoxData } from '../types';
import { useStore } from '../store';
import { noteDragEnd } from '../lib/dragGuard';
import { createGroundPicker } from '../lib/groundDrag';

interface KimBoxProps {
  data: BoxData;
}

export const KimBox: React.FC<KimBoxProps> = ({ data }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const selectBox = useStore((state) => state.selectBox);
  const updateBox = useStore((state) => state.updateBox);
  const selectedId = useStore((state) => state.selectedId);
  const setIsDraggingGlobal = useStore((state) => state.setIsDragging);
  const theme = useStore((state) => state.theme);
  const isViewMode = useStore((state) => state.isViewMode);
  
  const { camera, controls, gl } = useThree();
  
  const isSelected = selectedId === data.id;
  const isDark = theme === 'dark';

  // Black boxes on a black ground: the edges and the sun do the describing.
  const boxColor = isDark ? (isSelected ? "#101010" : "#000000") : (isSelected ? "#ffefef" : "#ffffff");
  const edgeColor = isDark ? (isSelected ? "#ff5555" : "#ffffff") : (isSelected ? "#ff3b30" : "#0a0a0a");

  // Cursor style management
  const handlePointerOver = () => {
    if (isViewMode) return;
    if (isSelected) document.body.style.cursor = 'crosshair';
    else document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
     document.body.style.cursor = 'auto';
  };

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (isViewMode) return;
    e.stopPropagation();

    // If not selected, just select and return. 
    // This requires a second click-drag to manipulate, preventing accidental edits when just selecting.
    if (!isSelected) {
      selectBox(data.id);
      return;
    }

    if (!meshRef.current) return;

    // --- START DRAG ---
    setIsDraggingGlobal(true);
    if (controls) (controls as any).enabled = false;
    document.body.style.cursor = 'grabbing';

    const startX = e.clientX;
    const startY = e.clientY;
    const initialScale = [...data.scale];
    const initialPos = [...data.position];
    
    // Get the local normal of the face we clicked
    const normalLocal = e.face?.normal?.clone().normalize() || new THREE.Vector3(0, 1, 0);

    // Calculate World Normal to determine screen direction
    // This ensures "Push" and "Pull" align with visual direction regardless of rotation
    const normalWorld = normalLocal.clone().applyQuaternion(meshRef.current.quaternion).normalize();

    // Project this normal direction onto the screen
    // We calculate two points in world space: Center of object, and a point slightly along the normal
    const centerWorld = meshRef.current.position.clone();
    const tipWorld = centerWorld.clone().add(normalWorld);

    // Project to NDC
    centerWorld.project(camera);
    tipWorld.project(camera);

    // Calculate screen vector (NDC space)
    // In NDC, Y goes Up. In Screen Pixels, Y goes Down.
    // We will convert NDC vector to a pixel-space-aligned logic (Y down) for dot product
    const ndcDx = tipWorld.x - centerWorld.x;
    const ndcDy = tipWorld.y - centerWorld.y;
    
    // Screen vector where Y points DOWN (matching mouse coordinates)
    // NDC Y is up, so we invert it to match pixel coordinates
    const screenDirX = ndcDx;
    const screenDirY = -ndcDy; 
    
    // Normalize to get pure direction
    const len = Math.sqrt(screenDirX * screenDirX + screenDirY * screenDirY);
    const safeLen = len > 0.0001 ? len : 1;
    const normalizedScreenDirX = screenDirX / safeLen;
    const normalizedScreenDirY = screenDirY / safeLen;

    const handleWindowMove = (moveEvent: PointerEvent) => {
        if (!meshRef.current) return;

        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        
        // Increased sensitivity for fluid feel
        const sensitivity = 0.03; 

        // --- DIRECTION MAPPING ---
        // Project the mouse delta onto the visual screen direction of the normal
        // Dot Product: (dx * dirX) + (dy * dirY)
        // This tells us how much we moved "along" the visual arrow of the face normal
        const projection = (dx * normalizedScreenDirX) + (dy * normalizedScreenDirY);
        
        const change = projection * sensitivity;
        
        const newScale = [...initialScale];
        const newPos = [...initialPos];
        const axisIndex = Math.abs(normalLocal.x) > 0.9 ? 0 : Math.abs(normalLocal.y) > 0.9 ? 1 : 2;
        
        // Apply Scale. Snapping keeps sizes readable against the 1 m grid -
        // a box ends up 1.75 m tall, not 1.73 - which is the difference between
        // a reference you can measure against and one you cannot.
        const snap = useStore.getState().snapStep;
        const raw = initialScale[axisIndex] + change;
        const snapped = snap > 0 ? Math.round(raw / snap) * snap : raw;
        newScale[axisIndex] = Math.max(snap > 0 ? snap : 0.1, snapped);
        
        // --- ANCHORING LOGIC ---
        // Calculate the physical size change
        const actualDiff = newScale[axisIndex] - initialScale[axisIndex];
        
        // Move center position by half the growth, in the direction of the normal.
        // We use the LOCAL normal for axis determination, but we need to move in WORLD space if rotated?
        // BoxData stores position/rotation/scale. The position is the center.
        // If we scale the object locally, the geometry expands in both directions locally.
        // To anchor one side, we shift the center by half the diff along the rotated local axis.
        
        // Local Axis Vector (e.g. (1,0,0) for Right Face)
        const axisVector = new THREE.Vector3(
            axisIndex === 0 ? Math.sign(normalLocal.x) : 0,
            axisIndex === 1 ? Math.sign(normalLocal.y) : 0,
            axisIndex === 2 ? Math.sign(normalLocal.z) : 0
        );

        // Rotate this axis vector to match current object rotation
        axisVector.applyQuaternion(meshRef.current.quaternion);

        // Update position
        const shiftAmount = actualDiff / 2;
        newPos[0] = initialPos[0] + axisVector.x * shiftAmount;
        newPos[1] = initialPos[1] + axisVector.y * shiftAmount;
        newPos[2] = initialPos[2] + axisVector.z * shiftAmount;

        // Apply visual updates immediately
        meshRef.current.scale.set(newScale[0], newScale[1], newScale[2]);
        meshRef.current.position.set(newPos[0], newPos[1], newPos[2]);

        // Commit as we go, so the size readout counts up under the thumb
        // instead of only landing when the finger lifts.
        updateBox(data.id, {
            scale: [newScale[0], newScale[1], newScale[2]],
            position: [newPos[0], newPos[1], newPos[2]],
        });
    };

    const handleWindowUp = () => {
        // --- END DRAG ---
        noteDragEnd();
        setIsDraggingGlobal(false);
        if (controls) (controls as any).enabled = true;
        document.body.style.cursor = 'auto';

        // Commit final state to store
        if (meshRef.current) {
            updateBox(data.id, {
                scale: [meshRef.current.scale.x, meshRef.current.scale.y, meshRef.current.scale.z],
                position: [meshRef.current.position.x, meshRef.current.position.y, meshRef.current.position.z]
            });
        }

        // Cleanup
        window.removeEventListener('pointermove', handleWindowMove);
        window.removeEventListener('pointerup', handleWindowUp);
    };

    // Attach listeners to window to capture full-screen gestures
    window.addEventListener('pointermove', handleWindowMove);
    window.addEventListener('pointerup', handleWindowUp);

  }, [isSelected, controls, data, selectBox, updateBox, setIsDraggingGlobal, isViewMode, camera]);

  /** Slide the box across the floor, keeping its height and its size. */
  const handleMoveDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (isViewMode) return;
    e.stopPropagation();

    setIsDraggingGlobal(true);
    if (controls) (controls as any).enabled = false;
    document.body.style.cursor = 'grabbing';

    const start: [number, number, number] = [...data.position];
    const onGround = createGroundPicker(camera, gl.domElement);
    // The handle floats above the box, so the ray through it can be too flat to
    // meet the floor within reach. That is fine for an anchor - fall back to
    // where the box already stands and drag relative to that.
    const grabbed =
      onGround(e.clientX, e.clientY) ?? new THREE.Vector3(start[0], 0, start[2]);

    const onMove = (moveEvent: PointerEvent) => {
      const now = onGround(moveEvent.clientX, moveEvent.clientY);
      if (!now) return;
      const snap = useStore.getState().snapStep;
      const place = (v: number) => (snap > 0 ? Math.round(v / snap) * snap : v);
      updateBox(data.id, {
        position: [place(start[0] + (now.x - grabbed.x)), start[1], place(start[2] + (now.z - grabbed.z))],
      });
    };

    const onUp = () => {
      noteDragEnd();
      setIsDraggingGlobal(false);
      if (controls) (controls as any).enabled = true;
      document.body.style.cursor = 'auto';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [isViewMode, controls, data.id, data.position, setIsDraggingGlobal, updateBox, camera, gl]);

  return (
    <group>
      {/* Helper Lines (Only when selected AND not in View Mode) */}
      {isSelected && !isViewMode && (
        <group>
            {/* Central Axis Spine - Visual hint for vertical alignment */}
            <Line
                points={[[data.position[0], 0, data.position[2]], [data.position[0], data.position[1] + data.scale[1]/2 + 2, data.position[2]]]}
                color={edgeColor}
                lineWidth={1}
                dashed
                dashScale={2}
                gapSize={0.5}
                opacity={0.5}
                transparent
            />
            {/* Ground Footprint Shadow */}
            <mesh 
                position={[data.position[0], 0.02, data.position[2]]} 
                rotation={[-Math.PI/2, 0, data.rotation[1]]}
            >
                <planeGeometry args={[data.scale[0] + 0.4, data.scale[2] + 0.4]} />
                <meshBasicMaterial color={edgeColor} transparent opacity={0.1} />
            </mesh>

            {/*
              * Move handle.
              *
              * Dragging a face resizes, so moving needs a target of its own.
              * It floats above the box rather than sitting on the floor
              * underneath it: a handle the box itself occludes is a handle the
              * ray never reaches, however well it draws.
              */}
            <mesh
                position={[
                  data.position[0],
                  data.position[1] + data.scale[1] / 2 + 0.42,
                  data.position[2],
                ]}
                onPointerDown={handleMoveDown}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                renderOrder={999}
            >
                <sphereGeometry args={[0.16, 20, 14]} />
                <meshBasicMaterial color={edgeColor} depthTest={false} toneMapped={false} />
            </mesh>
        </group>
      )}

      <mesh
        ref={meshRef}
        position={data.position as any}
        rotation={data.rotation as any}
        scale={data.scale as any}
        // A box that throws no shadow is a box with no relationship to the
        // ground, which is half of what a perspective study is about.
        castShadow
        receiveShadow
        // If in view mode, we essentially disable pointer events so clicks pass through to controls
        onPointerDown={handlePointerDown}
        // The ground plane below deselects on click and spawns on double click.
        // Swallow both here so hitting a box never falls through to the floor.
        onClick={(e) => {
            if (isViewMode) return;
            e.stopPropagation();
        }}
        onDoubleClick={(e) => {
            if (isViewMode) return;
            e.stopPropagation();
        }}
        onPointerOver={(e) => { 
            if (isViewMode) return;
            e.stopPropagation(); 
            handlePointerOver(); 
        }}
        onPointerOut={(e) => { 
            if (isViewMode) return;
            e.stopPropagation(); 
            handlePointerOut(); 
        }}
        // Using 'none' forces all events to ignore the mesh, which is perfect for View Mode
        // allowing orbit controls to work even when clicking "on" a box.
        style={{ pointerEvents: isViewMode ? 'none' : 'auto' } as any}
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
        <Edges
          scale={1}
          threshold={15}
          color={edgeColor}
        />
        
        {/* Interaction Hints - Dots on faces */}
        {isSelected && !isViewMode && (
           <group>
               {/* Top Face Dot */}
               <mesh position={[0, 0.5, 0]}>
                   <sphereGeometry args={[0.05]} />
                   <meshBasicMaterial color={edgeColor} toneMapped={false} />
               </mesh>
               {/* Right Face Dot */}
               <mesh position={[0.5, 0, 0]}>
                   <sphereGeometry args={[0.05]} />
                   <meshBasicMaterial color={edgeColor} toneMapped={false} />
               </mesh>
               {/* Front Face Dot */}
               <mesh position={[0, 0, 0.5]}>
                   <sphereGeometry args={[0.05]} />
                   <meshBasicMaterial color={edgeColor} toneMapped={false} />
               </mesh>
           </group>
        )}
      </mesh>
    </group>
  );
};