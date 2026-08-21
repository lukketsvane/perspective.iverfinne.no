import { useEffect, useRef, useState } from 'react';
import { isSketch } from './types';
import { Scene } from './components/Scene';
import { WalkOverlay } from './components/WalkOverlay';
import { VanishingPoints } from './components/VanishingPoints';
import { Measures } from './components/Measures';
import { MeshSheet } from './components/MeshSheet';
import { SceneSheet } from './components/SceneSheet';
import { useStore, saveSettings, currentView } from './store';
import { loadModelFile, loadModelFromUrl, modelRadius } from './lib/loadModel';
import { findFreeSpot, onTheFloor } from './lib/placement';
import { MESH_LIBRARY } from './lib/meshLibrary';
import { focusPoint } from './lib/focus';
import { glideWalkerTo, walkInput } from './lib/walkInput';
import { constructionInk, pageHex } from './lib/inkMaterial';
import { keepAwake } from './lib/wakeLock';
import { useAutoDeal } from './lib/autoDeal';
import { holdPreviews, resumePreviews } from './lib/meshPreview';
import { downloadSceneFile, readSceneFile, toSceneFile } from './lib/sceneJson';
import { beginActivity, reportFailure } from './lib/activity';
import { Activity } from './components/Activity';
import { CameraFeed } from './components/CameraFeed';
import { Photograph } from './components/Photograph';
import { Gate } from './components/Gate';
import { Lesson } from './components/Lesson';
import { Hints } from './components/Hints';
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
  /* The perspective lesson, which takes the whole tool over while it runs. */
  const [teaching, setTeaching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    loadSceneHistory();
    loadOwnMeshes();
    // A reference is propped up and drawn from; it does not get to go dark.
    keepAwake();
  }, [loadSceneHistory, loadOwnMeshes]);
  useEffect(() => useStore.subscribe((state) => saveSettings(state)), []);

  /*
   * The one thing that happens without being asked: the dealer turns a page of
   * the deck over in the gaps between working.
   *
   * It is here rather than inside the overlay because it is not chrome - it
   * goes on whether or not a panel is open, and the overlay unmounts nothing.
   * It used to have company. The sky ran a clock beside it, stepping the
   * simulated hour on every frame and asking a forecast once in a while
   * whether the real sky over your street had changed; the clock's switch and
   * the place it asked about are both gone, so the loop went with them and the
   * hour moves only under a finger now.
   */
  useAutoDeal();

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

  /**
   * THE DOOR: a figure waving, and a metre cube standing beside her.
   *
   * TWO THINGS, AND IT HAS BEEN THREE DIFFERENT DOORS.
   *
   * It was the racer and its yard first - one beautiful object, framed, which
   * taught scale and taught nothing else until you walked. Then it was a
   * STREET: two rows of metre cubes running their edges to one point, three
   * lamps repeating down one side, three figures at three depths for the line
   * to cut, and one box turned in the roadway carrying its own pair of points.
   * That was the lesson's whole deck laid out as one place, and every word of
   * that argument was true.
   *
   * It was also a demonstration, and a demonstration has to be read. A viewer
   * who has never met a vanishing point sees a car park. The gaps compress and
   * the lamps measure the depth and the turned box refuses the street's points,
   * and not one of those facts announces itself to somebody who does not
   * already have the words for it - they are the ANSWERS to the deck, standing
   * in the doorway before the questions have been asked.
   *
   * What a character and a cube say instead is one thing, and everybody reads
   * it without being told: THAT is how big a person is, and THIS is how big a
   * metre is, and here they are side by side. Which is the sentence this whole
   * tool is built on - a scene is right when the sizes are right - and it is
   * the one thing the street could not say, because a street has nothing in it
   * you already know the size of.
   *
   * The street is not gone. It is a card in the deck and one of the eleven
   * arrangements the shelf deals, which is where an exercise belongs: something
   * you ask for when you want to draw it, rather than something standing in
   * the hall.
   */
  const DOOR_CUBE = { at: [-0.8, -2.2] as [number, number], turn: 0.42 };

  /**
   * And she is turned to nothing: the library's figures face +Z, the eye stands
   * at +Z, so a turn of zero is her looking straight back at you.
   *
   * The waving one of the five standing poses, because a door is a greeting and
   * because the raised arm is the one part of her that goes ABOVE the eye line -
   * which is the first thing in the frame that is not explained by the ground.
   */
  const DOOR_FIGURE = { id: 'hare-standing-5', at: [0.4, -1.9] as [number, number], turn: 0 };

  /**
   * Where the tool stands you when it opens: two and three quarter metres from
   * her, half a step off the axis so the pair reads as two things beside each
   * other rather than one behind the other.
   *
   * NEAR, AND THE NUMBER IS THE FIELD'S DOING. The tool opens at 210 degrees -
   * the whole of human sight on one sheet - and at that field a metre subtends
   * very little. The street could stand its nearest figure five and a half
   * metres off and get away with it, because a street is a hundred square
   * metres of subject and something was always close; two objects have to BE
   * close, or the door is a wide grey floor with two specks on it. At two and
   * three quarters she is about a fifth of the frame's height, which is a
   * figure you can see the drawing problem in, and the cube beside her is
   * unmistakably a metre of the same floor.
   *
   * A fixed stand, not a solve. The racer needed framing because it was one
   * object of one size and the frame had to be searched for; two things at a
   * known distance hold their view in either orientation without arithmetic.
   */
  const DOOR_STAND = { x: 0.55, z: 0.85, yaw: -0.05, pitch: -0.02 };

  /**
   * The scene the tool starts from: her, the cube, and the ground.
   *
   * Both the opening and the reset go through here, so those two are the same
   * state by construction rather than by two pieces of code agreeing. Reset
   * therefore means "back to how this started", which is a place to draw from,
   * rather than "empty grid", which is a place to look at.
   *
   * THE FIGURE IS FETCHED BEFORE ANYTHING STANDS UP: one await, one guard, one
   * arrangement, so a viewer who placed something during the load never finds
   * half a door landing on top of it. The cube costs nothing to fetch; the wall
   * clock is one 190 KB mesh, which is a hundredth of what the aeroplane that
   * used to open here weighed.
   *
   * NO LAMPS. Three of them used to repeat down one side of the street, and
   * they were there to measure its depth - a job nothing in a two-object frame
   * needs doing. The sun and the sky light this, the way they light everything
   * else the tool has not been asked to light itself.
   *
   * The stand is glided to, not cut to: this lands a moment after boot, and a
   * hard cut reads as the picture snapping under whoever is already looking.
   */
  const standOpening = () => {
    /*
     * The suite's empty-yard door. Specs about blocking out and placing need
     * the floor the opening now occupies, and they count what they made - so a
     * key written before the app's first line of script opens the tool bare:
     * the same stand, nothing on it. The same seam the page pin uses, for the
     * same reason: the production build the suite runs against has no other
     * way in, and nobody reaches it by accident.
     */
    try {
      if (localStorage.getItem('kjg-perspective-bare') !== null) {
        walkInput.lookYaw = 0;
        walkInput.lookPitch = 0;
        walkInput.seeded = true;
        glideWalkerTo({ ...DOOR_STAND });
        return Promise.resolve();
      }
    } catch {
      /* no storage is no bare door, which is the right default */
    }
    const done = beginActivity();
    const mesh = MESH_LIBRARY.find((m) => m.id === DOOR_FIGURE.id);
    return Promise.resolve(
      mesh
        ? loadModelFromUrl(mesh.url, mesh.name, DOOR_FIGURE.at, mesh.height, mesh.lift)
            .then(({ model }) => ({ ...model, rotationY: DOOR_FIGURE.turn }))
            // A missing file is a cube on a floor, not a tool that failed to open.
            .catch(() => null)
        : null
    )
      .then((figure) => {
        // Anything the viewer did in the meantime wins: a scene opened from the
        // library, or a mesh placed by hand, is not something to land on top of.
        const state = useStore.getState();
        if (state.models.length || state.boxes.length) return;
        useStore.setState({
          boxes: [
            {
              /*
               * Turned nearly a quarter off the grid, which is the whole of what
               * one cube can say that a square one cannot: square on, two of its
               * three families run straight across the page and the third goes
               * to the middle, and the picture is a diagram of one-point
               * perspective. Turned, it has a pair of its own on the horizon,
               * and holding it draws them.
               */
              id: 'door-cube',
              position: [DOOR_CUBE.at[0], 0.5, DOOR_CUBE.at[1]] as [number, number, number],
              scale: [1, 1, 1] as [number, number, number],
              rotation: [0, DOOR_CUBE.turn, 0] as [number, number, number],
              surface: state.surface,
            },
          ],
          lamps: [],
        });
        if (figure) standObject(figure);
        walkInput.lookYaw = 0;
        walkInput.lookPitch = 0;
        walkInput.seeded = true;
        glideWalkerTo({ ...DOOR_STAND });
      })
      .catch((error) => {
        console.error('Could not stand the opening scene up:', error);
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


  /**
   * Stand a new mesh clear of everything already placed, near the gaze point.
   *
   * Everything, now: this asked only about the other meshes, so a chair set
   * down where a blocked-in box already stood went straight through it.
   */
  const place = (model: Omit<SceneModel, 'id'>, quiet?: boolean) => {
    const [x, z] = findFreeSpot(
      onTheFloor(useStore.getState()),
      [focusPoint.x, focusPoint.z],
      modelRadius(model)
    );
    // Stepping aside is a move on the FLOOR. Writing a zero in here used to
    // put anything that came off the shelf already in the air - the jumping
    // hare - straight back down onto its lowest boot.
    addModel({ ...model, position: [x, model.position[1], z] }, quiet);
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
        entry.height,
        entry.lift
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
      /*
       * ONE STEP BACK FOR THE WHOLE DROP, taken before any of it lands.
       *
       * Twenty files used to be twenty steps, which is wrong twice over. To
       * undo a drop you had to press it twenty times. And a parsed mesh is
       * held in memory while ANY history entry still names its file - that is
       * what makes undo able to bring it back - so twenty steps pinned twenty
       * meshes for the twenty-five actions afterwards, in the scene or not.
       * Dropping a folder of figures on a phone spends its memory on the
       * history of the drop rather than on the drop.
       */
      useStore.getState().beginChange();
      for (const file of Array.from(files)) {
        const { model } = await loadModelFile(file, [focusPoint.x, focusPoint.z]);
        if (!model.previewSupported) continue;
        place(model, true);
        await rememberMesh(model.fileUrl, model.name);
      }
    });

  /**
   * A photograph to sight against, picked off the device.
   *
   * Held as an object URL and nothing else: it is not written into IndexedDB,
   * not put on the shelf, and not saved into a scene - see `photograph` in
   * types.ts for why a reference you look at for ten minutes should not outlive
   * the tab it was opened in.
   */
  const photoInput = useRef<HTMLInputElement>(null);
  const takePhotograph = (file: File | undefined) => {
    if (!file) return;
    useStore.getState().setPhotograph(URL.createObjectURL(file));
  };

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
      // Filed under whatever the open project is called, which is the whole
      // point of it having a name: an export used to land as `scene.perspective`
      // however many of them you wrote, so a folder of them was a folder of
      // one filename with numbers after it.
      const open = state.sceneHistory.find((scene) => scene.id === state.currentSceneId);
      await downloadSceneFile(
        toSceneFile(state.boxes, state.models, state.lamps, currentView(state), open?.name)
      );
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
      {/* The real room, under everything the tool draws over it. */}
      <CameraFeed />
      {/* And a still one, in the same slot: a reference photograph under the
          ruled sheet, which is the half of "the real room" that is not the
          room you happen to be standing in. */}
      <Photograph />
      <Activity />
      {/* Hold any control to be told what it is. */}
      <Hints />
      {teaching && <Lesson onDone={() => setTeaching(false)} />}
      {/* The frame a lens composes into, over the picture and under the
          chrome - ruled in the same ink as the rest of the construction. */}
      <Gate ink={constructionInk(isSketch(surface), isDark)} />
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
        onLesson={() => setTeaching(true)}
        onPhotograph={() => photoInput.current?.click()}
        shelf={
          sheet === 'meshes' ? (
            <MeshSheet
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
      {/*
        * The picker for the photograph, kept out of the way and clicked from
        * the panel - the same hidden-input-and-a-ref shape the mesh shelf uses
        * for its own imports, and for the same reason: a file input styled to
        * look like anything is a file input that looks different on every
        * platform.
        */}
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          takePhotograph(event.target.files?.[0]);
          // Cleared so that picking the same file twice still fires a change.
          event.target.value = '';
        }}
      />
    </div>
  );
}
