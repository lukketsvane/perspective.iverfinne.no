import React, { useEffect, useRef, useState } from 'react';
import { Scene } from './components/Scene';
import { WalkOverlay } from './components/WalkOverlay';
import { ConeOfVision } from './components/ConeOfVision';
import { VanishingPoints } from './components/VanishingPoints';
import { SelectionBar } from './components/SelectionBar';
import { MeshSheet } from './components/MeshSheet';
import { SceneSheet } from './components/SceneSheet';
import { LightSheet } from './components/LightSheet';
import { ProjectionSheet } from './components/ProjectionSheet';
import { useStore, saveSettings, currentView } from './store';
import { loadModelFile, loadModelFromUrl, findFreeSpot, modelRadius } from './lib/loadModel';
import { MESH_LIBRARY, randomMesh } from './lib/meshLibrary';
import { focusPoint } from './lib/focus';
import { walkInput } from './lib/walkInput';
import { fieldOf } from './lib/projection';
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
  const [sheet, setSheet] = useState<'meshes' | 'scenes' | 'lights' | 'projections' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    loadSceneHistory();
  }, [loadSceneHistory]);
  useEffect(() => useStore.subscribe((state) => saveSettings(state)), []);

  /**
   * What is standing there when the tool opens.
   *
   * One of the four, picked at random, on the origin. An empty grid is a
   * harder thing to start drawing than a chair whose real size you know, and a
   * different one each time is a different exercise. Guarded because a strict
   * mode double-mount would otherwise stand up two of them.
   */
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    const entry = randomMesh();
    loadModelFromUrl(entry.url, entry.name, [0, 0])
      .then(({ model }) => {
        // Anything the viewer did in the meantime wins: a scene opened from the
        // library, or a mesh placed by hand, is not something to land on top of.
        const { models, boxes } = useStore.getState();
        if (models.length || boxes.length) return;
        addModel({ ...model, position: [0, 0, 0] });
        useStore.setState({ selectedModelId: null });
        frame(model.size);
      })
      .catch((error) => console.error('Could not open with a model:', error));
  }, [addModel]);

  /** How much of the frame's height the opening object should fill. */
  const OPENING_SIZE = 0.3;

  /**
   * Stand where the whole of it can be seen, and look at its middle.
   *
   * The four are not one size - a stacking chair is knee high, the car is six
   * metres long - so a distance in metres frames one of them and loses the
   * other. What matters is the angle it subtends against the angle the frame
   * covers, and in this tool that second figure moves too: a 210 degree
   * curvilinear field puts nine times as much world on the glass as a 60 degree
   * lens does. Distance is worked back from the two of them, then held inside
   * the range a person could actually stand at.
   */
  const frame = (size: [number, number, number]) => {
    const { cameraHeight, fov, perspectiveMode } = useStore.getState();
    const vertical =
      perspectiveMode === 'linear'
        ? (fov * Math.PI) / 180
        : fieldOf(fov, window.innerWidth, window.innerHeight).halfPitch * 2;

    const longest = Math.max(size[0], size[1], size[2]);
    const wanted = Math.min(Math.PI * 0.8, vertical * OPENING_SIZE);
    const distance = Math.min(14, Math.max(1.2, longest / 2 / Math.tan(wanted / 2)));

    walkInput.position.set(0, 0, distance);
    walkInput.yaw = 0;
    walkInput.pitch = Math.atan2(size[1] / 2 - cameraHeight, distance);
    walkInput.lookYaw = 0;
    walkInput.lookPitch = 0;
    walkInput.seeded = true;
  };

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
    downloadSceneFile(toSceneFile(state.boxes, state.models, currentView(state)));
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
        onLights={() => setSheet('lights')}
        onProjections={() => setSheet('projections')}
        onImport={importModels}
        covered={sheet !== null}
      />
      {sheet === 'meshes' && (
        <MeshSheet onClose={() => setSheet(null)} onPlace={placeLibraryMesh} busyId={busy} />
      )}
      {sheet === 'lights' && <LightSheet onClose={() => setSheet(null)} />}
      {sheet === 'projections' && <ProjectionSheet onClose={() => setSheet(null)} />}
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
