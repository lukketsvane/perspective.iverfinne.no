import React, { useRef } from 'react';
import { useStore } from '../store';
import { MESH_LIBRARY } from '../lib/meshLibrary';
import { MODEL_ACCEPT } from '../lib/loadModel';
import type { Layout } from '../lib/useLayout';
import { Icon, I, POSE_ICON } from './icons';

/**
 * The mesh library.
 *
 * Thirty figures to drop into the scene, plus a way in for your own files -
 * several at once. Each tile draws the pose rather than naming it, because
 * thirty identical stick figures is thirty tiles you have to try one by one.
 * The number is only there to tell two of the same pose apart.
 *
 * It never takes the whole screen. A phone gets a sheet up the bottom half; a
 * tablet docks it beside the rail. Either way the scene you are placing into
 * stays in view, which is the entire point of choosing a figure.
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

  const phone = layout === 'phone';
  const card = tablet
    ? `w-full max-h-full flex flex-col rounded-3xl border shadow-2xl pointer-events-auto overflow-hidden ${panel}`
    : phone
    ? `w-full max-h-[56vh] flex flex-col rounded-3xl border shadow-2xl pointer-events-auto overflow-hidden ${panel}`
    : `w-[26rem] max-h-[70vh] flex flex-col rounded-3xl border shadow-2xl pointer-events-auto overflow-hidden ${panel}`;

  const body = (
    <div className={card}>
      <div className="shrink-0 flex items-center justify-between px-4 pt-3 pb-1">
        {/* Plain white instead of the file's own skin and fabric */}
        <button
          onClick={toggleMatte}
          aria-label="Matte white models"
          aria-pressed={matteModels}
          title="Matte white models"
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
            matteModels
              ? isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'
              : isDark ? 'bg-white/10 text-gray-400' : 'bg-black/5 text-gray-500'
          }`}
        >
          <Icon path={I.matte} className="w-5 h-5" />
        </button>

        {/* Your own files */}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busyId !== null}
          aria-label="Import models"
          title="Import models"
          className={`flex items-center justify-center w-10 h-10 rounded-full disabled:opacity-40 ${
            isDark ? 'bg-white/10 text-gray-400' : 'bg-black/5 text-gray-500'
          }`}
        >
          <Icon path={I.upload} className="w-5 h-5" />
        </button>

        <button onClick={onClose} className="p-2 opacity-50" aria-label="Close">
          <Icon path={I.close} className="w-5 h-5" />
        </button>
      </div>

      <div
        className={`flex-1 overflow-y-auto px-4 pb-5 pt-2 grid gap-2 ${
          tablet ? 'landscape:grid-cols-4 portrait:grid-cols-8' : phone ? 'grid-cols-5' : 'grid-cols-6'
        }`}
      >
        {MESH_LIBRARY.map((mesh) => (
          <button
            key={mesh.id}
            onClick={() => onPlace(mesh.id)}
            disabled={busyId !== null}
            aria-label={mesh.name}
            className={`aspect-square rounded-xl border flex items-center justify-center relative transition-transform active:scale-95 disabled:opacity-40 ${tile}`}
          >
            <Icon
              path={POSE_ICON[mesh.pose]}
              className={`w-7 h-7 ${busyId === mesh.id ? 'animate-pulse' : ''}`}
            />
            <span className="absolute bottom-0.5 right-1 text-[8px] font-bold opacity-35 tabular-nums">
              {mesh.name}
            </span>
          </button>
        ))}
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
      <div
        className={
          'fixed z-[70] pointer-events-none ' +
          'landscape:top-3 landscape:bottom-3 landscape:right-24 landscape:w-64 ' +
          'portrait:left-3 portrait:right-24 portrait:bottom-3 portrait:top-[54vh]'
        }
      >
        <div className="w-full h-full flex pointer-events-none landscape:items-start portrait:items-end">
          {body}
        </div>
      </div>
    );
  }

  // A phone gets the bottom half and no scrim either - dimming the scene while
  // you pick something to put in it is exactly backwards. It sits clear of the
  // thumb bar rather than over it.
  if (phone) {
    return (
      <div className="fixed inset-x-2 bottom-24 z-[70] flex justify-center pointer-events-none">
        {body}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
      {body}
    </div>
  );
};
