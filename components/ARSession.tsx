import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { walkInput } from '../lib/walkInput';
import { endAR, placeSceneAt, startAR, type ARSession as Session } from '../lib/xr';

/**
 * The scene, standing in the room.
 *
 * While a session runs, three things change and everything else stays as it
 * is. The renderer's XR camera takes over, so the walk controls stand down -
 * moving is done by moving. The background is dropped, so the camera feed
 * shows through it. And the projection goes flat, because a phone camera is a
 * rectilinear lens and a curvilinear pass over a passthrough frame would be a
 * drawing of a room laid over the room itself.
 *
 * A ring follows the surface under the middle of the view, the way the Measure
 * app's dot finds a plane, and a tap stands the scene where the ring is.
 */
export const ARSession: React.FC = () => {
  const { gl, scene } = useThree();
  const arRequested = useStore((s) => s.arRequested);
  const setAr = useStore((s) => s.setAr);
  const reticle = useRef<THREE.Mesh>(null);
  const [live, setLive] = useState<Session | null>(null);

  useEffect(() => {
    if (!arRequested) return;
    let session: Session | null = null;
    let cancelled = false;

    startAR(gl)
      .then((started) => {
        if (!started) {
          // No AR on this device: say so by dropping straight back out, rather
          // than sitting in a mode that does nothing.
          setAr(false);
          return;
        }
        if (cancelled) {
          endAR(gl, started);
          return;
        }
        session = started;
        setLive(started);
        started.session.addEventListener('end', () => {
          setLive(null);
          setAr(false);
        });
      })
      .catch(() => setAr(false));

    return () => {
      cancelled = true;
      if (session) endAR(gl, session);
      setLive(null);
    };
  }, [arRequested, gl, setAr]);

  /** Passthrough needs the frame left empty where nothing is drawn. */
  useEffect(() => {
    if (!live) return;
    const wasBackground = scene.background;
    scene.background = null;
    gl.setClearAlpha(0);
    return () => {
      scene.background = wasBackground;
      gl.setClearAlpha(1);
    };
  }, [live, gl, scene]);

  /** A tap stands the scene on whatever the ring has found. */
  useEffect(() => {
    if (!live) return;
    const onSelect = () => {
      const ring = reticle.current;
      if (!ring?.visible) return;
      placeSceneAt(gl, live.space, ring.position.x, ring.position.y, ring.position.z);
    };
    live.session.addEventListener('select', onSelect);
    return () => live.session.removeEventListener('select', onSelect);
  }, [live, gl]);

  useFrame((_, __, frame) => {
    const ring = reticle.current;
    if (!live?.hitTest || !ring) return;

    const xrFrame = frame as XRFrame | undefined;
    if (!xrFrame) return;

    const hits = xrFrame.getHitTestResults(live.hitTest);
    const pose = hits[0]?.getPose(gl.xr.getReferenceSpace() ?? live.space);
    if (!pose) {
      ring.visible = false;
      return;
    }

    ring.visible = true;
    ring.matrix.fromArray(pose.transform.matrix);
    ring.matrix.decompose(ring.position, ring.quaternion, ring.scale);
    // Flat on the surface it found, whichever way that surface faces.
    ring.rotateX(-Math.PI / 2);
  });

  // The walker cannot also be driving the camera while the device is.
  useEffect(() => {
    if (!live) return;
    walkInput.forward = 0;
    walkInput.strafe = 0;
  }, [live]);

  if (!live) return null;

  return (
    <mesh ref={reticle} visible={false} raycast={() => null}>
      <ringGeometry args={[0.07, 0.085, 48]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.9} depthTest={false} />
    </mesh>
  );
};
