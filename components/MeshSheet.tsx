import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { MESH_LIBRARY, LibraryMesh } from '../lib/meshLibrary';
import { Icon, I } from './icons';
import { Sheet } from './Sheet';
import { tile } from './ui';
import { generateMeshPreview, getMeshPreview } from '../lib/meshPreview';
import { focusPoint } from '../lib/focus';

/**
 * A single library tile, showing the mesh itself.
 *
 * Seventy tiles carrying the same cube glyph is seventy tiles you have to try
 * one at a time, so each shows its own file. The picture is only asked for once
 * the tile is somewhere near the screen: a grid of seventy that draws all of
 * itself at once spends its first seconds fetching rows nobody has scrolled to,
 * and the mesh you tapped waits behind them. The glyph stands in until then.
 */
const MeshTile: React.FC<{
  mesh: LibraryMesh;
  busyId: string | null;
  dark: boolean;
  onPlace: (id: string) => void;
}> = ({ mesh, busyId, dark, onPlace }) => {
  const [preview, setPreview] = useState<string | null>(() => getMeshPreview(mesh.url));
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (preview) return;
    const element = ref.current;
    if (!element) return;

    let live = true;
    const draw = () => {
      generateMeshPreview(mesh.url).then((url) => {
        if (live && url) setPreview(url);
      });
    };

    if (typeof IntersectionObserver === 'undefined') {
      draw();
      return () => {
        live = false;
      };
    }

    // A screen of tiles either side, so scrolling meets pictures already drawn.
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        draw();
      },
      { root: element.closest('[data-tile-scroll]'), rootMargin: '200px' }
    );
    observer.observe(element);

    return () => {
      live = false;
      observer.disconnect();
    };
  }, [mesh.url, preview]);

  const loading = busyId === mesh.id;

  return (
    <button
      ref={ref}
      onClick={() => onPlace(mesh.id)}
      disabled={busyId !== null}
      aria-label={mesh.name}
      className={`relative w-full aspect-square rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 overflow-hidden ${tile(dark)}`}
    >
      {preview ? (
        <img src={preview} alt="" className={`w-full h-full object-contain p-2 ${loading ? 'animate-pulse' : ''}`} />
      ) : (
        <Icon path={I.cube} className={`w-7 h-7 opacity-50 ${loading ? 'animate-pulse' : ''}`} />
      )}
    </button>
  );
};

/** The mesh library: a reference cube first, then every figure and prop on file. */
export const MeshSheet: React.FC<{
  onClose: () => void;
  onPlace: (id: string) => void;
  busyId: string | null;
}> = ({ onClose, onPlace, busyId }) => {
  const dark = useStore((s) => s.theme) === 'dark';
  const addCube = useStore((s) => s.addCube);

  const handleAddCube = () => {
    addCube([focusPoint.x, 0, focusPoint.z]);
    onClose();
  };

  const handlePlace = (id: string) => {
    onPlace(id);
    onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <div
        data-tile-scroll
        className="grid grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto overscroll-contain scrollbar-none px-4 pb-4"
      >
        <button
          onClick={handleAddCube}
          disabled={busyId !== null}
          aria-label="Add cube"
          className={`relative w-full aspect-square rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 ${tile(dark)}`}
        >
          <Icon path={I.cube} className="w-8 h-8 opacity-80" />
        </button>
        {MESH_LIBRARY.map((mesh) => (
          <MeshTile key={mesh.id} mesh={mesh} busyId={busyId} dark={dark} onPlace={handlePlace} />
        ))}
      </div>
    </Sheet>
  );
};
