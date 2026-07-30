import React from 'react';
import { useStore } from '../store';
import { useLayout } from '../lib/useLayout';

const STEP = Math.PI / 12; // 15 degrees

/**
 * What you can do to the thing you just tapped: turn it, size it, delete it.
 *
 * Numbers only - the readout is metres, which is the one piece of text worth
 * keeping on screen, because sizing against a known height is the whole point.
 */
export const SelectionBar: React.FC = () => {
  const theme = useStore((s) => s.theme);
  const layout = useLayout();
  const cameraFeed = useStore((s) => s.cameraFeed);
  const boxes = useStore((s) => s.boxes);
  const models = useStore((s) => s.models);
  const selectedId = useStore((s) => s.selectedId);
  const selectedModelId = useStore((s) => s.selectedModelId);
  const rotateSelection = useStore((s) => s.rotateSelection);
  const duplicateSelection = useStore((s) => s.duplicateSelection);
  const scaleModel = useStore((s) => s.scaleModel);
  const removeBox = useStore((s) => s.removeBox);
  const removeModel = useStore((s) => s.removeModel);
  const selectBox = useStore((s) => s.selectBox);

  const box = selectedId ? boxes.find((b) => b.id === selectedId) : null;
  const model = selectedModelId ? models.find((m) => m.id === selectedModelId) : null;
  if (!box && !model) return null;

  const isDark = theme === 'dark';
  const onCamera = cameraFeed || isDark;
  const chrome = onCamera
    ? 'bg-black/60 text-white border-white/25'
    : 'bg-white/80 text-gray-900 border-gray-300';

  const remove = () => {
    if (model) removeModel(model.id);
    else if (box) { removeBox(box.id); selectBox(null); }
  };

  const size = layout === 'desktop' ? 'w-10 h-10' : 'w-12 h-12';
  const iconButton = `flex items-center justify-center ${size} rounded-full border backdrop-blur-md transition-transform active:scale-95 ${chrome}`;

  // Models scale uniformly; the slider is logarithmic so the useful range -
  // a doll to a building - fits under one thumb.
  const sliderValue = model ? Math.log10(model.scale) : 0;
  const height = model ? model.size[1] * model.scale : 0;

  return (
    // Clear of whichever control surface this layout has: the phone's bottom
    // bar, or the tablet's right-hand rail.
    <div className={`absolute inset-x-0 z-40 flex justify-center pointer-events-none ${
      layout === 'phone' ? 'bottom-28 px-4' : layout === 'tablet' ? 'bottom-6 pl-4 pr-24' : 'bottom-6 px-4'
    }`}>
      <div className="flex items-center gap-2 pointer-events-auto">
        <button onClick={() => rotateSelection(-STEP)} className={iconButton} aria-label="Turn left">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <polyline points="3 4 3 9 8 9" />
          </svg>
        </button>

        <div className={`px-3 py-2 rounded-2xl border backdrop-blur-md ${chrome}`}>
          <div className="text-[11px] font-black tabular-nums leading-none text-center">
            {model
              ? `${height.toFixed(2)} m`
              : `${box!.scale.map((v) => v.toFixed(2)).join(' × ')} m`}
          </div>

          {model && (
            <input
              type="range"
              min={-1.4}
              max={1.4}
              step={0.01}
              value={sliderValue}
              onChange={(e) => scaleModel(model.id, Math.pow(10, parseFloat(e.target.value)))}
              onDoubleClick={() => scaleModel(model.id, model.baseScale)}
              className="w-36 mt-2 accent-current align-middle"
              aria-label="Scale"
            />
          )}
        </div>

        <button onClick={() => rotateSelection(STEP)} className={iconButton} aria-label="Turn right">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <polyline points="21 4 21 9 16 9" />
          </svg>
        </button>

        <button onClick={duplicateSelection} className={iconButton} aria-label="Duplicate">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
          </svg>
        </button>

        <button onClick={remove} className={`${iconButton} !text-red-500`} aria-label="Delete">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
};
