import React, { useEffect, useRef, useState } from 'react';
import { useStore, EYE_LEVEL_PRESETS } from '../store';
import { walkInput, recentre } from '../lib/walkInput';
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
export const WalkOverlay: React.FC<{ onNotice: (message: string) => void }> = ({ onNotice }) => {
  const theme = useStore((s) => s.theme);
  const cameraHeight = useStore((s) => s.cameraHeight);
  const cameraFeed = useStore((s) => s.cameraFeed);
  const setCameraFeed = useStore((s) => s.setCameraFeed);
  const setCameraHeight = useStore((s) => s.setCameraHeight);
  const setViewMode = useStore((s) => s.setViewMode);
  const addBox = useStore((s) => s.addBox);
  const sensorFov = useStore((s) => s.sensorFov);
  const setSensorFov = useStore((s) => s.setSensorFov);
  const viewLocked = useStore((s) => s.viewLocked);
  const toggleViewLock = useStore((s) => s.toggleViewLock);
  const [tuning, setTuning] = useState(false);

  const isDark = theme === 'dark';
  const onCamera = cameraFeed || isDark;
  const chrome = onCamera
    ? 'bg-black/60 text-white border-white/25'
    : 'bg-white/75 text-gray-900 border-gray-300';

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
    if (viewLocked) return;
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

  const button = `px-3 py-2 rounded-full border backdrop-blur-md text-[10px] font-black tracking-widest transition-transform active:scale-95 ${chrome}`;
  const iconButton = `flex items-center justify-center w-10 h-10 rounded-full border backdrop-blur-md transition-transform active:scale-95 ${chrome}`;

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

      {/* Bottom bar: the height number, and two icons */}
      <div className="fixed inset-x-0 bottom-0 z-40 safe-bottom px-3 pb-4 flex justify-center pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button onClick={cycleHeight} className={`${button} tabular-nums`} aria-label="Eye height">
            {cameraHeight.toFixed(2)} m
          </button>

          <button
            onClick={() => setCameraFeed(!cameraFeed)}
            aria-label="Camera"
            className={`${iconButton} ${cameraFeed ? '!bg-sky-500 !text-white !border-sky-400' : ''}`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>

          <button onClick={dropBox} className={iconButton} aria-label="Add cube">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </button>

          {/* Hold the frame still to draw from it */}
          <button
            onClick={toggleViewLock}
            aria-label="Lock view"
            className={`${iconButton} ${viewLocked ? '!bg-amber-400 !text-black !border-amber-300' : ''}`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="10.5" width="16" height="10" rx="2" />
              {viewLocked ? <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /> : <path d="M8 10.5V7a4 4 0 0 1 7.5-2" />}
            </svg>
          </button>

          <button
            onClick={() => setTuning(!tuning)}
            aria-label="Align"
            className={`${iconButton} ${tuning ? '!bg-sky-500 !text-white !border-sky-400' : ''}`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Alignment: the phone's height off the floor, the lens angle, and a
          recentre for compass drift. Numbers only. */}
      {tuning && (
        <div className="fixed inset-x-0 bottom-24 z-40 px-4 flex justify-center pointer-events-none">
          <div className={`w-full max-w-xs rounded-2xl border backdrop-blur-md px-4 py-3 pointer-events-auto ${chrome}`}>
            <div className="flex items-center justify-between text-[10px] font-black tabular-nums">
              <span className="opacity-60">↕</span>
              <span>{cameraHeight.toFixed(2)} m</span>
            </div>
            <input
              type="range"
              min={0.4}
              max={2.4}
              step={0.01}
              value={cameraHeight}
              onChange={(e) => setCameraHeight(parseFloat(e.target.value))}
              className="w-full accent-current"
              aria-label="Height"
            />

            <div className="flex items-center justify-between text-[10px] font-black tabular-nums mt-2">
              <span className="opacity-60">◱</span>
              <span>{Math.round(sensorFov)}°</span>
            </div>
            <input
              type="range"
              min={40}
              max={110}
              step={0.5}
              value={sensorFov}
              onChange={(e) => setSensorFov(parseFloat(e.target.value))}
              className="w-full accent-current"
              aria-label="Lens"
            />

            <button
              onClick={recentre}
              className="mt-2 w-full py-2 rounded-xl border border-current/30 text-[9px] font-black uppercase tracking-widest"
            >
              Recentre
            </button>
          </div>
        </div>
      )}

      {/* Leaving, out of the way of the thumbs */}
      <button
        onClick={() => setViewMode('orbit')}
        className={`fixed z-40 inset-safe-top inset-safe-right flex items-center justify-center w-9 h-9 rounded-full border backdrop-blur-md transition-transform active:scale-95 ${chrome}`}
        aria-label="Exit"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

    </>
  );
};
