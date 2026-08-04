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
      className={`relative w-full aspect-square rounded-2xl flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40 overflow-hidden ${tile}`}
    >
      {preview ? (
        <img src={preview} alt={mesh.name} className={`w-full h-full object-contain ${busyId === mesh.id ? 'animate-pulse' : ''}`} />
      ) : (
        <Icon
          path={I.cube}
          className={`w-8 h-8 ${busyId === mesh.id ? 'animate-pulse' : ''}`}
        />
      )}
      <span className="absolute bottom-0.5 right-1 text-[9px] font-bold opacity-40 tabular-nums">
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
    ? 'bg-black/80 border-white/12 text-white'
    : 'bg-white/90 border-gray-200 text-gray-900';
  const tile = isDark ? 'bg-black/40 active:bg-black/70' : 'bg-black/5 active:bg-black/15';

  const handleAddCube = () => {
    addCube([focusPoint.x, 0, focusPoint.z]);
  };

  const panel = (
    <div
      className={`flex flex-col gap-1 p-2 rounded-3xl border backdrop-blur-xl shadow-lg pointer-events-auto ${shell}`}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onPointerCancel={(e) => e.stopPropagation()}
    >
      {/* Minimal drag handle – tap to dismiss */}
      <button onClick={onClose} className="mx-auto w-10 h-1 rounded-full bg-current opacity-20" aria-label="Close" />

      {/* Grid of mesh thumbnails – 3/5 of viewport height, larger tiles */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-[36vh] overflow-y-auto overscroll-contain scrollbar-none p-0.5">
        {/* Cube as the first default model */}
        <button
          onClick={handleAddCube}
          disabled={busyId !== null}
          aria-label="Add cube"
          className={`relative w-full aspect-square rounded-2xl flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40 overflow-hidden ${tile}`}
        >
          <Icon path={I.cube} className="w-8 h-8" />
          <span className="absolute bottom-0.5 right-1 text-[9px] font-bold opacity-40 tabular-nums">
            cube
          </span>
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
      <div className="fixed z-[70] pointer-events-none inset-3 top-auto max-h-[42vh]">
        {panel}
      </div>
    );
  }

  if (layout === 'phone') {
    return <div className="fixed left-2 right-2 bottom-safe-panel z-[70] pointer-events-none max-h-[42vh]">{panel}</div>;
  }

  return (
    <div className="fixed inset-x-0 bottom-6 z-[70] px-12 flex justify-center pointer-events-none">
      <div className="w-full max-w-4xl">{panel}</div>
    </div>
  );
};
