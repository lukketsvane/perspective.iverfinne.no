import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { MESH_LIBRARY } from '../lib/meshLibrary';
import type { Layout } from '../lib/useLayout';
import { Icon, I } from './icons';
import { generateMeshPreview, getMeshPreview } from '../lib/meshPreview';
import { focusPoint } from '../lib/focus';

/**
 * A single library tile that renders a real mesh preview.
 * Falls back to the pose icon while the preview loads.
 */
const MeshTile: React.FC<{
  mesh: typeof MESH_LIBRARY[number];
  busyId: string | null;
  tile: string;
  onPlace: (id: string) => void;
}> = ({ mesh, busyId, tile, onPlace }) => {
  const [preview, setPreview] = useState<string | null>(() => getMeshPreview(mesh.url));

  useEffect(() => {
    if (preview) return;
    generateMeshPreview(mesh.url).then((url) => {
      if (url) setPreview(url);
    });
  }, [mesh.url, preview]);

  return (
    <button
      onClick={() => onPlace(mesh.id)}
      disabled={busyId !== null}
      aria-label={mesh.name}
      className={`relative w-full aspect-square rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-40 overflow-hidden ${tile}`}
    >
      {preview ? (
        <img src={preview} alt={mesh.name} className={`w-full h-full object-contain p-1 ${busyId === mesh.id ? 'animate-pulse' : ''}`} />
      ) : (
        <Icon
          path={I.cube}
          className={`w-7 h-7 ${busyId === mesh.id ? 'animate-pulse' : ''}`}
        />
      )}
      <span className="absolute bottom-1 left-0 right-0 text-center text-[9px] font-semibold opacity-40 uppercase tracking-wide">
        {mesh.name}
      </span>
    </button>
  );
};

/**
 * The figure library: a scrollable grid of all available meshes.
 */
export const MeshSheet: React.FC<{
  layout: Layout;
  onClose: () => void;
  onPlace: (id: string) => void;
  onImport: (files: FileList) => void;
  onExportScene: () => void;
  onImportScene: (file: File) => void;
  busyId: string | null;
}> = ({ layout, onClose, onPlace, busyId }) => {
  const theme = useStore((s) => s.theme);
  const addCube = useStore((s) => s.addCube);
  const isDark = theme === 'dark';

  const shell = isDark
    ? 'bg-black/85 border-white/10 text-white'
    : 'bg-white/95 border-gray-200 text-gray-900';
  const tile = isDark
    ? 'bg-white/6 hover:bg-white/10 active:bg-white/15'
    : 'bg-black/5 hover:bg-black/8 active:bg-black/15';

  const handleAddCube = () => {
    addCube([focusPoint.x, 0, focusPoint.z]);
  };

  const panel = (
    <div
      className={`flex flex-col rounded-3xl border backdrop-blur-2xl shadow-2xl pointer-events-auto overflow-hidden ${shell}`}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onPointerCancel={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-xs font-semibold uppercase tracking-widest opacity-40">Figures</span>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center opacity-40 hover:opacity-70 active:scale-90 transition-all"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Grid of mesh thumbnails */}
      <div className="grid grid-cols-4 gap-2 max-h-[38vh] overflow-y-auto overscroll-contain scrollbar-none px-3 pb-3 pt-1">
        {/* Cube as the first default model */}
        <button
          onClick={handleAddCube}
          disabled={busyId !== null}
          aria-label="Add cube"
          className={`relative w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-40 ${tile}`}
        >
          <Icon path={I.cube} className="w-7 h-7" />
          <span className="text-[9px] font-semibold opacity-50 uppercase tracking-wide">Cube</span>
        </button>
        {MESH_LIBRARY.map((mesh) => (
          <MeshTile
            key={mesh.id}
            mesh={mesh}
            busyId={busyId}
            tile={tile}
            onPlace={onPlace}
          />
        ))}
      </div>
    </div>
  );

  if (layout === 'tablet') {
    return (
      <div className="fixed z-[70] pointer-events-none inset-3 top-auto max-h-[48vh]">
        {panel}
      </div>
    );
  }

  if (layout === 'phone') {
    return <div className="fixed left-3 right-3 bottom-safe-panel z-[70] pointer-events-none">{panel}</div>;
  }

  return (
    <div className="fixed inset-x-0 bottom-6 z-[70] px-12 flex justify-center pointer-events-none">
      <div className="w-full max-w-4xl">{panel}</div>
    </div>
  );
};
