import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Icon, I } from './icons';
import { bubble, chrome, readout, snugIconButton } from './ui';
import { exportScaledModel } from '../lib/exportModel';
import { SURFACE_ICON } from './icons';
import { useRail } from '../lib/rail';
import { selectionRange } from '../lib/focus';
import { BOX_SURFACES, MESH_SURFACES, nearestSurface } from '../types';
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
 * change how solidly it is drawn, copy it, delete it - and, for a mesh, take it
 * away at the size you settled on.
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
  const brightScrub = useScrub(lamp.intensity, (value) =>
    updateLamp(lamp.id, { intensity: Math.min(60, Math.max(0.2, Math.round(value * 10) / 10)) })
  );
  // Linear, like the lift: a temperature is a position on a scale, not a size.
  const warmth = useRef<{ id: number; x: number; from: number; changed: boolean } | null>(null);
  const warmthScrub = {
    onPointerDown: (e: React.PointerEvent) => {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch { /* still sees the moves */ }
      warmth.current = { id: e.pointerId, x: e.clientX, from: lamp.temperature, changed: false };
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (warmth.current?.id !== e.pointerId) return;
      if (!warmth.current.changed) {
        warmth.current.changed = true;
        beginChange();
      }
      const kelvin = warmth.current.from + (e.clientX - warmth.current.x) * 25;
      updateLamp(lamp.id, {
        temperature: Math.round(Math.min(12000, Math.max(1800, kelvin)) / 50) * 50,
      });
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (warmth.current?.id === e.pointerId) warmth.current = null;
    },
    onPointerCancel: () => {
      warmth.current = null;
    },
  };
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
      className={`flex justify-center max-w-full px-2 pointer-events-none transition-all duration-300 ${
        raised ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      <div
        className={`flex items-center max-w-full overflow-x-auto scrollbar-none p-1 sm:p-1.5 gap-0.5 sm:gap-1 rounded-full border shadow-2xl ${
          raised || !railVisible ? 'pointer-events-none' : 'pointer-events-auto'
        } ${chrome(isDark)}`}
      >
        {reading(metres(lamp.position[1]), 'Height off the floor - drag to change', liftScrub.handlers)}
        {reading(lamp.intensity.toFixed(1), 'Brightness - drag to change', brightScrub)}
        {reading(`${lamp.temperature}K`, 'Colour temperature - drag to change', warmthScrub, true)}
        {lamp.kind === 'spot' &&
          reading(
            `${Math.round((((lamp.aim * 180) / Math.PI) % 360 + 360) % 360)}°`,
            'Aim - drag to swing the spot',
            aimScrub
          )}
        <button
          onClick={() => {
            beginChange();
            updateLamp(lamp.id, { kind: lamp.kind === 'bulb' ? 'spot' : 'bulb' });
          }}
          aria-label={`Lamp kind: ${lamp.kind}`}
          className={button}
        >
          <Icon path={lamp.kind === 'bulb' ? I.lampBulb : I.lampSpot} className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            beginChange();
            updateLamp(lamp.id, { enabled: !lamp.enabled });
          }}
          aria-label="Lamp on"
          aria-pressed={lamp.enabled}
          className={`${button} ${lamp.enabled ? '!text-sky-500' : 'opacity-40'}`}
        >
          <Icon path={I.power} className="w-5 h-5" />
        </button>
        <button onClick={useStore.getState().stampRow} className={button} aria-label="Stamp a row of these">
          <Icon path={I.row} className="w-5 h-5" />
        </button>
        <button onClick={() => removeLamp(lamp.id)} className={`${button} !text-red-500`} aria-label="Delete">
          <Icon path={I.trash} className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export const SelectionBar: React.FC<{ raised?: boolean }> = ({ raised = false }) => {
  const theme = useStore((s) => s.theme);
  const boxes = useStore((s) => s.boxes);
  const models = useStore((s) => s.models);
  const selectedId = useStore((s) => s.selectedId);
  const selectedModelId = useStore((s) => s.selectedModelId);
  const duplicateSelection = useStore((s) => s.duplicateSelection);
  const stampRow = useStore((s) => s.stampRow);
  const beginChange = useStore((s) => s.beginChange);
  const scaleModel = useStore((s) => s.scaleModel);
  const updateBox = useStore((s) => s.updateBox);
  const removeBox = useStore((s) => s.removeBox);
  const removeModel = useStore((s) => s.removeModel);
  const selectBox = useStore((s) => s.selectBox);
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

  const updateModel = useStore((s) => s.updateModel);

  const box = selectedId ? boxes.find((b) => b.id === selectedId) : null;
  const model = selectedModelId ? models.find((m) => m.id === selectedModelId) : null;
  const lamps = useStore((s) => s.lamps);
  const selectedLampId = useStore((s) => s.selectedLampId);
  const lamp = selectedLampId ? lamps.find((l) => l.id === selectedLampId) : null;

  const height = model ? model.size[1] * model.scale : 0;

  const setHeight = useCallback(
    (metres: number) => {
      if (!model || model.size[1] < 1e-6) return;
      scaleModel(model.id, clampTo(metres, MIN_HEIGHT, MAX_HEIGHT) / model.size[1]);
    },
    [model, scaleModel]
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

  const setLift = useCallback(
    (metres: number) => {
      const risen = clampTo(metres, 0, MAX_LIFT);
      if (model) {
        updateModel(model.id, { position: [model.position[0], risen, model.position[2]] });
      } else if (box) {
        updateBox(box.id, {
          position: [box.position[0], risen + box.scale[1] / 2, box.position[2]],
        });
      }
    },
    [box, model, updateBox, updateModel]
  );

  const setBoxDim = useCallback(
    (axis: 0 | 1 | 2, metres: number) => {
      if (!box) return;
      const snapped = clampTo(metres, MIN_BOX_DIM, MAX_BOX_DIM);
      const scale = [...box.scale] as [number, number, number];
      scale[axis] = snapped;
      const position = [...box.position] as [number, number, number];
      // Growing a box upwards keeps it standing on whatever it stands on -
      // which is the floor unless it has been lifted off it, and used to be the
      // floor either way, so resizing a raised box dropped it.
      if (axis === 1) position[1] = box.position[1] - box.scale[1] / 2 + snapped / 2;
      updateBox(box.id, { scale, position });
    },
    [box, updateBox]
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
   */
  const surface = model
    ? nearestSurface(model.surface ?? sceneSurface, MESH_SURFACES)
    : nearestSurface(box!.surface ?? sceneSurface, BOX_SURFACES);

  const isDark = theme === 'dark';
  const button = `${snugIconButton(isDark)} border border-transparent`;

  const remove = () => {
    if (model) removeModel(model.id);
    else if (box) {
      removeBox(box.id);
      selectBox(null);
    }
  };

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
      className={`flex justify-center max-w-full px-2 pointer-events-none transition-all duration-300 ${
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
        <button onClick={duplicateSelection} className={button} aria-label="Duplicate">
          <Icon path={I.duplicate} className="w-5 h-5" />
        </button>
        {/* The diminution lesson in one press: four more, marching along the
            selection's own facing towards their shared point. Turn the thing
            to aim the row. */}
        <button onClick={stampRow} className={button} aria-label="Stamp a row of these">
          <Icon path={I.row} className="w-5 h-5" />
        </button>
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
