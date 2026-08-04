import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Icon, I } from './icons';
import { Sheet } from './Sheet';
import { iconButton, tile } from './ui';
import type { SavedScene } from '../types';

/**
 * One saved composition: the frame it was saved from, and nothing else.
 *
 * A picture of the room is how you recognise the room. A name would have to be
 * typed, a date read - both of them words on a screen that is otherwise only
 * scene and controls.
 *
 * Deleting takes two taps. There is no undo behind it, the target is small, and
 * it sits in the corner of the thing you meant to open - so the first tap only
 * arms it, and it disarms itself if the second never comes.
 */
const SceneCard: React.FC<{
  scene: SavedScene;
  open: boolean;
  busy: boolean;
  dark: boolean;
  onOpen: () => void;
  onDelete: () => void;
}> = ({ scene, open, busy, dark, onOpen, onDelete }) => {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <div className="relative">
      <button
        onClick={onOpen}
        disabled={busy}
        aria-label={scene.name}
        className={`w-full aspect-[4/3] rounded-2xl overflow-hidden transition-all active:scale-[0.98] disabled:opacity-40 ${tile(dark)} ${
          open ? 'ring-2 ring-sky-500' : ''
        }`}
      >
        {scene.thumbnail ? (
          <img src={scene.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="w-full h-full flex items-center justify-center opacity-30">
            <Icon path={I.cube} className="w-7 h-7" />
          </span>
        )}
      </button>
      {/* The pill's colour lives on the span: a global rule strips backgrounds
          from every button, so the armed state would otherwise be invisible. */}
      <button
        onClick={() => (armed ? onDelete() : setArmed(true))}
        aria-label={armed ? `Delete ${scene.name} for good` : `Delete ${scene.name}`}
        className="absolute top-1.5 right-1.5"
      >
        <span
          className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
            armed ? 'bg-red-500 text-white' : 'bg-black/40 text-white/90'
          }`}
        >
          <Icon path={I.trash} className="w-4 h-4" />
        </span>
      </button>
    </div>
  );
};

/**
 * The scene library: keep what is on screen, and open what was kept before.
 *
 * A composition made of imported meshes is the case this exists for. The
 * geometry is kept in the browser alongside the scene, so opening one a week
 * later puts the same room back - furniture, eye level, and the spot you were
 * standing on.
 *
 * Saving always makes a new one. There is no naming and no overwriting: this is
 * a roll of views, and the way to lose one is to delete it on purpose.
 */
export const SceneSheet: React.FC<{
  onClose: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  busy: boolean;
}> = ({ onClose, onExport, onImport, busy }) => {
  const dark = useStore((s) => s.theme) === 'dark';
  const scenes = useStore((s) => s.sceneHistory);
  const currentSceneId = useStore((s) => s.currentSceneId);
  const saveCurrentScene = useStore((s) => s.saveCurrentScene);
  const loadScene = useStore((s) => s.loadScene);
  const deleteScene = useStore((s) => s.deleteScene);

  const fileInput = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);

  const run = async (work: () => Promise<unknown>) => {
    setWorking(true);
    try {
      await work();
    } finally {
      setWorking(false);
    }
  };

  const open = (id: string) =>
    run(async () => {
      const missing = await loadScene(id);
      // Nothing to say on screen about a mesh that could not be found: the
      // scene comes back without it, and the console carries the detail.
      if (missing.length) console.warn(`Opened without:\n${missing.join('\n')}`);
      else onClose();
    });

  const disabled = busy || working;
  const action = `${iconButton(dark)} disabled:opacity-40`;

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-center gap-1 px-3 pb-3">
        <button
          onClick={() => run(saveCurrentScene)}
          disabled={disabled}
          aria-label="Save this scene"
          className={`flex-1 h-11 rounded-full border flex items-center justify-center transition-transform active:scale-[0.98] disabled:opacity-40 ${
            dark ? 'border-white/20 hover:bg-white/10' : 'border-gray-300 hover:bg-black/5'
          }`}
        >
          <Icon path={I.save} className="w-5 h-5" />
        </button>
        <button onClick={onExport} disabled={disabled} aria-label="Export scene file" className={action}>
          <Icon path={I.sceneExport} className="w-5 h-5" />
        </button>
        <button
          onClick={() => fileInput.current?.click()}
          disabled={disabled}
          aria-label="Import scene file"
          className={action}
        >
          <Icon path={I.sceneImport} className="w-5 h-5" />
        </button>
      </div>

      {scenes.length > 0 && (
        <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto overscroll-contain scrollbar-none px-3 pb-4">
          {scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              dark={dark}
              busy={disabled}
              open={scene.id === currentSceneId}
              onOpen={() => open(scene.id)}
              onDelete={() => deleteScene(scene.id)}
            />
          ))}
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImport(file);
          e.target.value = '';
        }}
      />
    </Sheet>
  );
};
