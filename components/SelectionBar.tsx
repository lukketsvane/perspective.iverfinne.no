import React, { useCallback, useRef, useState } from 'react';
import { useStore } from '../store';
import { Icon, I } from './icons';
import { chrome, iconButton, readout } from './ui';
import { exportScaledModel } from '../lib/exportModel';

const STEP = Math.PI / 12; // 15 degrees

/** Everything sizes to the centimetre. Below that is not a drawing decision. */
const CM = 0.01;

/** Smallest and largest a placed model may be made, in metres. */
const MIN_HEIGHT = 0.05;
const MAX_HEIGHT = 200;

const MIN_BOX_DIM = 0.1;
const MAX_BOX_DIM = 200;

/** How fast a horizontal drag grows the reading: about 0.6 % per pixel. */
const SCRUB_RATE = 1.006;

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
  const held = useRef<{ id: number; x: number; from: number } | null>(null);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* not capturable; the element still sees the moves */
      }
      held.current = { id: e.pointerId, x: e.clientX, from: value };
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (held.current?.id !== e.pointerId) return;
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
 * What you can do to the thing you just tapped: turn it, size it, copy it,
 * delete it - and, for a mesh, take it away at the size you settled on.
 *
 * For models the reading is the height. For boxes one pill shows one axis at a
 * time; tap the letter to move to the next.
 */
export const SelectionBar: React.FC<{ raised?: boolean }> = ({ raised = false }) => {
  const theme = useStore((s) => s.theme);
  const boxes = useStore((s) => s.boxes);
  const models = useStore((s) => s.models);
  const selectedId = useStore((s) => s.selectedId);
  const selectedModelId = useStore((s) => s.selectedModelId);
  const rotateSelection = useStore((s) => s.rotateSelection);
  const duplicateSelection = useStore((s) => s.duplicateSelection);
  const scaleModel = useStore((s) => s.scaleModel);
  const updateBox = useStore((s) => s.updateBox);
  const removeBox = useStore((s) => s.removeBox);
  const removeModel = useStore((s) => s.removeModel);
  const selectBox = useStore((s) => s.selectBox);

  const [activeAxis, setActiveAxis] = useState<0 | 1 | 2>(1);
  const [exporting, setExporting] = useState(false);

  const box = selectedId ? boxes.find((b) => b.id === selectedId) : null;
  const model = selectedModelId ? models.find((m) => m.id === selectedModelId) : null;

  const height = model ? model.size[1] * model.scale : 0;

  const setHeight = useCallback(
    (metres: number) => {
      if (!model || model.size[1] < 1e-6) return;
      scaleModel(model.id, clampTo(metres, MIN_HEIGHT, MAX_HEIGHT) / model.size[1]);
    },
    [model, scaleModel]
  );

  const setBoxDim = useCallback(
    (axis: 0 | 1 | 2, metres: number) => {
      if (!box) return;
      const snapped = clampTo(metres, MIN_BOX_DIM, MAX_BOX_DIM);
      const scale = [...box.scale] as [number, number, number];
      scale[axis] = snapped;
      const position = [...box.position] as [number, number, number];
      // Growing a box upwards keeps it standing on the ground.
      if (axis === 1) position[1] = snapped / 2;
      updateBox(box.id, { scale, position });
    },
    [box, updateBox]
  );

  const activeDim = box ? box.scale[activeAxis] : 0;
  const modelScrub = useScrub(height, setHeight);
  const boxScrub = useScrub(activeDim, (v) => setBoxDim(activeAxis, v));

  if (!box && !model) return null;

  const isDark = theme === 'dark';
  const button = `${iconButton(isDark)} border border-transparent`;

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
      className={`fixed inset-x-0 z-40 flex justify-center pointer-events-none transition-all duration-300 ${
        raised ? 'opacity-0 scale-95' : 'opacity-100 scale-100 bottom-safe-panel'
      }`}
    >
      <div
        className={`flex items-center pointer-events-auto p-1.5 gap-1 rounded-full border shadow-2xl ${chrome(isDark)}`}
      >
        <button onClick={() => rotateSelection(-STEP)} className={button} aria-label="Turn left">
          <Icon path={I.turnLeft} className="w-5 h-5" />
        </button>
        <button onClick={() => rotateSelection(STEP)} className={button} aria-label="Turn right">
          <Icon path={I.turnRight} className="w-5 h-5" />
        </button>

        {model ? (
          <button
            {...modelScrub}
            onDoubleClick={() => scaleModel(model.id, model.baseScale)}
            className={readout(isDark)}
            aria-label="Height"
          >
            <span className="text-[13px] font-bold tabular-nums tracking-wide opacity-80">
              {metres(height)}
            </span>
          </button>
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
              onDoubleClick={() => setBoxDim(activeAxis, 1)}
              className={readout(isDark)}
              aria-label={AXES[activeAxis].label}
            >
              <span className="text-[13px] font-bold tabular-nums tracking-wide opacity-80">
                {metres(activeDim)}
              </span>
            </button>
          </div>
        )}

        <button onClick={duplicateSelection} className={button} aria-label="Duplicate">
          <Icon path={I.duplicate} className="w-5 h-5" />
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
