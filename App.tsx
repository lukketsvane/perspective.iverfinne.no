import React, { useEffect, useState } from 'react';
import { Scene } from './components/Scene';
import { WalkOverlay } from './components/WalkOverlay';
import { ConeOfVision } from './components/ConeOfVision';
import { VanishingPoints } from './components/VanishingPoints';
import { SelectionBar } from './components/SelectionBar';
import { MeshSheet } from './components/MeshSheet';
import { SceneSheet } from './components/SceneSheet';
import { useStore, saveSettings } from './store';
import { loadModelFile, loadModelFromUrl, findFreeSpot, modelRadius } from './lib/loadModel';
import { MESH_LIBRARY } from './lib/meshLibrary';
import { focusPoint } from './lib/focus';
import { holdPreviews, resumePreviews } from './lib/meshPreview';
import { downloadSceneFile, readSceneFile, toSceneFile } from './lib/sceneJson';
import type { SceneModel } from './types';

/** The application is always a first-person workspace. */
export default function App() {
  const theme = useStore((s) => s.theme);
  const backgroundGray = useStore((s) => s.backgroundGray);
  const fov = useStore((s) => s.fov);
  const perspectiveMode = useStore((s) => s.perspectiveMode);
  const showCone = useStore((s) => s.showCone);
  const addModel = useStore((s) => s.addModel);
  const applyScene = useStore((s) => s.applyScene);
  const loadSceneHistory = useStore((s) => s.loadSceneHistory);
  const [sheet, setSheet] = useState<'meshes' | 'scenes' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    loadSceneHistory();
  }, [loadSceneHistory]);
  useEffect(() => useStore.subscribe((state) => saveSettings(state)), []);

  /** Stand a new mesh clear of everything already placed, near the gaze point. */
  const place = (model: Omit<SceneModel, 'id'>) => {
    const [x, z] = findFreeSpot(
      useStore.getState().models.map((other) => ({ position: other.position, radius: modelRadius(other) })),
      [focusPoint.x, focusPoint.z],
      modelRadius(model)
    );
    addModel({ ...model, position: [x, 0, z] });
  };

  /**
   * Loading something that was asked for.
   *
   * The library's own thumbnails are drawn on this same thread, so they are
   * stood down for the duration: the mesh you tapped should not queue behind
   * pictures of the ones you did not.
   */
  const whileLoading = async (id: string, work: () => Promise<void>) => {
    setBusy(id);
    holdPreviews();
    try {
      await work();
    } catch (error) {
      console.error('Could not load that mesh:', error);
    } finally {
      resumePreviews();
      setBusy(null);
    }
  };

  const placeLibraryMesh = (id: string) => {
    const entry = MESH_LIBRARY.find((mesh) => mesh.id === id);
    if (!entry) return;
    return whileLoading(id, async () => {
      const { model } = await loadModelFromUrl(entry.url, entry.name, [focusPoint.x, focusPoint.z]);
      if (model.previewSupported) place(model);
    });
  };

  const importModels = (files: FileList) =>
    whileLoading('import', async () => {
      for (const file of Array.from(files)) {
        const { model } = await loadModelFile(file, [focusPoint.x, focusPoint.z]);
        if (model.previewSupported) place(model);
      }
    });

  const exportScene = () => {
    const state = useStore.getState();
    downloadSceneFile(toSceneFile(state.boxes, state.models, undefined, state.currentSceneName ?? undefined));
  };

  const importScene = async (file: File) => {
    setBusy('import');
    try {
      const { boxes, models, view, skipped } = await readSceneFile(file);
      applyScene({ boxes, models, view });
      if (skipped.length > 0) {
        console.warn(`Some meshes were skipped on import:\n${skipped.join('\n')}`);
      }
      setSheet(null);
    } catch (error) {
      console.error('Scene import failed:', error);
      alert(`Could not read that scene: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
      setBusy(null);
    }
  };

  const isDark = theme === 'dark';
  return (
    <div
      className="fixed inset-0 w-screen h-screen font-sans selection:bg-none"
      style={{ minHeight: '100dvh', backgroundColor: `rgb(${backgroundGray}, ${backgroundGray}, ${backgroundGray})` }}
    >
      <Scene />
      {showCone && perspectiveMode === 'linear' && (
        <ConeOfVision fov={fov} color={isDark ? '#8ab4ff' : '#1f6feb'} />
      )}
      <VanishingPoints color={isDark ? '#ff6a5e' : '#e0342a'} />
      <WalkOverlay
        onModels={() => setSheet('meshes')}
        onScenes={() => setSheet('scenes')}
        onImport={importModels}
      />
      {sheet === 'meshes' && (
        <MeshSheet onClose={() => setSheet(null)} onPlace={placeLibraryMesh} busyId={busy} />
      )}
      {sheet === 'scenes' && (
        <SceneSheet
          onClose={() => setSheet(null)}
          onExport={exportScene}
          onImport={importScene}
          busy={busy !== null}
        />
      )}
      <SelectionBar raised={sheet !== null} />
    </div>
  );
}
