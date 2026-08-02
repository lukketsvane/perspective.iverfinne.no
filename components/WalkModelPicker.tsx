import React from 'react';
import { useStore } from '../store';

/**
 * Existing-model chooser for walk mode.
 *
 * The full-screen look surface deliberately owns scene taps, so selecting a
 * GLB through the canvas would also turn the camera. This compact list gives
 * every imported model an unambiguous edit target, then exposes ground-plane
 * nudges for placing it precisely. Rotation, scale, duplication and deletion
 * remain in the shared SelectionBar.
 */
export const WalkModelPicker: React.FC = () => {
  const theme = useStore((state) => state.theme);
  const models = useStore((state) => state.models);
  const selectedModelId = useStore((state) => state.selectedModelId);
  const selectModel = useStore((state) => state.selectModel);
  const updateModel = useStore((state) => state.updateModel);

  if (models.length === 0) return null;

  const selected = models.find((model) => model.id === selectedModelId) ?? null;
  const chrome = theme === 'dark'
    ? 'bg-black/80 text-white border-white/20'
    : 'bg-white/90 text-gray-900 border-gray-200';

  const nudge = (dx: number, dz: number) => {
    if (!selected) return;
    updateModel(selected.id, {
      position: [selected.position[0] + dx, 0, selected.position[2] + dz],
    });
  };

  return (
    <div className={`fixed z-[80] top-4 left-4 max-w-[calc(100vw-6rem)] rounded-2xl border backdrop-blur-xl shadow-lg p-2 ${chrome}`}>
      <div className="flex gap-1 max-w-[70vw] overflow-x-auto scrollbar-none">
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => selectModel(model.id)}
            className={`shrink-0 max-w-32 truncate rounded-xl px-3 py-2 text-[10px] font-black ${
              selectedModelId === model.id ? 'bg-sky-500 text-white' : 'bg-current/10'
            }`}
          >
            {model.name}
          </button>
        ))}
      </div>

      {selected && (
        <div className="mt-2 flex items-center justify-center gap-1" aria-label="Place selected model">
          <button onClick={() => nudge(-0.25, 0)} className="w-9 h-9 rounded-full border border-current/20" aria-label="Move left">←</button>
          <button onClick={() => nudge(0, -0.25)} className="w-9 h-9 rounded-full border border-current/20" aria-label="Move forward">↑</button>
          <button onClick={() => nudge(0, 0.25)} className="w-9 h-9 rounded-full border border-current/20" aria-label="Move back">↓</button>
          <button onClick={() => nudge(0.25, 0)} className="w-9 h-9 rounded-full border border-current/20" aria-label="Move right">→</button>
          <span className="ml-1 text-[9px] font-black opacity-50">0.25 m</span>
        </div>
      )}
    </div>
  );
};
