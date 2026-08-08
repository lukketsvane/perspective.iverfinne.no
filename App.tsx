import React, { useEffect, useRef, useState } from 'react';
import { Scene } from './components/Scene';
import { WalkOverlay } from './components/WalkOverlay';
import { VanishingPoints } from './components/VanishingPoints';
import { SelectionBar } from './components/SelectionBar';
import { MeshSheet } from './components/MeshSheet';
import { SceneSheet } from './components/SceneSheet';
import { LightSheet } from './components/LightSheet';
import { useStore, saveSettings, currentView, standingRoom } from './store';
import { loadModelFile, loadModelFromUrl, findFreeSpot, modelRadius } from './lib/loadModel';
import { MESH_LIBRARY, openingMesh } from './lib/meshLibrary';
import { focusPoint } from './lib/focus';
import { walkInput } from './lib/walkInput';
import { fieldOf } from './lib/projection';
import { holdPreviews, resumePreviews } from './lib/meshPreview';
import { downloadSceneFile, readSceneFile, toSceneFile } from './lib/sceneJson';
import { beginActivity, reportFailure } from './lib/activity';
import { Activity } from './components/Activity';
import type { SceneModel } from './types';

/** The application is always a first-person workspace. */
export default function App() {
  const theme = useStore((s) => s.theme);
  const backgroundGray = useStore((s) => s.backgroundGray);
  const fov = useStore((s) => s.fov);
  const perspectiveMode = useStore((s) => s.perspectiveMode);
  const addModel = useStore((s) => s.addModel);
  const standObject = useStore((s) => s.standObject);
  const applyScene = useStore((s) => s.applyScene);
  const loadSceneHistory = useStore((s) => s.loadSceneHistory);
  const loadOwnMeshes = useStore((s) => s.loadOwnMeshes);
  const rememberMesh = useStore((s) => s.rememberMesh);
  const [sheet, setSheet] = useState<'meshes' | 'scenes' | 'lights' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    loadSceneHistory();
    loadOwnMeshes();
  }, [loadSceneHistory, loadOwnMeshes]);
  useEffect(() => useStore.subscribe((state) => saveSettings(state)), []);

  /** How much of the frame's height the opening object should fill. */
  const OPENING_SIZE = 0.45;

  /** Above this, it is something you look at standing up. */
  const EYE_TO_EYE = 1.2;

  /**
   * How far the opening object is turned off square, in radians.
   *
   * Forty degrees, which is the three-quarter view every product photograph and
   * every drawing lesson opens on. Square-on, a thing this long is a one-point
   * construction: one face, one point, and its whole depth hidden behind its own
   * back. Turned, all three of its axes run off to three separate places, and
   * the box drawn round it says so. That is the first thing the tool should be
   * showing, so it is what it starts with.
   */
  const OPENING_TURN = 0.7;

  /**
   * Stand where the whole of it can be seen, and look at its middle.
   *
   * Three things decide this. The angle it subtends against the angle the frame
   * covers - a 180 degree sheet puts nine times as much world on the glass as a
   * 60 degree lens. Its own size, since a stacking chair is knee high and the
   * car is six metres long. And how far the eye is *above* it: a chair 0.7 m
   * away from a 1.9 m eye is not 0.7 m away, it is 1.7 m away and mostly below
   * you, which is why it used to open small however close the walker was put.
   *
   * Which leaves the question of whether to kneel. Anything taller than about a
   * metre is something you look at from your own height - a person, a car - and
   * dropping to its waist would be a strange way to meet it. Anything lower has
   * to be knelt to, or it is a thing on the floor seen from above.
   */
  const frame = (size: [number, number, number]) => {
    const { cameraHeight, fov, room, setCameraHeight } = useStore.getState();
    const vertical = fieldOf(fov, window.innerWidth, window.innerHeight).halfPitch * 2;

    const longest = Math.max(size[0], size[1], size[2]);
    const wanted = Math.min(Math.PI * 0.8, vertical * OPENING_SIZE);
    /** How far the eye has to be from the object's middle, along the view. */
    const slant = longest / 2 / Math.tan(wanted / 2);

    // About the object's own length back, never inside arm's reach, and never
    // further than the room has floor: the car is six metres long, so its own
    // length put the viewer a step outside the front wall, looking in at it
    // through the brickwork.
    const distance = Math.min(standingRoom(room), 14, Math.max(0.9, longest * 0.9));
    const middle = size[1] / 2;
    // Whatever is left of the slant after the ground distance is height.
    const rise = Math.sqrt(Math.max(slant * slant - distance * distance, 0));
    const eye =
      size[1] >= EYE_TO_EYE ? cameraHeight : Math.min(cameraHeight, Math.max(0.8, middle + rise));

    setCameraHeight(eye);
    walkInput.position.set(0, 0, distance);
    walkInput.yaw = 0;
    walkInput.pitch = Math.atan2(middle - eye, distance);
    walkInput.lookYaw = 0;
    walkInput.lookPitch = 0;
    walkInput.seeded = true;
  };

  /**
   * The scene the tool starts from: the car on the origin, framed to fill it.
   *
   * Both the opening and the reset go through here, so those two are the same
   * state by construction rather than by two pieces of code agreeing. Reset
   * therefore means "back to how this started", which is a place to draw from,
   * rather than "empty grid", which is a place to look at.
   */
  const standOpening = () => {
    const entry = openingMesh();
    // Three megabytes over the network before anything stands up. The hairline
    // says so, rather than the grid sitting empty for a second and a half with
    // nothing to suggest that it will not stay that way. (A reset pays nothing:
    // the parsed source is still in hand, kept alive by the undo step.)
    const done = beginActivity();
    return loadModelFromUrl(entry.url, entry.name, [0, 0], entry.height)
      .then(({ model }) => {
        // Anything the viewer did in the meantime wins: a scene opened from the
        // library, or a mesh placed by hand, is not something to land on top of.
        const { models, boxes } = useStore.getState();
        if (models.length || boxes.length) return;
        standObject({ ...model, position: [0, 0, 0], rotationY: OPENING_TURN });
        // A scanned figure arrives normalised and is scaled on the way in, so
        // what it will stand at is its authored size times that scale. The turn
        // is not folded in: the framing wants the longest edge either way, and
        // the diagonal it presents when turned is within a few per cent of it.
        frame(model.size.map((metres) => metres * model.scale) as [number, number, number]);
      })
      .catch((error) => {
        console.error('Could not stand the opening model up:', error);
        reportFailure();
      })
      .finally(done);
  };

  /**
   * What is standing there when the tool opens. Guarded because a strict mode
   * double-mount would otherwise stand up two of them.
   */
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    standOpening();
    // Once: this is the scene the tool arrives with, not something that follows
    // any later state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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
    const done = beginActivity();
    try {
      await work();
    } catch (error) {
      console.error('Could not load that mesh:', error);
      reportFailure();
    } finally {
      done();
      resumePreviews();
      setBusy(null);
    }
  };

  const placeLibraryMesh = (id: string) => {
    const entry = MESH_LIBRARY.find((mesh) => mesh.id === id);
    if (!entry) return;
    return whileLoading(id, async () => {
      const { model } = await loadModelFromUrl(entry.url, entry.name, [focusPoint.x, focusPoint.z], entry.height);
      if (model.previewSupported) place(model);
    });
  };

  /**
   * A file dropped in.
   *
   * It is placed *and* kept: the shelf is what makes an import worth the walk to
   * the file picker, since the second time you want that chair it is already
   * here. A file the browser cannot read is not put on the shelf - there would
   * be nothing to place from it.
   */
  const importModels = (files: FileList) =>
    whileLoading('import', async () => {
      for (const file of Array.from(files)) {
        const { model } = await loadModelFile(file, [focusPoint.x, focusPoint.z]);
        if (!model.previewSupported) continue;
        place(model);
        await rememberMesh(model.fileUrl, model.name);
      }
    });

  /** Place one of the viewer's own again, from the shelf. */
  const placeOwnMesh = (url: string, name: string) =>
    whileLoading(url, async () => {
      const { model } = await loadModelFromUrl(url, name, [focusPoint.x, focusPoint.z]);
      if (model.previewSupported) place(model);
    });

  const exportScene = async () => {
    setBusy('export');
    const done = beginActivity();
    try {
      const state = useStore.getState();
      await downloadSceneFile(toSceneFile(state.boxes, state.models, currentView(state)));
    } catch (error) {
      console.error('Could not write the scene file:', error);
      reportFailure();
    } finally {
      done();
      setBusy(null);
    }
  };

  const importScene = async (file: File) => {
    setBusy('import');
    const done = beginActivity();
    try {
      const { boxes, models, view, skipped } = await readSceneFile(file);
      applyScene({ boxes, models, view });
      if (skipped.length > 0) {
        console.warn(`Some meshes were skipped on import:\n${skipped.join('\n')}`);
        // Part of a scene arriving is not a success, and the file it came from
        // is the only place the missing geometry now exists.
        reportFailure();
      }
      setSheet(null);
    } catch (error) {
      console.error('Scene import failed:', error);
      reportFailure();
    } finally {
      done();
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
      <Activity />
      <VanishingPoints color={isDark ? '#ff6a5e' : '#e0342a'} />
      <WalkOverlay
        onModels={() => setSheet('meshes')}
        onScenes={() => setSheet('scenes')}
        onLights={() => setSheet('lights')}
        covered={sheet !== null}
      />
      {sheet === 'meshes' && (
        <MeshSheet
          onClose={() => setSheet(null)}
          onPlace={placeLibraryMesh}
          onPlaceOwn={placeOwnMesh}
          onImport={importModels}
          busyId={busy}
        />
      )}
      {sheet === 'lights' && <LightSheet onClose={() => setSheet(null)} />}
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
