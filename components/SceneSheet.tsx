import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { Icon, I } from './icons';
import { Sheet } from './Sheet';
import { field, iconButton, tile } from './ui';
import type { SavedScene } from '../types';

/** "3 Feb" — enough to tell two versions of the same room apart. */
const when = (at: number) =>
  new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

const describe = (scene: SavedScene) => {
  const parts: string[] = [];
  if (scene.models.length) parts.push(`${scene.models.length} mesh${scene.models.length === 1 ? '' : 'es'}`);
  if (scene.boxes.length) parts.push(`${scene.boxes.length} box${scene.boxes.length === 1 ? '' : 'es'}`);
  return parts.join(' · ') || 'empty';
};

/**
 * One saved composition: the frame it was saved from, its name, its contents.
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
        className={`w-full text-left rounded-2xl overflow-hidden transition-all active:scale-[0.98] disabled:opacity-40 ${tile(dark)} ${
          open ? 'ring-2 ring-sky-500' : ''
        }`}
      >
        <div className="aspect-[4/3] w-full overflow-hidden">
          {scene.thumbnail ? (
            <img src={scene.thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-30">
              <Icon path={I.cube} className="w-7 h-7" />
            </div>
          )}
        </div>
        <div className="px-3 py-2">
          <div className="text-[13px] font-bold truncate">{scene.name}</div>
          <div className="text-[11px] opacity-50 tabular-nums truncate">
            {describe(scene)} · {when(scene.updatedAt)}
          </div>
        </div>
      </button>
      {/* The pill's colour lives on the span: a global rule strips backgrounds
          from every button, so the armed state would otherwise be invisible. */}
      <button
        onClick={() => (armed ? onDelete() : setArmed(true))}
        aria-label={armed ? `Delete ${scene.name} for good` : `Delete ${scene.name}`}
        className="absolute top-1.5 right-1.5"
      >
        <span
          className={`h-8 flex items-center justify-center gap-1 rounded-full backdrop-blur-md transition-all ${
            armed ? 'px-3 bg-red-500 text-white' : 'w-8 bg-black/40 text-white/90'
          }`}
        >
          <Icon path={I.trash} className="w-4 h-4" />
          {armed && <span className="text-[11px] font-bold">Delete</span>}
        </span>
      </button>
    </div>
  );
};

/**
 * The scene library: save what is on screen, and open what was saved before.
 *
 * A composition made of imported meshes is the case this exists for. The
 * geometry is kept in the browser alongside the scene, so opening one a week
 * later puts the same room back - furniture, figures, eye level and all - and
 * not a list of file names that no longer resolve.
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
  const currentSceneName = useStore((s) => s.currentSceneName);
  const saveCurrentScene = useStore((s) => s.saveCurrentScene);
  const loadScene = useStore((s) => s.loadScene);
  const deleteScene = useStore((s) => s.deleteScene);

  const fileInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  /** The next untaken "Scene n", so saving never demands a decision first. */
  const suggestion = useMemo(() => {
    if (currentSceneName) return currentSceneName;
    const taken = new Set(scenes.map((s) => s.name.toLowerCase()));
    for (let n = scenes.length + 1; ; n++) {
      if (!taken.has(`scene ${n}`)) return `Scene ${n}`;
    }
  }, [currentSceneName, scenes]);

  useEffect(() => {
    if (naming) nameInput.current?.select();
  }, [naming]);

  const startNaming = () => {
    setName(suggestion);
    setNaming(true);
  };

  const commitSave = async () => {
    setWorking(true);
    try {
      await saveCurrentScene(name);
      setNaming(false);
      setNotice(null);
    } finally {
      setWorking(false);
    }
  };

  const open = async (id: string) => {
    setWorking(true);
    try {
      const missing = await loadScene(id);
      if (missing.length) {
        setNotice(`Opened without ${missing.length} mesh${missing.length === 1 ? '' : 'es'}: ${missing.join(', ')}`);
      } else {
        onClose();
      }
    } finally {
      setWorking(false);
    }
  };

  const disabled = busy || working;
  const action = `${iconButton(dark)} disabled:opacity-40`;

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center gap-1 px-3 pb-3">
        {naming ? (
          <>
            <input
              ref={nameInput}
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitSave();
                if (e.key === 'Escape') setNaming(false);
              }}
              placeholder="Scene name"
              className={`flex-1 ${field(dark)}`}
            />
            <button onClick={commitSave} disabled={disabled} aria-label="Save scene" className={action}>
              <Icon path={I.check} className="w-5 h-5" />
            </button>
            <button onClick={() => setNaming(false)} aria-label="Cancel" className={iconButton(dark)}>
              <Icon path={I.close} className="w-5 h-5" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={startNaming}
              disabled={disabled}
              className={`flex-1 h-11 px-4 rounded-full border text-sm font-bold flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-40 ${
                dark ? 'border-white/20 hover:bg-white/10' : 'border-gray-300 hover:bg-black/5'
              }`}
            >
              <Icon path={I.save} className="w-4 h-4" />
              {currentSceneName ? `Save “${currentSceneName}”` : 'Save this scene'}
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
          </>
        )}
      </div>

      {notice && (
        <div className="px-4 pb-3 text-[11px] leading-snug opacity-60">{notice}</div>
      )}

      {scenes.length === 0 ? (
        <div className="px-4 pb-6 text-[13px] opacity-50 leading-snug">
          Nothing saved yet. A saved scene keeps its meshes, its eye level and the spot you were
          standing on.
        </div>
      ) : (
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
