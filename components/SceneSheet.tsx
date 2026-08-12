import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Icon, I } from './icons';
import { iconButton, tile } from './ui';
import { beginActivity, reportFailure } from '../lib/activity';
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
        className={`w-full aspect-[4/3] rounded-xl overflow-hidden transition-all active:scale-[0.98] disabled:opacity-40 ${tile(dark)} ${
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
  const [arming, setArming] = useState(false);
  const resetScene = useStore((s) => s.resetScene);

  // The arming lapses on its own, so a stray first tap is not left loaded.
  useEffect(() => {
    if (!arming) return;
    const timer = setTimeout(() => setArming(false), 2600);
    return () => clearTimeout(timer);
  }, [arming]);

  const clear = () => {
    setArming(false);
    resetScene();
    onClose();
  };

  const run = async (work: () => Promise<unknown>) => {
    setWorking(true);
    const done = beginActivity();
    try {
      await work();
    } catch (error) {
      console.error(error);
      reportFailure();
    } finally {
      done();
      setWorking(false);
    }
  };

  /**
   * Open one.
   *
   * The scene comes back whether or not every mesh in it could be found, and
   * the sheet closes either way - it used to stay up with no explanation, which
   * read as the tap not having landed. What is missing is said by the mark at
   * the top of the screen, and named in the console.
   */
  const open = (id: string) =>
    run(async () => {
      const missing = await loadScene(id);
      if (missing.length) {
        console.warn(`Opened without:\n${missing.join('\n')}`);
        reportFailure();
      }
      onClose();
    });

  const disabled = busy || working;
  const action = `${iconButton(dark)} disabled:opacity-40`;

  return (
    /*
     * A shelf, not a sheet: one row you scroll sideways, standing in the panel
     * slot above the dock rather than drawn over it.
     */
    <div className="flex items-stretch gap-1 max-w-full min-w-0">
      {/*
        * The four actions stand two by two, not four in a row.
        *
        * A row of four 44 px circles is a hand's width of chrome before the
        * first saved scene appears, on a shelf whose whole point is the saved
        * scenes - on a 390 px phone it left room for one and a bit cards. Two
        * by two, the block is the same height as the cards beside it and half
        * the width of the row it replaces, so the shelf leads with what it
        * keeps. Reading order survives: save, then the file pair, then the
        * one that empties the room.
        */}
      <div className="grid grid-cols-2 gap-1 shrink-0 self-center">
        {/*
          * A circle like its three neighbours, with a hairline to say it is
          * the one that MAKES something. It was `flex-1`, left over from when
          * this was a modal sheet with a full-width save bar - and in a shelf
          * row sized to its own contents there is no free space to grow into,
          * so the row's one primary action rendered as a 20 px sliver beside
          * three 44 px circles: the most important button was the smallest
          * target.
          */}
        <button
          onClick={() => run(saveCurrentScene)}
          disabled={disabled}
          aria-label="Save this scene"
          className={`w-11 max-[429px]:w-10 h-11 rounded-full border flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40 ${
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
        {/*
          * Back to the empty grid, and only here.
          *
          * There used to be one of these a thumb-width from the controls you
          * reach for constantly, with a single undo between a mis-tap and a
          * morning's work, and taking it away was right. It belongs in the
          * room where compositions are kept, next to save and export, where
          * every neighbouring control is also about the scene as a whole -
          * and it asks twice, like deleting a saved scene does.
          */}
        <button
          onClick={() => (arming ? clear() : setArming(true))}
          disabled={disabled}
          aria-label={arming ? 'Clear the scene for good' : 'Clear the scene'}
          className={`${action} ${arming ? '!text-red-500' : ''}`}
        >
          <Icon path={arming ? I.trash : I.clearScene} className="w-5 h-5" />
        </button>
      </div>

      {scenes.length > 0 && (
        <div className="flex gap-2 min-w-0 overflow-x-auto overscroll-contain scrollbar-none [&>*]:shrink-0 [&>*]:w-32">
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
        accept=".perspective,.json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImport(file);
          e.target.value = '';
        }}
      />
    </div>
  );
};
