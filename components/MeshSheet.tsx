import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { MESH_LIBRARY } from '../lib/meshLibrary';
import { MODEL_ACCEPT } from '../lib/loadModel';
import { Icon, I } from './icons';
import { ACTIVE, tile } from './ui';
import { generateMeshPreview, getMeshPreview } from '../lib/meshPreview';
import { focusPoint } from '../lib/focus';

/**
 * A single library tile, showing the mesh itself.
 *
 * A grid of tiles carrying the same cube glyph is a grid you have to try one at
 * a time, so each shows its own file. The picture is only asked for once the
 * tile is somewhere near the screen: a grid that draws all of itself at once
 * spends its first seconds fetching rows nobody has scrolled to, and the mesh
 * you tapped waits behind them. The glyph stands in until then.
 */
const MeshTile: React.FC<{
  url: string;
  name: string;
  busy: boolean;
  loading: boolean;
  dark: boolean;
  onPlace: () => void;
  /** Set for the viewer's own: a second tap on the mark takes it off the shelf. */
  onForget?: () => void;
}> = ({ url, name, busy, loading, dark, onPlace, onForget }) => {
  const [preview, setPreview] = useState<string | null>(() => getMeshPreview(url));
  const [arming, setArming] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (preview) return;
    const element = ref.current;
    if (!element) return;

    let live = true;
    const draw = () => {
      generateMeshPreview(url).then((drawn) => {
        if (live && drawn) setPreview(drawn);
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
  }, [url, preview]);

  // Letting go of a tile has to be harder than placing one, and it is the same
  // two taps the scene library asks for before it throws a composition away.
  useEffect(() => {
    if (!arming) return;
    const timer = setTimeout(() => setArming(false), 2600);
    return () => clearTimeout(timer);
  }, [arming]);

  return (
    <div className="relative">
      <button
        ref={ref}
        onClick={onPlace}
        disabled={busy}
        aria-label={name}
        className={`relative w-full aspect-square rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 overflow-hidden ${tile(dark)}`}
      >
        {preview ? (
          <img src={preview} alt="" className={`w-full h-full object-contain p-2 ${loading ? 'animate-pulse' : ''}`} />
        ) : (
          <Icon path={I.cube} className={`w-7 h-7 opacity-50 ${loading ? 'animate-pulse' : ''}`} />
        )}
      </button>

      {onForget && (
        <button
          onClick={() => (arming ? onForget() : setArming(true))}
          aria-label={arming ? `Remove ${name} from the library` : `Forget ${name}`}
          className={`absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
            arming ? '!text-red-500' : dark ? 'text-white/35' : 'text-black/30'
          }`}
        >
          <Icon path={arming ? I.trash : I.close} className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

/**
 * The library: three ways of putting something down, then the things.
 *
 * The first row is what the tool makes rather than loads - a lamp, the
 * reference cube, and the way in for your own files - and everything after it
 * is a mesh, shown as itself. An import used to be a one-off: it stood in the
 * scene, it was saved with it, and placing it again meant finding it on disk
 * again. It goes on the shelf now and is placed from there as often as the
 * drawing wants.
 *
 * There was a block of sized boxes here too - a seat, a bed, a table, a
 * counter, a figure, a door - one tap each for the half-dozen numbers a room
 * is estimated off. The numbers are worth knowing and the tiles were not the
 * way to know them: six near-identical cubes labelled with decimals is a
 * spreadsheet, it pushed the actual objects below the fold, and every one of
 * them is the block-out pencil plus a guess, which is the thing the pencil is
 * for. Estimating the box yourself is the exercise; being handed it is not.
 */
export const MeshSheet: React.FC<{
  onPlace: (id: string) => void;
  onPlaceOwn: (url: string, name: string) => void;
  onImport: (files: FileList) => void;
  busyId: string | null;
  /** Taking the pencil off the shelf puts the shelf away. Nothing else does. */
  onClose: () => void;
}> = ({ onPlace, onPlaceOwn, onImport, busyId, onClose }) => {
  const dark = useStore((s) => s.theme) === 'dark';
  const addCube = useStore((s) => s.addCube);
  const instrument = useStore((s) => s.instrument);
  const setInstrument = useStore((s) => s.setInstrument);
  const ownMeshes = useStore((s) => s.ownMeshes);
  const forgetMesh = useStore((s) => s.forgetMesh);
  const importInputRef = useRef<HTMLInputElement>(null);
  const busy = busyId !== null;

  /*
   * PLACING SOMETHING DOES NOT PUT THE SHELF AWAY.
   *
   * It used to, on every one of these - a lamp, a cube, a library mesh, one of
   * the viewer's own - which made blocking a scene in a loop of open, scroll,
   * tap, open, scroll, tap. Building a scene is placing several things, not
   * one, and the shelf is a shelf: you take what you need off it and it stays
   * where it is. It closes when you close it.
   */
  const handleAddCube = () => addCube([focusPoint.x, 0, focusPoint.z]);

  const addLamp = useStore((s) => s.addLamp);
  const handleAddLamp = () => addLamp([focusPoint.x, focusPoint.z]);

  return (
    /*
     * A shelf, not a sheet: one row scrolled sideways, standing in the panel
     * slot above the dock. Sideways rather than a grid because a grid tall
     * enough to be worth having is a grid that covers the drawing, and what
     * this is for is putting something INTO the drawing.
     */
    <div
      data-tile-scroll
      className="flex gap-2 max-w-full min-w-0 overflow-x-auto overscroll-contain scrollbar-none [&>*]:shrink-0 [&>*]:w-[4.75rem]"
    >
        {/* A light is placed like anything else: it is a scene object, not a
            setting - see components/Lamps.tsx. */}
        <button
          onClick={handleAddLamp}
          disabled={busy}
          aria-label="Add light"
          className={`relative w-full aspect-square rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 ${tile(dark)}`}
        >
          <Icon path={I.lampBulb} className="w-8 h-8 opacity-80" />
        </button>
        <button
          onClick={handleAddCube}
          disabled={busy}
          aria-label="Add cube"
          className={`relative w-full aspect-square rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 ${tile(dark)}`}
        >
          <Icon path={I.cube} className="w-8 h-8 opacity-80" />
        </button>
        {/*
          * The block-out pencil, right beside the cube: the same verb, by eye.
          *
          * It sat in the tools panel with the measure, the two of them alone in
          * a band because they are both modes. That is a fact about how they
          * are implemented, not about what they are for - and it put the one
          * control that turns standing in a room into a scene of its forms
          * behind a menu of settings. This is where you already are when you
          * want something in the drawing: a cube is one tap and comes out a
          * metre on a side, and this is the same thing sized by your own
          * judgement in two strokes - a footprint dragged on the floor, then
          * its height pulled up. The paragraph above about the block of sized
          * boxes that used to be here is the argument for it standing here.
          *
          * The one thing on this shelf that DOES put the shelf away, because
          * unlike everything else here it does not finish the job - it hands
          * you an instrument to use on the drawing, and the shelf would be
          * over the floor you need to draw on. It puts itself down again after
          * each box: see the pointer handler in WalkOverlay.
          */}
        <button
          onClick={() => {
            setInstrument(instrument === 'block' ? 'none' : 'block');
            onClose();
          }}
          disabled={busy}
          aria-label="Draw boxes on the ground"
          aria-pressed={instrument === 'block'}
          className={`relative w-full aspect-square rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 ${
            instrument === 'block' ? ACTIVE : ''
          } ${tile(dark)}`}
        >
          <Icon path={I.block} className="w-8 h-8 opacity-80" />
        </button>

        {/* Your own files, right beside the cube: the way anything that is not
            one of the three gets into the tool at all. */}
        <button
          onClick={() => importInputRef.current?.click()}
          disabled={busy}
          aria-label="Import a mesh into the library"
          className={`relative w-full aspect-square rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 border border-dashed ${
            dark ? 'border-white/25 text-white/70' : 'border-black/20 text-black/60'
          } ${busyId === 'import' ? 'animate-pulse' : ''}`}
        >
          <Icon path={I.upload} className="w-7 h-7" />
        </button>

        {/* YOUR OWN FIRST, NEWEST FIRST.
            The shelf is one row pushed sideways, so its far end is the
            expensive place to be - and that is exactly where an import landed,
            behind a dozen tiles that ship with the tool. A file you went to the
            picker for is the file you are about to place. */}
        {ownMeshes.map((mesh) => (
          <MeshTile
            key={mesh.url}
            url={mesh.url}
            name={mesh.name}
            busy={busy}
            loading={busyId === mesh.url}
            dark={dark}
            onPlace={() => onPlaceOwn(mesh.url, mesh.name)}
            onForget={() => forgetMesh(mesh.url)}
          />
        ))}

        {MESH_LIBRARY.map((mesh) => (
          <MeshTile
            key={mesh.id}
            url={mesh.url}
            name={mesh.name}
            busy={busy}
            loading={busyId === mesh.id}
            dark={dark}
            onPlace={() => onPlace(mesh.id)}
          />
        ))}

      <input
        ref={importInputRef}
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
};
