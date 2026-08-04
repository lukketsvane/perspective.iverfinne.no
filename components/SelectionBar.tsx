import React, { useCallback, useRef } from 'react';
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

/**
 * What you can do to the thing you just tapped: turn it, size it, delete it.
 *
 * Sizing is the one that has to be exact, because the whole tool is about a
 * figure being the right height next to a 1 m cube. So the height is a control
 * rather than a readout: drag it to scrub, and it moves by a fixed proportion
 * of what it already is - so 5 cm and 5 m are equally reachable - landing on
 * whole centimetres either way. The buttons on each side step one centimetre
 * exactly, which is what a slider could never do. Double-tap to go back to the
 * height it was placed at.
 *
 * For boxes, three scrub controls (W × H × D) replace the plain readout so the
 * dimensions are directly editable without having to drag a 3-D face.
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

  const scrub = useRef<{ id: number; x: number; height: number } | null>(null);
  // Per-axis box scrubbers: axis 0=W, 1=H, 2=D
  const boxScrub = useRef<{ id: number; x: number; value: number; axis: 0 | 1 | 2 } | null>(null);

  const box = selectedId ? boxes.find((b) => b.id === selectedId) : null;
  const model = selectedModelId ? models.find((m) => m.id === selectedModelId) : null;

  const height = model ? model.size[1] * model.scale : 0;

  /** Set the model's height in metres, on the centimetre. */
  const setHeight = useCallback(
    (metres: number) => {
      if (!model || model.size[1] < 1e-6) return;
      scaleModel(model.id, quantise(metres) / model.size[1]);
    },
    [model, scaleModel]
  );

  /** Set one axis of a box's scale, keeping the bottom face on the ground. */
  const setBoxDim = useCallback(
    (axis: 0 | 1 | 2, metres: number) => {
      if (!box) return;
      const snapped = quantiseBox(metres);
      const newScale: [number, number, number] = [...box.scale] as [number, number, number];
      newScale[axis] = snapped;
      // Height axis: keep the bottom face on the ground by lifting the centre.
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

  // Six controls plus a readout have to fit across the narrowest phone there
  // is - 393 px - without a single one falling off the edge.
  const size = layout === 'desktop' ? 'w-10 h-10' : layout === 'phone' ? 'w-11 h-11' : 'w-12 h-12';
  const readout = layout === 'phone' ? 'min-w-[4.25rem]' : 'min-w-[5.5rem]';
  const iconButton = `flex items-center justify-center ${size} rounded-full border backdrop-blur-md transition-transform active:scale-95 ${chrome}`;

  // A drag across the readout multiplies the height, so the control has the
  // same feel at every size instead of crawling at one end and flying at the
  // other. 0.6% per pixel: a thumb's width is about 30%.
  const onScrubDown = (e: React.PointerEvent) => {
    if (!model) return;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    scrub.current = { id: e.pointerId, x: e.clientX, height };
  };

  const onScrubMove = (e: React.PointerEvent) => {
    if (!scrub.current || scrub.current.id !== e.pointerId) return;
    setHeight(scrub.current.height * Math.pow(1.006, e.clientX - scrub.current.x));
  };

  const onScrubUp = (e: React.PointerEvent) => {
    if (scrub.current?.id === e.pointerId) scrub.current = null;
  };

  const onBoxScrubDown = (e: React.PointerEvent, axis: 0 | 1 | 2) => {
    if (!box) return;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    boxScrub.current = { id: e.pointerId, x: e.clientX, value: box.scale[axis], axis };
  };

  const onBoxScrubMove = (e: React.PointerEvent) => {
    if (!boxScrub.current || boxScrub.current.id !== e.pointerId) return;
    const { value, axis } = boxScrub.current;
    setBoxDim(axis, value * Math.pow(1.006, e.clientX - boxScrub.current.x));
  };

  const onBoxScrubUp = (e: React.PointerEvent) => {
    if (boxScrub.current?.id === e.pointerId) boxScrub.current = null;
  };

  /** A single scrub readout for one box axis. */
  const BoxDimScrub = ({ axis, label }: { axis: 0 | 1 | 2; label: string }) => {
    if (!box) return null;
    const dim = box.scale[axis];
    return (
      <div className={`flex items-center rounded-full border backdrop-blur-md ${chrome}`}>
        <button
          onClick={() => setBoxDim(axis, dim - CM)}
          className={`flex items-center justify-center ${size} rounded-full active:scale-95`}
          aria-label={`${label} smaller`}
        >
          <Icon path={I.minus} className="w-4 h-4" />
        </button>
        <div
          onPointerDown={(e) => onBoxScrubDown(e, axis)}
          onPointerMove={onBoxScrubMove}
          onPointerUp={onBoxScrubUp}
          onPointerCancel={onBoxScrubUp}
          onDoubleClick={() => setBoxDim(axis, 1)}
          className={`px-1 ${readout} text-center text-[13px] font-black tabular-nums cursor-ew-resize touch-none select-none`}
          role="slider"
          aria-label={label}
          aria-valuenow={Math.round(dim * 100)}
          aria-valuemin={Math.round(MIN_BOX_DIM * 100)}
          aria-valuemax={Math.round(MAX_BOX_DIM * 100)}
        >
          {dim.toFixed(2)} m
        </div>
        <button
          onClick={() => setBoxDim(axis, dim + CM)}
          className={`flex items-center justify-center ${size} rounded-full active:scale-95`}
          aria-label={`${label} larger`}
        >
          <Icon path={I.plus} className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    // Clear of whichever control surface this layout has. On a tablet that
    // means the top edge: the rail owns the right, and a panel can be docked
    // along the bottom in portrait - which is exactly how this bar used to end
    // up underneath a menu, unreachable.
    <div className={`fixed inset-x-0 z-40 flex justify-center pointer-events-none ${
      layout === 'phone'
        ? `${raised ? 'above-rail-strip' : 'bottom-safe-panel'} pl-2 pr-[5.25rem] justify-end`
        : layout === 'tablet'
        ? 'top-4 pl-4 pr-24 safe-top'
        : `${raised ? 'bottom-28' : 'bottom-6'} px-4`
    }`}>
      <div className={`flex items-center pointer-events-auto flex-wrap justify-end ${layout === 'phone' ? 'gap-1' : 'gap-1.5'}`}>
        <button onClick={() => rotateSelection(-STEP)} className={iconButton} aria-label="Turn left">
          <Icon path={I.turnLeft} className="w-4 h-4" />
        </button>
        <button onClick={() => rotateSelection(STEP)} className={iconButton} aria-label="Turn right">
          <Icon path={I.turnRight} className="w-4 h-4" />
        </button>

        {model ? (
          <div className={`flex items-center rounded-full border backdrop-blur-md ${chrome}`}>
            <button
              onClick={() => setHeight(height - CM)}
              className={`flex items-center justify-center ${size} rounded-full active:scale-95`}
              aria-label="Shorter"
            >
              <Icon path={I.minus} className="w-4 h-4" />
            </button>

            <div
              onPointerDown={onScrubDown}
              onPointerMove={onScrubMove}
              onPointerUp={onScrubUp}
              onPointerCancel={onScrubUp}
              onDoubleClick={() => scaleModel(model.id, model.baseScale)}
              className={`px-1 ${readout} text-center text-[13px] font-black tabular-nums cursor-ew-resize touch-none select-none`}
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
          <>
            <BoxDimScrub axis={0} label="Width" />
            <BoxDimScrub axis={1} label="Height" />
            <BoxDimScrub axis={2} label="Depth" />
          </>
        )}

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
