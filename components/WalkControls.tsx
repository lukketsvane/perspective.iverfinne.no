import React, { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { walkInput } from '../lib/walkInput';
import { matchedVerticalFov } from '../lib/cameraFeed';

/**
 * First person camera for walk mode.
 *
 * The camera stands at the eye level set in the Practice panel and moves in the
 * ground plane, so the scene is read at 1:1: a 1 m cube is knee height, the
 * horizon stays pinned to your eyes however you move, and walking towards a box
 * foreshortens it the way it will in the drawing.
 *
 * Heading comes from the phone's orientation sensor when it is available and
 * permitted, and from drag-to-look otherwise (which is also what desktop gets).
 */
export const WalkControls = () => {
  const { camera, size } = useThree();
  const cameraHeight = useStore((state) => state.cameraHeight);
  const cameraFeed = useStore((state) => state.cameraFeed);
  const fov = useStore((state) => state.fov);
  const sensorFov = useStore((state) => state.sensorFov);
  const viewLocked = useStore((state) => state.viewLocked);
  const feedNonce = useStore((state) => state.feedNonce);

  const temp = useMemo(
    () => ({
      forward: new THREE.Vector3(),
      right: new THREE.Vector3(),
      euler: new THREE.Euler(0, 0, 0, 'YXZ'),
      target: new THREE.Quaternion(),
    }),
    []
  );

  /**
   * With the room showing through, the virtual lens has to match the real one
   * or the cubes slide against the floor as you turn. That means the sensor's
   * own angle *and* the crop the object-cover video is doing to it - and since
   * no browser reports focal length, the sensor figure is adjustable by hand.
   */
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    if (!cameraFeed) return;

    camera.fov = matchedVerticalFov(sensorFov, size.width, size.height);
    camera.updateProjectionMatrix();

    return () => {
      // Hand the practice lens back on the way out.
      camera.fov = fov;
      camera.updateProjectionMatrix();
    };
  }, [cameraFeed, camera, size.width, size.height, fov, sensorFov, feedNonce]);

  // Step into the scene where the orbit camera was standing, keeping its
  // heading, so entering walk mode is a change of stance and not a teleport.
  useEffect(() => {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    walkInput.position.set(camera.position.x, 0, camera.position.z);
    walkInput.yaw = Math.atan2(-direction.x, -direction.z);
    walkInput.pitch = 0;
    walkInput.forward = 0;
    walkInput.strafe = 0;
  }, [camera]);

  useFrame((_, rawDelta) => {
    // Locked, the framed view holds still - the phone can be moved, put down or
    // drawn from without the scene following it.
    if (viewLocked) return;

    // Cap the step so a backgrounded tab does not fire the walker across the map.
    const delta = Math.min(rawDelta, 0.1);

    if (walkInput.useDeviceOrientation) {
      // Raw sensor readings jitter by a degree or so at rest, which reads as a
      // shiver over a live camera. Chase the reading instead of snapping to it,
      // frame-rate independent so it feels the same at 60 and 120 Hz.
      temp.target.copy(walkInput.deviceQuaternion);
      camera.quaternion.slerp(temp.target, 1 - Math.exp(-18 * delta));
    } else {
      temp.euler.set(walkInput.pitch, walkInput.yaw, 0, 'YXZ');
      camera.quaternion.setFromEuler(temp.euler);
    }

    if (walkInput.forward !== 0 || walkInput.strafe !== 0) {
      temp.forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      temp.forward.y = 0;
      if (temp.forward.lengthSq() < 1e-6) temp.forward.set(0, 0, -1); // looking straight down
      temp.forward.normalize();

      temp.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      temp.right.y = 0;
      temp.right.normalize();

      const step = walkInput.speed * delta;
      walkInput.position.addScaledVector(temp.forward, walkInput.forward * step);
      walkInput.position.addScaledVector(temp.right, walkInput.strafe * step);
    }

    camera.position.set(walkInput.position.x, cameraHeight, walkInput.position.z);
  });

  return null;
};
