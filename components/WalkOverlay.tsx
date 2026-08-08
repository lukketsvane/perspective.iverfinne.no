import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useStore, EYE_LEVEL_PRESETS } from '../store';
import { walkInput } from '../lib/walkInput';
import { holdRail, showRail, useRail } from '../lib/rail';
import { SelectionBar } from './SelectionBar';
import { Icon, I, SURFACE_ICON } from './icons';
import { Scrub, useGrayThemeControl, useRoomControl } from './controls';
import { captureFileName, captureView } from '../lib/capture';
import { whileWorking } from '../lib/activity';
import { ACTIVE, chrome, iconButton } from './ui';
import { pickObject } from '../lib/pick';
import { grabAt, hoverAt, pinchOn, type Grab, type Pinch } from '../lib/manipulate';
import { wholeSheetField } from '../lib/projection';
import { SNAP_STEPS, type GuideLevel, type PerspectiveMode } from '../types';

/**
 * The systems the button steps through: bowed horizontals, then the ruled
 * sphere, then the whole hemisphere of it.
 *
 * Straight-line perspective is not among them any more. It is honest inside the
 * cone of vision and nowhere else, and this is a tool whose whole subject is the
 * wide field - so widening the lens in it did not open the view out, it smeared
 * the edges of the frame into something no drawing could be made from. The
 * curvilinear systems answer the same question at forty degrees as they do at
 * three hundred, and at forty they *are* the flat one to within the width of a
 * pencil line.
 *
 * The mode itself stays: a session standing in the real room is drawn through
 * the phone's own rectilinear lens, and bending that would be drawing a
 * perspective over a perspective.
 */
const PROJECTION_ORDER: PerspectiveMode[] = ['cylindrical', 'equidistant', 'stereographic'];
const PROJECTION_ICON: Record<PerspectiveMode, React.ReactNode> = {
  cylindrical: I.cylindrical,
  equidistant: I.curved,
  stereographic: I.stereographic,
};

const GUIDE_ICON: Record<GuideLevel, React.ReactNode> = {
  0: I.guides0,
  1: I.guides1,
  2: I.guides2,
};

/** In the order of SNAP_STEPS: free, 5 cm, 25 cm, 1 m. */
const SNAP_ICON: React.ReactNode[] = [I.snapFree, I.snapFine, I.snapMedium, I.snapCoarse];


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
const lookRadiansPerPixel = (fovDegrees: number, width: number, height: number) => {
  // Every system on offer states its field as the angle across the frame, so
  // the sum is the same for all of them: how much world one pixel is worth.
  const horizontal = ((fovDegrees * Math.PI) / 180) * (width / Math.max(width, height, 1));
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
 * What a mouse becomes over each part of the scene.
 *
 * A phone has nothing to show this with and does not need it. A desktop does:
 * there is otherwise nothing to say that the dot on a face is a handle and the
 * rest of the box is not, and a tool where you have to discover that by trying
 * is a tool where you discover it by resizing something you meant to move.
 */
const CURSOR: Record<string, string> = {
  none: 'default',
  select: 'pointer',
  move: 'grab',
  size: 'crosshair',
};

/** How far the mouse has to travel before the scene is asked about it again. */
const HOVER_SLOP = 10;

/**
 * How long a finger may rest before lifting it stops counting as a tap.
 *
 * Nothing in the tool answers a long press, so the only thing this has to be is
 * generous: what separates a tap from a look is that a tap did not move, and a
 * deliberate one aimed at a chair across the room takes its time.
 */
const TAP_MS = 700;

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
  onLights: () => void;
  /** True while a sheet is up: the dock belongs under it, not beside it. */
  covered?: boolean;
}> = ({ onModels, onScenes, onLights, covered = false }) => {
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
  const backgroundGray = useStore((s) => s.backgroundGray);
  const toggleSunEnvironment = useStore((s) => s.toggleSunEnvironment);
  const grayThemeControl = useGrayThemeControl(toggleSunEnvironment);
  const [showTools, setShowTools] = useState(false);
  const railVisible = useRail();
  const sceneSurface = useStore((s) => s.surface);
  const cycleSurface = useStore((s) => s.cycleSurface);
  const roomLevel = useStore((s) => s.roomLevel);
  const room = useStore((s) => s.room);
  const roomControl = useRoomControl();
  const models = useStore((s) => s.models);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.undoStack.length > 0);
  const canRedo = useStore((s) => s.redoStack.length > 0);
  const selectedModelId = useStore((s) => s.selectedModelId);
  const selectedId = useStore((s) => s.selectedId);
  const isSelected = selectedModelId !== null || selectedId !== null;

  const setPerspectiveMode = useStore((s) => s.setPerspectiveMode);
  const guides = useStore((s) => s.guides);
  const cycleGuides = useStore((s) => s.cycleGuides);
  const gridX = useStore((s) => s.gridX);
  const gridZ = useStore((s) => s.gridZ);
  const toggleGridX = useStore((s) => s.toggleGridX);
  const toggleGridZ = useStore((s) => s.toggleGridZ);
  const snapStep = useStore((s) => s.snapStep);
  const cycleSnap = useStore((s) => s.cycleSnap);
  const showConstruction = useStore((s) => s.showConstruction);
  const toggleConstruction = useStore((s) => s.toggleConstruction);
  const showVanishing = useStore((s) => s.showVanishing);
  const toggleVanishing = useStore((s) => s.toggleVanishing);

  const isDark = theme === 'dark';
  const surface = chrome(isDark);

  /**
   * The field that brings the whole sheet inside the frame.
   *
   * It depends on the shape of the window and on nothing else, so it is
   * measured rather than chosen - and re-measured when the window changes,
   * since a phone turned on its side needs a different number.
   */
  const [wholeSheet, setWholeSheet] = useState(() =>
    typeof window === 'undefined' ? 540 : wholeSheetField(window.innerWidth, window.innerHeight)
  );

  // --------------------------------------------------------------- gestures
  const lookRate = useRef(0.002);
  useEffect(() => {
    const measure = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      lookRate.current = lookRadiansPerPixel(fov, width, height);
      setWholeSheet(wholeSheetField(width, height));
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
  /** One finger on the selection: slide it, lift it, or push a face of it. */
  const held = useRef<{ id: number; grab: Grab } | null>(null);
  /** Two fingers on it: turn, size and slide at once. */
  const pinch = useRef<Pinch | null>(null);
  const [cursor, setCursor] = useState('default');
  const hovered = useRef({ x: 0, y: 0 });

  const isStickZone = (x: number, y: number) =>
    x < window.innerWidth * 0.45 && y > window.innerHeight * 0.45;

  /** Let go of whatever one finger had hold of. */
  const release = () => {
    if (!held.current) return;
    held.current.grab.end();
    held.current = null;
    setCursor('default');
  };

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

  const stopWalking = () => {
    stick.current = null;
    look.current = null;
    walkInput.forward = 0;
    walkInput.strafe = 0;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // Whether this touch is the one that brought the chrome back. A tap on
    // nothing is normally a decision to put the selection down - but not when
    // the only reason for the tap was that the bar holding that selection had
    // faded out from under it. See `endPointer`.
    woke.current = !railVisible;
    showRail();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // The event's own clock, not the handler's. A tap that lands while the
    // panorama is redrawing its six faces can wait a quarter of a second to be
    // read, and timing it from in here counted that against the tap: a wide
    // curvilinear frame is exactly where taps went missing.
    tapStarts.current.set(e.pointerId, { x: e.clientX, y: e.clientY, at: e.timeStamp || performance.now(), cancelled: false });
    if (pointers.current.size > 1) {
      tapStarts.current.forEach((tap) => { tap.cancelled = true; });
    }
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch { }

    if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      // Two fingers do nothing at all unless something is selected for them to
      // work on - otherwise a second thumb landing while walking would grab.
      pinch.current = pinchOn(first.x, first.y, second.x, second.y);
      if (pinch.current) {
        release();
        stopWalking();
        return;
      }
    }

    if (pointers.current.size === 3) {
      const points = [...pointers.current.values()];
      sunPan.current = {
        x: points.reduce((sum, point) => sum + point.x, 0) / 3,
        y: points.reduce((sum, point) => sum + point.y, 0) / 3,
        azimuth: sun.azimuth,
        elevation: sun.elevation,
      };
      pinch.current = null;
      release();
      stopWalking();
      return;
    }

    if (pointers.current.size === 1) {
      /*
       * Taking hold of the selection.
       *
       * This comes before walking and before looking, and it is the only thing
       * that does: it can only happen when the finger lands on the thing already
       * selected, which is a deliberate act, while a step or a look can start
       * anywhere else on the glass. It works with the view locked, too - the
       * whole point of locking is to arrange a composition without the framing
       * moving under it.
       */
      const grab = grabAt(e.clientX, e.clientY);
      if (grab) {
        held.current = { id: e.pointerId, grab };
        if (e.pointerType === 'mouse') setCursor('grabbing');
        stopWalking();
        return;
      }
    }

    if (viewLocked) return;

    if (!stick.current && isStickZone(e.clientX, e.clientY)) {
      stick.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      applyStick(e.clientX, e.clientY, e.clientX, e.clientY);
    } else if (!look.current) {
      look.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  };

  /** Say what the arrow is over, on a machine that has an arrow. */
  /**
   * What the cursor should be, at most once a frame.
   *
   * Working out what is under the pointer is a raycast over the whole scene on
   * the main thread - measured at 34 ms with one of the studies standing, and
   * it was fired every five pixels of travel, so crossing the window cost forty
   * of them. Coalescing to one per animation frame caps it at one however fast
   * the mouse moves, and asks about where the pointer ENDED rather than where
   * it was when the frame was booked.
   */
  const hoverPending = useRef(0);
  const trackHover = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.buttons !== 0) return;
    if (Math.hypot(e.clientX - hovered.current.x, e.clientY - hovered.current.y) < HOVER_SLOP) return;
    hovered.current = { x: e.clientX, y: e.clientY };
    if (hoverPending.current) return;
    hoverPending.current = requestAnimationFrame(() => {
      hoverPending.current = 0;
      const { x, y } = hovered.current;
      setCursor(CURSOR[hoverAt(x, y)] ?? 'default');
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const tap = tapStarts.current.get(e.pointerId);
    if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 9) tap.cancelled = true;
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    } else {
      trackHover(e);
      return;
    }

    if (pinch.current && pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      pinch.current.move(first.x, first.y, second.x, second.y);
      return;
    }

    if (held.current?.id === e.pointerId) {
      held.current.grab.move(e.clientX, e.clientY, e.shiftKey);
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

  /**
   * A tap on the scene, which is how anything is chosen.
   *
   * The walk layer covers the canvas, so this is the only route into selection:
   * the same projection-correct ray the drags use, and a tap that meets nothing
   * clears what was selected.
   */
  const woke = useRef(false);

  const tapScene = (clientX: number, clientY: number) => {
    const hit = pickObject(clientX, clientY);
    const { selectBox, selectModel } = useStore.getState();
    // A touch whose only job was to wake the chrome may still pick something
    // up; it may not put anything down. Otherwise the workflow the tool is for
    // - place it, look at it for a while, then adjust it - was self-defeating:
    // the looking is what made the bar fade, and the tap to bring it back was
    // read as "nothing here", so the thing you wanted to adjust was deselected
    // by the very gesture that went looking for its controls.
    if (!hit) {
      if (!woke.current) selectBox(null);
    } else if (hit.type === 'box') selectBox(hit.id);
    else selectModel(hit.id);
    woke.current = false;
  };

  const endPointer = (e: React.PointerEvent) => {
    const tap = tapStarts.current.get(e.pointerId);
    const wasSinglePointer = pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    tapStarts.current.delete(e.pointerId);

    if (held.current?.id === e.pointerId) release();

    if (tap && wasSinglePointer && !tap.cancelled && (e.timeStamp || performance.now()) - tap.at < TAP_MS) {
      tapScene(e.clientX, e.clientY);
    }
    if (pinch.current) {
      if (pointers.current.size < 2) {
        pinch.current.end();
        pinch.current = null;
      }
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

  /**
   * The finger that was never let go of.
   *
   * Pointer capture is asked for and not always granted, so a press that starts
   * on the scene and ends somewhere else - over the dock, off the edge of the
   * window, taken away by a system gesture - can have its release delivered to
   * something other than this layer. The entry then stays in the table for good,
   * and from that moment every later press is read as a second finger: the
   * second of two never taps, so nothing can be selected again for the rest of
   * the session.
   *
   * This runs after the layer's own handler - window, bubbling - so it only
   * ever sees the ones that got away.
   */
  useEffect(() => {
    const forget = (event: PointerEvent) => {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.delete(event.pointerId);
      tapStarts.current.delete(event.pointerId);
      if (held.current?.id === event.pointerId) release();
      if (stick.current?.id === event.pointerId) {
        stick.current = null;
        walkInput.forward = 0;
        walkInput.strafe = 0;
      }
      if (look.current?.id === event.pointerId) look.current = null;
      if (pointers.current.size < 2 && pinch.current) {
        pinch.current.end();
        pinch.current = null;
      }
      if (pointers.current.size < 3) sunPan.current = null;
    };
    window.addEventListener('pointerup', forget);
    window.addEventListener('pointercancel', forget);
    return () => {
      window.removeEventListener('pointerup', forget);
      window.removeEventListener('pointercancel', forget);
    };
  }, []);

  /**
   * The keyboard, for the half of the sessions that happen at a desk.
   *
   * Nothing here is written anywhere, in keeping with the rest: they are the
   * keys anyone would try. WASD and the arrows walk, escape backs out of
   * whatever is up, delete removes the selection, and the undo pair is the one
   * every application has had for forty years.
   *
   * The held keys are dropped whenever the window loses focus or the tab goes
   * away. Without that, tabbing out mid-stride means the keyup never arrives and
   * the walker is still walking when you come back - which is the oldest bug in
   * first-person controls and the most disorienting.
   */
  useEffect(() => {
    const keys = new Set<string>();
    const apply = () => {
      walkInput.forward = (keys.has('w') || keys.has('arrowup') ? 1 : 0) + (keys.has('s') || keys.has('arrowdown') ? -1 : 0);
      walkInput.strafe = (keys.has('d') || keys.has('arrowright') ? 1 : 0) + (keys.has('a') || keys.has('arrowleft') ? -1 : 0);
    };
    const drop = () => { keys.clear(); apply(); };

    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Typing into something is typing into something, whatever the key is.
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      const command = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (command && (key === 'z' || key === 'y')) {
        e.preventDefault();
        if (key === 'y' || e.shiftKey) redo();
        else undo();
        return;
      }

      if (e.key === 'Escape') {
        // A sheet closes itself on escape; backing out of one is not also a
        // reason to drop what was selected before it was opened.
        if (showTools) setShowTools(false);
        else if (!covered) useStore.getState().selectBox(null);
        return;
      }

      // Not through an open sheet. Backspace is also the reflex "go back"
      // key, and it was deleting the selection behind a library nobody could
      // see past - silently, with the sheet still up.
      if (!covered && (key === 'delete' || key === 'backspace')) {
        const state = useStore.getState();
        if (!state.selectedId && !state.selectedModelId) return;
        e.preventDefault();
        if (state.selectedModelId) state.removeModel(state.selectedModelId);
        else if (state.selectedId) state.removeBox(state.selectedId);
        return;
      }

      /*
       * Turning, from a desk.
       *
       * Two fingers on the thing itself is the gesture, and a mouse has one -
       * so on a laptop nothing in the scene could be turned at all, and the
       * lesson the selection's own vanishing points exist to teach (square to
       * the grid the pair is the scene's; turned off it the pair moves) was
       * unreachable on the machine most people would open this on.
       *
       * Fifteen degrees a press, which is the step a two-point setup is built
       * out of; shift for one, for settling. Held down it repeats, so the undo
       * step is taken once at the start of the run rather than thirty times
       * through it.
       */
      if (key === '[' || key === ']') {
        e.preventDefault();
        const step = ((e.shiftKey ? 1 : 15) * Math.PI) / 180 * (key === ']' ? 1 : -1);
        const state = useStore.getState();
        if (!e.repeat) state.beginChange();
        if (state.selectedModelId) {
          const mesh = state.models.find((m) => m.id === state.selectedModelId);
          if (mesh) state.updateModel(mesh.id, { rotationY: mesh.rotationY + step });
        } else if (state.selectedId) {
          const box = state.boxes.find((b) => b.id === state.selectedId);
          if (box) {
            state.updateBox(box.id, {
              rotation: [box.rotation[0], box.rotation[1] + step, box.rotation[2]],
            });
          }
        }
        return;
      }

      // A shortcut is not a step: holding command and pressing D should not
      // leave the walker strafing once the shortcut has been handled.
      if (command || e.altKey) return;
      // Nor is walking, under an open sheet. The sheet swallows pointers and
      // not keys, so holding W while reading the library walked you out of the
      // room you were choosing a chair for.
      if (covered) return;

      keys.add(key);
      apply();
    };

    const up = (e: KeyboardEvent) => { keys.delete(e.key.toLowerCase()); apply(); };
    // A sheet opening mid-stride must not leave the walker running.
    if (covered) drop();
    const hidden = () => { if (document.hidden) drop(); };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', drop);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', drop);
      document.removeEventListener('visibilitychange', hidden);
      walkInput.forward = 0;
      walkInput.strafe = 0;
    };
  }, [showTools, undo, redo, covered]);

  // Opening the second row is a statement that the chrome is wanted. It used to
  // fade out from under an open panel six seconds later, leaving twelve
  // controls on screen that could be seen through and not pressed. Closing the
  // row starts the idle count again.
  useEffect(() => {
    if (showTools) holdRail();
    else showRail();
  }, [showTools]);


  const button = iconButton(isDark);
  /*
   * The dock stays up when something is selected.
   *
   * It used to hide - and three of the controls it hides do nothing EXCEPT
   * when something is selected: the cage, the selection's own vanishing
   * points, and the export that would carry them into a picture. So the tool's
   * best feature was reachable only by a deselect-reselect dance nobody would
   * discover. Worse, the panel went pointer-events-none instantly while fading
   * over a second and a half, so for that whole time there was a fully visible
   * dock in which every button was dead - and the dead tap fell through to the
   * gesture layer and was read as a tap on nothing, so pressing "save the
   * picture" gave you no picture AND cost you the arrangement.
   *
   * The selection bar stacks above it instead of replacing it. Seventy pixels
   * of an 844-pixel frame, and only while something is selected; the tools row
   * already takes a hundred and six in the same column.
   */
  const dockVisible = railVisible && !covered;

  return (
    <>
      <div
        className="fixed inset-0 z-30 touch-none"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={cancelPointer}
        onPointerLeave={() => setCursor('default')}
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
        <div
          /* Out of the tab order while it is out of sight - what
             pointer-events-none already does for the pointer. A keyboard
             user's very first Tab landed in the collapsed row, and Enter there
             changed the construction guides with nothing on screen moving. */
          {...(showTools && dockVisible ? {} : { inert: '' })}
          className={`flex flex-wrap justify-center max-w-[22rem] gap-1 p-1.5 rounded-[1.75rem] border shadow-2xl transition-all duration-300 transform origin-bottom ${showTools && dockVisible ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'} ${surface}`}
        >
          <button
            onClick={cycleGuides}
            aria-label={`Construction guides, level ${guides} of 2`}
            aria-pressed={guides > 0}
            className={`${button} ${guides ? ACTIVE : ''}`}
          >
            <Icon path={GUIDE_ICON[guides]} className="w-5 h-5" />
          </button>
          {/* The floor's two rulings, one switch each. */}
          <button
            onClick={toggleGridZ}
            aria-label="Floor lines running away"
            aria-pressed={gridZ}
            className={`${button} ${gridZ ? ACTIVE : ''}`}
          >
            <Icon path={I.gridAway} className="w-5 h-5" />
          </button>
          <button
            onClick={toggleGridX}
            aria-label="Floor lines running across"
            aria-pressed={gridX}
            className={`${button} ${gridX ? ACTIVE : ''}`}
          >
            <Icon path={I.gridAcross} className="w-5 h-5" />
          </button>
          <button
            onClick={cycleSnap}
            aria-label={snapStep ? `Snap to ${snapStep} m` : 'Snap off'}
            aria-pressed={snapStep > 0}
            className={`${button} ${snapStep ? ACTIVE : ''}`}
          >
            <Icon path={SNAP_ICON[SNAP_STEPS.indexOf(snapStep as (typeof SNAP_STEPS)[number])] ?? I.snapFree} className="w-5 h-5" />
          </button>
          <button
            onClick={toggleConstruction}
            aria-label="Construction around each object"
            aria-pressed={showConstruction}
            className={`${button} ${showConstruction ? ACTIVE : ''}`}
          >
            <Icon path={I.cage} className="w-5 h-5" />
          </button>
          <button
            onClick={toggleVanishing}
            aria-label="The selection's own vanishing points"
            aria-pressed={showVanishing}
            className={`${button} ${showVanishing ? ACTIVE : ''}`}
          >
            <Icon path={I.vanishing} className="w-5 h-5" />
          </button>
          <button onClick={toggleViewLock} aria-label="Lock view" aria-pressed={viewLocked} className={`${button} ${viewLocked ? '!text-amber-400' : ''}`}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="10.5" width="16" height="10" rx="2" />
              {viewLocked ? <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /> : <path d="M8 10.5V7a4 4 0 0 1 7.5-2" />}
            </svg>
          </button>
          <div className="relative flex items-center">
            <button
              {...roomControl.handlers}
              aria-label={`Room, ${room.width.toFixed(1)} by ${room.depth.toFixed(1)} metres`}
              aria-pressed={roomLevel > 0}
              className={`${button} touch-none ${roomLevel > 0 ? ACTIVE : ''}`}
            >
              <Icon path={roomLevel === 2 ? I.roomWalls : I.room} className="w-5 h-5" />
            </button>
            {roomControl.sizing && (
              <div
                className={`absolute left-1/2 -translate-x-1/2 -top-11 px-3 py-1 rounded-full text-xs font-bold tabular-nums border shadow-xl pointer-events-none whitespace-nowrap ${
                  isDark ? 'bg-neutral-950/95 text-white border-white/20' : 'bg-white/95 text-black border-black/10'
                }`}
              >
                {room.width.toFixed(1)} × {room.depth.toFixed(1)}
              </div>
            )}
          </div>
          <button
            onClick={cycleSurface}
            aria-label={`Surface of everything: ${sceneSurface}`}
            className={`${button} ${sceneSurface !== 'original' ? ACTIVE : ''}`}
          >
            <Icon path={SURFACE_ICON[sceneSurface]} className="w-5 h-5" />
          </button>
          <button onClick={() => { setShowTools(false); onLights(); }} aria-label="Lights" className={button}>
            <Icon path={I.strength} className="w-5 h-5" />
          </button>
          <button onClick={undo} aria-label="Undo" className={`${button} ${canUndo ? '' : 'opacity-30'}`}>
            <Icon path={I.undo} className="w-5 h-5" />
          </button>
          <button onClick={redo} aria-label="Redo" className={`${button} ${canRedo ? '' : 'opacity-30'}`}>
            <Icon path={I.redo} className="w-5 h-5" />
          </button>
          <button
            onClick={() => whileWorking(() => captureView(captureFileName(cameraHeight, fov, perspectiveMode)))}
            aria-label="Save the view as a picture"
            className={button}
          >
            <Icon path={I.camera} className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Dock */}
        {/* What you can do to the thing you are holding, above what you can do
            to the view. */}
        <SelectionBar raised={covered} />

        <div
          {...(dockVisible ? {} : { inert: '' })}
          // Tighter on a small phone, for the same reason the controls in it
          // are - seven of them plus the glass around them is more than 320 px
          // of screen has, and the two on the ends were the ones paying.
          className={`flex items-center p-1.5 gap-1 max-[359px]:p-1 max-[359px]:gap-0.5 rounded-full border shadow-2xl ${dockVisible ? 'pointer-events-auto' : 'pointer-events-none'} ${surface}`}
        >
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
            max={wholeSheet}
            step={1}
            // Twice the sweep, because the range is now twice what it was and
            // everything anyone does is still down at the narrow end.
            sweep={440}
            // The fields worth landing on exactly: a long lens, the 60 degree
            // cone, a wide flat frame, the hemisphere, the full sphere - and
            // the whole sphere drawn small enough to see all the way round it,
            // which is a different number in every window.
            cycle={[35, 60, 90, 120, 180, 270, 360, wholeSheet]}
            onChange={setLens}
          />
          <Scrub
            skin={{ dark: isDark, touch: true }}
            icon={I.horizon}
            label="Camera height"
            reading={cameraHeight.toFixed(2)}
            value={cameraHeight}
            min={0.2}
            max={12}
            step={0.01}
            cycle={EYE_LEVEL_PRESETS.map((p) => p.height)}
            onChange={setCameraHeight}
          />
          <button
            onClick={() => {
              const at = PROJECTION_ORDER.indexOf(perspectiveMode);
              setPerspectiveMode(PROJECTION_ORDER[(at + 1) % PROJECTION_ORDER.length]);
            }}
            aria-label={`Projection: ${perspectiveMode}`}
            className={`${button} ${ACTIVE}`}
          >
            <Icon path={PROJECTION_ICON[perspectiveMode]} className="w-5 h-5" />
          </button>
          <button
            {...grayThemeControl}
            aria-label={`Paper tone, ${backgroundGray} of 255 - drag to change`}
            aria-pressed={sunEnvironment}
            className={`${button} touch-none ${sunEnvironment ? ACTIVE : ''}`}
          >
            <Icon path={sunEnvironment ? I.sky : isDark ? I.dark : I.light} className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowTools((open) => !open)}
            aria-label="Tools"
            aria-expanded={showTools}
            className={`${button} ${showTools ? 'bg-black/10 dark:bg-white/10' : ''}`}
          >
            <Icon path={I.sliders} className="w-5 h-5" />
          </button>
        </div>
      </div>

    </>
  );
};
