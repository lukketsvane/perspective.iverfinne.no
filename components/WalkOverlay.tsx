import React, { useEffect, useRef, useState } from 'react';
import { useStore, EYE_LEVEL_PRESETS } from '../store';
import { walkInput } from '../lib/walkInput';
import { Icon, I } from './icons';
import { Scrub, useGrayThemeControl } from './controls';
import { PracticePanel } from './PracticePanel';
import type { Layout } from '../lib/useLayout';

const MAX_PITCH = Math.PI / 2 - 0.05;
const STICK_RADIUS = 64; // px

/**
 * How fast a drag turns you, relative to grabbing the picture and pulling it.
 *
 * At 1 the thing under the finger stays under the finger, which is the calmest
 * possible answer and also a slow one - turning right round takes several full
 * sweeps. A little over that keeps the world feeling attached to the hand while
 * letting a single sweep cover most of a quarter turn.
 */
const LOOK_GAIN = 1.4;

/**
 * Radians of turn per pixel of drag.
 *
 * This used to be a constant 0.0045, chosen against nothing, which on an iPad
 * meant a sweep across the glass spun you three hundred degrees - the reason
 * looking around felt like it was on ice. What it should depend on is how much
 * world is on the screen: the same swipe should turn you less when the lens is
 * wide, because a wide lens already put more of the room in front of you.
 *
 * So it is measured off the frame. In curvilinear the width of the canvas *is*
 * the field, in degrees, because the projection is equidistant - angle from the
 * centre is distance from the centre, evenly. In straight-line perspective the
 * setting is vertical, so it is opened out to the horizontal by the frame's
 * shape.
 */
const lookRadiansPerPixel = (
  curvilinear: boolean,
  fovDegrees: number,
  width: number,
  height: number
) => {
  const horizontal = curvilinear
    ? (fovDegrees * Math.PI) / 180
    : 2 * Math.atan(Math.tan((fovDegrees * Math.PI) / 360) * (width / Math.max(height, 1)));
  return (horizontal / Math.max(width, 1)) * LOOK_GAIN;
};

/**
 * The stick's response: a dead zone, then a curve.
 *
 * A thumb resting on the glass drifts a few pixels, and squaring the push means
 * the first third of the throw is a slow creep - which is what you want when
 * lining an edge up with something. Full tilt is still full speed.
 */
const STICK_DEAD_ZONE = 0.14;

const shapeStick = (magnitude: number) => {
  if (magnitude <= STICK_DEAD_ZONE) return 0;
  const t = (magnitude - STICK_DEAD_ZONE) / (1 - STICK_DEAD_ZONE);
  return t * t;
};

/**
 * Walk-mode controls, built for two thumbs.
 *
 * The left of the screen walks and the right looks, both at once, with the
 * stick appearing wherever the thumb lands rather than at a fixed spot on the
 * glass - a phone is held differently every time it is picked up. When the
 * orientation sensor is driving the view, the whole screen becomes stick, since
 * looking is the phone's job by then.
 */
export const WalkOverlay: React.FC<{
  onModels: () => void;
  onAddCube: () => void;
  onUpload?: (files: FileList) => void;
  layout: Layout;
}> = ({ onModels, onAddCube, layout }) => {
  const theme = useStore((s) => s.theme);
  const cameraHeight = useStore((s) => s.cameraHeight);
  const setCameraHeight = useStore((s) => s.setCameraHeight);
  const viewLocked = useStore((s) => s.viewLocked);
  const toggleViewLock = useStore((s) => s.toggleViewLock);
  const fov = useStore((s) => s.fov);
  const setLens = useStore((s) => s.setLens);
  const perspectiveMode = useStore((s) => s.perspectiveMode);
  const sun = useStore((s) => s.sun);
  const setSun = useStore((s) => s.setSun);
  const sunEnvironment = useStore((s) => s.sunEnvironment);
  const toggleSunEnvironment = useStore((s) => s.toggleSunEnvironment);
  const grayThemeControl = useGrayThemeControl(toggleSunEnvironment);
  const [showTools, setShowTools] = useState(false);

  const isDark = theme === 'dark';
  const chrome = isDark
    ? 'bg-black/60 text-white border-white/25'
    : 'bg-white/75 text-gray-900 border-gray-300';

  // --------------------------------------------------------------- gestures
  /**
   * Turn per pixel, kept in a ref so a drag in progress reads the current
   * figure without the pointer handlers being rebuilt underneath it.
   */
  const lookRate = useRef(0.002);
  useEffect(() => {
    const measure = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const curvilinear = perspectiveMode !== 'linear';
      lookRate.current = lookRadiansPerPixel(curvilinear, fov, width, height);
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [fov, perspectiveMode]);

  const look = useRef<{ id: number; x: number; y: number } | null>(null);
  const stick = useRef<{ id: number; x: number; y: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const tapStarts = useRef(new Map<number, { x: number; y: number; at: number; cancelled: boolean }>());
  const sunPan = useRef<{ x: number; y: number; azimuth: number; elevation: number } | null>(null);
  const [stickView, setStickView] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);

  // One rule whether or not the sensor is driving: the near corner walks, the
  // rest of the glass looks. Handing the whole screen to the stick, as this
  // used to when the sensor was on, left no way to turn round without turning
  // round - which on a tablet on a desk is no way at all.
  const isStickZone = (x: number, y: number) =>
    x < window.innerWidth * 0.45 && y > window.innerHeight * 0.45;

  const applyStick = (originX: number, originY: number, x: number, y: number) => {
    let dx = x - originX;
    let dy = y - originY;
    const distance = Math.hypot(dx, dy);
    if (distance > STICK_RADIUS) {
      dx = (dx / distance) * STICK_RADIUS;
      dy = (dy / distance) * STICK_RADIUS;
    }
    setStickView({ x: originX, y: originY, dx, dy });

    // Direction from the thumb, speed from the curve above.
    const push = shapeStick(Math.min(1, distance / STICK_RADIUS));
    if (push === 0) {
      walkInput.strafe = 0;
      walkInput.forward = 0;
      return;
    }
    const length = Math.max(Math.hypot(dx, dy), 1e-5);
    walkInput.strafe = (dx / length) * push;
    walkInput.forward = (-dy / length) * push;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    tapStarts.current.set(e.pointerId, { x: e.clientX, y: e.clientY, at: performance.now(), cancelled: false });
    if (pointers.current.size > 1) {
      tapStarts.current.forEach((tap) => { tap.cancelled = true; });
    }
    // Lock freezes the camera, not the scene editor. Keep tracking a possible
    // selection tap, but do not start a walk/look gesture.
    if (viewLocked) return;
    // Capture keeps a thumb that slides off the layer still driving it, but it
    // throws for a pointer the browser no longer considers active - and an
    // exception here would take the whole gesture down with it.
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      /* not capturable; the window-level handlers still see the moves */
    }
    if (pointers.current.size === 3) {
      // Three fingers grab the light rather than the camera. Horizontal motion
      // circles the scene; vertical motion raises and lowers the sun.
      const points = [...pointers.current.values()];
      sunPan.current = {
        x: points.reduce((sum, point) => sum + point.x, 0) / 3,
        y: points.reduce((sum, point) => sum + point.y, 0) / 3,
        azimuth: sun.azimuth,
        elevation: sun.elevation,
      };
      stick.current = null;
      look.current = null;
      setStickView(null);
      walkInput.forward = 0;
      walkInput.strafe = 0;
    } else if (pointers.current.size < 3 && !stick.current && isStickZone(e.clientX, e.clientY)) {
      stick.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      applyStick(e.clientX, e.clientY, e.clientX, e.clientY);
    } else if (!look.current) {
      look.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const tap = tapStarts.current.get(e.pointerId);
    if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 9) tap.cancelled = true;
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (sunPan.current && pointers.current.size >= 3) {
      const points = [...pointers.current.values()].slice(0, 3);
      const x = points.reduce((sum, point) => sum + point.x, 0) / 3;
      const y = points.reduce((sum, point) => sum + point.y, 0) / 3;
      setSun({
        azimuth: (sunPan.current.azimuth + (x - sunPan.current.x) * 0.45 + 360) % 360,
        elevation: Math.max(4, Math.min(88, sunPan.current.elevation - (y - sunPan.current.y) * 0.3)),
      });
      return;
    }
    if (stick.current?.id === e.pointerId) {
      applyStick(stick.current.x, stick.current.y, e.clientX, e.clientY);
      return;
    }
    if (look.current?.id === e.pointerId) {
      const dx = e.clientX - look.current.x;
      const dy = e.clientY - look.current.y;
      look.current.x = e.clientX;
      look.current.y = e.clientY;

      const rate = lookRate.current;

      // With the sensor driving, the drag is an offset on top of it rather than
      // the heading itself; the sensor keeps reporting where the device points
      // either way.
      if (walkInput.useDeviceOrientation) {
        walkInput.lookYaw -= dx * rate;
        walkInput.lookPitch = Math.max(
          -MAX_PITCH,
          Math.min(MAX_PITCH, walkInput.lookPitch - dy * rate)
        );
      } else {
        walkInput.yaw -= dx * rate;
        walkInput.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, walkInput.pitch - dy * rate));
      }
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    const tap = tapStarts.current.get(e.pointerId);
    const wasSinglePointer = pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    tapStarts.current.delete(e.pointerId);
    if (tap && wasSinglePointer && !tap.cancelled && performance.now() - tap.at < 400) {
      window.dispatchEvent(new CustomEvent('perspective:scene-tap', {
        detail: { clientX: e.clientX, clientY: e.clientY },
      }));
    }
    if (sunPan.current) {
      if (pointers.current.size < 3) sunPan.current = null;
      return;
    }
    if (stick.current?.id === e.pointerId) {
      stick.current = null;
      setStickView(null);
      walkInput.forward = 0;
      walkInput.strafe = 0;
    }
    if (look.current?.id === e.pointerId) look.current = null;
  };

  const cancelPointer = (e: React.PointerEvent) => {
    const tap = tapStarts.current.get(e.pointerId);
    if (tap) tap.cancelled = true;
    endPointer(e);
  };

  // --------------------------------------------------------------- keyboard
  useEffect(() => {
    const keys = new Set<string>();
    const apply = () => {
      walkInput.forward = (keys.has('w') || keys.has('arrowup') ? 1 : 0) + (keys.has('s') || keys.has('arrowdown') ? -1 : 0);
      walkInput.strafe = (keys.has('d') || keys.has('arrowright') ? 1 : 0) + (keys.has('a') || keys.has('arrowleft') ? -1 : 0);
    };
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTools) { setShowTools(false); return; }
      const target = e.target as HTMLElement | null;
      if (target?.closest('button, input, textarea, select')) return;
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
  }, [showTools]);

  // ---------------------------------------------------------------- actions
  const cycleHeight = () => {
    const index = EYE_LEVEL_PRESETS.findIndex((p) => Math.abs(p.height - cameraHeight) < 0.001);
    const next = EYE_LEVEL_PRESETS[(index + 1) % EYE_LEVEL_PRESETS.length];
    setCameraHeight(next.height);
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
        onPointerCancel={cancelPointer}
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

      {/* Right-hand rail: kept under the holding thumb on iPhone and clear of
          the home-indicator edge in either orientation. */}
      <div className="fixed inset-y-0 right-0 z-40 safe-right safe-y pr-2 flex items-center pointer-events-none">
        <div className="flex flex-col items-center gap-2 pointer-events-auto">
          <button onClick={cycleHeight} className={`${button} tabular-nums`} aria-label="Eye height">
            {cameraHeight.toFixed(2)} m
          </button>

          <div className="w-24">
            <Scrub
              skin={{ dark: isDark, touch: false }}
              icon={I.cone}
              label="Field of view"
              reading={`${Math.round(fov)}°`}
              value={fov}
              min={25}
              max={360}
              step={1}
              cycle={[35, 60, 90, 160, 210, 240, 330]}
              onChange={setLens}
            />
          </div>

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

          <button onClick={onModels} aria-label="Add or edit models" className={iconButton}>
            <Icon path={I.figure} className="w-4 h-4" />
          </button>

          <button onClick={onAddCube} aria-label="Add cube" className={iconButton}>
            <Icon path={I.cube} className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowTools((open) => !open)}
            aria-label="Extra tools"
            aria-expanded={showTools}
            className={`${iconButton} ${showTools ? '!bg-sky-500 !text-white' : ''}`}
          >
            <Icon path={I.sliders} className="w-4 h-4" />
          </button>

          <button
            {...grayThemeControl}
            aria-label="Toggle theme; double tap for sun environment"
            aria-pressed={sunEnvironment}
            className={`${iconButton} touch-none ${sunEnvironment ? '!bg-sky-500 !text-white' : ''}`}
          >
            <Icon path={sunEnvironment ? I.sky : isDark ? I.light : I.dark} className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showTools && (
        <div
          className="fixed z-50 top-safe-panel bottom-safe-panel right-safe-rail w-[min(20rem,calc(100vw-5.5rem))] pointer-events-auto flex items-center"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerMove={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onPointerCancel={(event) => event.stopPropagation()}
        >
          <PracticePanel layout={layout === 'phone' ? 'tablet' : layout} onClose={() => setShowTools(false)} />
        </div>
      )}

    </>
  );
};
