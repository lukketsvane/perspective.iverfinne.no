import React, { useCallback, useRef, useState } from 'react';
import { useStore } from '../store';
import { useLayout } from '../lib/useLayout';
import { Icon, I } from './icons';

const STEP = Math.PI / 12; // 15 degrees

/** Everything sizes to the centimetre. Below that is not a drawing decision. */
const CM = 0.01;

/** Smallest and largest a placed model may be made, in metres. */
const MIN_HEIGHT = 0.05;
const MAX_HEIGHT = 200;

const MIN_BOX_DIM = 0.1;
const MAX_BOX_DIM = 200;

const quantise = (metres: number) =>
  Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(metres / CM) * CM));

const quantiseBox = (metres: number) =>
  Math.min(MAX_BOX_DIM, Math.max(MIN_BOX_DIM, Math.round(metres / CM) * CM));

const AXIS_LABELS: ['W', 'H', 'D'] = ['W', 'H', 'D'];

/**
 * What you can do to the thing you just tapped: turn it, size it, delete it.
 *
 * For models, drag the height scrub or tap −/+ to resize.
 * For boxes, one compact pill shows all three dimensions; tap the axis label
 * to cycle which axis the −/drag/+ controls act on.
 */
export const SelectionBar: React.FC<{ raised?: boolean }> = ({ raised = false }) => {
  const theme = useStore((s) => s.theme);
  const layout = useLayout();
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

  // Which axis is active for box editing; cycles on tap of the axis label
  const [activeAxis, setActiveAxis] = useState<0 | 1 | 2>(1); // default Height

  const modelScrub = useRef<{ id: number; x: number; height: number } | null>(null);
  const boxScrub = useRef<{ id: number; x: number; value: number } | null>(null);

  const box = selectedId ? boxes.find((b) => b.id === selectedId) : null;
  const model = selectedModelId ? models.find((m) => m.id === selectedModelId) : null;

  const height = model ? model.size[1] * model.scale : 0;

  const setHeight = useCallback(
    (metres: number) => {
      if (!model || model.size[1] < 1e-6) return;
      scaleModel(model.id, quantise(metres) / model.size[1]);
    },
    [model, scaleModel]
  );

  const setBoxDim = useCallback(
    (axis: 0 | 1 | 2, metres: number) => {
      if (!box) return;
      const snapped = quantiseBox(metres);
      const newScale: [number, number, number] = [...box.scale] as [number, number, number];
      newScale[axis] = snapped;
      const newPos: [number, number, number] = [...box.position] as [number, number, number];
      if (axis === 1) newPos[1] = snapped / 2;
      updateBox(box.id, { scale: newScale, position: newPos });
    },
    [box, updateBox]
  );

  if (!box && !model) return null;

  const isDark = theme === 'dark';
  const chrome = isDark
    ? 'bg-black/60 text-white border-white/25'
    : 'bg-white/80 text-gray-900 border-gray-300';

  const remove = () => {
    if (model) removeModel(model.id);
    else if (box) { removeBox(box.id); selectBox(null); }
  };

  const size = layout === 'desktop' ? 'w-10 h-10' : layout === 'phone' ? 'w-11 h-11' : 'w-12 h-12';
  const iconButton = `flex items-center justify-center ${size} rounded-full border backdrop-blur-md transition-transform active:scale-95 ${chrome}`;

  // ── model scrub handlers ──────────────────────────────────────────────────
  const onModelScrubDown = (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /**/ }
    modelScrub.current = { id: e.pointerId, x: e.clientX, height };
  };
  const onModelScrubMove = (e: React.PointerEvent) => {
    if (!modelScrub.current || modelScrub.current.id !== e.pointerId) return;
    setHeight(modelScrub.current.height * Math.pow(1.006, e.clientX - modelScrub.current.x));
  };
  const onModelScrubUp = (e: React.PointerEvent) => {
    if (modelScrub.current?.id === e.pointerId) modelScrub.current = null;
  };

  // ── box scrub handlers ────────────────────────────────────────────────────
  const activeDim = box ? box.scale[activeAxis] : 0;

  const onBoxScrubDown = (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /**/ }
    boxScrub.current = { id: e.pointerId, x: e.clientX, value: activeDim };
  };
  const onBoxScrubMove = (e: React.PointerEvent) => {
    if (!boxScrub.current || boxScrub.current.id !== e.pointerId) return;
    setBoxDim(activeAxis, boxScrub.current.value * Math.pow(1.006, e.clientX - boxScrub.current.x));
  };
  const onBoxScrubUp = (e: React.PointerEvent) => {
    if (boxScrub.current?.id === e.pointerId) boxScrub.current = null;
  };

  const cycleAxis = () => setActiveAxis(((activeAxis + 1) % 3) as 0 | 1 | 2);

  return (
    <div className={`fixed inset-x-0 z-40 flex justify-center pointer-events-none ${
      layout === 'phone'
        ? `${raised ? 'above-rail-strip' : 'bottom-safe-panel'} pl-2 pr-[5.25rem] justify-end`
        : layout === 'tablet'
        ? 'top-4 pl-4 pr-24 safe-top'
        : `${raised ? 'bottom-28' : 'bottom-6'} px-4`
    }`}>
      <div className={`flex items-center pointer-events-auto ${layout === 'phone' ? 'gap-1' : 'gap-1.5'}`}>
        {/* rotate */}
        <button onClick={() => rotateSelection(-STEP)} className={iconButton} aria-label="Turn left">
          <Icon path={I.turnLeft} className="w-4 h-4" />
        </button>
        <button onClick={() => rotateSelection(STEP)} className={iconButton} aria-label="Turn right">
          <Icon path={I.turnRight} className="w-4 h-4" />
        </button>

        {model ? (
          /* ── model: single height scrub ─────────────────────────── */
          <div className={`flex items-center rounded-full border backdrop-blur-md ${chrome}`}>
            <button
              onClick={() => setHeight(height - CM)}
              className={`flex items-center justify-center ${size} rounded-full active:scale-95`}
              aria-label="Shorter"
            >
              <Icon path={I.minus} className="w-4 h-4" />
            </button>
            <div
              onPointerDown={onModelScrubDown}
              onPointerMove={onModelScrubMove}
              onPointerUp={onModelScrubUp}
              onPointerCancel={onModelScrubUp}
              onDoubleClick={() => scaleModel(model.id, model.baseScale)}
              className="px-1 min-w-[4.5rem] text-center text-[13px] font-black tabular-nums cursor-ew-resize touch-none select-none"
              role="slider"
              aria-label="Height"
              aria-valuenow={Math.round(height * 100)}
              aria-valuemin={Math.round(MIN_HEIGHT * 100)}
              aria-valuemax={Math.round(MAX_HEIGHT * 100)}
            >
              {height.toFixed(2)} m
            </div>
            <button
              onClick={() => setHeight(height + CM)}
              className={`flex items-center justify-center ${size} rounded-full active:scale-95`}
              aria-label="Taller"
            >
              <Icon path={I.plus} className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* ── box: compact single-axis pill ──────────────────────── */
          <div className={`flex items-center rounded-full border backdrop-blur-md ${chrome}`}>
            <button
              onClick={() => setBoxDim(activeAxis, activeDim - CM)}
              className={`flex items-center justify-center ${size} rounded-full active:scale-95`}
              aria-label="Smaller"
            >
              <Icon path={I.minus} className="w-4 h-4" />
            </button>

            {/* tap axis label to cycle W→H→D */}
            <button
              onClick={cycleAxis}
              className="text-[11px] font-black opacity-50 w-5 shrink-0 text-center select-none"
              aria-label="Cycle axis"
              title="Tap to switch W / H / D"
            >
              {AXIS_LABELS[activeAxis]}
            </button>

            <div
              onPointerDown={onBoxScrubDown}
              onPointerMove={onBoxScrubMove}
              onPointerUp={onBoxScrubUp}
              onPointerCancel={onBoxScrubUp}
              onDoubleClick={() => setBoxDim(activeAxis, 1)}
              className="px-1 min-w-[3.5rem] text-center text-[13px] font-black tabular-nums cursor-ew-resize touch-none select-none"
              role="slider"
              aria-label={AXIS_LABELS[activeAxis]}
              aria-valuenow={Math.round(activeDim * 100)}
              aria-valuemin={Math.round(MIN_BOX_DIM * 100)}
              aria-valuemax={Math.round(MAX_BOX_DIM * 100)}
            >
              {activeDim.toFixed(2)} m
            </div>

            <button
              onClick={() => setBoxDim(activeAxis, activeDim + CM)}
              className={`flex items-center justify-center ${size} rounded-full active:scale-95`}
              aria-label="Larger"
            >
              <Icon path={I.plus} className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* duplicate & delete */}
        <button onClick={duplicateSelection} className={iconButton} aria-label="Duplicate">
          <Icon path={I.duplicate} className="w-4 h-4" />
        </button>
        <button onClick={remove} className={`${iconButton} !text-red-500`} aria-label="Delete">
          <Icon path={I.trash} className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};


