import React, { useEffect, useState } from 'react';
import { Scene } from './components/Scene';
import { WalkOverlay } from './components/WalkOverlay';
import { ConeOfVision } from './components/ConeOfVision';
import { VanishingPoints } from './components/VanishingPoints';
import { SelectionBar } from './components/SelectionBar';
import { MeshSheet } from './components/MeshSheet';
import { useStore, saveSettings } from './store';
import { loadModelFile, loadModelFromUrl, findFreeSpot, modelRadius } from './lib/loadModel';
import { MESH_LIBRARY } from './lib/meshLibrary';
import { focusPoint } from './lib/focus';
import { downloadSceneJson, importSceneJson } from './lib/sceneJson';

/** The application is always a first-person workspace. */
export default function App() {
  const theme = useStore((s) => s.theme);
  const backgroundGray = useStore((s) => s.backgroundGray);
  const fov = useStore((s) => s.fov);
  const perspectiveMode = useStore((s) => s.perspectiveMode);
  const showCone = useStore((s) => s.showCone);
  const addModel = useStore((s) => s.addModel);
  const loadHistoryFromStorage = useStore((s) => s.loadHistoryFromStorage);
  const [showMeshes, setShowMeshes] = useState(false);
  const [busyMesh, setBusyMesh] = useState<string | null>(null);

  useEffect(() => loadHistoryFromStorage(), [loadHistoryFromStorage]);
  useEffect(() => useStore.subscribe((state) => saveSettings(state)), []);

  const freeSpot = (footprint: number): [number, number] =>
    findFreeSpot(
      useStore.getState().models.map((model) => ({ position: model.position, radius: modelRadius(model) })),
      [focusPoint.x, focusPoint.z],
      footprint
    );

  const placeLibraryMesh = async (id: string) => {
    const entry = MESH_LIBRARY.find((mesh) => mesh.id === id);
    if (!entry) return;
    setBusyMesh(id);
    try {
      const { model } = await loadModelFromUrl(entry.url, entry.name, [focusPoint.x, focusPoint.z]);
      if (!model.previewSupported) return;
      const [x, z] = freeSpot(modelRadius(model));
      addModel({ ...model, position: [x, 0, z] });
    } finally {
      setBusyMesh(null);
    }
  };

  const importModels = async (files: FileList) => {
    setBusyMesh('import');
    try {
      for (const file of Array.from(files)) {
        const { model } = await loadModelFile(file, [focusPoint.x, focusPoint.z]);
        if (!model.previewSupported) continue;
        const [x, z] = freeSpot(modelRadius(model));
        addModel({ ...model, position: [x, 0, z] });
      }
    } finally {
      setBusyMesh(null);
    }
  };

  const handleExportScene = () => {
    const models = useStore.getState().models;
    downloadSceneJson(models);
  };

  const handleImportScene = async (file: File) => {
    setBusyMesh('import');
    try {
      const { models, skipped } = await importSceneJson(file);
      for (const model of models) {
        addModel(model);
      }
      if (skipped.length > 0) {
        console.warn('Some assets were skipped during scene import:\n' + skipped.join('\n'));
      }
    } catch (error) {
      console.error('Scene import failed:', error instanceof Error ? error.message : error);
      alert(`Could not import scene: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
      setBusyMesh(null);
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
        onModels={() => setShowMeshes(true)}
        onImport={importModels}
        onExportScene={handleExportScene}
        onImportScene={handleImportScene}
        busyId={busyMesh}
      />
      {showMeshes && (
        <MeshSheet
          onClose={() => setShowMeshes(false)}
          onPlace={placeLibraryMesh}
          onImport={importModels}
          onExportScene={handleExportScene}
          onImportScene={handleImportScene}
          busyId={busyMesh}
        />
      )}
      <SelectionBar raised={showMeshes} />
    </div>
  );
}
