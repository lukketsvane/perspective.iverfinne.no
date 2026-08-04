import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useStore, EYE_LEVEL_PRESETS } from '../store';
import { walkInput, enableDeviceOrientation } from '../lib/walkInput';
import { Icon, I } from './icons';
import { Scrub, useGrayThemeControl } from './controls';
import { MODEL_ACCEPT } from '../lib/loadModel';
import { captureFileName, captureView } from '../lib/capture';
import { ACTIVE, chrome, iconButton } from './ui';
import type { PerspectiveMode } from '../types';

const PERSPECTIVE_ORDER: PerspectiveMode[] = ['linear', 'equidistant', 'stereographic', 'cylindrical', 'hyperbolic', '5-point', '720-noneuclidean'];
const PERSPECTIVE_ICON: Record<PerspectiveMode, React.ReactNode> = {
  linear: I.straight,
  equidistant: I.curved,
  stereographic: I.stereographic,
  cylindrical: I.cylindrical,
  hyperbolic: I.hyperbolic,
  '5-point': I.curved,
  '720-noneuclidean': I.sevenTwenty,
};

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
  onScenes: () => void;
  onImport: (files: FileList) => void;
}> = ({ onModels, onScenes, onImport }) => {
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
  const [railVisible, setRailVisible] = useState(true);
  const [arMode, setArMode] = useState(false);
  const railTimer = useRef<number | undefined>(undefined);
  const modelMaterial = useStore((s) => s.modelMaterial);
  const cycleMaterial = useStore((s) => s.cycleMaterial);
  const models = useStore((s) => s.models);
  const deduplicateModels = useStore((s) => s.deduplicateModels);
  const undo = useStore((s) => s.undo);
  const canUndo = useStore((s) => s.undoStack.length > 0);
  const resetScene = useStore((s) => s.resetScene);
  const selectedModelId = useStore((s) => s.selectedModelId);
  const selectedId = useStore((s) => s.selectedId);
  const isSelected = selectedModelId !== null || selectedId !== null;
  const importInputRef = useRef<HTMLInputElement>(null);
  const hasDuplicates = models.length !== new Set(models.map((m) => m.fileUrl)).size;

  const setPerspectiveMode = useStore((s) => s.setPerspectiveMode);
  const showGuides = useStore((s) => s.showGuides);
  const toggleGuides = useStore((s) => s.toggleGuides);
  const showCone = useStore((s) => s.showCone);
  const toggleCone = useStore((s) => s.toggleCone);

  const isDark = theme === 'dark';
  const surface = chrome(isDark);

  // --------------------------------------------------------------- gestures
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
  const pinch = useRef<{ startDist: number; startAngle: number; startScale: number; startRotY: number; centreX: number; centreY: number; startPos: [number, number, number] } | null>(null);

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
    showRail();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    tapStarts.current.set(e.pointerId, { x: e.clientX, y: e.clientY, at: performance.now(), cancelled: false });
    if (pointers.current.size > 1) {
      tapStarts.current.forEach((tap) => { tap.cancelled = true; });
    }
    if (viewLocked) return;
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch { }

    if (pointers.current.size === 2 && selectedModelId) {
      const pts = [...pointers.current.values()];
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const model = models.find((m) => m.id === selectedModelId);
      pinch.current = {
        startDist: Math.hypot(dx, dy),
        startAngle: Math.atan2(dy, dx),
        startScale: model?.scale ?? 1,
        startRotY: model?.rotationY ?? 0,
        centreX: (pts[0].x + pts[1].x) / 2,
        centreY: (pts[0].y + pts[1].y) / 2,
        startPos: model?.position ? [...model.position] : [0, 0, 0],
      };
      stick.current = null;
      look.current = null;
      walkInput.forward = 0;
      walkInput.strafe = 0;
    } else if (pointers.current.size === 3) {
      const points = [...pointers.current.values()];
      sunPan.current = {
        x: points.reduce((sum, point) => sum + point.x, 0) / 3,
        y: points.reduce((sum, point) => sum + point.y, 0) / 3,
        azimuth: sun.azimuth,
        elevation: sun.elevation,
      };
      pinch.current = null;
      stick.current = null;
      look.current = null;
      walkInput.forward = 0;
      walkInput.strafe = 0;
    } else if (!stick.current && isStickZone(e.clientX, e.clientY)) {
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

    if (pinch.current && pointers.current.size === 2 && selectedModelId) {
      const pts = [...pointers.current.values()];
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const angle = Math.atan2(dy, dx);
      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;

      const deltaAngle = angle - pinch.current.startAngle;
      const newRotY = pinch.current.startRotY - deltaAngle;

      const moveFactor = 0.01;
      const moveX = (cx - pinch.current.centreX) * moveFactor;
      const moveZ = (cy - pinch.current.centreY) * moveFactor;

      const updateModel = useStore.getState().updateModel;
      updateModel(selectedModelId, {
        rotationY: newRotY,
        position: [
          pinch.current.startPos[0] + moveX,
          pinch.current.startPos[1],
          pinch.current.startPos[2] + moveZ,
        ],
      });
      return;
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
    if (pinch.current) {
      if (pointers.current.size < 2) pinch.current = null;
      return;
    }
    if (sunPan.current) {
      if (pointers.current.size < 3) sunPan.current = null;
      return;
    }
    if (stick.current?.id === e.pointerId) {
      stick.current = null;
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

  useEffect(() => {
    const keys = new Set<string>();
    const apply = () => {
      walkInput.forward = (keys.has('w') || keys.has('arrowup') ? 1 : 0) + (keys.has('s') || keys.has('arrowdown') ? -1 : 0);
      walkInput.strafe = (keys.has('d') || keys.has('arrowright') ? 1 : 0) + (keys.has('a') || keys.has('arrowleft') ? -1 : 0);
    };
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTools) { setShowTools(false); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }
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
  }, [showTools, undo]);

  const showRail = useCallback(() => {
    setRailVisible(true);
    if (railTimer.current) clearTimeout(railTimer.current);
    railTimer.current = setTimeout(() => setRailVisible(false), 6000) as unknown as number;
  }, []);

  useEffect(() => {
    showRail();
    return () => { if (railTimer.current) clearTimeout(railTimer.current); };
  }, [showRail]);

  const toggleArMode = useCallback(async () => {
    if (arMode) {
      setArMode(false);
    } else {
      if (navigator.xr) {
        try {
          const supported = await navigator.xr.isSessionSupported('immersive-ar');
          if (supported) {
            const session = await navigator.xr.requestSession('immersive-ar', {
              requiredFeatures: ['local-floor'],
              optionalFeatures: ['hit-test', 'dom-overlay'],
            });
            (window as any).__xrSession = session;
            setArMode(true);
            session.addEventListener('end', () => {
              (window as any).__xrSession = null;
              setArMode(false);
            });
            return;
          }
        } catch { }
      }
      const granted = await enableDeviceOrientation();
      if (granted) {
        walkInput.lookYaw = 0;
        walkInput.lookPitch = 0;
        setArMode(true);
      }
    }
  }, [arMode]);

  const button = iconButton(isDark);
  const dockVisible = railVisible && !isSelected;

  return (
    <>
      <div
        className="fixed inset-0 z-30 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={cancelPointer}
      />

      {showTools && (
        <div
          className="fixed inset-0 z-[39]"
          onPointerDown={() => setShowTools(false)}
        />
      )}

      {/*
        * The dock.
        *
        * It fades out while you are drawing, and again whenever something is
        * selected - the selection bar takes the same spot. Faded, it must also
        * stop taking taps: it is wider than the selection bar, so its ends went
        * on catching thumbs aimed at nothing, from a control nobody could see.
        */}
      <div
        // Working the dock keeps the dock up: the fade is a six second idle
        // timer, and it used to be reset only by touching the scene.
        onPointerDown={showRail}
        className={`fixed bottom-safe-panel left-0 right-0 z-40 flex flex-col items-center gap-3 px-3 pointer-events-none transition-opacity duration-[1500ms] ease-in-out ${dockVisible ? 'opacity-100' : 'opacity-0'}`}
      >

        {/* Secondary tools. Wrapping, because ten 44 px targets do not fit
            across a phone in one line and a scroller here would be a trap. */}
        <div className={`flex flex-wrap justify-center max-w-[22rem] gap-1 p-1.5 rounded-[1.75rem] border backdrop-blur-xl shadow-2xl transition-all duration-300 transform origin-bottom ${showTools && dockVisible ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'} ${surface}`}>
          <button onClick={toggleArMode} aria-label="AR camera mode" className={`${button} ${arMode ? '!text-green-500' : ''}`}>
             <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /><circle cx="12" cy="12" r="3" /></svg>
          </button>
          <button onClick={toggleGuides} aria-label="Horizon and grid" className={`${button} ${showGuides ? ACTIVE : ''}`}>
            <Icon path={I.horizon} className="w-5 h-5" />
          </button>
          <button onClick={toggleCone} aria-label="Cone of vision" className={`${button} ${showCone ? ACTIVE : ''}`}>
            <Icon path={I.cone} className="w-5 h-5" />
          </button>
          <button onClick={toggleViewLock} aria-label="Lock view" className={`${button} ${viewLocked ? '!text-amber-400' : ''}`}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="10.5" width="16" height="10" rx="2" />
              {viewLocked ? <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /> : <path d="M8 10.5V7a4 4 0 0 1 7.5-2" />}
            </svg>
          </button>
          <button onClick={cycleMaterial} aria-label="Model material" className={`${button} ${modelMaterial !== 'original' ? ACTIVE : ''}`}>
            <Icon path={I.matte} className="w-5 h-5" />
          </button>
          <button onClick={() => importInputRef.current?.click()} aria-label="Import mesh" className={button}>
            <Icon path={I.upload} className="w-5 h-5" />
          </button>
          <button onClick={deduplicateModels} aria-label="Remove duplicate meshes" className={`${button} ${!hasDuplicates ? 'opacity-30' : ''}`}>
            <Icon path={I.dedup} className="w-5 h-5" />
          </button>
          <button onClick={undo} aria-label="Undo" className={`${button} ${canUndo ? '' : 'opacity-30'}`}>
            <Icon path={I.undo} className="w-5 h-5" />
          </button>
          <button onClick={resetScene} aria-label="Clear the scene" className={button}>
            <Icon path={I.reset} className="w-5 h-5" />
          </button>
          <button
            onClick={() => captureView(captureFileName(cameraHeight, fov))}
            aria-label="Save the view as a picture"
            className={button}
          >
            <Icon path={I.camera} className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Dock */}
        <div className={`flex items-center p-1.5 gap-1 rounded-full border backdrop-blur-2xl shadow-2xl ${dockVisible ? 'pointer-events-auto' : 'pointer-events-none'} ${surface}`}>
          <button onClick={onModels} aria-label="Add model" className={button}>
            <Icon path={I.cube} className="w-5 h-5" />
          </button>
          <button onClick={onScenes} aria-label="Scenes" className={button}>
            <Icon path={I.scenes} className="w-5 h-5" />
          </button>
          <Scrub
            skin={{ dark: isDark, touch: true }}
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
          <Scrub
            skin={{ dark: isDark, touch: true }}
            icon={I.horizon}
            label="Camera height"
            reading={`${cameraHeight.toFixed(2)}m`}
            value={cameraHeight}
            min={0.2}
            max={12}
            step={0.05}
            cycle={EYE_LEVEL_PRESETS.map((p) => p.height)}
            onChange={setCameraHeight}
          />
          <button
            onClick={() => {
              const idx = PERSPECTIVE_ORDER.indexOf(perspectiveMode);
              setPerspectiveMode(PERSPECTIVE_ORDER[(idx + 1) % PERSPECTIVE_ORDER.length]);
            }}
            aria-label="Perspective"
            className={`${button} ${perspectiveMode !== 'linear' ? ACTIVE : ''}`}
          >
            <Icon path={PERSPECTIVE_ICON[perspectiveMode]} className="w-5 h-5" />
          </button>
          <button
            {...grayThemeControl}
            aria-label="Theme"
            className={`${button} touch-none ${sunEnvironment ? ACTIVE : ''}`}
          >
            <Icon path={sunEnvironment ? I.sky : isDark ? I.dark : I.light} className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowTools((open) => !open)}
            aria-label="Tools"
            className={`${button} ${showTools ? 'bg-black/10 dark:bg-white/10' : ''}`}
          >
            <Icon path={I.sliders} className="w-5 h-5" />
          </button>
        </div>
      </div>

      <input
        ref={importInputRef}
        type="file"
        multiple
        accept={MODEL_ACCEPT}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onImport(e.target.files);
          e.target.value = '';
        }}
      />
    </>
  );
};
