import React, { useEffect, useRef, useState } from 'react';
import { useStore, EYE_LEVEL_PRESETS } from '../store';
import { disableDeviceOrientation, enableDeviceOrientation, walkInput } from '../lib/walkInput';
import { beginMeasure, clearMeasures, endMeasure, updateMeasure } from '../lib/measure';
import { holdRail, releaseRail, showRail, useRail } from '../lib/rail';
import { SelectionBar } from './SelectionBar';
import { LightPanel } from './LightPanel';
import { MaterialPanel } from './MaterialPanel';
import { Icon, I, SURFACE_ICON } from './icons';
import { Scrub, useBackdropControl, useGrayThemeControl, useRoomControl } from './controls';
import { captureFileName, captureView } from '../lib/capture';
// One import rather than a static one for the capability check and a dynamic
// one for the work: the heavy part of this - the USDZ exporter itself - is
// already loaded on demand from inside the module, so splitting the module too
// bought nothing and only kept the bundler warning alive.
import { quickLookAvailable, sceneToUSDZ, openInQuickLook, downloadUSDZ } from '../lib/exportAR';
import { whileWorking } from '../lib/activity';
import { ACTIVE, bubble, chrome, iconButton, SIDEWAYS_SLOT } from './ui';
import { directionAt, pickGround, pickObject, pixelsPerMetreAt } from '../lib/pick';
import * as THREE from 'three';
import { grabAt, hoverAt, pinchOn, type Grab, type Pinch } from '../lib/manipulate';
import { MAX_FIELD, wholeSheetField } from '../lib/projection';
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


/**
 * How the tools panel lays itself out when the window is short.
 *
 * Keyed on HEIGHT, not on orientation. What matters is not which way the phone
 * is held but how much room there is above the dock, and a short window is a
 * short window whether it is a landscape phone, a split view, or a browser
 * with three toolbars in it.
 *
 * Written out in full rather than composed from a constant: Tailwind finds
 * classes by reading the source text, so a variant assembled at runtime is a
 * variant that never gets a rule generated for it. (Which is exactly what
 * happened - the panel stayed four rows deep in landscape and measured
 * identical to portrait, because the CSS simply did not exist.)
 */
const SIDEWAYS_PANEL =
  // items-stretch, so every hairline runs the full height of the block rather
  // than only as far as its own band's controls reach.
  '[@media(max-height:560px)]:flex-row [@media(max-height:560px)]:items-stretch ' +
  // A BLOCK IN THE CORNER, NOT A BAR ACROSS THE BOTTOM.
  //
  // The bands were turned sideways but kept as rows, which laid twenty-two
  // controls end to end: a strip wider than the phone, so it filled the frame
  // edge to edge, scrolled sideways to reach half of itself, and landed as a
  // second dark bar directly on top of the dock. Two full-width bars is the
  // whole bottom third of a 440 px frame gone, and the drawing was what was
  // under them.
  //
  // Each band is a COLUMN instead. Four columns of up to six is about 200 by
  // 270 - a block that sits in the corner over the button that opened it, with
  // three quarters of the frame beside it untouched, nothing to scroll, and
  // every control visible at once. It is the same trade as before, made the
  // other way: spend the axis the screen has (width, and only 200 px of it)
  // rather than the axis it has none of.
  '[@media(max-height:560px)]:max-w-[calc(100vw-1.5rem)] ' +
  '[@media(max-height:560px)]:max-h-[calc(100dvh-9.5rem)] ' +
  '[@media(max-height:560px)]:overflow-y-auto [@media(max-height:560px)]:scrollbar-none';

/**
 * The dock, turned sideways: two thumbs instead of one row.
 *
 * A phone held in landscape is held in TWO hands, and the two places a thumb
 * actually rests are the bottom corners - not the middle of the bottom edge,
 * which is where the row sat and which is also directly under the subject of
 * the drawing. So the eight controls split into two clusters anchored to the
 * two corners, and the whole centre of the frame comes back.
 *
 * The clusters are display:contents in portrait, which removes their boxes
 * entirely and lets all eight children lay themselves out as the single row
 * they have always been - so this costs one wrapper and no second layout.
 */
const SIDEWAYS_CLUSTER =
  'contents [@media(max-height:560px)]:flex [@media(max-height:560px)]:items-center ' +
  '[@media(max-height:560px)]:gap-1 [@media(max-height:560px)]:p-1.5 ' +
  '[@media(max-height:560px)]:rounded-[1.75rem] [@media(max-height:560px)]:border ' +
  '[@media(max-height:560px)]:shadow-2xl';

/** ...and the row itself gives up its glass to them, and spreads to the edges. */
const SIDEWAYS_DOCK =
  '[@media(max-height:560px)]:w-full [@media(max-height:560px)]:justify-between ' +
  '[@media(max-height:560px)]:bg-transparent [@media(max-height:560px)]:border-transparent ' +
  '[@media(max-height:560px)]:shadow-none [@media(max-height:560px)]:p-0';

/**
 * The lights and the material knobs, on their side.
 *
 * Neither has enough in it to need turning the way the tools panel does - nine
 * controls and seven - but both would still run most of the width of a phone
 * held sideways if left to fill it, and a panel that reaches the far corner is
 * a panel that has stopped being near the button that opened it. Held to a
 * third of the frame they wrap into two or three short lines in the corner,
 * which is the shape everything else up there is.
 */
const SIDEWAYS_BLOCK = '[@media(max-height:560px)]:max-w-[20rem]';

/**
 * The library is the exception, and stays a strip.
 *
 * It is one row of thumbnails you push sideways, and that is the whole idea of
 * it - a shelf. Held to twenty rem it would show four objects out of fourteen.
 * Two thirds of the frame is nine of them, still hung from the right, still
 * clear of the left-hand thumb.
 */
const SIDEWAYS_SHELF = '[@media(max-height:560px)]:max-w-[min(38rem,66vw)]';

const SIDEWAYS_DIVIDER =
  '[@media(max-height:560px)]:mt-0 [@media(max-height:560px)]:pt-0 ' +
  '[@media(max-height:560px)]:border-t-0 [@media(max-height:560px)]:ml-1 ' +
  '[@media(max-height:560px)]:pl-1 [@media(max-height:560px)]:border-l';

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
  /**
   * A library, standing in the panel slot: one row, scrolled sideways.
   *
   * It used to be a modal sheet drawn over everything, which covered the dock
   * - so opening the shelf took away the toolbar you were about to use it
   * with. It is chrome like the tools and the lights are, in the same slot,
   * and the scene stays live underneath.
   */
  shelf?: React.ReactNode;
  shelfOpen?: boolean;
  /** Put the shelf away. Opening any of the three panels does. */
  onShelfAway?: () => void;
}> = ({ onModels, onScenes, shelf = null, shelfOpen = false, onShelfAway = () => {} }) => {
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
  const backdrop = useStore((s) => s.backdrop);
  const backdropControl = useBackdropControl();
  const [showTools, setShowTools] = useState(false);
  /*
   * The lights stand in the tools row's own slot, over a live dock.
   *
   * They were a modal sheet, and opening one closed both toolbars - so moving
   * the sun cost you the field-of-view and eye-height controls it is most
   * often adjusted against, and the view could not be walked while a thumb
   * was on a knob. The two are one slot now: Lights swaps the row for the
   * panel, Tools swaps it back.
   */
  const [showLights, setShowLights] = useState(false);
  /*
   * ...and the drawn page's own settings, in the same slot again.
   *
   * Only two of the five surface rungs have any, so the button that opens this
   * is only there on those two - a control that does nothing on three rungs
   * out of five is a control you learn to distrust.
   */
  const [showMaterial, setShowMaterial] = useState(false);

  /**
   * ONE PANEL IN THE SLOT AT A TIME.
   *
   * The tools, the lights, the page's own knobs, the mesh library and the
   * scene library all hang in one zero-height slot above the dock, and they
   * are all opacity - so two open at once is not two panels, it is one drawn
   * on top of another. The four buttons inside the panel already stood each
   * other down; the two on the dock, which open the libraries, did not, so
   * tapping the library with the tools up put a shelf across the middle of it.
   * On an upright phone the scene library landed entirely inside the tools
   * panel, which reads as the panel having changed rather than as a second
   * thing arriving.
   */
  const swapTo = (open: () => void) => () => {
    setShowTools(false);
    setShowLights(false);
    setShowMaterial(false);
    open();
  };

  /*
   * Whether the phone's own orientation is driving the view.
   *
   * The *second* of the two ways into a real room, and it is worth saying why
   * it is still here. Hold the phone up and turn, and your body's turn is the
   * camera's: position stays on the sticks, since no web API tracks where you
   * walk, but which way you are facing is the phone's own sensors, smoothed.
   * That is a browser looking around a scene it is drawing. Quick Look, beside
   * it, is the scene standing in the room with real tracking - which is the
   * better answer whenever the phone can give it. This one still earns its
   * seat: it works on the page you are already on, over the curvilinear
   * projections, which Quick Look cannot do because it draws the world through
   * a camera's own rectilinear lens.
   *
   * On a desktop with no sensor the toggle offers itself and honestly
   * declines: if no reading arrives within a moment it switches itself back
   * off.
   */
  const [arLook, setArLook] = useState(false);
  /**
   * Whether this device has a system AR viewer to hand the scene to.
   *
   * Asked once. It is a capability of the browser, not of the session.
   */
  const [inRoom] = useState(quickLookAvailable);
  /*
   * Whether drags are measuring instead of looking.
   *
   * The pencil at arm's length: while this is up, a drag on the scene lays a
   * measure - two directions from the eye and the angle between them - and
   * nothing else a drag normally does happens. It is a mode, which this tool
   * avoids, and it earns the exception the way a real pencil does: you pick
   * the instrument up, take your readings, and put it down. Putting it down
   * clears the sheet.
   */
  const [measuring, setMeasuring] = useState(false);
  const measurePointer = useRef<number | null>(null);
  /*
   * Whether drags are DRAWING BOXES instead of looking.
   *
   * The block-out gesture, and the fastest way from standing in a real place
   * to a scene of its forms: drag a footprint on the ground where the table
   * is, release, pull its height up, release - a box, sized by eye, in two
   * strokes. The mode stays armed so a room is blocked out in a run of
   * strokes, and every box lands selected with the snap applied, so refining
   * is the same handles as always. One undo step per box.
   */
  const [blocking, setBlocking] = useState(false);
  const block = useRef<
    | { stage: 'foot'; pointer: number; id: string; anchor: { x: number; z: number } }
    | { stage: 'pull'; pointer: number | null; id: string; startY: number; h0: number; perMetre: number }
    | null
  >(null);
  /** The reading beside the finger while a box is being drawn. */
  const [blockReadout, setBlockReadout] = useState<{ x: number; y: number; text: string } | null>(null);
  const railVisible = useRail();
  const sceneSurface = useStore((s) => s.surface);
  const cycleSurface = useStore((s) => s.cycleSurface);
  const shufflePreset = useStore((s) => s.shufflePreset);
  const roomLevel = useStore((s) => s.roomLevel);
  const room = useStore((s) => s.room);
  const roomControl = useRoomControl();
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.undoStack.length > 0);
  const canRedo = useStore((s) => s.redoStack.length > 0);

  const setPerspectiveMode = useStore((s) => s.setPerspectiveMode);
  const guides = useStore((s) => s.guides);
  const cycleGuides = useStore((s) => s.cycleGuides);
  const gridX = useStore((s) => s.gridX);
  const gridZ = useStore((s) => s.gridZ);
  const toggleGridX = useStore((s) => s.toggleGridX);
  const toggleGridZ = useStore((s) => s.toggleGridZ);
  const snapStep = useStore((s) => s.snapStep);
  const cycleSnap = useStore((s) => s.cycleSnap);
  const construction = useStore((s) => s.construction);
  const cycleConstruction = useStore((s) => s.cycleConstruction);
  const fieldRange = useStore((s) => s.fieldRange);
  const cycleFieldRange = useStore((s) => s.cycleFieldRange);
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

  /**
   * Where a measure's end actually is, when it is anywhere.
   *
   * An object first, then the floor. The instrument reads visual angle, which
   * every direction has; this is the other half, and only some drags have it -
   * a line taken across the sky lands on nothing and gets no metres.
   */
  const placeAt = (x: number, y: number): [number, number, number] | undefined => {
    const hit = pickObject(x, y);
    if (hit) return [hit.point.x, hit.point.y, hit.point.z];
    const ground = pickGround(x, y);
    return ground ? [ground.x, ground.y, ground.z] : undefined;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // The pencil first: while measuring, the first finger lays a measure and
    // the drag belongs to it entirely - no look, no walk, no select. The
    // chrome still wakes, though - the way OUT of the mode is a button, and a
    // mode that lets the only exit fade away is a trap.
    if (blocking) {
      showRail();
      // A right press is a menu, not a stroke.
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      let held = block.current;
      // The ghost can vanish mid-gesture - undo and delete are both still
      // reachable - and a machine pointing at a dead box would eat the next
      // stroke whole. Start fresh instead.
      if (held && !useStore.getState().boxes.some((b) => b.id === held!.id)) {
        block.current = null;
        held = null;
        setBlockReadout(null);
      }
      if (held === null) {
        // The first stroke: anchor the footprint where the finger meets the
        // floor. Off the floor - sky, past the sheet - nothing starts.
        const at = pickGround(e.clientX, e.clientY, 0);
        if (at) {
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          } catch { /* the element still sees the moves */ }
          const state = useStore.getState();
          state.beginBlock([at.x, at.z]);
          block.current = {
            stage: 'foot',
            pointer: e.pointerId,
            id: useStore.getState().selectedId!,
            anchor: { x: at.x, z: at.z },
          };
        }
      } else if (held.stage === 'pull' && held.pointer === null) {
        // The second stroke: wherever it lands, its vertical travel is the
        // height. Captured for the same reason the first one is - and the
        // baseline re-read from the box, because a cancelled pull leaves the
        // box standing at a height the old baseline never heard of.
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch { /* the element still sees the moves */ }
        const box = useStore.getState().boxes.find((b) => b.id === held!.id);
        held.pointer = e.pointerId;
        held.startY = e.clientY;
        held.h0 = box ? box.scale[1] : held.h0;
      }
      return;
    }
    if (measuring) {
      showRail();
      if (measurePointer.current === null) {
        const dir = directionAt(e.clientX, e.clientY);
        if (dir) {
          // Captured, or a mouse released over the chrome never reports the
          // release here and the instrument wedges with a live measure that
          // chases the bare cursor.
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          } catch { /* the element still sees the moves */ }
          measurePointer.current = e.pointerId;
          beginMeasure(dir, placeAt(e.clientX, e.clientY));
        }
      }
      return;
    }
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
    if (blocking) {
      const held = block.current;
      if (!held || held.pointer !== e.pointerId) return;
      // A mouse back over the glass unpressed lost its release somewhere
      // else: the stroke ends where it was, not under a wandering cursor.
      if (e.pointerType === 'mouse' && e.buttons === 0) {
        if (held.stage === 'foot') {
          endPointer(e);
        } else {
          block.current = null;
          setBlockReadout(null);
        }
        return;
      }
      const state = useStore.getState();
      const step = state.snapStep;
      const snap = (v: number) => (step > 0 ? Math.round(v / step) * step : v);
      if (held.stage === 'foot') {
        const at = pickGround(e.clientX, e.clientY, 0);
        if (!at) return;
        const w = Math.max(0.1, Math.abs(snap(at.x) - snap(held.anchor.x)));
        const d = Math.max(0.1, Math.abs(snap(at.z) - snap(held.anchor.z)));
        const box = state.boxes.find((b) => b.id === held.id);
        const h = box ? box.scale[1] : 0.1;
        state.updateBox(held.id, {
          scale: [w, h, d],
          position: [
            (snap(at.x) + snap(held.anchor.x)) / 2,
            h / 2,
            (snap(at.z) + snap(held.anchor.z)) / 2,
          ],
        });
        setBlockReadout({ x: e.clientX, y: e.clientY, text: `${w.toFixed(2)} × ${d.toFixed(2)}` });
      } else {
        const box = state.boxes.find((b) => b.id === held.id);
        if (!box) return;
        const h = Math.max(0.1, snap(held.h0 + (held.startY - e.clientY) / held.perMetre));
        state.updateBox(held.id, {
          scale: [box.scale[0], h, box.scale[2]],
          position: [box.position[0], h / 2, box.position[2]],
        });
        setBlockReadout({ x: e.clientX, y: e.clientY, text: h.toFixed(2) });
      }
      return;
    }
    if (measuring) {
      if (measurePointer.current === e.pointerId) {
        // A mouse that comes back over the glass unpressed lost its release
        // somewhere else: the measure ends where it was, not under a cursor
        // that is no longer drawing it.
        if (e.pointerType === 'mouse' && e.buttons === 0) {
          measurePointer.current = null;
          endMeasure();
          return;
        }
        const dir = directionAt(e.clientX, e.clientY);
        if (dir) updateMeasure(dir, placeAt(e.clientX, e.clientY));
      }
      return;
    }
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
    const { selectBox, selectModel, selectLamp } = useStore.getState();
    // A touch whose only job was to wake the chrome may still pick something
    // up; it may not put anything down. Otherwise the workflow the tool is for
    // - place it, look at it for a while, then adjust it - was self-defeating:
    // the looking is what made the bar fade, and the tap to bring it back was
    // read as "nothing here", so the thing you wanted to adjust was deselected
    // by the very gesture that went looking for its controls.
    if (!hit) {
      if (!woke.current) selectBox(null);
    } else if (hit.type === 'box') selectBox(hit.id);
    else if (hit.type === 'lamp') selectLamp(hit.id);
    else selectModel(hit.id);
    woke.current = false;
  };

  const endPointer = (e: React.PointerEvent) => {
    if (blocking) {
      const held = block.current;
      if (held && held.pointer === e.pointerId) {
        if (held.stage === 'foot') {
          // The footprint is down; the same box now waits for its height.
          const state = useStore.getState();
          const box = state.boxes.find((b) => b.id === held.id);
          block.current = box
            ? {
                stage: 'pull',
                pointer: null,
                id: held.id,
                startY: 0,
                h0: box.scale[1],
                perMetre: Math.max(
                  40,
                  pixelsPerMetreAt(new THREE.Vector3(...box.position))
                ),
              }
            : null;
          if (!box) setBlockReadout(null);
        } else {
          /*
           * The height is set, the box is done, and the pencil goes down.
           *
           * It used to stay armed, on the theory that a room is blocked out in
           * a run of strokes. In the hand that is wrong: the moment a box
           * stands you want to look at it, and every drag you make to look is
           * another box. One press, one box, press again for the next - the
           * mode is never on when you did not just ask for it, and the button
           * says which state you are in.
           */
          block.current = null;
          setBlockReadout(null);
          setBlocking(false);
        }
      }
      return;
    }
    if (measuring) {
      if (measurePointer.current === e.pointerId) {
        measurePointer.current = null;
        endMeasure();
      }
      return;
    }
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
    if (blocking) {
      const held = block.current;
      if (held && held.pointer === e.pointerId) {
        if (held.stage === 'foot') block.current = null;
        else held.pointer = null;
        setBlockReadout(null);
      }
      return;
    }
    if (measuring) {
      if (measurePointer.current === e.pointerId) {
        measurePointer.current = null;
        endMeasure();
      }
      return;
    }
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
        // reason to drop what was selected before it was opened. The pencil
        // goes down first: a mode whose exit is hard to reach is a trap.
        if (blocking) {
          block.current = null;
          setBlockReadout(null);
          setBlocking(false);
        } else if (measuring) {
          clearMeasures();
          measurePointer.current = null;
          setMeasuring(false);
        } else if (shelfOpen) onShelfAway();
        else if (showMaterial) setShowMaterial(false);
        else if (showLights) setShowLights(false);
        else if (showTools) setShowTools(false);
        else useStore.getState().selectBox(null);
        return;
      }

      // Not through an open sheet. Backspace is also the reflex "go back"
      // key, and it was deleting the selection behind a library nobody could
      // see past - silently, with the sheet still up.
      if (!shelfOpen && (key === 'delete' || key === 'backspace')) {
        const state = useStore.getState();
        if (!state.selectedId && !state.selectedModelId && !state.selectedLampId) return;
        e.preventDefault();
        if (state.selectedModelId) state.removeModel(state.selectedModelId);
        else if (state.selectedId) state.removeBox(state.selectedId);
        else if (state.selectedLampId) state.removeLamp(state.selectedLampId);
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
        // Nothing held, nothing turned - and no undo step written for it.
        // beginChange before the check pushed a phantom step that also
        // emptied the redo stack, from a keypress that did nothing.
        if (!state.selectedModelId && !state.selectedId && !state.selectedLampId) return;
        if (!e.repeat) state.beginChange();
        if (state.selectedLampId) {
          const lamp = state.lamps.find((l) => l.id === state.selectedLampId);
          if (lamp) state.updateLamp(lamp.id, { aim: lamp.aim + step });
          return;
        }
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

      keys.add(key);
      apply();
    };

    const up = (e: KeyboardEvent) => { keys.delete(e.key.toLowerCase()); apply(); };
    // A sheet opening mid-stride must not leave the walker running.
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
  }, [showTools, showLights, showMaterial, shelfOpen, onShelfAway, measuring, blocking, undo, redo]);

  // Opening the second row is a statement that the chrome is wanted. It used to
  // fade out from under an open panel six seconds later, leaving twelve
  // controls on screen that could be seen through and not pressed. Closing the
  // row starts the idle count again.
  useEffect(() => {
    if (showTools || showLights || showMaterial) holdRail();
    else releaseRail();
  }, [showTools, showLights, showMaterial]);


  const button = iconButton(isDark);
  /**
   * One band of the tools panel: a line of related controls.
   *
   * Hung from the left rather than centred. The hairlines run the full width
   * of the panel, and bands of six, four, six and two centred under each other
   * made a diamond - four rows with four different left edges, which is four
   * places to start reading. Sharing one edge makes them rows of a list.
   *
   * TURNED SIDEWAYS THE WHOLE PANEL TURNS WITH IT.
   *
   * A phone on its side has about 380 px of height and something like a
   * thousand of width. Four stacked bands plus the dock plus the selection bar
   * came to more than half of that height, over the middle of the drawing -
   * which is the one part of the frame the drawing is actually in. So the four
   * bands stand side by side, and the hairlines between them go vertical.
   *
   * But a band is a COLUMN when it does, not a row. Laid out as rows they made
   * one strip of twenty-two controls, wider than the phone - which is a second
   * full-width bar on top of the dock, and half of it off the edge. Stacked,
   * the whole panel is a block in the corner over the button that opened it,
   * with everything visible at once and three quarters of the frame still
   * drawing.
   *
   * The column is capped at three and wraps rather than running on, because
   * there is no fixed budget to run into: the slot the panel hangs in moves up
   * by the height of the selection bar whenever something is selected, and a
   * six-deep column that fitted on an empty grid went off the top of the frame
   * the moment a mesh was picked. Three is short enough to survive that, and
   * wrapping keeps it honest either way - nothing scrolls, nothing is hidden,
   * the block just gets wider on the axis that has the room.
   */
  const band =
    'flex flex-wrap justify-start gap-1 ' +
    '[@media(max-height:560px)]:flex-col [@media(max-height:560px)]:content-start ' +
    '[@media(max-height:560px)]:max-h-[8.75rem] [@media(max-height:560px)]:shrink-0';
  /**
   * The hairline between two bands: under them in portrait, beside them when
   * the screen is short.
   */
  const divider = `${isDark ? 'border-white/10' : 'border-black/10'} mt-1 pt-1 border-t ${SIDEWAYS_DIVIDER}`;
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
  const dockVisible = railVisible;

  return (
    <>
      <div
        className="fixed inset-0 z-30 touch-none"
        style={{ cursor: measuring || blocking ? 'crosshair' : cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={cancelPointer}
        onPointerLeave={() => setCursor('default')}
      />

      {blockReadout && (
        <div
          className={`fixed z-40 pointer-events-none ${bubble(isDark)}`}
          style={{ left: blockReadout.x + 14, top: blockReadout.y - 40 }}
        >
          {blockReadout.text}
        </div>
      )}

      {/*
        * There is no scrim over the scene, and the panel does not dismiss
        * itself.
        *
        * It used to: a full-screen catcher sat under it and closed both it and
        * the lights on the first touch anywhere else. Every one of these
        * controls changes what the drawing looks like, and the only way to
        * judge that is to look at the drawing - which meant every single
        * adjustment cost a reopen, and comparing two settings meant four taps
        * per comparison. Worse, the catcher swallowed the touch that closed
        * it, so the drag you actually wanted did not happen either.
        *
        * The panel stays up until you put it away, and the scene underneath it
        * stays live: turn the view, drag the sun, walk, with the tools still
        * in reach. Tools closes it, Lights swaps to the other one, Escape
        * closes whichever is up.
        */}

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
        className={`fixed bottom-safe-panel left-0 right-0 z-40 flex flex-col items-center gap-3 x-safe-panel pointer-events-none transition-opacity duration-[1500ms] ease-in-out ${dockVisible ? 'opacity-100' : 'opacity-0'}`}
      >

        {/* One slot above the dock, two occupants: the tools row and the light
            panel overlap in it, and at most one is ever open. Zero-height, so
            whichever is up hangs from the same line the dock column already
            draws, and the closed one costs no space - stacked in the flow, an
            invisible tools row held a tools-row-sized hole open between the
            lights and the dock. */}
        <div className="relative w-full h-0">

        {/*
          * Secondary tools, in four bands with a hairline between them.
          *
          * Sixteen identical circles wrapped into whatever rows the width
          * happened to give was a wall, not a menu: nothing in it was near
          * anything it was related to, and the row a control sat in changed
          * with the phone. Each band is now its own line and holds one kind of
          * decision - what is drawn on the ground, what the picture is made
          * of, where it is seen from, and what to do with the session. A band
          * is scanned in one movement, and a control keeps the company it
          * belongs to at every width.
          */}
        <div className={`absolute bottom-0 inset-x-0 flex justify-center pointer-events-none ${SIDEWAYS_SLOT}`}>
        <div
          /* Out of the tab order while it is out of sight - what
             pointer-events-none already does for the pointer. A keyboard
             user's very first Tab landed in the collapsed row, and Enter there
             changed the construction guides with nothing on screen moving. */
          {...(showTools && dockVisible ? {} : { inert: '' })}
          className={`flex flex-col max-w-[22rem] ${SIDEWAYS_PANEL} p-1.5 rounded-[1.75rem] border shadow-2xl transition-all duration-300 transform origin-bottom ${showTools && dockVisible ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'} ${surface}`}
        >
          <div className={band}>
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
          {/* A ladder like the guides': off, the selection's, everything's.
              The top rung is the page blocked in whole - every object boxed
              before any object is drawn - which is a thing you step onto
              deliberately, not a side effect of what happens to be selected. */}
          <button
            onClick={cycleConstruction}
            aria-label={`Construction around ${['nothing', 'the selection', 'everything'][construction]}`}
            aria-pressed={construction > 0}
            className={`${button} ${construction ? ACTIVE : ''}`}
          >
            <Icon path={construction === 2 ? I.cages : I.cage} className="w-5 h-5" />
          </button>
          <button
            onClick={toggleVanishing}
            aria-label="The selection's own vanishing points"
            aria-pressed={showVanishing}
            className={`${button} ${showVanishing ? ACTIVE : ''}`}
          >
            <Icon path={I.vanishing} className="w-5 h-5" />
          </button>
          </div>

          {/* What the picture is made of: the surface every object wears,
              the sheet it is drawn on, the page that sheet is mounted on,
              and the lamps lighting it. The two tones were a rung apart -
              one on the dock, one buried here - and they are one decision
              taken twice, so they stand together. */}
          <div className={`${band} ${divider}`}>
          {/* Ten whole pages - surface, sheet, mount, light, lens, furniture,
              chosen together - and this deals a different one each press.
              Everything in this tool is a knob, and a tool that is all knobs is
              a tool nobody sees the range of; most of what it can do lives in
              combinations that take a minute to find and a second to lose.
              Nothing in the scene and nothing about where you are standing is
              touched: only how it is drawn. */}
          <button
            onClick={shufflePreset}
            aria-label="Deal a different page"
            className={button}
          >
            <Icon path={I.shuffle} className="w-5 h-5" />
          </button>
          <button
            onClick={cycleSurface}
            aria-label={`Surface of everything: ${sceneSurface}`}
            className={`${button} ${sceneSurface !== 'original' ? ACTIVE : ''}`}
          >
            <Icon path={SURFACE_ICON[sceneSurface]} className="w-5 h-5" />
          </button>
          {/* Only on the two rungs that have anything to set. A button that
              does nothing on three rungs out of five is a button you learn to
              distrust, so it is absent rather than disabled. */}
          {(sceneSurface === 'marker' || sceneSurface === 'hatch') && (
            <button
              onClick={() => { setShowTools(false); setShowLights(false); setShowMaterial(true); onShelfAway(); }}
              aria-label={sceneSurface === 'hatch' ? 'How the hatching is ruled' : "The marker's own settings"}
              aria-expanded={showMaterial}
              className={button}
            >
              <Icon path={sceneSurface === 'hatch' ? I.hatchAngle : I.hue} className="w-5 h-5" />
            </button>
          )}
          <button
            {...grayThemeControl}
            aria-label={`Paper tone, ${backgroundGray} of 255 - drag to change`}
            aria-pressed={sunEnvironment}
            className={`${button} touch-none ${sunEnvironment ? ACTIVE : ''}`}
          >
            <Icon path={sunEnvironment ? I.sky : isDark ? I.dark : I.light} className="w-5 h-5" />
          </button>
          {/* What the drawing is mounted on: the page behind the sheet its
              neighbour sets - tap for the sheet itself, black, white, and
              drag for any tone between. */}
          <button
            {...backdropControl}
            aria-label={`Page behind the drawing: ${
              backdrop === 'paper' ? 'the sheet itself' : `${backdrop} of 255`
            } - drag to change`}
            aria-pressed={backdrop !== 'paper'}
            className={`${button} touch-none ${backdrop !== 'paper' ? ACTIVE : ''}`}
          >
            <Icon path={I.backdrop} className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setShowTools(false); setShowMaterial(false); setShowLights(true); onShelfAway(); }}
            aria-label="Lights"
            aria-expanded={showLights}
            className={button}
          >
            <Icon path={I.strength} className="w-5 h-5" />
          </button>
          </div>

          {/* Where the drawing is seen from, and on what sheet: the
              projection, how far the lens may open, the room around it,
              whether the view is pinned, and looking by turning the
              phone. Set once and drawn from, which is why none of them
              is on the dock. */}
          <div className={`${band} ${divider}`}>
          {/*
            * The real room, first, because it is the best answer in the band.
            *
            * Everything else here decides where a virtual eye stands. This one
            * hands the scene to the phone's own AR viewer, at true size, and
            * the eye is then yours: walk round it, kneel to it, sight along
            * it, with ARKit doing the tracking. See lib/exportAR.ts for why
            * that is an export rather than a renderer.
            */}
          <button
            onClick={() => whileWorking(async () => {
              const { boxes, models } = useStore.getState();
              const file = await sceneToUSDZ(boxes, models);
              const name = `perspective-scene-${new Date().toISOString().slice(0, 10)}.usdz`;
              if (inRoom) openInQuickLook(file, name);
              else downloadUSDZ(file, name);
            })}
            aria-label={inRoom ? 'Stand the scene in the room around you' : 'Save the scene as USDZ for an AR device'}
            className={`${button} ${inRoom ? ACTIVE : ''}`}
          >
            <Icon path={I.ar} className="w-5 h-5" />
          </button>
          {/* Accented only away from the sheet it opens on, which is what the
              colour means everywhere else in this panel. On the dock it was
              permanently blue and that was readable as identity; in a line of
              toggles it would read as "on", which is not a thing a projection
              can be - there is always one. */}
          <button
            onClick={() => {
              const at = PROJECTION_ORDER.indexOf(perspectiveMode);
              setPerspectiveMode(PROJECTION_ORDER[(at + 1) % PROJECTION_ORDER.length]);
            }}
            aria-label={`Projection: ${perspectiveMode}`}
            className={`${button} ${perspectiveMode !== 'equidistant' ? ACTIVE : ''}`}
          >
            <Icon path={PROJECTION_ICON[perspectiveMode]} className="w-5 h-5" />
          </button>
          {/* How far the lens may open: sight's own cone, the whole sphere
              on the page, or the endless band - where the cylindrical sheet
              repeats past a full turn instead of running out, the same room
              again and again along one frieze. */}
          <button
            onClick={cycleFieldRange}
            aria-label={`Lens reach: ${fieldRange === 'human' ? 'human sight' : fieldRange === 'sphere' ? 'the whole sphere' : 'endless'}`}
            aria-pressed={fieldRange !== 'sphere'}
            className={`${button} ${fieldRange !== 'sphere' ? ACTIVE : ''}`}
          >
            <Icon path={fieldRange === 'human' ? I.fieldHuman : fieldRange === 'endless' ? I.fieldEndless : I.fieldSphere} className="w-5 h-5" />
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
                className={`absolute left-1/2 -translate-x-1/2 -top-11 pointer-events-none ${bubble(isDark)}`}
              >
                {room.width.toFixed(1)} × {room.depth.toFixed(1)}
              </div>
            )}
          </div>
          <button onClick={toggleViewLock} aria-label="Lock view" aria-pressed={viewLocked} className={`${button} ${viewLocked ? '!text-amber-400' : ''}`}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="10.5" width="16" height="10" rx="2" />
              {viewLocked ? <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /> : <path d="M8 10.5V7a4 4 0 0 1 7.5-2" />}
            </svg>
          </button>
          <button
            onClick={async () => {
              if (arLook) {
                disableDeviceOrientation();
                setArLook(false);
                return;
              }
              // iOS grants the sensor only from inside a tap, which is why
              // the permission ask lives here and nowhere else.
              const granted = await enableDeviceOrientation();
              setArLook(granted);
              if (granted) {
                setTimeout(() => {
                  // Permission is not a sensor: a desktop grants the listener
                  // and then never fires it. If nothing has arrived, say so
                  // by switching back off rather than pretending.
                  if (!walkInput.useDeviceOrientation) {
                    disableDeviceOrientation();
                    setArLook(false);
                  }
                }, 1500);
              }
            }}
            aria-label="Look by turning the phone"
            aria-pressed={arLook}
            className={`${button} ${arLook ? ACTIVE : ''}`}
          >
            <Icon path={I.arLook} className="w-5 h-5" />
          </button>
          </div>

          {/* The session itself. */}
          <div className={`${band} ${divider}`}>
          {/* The library of compositions, and taking the picture away. The
              dock is the verbs you use mid-drawing; both of these are things
              you do between drawings, at the start and at the end. */}
          <button onClick={swapTo(onScenes)} aria-label="Scenes" className={button}>
            <Icon path={I.scenes} className="w-5 h-5" />
          </button>
          <button
            onClick={() => whileWorking(() => captureView(captureFileName(cameraHeight, fov, perspectiveMode)))}
            aria-label="Save the view as a picture"
            className={button}
          >
            <Icon path={I.camera} className="w-5 h-5" />
          </button>
          </div>
        </div>
        </div>

        {/* The lights, in the same slot. */}
        <div className={`absolute bottom-0 inset-x-0 flex justify-center pointer-events-none ${SIDEWAYS_SLOT}`}>
          <div
            {...(showLights && dockVisible ? {} : { inert: '' })}
            className={`max-w-full ${SIDEWAYS_BLOCK} p-1.5 rounded-[1.75rem] border shadow-2xl transition-all duration-300 transform origin-bottom ${showLights && dockVisible ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'} ${surface}`}
          >
            <LightPanel />
          </div>
        </div>

        {/* The library, in the same slot: one row, scrolled sideways. */}
        <div className={`absolute bottom-0 inset-x-0 flex justify-center pointer-events-none ${SIDEWAYS_SLOT}`}>
          <div
            {...(shelfOpen && dockVisible ? {} : { inert: '' })}
            className={`max-w-full min-w-0 ${SIDEWAYS_SHELF} p-1.5 rounded-[1.75rem] border shadow-2xl transition-all duration-300 transform origin-bottom ${shelfOpen && dockVisible ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'} ${surface}`}
          >
            {shelf}
          </div>
        </div>

        {/* And the drawn page's own knobs, in the same slot again. */}
        <div className={`absolute bottom-0 inset-x-0 flex justify-center pointer-events-none ${SIDEWAYS_SLOT}`}>
          <div
            {...(showMaterial && dockVisible ? {} : { inert: '' })}
            className={`max-w-full ${SIDEWAYS_BLOCK} p-1.5 rounded-[1.75rem] border shadow-2xl transition-all duration-300 transform origin-bottom ${showMaterial && dockVisible ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'} ${surface}`}
          >
            <MaterialPanel />
          </div>
        </div>

        </div>

        {/* Primary Dock */}
        {/* What you can do to the thing you are holding, above what you can do
            to the view. */}
        <SelectionBar />

        {/*
          * The dock is the verbs, and only the verbs.
          *
          * Add something, choose the lens, choose the eye level, block a form
          * in, measure an angle, take a step back or forward, and the way in
          * to everything else. Nothing here is a setting: the projection and
          * the sheet tone went into the panel, where the rest of the "how it
          * is drawn" decisions live, and the two steps of the undo stack came
          * out of it. It is the same eight seats either way, and the trade is
          * a thing you touch once a session for two you touch every minute.
          */}
        <div
          {...(dockVisible ? {} : { inert: '' })}
          // Tighter on a phone, for the same reason the controls in it are:
          // eight of them plus the glass is 368 px and a 390 px frame gives
          // the dock 366, so it folded in half over the drawing for want of
          // two pixels. It wraps rather than clips when it truly cannot fit -
          // a control pushed off the edge is not a smaller control.
          className={`flex flex-wrap items-center justify-center max-w-full p-1.5 gap-1 max-[429px]:p-1 max-[429px]:gap-0.5 rounded-[1.75rem] border shadow-2xl ${SIDEWAYS_DOCK} ${dockVisible ? 'pointer-events-auto' : 'pointer-events-none'} ${surface}`}
        >
          <div className={`${SIDEWAYS_CLUSTER} ${surface}`}>
          <button onClick={swapTo(onModels)} aria-label="Add model" className={button}>
            <Icon path={I.cube} className="w-5 h-5" />
          </button>
          <Scrub
            skin={{ dark: isDark, touch: true }}
            icon={I.cone}
            label="Field of view"
            reading={`${Math.round(fov)}°`}
            value={fov}
            min={25}
            max={fieldRange === 'human' ? 210 : fieldRange === 'endless' ? MAX_FIELD : wholeSheet}
            step={1}
            // Twice the sweep, because the range is now twice what it was and
            // everything anyone does is still down at the narrow end.
            sweep={440}
            // The fields worth landing on exactly: a long lens, the 60 degree
            // cone, a wide flat frame, the hemisphere, the full sphere - and
            // the whole sphere drawn small enough to see all the way round it,
            // which is a different number in every window.
            // Sorted: the whole-sheet field depends on the window's shape and
            // lands anywhere between 380 and 1080, and the tap-cycle takes the
            // first preset past the current value in ARRAY order - unsorted, a
            // portrait phone made 720 unreachable by tapping.
            cycle={[...new Set(
              fieldRange === 'human'
                ? [35, 60, 90, 120, 180, 210]
                : fieldRange === 'endless'
                  ? [35, 60, 90, 120, 180, 270, 360, wholeSheet, 720, MAX_FIELD]
                  : [35, 60, 90, 120, 180, 270, 360, wholeSheet]
            )].sort((a, b) => a - b)}
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
          {/* The block-out pencil: while it is up, a drag on the ground draws
              a footprint and the next drag pulls its height - a box, sized by
              eye, in two strokes, and the mode stays armed for the next one.
              The fastest road from standing in a real place to a scene of its
              forms. */}
          <button
            onClick={() => {
              block.current = null;
              setBlockReadout(null);
              setBlocking((on) => !on);
              if (measuring) clearMeasures();
              measurePointer.current = null;
              setMeasuring(false);
              setShowTools(false);
            }}
            aria-label="Draw boxes on the ground"
            aria-pressed={blocking}
            className={`${button} ${blocking ? ACTIVE : ''}`}
          >
            <Icon path={I.block} className="w-5 h-5" />
          </button>
          {/* The pencil at arm's length: while it is up, a drag on the scene
              lays a measure in degrees of visual angle instead of turning the
              view. Putting the instrument down clears the sheet - a
              measurement is a reading, not a mark of the composition. */}
          <button
            onClick={() => {
              if (measuring) clearMeasures();
              measurePointer.current = null;
              setMeasuring((on) => !on);
              setBlocking(false);
              block.current = null;
              setBlockReadout(null);
              setShowTools(false);
            }}
            aria-label="Measure visual angles"
            aria-pressed={measuring}
            className={`${button} ${measuring ? ACTIVE : ''}`}
          >
            <Icon path={I.measure} className="w-5 h-5" />
          </button>
          </div>

          <div className={`${SIDEWAYS_CLUSTER} ${surface}`}>
          {/*
            * Back and forward, on the dock rather than inside the menu.
            *
            * Undoing is not a setting you go and find - it is the second half
            * of every gesture that went wrong, and the whole value of it is
            * that it costs nothing. Two taps and a flyout in the way is enough
            * to make a mis-drag something you live with instead, which is a
            * tool teaching you to be careful rather than to try things.
            *
            * Disabled rather than dimmed-but-live at the ends of the stack: a
            * control that looks spent and still takes the tap is a control
            * that lies about what it did.
            */}
          <button
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo"
            className={`${button} disabled:opacity-25 disabled:active:scale-100`}
          >
            <Icon path={I.undo} className="w-5 h-5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo"
            className={`${button} disabled:opacity-25 disabled:active:scale-100`}
          >
            <Icon path={I.redo} className="w-5 h-5" />
          </button>
          <button
            // With the lights up, Tools means "back to the tools": the two
            // share the slot, so this swaps rather than stacks.
            onClick={() => { setShowTools(showLights || showMaterial || shelfOpen ? true : !showTools); setShowLights(false); setShowMaterial(false); onShelfAway(); }}
            aria-label="Tools"
            aria-expanded={showTools}
            className={`${button} ${showTools ? 'bg-black/10 dark:bg-white/10' : ''}`}
          >
            <Icon path={I.sliders} className="w-5 h-5" />
          </button>
          </div>
        </div>
      </div>

    </>
  );
};
