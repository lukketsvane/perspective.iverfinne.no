import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { BoxData, SceneState, SavedScene, SpawnKind, SunState } from './types';
import { findStudy } from './lib/studies';
import { DEFAULT_SENSOR_FOV } from './lib/cameraFeed';
import { releaseSource, cachedSourceUrls, modelRadius, findFreeSpot } from './lib/loadModel';

// Helper for random range
const rng = (min: number, max: number) => Math.random() * (max - min) + min;

const STORAGE_KEY = 'kjg-perspective-scenes';

// ---------------------------------------------------------------------------
// PRACTICE DEFAULTS
// ---------------------------------------------------------------------------
// The tool is a reference guide for perspective practice, built around the way
// Kim Jung Gi teaches it: everything is measured in metres, everything starts
// as a 1 m cube, and the camera sits at a believable human eye level so the
// horizon never drifts. Anything fancier (curvilinear projection, other
// primitives, AI scenes) is opt-in.
// ---------------------------------------------------------------------------

/** One metre. The whole scene is measured in real-world units. */
export const UNIT = 1;

/** Standing eye level of a tall adult - the everyday KJG viewpoint. */
export const DEFAULT_CAMERA_HEIGHT = 1.9;

/** Height of the scale figure, in metres. */
export const FIGURE_HEIGHT = 1.75;

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
  intensity: 8,
  shadows: true,
};

/** Eye-level presets, in metres. */
export const EYE_LEVEL_PRESETS: { label: string; note: string; height: number }[] = [
  { label: '1.2', note: 'Seated', height: 1.2 },
  { label: '1.6', note: 'Average standing eye level', height: 1.6 },
  { label: '1.9', note: 'Tall standing eye level', height: DEFAULT_CAMERA_HEIGHT },
  { label: '2.5', note: 'Raised - the wide establishing view', height: 2.5 },
];

/** Dimensions (in metres) for each spawnable primitive. Cube is the default. */
export const SPAWN_PRESETS: Record<SpawnKind, { label: string; scale: () => [number, number, number] }> = {
  cube:   { label: 'Cube',   scale: (): [number, number, number] => [UNIT, UNIT, UNIT] },
  slab:   { label: 'Slab',   scale: (): [number, number, number] => [rng(2, 5), rng(0.1, 0.4), rng(2, 5)] },
  pillar: { label: 'Pillar', scale: (): [number, number, number] => [rng(0.3, 0.8), rng(3, 6), rng(0.3, 0.8)] },
  beam:   { label: 'Beam',   scale: (): [number, number, number] => [rng(0.25, 0.4), rng(0.25, 0.4), rng(4, 10)] },
  block:  { label: 'Block',  scale: (): [number, number, number] => [rng(1, 3), rng(1, 3), rng(1, 3)] },
};

/** A 1 m cube resting on the ground, optionally turned about its own axis. */
const cube = (x: number, z: number, rotY = 0): Omit<BoxData, 'id'> => ({
  position: [x, UNIT / 2, z],
  scale: [UNIT, UNIT, UNIT],
  rotation: [0, rotY, 0],
});

/** A 1 m cube stacked at `level` (0 = resting on the ground). */
const stacked = (x: number, z: number, level: number, rotY = 0): Omit<BoxData, 'id'> => ({
  position: [x, UNIT / 2 + level * UNIT, z],
  scale: [UNIT, UNIT, UNIT],
  rotation: [0, rotY, 0],
});

/**
 * The default scene: nothing but 1 m cubes.
 *
 * The arrangement is fixed rather than random so it works as a reference:
 *  - most cubes are grid-aligned, so they share one pair of vanishing points
 *  - two cubes are turned off-axis, each with its own pair of vanishing points
 *  - a three-cube stack crosses the 1.9 m horizon, so the visible top faces of
 *    the lower cubes flip to the underside of the top one
 *  - cubes sit at a spread of depths, to read the rate of foreshortening
 */
const generateInitialScene = (): BoxData[] => {
  const layout: Omit<BoxData, 'id'>[] = [
    // Grid-aligned cubes, below eye level
    cube(0, 0),
    cube(-2, -1),
    cube(2, -3),
    cube(-3, 2),
    cube(4, 1),
    cube(1, -12), // far cube - the depth check
    // Stack crossing the horizon at 1.9 m
    stacked(-1, -6, 0),
    stacked(-1, -6, 1),
    stacked(-1, -6, 2),
    // Off-axis cubes, each with its own pair of vanishing points
    cube(3, -7, 0.62),
    cube(-5, -4, -0.38),
  ];

  return layout.map((box) => ({ id: uuidv4(), ...box }));
};

/** Snap a spawned cube to the centre of a 1 m grid cell, so stacks line up. */
const snapToCell = (v: number) => Math.floor(v) + 0.5;
/** Snap other primitives to the half metre. */
const snapToHalf = (v: number) => Math.round(v * 2) / 2;

// ---------------------------------------------------------------------------
// Remembered settings
// ---------------------------------------------------------------------------
// How you have the tool set up is worth keeping between sessions; what you are
// looking at is not. So the eye level, the guides and the theme come back on
// reload, while the scene, the projection, the camera feed and walk mode all
// return to their defaults - open the app and it is cubes in straight-line
// perspective at eye level, every time.
// ---------------------------------------------------------------------------

const SETTINGS_KEY = 'kjg-perspective-settings';

type PersistedSettings = Pick<
  SceneState,
  'theme' | 'cameraHeight' | 'lockEyeLevel' | 'showGuides' | 'showFigure' | 'showCone' | 'spawnKind' | 'fov' | 'snapStep' | 'matteModels' | 'sensorFov' | 'sun'
>;

const loadSettings = (): Partial<PersistedSettings> => {
  if (typeof localStorage === 'undefined') return {};
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? JSON.parse(stored) : {};
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
  saveTimer = setTimeout(() => writeSettings(state), 400) as unknown as number;
};

const writeSettings = (state: SceneState) => {
  try {
    const settings: PersistedSettings = {
      theme: state.theme,
      cameraHeight: state.cameraHeight,
      lockEyeLevel: state.lockEyeLevel,
      showGuides: state.showGuides,
      showFigure: state.showFigure,
      showCone: state.showCone,
      spawnKind: state.spawnKind,
      fov: state.fov,
      snapStep: state.snapStep,
      matteModels: state.matteModels,
      sensorFov: state.sensorFov,
      sun: state.sun,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // A full or blocked store is not worth interrupting a drawing session for.
  }
};

const loadScenesFromStorage = (): SavedScene[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load scenes from storage:', e);
  }
  return [];
};

const saveScenesToStorage = (scenes: SavedScene[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes));
  } catch (e) {
    console.error('Failed to save scenes to storage:', e);
  }
};

const remembered = { ...loadSettings(), showFigure: false };

/** How many steps back you can take. */
const UNDO_DEPTH = 25;

/**
 * Drop any parsed mesh that nothing references any more - not the live scene,
 * and not anything still sitting in the undo stack, since stepping back has to
 * be able to put it on screen again.
 */
const releaseUnreferenced = (state: Pick<SceneState, 'models' | 'undoStack'>) => {
  const live = new Set<string>();
  state.models.forEach((m) => live.add(m.fileUrl));
  state.undoStack.forEach((entry) => entry.models.forEach((m) => live.add(m.fileUrl)));

  cachedSourceUrls().forEach((url) => {
    if (live.has(url)) return;
    releaseSource(url);
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  });
};

export const useStore = create<SceneState>((set, get) => ({
  boxes: generateInitialScene(),
  selectedId: null,
  isDragging: false,
  isViewMode: false,
  fov: 60, // The classic 60 degree cone of vision - minimal edge distortion
  distortion: 0, // Straight-line perspective by default
  perspectiveMode: 'linear',
  cameraHeight: DEFAULT_CAMERA_HEIGHT,
  lockEyeLevel: true, // Level gaze -> true verticals -> 2-point perspective
  showFigure: false,
  showGuides: true,
  showCone: false,
  snapStep: 0.25, // Quarter metre, so sizes stay readable against the grid
  spawnKind: 'cube',
  viewMode: 'orbit',
  cameraFeed: false, // The camera stays off until it is asked for
  models: [],
  selectedModelId: null,
  matteModels: false,
  sensorFov: DEFAULT_SENSOR_FOV,
  viewLocked: false,
  feedNonce: 0,
  undoStack: [],
  cameraPose: null,
  activeStudyId: null,
  theme: 'light',
  currentSceneName: null,
  sceneHistory: [],

  // Anything remembered from last time overrides the defaults above. Only the
  // setup is remembered - never the scene, the projection or the camera.
  ...remembered,
  // A setup stored before the sun existed, or by a version that knew fewer of
  // its fields, must not leave the scene with no light in it.
  sun: { ...DEFAULT_SUN, ...(remembered.sun ?? {}) },

  addBox: (position) =>
    set((state) => {
      const kind = state.spawnKind;
      const scale = SPAWN_PRESETS[kind].scale();
      const snap = kind === 'cube' ? snapToCell : snapToHalf;

      return {
        boxes: [
          ...state.boxes,
          {
            id: uuidv4(),
            // Rest on the ground, aligned to the grid so the new box shares the
            // scene's vanishing points. Turn it by hand for a new VP pair.
            position: [snap(position[0]), scale[1] / 2, snap(position[2])],
            scale,
            rotation: [0, 0, 0],
          },
        ],
      };
    }),

  appendBox: (data) =>
    set((state) => ({
      boxes: [
        ...state.boxes,
        {
          id: uuidv4(),
          ...data
        }
      ]
    })),

  updateBox: (id, updates) =>
    set((state) => ({
      boxes: state.boxes.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),

  removeBox: (id) =>
    set((state) => ({
      undoStack: [...state.undoStack, { boxes: state.boxes, models: state.models }].slice(-UNDO_DEPTH),
      boxes: state.boxes.filter((b) => b.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  setBoxes: (boxes) => set((state) => ({
    undoStack: [...state.undoStack, { boxes: state.boxes, models: state.models }].slice(-UNDO_DEPTH),
    boxes,
  })),

  /**
   * Back to the opening cubes - the whole scene, figures included.
   *
   * Leaving models behind meant "reset" put you in a clean set of boxes with
   * yesterday's figures still standing in them. Undoable, like every other
   * destructive action.
   */
  resetScene: () => set((state) => {
    const next = {
      undoStack: [...state.undoStack, { boxes: state.boxes, models: state.models }].slice(-UNDO_DEPTH),
      boxes: generateInitialScene(),
      models: [],
      selectedId: null,
      selectedModelId: null,
      currentSceneName: null,
      activeStudyId: null,
    };
    releaseUnreferenced(next);
    return next;
  }),

  selectBox: (id) => set({ selectedId: id, selectedModelId: null }),

  setViewMode: (mode) => set({ viewMode: mode, selectedId: null, selectedModelId: null }),

  /**
   * Load a drill as a whole shot.
   *
   * A study is not just geometry: the eye level it reads from and the spot it
   * reads from are the exercise. Projection is left alone - straight or
   * curvilinear stays the viewer's choice.
   */
  loadStudy: (id) => set((state) => {
    const study = findStudy(id);
    if (!study) return {};
    // A drill is a whole shot, and figures placed for another one end up
    // standing inside its walls - so they come out with the old boxes.
    const next = {
      undoStack: [...state.undoStack, { boxes: state.boxes, models: state.models }].slice(-UNDO_DEPTH),
      boxes: study.boxes.map((box) => ({ id: uuidv4(), ...box })),
      models: [],
      cameraHeight: study.cameraHeight,
      fov: study.fov,
      lockEyeLevel: study.lockEyeLevel,
      activeStudyId: study.id,
      currentSceneName: study.name,
      selectedId: null,
      selectedModelId: null,
      cameraPose: {
        position: study.camera.position,
        target: study.camera.target,
        nonce: (state.cameraPose?.nonce ?? 0) + 1,
      },
    };
    releaseUnreferenced(next);
    return next;
  }),

  setCameraFeed: (on) => set({ cameraFeed: on }),

  addModel: (model) => set((state) => {
    // Select what was just placed: the next thing anyone does to a new figure
    // is size it or move it, and both need it selected.
    const placed = { id: uuidv4(), ...model };
    return { models: [...state.models, placed], selectedModelId: placed.id, selectedId: null };
  }),

  /** Scale a placed model about its feet, so it stays on the ground. */
  scaleModel: (id, scale) => set((state) => ({
    models: state.models.map((m) =>
      m.id === id ? { ...m, scale: Math.max(0.02, Math.min(50, scale)) } : m
    ),
  })),

  removeModel: (id) => set((state) => {
    const next = {
      undoStack: [...state.undoStack, { boxes: state.boxes, models: state.models }].slice(-UNDO_DEPTH),
      models: state.models.filter((m) => m.id !== id),
      selectedModelId: state.selectedModelId === id ? null : state.selectedModelId,
    };
    // Instances share their buffers with the parsed original, so the GPU side
    // only goes back when nothing live - and nothing undoable - needs it.
    releaseUnreferenced(next);
    return next;
  }),

  selectModel: (id) => set({ selectedModelId: id, selectedId: null }),

  updateModel: (id, updates) => set((state) => ({
    models: state.models.map((m) => (m.id === id ? { ...m, ...updates } : m)),
  })),

  setIsDragging: (isDragging) => set({ isDragging }),

  setLens: (fov, distortion) => set((state) => ({
    // The setting goes all the way round. A straight-line camera cannot -
    // Scene clamps the actual lens just short of 180, where a rectilinear
    // projection stops meaning anything - but the curvilinear pass can, and
    // that is the mode you want a 360 field in.
    fov: Math.max(10, Math.min(360, fov)),
    // The curvature is a blend between two projections now, not a strength:
    // 0 is the equirectangular panorama, 1 the equidistant fisheye.
    distortion: distortion === undefined
      ? state.distortion
      : Math.max(0, Math.min(1, distortion)),
  })),

  setPerspectiveMode: (mode) => set((state) => ({
    perspectiveMode: mode,
    /*
     * The lens number is a focal length in one mode and the width of a
     * panorama in the other, so carrying one value across gives a curvilinear
     * view as narrow as a portrait lens or a flat one turned inside out.
     *
     * 160 degrees is the useful default here: wide enough that the walls run
     * off to both sides and the ceiling and floor curve in, which is the thing
     * the projection is for, without the whole room shrinking into a bubble in
     * the middle of the frame the way it does out past 250. 60 is the ordinary
     * cone of vision to come back to.
     */
    fov: mode === 'curvilinear' ? (state.fov < 120 ? 160 : state.fov) : Math.min(state.fov, 75),
  })),

  setCameraHeight: (height) => set({ cameraHeight: Math.max(0.2, Math.min(12, height)) }),

  toggleEyeLevelLock: () => set((state) => ({ lockEyeLevel: !state.lockEyeLevel })),

  toggleFigure: () => set((state) => ({ showFigure: !state.showFigure })),

  toggleGuides: () => set((state) => ({ showGuides: !state.showGuides })),

  toggleCone: () => set((state) => ({ showCone: !state.showCone })),

  /**
   * Copy the selection.
   *
   * A crowd is one figure placed nine times, and a colonnade is one box copied
   * along a line - both of which meant going back to the library or the spawn
   * button and re-sizing from scratch. The copy lands clear of its original and
   * becomes the selection, so it can be dragged straight into place.
   */
  duplicateSelection: () => set((state) => {
    const snapshot = [...state.undoStack, { boxes: state.boxes, models: state.models }].slice(-UNDO_DEPTH);

    if (state.selectedModelId) {
      const original = state.models.find((m) => m.id === state.selectedModelId);
      if (!original?.object) return {};

      const [x, z] = findFreeSpot(
        state.models.map((m) => ({ position: m.position, radius: modelRadius(m) })),
        [original.position[0], original.position[2]],
        modelRadius(original)
      );
      // A fresh instance: sharing the Object3D itself would move both copies.
      const copy = { ...original, id: uuidv4(), object: original.object.clone(true), position: [x, 0, z] as [number, number, number] };
      return { undoStack: snapshot, models: [...state.models, copy], selectedModelId: copy.id };
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
      return { undoStack: snapshot, boxes: [...state.boxes, copy], selectedId: copy.id };
    }

    return {};
  }),

  toggleMatte: () => set((state) => ({ matteModels: !state.matteModels })),

  setSun: (sun) => set((state) => ({ sun: { ...state.sun, ...sun } })),

  setSensorFov: (degrees) => set({ sensorFov: Math.max(35, Math.min(120, degrees)) }),

  toggleViewLock: () => set((state) => ({ viewLocked: !state.viewLocked })),

  noteFeedSize: () => set((state) => ({ feedNonce: state.feedNonce + 1 })),

  /**
   * Step back one scene.
   *
   * Boxes and models are restored together, because the actions worth undoing -
   * a delete, a clear, loading a drill over your work - move both.
   */
  undo: () => set((state) => {
    const previous = state.undoStack[state.undoStack.length - 1];
    if (!previous) return {};
    const next = {
      boxes: previous.boxes,
      models: previous.models,
      undoStack: state.undoStack.slice(0, -1),
      selectedId: null,
      selectedModelId: null,
    };
    releaseUnreferenced(next);
    return next;
  }),

  setSnapStep: (step) => set({ snapStep: Math.max(0, step) }),

  rotateSelection: (radians) => set((state) => {
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

  setSpawnKind: (kind) => set({ spawnKind: kind }),

  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

  toggleViewMode: () => set((state) => ({ isViewMode: !state.isViewMode, selectedId: null })),

  setCurrentSceneName: (name) => set({ currentSceneName: name }),

  saveCurrentScene: (name, prompt) => set((state) => {
    const newScene: SavedScene = {
      id: uuidv4(),
      name,
      boxes: [...state.boxes],
      createdAt: Date.now(),
      prompt
    };
    const updatedHistory = [newScene, ...state.sceneHistory].slice(0, 50); // Keep max 50 scenes
    saveScenesToStorage(updatedHistory);
    return {
      sceneHistory: updatedHistory,
      currentSceneName: name
    };
  }),

  loadScene: (id) => set((state) => {
    const scene = state.sceneHistory.find(s => s.id === id);
    if (scene) {
      return {
        boxes: scene.boxes.map(b => ({ ...b, id: uuidv4() })), // Give new IDs to avoid conflicts
        currentSceneName: scene.name,
        selectedId: null
      };
    }
    return {};
  }),

  deleteScene: (id) => set((state) => {
    const updatedHistory = state.sceneHistory.filter(s => s.id !== id);
    saveScenesToStorage(updatedHistory);
    return { sceneHistory: updatedHistory };
  }),

  loadHistoryFromStorage: () => set({ sceneHistory: loadScenesFromStorage() }),
}));
