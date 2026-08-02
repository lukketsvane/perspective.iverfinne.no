import React, { useRef } from 'react';
import { useStore } from '../store';
import { MESH_LIBRARY } from '../lib/meshLibrary';
import { MODEL_ACCEPT } from '../lib/loadModel';
import type { Layout } from '../lib/useLayout';
import { Icon, I, POSE_ICON } from './icons';

/**
 * The figure library: one row, scrolled sideways.
 *
 * A grid of twenty-one tiles was a card the depth of a hand covering the scene
 * you are placing into. A single row is one tile tall - a strip you flick
 * through, the way you would a roll of film - and the scene stays where it is.
 * Each tile draws its pose rather than naming it; the number is only there to
 * tell two of the same apart.
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

  const onCamera = isDark;
  const shell = onCamera
    ? 'bg-black/80 border-white/12 text-white'
    : 'bg-white/90 border-gray-200 text-gray-900';
  const tile = isDark ? 'bg-black/40 active:bg-black/70' : 'bg-black/5 active:bg-black/15';

  const side = `flex items-center justify-center w-11 h-11 shrink-0 rounded-full transition-colors`;

  const strip = (
    <div
      className={`flex items-center gap-1 px-1.5 py-1.5 rounded-3xl border backdrop-blur-xl shadow-lg pointer-events-auto ${shell}`}
    >
      {/* Plain white instead of the file's own skin and fabric */}
      <button
        onClick={toggleMatte}
        aria-label="Matte white models"
        aria-pressed={matteModels}
        title="Matte white models"
        className={`${side} ${
          matteModels
            ? isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'
            : 'opacity-50'
        }`}
      >
        <Icon path={I.matte} className="w-5 h-5" />
      </button>

      {/*
        The figures. `overscroll-contain` keeps a flick here from dragging the
        page behind it, and the scrollbar is left off - on a phone there is
        never one to see, and on a desktop it would eat a row of pixels the
        strip does not have.
      */}
      <div className="flex-1 min-w-0 flex gap-1 overflow-x-auto overscroll-contain snap-x scrollbar-none">
        {MESH_LIBRARY.map((mesh) => (
          <button
            key={mesh.id}
            onClick={() => onPlace(mesh.id)}
            disabled={busyId !== null}
            aria-label={mesh.name}
            className={`relative shrink-0 w-12 h-12 rounded-2xl snap-start flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40 ${tile}`}
          >
            <Icon
              path={POSE_ICON[mesh.pose]}
              className={`w-7 h-7 ${busyId === mesh.id ? 'animate-pulse' : ''}`}
            />
            <span className="absolute bottom-0 right-1 text-[8px] font-bold opacity-40 tabular-nums">
              {mesh.name}
            </span>
          </button>
        ))}
      </div>

      {/* Your own files */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busyId !== null}
        aria-label="Import models"
        title="Import models"
        className={`${side} opacity-50 disabled:opacity-25`}
      >
        <Icon path={I.upload} className="w-5 h-5" />
      </button>

      <button onClick={onClose} className={`${side} opacity-50`} aria-label="Close">
        <Icon path={I.close} className="w-5 h-5" />
      </button>

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

  // Beside the rail on touch screens and along the bottom on desktop. Nowhere
  // does it cover the controls used to place into the scene.
  if (layout === 'tablet') {
    return (
      <div className="fixed z-[70] pointer-events-none landscape:right-24 landscape:left-3 landscape:bottom-3 portrait:left-3 portrait:right-24 portrait:bottom-3">
        {strip}
      </div>
    );
  }

  if (layout === 'phone') {
    return <div className="fixed left-2 right-safe-rail bottom-safe-panel z-[70] pointer-events-none">{strip}</div>;
  }

  return (
    <div className="fixed inset-x-0 bottom-6 z-[70] px-24 flex justify-center pointer-events-none">
      <div className="w-full max-w-3xl">{strip}</div>
    </div>
  );
};
