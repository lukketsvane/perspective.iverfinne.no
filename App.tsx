import { useEffect, useRef, useState } from 'react';
import { isSketch } from './types';
import { Scene } from './components/Scene';
import { WalkOverlay } from './components/WalkOverlay';
import { VanishingPoints } from './components/VanishingPoints';
import { Measures } from './components/Measures';
import { MeshSheet } from './components/MeshSheet';
import { SceneSheet } from './components/SceneSheet';
import { useStore, saveSettings, currentView, standingRoom } from './store';
import { loadModelFile, loadModelFromUrl, findFreeSpot, modelRadius } from './lib/loadModel';
import { MESH_LIBRARY, openingMesh } from './lib/meshLibrary';
import { focusPoint } from './lib/focus';
import { walkInput } from './lib/walkInput';
import { fieldOf } from './lib/projection';
import { constructionInk, pageHex } from './lib/inkMaterial';
import { keepAwake } from './lib/wakeLock';
import { holdPreviews, resumePreviews } from './lib/meshPreview';
import { downloadSceneFile, readSceneFile, toSceneFile } from './lib/sceneJson';
import { beginActivity, reportFailure } from './lib/activity';
import { Activity } from './components/Activity';
import type { SceneModel } from './types';

/** The application is always a first-person workspace. */
export default function App() {
  const theme = useStore((s) => s.theme);
  const backgroundGray = useStore((s) => s.backgroundGray);
  const surface = useStore((s) => s.surface);
  const backdrop = useStore((s) => s.backdrop);
  const addModel = useStore((s) => s.addModel);
  const standObject = useStore((s) => s.standObject);
  const applyScene = useStore((s) => s.applyScene);
  const loadSceneHistory = useStore((s) => s.loadSceneHistory);
  const loadOwnMeshes = useStore((s) => s.loadOwnMeshes);
  const rememberMesh = useStore((s) => s.rememberMesh);
  // The lights are not here: they are chrome, not a sheet - the overlay stands
  // them in the tools row's slot over a live dock, so the covering rule below
  // never applies to them.
  const [sheet, setSheet] = useState<'meshes' | 'scenes' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    loadSceneHistory();
    loadOwnMeshes();
    // A reference is propped up and drawn from; it does not get to go dark.
    keepAwake();
  }, [loadSceneHistory, loadOwnMeshes]);
  useEffect(() => useStore.subscribe((state) => saveSettings(state)), []);

  /*
   * The status bar is part of the page, on a phone saved to the home screen.
   *
   * Its style is "default", which lets iOS paint it from theme-color - so the
   * meta follows the live paper. Drag the tone and the bar sweeps with it;
   * cross into board and the clock goes to chalk. The one thing it must never
   * be is black-translucent's fixed white text over a white sheet.
   */
  useEffect(() => {
    // Read straight off the page the renderer is using. It used to re-derive
    // the tone from the ramp here, because the live value was written from a
    // layout effect inside the canvas's own reconciler and reading it from
    // out here raced and lost. It is written from a store subscription now,
    // which lands before any render that could read it - so there is one
    // answer to what is behind the drawing, and the bar quotes it rather than
    // recomputing it and hoping the two agree.
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute('content', pageHex()));
  }, [surface, backgroundGray, backdrop]);

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
   * IT HAS TO FIT IN BOTH DIRECTIONS, which is what this used to get wrong.
   * The old solve measured the object against the VERTICAL field only, and
   * then threw the answer away: the distance it actually used was the object's
   * own length, clamped by how much floor the room has. On an upright phone
   * that happened to look fine. Turned sideways it was a disaster - a landscape
   * frame has barely twenty degrees of pitch and ninety of yaw, the car is six
   * metres long, and the tool opened with its tail and its back wheel off the
   * bottom right of the screen.
   *
   * So both fields are asked, and the binding one wins: how far back the
   * object's LENGTH has to be to sit inside the horizontal half-field, how far
   * back its HEIGHT has to be to sit inside the vertical one, and stand at
   * whichever is greater. A six-metre car cannot fill a portrait phone without
   * being cropped, and the honest answer there is to stand further back.
   *
   * The room's floor still bounds it, but only when there IS a room. Clamping
   * to it with the walls switched off was the other half of the crop: 3.8 m is
   * the right limit for not standing outside the brickwork and the wrong one
   * for an object on an open grid.
   *
   * Then whether to kneel. Anything taller than about a metre is something you
   * meet from your own height - a person, a car - and dropping to its waist
   * would be a strange way to do it. Anything lower has to be knelt to, or it
   * is a thing on the floor seen from above.
   */
  const frame = (size: [number, number, number]) => {
    const { cameraHeight, fov, room, roomLevel, setCameraHeight } = useStore.getState();
    const field = fieldOf(fov, window.innerWidth, window.innerHeight);

    /** How much of each half-field the object is allowed to take. */
    const FILL = 0.86;
    const halfYaw = Math.min(field.halfYaw, Math.PI * 0.46);
    const halfPitch = Math.min(field.halfPitch, Math.PI * 0.46);

    /*
     * The width to clear is the FOOTPRINT'S radius, not the object's length.
     *
     * The opening turns the object forty degrees off square - which is the
     * whole point, so that all three of its axes run to three separate points -
     * and a turned six-by-six-metre footprint presents its diagonal, eight and
     * a half metres, not its length.
     */
    const across = Math.hypot(size[0], size[2]) / 2;
    const middle = size[1] / 2;
    const eye = size[1] >= EYE_TO_EYE ? cameraHeight : Math.max(0.8, middle + 0.55);

    /*
     * ...and the height to clear is not the object's height either.
     *
     * A long thing seen from a standing eye runs a long way DOWN the frame:
     * its near end is close, and the angle from the horizon down to the ground
     * at that near end is most of the vertical field on a landscape phone. The
     * old solve measured the object's own height, which is the one number that
     * has nothing to do with it, and the tool opened with the front wheel off
     * the bottom of the screen.
     *
     * Both conditions are transcendental in the distance, so they are searched
     * rather than solved: the smallest standing distance at which the
     * footprint fits the yaw AND the near end's drop plus the far end's rise
     * fit the pitch. Sixteen halvings settle it to a centimetre, once, when
     * the object is stood up.
     */
    const fits = (d: number) => {
      if (Math.atan(across / d) > halfYaw * FILL) return false;
      const near = Math.max(d - across, 0.35);
      const drop = Math.atan(eye / near);
      const rise = Math.atan(Math.max(size[1] - eye, 0.02) / near);
      return drop + rise <= 2 * halfPitch * FILL;
    };
    let low = 0.9;
    let high = 60;
    if (!fits(high)) low = high;
    else {
      for (let i = 0; i < 16; i++) {
        const mid = (low + high) / 2;
        if (fits(mid)) high = mid;
        else low = mid;
      }
    }
    // The room's floor still bounds it, but only when there IS a room. Clamping
    // to it with the walls switched off was the other half of the crop: 3.8 m
    // is the right limit for not standing outside the brickwork and the wrong
    // one for an object on an open grid.
    const distance = Math.min(roomLevel > 0 ? standingRoom(room) : Infinity, 60, Math.max(0.9, high));

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
    const scene = entry.kind === 'scene';
    return whileLoading(id, async () => {
      const { model } = await loadModelFromUrl(
        entry.url,
        entry.name,
        scene ? [0, 0] : [focusPoint.x, focusPoint.z],
        entry.height
      );
      if (!model.previewSupported) return;
      // A room goes on the origin, squarely, and does not go looking for a
      // clear patch of floor to stand beside what is already there - it *is*
      // the floor. Standing one where you happened to be looking would put you
      // in the middle of a wall.
      if (scene) addModel({ ...model, kind: 'scene', position: [0, 0, 0] });
      else place(model);
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
      await downloadSceneFile(toSceneFile(state.boxes, state.models, state.lamps, currentView(state)));
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
      const { boxes, models, lamps, view, skipped } = await readSceneFile(file);
      applyScene({ boxes, models, lamps, view });
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
      // The same page the canvas paints, so the safe-area strips above and
      // below it are the mount rather than an approximation of it.
      style={{ minHeight: '100dvh', backgroundColor: pageHex() }}
    >
      <Scene />
      <Activity />
      <VanishingPoints color={constructionInk(isSketch(surface), isDark)} />
      <Measures />
      {/*
        * Both libraries are handed to the overlay rather than drawn over it.
        *
        * They used to come up from the bottom edge as modal sheets, which put
        * them on top of the dock - so the moment either was open the whole
        * toolbar was gone, and you could not see what you were placing a mesh
        * into. They stand in the panel slot now, above the dock and beside the
        * tools and the lights, as one row you scroll sideways. Which is what
        * they are: a shelf.
        */}
      <WalkOverlay
        onModels={() => setSheet((at) => (at === 'meshes' ? null : 'meshes'))}
        onScenes={() => setSheet((at) => (at === 'scenes' ? null : 'scenes'))}
        shelfOpen={sheet !== null}
        onShelfAway={() => setSheet(null)}
        shelf={
          sheet === 'meshes' ? (
            <MeshSheet
              onClose={() => setSheet(null)}
              onPlace={placeLibraryMesh}
              onPlaceOwn={placeOwnMesh}
              onImport={importModels}
              busyId={busy}
            />
          ) : sheet === 'scenes' ? (
            <SceneSheet
              onClose={() => setSheet(null)}
              onExport={exportScene}
              onImport={importScene}
              busy={busy !== null}
            />
          ) : null
        }
      />
    </div>
  );
}
