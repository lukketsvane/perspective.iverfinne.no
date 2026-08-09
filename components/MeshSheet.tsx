import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { MESH_LIBRARY } from '../lib/meshLibrary';
import { MODEL_ACCEPT } from '../lib/loadModel';
import { Icon, I } from './icons';
import { Sheet } from './Sheet';
import { tile } from './ui';
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
/**
 * The forms a real place is blocked out of, as width, height, depth in
 * metres. Ordered by height, which is the number each one teaches.
 */
const FORMS: { label: string; scale: [number, number, number] }[] = [
  { label: 'seat', scale: [0.45, 0.45, 0.45] },
  { label: 'bed', scale: [1.6, 0.55, 2.0] },
  { label: 'table', scale: [1.4, 0.75, 0.8] },
  { label: 'counter', scale: [1.8, 0.9, 0.6] },
  { label: 'person', scale: [0.5, 1.75, 0.35] },
  { label: 'door', scale: [1.0, 2.1, 0.12] },
];

/**
 * A box drawn in the form's own proportions: a simple two-point sketch of it,
 * fitted into the tile. The proportion IS the label.
 */
const formGlyph = ({ 0: w, 1: h, 2: d }: [number, number, number]) => {
  const longest = Math.max(w, h, d);
  const sw = (w / longest) * 26;
  const sh = (h / longest) * 30;
  const sd = (d / longest) * 12;
  const x0 = 24 - (sw + sd * 0.8) / 2;
  const y0 = 40 - sh;
  const front = `M${x0} ${y0}h${sw}v${sh}h${-sw}z`;
  const top = `M${x0} ${y0}l${sd * 0.8} ${-sd * 0.55}h${sw}l${-sd * 0.8} ${sd * 0.55}z`;
  const side = `M${x0 + sw} ${y0}l${sd * 0.8} ${-sd * 0.55}v${sh}l${-sd * 0.8} ${sd * 0.55}z`;
  return (
    <>
      <path d={front} />
      <path d={top} strokeOpacity="0.55" />
      <path d={side} strokeOpacity="0.55" />
    </>
  );
};

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
 * The library: a reference cube, a way in for your own files, the three objects
 * the tool ships with, and everything you have imported since.
 *
 * An import used to be a one-off - it stood in the scene, it was saved with it,
 * and placing it again meant finding it on disk again. It goes on the shelf now,
 * beside the three, and is placed from there as often as the drawing wants.
 */
export const MeshSheet: React.FC<{
  onClose: () => void;
  onPlace: (id: string) => void;
  onPlaceOwn: (url: string, name: string) => void;
  onImport: (files: FileList) => void;
  busyId: string | null;
}> = ({ onClose, onPlace, onPlaceOwn, onImport, busyId }) => {
  const dark = useStore((s) => s.theme) === 'dark';
  const addCube = useStore((s) => s.addCube);
  const ownMeshes = useStore((s) => s.ownMeshes);
  const forgetMesh = useStore((s) => s.forgetMesh);
  const importInputRef = useRef<HTMLInputElement>(null);
  const busy = busyId !== null;

  const handleAddCube = () => {
    addCube([focusPoint.x, 0, focusPoint.z]);
    onClose();
  };

  const addLamp = useStore((s) => s.addLamp);
  const handleAddLamp = () => {
    addLamp([focusPoint.x, focusPoint.z]);
    onClose();
  };

  const standForm = useStore((s) => s.standForm);
  const handleForm = (scale: [number, number, number]) => {
    standForm(scale, [focusPoint.x, focusPoint.z]);
    onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <div
        data-tile-scroll
        className="grid grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto overscroll-contain scrollbar-none px-4 pb-4"
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
          * The known forms: the dozen numbers a real place is blocked out of.
          *
          * Doors are 2.1, tables 0.75, seats 0.45, a standing figure 1.75, a
          * counter 0.9, a bed 0.55 - own those and every form in a room can
          * be estimated off them. Each tile is one tap: the box lands at the
          * gaze point at its true size, named by its number, and placing them
          * is how the numbers are learned. The glyph is the form's own
          * proportion; the number is its height, which is the dimension a
          * standing eye reads everything against.
          */}
        {FORMS.map((form) => (
          <button
            key={form.label}
            onClick={() => handleForm(form.scale)}
            disabled={busy}
            aria-label={`Stand a ${form.label}, ${form.scale[1]} metres tall`}
            className={`relative w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-40 ${tile(dark)}`}
          >
            <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" opacity={0.8}>
              {formGlyph(form.scale)}
            </svg>
            <span className="text-[11px] font-bold tabular-nums opacity-50">{form.scale[1].toFixed(2)}</span>
          </button>
        ))}

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

        {MESH_LIBRARY.map((mesh) => (
          <MeshTile
            key={mesh.id}
            url={mesh.url}
            name={mesh.name}
            busy={busy}
            loading={busyId === mesh.id}
            dark={dark}
            onPlace={() => {
              onPlace(mesh.id);
              onClose();
            }}
          />
        ))}

        {ownMeshes.map((mesh) => (
          <MeshTile
            key={mesh.url}
            url={mesh.url}
            name={mesh.name}
            busy={busy}
            loading={busyId === mesh.url}
            dark={dark}
            onPlace={() => {
              onPlaceOwn(mesh.url, mesh.name);
              onClose();
            }}
            onForget={() => forgetMesh(mesh.url)}
          />
        ))}
      </div>

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
    </Sheet>
  );
};
