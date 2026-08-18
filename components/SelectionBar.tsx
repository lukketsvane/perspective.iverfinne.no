import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Icon, I } from './icons';
import { bubble, chrome, readout, SIDEWAYS_SLOT, snugIconButton } from './ui';
import { exportScaledModel } from '../lib/exportModel';
import { SETTINGS_ICON, SURFACE_ICON } from './icons';
import { useRail } from '../lib/rail';
import { selectionRange } from '../lib/focus';
import { selectionSurface, surfaceHasSettings, surfaceSettingsLabel } from '../types';
import type { LampData } from '../types';

/** Everything sizes to the centimetre. Below that is not a drawing decision. */
const CM = 0.01;

/** Smallest and largest a placed model may be made, in metres. */
const MIN_HEIGHT = 0.05;
const MAX_HEIGHT = 200;

const MIN_BOX_DIM = 0.1;
const MAX_BOX_DIM = 200;

/** How fast a horizontal drag grows the reading: about 0.6 % per pixel. */
const SCRUB_RATE = 1.006;

/**
 * How far a lift drag raises the selection: a centimetre per pixel.
 *
 * Linear, unlike everything else on this bar, and it has to be. The others
 * scrub by proportion, which is right for a size - ten per cent of a chair and
 * ten per cent of a building are both the same decision - and useless for a
 * height that starts at zero, where every proportion of nothing is nothing.
 */
const LIFT_RATE = 0.01;

/** As high as anything is worth putting. */
const MAX_LIFT = 50;

const clampTo = (metres: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(metres / CM) * CM));

const AXES = [
  { icon: I.axisWidth, label: 'Width' },
  { icon: I.axisHeight, label: 'Height' },
  { icon: I.axisDepth, label: 'Depth' },
] as const;

/**
 * Metres, to the centimetre.
 *
 * The scene is metric throughout and the grid is ruled in metres, so the unit
 * never has to be written down: 1.75 is a person, 0.79 is the chair.
 */
const metres = (value: number) => value.toFixed(2);

/**
 * A reading you drag.
 *
 * The model height and the box dimensions were two copies of this: a number in
 * centimetres, dragged sideways to size the thing it belongs to, double-tapped
 * to go back to where it started.
 */
const useScrub = (value: number, onChange: (v: number) => void) => {
  const held = useRef<{ id: number; x: number; from: number; changed: boolean } | null>(null);
  const beginChange = useStore((s) => s.beginChange);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* not capturable; the element still sees the moves */
      }
      held.current = { id: e.pointerId, x: e.clientX, from: value, changed: false };
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (held.current?.id !== e.pointerId) return;
      // One step back undoes the whole scrub - but only once it has scrubbed.
      if (!held.current.changed) {
        held.current.changed = true;
        beginChange();
      }
      onChange(held.current.from * Math.pow(SCRUB_RATE, e.clientX - held.current.x));
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (held.current?.id === e.pointerId) held.current = null;
    },
    onPointerCancel: () => {
      held.current = null;
    },
  };
};

/**
 * A reading you drag by the metre rather than by proportion.
 *
 * Same shape as `useScrub`, and separate from it on purpose: the two do
 * genuinely different arithmetic, and folding them together behind a flag would
 * hide that a lift and a size are not the same kind of number.
 */
const useLift = (value: number, onChange: (v: number) => void) => {
  const held = useRef<{ id: number; x: number; from: number; changed: boolean } | null>(null);
  const beginChange = useStore((s) => s.beginChange);
  // Every other control on this bar is a number you drag, so it says what it is
  // set to by existing. This one is an icon, so it has to be told to.
  const [dragging, setDragging] = useState(false);

  return {
    dragging,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* not capturable; the element still sees the moves */
        }
        held.current = { id: e.pointerId, x: e.clientX, from: value, changed: false };
        setDragging(true);
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (held.current?.id !== e.pointerId) return;
        if (!held.current.changed) {
          held.current.changed = true;
          beginChange();
        }
        onChange(held.current.from + (e.clientX - held.current.x) * LIFT_RATE);
      },
      onPointerUp: (e: React.PointerEvent) => {
        if (held.current?.id === e.pointerId) held.current = null;
        setDragging(false);
      },
      onPointerCancel: () => {
        held.current = null;
        setDragging(false);
      },
    },
  };
};

/**
 * How far away the selection is, redrawn only when the number moves.
 *
 * The frame loop writes it; polling the animation frame and comparing is what
 * the vanishing overlay already does, and it keeps a number that changes on
 * every step of a walk out of the store, where every write is a repaint of
 * everything subscribed to it.
 */
const useRange = () => {
  const [, redraw] = useState(0);
  const seen = useRef(-1);
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      if (selectionRange.nonce !== seen.current) {
        seen.current = selectionRange.nonce;
        redraw((n) => n + 1);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => {
      running = false;
    };
  }, []);
  return selectionRange.metres;
};

/**
 * What you can do to the thing you just tapped: size it, lift it off the floor,
 * change how solidly it is drawn, open the knobs that rule that drawing, delete
 * it - and, for a mesh, take it away at the size you settled on.
 *
 * Turning is not here. It is a drag on the thing itself, which is where it was
 * always going to be looked for first, and a pair of arrows on a bar that turn
 * something by a fixed step is a worse version of that gesture rather than a
 * second way to reach it.
 *
 * For models the reading is the height. For boxes one pill shows one axis at a
 * time; tap the letter to move to the next.
 */
/**
 * What you can do to a lamp: raise it, brighten it, warm it, aim it, switch
 * it, and take it away. The same bar in the same place - a lamp is a scene
 * object, so holding one offers what holding anything offers, in its own
 * vocabulary.
 */
const LampBar: React.FC<{ lamp: LampData; raised: boolean }> = ({ lamp, raised }) => {
  const theme = useStore((s) => s.theme);
  const updateLamp = useStore((s) => s.updateLamp);
  const removeLamp = useStore((s) => s.removeLamp);
  const beginChange = useStore((s) => s.beginChange);
  const railVisible = useRail();
  const isDark = theme === 'dark';
  const button = `${snugIconButton(isDark)} border border-transparent`;

  const liftScrub = useLift(lamp.position[1], (metres) =>
    updateLamp(lamp.id, {
      position: [lamp.position[0], Math.min(MAX_LIFT, Math.max(0.1, metres)), lamp.position[2]],
    })
  );
  const aimHold = useRef<{ id: number; x: number; from: number; changed: boolean } | null>(null);
  const aimScrub = {
    onPointerDown: (e: React.PointerEvent) => {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch { /* still sees the moves */ }
      aimHold.current = { id: e.pointerId, x: e.clientX, from: lamp.aim, changed: false };
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (aimHold.current?.id !== e.pointerId) return;
      if (!aimHold.current.changed) {
        aimHold.current.changed = true;
        beginChange();
      }
      updateLamp(lamp.id, { aim: aimHold.current.from + (e.clientX - aimHold.current.x) * 0.02 });
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (aimHold.current?.id === e.pointerId) aimHold.current = null;
    },
    onPointerCancel: () => {
      aimHold.current = null;
    },
  };

  const reading = (value: string, label: string, scrub: object, wide = false) => (
    <button
      {...scrub}
      aria-label={label}
      className={`${readout(isDark)} touch-none ${wide ? '' : '!min-w-[3.4rem]'}`}
    >
      <span className="text-[13px] font-bold tabular-nums tracking-wide">{value}</span>
    </button>
  );

  return (
    <div
      className={`flex justify-center max-w-full px-2 ${SIDEWAYS_SLOT} pointer-events-none transition-all duration-300 ${
        raised ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      <div
        className={`flex items-center max-w-full overflow-x-auto scrollbar-none p-1 sm:p-1.5 gap-0.5 sm:gap-1 rounded-full border shadow-2xl ${
          raised || !railVisible ? 'pointer-events-none' : 'pointer-events-auto'
        } ${chrome(isDark)}`}
      >
        {/*
          * Where it stands, and nothing about how it burns.
          *
          * Brightness, warmth, aim, kind and the switch all used to be here as
          * well - a second set of knobs for the same five numbers the light
          * panel already had, in a different order, reachable only while the
          * lamp happened to be in your hand. There is one place where a light
          * is set now, and it holds every light in the scene at once; taking
          * hold of a lamp brings it under those knobs. What is left here is
          * what this bar is for on every other object: where the thing is.
          */}
        {reading(metres(lamp.position[1]), 'Height off the floor - drag to change', liftScrub.handlers)}
        {/* A bulb shines every way at once, so it has no aim to swing. */}
        {lamp.kind === 'spot' &&
          reading(
            `${Math.round((((lamp.aim * 180) / Math.PI) % 360 + 360) % 360)}°`,
            'Aim - drag to swing it',
            aimScrub
          )}
        <button onClick={() => removeLamp(lamp.id)} className={`${button} !text-red-500`} aria-label="Delete">
          <Icon path={I.trash} className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export const SelectionBar: React.FC<{
  raised?: boolean;
  /**
   * Open the page's own knobs - the marker's colour, the hatching's rule.
   *
   * Handed in rather than reached for: the panel shares one slot with the
   * tools, the lights and the two libraries, and which of them is up is the
   * overlay's business. This bar only says that they were asked for.
   */
  onMaterial?: () => void;
  /** Whether those knobs are the panel currently up. */
  materialOpen?: boolean;
}> = ({ raised = false, onMaterial, materialOpen = false }) => {
  const theme = useStore((s) => s.theme);
  const boxes = useStore((s) => s.boxes);
  const models = useStore((s) => s.models);
  const selectionGuides = useStore((s) => s.selectionGuides);
  const cycleSelectionGuides = useStore((s) => s.cycleSelectionGuides);
  const selectedId = useStore((s) => s.selectedId);
  const selectedModelId = useStore((s) => s.selectedModelId);
  const beginChange = useStore((s) => s.beginChange);
  const scaleModel = useStore((s) => s.scaleModel);
  const sceneSurface = useStore((s) => s.surface);
  const cycleSelectionSurface = useStore((s) => s.cycleSelectionSurface);
  const toggleModelLock = useStore((s) => s.toggleModelLock);
  // The same fade the dock has: this is chrome over a view meant to be drawn
  // from, and chrome that will not get out of the way is a window with a sticker
  // on it. A touch anywhere brings it back.
  const railVisible = useRail();

  const [activeAxis, setActiveAxis] = useState<0 | 1 | 2>(1);
  const [exporting, setExporting] = useState(false);
  const range = useRange();

  const liftSelection = useStore((s) => s.liftSelection);
  const sizeSelection = useStore((s) => s.sizeSelection);
  const heightSelection = useStore((s) => s.heightSelection);
  const removeSelection = useStore((s) => s.removeSelection);
  const companions = useStore((s) => s.companions);

  const box = selectedId ? boxes.find((b) => b.id === selectedId) : null;
  const model = selectedModelId ? models.find((m) => m.id === selectedModelId) : null;
  const lamps = useStore((s) => s.lamps);
  const selectedLampId = useStore((s) => s.selectedLampId);
  const lamp = selectedLampId ? lamps.find((l) => l.id === selectedLampId) : null;

  const height = model ? model.size[1] * model.scale : 0;

  const setHeight = useCallback(
    (metres: number) => heightSelection(clampTo(metres, MIN_HEIGHT, MAX_HEIGHT)),
    [heightSelection]
  );

  /** Whether this one's size is pinned. Only a mesh has the question. */
  const locked = !!model?.lockedScale;

  /**
   * How far off the floor the selection is standing.
   *
   * A model's position is its footprint, so that number is the lift outright. A
   * box's is its centre, so the lift is what is under it.
   */
  const lift = model ? model.position[1] : box ? box.position[1] - box.scale[1] / 2 : 0;

  /*
   * THE NUMBERS ARE READ OFF THE ONE IN HAND AND WRITTEN TO ALL OF THEM.
   *
   * Which is the whole use of picking up a second thing: what a viewer means
   * by holding four figures and dragging the height is that the four of them
   * end up the same height. The reading has to come from one of them - there
   * is one row of digits - and the one it comes from is the one the tap
   * chose, which is also the one the drag moves and the one whose rung the
   * material panel follows. Every other reading here would need a rule for
   * disagreement; this one needs none.
   *
   * The clamps stay here because they are about what the control may ask for.
   * What the store does with the number is the same for one object or four.
   */
  const setLift = useCallback(
    (metres: number) => liftSelection(clampTo(metres, 0, MAX_LIFT)),
    [liftSelection]
  );

  const setBoxDim = useCallback(
    (axis: 0 | 1 | 2, metres: number) =>
      sizeSelection(axis, clampTo(metres, MIN_BOX_DIM, MAX_BOX_DIM)),
    [sizeSelection]
  );

  const activeDim = box ? box.scale[activeAxis] : 0;
  const modelScrub = useScrub(height, setHeight);
  const boxScrub = useScrub(activeDim, (v) => setBoxDim(activeAxis, v));
  const liftScrub = useLift(lift, setLift);

  if (lamp) return <LampBar lamp={lamp} raised={raised} />;
  if (!box && !model) return null;

  /*
   * Which rung this one is on.
   *
   * The scene has a setting and each thing can overrule it, so the button shows
   * what is actually being drawn rather than what the scene would draw by
   * default - and it shows it as the cube itself, so the state and the control
   * are the same mark.
   *
   * Through the shared reading rather than worked out here, because the overlay
   * asks the same question to decide which knobs the panel this bar opens
   * should hold, and the two answers have to be the same answer.
   */
  const surface = selectionSurface({ boxes, models, selectedId, selectedModelId, surface: sceneSurface })!;

  const isDark = theme === 'dark';
  const button = `${snugIconButton(isDark)} border border-transparent`;

  /*
   * Everything in hand, gone, in one step back.
   *
   * It used to be two branches and a deselect - a mesh went through
   * removeModel, a box through removeBox and then a selectBox(null) to put
   * down what no longer existed. The store's own action does the putting down
   * as part of the removal, which is where that belonged: nothing outside it
   * can know whether the hand it just emptied still holds anything.
   */
  const remove = () => removeSelection();

  const exportModel = async () => {
    if (!model?.object || exporting) return;
    setExporting(true);
    try {
      await exportScaledModel(model);
    } catch (error) {
      console.error('Failed to export model:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      /* Inside the dock's own column now, so the column carries the fade and
         the position. All this decides is whether the bar is in the stack at
         all - two fades over one element only ever fight. */
      className={`flex justify-center max-w-full px-2 ${SIDEWAYS_SLOT} pointer-events-none transition-all duration-300 ${
        raised ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      {/* Narrower gaps than the dock has, and it scrolls rather than spills.
          This bar grows with what you can do to a thing, and a control pushed
          off the edge of a phone is not a smaller control, it is a missing one. */}
      <div
        className={`flex items-center max-w-full overflow-x-auto scrollbar-none p-1 sm:p-1.5 gap-0.5 sm:gap-1 rounded-full border shadow-2xl ${
          raised || !railVisible ? 'pointer-events-none' : 'pointer-events-auto'
        } ${chrome(isDark)}`}
      >
        {/* How far away it is. Not a control - the one number in the relation
            between size, distance and eye height that the tool computed and
            never said. No unit, like every other number here. */}
        <div
          className={`${readout(isDark)} cursor-default select-none`}
          aria-label={`${metres(range)} metres away`}
        >
          <span className="text-[13px] font-bold tabular-nums tracking-wide opacity-45">
            {range < 100 ? metres(range) : Math.round(range)}
          </span>
        </div>

        {/*
          * HOW MANY ARE IN THE HAND, and only when it is more than one.
          *
          * Every control to the right of this reads its number off one object
          * and writes to all of them, which is a promise the bar has to make
          * out loud - otherwise dragging the height with four figures held is
          * a control doing four times what it looks like it is doing. It is
          * the accent, because the accent in this app means "this is doing
          * something right now", and it is the same mark the extra objects
          * carry in the scene.
          *
          * A count rather than a list: they are named nowhere else either, and
          * which four they are is answered by looking at the drawing, where
          * all four are outlined.
          */}
        {companions.length > 0 && (
          <div
            className={`${readout(isDark)} !min-w-0 px-2.5 cursor-default select-none !border-sky-500/50`}
            aria-label={`${companions.length + 1} things in hand`}
          >
            <span className="text-[13px] font-bold tabular-nums tracking-wide text-sky-500">
              {companions.length + 1}
            </span>
          </div>
        )}

        {model ? (
          <>
            <button
              {...modelScrub}
              onDoubleClick={() => {
                beginChange();
                scaleModel(model.id, model.baseScale);
              }}
              className={`${readout(isDark)} ${locked ? 'opacity-40 cursor-default' : ''}`}
              aria-label={locked ? 'Height, locked' : 'Height'}
            >
              <span className="text-[13px] font-bold tabular-nums tracking-wide opacity-80">
                {metres(height)}
              </span>
            </button>
            {/* The pin sits against the reading it pins, so what it holds still
                is unambiguous: this mesh's size, and nothing else about it. */}
            <button
              onClick={() => toggleModelLock(model.id)}
              className={`${button} ${locked ? '!text-amber-500' : ''}`}
              aria-label={locked ? 'Size locked' : 'Lock the size'}
            >
              <Icon path={locked ? I.lockSize : I.unlockSize} className="w-5 h-5" />
            </button>
          </>
        ) : (
          <div className="flex items-center">
            <button
              onClick={() => setActiveAxis(((activeAxis + 1) % 3) as 0 | 1 | 2)}
              className={`w-9 h-11 flex items-center justify-center opacity-60 rounded-full transition-colors ${
                isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'
              }`}
              aria-label={AXES[activeAxis].label}
            >
              <Icon path={AXES[activeAxis].icon} className="w-[18px] h-[18px]" />
            </button>
            <button
              {...boxScrub}
              onDoubleClick={() => {
                beginChange();
                setBoxDim(activeAxis, 1);
              }}
              className={readout(isDark)}
              aria-label={AXES[activeAxis].label}
            >
              <span className="text-[13px] font-bold tabular-nums tracking-wide opacity-80">
                {metres(activeDim)}
              </span>
            </button>
          </div>
        )}

        {/* Off the floor. Dragging is the fine control; a double tap puts it
            back down, which is where nearly everything belongs and is the one
            value you cannot find reliably by hand. */}
        <div className="relative flex items-center">
          <button
            {...liftScrub.handlers}
            onDoubleClick={() => {
              beginChange();
              setLift(0);
            }}
            className={`${button} touch-none cursor-ew-resize ${lift > 0.001 ? '!text-amber-500' : ''}`}
            aria-label={`Height off the floor: ${metres(lift)} m`}
          >
            <Icon path={I.lift} className="w-5 h-5" />
          </button>
          {liftScrub.dragging && (
            <div
              className={`absolute left-1/2 -translate-x-1/2 -top-12 pointer-events-none ${bubble(isDark)}`}
            >
              {metres(lift)}
            </div>
          )}
        </div>
        <button
          onClick={cycleSelectionSurface}
          className={button}
          aria-label={`Surface of this one: ${surface}`}
        >
          <Icon path={SURFACE_ICON[surface]} className="w-5 h-5" />
        </button>
        {/*
          * And how that rung is ruled, next to the rung itself.
          *
          * The hatch angle and the marker's hue were three taps away - Tools,
          * find the band, then the knob - and they are the two settings you
          * change while looking at the thing they are drawing, which is
          * exactly when a full-width panel over the drawing is worst. Same
          * panel, same slot, one tap, with the selection still in hand.
          *
          * THIS ONE'S RUNG, NOT THE SCENE'S. It followed the scene at first,
          * which put the knobs for a hatched object out of reach on any page
          * that was not itself hatched - and a single object stepped off the
          * scene's rung is the whole point of the button beside it. The panel
          * is told which rung it was opened for, so what comes up is always
          * what this button promised.
          *
          * Only on the two rungs that have anything to set. A button that
          * opened an empty panel would be worse than no button.
          */}
        {/*
          * THE SELECTION'S OWN VANISHING POINTS, on the bar of the selection
          * they belong to.
          *
          * It was a seat in the tools panel, where it was one of several
          * controls that mean nothing at the moment they are shown: with
          * nothing held there are no points to draw, so the control was a
          * switch for an absence. Here it exists exactly when it has something
          * to say, it is one tap while you are looking at the object rather
          * than three through a panel that covers it, and it costs the panel a
          * seat in its widest band.
          */}
        {/*
          * A LADDER RATHER THAN A SWITCH, and the rungs are a sequence somebody
          * actually works through: the rays out to this thing's own points,
          * then the rectangle it stands on with the diagonals that find the
          * centre of it, then that rectangle divided in four.
          *
          * The diagonals are why the order is this way round. Halving a
          * receding rectangle by eye is guesswork and the guess is always too
          * far off; halving it by its own diagonals is exact, needs no
          * measurement, and holds at any angle on any of these sheets. The tool
          * could say where a thing's points were and had nothing to say about
          * dividing the span between them, which is most of what a viewer is
          * doing when they place the second chair along a table.
          *
          * The glyph is the rung, like every other cycle in this app.
          */}
        <button
          onClick={cycleSelectionGuides}
          aria-label={`Construction on this one: ${
            ['none', 'its own vanishing points', 'the floor under it, halved', 'the floor under it, in four'][selectionGuides]
          }`}
          aria-pressed={selectionGuides > 0}
          className={`${button} ${selectionGuides ? (isDark ? 'bg-white/10' : 'bg-black/10') : ''}`}
        >
          <Icon
            path={selectionGuides === 3 ? I.divideFour : selectionGuides === 2 ? I.divideHalf : I.vanishing}
            className="w-5 h-5"
          />
        </button>

        {onMaterial && surfaceHasSettings(surface) && (
          <button
            onClick={onMaterial}
            aria-label={surfaceSettingsLabel(surface)}
            aria-expanded={materialOpen}
            className={`${button} ${materialOpen ? (isDark ? 'bg-white/10' : 'bg-black/10') : ''}`}
          >
            <Icon path={SETTINGS_ICON[surface]} className="w-5 h-5" />
          </button>
        )}
        {model?.object && (
          <button
            onClick={exportModel}
            className={`${button} ${exporting ? 'opacity-40 animate-pulse' : ''}`}
            aria-label="Export this mesh at its current size"
          >
            <Icon path={I.upload} className="w-5 h-5 rotate-180" />
          </button>
        )}
        <button onClick={remove} className={`${button} !text-red-500`} aria-label="Delete">
          <Icon path={I.trash} className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
