import React, { useCallback, useRef, useState } from 'react';
import { useStore } from '../store';
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
  const [scrubActive, setScrubActive] = useState(false);

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
    ? 'bg-black/60 text-white border-white/20'
    : 'bg-white/80 text-black border-gray-300';

  const remove = () => {
    if (model) removeModel(model.id);
    else if (box) { removeBox(box.id); selectBox(null); }
  };

  const iconButton = `flex items-center justify-center w-11 h-11 rounded-full border border-transparent backdrop-blur-md transition-transform active:scale-95 ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`;

  const onModelScrubDown = (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { }
    modelScrub.current = { id: e.pointerId, x: e.clientX, height };
    setScrubActive(true);
  };
  const onModelScrubMove = (e: React.PointerEvent) => {
    if (!modelScrub.current || modelScrub.current.id !== e.pointerId) return;
    setHeight(modelScrub.current.height * Math.pow(1.006, e.clientX - modelScrub.current.x));
  };
  const onModelScrubUp = (e: React.PointerEvent) => {
    if (modelScrub.current?.id === e.pointerId) {
      modelScrub.current = null;
      setScrubActive(false);
    }
  };

  const activeDim = box ? box.scale[activeAxis] : 0;

  const onBoxScrubDown = (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { }
    boxScrub.current = { id: e.pointerId, x: e.clientX, value: activeDim };
    setScrubActive(true);
  };
  const onBoxScrubMove = (e: React.PointerEvent) => {
    if (!boxScrub.current || boxScrub.current.id !== e.pointerId) return;
    setBoxDim(activeAxis, boxScrub.current.value * Math.pow(1.006, e.clientX - boxScrub.current.x));
  };
  const onBoxScrubUp = (e: React.PointerEvent) => {
    if (boxScrub.current?.id === e.pointerId) {
      boxScrub.current = null;
      setScrubActive(false);
    }
  };

  const cycleAxis = () => setActiveAxis(((activeAxis + 1) % 3) as 0 | 1 | 2);

  return (
    <div className={`fixed inset-x-0 z-40 flex justify-center pointer-events-none transition-all duration-300 ${raised ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100 bottom-safe-panel'}`}>
      <div className={`flex items-center pointer-events-auto p-1.5 gap-1 rounded-full border backdrop-blur-2xl shadow-2xl ${chrome}`}>
        <button onClick={() => rotateSelection(-STEP)} className={iconButton} aria-label="Turn left">
          <Icon path={I.turnLeft} className="w-5 h-5" />
        </button>
        <button onClick={() => rotateSelection(STEP)} className={iconButton} aria-label="Turn right">
          <Icon path={I.turnRight} className="w-5 h-5" />
        </button>

        {model ? (
          <div className="relative flex justify-center items-center px-1">
            <button
              onPointerDown={onModelScrubDown}
              onPointerMove={onModelScrubMove}
              onPointerUp={onModelScrubUp}
              onPointerCancel={onModelScrubUp}
              onDoubleClick={() => scaleModel(model.id, model.baseScale)}
              className={`flex items-center justify-center min-w-[5.5rem] px-3 h-11 rounded-full touch-none cursor-ew-resize border backdrop-blur-md transition-colors ${isDark ? 'bg-black/50 border-white/20 hover:bg-white/10' : 'bg-white/80 border-gray-300 hover:bg-black/5'}`}
              aria-label="Height"
            >
              <span className="text-[13px] font-bold tabular-nums tracking-wide opacity-80">
                {Math.round(height * 100)} cm
              </span>
            </button>
          </div>
        ) : (
          <div className="relative flex justify-center items-center px-1">
            <button
              onClick={cycleAxis}
              className={`w-8 h-11 flex items-center justify-center text-[10px] font-black opacity-60 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
            >
              {AXIS_LABELS[activeAxis]}
            </button>
            <button
              onPointerDown={onBoxScrubDown}
              onPointerMove={onBoxScrubMove}
              onPointerUp={onBoxScrubUp}
              onPointerCancel={onBoxScrubUp}
              onDoubleClick={() => setBoxDim(activeAxis, 1)}
              className={`flex items-center justify-center min-w-[5.5rem] px-3 h-11 rounded-full touch-none cursor-ew-resize border backdrop-blur-md transition-colors ${isDark ? 'bg-black/50 border-white/20 hover:bg-white/10' : 'bg-white/80 border-gray-300 hover:bg-black/5'}`}
              aria-label={AXIS_LABELS[activeAxis]}
            >
              <span className="text-[13px] font-bold tabular-nums tracking-wide opacity-80">
                {Math.round(activeDim * 100)} cm
              </span>
            </button>
          </div>
        )}

        <button onClick={duplicateSelection} className={iconButton} aria-label="Duplicate">
          <Icon path={I.duplicate} className="w-5 h-5" />
        </button>
        <button onClick={remove} className={`${iconButton} !text-red-500`} aria-label="Delete">
          <Icon path={I.trash} className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};


