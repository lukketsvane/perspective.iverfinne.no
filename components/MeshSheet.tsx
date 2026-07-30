import React, { useRef } from 'react';
import { useStore } from '../store';
import { MESH_LIBRARY } from '../lib/meshLibrary';
import { MODEL_ACCEPT } from '../lib/loadModel';
import type { Layout } from '../lib/useLayout';

/**
 * The mesh library.
 *
 * A grid of figures to drop into the scene, plus a way in for your own files -
 * several at once. Names only; nothing here needs explaining.
 *
 * A phone gets it as a sheet off the bottom edge, because that is the only
 * place a sheet can come from. A tablet docks it beside the rail like the other
 * panels, over an undimmed scene: you are placing figures *into* a view, and
 * blacking out that view while you choose is exactly backwards.
 */
export const MeshSheet: React.FC<{
  layout: Layout;
  onClose: () => void;
  onPlace: (id: string) => void;
  onImport: (files: FileList) => void;
  busyId: string | null;
}> = ({ layout, onClose, onPlace, onImport, busyId }) => {
  const theme = useStore((s) => s.theme);
  const matteModels = useStore((s) => s.matteModels);
  const toggleMatte = useStore((s) => s.toggleMatte);
  const isDark = theme === 'dark';
  const inputRef = useRef<HTMLInputElement>(null);

  const tablet = layout === 'tablet';
  const panel = isDark ? 'bg-[#141416] border-gray-800 text-gray-100' : 'bg-white border-gray-200 text-gray-900';
  const tile = isDark
    ? 'border-gray-700 hover:border-gray-500 bg-white/5'
    : 'border-gray-200 hover:border-gray-400 bg-black/[0.03]';

  const card = tablet
    ? `w-[22rem] max-h-full overflow-y-auto rounded-3xl border shadow-2xl pointer-events-auto ${panel}`
    : `relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border shadow-2xl safe-bottom ${panel}`;

  const body = (
    <div className={card}>
      <div className="flex items-center justify-between px-4 pt-3">
        {/* Plain white instead of the file's own skin and fabric */}
        <button
          onClick={toggleMatte}
          className={`px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors ${
            matteModels
              ? isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'
              : isDark ? 'bg-white/10 text-gray-400' : 'bg-black/5 text-gray-500'
          }`}
        >
          Matte
        </button>
        <button onClick={onClose} className="p-2 opacity-50" aria-label="Close">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className={`px-4 pb-5 grid gap-2 ${tablet ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {MESH_LIBRARY.map((mesh) => (
          <button
            key={mesh.id}
            onClick={() => onPlace(mesh.id)}
            disabled={busyId !== null}
            className={`aspect-square rounded-2xl border flex flex-col items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-40 ${tile}`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`w-7 h-7 ${busyId === mesh.id ? 'animate-pulse' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <circle cx="12" cy="4.5" r="2" />
              <path d="M12 7v6M12 13l-3 6M12 13l3 6M8 9.5h8" />
            </svg>
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 tabular-nums">
              {mesh.name.replace('Figure ', '')}
            </span>
          </button>
        ))}

        {/* Your own files */}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busyId !== null}
          className={`aspect-square rounded-2xl border border-dashed flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40 ${tile}`}
          aria-label="Import models"
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 16V4" />
            <polyline points="8 8 12 4 16 8" />
            <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
          </svg>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={MODEL_ACCEPT}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onImport(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );

  // No scrim and no catcher: the scene stays live underneath, so you can orbit
  // to where the figure should go and place it without closing anything. The
  // column below the card has to let the drag through, or it becomes an
  // invisible dead strip down a third of the screen.
  if (tablet) {
    return (
      <div className="fixed top-4 bottom-4 right-24 z-[70] flex items-start pointer-events-none">{body}</div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      {body}
    </div>
  );
};
