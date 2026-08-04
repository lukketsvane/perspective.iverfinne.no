import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useStore, EYE_LEVEL_PRESETS } from '../store';
import { walkInput, enableDeviceOrientation } from '../lib/walkInput';
import { Icon, I } from './icons';
import { Scrub, useGrayThemeControl } from './controls';
import { MODEL_ACCEPT } from '../lib/loadModel';
import { exportScaledModel } from '../lib/exportModel';
import type { Layout } from '../lib/useLayout';
import type { PerspectiveMode } from '../types';

const PERSPECTIVE_ORDER: PerspectiveMode[] = ['linear', 'equidistant', 'stereographic', 'cylindrical', 'hyperbolic'];
const PERSPECTIVE_ICON: Record<PerspectiveMode, React.ReactNode> = {
  linear: I.straight,
  equidistant: I.curved,
  stereographic: I.stereographic,
  cylindrical: I.cylindrical,
  hyperbolic: I.hyperbolic,
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
  onAddCube: () => void;
  onImport?: (files: FileList) => void;
  onExportScene?: () => void;
  onImportScene?: (file: File) => void;
  busyId?: string | null;
  layout: Layout;
}> = ({ onModels, onAddCube, onImport, onExportScene, onImportScene, busyId, layout }) => {
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
  const matteModels = useStore((s) => s.matteModels);
  const toggleMatte = useStore((s) => s.toggleMatte);
  const models = useStore((s) => s.models);
  const deduplicateModels = useStore((s) => s.deduplicateModels);
  const selectedModelId = useStore((s) => s.selectedModelId);
  const [exporting, setExporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const sceneInputRef = useRef<HTMLInputElement>(null);
  const selectedModel = models.find((m) => m.id === selectedModelId);
  const hasDuplicates = models.length !== new Set(models.map((m) => m.fileUrl)).size;

  const setPerspectiveMode = useStore((s) => s.setPerspectiveMode);

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
  const pinch = useRef<{ startDist: number; startAngle: number; startScale: number; startRotY: number; centreX: number; centreY: number; startPos: [number, number, number] } | null>(null);
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
    showRail();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    tapStarts.current.set(e.pointerId, { x: e.clientX, y: e.clientY, at: performance.now(), cancelled: false });
    if (pointers.current.size > 1) {
      tapStarts.current.forEach((tap) => { tap.cancelled = true; });
    }
    // Lock freezes the camera, not the scene editor. Keep tracking a possible
    // selection tap, but do not start a walk/look gesture.
    if (viewLocked) return;
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      /* not capturable */
    }

    if (pointers.current.size === 2 && selectedModelId) {
      // Two-finger pinch: rotate and translate the selected model
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
      setStickView(null);
      walkInput.forward = 0;
      walkInput.strafe = 0;
    } else if (pointers.current.size === 3) {
      // Three fingers grab the light
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
      setStickView(null);
      walkInput.forward = 0;
      walkInput.strafe = 0;
    } else if (pointers.current.size < 2 && !stick.current && isStickZone(e.clientX, e.clientY)) {
      stick.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      applyStick(e.clientX, e.clientY, e.clientX, e.clientY);
    } else if (pointers.current.size < 2 && !look.current) {
      look.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const tap = tapStarts.current.get(e.pointerId);
    if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 9) tap.cancelled = true;
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Two-finger pinch: rotate + translate model
    if (pinch.current && pointers.current.size === 2 && selectedModelId) {
      const pts = [...pointers.current.values()];
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;

      // Rotation from angle change
      const deltaAngle = angle - pinch.current.startAngle;
      const newRotY = pinch.current.startRotY - deltaAngle;

      // Translation from centre movement (screen px → world metres, rough)
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

  // Auto-hide the rail after inactivity
  const showRail = useCallback(() => {
    setRailVisible(true);
    if (railTimer.current) clearTimeout(railTimer.current);
    railTimer.current = setTimeout(() => setRailVisible(false), 4000) as unknown as number;
  }, []);

  useEffect(() => {
    showRail();
    return () => { if (railTimer.current) clearTimeout(railTimer.current); };
  }, [showRail]);

  // AR mode: enable device orientation and use phone as real camera.
  // Does NOT reset position — you stay where you are, as if you had just
  // lifted the phone to look through it at the scene around you.
  const toggleArMode = useCallback(async () => {
    if (arMode) {
      setArMode(false);
    } else {
      // Try WebXR immersive-ar first (Apple Vision, Chrome on Android, etc.)
      if (navigator.xr) {
        try {
          const supported = await navigator.xr.isSessionSupported('immersive-ar');
          if (supported) {
            const session = await navigator.xr.requestSession('immersive-ar', {
              requiredFeatures: ['local-floor'],
              optionalFeatures: ['hit-test', 'dom-overlay'],
            });
            // Store session so Scene can use it via gl.xr
            (window as any).__xrSession = session;
            setArMode(true);
            session.addEventListener('end', () => {
              (window as any).__xrSession = null;
              setArMode(false);
            });
            return;
          }
        } catch { /* fall through to device orientation */ }
      }

      // Fallback: device orientation (iOS Safari, older devices)
      const granted = await enableDeviceOrientation();
      if (granted) {
        // Re-zero heading against the sensor without moving position
        walkInput.lookYaw = 0;
        walkInput.lookPitch = 0;
        setArMode(true);
      }
    }
  }, [arMode]);

  const exportSelected = async () => {
    if (!selectedModel?.object || exporting) return;
    setExporting(true);
    try {
      await exportScaledModel(selectedModel);
    } catch (error) {
      console.error('Failed to export model:', error);
    } finally {
      setExporting(false);
    }
  };

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

      {/* Right-hand rail – auto-hides after inactivity */}
      <div className={`fixed inset-y-0 right-0 z-40 safe-right safe-y pr-2 flex items-center pointer-events-none transition-opacity duration-300 ${railVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex flex-col items-center gap-2 pointer-events-auto">
          {/* AR mode: use phone as real camera */}
          <button
            onClick={toggleArMode}
            aria-label="AR camera mode"
            className={`${iconButton} ${arMode ? '!bg-green-500 !text-white !border-green-400' : ''}`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>

          {/* Camera height slider */}
          <div className="w-24">
            <Scrub
              skin={{ dark: isDark, touch: false }}
              icon={I.cone}
              label="Camera height"
              reading={`${cameraHeight.toFixed(2)} m`}
              value={cameraHeight}
              min={0.2}
              max={12}
              step={0.05}
              cycle={EYE_LEVEL_PRESETS.map((p) => p.height)}
              onChange={setCameraHeight}
            />
          </div>

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

          {/* Perspective mode cycle button */}
          <button
            onClick={() => {
              const idx = PERSPECTIVE_ORDER.indexOf(perspectiveMode);
              setPerspectiveMode(PERSPECTIVE_ORDER[(idx + 1) % PERSPECTIVE_ORDER.length]);
            }}
            aria-label={`Perspective: ${perspectiveMode}`}
            className={`${iconButton} ${perspectiveMode !== 'linear' ? '!bg-sky-500 !text-white !border-sky-400' : ''}`}
          >
            <Icon path={PERSPECTIVE_ICON[perspectiveMode]} className="w-4 h-4" />
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

          {/* Secondary buttons - only visible when tools expanded */}
          {showTools && (
            <>
              <button
                onClick={toggleMatte}
                aria-label="Matte white models"
                aria-pressed={matteModels}
                className={`${iconButton} ${matteModels ? '!bg-sky-500 !text-white' : ''}`}
              >
                <Icon path={I.matte} className="w-4 h-4" />
              </button>

              <button
                onClick={exportSelected}
                disabled={!selectedModel?.object || exporting || busyId !== null}
                aria-label="Export selected model"
                className={`${iconButton} disabled:opacity-30`}
              >
                <Icon path={I.save} className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
              </button>

              <button
                onClick={deduplicateModels}
                disabled={!hasDuplicates || busyId !== null}
                aria-label="Remove duplicate meshes"
                className={`${iconButton} disabled:opacity-30`}
              >
                <Icon path={I.dedup} className="w-4 h-4" />
              </button>

              <button
                onClick={() => importInputRef.current?.click()}
                disabled={busyId !== null}
                aria-label="Import models"
                className={`${iconButton} disabled:opacity-30`}
              >
                <Icon path={I.upload} className="w-4 h-4" />
              </button>

              <button
                onClick={onExportScene}
                disabled={models.length === 0 || busyId !== null}
                aria-label="Export scene as JSON"
                className={`${iconButton} disabled:opacity-30`}
              >
                <Icon path={I.sceneExport} className="w-4 h-4" />
              </button>

              <button
                onClick={() => sceneInputRef.current?.click()}
                disabled={busyId !== null}
                aria-label="Import scene from JSON"
                className={`${iconButton} disabled:opacity-30`}
              >
                <Icon path={I.sceneImport} className="w-4 h-4" />
              </button>
            </>
          )}

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

      {/* Hidden file inputs */}
      <input
        ref={importInputRef}
        type="file"
        multiple
        accept={MODEL_ACCEPT}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length && onImport) onImport(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={sceneInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && onImportScene) onImportScene(file);
          e.target.value = '';
        }}
      />

      {showTools && (
        <div
          className="fixed z-50 top-safe-panel bottom-safe-panel right-safe-rail w-[min(20rem,calc(100vw-5.5rem))] pointer-events-auto flex items-center"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerMove={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onPointerCancel={(event) => event.stopPropagation()}
        >
        </div>
      )}

    </>
  );
};
