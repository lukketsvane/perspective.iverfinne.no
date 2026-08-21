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
import { useSkyClock } from './lib/skyClock';
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
   * The two things that happen without being asked.
   *
   * The sky's clock moves the simulated hour along and keeps a live sky live;
   * the dealer turns a page of the deck over in the gaps between working. Both
   * are here rather than inside the overlay because neither is chrome - they go
   * on whether or not a panel is open, and the overlay unmounts nothing.
   */
  useSkyClock();
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
   * THE STREET: what is standing there when the tool opens.
   *
   * The opening used to be the racer with its yard - one beautiful object,
   * framed. It taught scale and it taught nothing else, and everything this
   * tool is actually about had to be walked to. The street teaches all of it
   * at once, standing still: two rows of metre cubes run their edges to one
   * point on the horizon; the gaps between them - a metre each, every one -
   * compress toward it, which is depth made visible; the lamps repeat down
   * one side, the measure the drawing books say to lean on; the figures put
   * known heights at three depths for the eye-level line to cut; and one box
   * stands turned in the middle of the road, carrying its own pair of points
   * along the same horizon. It is the lesson's whole deck laid out as one
   * place - and the racer is still on the shelf, one tap away.
   *
   * A composition, not a car park: laid out by hand against the stand below,
   * and looked at from it, in both orientations, before any number settled.
   */
  const STREET_ROWS: { at: [number, number]; tall: number }[] = [
    // The left row, with one cube grown into a tower so the skyline varies
    // and there is a tall vertical to find the zenith with.
    { at: [-2, -1], tall: 1 },
    { at: [-2, -3], tall: 1 },
    { at: [-2, -5], tall: 3 },
    { at: [-2, -7], tall: 1 },
    { at: [-2, -9], tall: 1 },
    { at: [-2, -11], tall: 1 },
    // The right row, its tower deeper so the two do not read as a gate.
    { at: [2, -1], tall: 1 },
    { at: [2, -3], tall: 1 },
    { at: [2, -5], tall: 1 },
    { at: [2, -7], tall: 2.2 },
    { at: [2, -9], tall: 1 },
    { at: [2, -11], tall: 1 },
  ];

  /**
   * The intruder: one cube in the roadway, turned half a radian off the grid.
   *
   * Everything else in the scene shares one family of edges and one pair of
   * points. This one refuses, and holding it (its own construction is one tap
   * away) shows its pair standing on the SAME horizon, somewhere else - which
   * is the fact about turned things almost nobody is taught.
   */
  const STREET_INTRUDER = { at: [0.95, -6.1] as [number, number], turn: 0.5 };

  /** Three lamps down the left side, two grid squares apart, every time. */
  const STREET_LAMPS: [number, number][] = [
    [-1.3, -2],
    [-1.3, -6],
    [-1.3, -10],
  ];

  /**
   * Who is standing in the street, and at which depths.
   *
   * The walker is the 1.80 from the lesson, mid-street, coming toward you:
   * the eye-level line cuts him through the face, which is the first check of
   * any figure in any scene. The jetpack one hovers deeper at 1.15, so the
   * line goes over his helmet - same line, different verdict, which is the
   * point. The kneeling crewman is nearest and lowest, at work; a folded
   * figure close up is the hardest of the three to draw and earns the near
   * spot the way he earned it beside the racer.
   */
  const STREET_FIGURES: { id: string; at: [number, number]; turn: number }[] = [
    // The library's figures face +Z at a turn of zero, and the eye stands at
    // +Z: zero IS facing the viewer, walking out of the street.
    { id: 'astro-walking', at: [0.5, -4.0], turn: 0 },
    { id: 'astro-jetpack', at: [-1.05, -8.2], turn: 0.45 },
    { id: 'crew-kneeling', at: [2.75, -1.3], turn: 2.6 },
  ];

  /**
   * Where the tool stands you when it opens: at the mouth of the street,
   * half a step off its axis so the near row leads in rather than walls off.
   *
   * A fixed stand, not a solve. The racer needed framing because it was one
   * object of one size; a street is a place, and a place holds its view in
   * either orientation - portrait sees it deep, landscape sees both rows.
   */
  const STREET_STAND = { x: 0.55, z: 1.8, yaw: -0.05, pitch: -0.02 };


  /**
   * The scene the tool starts from: the street, with the eye at its mouth.
   *
   * Both the opening and the reset go through here, so those two are the same
   * state by construction rather than by two pieces of code agreeing. Reset
   * therefore means "back to how this started", which is a place to draw from,
   * rather than "empty grid", which is a place to look at.
   *
   * EVERYTHING IS FETCHED BEFORE ANYTHING STANDS UP: one await, one guard,
   * one arrangement, so a viewer who placed something during the load never
   * finds half a street landing on top of it. The cubes and the lamps cost
   * nothing to fetch; the wall clock is the three figures', and they are a
   * fraction of what the aeroplane that used to open here weighed - the
   * twenty-megabyte racer now loads when it is asked for, from the shelf,
   * instead of on every first visit.
   *
   * The stand is glided to, not cut to: this lands a moment after boot, and a
   * hard cut reads as the picture snapping under whoever is already looking.
   */
  const standOpening = () => {
    /*
     * The suite's empty-yard door. Specs about blocking out and placing need
     * the floor the street now occupies, and they count what they made - so a
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
        glideWalkerTo({ ...STREET_STAND });
        return Promise.resolve();
      }
    } catch {
      /* no storage is no bare door, which is the right default */
    }
    const done = beginActivity();
    return Promise.all(
      STREET_FIGURES.map((who) => {
        const mesh = MESH_LIBRARY.find((m) => m.id === who.id);
        if (!mesh) return Promise.resolve(null);
        return loadModelFromUrl(mesh.url, mesh.name, who.at, mesh.height, mesh.lift)
          .then(({ model }) => ({ ...model, rotationY: who.turn }))
          // One missing file is an emptier street, not a tool that failed to open.
          .catch(() => null);
      })
    )
      .then((figures) => {
        // Anything the viewer did in the meantime wins: a scene opened from the
        // library, or a mesh placed by hand, is not something to land on top of.
        const state = useStore.getState();
        if (state.models.length || state.boxes.length) return;
        useStore.setState({
          boxes: [
            ...STREET_ROWS.map(({ at: [x, z], tall }, n) => ({
              id: `street-${n}`,
              position: [x, tall / 2, z] as [number, number, number],
              scale: [1, tall, 1] as [number, number, number],
              rotation: [0, 0, 0] as [number, number, number],
              surface: state.surface,
            })),
            {
              id: 'street-turned',
              position: [STREET_INTRUDER.at[0], 0.5, STREET_INTRUDER.at[1]] as [number, number, number],
              scale: [1, 1, 1] as [number, number, number],
              rotation: [0, STREET_INTRUDER.turn, 0] as [number, number, number],
              surface: state.surface,
            },
          ],
          lamps: STREET_LAMPS.map(([x, z], n) => ({
            id: `street-lamp-${n}`,
            position: [x, 2.2, z] as [number, number, number],
            kind: 'bulb' as const,
            aim: 0,
            intensity: 8,
            temperature: 3600,
            enabled: true,
          })),
        });
        figures.forEach((who) => who && standObject(who));
        walkInput.lookYaw = 0;
        walkInput.lookPitch = 0;
        walkInput.seeded = true;
        glideWalkerTo({ ...STREET_STAND });
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
