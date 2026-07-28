import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore, EYE_LEVEL_PRESETS } from '../store';
import { walkInput } from '../lib/walkInput';
import { supportsQuickLook, walkSceneInAR } from '../lib/ar';

const LOOK_SENSITIVITY = 0.0045; // radians per pixel
const MAX_PITCH = Math.PI / 2 - 0.05;

/**
 * The walk-mode controls: look, walk, eye height, camera feed, AR.
 *
 * Everything is thumb-sized and along the bottom edge, because this is the mode
 * you use standing up with a phone in one hand.
 */
export const WalkOverlay: React.FC<{ onNotice: (message: string) => void }> = ({ onNotice }) => {
  const theme = useStore((s) => s.theme);
  const boxes = useStore((s) => s.boxes);
  const models = useStore((s) => s.models);
  const cameraHeight = useStore((s) => s.cameraHeight);
  const cameraFeed = useStore((s) => s.cameraFeed);
  const setCameraFeed = useStore((s) => s.setCameraFeed);
  const setCameraHeight = useStore((s) => s.setCameraHeight);
  const setViewMode = useStore((s) => s.setViewMode);

  const [exporting, setExporting] = useState(false);
  const quickLook = supportsQuickLook();

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

  const isDark = theme === 'dark';
  // The feed makes a light chrome unreadable, so lean dark whenever it is on.
  const onCamera = cameraFeed || isDark;
  const chrome = onCamera
    ? 'bg-black/55 text-white border-white/25'
    : 'bg-white/70 text-gray-900 border-gray-300';

  // ---------------------------------------------------------------- look drag
  const look = useRef<{ id: number | null; x: number; y: number }>({ id: null, x: 0, y: 0 });

  const onLookDown = (e: React.PointerEvent) => {
    if (walkInput.useDeviceOrientation) return; // the phone is doing the looking
    look.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onLookMove = (e: React.PointerEvent) => {
    if (look.current.id !== e.pointerId) return;
    const dx = e.clientX - look.current.x;
    const dy = e.clientY - look.current.y;
    look.current.x = e.clientX;
    look.current.y = e.clientY;
    walkInput.yaw -= dx * LOOK_SENSITIVITY;
    walkInput.pitch = Math.max(
      -MAX_PITCH,
      Math.min(MAX_PITCH, walkInput.pitch - dy * LOOK_SENSITIVITY)
    );
  };

  const onLookUp = (e: React.PointerEvent) => {
    if (look.current.id === e.pointerId) look.current.id = null;
  };

  // ---------------------------------------------------------------- joystick
  const stickRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState<{ x: number; y: number } | null>(null);
  const stickPointer = useRef<number | null>(null);

  const applyStick = (clientX: number, clientY: number) => {
    const el = stickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const radius = rect.width / 2;
    let dx = clientX - (rect.left + radius);
    let dy = clientY - (rect.top + radius);
    const distance = Math.hypot(dx, dy);
    if (distance > radius) {
      dx = (dx / distance) * radius;
      dy = (dy / distance) * radius;
    }
    setKnob({ x: dx, y: dy });
    walkInput.strafe = dx / radius;
    walkInput.forward = -dy / radius;
  };

  const releaseStick = () => {
    stickPointer.current = null;
    setKnob(null);
    walkInput.forward = 0;
    walkInput.strafe = 0;
  };

  // ---------------------------------------------------------------- keyboard
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

  const walkInAR = useCallback(async () => {
    setExporting(true);
    try {
      await walkSceneInAR(boxes, models);
    } catch (error) {
      console.error(error);
      onNotice('Could not build the AR scene.');
    } finally {
      setExporting(false);
    }
  }, [boxes, models, onNotice]);

  const button = `px-3 py-2 rounded-full border backdrop-blur-md text-[10px] font-bold uppercase tracking-widest transition-transform active:scale-95 ${chrome}`;

  return (
    <>
      {/* Look layer. Sits over the canvas so a drag turns the head instead of
          orbiting, and under the controls below. */}
      <div
        className="fixed inset-0 z-30 touch-none"
        onPointerDown={onLookDown}
        onPointerMove={onLookMove}
        onPointerUp={onLookUp}
        onPointerCancel={onLookUp}
      />

      {/* Joystick */}
      <div
        ref={stickRef}
        className={`fixed bottom-24 left-6 w-28 h-28 rounded-full border backdrop-blur-md z-40 touch-none ${chrome}`}
        style={{ opacity: 0.9 }}
        onPointerDown={(e) => {
          stickPointer.current = e.pointerId;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          applyStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (stickPointer.current !== e.pointerId) return;
          applyStick(e.clientX, e.clientY);
        }}
        onPointerUp={releaseStick}
        onPointerCancel={releaseStick}
      >
        <div
          className="absolute w-12 h-12 rounded-full border-2 border-current"
          style={{
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translate(${knob?.x ?? 0}px, ${knob?.y ?? 0}px)`,
            transition: knob ? 'none' : 'transform 150ms ease-out',
          }}
        />
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto flex-wrap justify-center">
          <button onClick={cycleHeight} className={button} title="Eye height above the ground">
            Eye {cameraHeight.toFixed(2)} m
          </button>

          <button
            onClick={() => setCameraFeed(!cameraFeed)}
            title={cameraFeed ? 'Hide the live camera' : 'Show the live camera behind the scene'}
            className={`${button} ${cameraFeed ? '!bg-sky-500 !text-white !border-sky-400' : ''}`}
          >
            Camera
          </button>

          {quickLook && (
            <button
              onClick={walkInAR}
              disabled={exporting}
              title="Open the scene in AR Quick Look and walk around it for real"
              className={`${button} disabled:opacity-50`}
            >
              {exporting ? 'Building…' : 'AR'}
            </button>
          )}

          <button onClick={() => setViewMode('orbit')} className={button}>
            Exit
          </button>
        </div>
      </div>

      {/* Hint */}
      <div className="fixed top-6 left-0 right-0 z-40 flex justify-center pointer-events-none px-6">
        <span
          className={`px-3 py-1.5 rounded-full border backdrop-blur-md text-[9px] font-bold uppercase tracking-widest text-center ${chrome}`}
        >
          {usingSensor ? 'Turn with the phone · stick to walk' : 'Drag to look · stick or WASD to walk'}
        </span>
      </div>
    </>
  );
};
