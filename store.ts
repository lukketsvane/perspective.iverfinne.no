import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  BOX_SURFACES,
  BoxData,
  FillState,
  GuideLevel,
  MESH_SURFACES,
  nearestSurface,
  SavedScene,
  SceneModel,
  SceneState,
  SceneView,
  SNAP_STEPS,
  SunState,
  Surface,
  SURFACES,
} from './types';
import { releaseSource, cachedSourceUrls, modelRadius, findFreeSpot, loadModelFromUrl } from './lib/loadModel';
import { cloneModel } from './lib/modelMaterials';
import { addToLibrary, eraseScene, pruneAssets, readLibrary, readScenes, removeFromLibrary, writeScene } from './lib/assets';
import { captureThumbnail } from './lib/capture';
import { walkInput } from './lib/walkInput';

// ---------------------------------------------------------------------------
// PRACTICE DEFAULTS
// ---------------------------------------------------------------------------
// The tool is a reference guide for perspective practice, built around the way
// Kim Jung Gi teaches it: everything is measured in metres, everything starts
// as a 1 m cube, and the camera sits at a believable human eye level so the
// horizon never drifts. Anything fancier (curvilinear projection, imported
// meshes) is opt-in.
// ---------------------------------------------------------------------------

/** One metre. The whole scene is measured in real-world units. */
export const UNIT = 1;

/** Standing eye level of a tall adult - the everyday KJG viewpoint. */
export const DEFAULT_CAMERA_HEIGHT = 1.9;

/**
 * The whole hemisphere, and the field the tool opens on.
 *
 * At 180 the four horizon points land exactly on the edge of the frame and the
 * fifth is at its centre - which is the five-point sheet itself, not an
 * approximation of it. Wider than that and the sheet shrinks into a bubble
 * with dead paper around it; narrower and the points walk off the page.
 */
export const DEFAULT_FOV = 180;

/**
 * The sun, as it stands when the tool opens.
 *
 * Mid-morning and off to one side: high enough that the ground reads, low
 * enough that a 1 m cube throws a shadow about its own length, and swung off
 * the view axis so the two visible vertical faces take different values. That
 * difference is the whole reason for having a light at all.
 */
export const DEFAULT_SUN: SunState = {
  // Over the viewer's left shoulder, so both faces of a cube you can see are
  // lit - but at different angles, which is the value separation you draw.
  // Swung round behind the scene it would put every visible face in the dark,
  // and with no fill light there is nothing to lift them back out.
  azimuth: 55,
  elevation: 48,
  intensity: 3.5,
  temperature: 5600,
  shadows: true,
};

/**
 * The fill, as it stands when first switched on.
 *
 * Opposite the sun and low, so it lifts the faces the sun has left black
 * without pretending to be a second sun; cool, because a real fill is sky
 * bounce or open shade, both of which are blue; and a third of the strength,
 * which is about the ratio a studio would set.
 */
export const DEFAULT_FILL: FillState = {
  enabled: false,
  azimuth: 235,
  elevation: 22,
  intensity: 1.1,
  temperature: 8200,
  shadows: false,
};

/** Eye-level presets, in metres. */
export const EYE_LEVEL_PRESETS: { label: string; note: string; height: number }[] = [
  { label: '1.2', note: 'Seated', height: 1.2 },
  { label: '1.6', note: 'Average standing eye level', height: 1.6 },
  { label: '1.9', note: 'Tall standing eye level', height: DEFAULT_CAMERA_HEIGHT },
  { label: '2.5', note: 'Raised - the wide establishing view', height: 2.5 },
];

/** Snap a spawned cube to the centre of a 1 m grid cell, so stacks line up. */
const snapToCell = (v: number) => Math.floor(v) + 0.5;

// ---------------------------------------------------------------------------
// Remembered settings
// ---------------------------------------------------------------------------
// How you have the tool set up is worth keeping between sessions; what you are
// looking at is not. So the eye level, the guides and the theme come back on
// reload, while the scene and projection return to their defaults and the app
// opens directly into the first-person walk view. A whole composition is kept
// deliberately, by name, and lives in IndexedDB with its meshes.
// ---------------------------------------------------------------------------

const SETTINGS_KEY = 'kjg-perspective-settings';

const SETTING_KEYS = [
  'theme',
  'backgroundGray',
  'cameraHeight',
  'guides',
  'showCone',
  'showConstruction',
  'showRoom',
  'fov',
  'snapStep',
  'surface',
  'sunEnvironment',
  'sun',
  'fill',
] as const;

type PersistedSettings = Pick<SceneState, (typeof SETTING_KEYS)[number]>;

const loadSettings = (): Partial<PersistedSettings> => {
  if (typeof localStorage === 'undefined') return {};
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    // Copy only current settings. Older records may contain removed camera-mode
    // fields; an allow-list prevents those values from leaking back into state.
    return Object.fromEntries(
      SETTING_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(parsed, key)).map((key) => [key, parsed[key]])
    ) as Partial<PersistedSettings>;
  } catch {
    return {};
  }
};

let saveTimer: number | undefined;

/**
 * Write the setup to storage, coalesced.
 *
 * This is wired to every store change, and a face drag commits on every frame,
 * so an immediate write would serialise and store on each one.
 */
export const saveSettings = (state: SceneState) => {
  if (typeof localStorage === 'undefined') return;
  if (saveTimer !== undefined) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(Object.fromEntries(SETTING_KEYS.map((key) => [key, state[key]])))
      );
    } catch {
      // A full or blocked store is not worth interrupting a drawing session for.
    }
  }, 400) as unknown as number;
};

const loadedSettings = loadSettings();
const legacy = (() => {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as {
      showGuides?: boolean;
      modelMaterial?: Surface;
    };
  } catch {
    return {};
  }
})();

const remembered = {
  ...loadedSettings,
  // Migrate settings written before the continuous background control existed.
  backgroundGray: loadedSettings.backgroundGray ?? (loadedSettings.theme === 'dark' ? 0 : 243),
  // ...and before the guides were four levels rather than on and off.
  guides: loadedSettings.guides ?? ((legacy.showGuides ?? true) ? 3 : 0),
  // ...and before the surface was a property of each thing rather than one
  // switch over every mesh in the scene.
  surface: loadedSettings.surface ?? legacy.modelMaterial ?? 'original',
};

/** How many steps back you can take. */
const UNDO_DEPTH = 25;

/**
 * Every imported mesh something still stands on.
 *
 * A saved scene, the scene on screen, a step back through the history that
 * would put it there again - and now the viewer's own shelf, which is a reason
 * to keep a file whether or not anything is currently standing on it.
 */
const referenced = (state: SceneState): string[] => [
  ...state.sceneHistory.flatMap((scene) => scene.models.map((m) => m.fileUrl)),
  ...state.models.map((m) => m.fileUrl),
  ...state.undoStack.flatMap((entry) => entry.models.map((m) => m.fileUrl)),
  ...state.redoStack.flatMap((entry) => entry.models.map((m) => m.fileUrl)),
  ...state.ownMeshes.map((m) => m.url),
];

/**
 * Drop any parsed mesh that nothing references any more - not the live scene,
 * and not anything still sitting in either history, since stepping back or
 * forward has to be able to put it on screen again.
 */
const releaseUnreferenced = (
  state: Partial<Pick<SceneState, 'models' | 'undoStack' | 'redoStack'>>
) => {
  const live = new Set<string>();
  state.models?.forEach((m) => live.add(m.fileUrl));
  state.undoStack?.forEach((entry) => entry.models.forEach((m) => live.add(m.fileUrl)));
  state.redoStack?.forEach((entry) => entry.models.forEach((m) => live.add(m.fileUrl)));

  cachedSourceUrls().forEach((url) => {
    if (!live.has(url)) releaseSource(url);
  });
};

/** The scene as it stands, pushed onto the undo stack. */
const snapshot = (state: Pick<SceneState, 'boxes' | 'models' | 'undoStack'>) =>
  [...state.undoStack, { boxes: state.boxes, models: state.models }].slice(-UNDO_DEPTH);

/**
 * A move worth being able to take back.
 *
 * Every change to the scene goes through here, and going forward again is a
 * dead end the moment a new one is made - which is what everything that has
 * ever had an undo does, and the only behaviour that cannot surprise anyone.
 */
const remember = (state: Pick<SceneState, 'boxes' | 'models' | 'undoStack'>) => ({
  undoStack: snapshot(state),
  redoStack: [] as SceneState['redoStack'],
});

/** Everything about how the scene is being looked at, ready to be written down. */
export const currentView = (state: SceneState): SceneView => ({
  cameraHeight: state.cameraHeight,
  fov: state.fov,
  perspectiveMode: state.perspectiveMode,
  backgroundGray: state.backgroundGray,
  theme: state.theme,
  sun: { ...state.sun },
  fill: { ...state.fill },
  sunEnvironment: state.sunEnvironment,
  guides: state.guides,
  showCone: state.showCone,
  surface: state.surface,
  showRoom: state.showRoom,
  snapStep: state.snapStep,
  camera: {
    x: walkInput.position.x,
    z: walkInput.position.z,
    yaw: walkInput.yaw,
    pitch: walkInput.pitch,
  },
});

/**
 * Put the viewer back where the scene was saved from.
 *
 * A composition is a viewpoint as much as an arrangement, so this moves the
 * walker as well as the settings - otherwise a scene comes back correct and
 * seen from the wrong side of the room.
 */
const restoreView = (view: SceneView | undefined): Partial<SceneState> => {
  if (!view) return {};
  walkInput.position.set(view.camera.x, 0, view.camera.z);
  walkInput.yaw = view.camera.yaw;
  walkInput.pitch = view.camera.pitch;
  walkInput.lookYaw = 0;
  walkInput.lookPitch = 0;
  walkInput.forward = 0;
  walkInput.strafe = 0;
  walkInput.seeded = true;

  return {
    cameraHeight: view.cameraHeight,
    fov: view.fov,
    perspectiveMode: view.perspectiveMode,
    backgroundGray: view.backgroundGray,
    theme: view.theme,
    sun: { ...DEFAULT_SUN, ...view.sun },
    fill: { ...DEFAULT_FILL, ...(view.fill ?? {}) },
    sunEnvironment: view.sunEnvironment,
    guides: view.guides ?? ((view.showGuides ?? true) ? 3 : 0),
    showCone: view.showCone,
    surface: view.surface ?? view.modelMaterial ?? 'original',
    showRoom: view.showRoom ?? false,
    snapStep: view.snapStep ?? 0.25,
  };
};

/** The next rung round, from wherever this thing currently sits. */
const stepSurface = (rungs: Surface[], from: Surface) =>
  rungs[(rungs.indexOf(nearestSurface(from, rungs)) + 1) % rungs.length];

export const useStore = create<SceneState>((set, get) => ({
  // Empty ground. One of the library objects is stood on it as the app opens -
  // which is asynchronous, so it cannot happen here.
  boxes: [],
  selectedId: null,
  fov: DEFAULT_FOV,
  perspectiveMode: 'equidistant',
  cameraHeight: DEFAULT_CAMERA_HEIGHT,
  guides: 3,
  showCone: false,
  showConstruction: true,
  showRoom: false,
  snapStep: 0.25, // Quarter metre, so sizes stay readable against the grid
  models: [],
  selectedModelId: null,
  surface: 'original',
  sunEnvironment: false,
  viewLocked: false,
  arRequested: false,
  undoStack: [],
  redoStack: [],
  theme: 'light',
  backgroundGray: 243,
  currentSceneId: null,
  sceneHistory: [],
  ownMeshes: [],

  // Anything remembered from last time overrides the defaults above. Only the
  // setup is remembered - never the scene, the projection or the camera.
  ...remembered,
  // A setup stored before the sun existed, or by a version that knew fewer of
  // its fields, must not leave the scene with no light in it.
  sun: { ...DEFAULT_SUN, ...(remembered.sun ?? {}) },
  fill: { ...DEFAULT_FILL, ...(remembered.fill ?? {}) },

  /**
   * The line under everything about to change.
   *
   * A drag commits on every frame, so the scene cannot snapshot itself on each
   * write - twenty-five steps back would be a quarter of a second of one
   * gesture. The gesture says when it starts instead, and one step back undoes
   * the whole of it.
   */
  beginChange: () => set((state) => remember(state)),

  // The always-visible cube button is the reliable 1 m ruler: it lands on the
  // grid so a new box shares the scene's vanishing points.
  addCube: (position) =>
    set((state) => {
      const id = uuidv4();
      return {
        ...remember(state),
        boxes: [
          ...state.boxes,
          {
            id,
            position: [snapToCell(position[0]), UNIT / 2, snapToCell(position[2])],
            scale: [UNIT, UNIT, UNIT],
            rotation: [0, 0, 0],
            surface: state.surface,
          },
        ],
        selectedId: id,
        selectedModelId: null,
      };
    }),

  updateBox: (id, updates) =>
    set((state) => ({
      boxes: state.boxes.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),

  removeBox: (id) =>
    set((state) => ({
      ...remember(state),
      boxes: state.boxes.filter((b) => b.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  /**
   * Empty ground.
   *
   * Leaving models behind meant "clear" put you on a clean grid with
   * yesterday's furniture still standing on it. Undoable, like every other
   * destructive action - and the opening object is stood back up on it
   * afterwards by `standObject`, which deliberately does not write a second
   * step, so one undo comes back to the whole scene rather than to the moment
   * between the clearing and the car.
   */
  resetScene: () =>
    set((state) => {
      const next = {
        ...remember(state),
        boxes: [],
        models: [],
        selectedId: null,
        selectedModelId: null,
        currentSceneId: null,
      };
      releaseUnreferenced(next);
      return next;
    }),

  /**
   * Put something on the ground that the viewer did not ask for.
   *
   * The same as `addModel` in every way except the two that matter here: it
   * writes no undo step and it selects nothing. What the tool opens with is
   * where the history begins, not a first move to be taken back - and a
   * selection you did not make is a set of handles under your thumb the moment
   * you touch the screen.
   */
  standObject: (model) =>
    set((state) => ({ models: [...state.models, { id: uuidv4(), surface: state.surface, ...model }] })),

  selectBox: (id) => set({ selectedId: id, selectedModelId: null }),

  addModel: (model) =>
    set((state) => {
      // Select what was just placed: the next thing anyone does to a new figure
      // is size it or move it, and both need it selected.
      const placed = { id: uuidv4(), surface: state.surface, ...model };
      return {
        ...remember(state),
        models: [...state.models, placed],
        selectedModelId: placed.id,
        selectedId: null,
      };
    }),

  /** Scale a placed model about its feet, so it stays on the ground. */
  scaleModel: (id, scale) =>
    set((state) => ({
      models: state.models.map((m) => (m.id === id ? { ...m, scale: Math.max(0.02, Math.min(50, scale)) } : m)),
    })),

  removeModel: (id) =>
    set((state) => {
      const next = {
        ...remember(state),
        models: state.models.filter((m) => m.id !== id),
        selectedModelId: state.selectedModelId === id ? null : state.selectedModelId,
      };
      // Instances share their buffers with the parsed original, so the GPU side
      // only goes back when nothing live - and nothing undoable - needs it.
      releaseUnreferenced(next);
      return next;
    }),

  selectModel: (id) => set({ selectedModelId: id, selectedId: null }),

  updateModel: (id, updates) =>
    set((state) => ({
      models: state.models.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),

  // The setting goes all the way round. A straight-line camera cannot - Scene
  // clamps the actual lens just short of 180, where a rectilinear projection
  // stops meaning anything - but the curvilinear pass can, and that is the mode
  // you want a 360 degree field in.
  setLens: (fov) => set({ fov: Math.max(10, Math.min(720, fov)) }),

  setPerspectiveMode: (mode) =>
    set((state) => ({
      perspectiveMode: mode,
      /*
       * The lens number is a focal length in one system and the width of the
       * sheet in the other, so carrying one value across would give a
       * curvilinear view as narrow as a portrait lens, or a flat one turned
       * inside out.
       *
       * A hundred and eighty is the number that matters for a curvilinear
       * study: it is the whole hemisphere, the four points around the horizon
       * sit exactly on the edge of the frame, and the fifth is dead centre.
       * Sixty is the ordinary cone of vision to come back to on the flat side.
       */
      fov: mode === 'linear' ? Math.min(state.fov, 75) : state.fov < 100 ? DEFAULT_FOV : Math.min(state.fov, 360),
    })),

  setCameraHeight: (height) => set({ cameraHeight: Math.max(0.2, Math.min(12, height)) }),

  cycleGuides: () => set((state) => ({ guides: (((state.guides + 3) % 4) as GuideLevel) })),

  cycleSnap: () =>
    set((state) => {
      const index = SNAP_STEPS.indexOf(state.snapStep as (typeof SNAP_STEPS)[number]);
      return { snapStep: SNAP_STEPS[(index + 1) % SNAP_STEPS.length] };
    }),

  toggleCone: () => set((state) => ({ showCone: !state.showCone })),

  toggleConstruction: () => set((state) => ({ showConstruction: !state.showConstruction })),

  // -------------------------------------------------------------------------
  // The viewer's own shelf
  // -------------------------------------------------------------------------

  loadOwnMeshes: async () => {
    const own = await readLibrary();
    if (own.length) set({ ownMeshes: own });
  },

  /**
   * Put an imported file on the shelf.
   *
   * The bytes are already kept, under a hash of themselves, so importing the
   * same file twice lands on the same reference and this is a no-op - which is
   * what you want: one entry, however many times it is dropped in.
   */
  rememberMesh: async (url, name) => {
    const mesh = await addToLibrary(url, name);
    set((state) =>
      state.ownMeshes.some((m) => m.url === url) ? {} : { ownMeshes: [...state.ownMeshes, mesh] }
    );
  },

  forgetMesh: async (url) => {
    await removeFromLibrary(url);
    set((state) => ({ ownMeshes: state.ownMeshes.filter((m) => m.url !== url) }));
    // The bytes go too, unless a scene or the scene on screen still stands on
    // them - which is the same question `deleteScene` asks.
    const after = get();
    await pruneAssets(referenced(after));
  },

  /**
   * Copy the selection.
   *
   * A crowd is one figure placed nine times, and a colonnade is one box copied
   * along a line - both of which meant going back to the library or the spawn
   * button and re-sizing from scratch. The copy lands clear of its original and
   * becomes the selection, so it can be dragged straight into place.
   */
  duplicateSelection: () =>
    set((state) => {
      const undoStack = snapshot(state);

      if (state.selectedModelId) {
        const original = state.models.find((m) => m.id === state.selectedModelId);
        if (!original?.object) return {};

        const [x, z] = findFreeSpot(
          state.models.map((m) => ({ position: m.position, radius: modelRadius(m) })),
          [original.position[0], original.position[2]],
          modelRadius(original)
        );
        // A fresh instance: sharing the Object3D itself would move both copies.
        const copy = {
          ...original,
          id: uuidv4(),
          object: cloneModel(original.object),
          position: [x, original.position[1], z] as [number, number, number],
        };
        return { undoStack, models: [...state.models, copy], selectedModelId: copy.id };
      }

      if (state.selectedId) {
        const original = state.boxes.find((b) => b.id === state.selectedId);
        if (!original) return {};
        const step = Math.max(original.scale[0], 0.5) + 0.5;
        const copy: BoxData = {
          ...original,
          id: uuidv4(),
          position: [original.position[0] + step, original.position[1], original.position[2]],
        };
        return { undoStack, boxes: [...state.boxes, copy], selectedId: copy.id };
      }

      return {};
    }),

  /**
   * The whole scene to the next rung.
   *
   * This both moves the default - so what is placed next matches what is
   * already standing there - and stamps every box and mesh, since a scene-wide
   * control that quietly skipped everything you had set by hand would read as
   * broken. Undoable, because it rewrites the scene: one step back and every
   * object is as it was, whatever mixture that was.
   */
  cycleSurface: () =>
    set((state) => {
      const next = SURFACES[(SURFACES.indexOf(state.surface) + 1) % SURFACES.length];
      return {
        ...remember(state),
        surface: next,
        boxes: state.boxes.map((box) => ({ ...box, surface: next })),
        models: state.models.map((model) => ({ ...model, surface: next })),
      };
    }),

  /** Just this one, through the rungs its own kind has. */
  cycleSelectionSurface: () =>
    set((state) => {
      if (state.selectedModelId) {
        const model = state.models.find((m) => m.id === state.selectedModelId);
        if (!model) return {};
        const next = stepSurface(MESH_SURFACES, model.surface ?? state.surface);
        return {
          ...remember(state),
          models: state.models.map((m) => (m.id === model.id ? { ...m, surface: next } : m)),
        };
      }
      if (state.selectedId) {
        const box = state.boxes.find((b) => b.id === state.selectedId);
        if (!box) return {};
        const next = stepSurface(BOX_SURFACES, box.surface ?? state.surface);
        return {
          ...remember(state),
          boxes: state.boxes.map((b) => (b.id === box.id ? { ...b, surface: next } : b)),
        };
      }
      return {};
    }),

  toggleRoom: () => set((state) => ({ showRoom: !state.showRoom })),

  toggleSunEnvironment: () => set((state) => ({ sunEnvironment: !state.sunEnvironment })),

  setSun: (sun) => set((state) => ({ sun: { ...state.sun, ...sun } })),

  setFill: (fill) => set((state) => ({ fill: { ...state.fill, ...fill } })),

  toggleViewLock: () => set((state) => ({ viewLocked: !state.viewLocked })),

  /**
   * Going into the room, and coming back.
   *
   * The projection goes flat on the way in: the frame is a photograph of the
   * room now, taken through the phone's own rectilinear lens, and bending it
   * would be drawing a perspective over a perspective.
   */
  setAr: (on) => set((state) => ({ arRequested: on, perspectiveMode: on ? 'linear' : state.perspectiveMode })),

  /**
   * Step back one scene, and forward again.
   *
   * Boxes and models are restored together, because most of what is worth
   * taking back moves both: a delete, a clear, loading a saved scene over your
   * work - and now every placement, slide, turn and resize as well, one entry
   * per gesture rather than one per frame of it.
   *
   * Nothing here is released while the other stack still names it. Undoing a
   * delete and then redoing it has to be able to put the same mesh back on
   * screen, and the geometry it shares is only handed to the GPU once.
   */
  undo: () =>
    set((state) => {
      const previous = state.undoStack[state.undoStack.length - 1];
      if (!previous) return {};
      const next = {
        boxes: previous.boxes,
        models: previous.models,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, { boxes: state.boxes, models: state.models }].slice(-UNDO_DEPTH),
        selectedId: null,
        selectedModelId: null,
      };
      releaseUnreferenced(next);
      return next;
    }),

  redo: () =>
    set((state) => {
      const ahead = state.redoStack[state.redoStack.length - 1];
      if (!ahead) return {};
      const next = {
        boxes: ahead.boxes,
        models: ahead.models,
        undoStack: [...state.undoStack, { boxes: state.boxes, models: state.models }].slice(-UNDO_DEPTH),
        redoStack: state.redoStack.slice(0, -1),
        selectedId: null,
        selectedModelId: null,
      };
      releaseUnreferenced(next);
      return next;
    }),

  rotateSelection: (radians) =>
    set((state) => {
      if (state.selectedModelId) {
        return {
          models: state.models.map((m) =>
            m.id === state.selectedModelId ? { ...m, rotationY: m.rotationY + radians } : m
          ),
        };
      }
      if (state.selectedId) {
        return {
          boxes: state.boxes.map((b) =>
            b.id === state.selectedId
              ? { ...b, rotation: [b.rotation[0], b.rotation[1] + radians, b.rotation[2]] as [number, number, number] }
              : b
          ),
        };
      }
      return {};
    }),

  toggleTheme: () =>
    set((state) => {
      const dark = state.theme === 'light';
      // Back to the paper the tool opens on, not to pure white: 243 is the tone
      // every other light-mode default is set against.
      return { theme: dark ? 'dark' : 'light', backgroundGray: dark ? 0 : 243 };
    }),

  setBackgroundGray: (value) =>
    set({
      backgroundGray: Math.max(0, Math.min(255, Math.round(value))),
      theme: value < 128 ? 'dark' : 'light',
    }),

  // -------------------------------------------------------------------------
  // Saved scenes
  // -------------------------------------------------------------------------

  /**
   * Write the composition down.
   *
   * Every save is a new one. Naming and overwriting both want words on screen
   * and a decision before the thing is safe; a roll of views wants neither -
   * the thumbnail says which is which, and nothing is ever lost by saving.
   */
  saveCurrentScene: async () => {
    const state = get();
    const saved = Date.now();

    const scene: SavedScene = {
      id: uuidv4(),
      // Never drawn: it names the exported file and the accessible control.
      name: new Date(saved).toISOString().slice(0, 16).replace('T', ' '),
      createdAt: saved,
      updatedAt: saved,
      boxes: state.boxes.map((box) => ({ ...box })),
      models: state.models.map((model) => ({
        name: model.name,
        fileUrl: model.fileUrl,
        format: model.format,
        position: [...model.position] as [number, number, number],
        rotationY: model.rotationY,
        scale: model.scale,
        baseScale: model.baseScale,
        size: [...model.size] as [number, number, number],
        surface: model.surface,
      })),
      view: currentView(state),
      thumbnail: captureThumbnail(),
    };

    await writeScene(scene);
    set((current) => ({
      sceneHistory: [scene, ...current.sceneHistory],
      currentSceneId: scene.id,
    }));
  },

  /**
   * Open a saved composition.
   *
   * Every mesh is re-read from its source - a bundled path over the network, an
   * import out of this browser's own store - so the scene comes back whole
   * rather than as a list of names. Whatever cannot be found is returned to the
   * caller instead of being dropped in silence.
   */
  loadScene: async (id) => {
    const scene = get().sceneHistory.find((s) => s.id === id);
    if (!scene) return ['That scene is no longer in this browser.'];

    const missing: string[] = [];
    const restored: SceneModel[] = [];

    for (const instance of scene.models) {
      try {
        const { model } = await loadModelFromUrl(instance.fileUrl, instance.name, [
          instance.position[0],
          instance.position[2],
        ]);
        restored.push({
          ...model,
          id: uuidv4(),
          // The saved transforms win over anything the loader worked out.
          position: [...instance.position] as [number, number, number],
          rotationY: instance.rotationY,
          scale: instance.scale,
          baseScale: instance.baseScale,
          size: [...instance.size] as [number, number, number],
          surface: instance.surface,
        });
      } catch (error) {
        missing.push(`${instance.name} (${error instanceof Error ? error.message : 'could not be loaded'})`);
      }
    }

    set((state) => {
      const next = {
        ...remember(state),
        boxes: scene.boxes.map((box) => ({ ...box, id: uuidv4() })),
        models: restored,
        selectedId: null,
        selectedModelId: null,
        currentSceneId: scene.id,
        ...restoreView(scene.view),
      };
      releaseUnreferenced(next);
      return next;
    });

    return missing;
  },

  deleteScene: async (id) => {
    await eraseScene(id);
    set((state) => ({
      sceneHistory: state.sceneHistory.filter((s) => s.id !== id),
      currentSceneId: state.currentSceneId === id ? null : state.currentSceneId,
    }));
    // An imported file is only worth keeping while something still stands on
    // it: a saved scene, the scene on screen, or a step back through the undo
    // stack that would put it there again.
    await pruneAssets(referenced(get()));
  },

  loadSceneHistory: async () => {
    const scenes = await readScenes();
    if (scenes.length) set({ sceneHistory: scenes });
  },

  applyScene: ({ boxes, models, view }) =>
    set((state) => {
      const next = {
        ...remember(state),
        boxes: boxes.map((box) => ({ ...box, id: uuidv4() })),
        models: models.map((model) => ({ ...model, id: uuidv4() })),
        selectedId: null,
        selectedModelId: null,
        currentSceneId: null,
        ...restoreView(view),
      };
      releaseUnreferenced(next);
      return next;
    }),

  /**
   * Remove extra copies of the same mesh.
   *
   * Every placement shares the same source by URL, so two "artisan" figures are
   * two entries with the same fileUrl. This keeps the first occurrence of each
   * URL and discards the rest, then releases any GPU resources that were only
   * held by the removed instances.
   */
  deduplicateModels: () =>
    set((state) => {
      const seen = new Set<string>();
      const unique = state.models.filter((m) => {
        if (seen.has(m.fileUrl)) return false;
        seen.add(m.fileUrl);
        return true;
      });
      if (unique.length === state.models.length) return {};
      const next = {
        ...remember(state),
        models: unique,
        selectedModelId:
          state.selectedModelId && unique.some((m) => m.id === state.selectedModelId) ? state.selectedModelId : null,
      };
      releaseUnreferenced(next);
      return next;
    }),
}));
