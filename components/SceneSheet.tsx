import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Icon, I } from './icons';
import { iconButton, tile } from './ui';
import { beginActivity, reportFailure } from '../lib/activity';
import type { SavedScene } from '../types';

/**
 * One saved project: the frame it was saved from, and what it is called.
 *
 * THE NAME IS NEW, AND SO IS THE REASON FOR IT. This card carried a picture
 * and nothing else, on the argument that a picture of the room is how you
 * recognise the room and that a name would have to be typed. That held while
 * every save made a NEW card: four saves of four different sittings do look
 * different. Saving writes into the open project now, so the shelf is a row of
 * things you come back to over days - and the thumbnail of a scene you have
 * worked on twice is a picture of the same room from a slightly different
 * spot, which the eye cannot file. A name can be read at a glance, and it is
 * the one you gave it.
 *
 * Typed only when you want to. Every project is born with a name already on
 * it, so the shelf is never a row of blanks waiting to be filled in; tapping
 * the name is what turns it into a field, and that is the only keyboard in
 * this app.
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
  onRename: (name: string) => void;
}> = ({ scene, open, busy, dark, onOpen, onDelete, onRename }) => {
  const [armed, setArmed] = useState(false);
  const [naming, setNaming] = useState(false);
  const [draft, setDraft] = useState(scene.name);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [armed]);

  // The field opens on whatever it is called NOW - including a rename made
  // somewhere else while this card sat there.
  useEffect(() => setDraft(scene.name), [scene.name]);

  const commit = () => {
    setNaming(false);
    onRename(draft);
  };

  /*
   * COMMITTED ON THE WAY OUT TOO.
   *
   * A field commits when it loses focus, and unmounting is not losing focus:
   * the shelf is put away by a tap on the drawing, which takes this whole card
   * with it, and React fires no blur on the way. So a name typed and then
   * dismissed - which is the same gesture as "done, now let me see it" - was
   * quietly thrown away. Nothing else in this tool loses work to a panel
   * closing.
   *
   * Through a ref, because the cleanup of an effect that runs once holds the
   * first render's variables and the draft is on the last one.
   */
  const latest = useRef({ naming, draft, name: scene.name });
  latest.current = { naming, draft, name: scene.name };
  useEffect(
    () => () => {
      const held = latest.current;
      if (held.naming && held.draft.trim() && held.draft.trim() !== held.name) {
        onRename(held.draft);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className="relative w-32 flex flex-col gap-1">
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

      {/*
        * The name, and the field it becomes.
        *
        * Escape puts the old name back rather than committing the draft, which
        * is what escape means everywhere else in this tool - and it has to be
        * handled here, because the app's own key handler steps aside for
        * anything typed into an input and would otherwise never see it. Enter
        * and stepping away both commit: there is no third state for a name.
        */}
      {naming ? (
        <input
          autoFocus
          value={draft}
          maxLength={48}
          aria-label={`Name for ${scene.name}`}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setDraft(scene.name);
              setNaming(false);
            }
          }}
          className={`w-full h-6 px-1.5 rounded-md text-[11px] text-center border outline-none ${
            dark
              ? 'bg-white/10 border-white/25 text-white'
              : 'bg-black/5 border-black/20 text-black'
          }`}
        />
      ) : (
        <button
          onClick={() => setNaming(true)}
          aria-label={`Rename ${scene.name}`}
          className={`w-full h-6 px-1 rounded-md text-[11px] truncate transition-colors ${
            open
              ? 'text-sky-500 font-semibold'
              : dark
                ? 'text-white/70 hover:text-white'
                : 'text-black/60 hover:text-black'
          }`}
        >
          {scene.name}
        </button>
      )}

      {/*
        * THE MARK, WITHOUT A DISC BEHIND IT.
        *
        * It was a filled circle - black at forty per cent, red once armed -
        * and a filled disc is the one shape this whole interface does not use:
        * every control here is a glyph, and a global rule strips the
        * background off every button precisely so that nothing looks like a
        * key to be pressed. A pill on the corner of a picture was the
        * exception, and it read as a badge stuck onto the thumbnail rather
        * than a control belonging to it.
        *
        * What the disc was doing is still needed - the mark sits over a
        * photograph, which can be any value anywhere - and a SHADOW does it
        * instead: white ink with a dark halo is legible over both ends of a
        * thumbnail and adds nothing that reads as a button. Armed, it simply
        * goes red, which is the same statement the disc was making with a
        * fill.
        */}
      <button
        onClick={() => (armed ? onDelete() : setArmed(true))}
        aria-label={armed ? `Delete ${scene.name} for good` : `Delete ${scene.name}`}
        className={`absolute top-1 right-1 w-8 h-8 flex items-center justify-center transition-colors ${
          armed ? 'text-red-500' : 'text-white'
        }`}
        style={{ filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.85))' }}
      >
        <Icon path={I.trash} className="w-4 h-4" />
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
 * SAVING WRITES INTO THE PROJECT THAT IS OPEN. It used to make a new entry
 * every time, and the sentence that stood here said so proudly - a roll of
 * views, nothing ever overwritten. What that actually produced was a shelf of
 * near-duplicates: the same drawing at four moments of one afternoon, four
 * thumbnails of one room, and no way to say "this is the one I am working on".
 * A project is a thing you return to. The plus tile at the head of the row is
 * how you deliberately start another one, and it is the only way a save ever
 * takes a new seat.
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
  const renameScene = useStore((s) => s.renameScene);
  const openScene = scenes.find((s) => s.id === currentSceneId);

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
          onClick={() => run(() => saveCurrentScene())}
          disabled={disabled}
          // It says which of the two things it is about to do, because they
          // are different things: with a project open this writes over it, and
          // a control that says "save this scene" while overwriting Scene 3 is
          // a control that lies to the one person who cannot see the shelf.
          aria-label={openScene ? `Update ${openScene.name}` : 'Save this scene'}
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

      {/* The width lives on the children now rather than on the row: a card is
          a card wide, and the plus beside it is a button wide. Sized as one,
          the plus spent a whole card's worth of a 390 px phone on a glyph and
          pushed the second project off the edge - which is a control for
          making projects standing in front of the projects. */}
      <div className="flex gap-2 min-w-0 overflow-x-auto overscroll-contain scrollbar-none [&>*]:shrink-0">
        {/*
          * START ANOTHER ONE, and the only control here that adds a card.
          *
          * It is at the HEAD of the row rather than in the block of four,
          * because it belongs to the row: what it makes is a card, it lands
          * immediately to its right, and the row is the row of projects. In
          * the block it would have been a fifth circle beside four that all
          * act on the scene rather than on the shelf - and a second disk icon
          * a thumb's width from the first is how you overwrite the wrong
          * thing.
          *
          * Dashed, like the import tile on the model shelf, which is the
          * other place in this app where a tile means "one that is not here
          * yet".
          */}
        <button
          onClick={() => run(() => saveCurrentScene(true))}
          disabled={disabled}
          aria-label="Save this as a new scene"
          className={`w-11 h-24 self-start rounded-xl border border-dashed flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40 ${
            dark ? 'border-white/25 text-white/70' : 'border-black/20 text-black/60'
          }`}
        >
          <Icon path={I.plus} className="w-6 h-6" />
        </button>

        {scenes.map((scene) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            dark={dark}
            busy={disabled}
            open={scene.id === currentSceneId}
            onOpen={() => open(scene.id)}
            onDelete={() => deleteScene(scene.id)}
            onRename={(name) => renameScene(scene.id, name)}
          />
        ))}
      </div>

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
