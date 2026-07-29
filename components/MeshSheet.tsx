import React, { useRef } from 'react';
import { useStore } from '../store';
import { MESH_LIBRARY } from '../lib/meshLibrary';
import { MODEL_ACCEPT } from '../lib/loadModel';

/**
 * The mesh library.
 *
 * A grid of figures to drop into the scene, plus a way in for your own files -
 * several at once. Names only; nothing here needs explaining.
 */
export const MeshSheet: React.FC<{
  onClose: () => void;
  onPlace: (id: string) => void;
  onImport: (files: FileList) => void;
  busyId: string | null;
}> = ({ onClose, onPlace, onImport, busyId }) => {
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';
  const inputRef = useRef<HTMLInputElement>(null);

  const panel = isDark ? 'bg-[#141416] border-gray-800 text-gray-100' : 'bg-white border-gray-200 text-gray-900';
  const tile = isDark
    ? 'border-gray-700 hover:border-gray-500 bg-white/5'
    : 'border-gray-200 hover:border-gray-400 bg-black/[0.03]';

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      <div className={`relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border shadow-2xl safe-bottom ${panel}`}>
        <div className="flex items-center justify-end px-3 pt-3">
          <button onClick={onClose} className="p-2 opacity-50" aria-label="Close">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-4 pb-5 grid grid-cols-3 gap-2">
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
    </div>
  );
};
