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
      className={`relative w-full aspect-square rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 overflow-hidden ${tile}`}
    >
      {preview ? (
        <img src={preview} alt={mesh.name} className={`w-full h-full object-contain p-2 ${busyId === mesh.id ? 'animate-pulse' : ''}`} />
      ) : (
        <Icon
          path={I.cube}
          className={`w-7 h-7 opacity-50 ${busyId === mesh.id ? 'animate-pulse' : ''}`}
        />
      )}
    </button>
  );
};

/**
 * The figure library: a scrollable grid of all available meshes.
 */
export const MeshSheet: React.FC<{
  onClose: () => void;
  onPlace: (id: string) => void;
  onImport: (files: FileList) => void;
  onExportScene: () => void;
  onImportScene: (file: File) => void;
  busyId: string | null;
}> = ({ onClose, onPlace, busyId }) => {
  const theme = useStore((s) => s.theme);
  const addCube = useStore((s) => s.addCube);
  const isDark = theme === 'dark';

  const shell = isDark
    ? 'bg-black/60 border-white/20 text-white backdrop-blur-2xl'
    : 'bg-white/80 border-gray-300 text-black backdrop-blur-2xl';
  const tile = isDark
    ? 'bg-white/10 hover:bg-white/15 active:bg-white/20'
    : 'bg-black/5 hover:bg-black/10 active:bg-black/15';

  const handleAddCube = () => {
    addCube([focusPoint.x, 0, focusPoint.z]);
    onClose();
  };

  const handlePlace = (id: string) => {
    onPlace(id);
    onClose();
  };

  const panel = (
    <div
      className={`flex flex-col rounded-[2rem] border shadow-2xl pointer-events-auto overflow-hidden ${shell}`}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onPointerCancel={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-center p-3">
        <div className="w-12 h-1.5 rounded-full opacity-20 bg-current"></div>
      </div>

      <div className="grid grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto overscroll-contain scrollbar-none px-4 pb-4">
        <button
          onClick={handleAddCube}
          disabled={busyId !== null}
          aria-label="Add cube"
          className={`relative w-full aspect-square rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 ${tile}`}
        >
          <Icon path={I.cube} className="w-8 h-8 opacity-80" />
        </button>
        {MESH_LIBRARY.map((mesh) => (
          <MeshTile
            key={mesh.id}
            mesh={mesh}
            busyId={busyId}
            tile={tile}
            onPlace={handlePlace}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg safe-bottom pointer-events-none p-2 transition-transform duration-300 translate-y-0">
        {panel}
      </div>
    </div>
  );
};
