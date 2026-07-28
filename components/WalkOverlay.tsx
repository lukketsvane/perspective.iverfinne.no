import React, { useEffect, useRef, useState } from 'react';
import { useStore, EYE_LEVEL_PRESETS } from '../store';
import { walkInput } from '../lib/walkInput';
import { focusPoint } from '../lib/focus';

const LOOK_SENSITIVITY = 0.0045; // radians per pixel
const MAX_PITCH = Math.PI / 2 - 0.05;
const STICK_RADIUS = 56; // px

/**
 * Walk-mode controls, built for two thumbs.
 *
 * The left of the screen walks and the right looks, both at once, with the
 * stick appearing wherever the thumb lands rather than at a fixed spot on the
 * glass - a phone is held differently every time it is picked up. When the
 * orientation sensor is driving the view, the whole screen becomes stick, since
 * looking is the phone's job by then.
 */
export const WalkOverlay: React.FC<{ onNotice: (message: string) => void; onAR: () => void }> = ({
  onNotice,
  onAR,
}) => {
  const theme = useStore((s) => s.theme);
  const cameraHeight = useStore((s) => s.cameraHeight);
  const cameraFeed = useStore((s) => s.cameraFeed);
  const setCameraFeed = useStore((s) => s.setCameraFeed);
  const setCameraHeight = useStore((s) => s.setCameraHeight);
  const setViewMode = useStore((s) => s.setViewMode);
  const addBox = useStore((s) => s.addBox);

  const isDark = theme === 'dark';
  const onCamera = cameraFeed || isDark;
  const chrome = onCamera
    ? 'bg-black/60 text-white border-white/25'
    : 'bg-white/75 text-gray-900 border-gray-300';

  // The sensor only reports after the first event, which lands a moment after
  // the mode opens - watch for it so the hint tells the truth.
  const [usingSensor, setUsingSensor] = useState(walkInput.useDeviceOrientation);
  useEffect(() => {
    if (usingSensor) return;
    const timer = window.setInterval(() => {
      if (walkInput.useDeviceOrientation) {
        setUsingSensor(true);
        window.clearInterval(timer);
      }
    }, 300);
    return () => window.clearInterval(timer);
  }, [usingSensor]);

  // --------------------------------------------------------------- gestures
  const look = useRef<{ id: number; x: number; y: number } | null>(null);
  const stick = useRef<{ id: number; x: number; y: number } | null>(null);
  const [stickView, setStickView] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);

  const isStickZone = (x: number, y: number) => {
    // With the phone steering the view, anywhere is fair game for walking.
    if (walkInput.useDeviceOrientation) return true;
    return x < window.innerWidth * 0.45 && y > window.innerHeight * 0.45;
  };

  const applyStick = (originX: number, originY: number, x: number, y: number) => {
    let dx = x - originX;
    let dy = y - originY;
    const distance = Math.hypot(dx, dy);
    if (distance > STICK_RADIUS) {
      dx = (dx / distance) * STICK_RADIUS;
      dy = (dy / distance) * STICK_RADIUS;
    }
    setStickView({ x: originX, y: originY, dx, dy });
    walkInput.strafe = dx / STICK_RADIUS;
    walkInput.forward = -dy / STICK_RADIUS;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // Capture keeps a thumb that slides off the layer still driving it, but it
    // throws for a pointer the browser no longer considers active - and an
    // exception here would take the whole gesture down with it.
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      /* not capturable; the window-level handlers still see the moves */
    }
    if (!stick.current && isStickZone(e.clientX, e.clientY)) {
      stick.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      applyStick(e.clientX, e.clientY, e.clientX, e.clientY);
    } else if (!look.current && !walkInput.useDeviceOrientation) {
      look.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (stick.current?.id === e.pointerId) {
      applyStick(stick.current.x, stick.current.y, e.clientX, e.clientY);
      return;
    }
    if (look.current?.id === e.pointerId) {
      const dx = e.clientX - look.current.x;
      const dy = e.clientY - look.current.y;
      look.current.x = e.clientX;
      look.current.y = e.clientY;
      walkInput.yaw -= dx * LOOK_SENSITIVITY;
      walkInput.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, walkInput.pitch - dy * LOOK_SENSITIVITY));
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    if (stick.current?.id === e.pointerId) {
      stick.current = null;
      setStickView(null);
      walkInput.forward = 0;
      walkInput.strafe = 0;
    }
    if (look.current?.id === e.pointerId) look.current = null;
  };

  // --------------------------------------------------------------- keyboard
  useEffect(() => {
    const keys = new Set<string>();
    const apply = () => {
      walkInput.forward = (keys.has('w') || keys.has('arrowup') ? 1 : 0) + (keys.has('s') || keys.has('arrowdown') ? -1 : 0);
      walkInput.strafe = (keys.has('d') || keys.has('arrowright') ? 1 : 0) + (keys.has('a') || keys.has('arrowleft') ? -1 : 0);
    };
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setViewMode('orbit'); return; }
      keys.add(e.key.toLowerCase());
      apply();
    };
    const up = (e: KeyboardEvent) => { keys.delete(e.key.toLowerCase()); apply(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      walkInput.forward = 0;
      walkInput.strafe = 0;
    };
  }, [setViewMode]);

  // ---------------------------------------------------------------- actions
  const cycleHeight = () => {
    const index = EYE_LEVEL_PRESETS.findIndex((p) => Math.abs(p.height - cameraHeight) < 0.001);
    const next = EYE_LEVEL_PRESETS[(index + 1) % EYE_LEVEL_PRESETS.length];
    setCameraHeight(next.height);
  };

  const dropBox = () => {
    addBox([focusPoint.x, 0, focusPoint.z]);
    onNotice('Cube placed where you are looking.');
  };

  const button = `px-3 py-2 rounded-full border backdrop-blur-md text-[10px] font-bold uppercase tracking-widest transition-transform active:scale-95 ${chrome}`;

  return (
    <>
      {/* One layer for both thumbs; pointer ids keep them apart. */}
      <div
        className="fixed inset-0 z-30 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      />

      {/* The stick, drawn where the thumb actually landed */}
      {stickView && (
        <div
          className={`fixed z-40 rounded-full border pointer-events-none ${chrome}`}
          style={{
            width: STICK_RADIUS * 2,
            height: STICK_RADIUS * 2,
            left: stickView.x - STICK_RADIUS,
            top: stickView.y - STICK_RADIUS,
            opacity: 0.75,
          }}
        >
          <div
            className="absolute w-11 h-11 rounded-full border-2 border-current"
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translate(${stickView.dx}px, ${stickView.dy}px)`,
            }}
          />
        </div>
      )}

      {/* Bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 safe-bottom px-3 pb-4 flex justify-center pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto flex-wrap justify-center">
          <button onClick={cycleHeight} className={button} title="Eye height above the ground">
            {cameraHeight.toFixed(2)} m
          </button>

          <button
            onClick={() => setCameraFeed(!cameraFeed)}
            title={cameraFeed ? 'Hide the live camera' : 'Show the live camera behind the scene'}
            className={`${button} ${cameraFeed ? '!bg-sky-500 !text-white !border-sky-400' : ''}`}
          >
            Camera
          </button>

          <button onClick={dropBox} className={button} title="Put a cube where you are looking">
            + Cube
          </button>

          <button onClick={onAR} className={`${button} !font-black`} title="Stand in it for real">
            AR
          </button>
        </div>
      </div>

      {/* Leaving, out of the way of the thumbs */}
      <button
        onClick={() => setViewMode('orbit')}
        className={`fixed z-40 inset-safe-top inset-safe-right flex items-center justify-center w-9 h-9 rounded-full border backdrop-blur-md transition-transform active:scale-95 ${chrome}`}
        title="Back to the drawing board"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Hint */}
      <div className="fixed inset-x-0 top-0 z-30 safe-top pt-3 flex justify-center pointer-events-none px-16">
        <span
          className={`px-3 py-1.5 rounded-full border backdrop-blur-md text-[9px] font-bold uppercase tracking-widest text-center ${chrome}`}
        >
          {usingSensor ? 'Turn with the phone · hold to walk' : 'Right side looks · left thumb walks'}
        </span>
      </div>
    </>
  );
};
